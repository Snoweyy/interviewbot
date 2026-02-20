import json
import re
import uuid
import requests
from flask import Blueprint, request, jsonify

def clean_json_string(s):
    """
    Sanitize control characters that llama3.2 injects inside JSON strings.
    Walks char-by-char so only chars INSIDE string values are replaced.
    """
    result = []
    in_string = False
    escape_next = False
    for ch in s:
        if escape_next:
            result.append(ch)
            escape_next = False
        elif ch == '\\' and in_string:
            result.append(ch)
            escape_next = True
        elif ch == '"':
            result.append(ch)
            in_string = not in_string
        elif in_string and ord(ch) < 0x20:
            # Replace literal control chars (\n, \r, \t, etc.) with a space
            result.append(' ')
        else:
            result.append(ch)
    return ''.join(result)

score_bp = Blueprint('score', __name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"

def is_gibberish(text):
    """
    Detects if an answer is gibberish/meaningless.
    Checks ratio of real dictionary-like words vs random char sequences.
    """
    if not text or text.strip() in ('', '(Skipped)', '(No answer given)'):
        return True
    text = text.strip()
    if len(text) < 3:
        return True
    words = re.findall(r'[a-zA-Z]+', text)
    if not words:
        return True
    # A "real" word has alternating vowels/consonants or is short & common
    vowels = set('aeiouAEIOU')
    def looks_real(w):
        if len(w) <= 2:
            return True
        has_vowel = any(c in vowels for c in w)
        # Check if it's all consonants (very likely gibberish)
        consonant_streak = 0
        for c in w.lower():
            if c not in vowels:
                consonant_streak += 1
                if consonant_streak >= 5:
                    return False
            else:
                consonant_streak = 0
        return has_vowel

    real_count = sum(1 for w in words if looks_real(w))
    ratio = real_count / len(words)
    # If less than 40% words look real, flag as gibberish
    return ratio < 0.4

def annotate_qa(qa_pairs):
    """Tag each answer as [GIBBERISH], [SKIPPED], or normal."""
    annotated = ""
    for i, qa in enumerate(qa_pairs, 1):
        q = qa.get('question', '')
        a = qa.get('answer', '').strip()
        if a in ('(Skipped)', ''):
            label = '[SKIPPED - Score this answer as 0]'
        elif is_gibberish(a):
            label = '[GIBBERISH/INCOHERENT - Score this answer as 0 across all metrics]'
        else:
            label = ''
        annotated += f"Q{i}: {q}\nA{i}: {a} {label}\n\n"
    return annotated

@score_bp.route('/api/score', methods=['POST'])
def score_interview():
    data = request.get_json()
    field = data.get('field', 'General')
    level = data.get('level', 'Intermediate')
    qa_pairs = data.get('qa_pairs', [])
    resume_text = data.get('resume_text', '')

    qa_formatted = annotate_qa(qa_pairs)

    prompt = f"""You are a STRICT and UNBIASED senior HR evaluator conducting a formal interview assessment.
You have ZERO tolerance for poor, vague, or incoherent answers.

POSITION: {level} level — {field}

RESUME SUMMARY:
{resume_text[:800] if resume_text else 'Not provided'}

INTERVIEW Q&A:
{qa_formatted}

STRICT EVALUATION RULES (follow exactly):
1. Any answer tagged [GIBBERISH] or [SKIPPED] gets a score of 0 for ALL metrics. No exceptions.
2. Vague, one-word, or off-topic answers score between 0-20 only.
3. Partially correct answers score between 20-50.
4. Good answers score between 50-75.
5. Excellent, detailed, well-structured answers score between 75-90.
6. DO NOT be lenient. DO NOT give benefit of the doubt.
7. selection_chance MUST NOT exceed 95. For mostly gibberish/skipped answers, it must be below 10.
8. Overall score must reflect the AVERAGE quality of ALL answers, including zeros.
9. Output ONLY a valid JSON object, nothing else, no markdown, no explanation.

Return this exact JSON structure:
{{
  "overall_score": <integer 0-100>,
  "selection_chance": <integer 0-95>,
  "communication": <integer 0-100>,
  "relevance": <integer 0-100>,
  "confidence": <integer 0-100>,
  "domain_knowledge": <integer 0-100>,
  "strengths": ["strength1", "strength2"],
  "improvements": ["specific area to improve 1", "specific area to improve 2"],
  "summary": "<Honest 2-3 sentence assessment. Call out gibberish/poor answers directly.>"
}}"""

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=90)

        raw = response.json().get('response', '').strip()

        # Extract JSON from response
        start = raw.find('{')
        end = raw.rfind('}') + 1
        if start == -1 or end == 0:
            return jsonify({'error': 'Failed to parse score from AI', 'raw': raw}), 500

        json_str = clean_json_string(raw[start:end])
        result = json.loads(json_str)

        # Hard cap selection_chance at 95
        result['selection_chance'] = min(result.get('selection_chance', 50), 95)

        # Generate unique token ID for this result
        result['token_id'] = str(uuid.uuid4()).upper()[:12]

        return jsonify(result)

    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Ollama is not running. Please start Ollama first.'}), 503
    except json.JSONDecodeError as e:
        return jsonify({'error': f'JSON parse error: {str(e)}', 'raw': raw}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
