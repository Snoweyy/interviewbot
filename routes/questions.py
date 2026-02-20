import json
import re
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

questions_bp = Blueprint('questions', __name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"

@questions_bp.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    data = request.get_json()
    field = data.get('field', 'Software Engineering')
    level = data.get('level', 'Intermediate')
    total = int(data.get('total', 5))

    prompt = f"""You are an expert interviewer. Generate exactly {total} interview questions for a {level} level candidate applying for a {field} role.

STRICT RULES:
- Do NOT include any introduction or "tell me about yourself" questions
- Do NOT include any practical/technical problem-solving questions (no coding, no whiteboards, no "write a function")
- Questions must be conceptual, behavioral, or experience-based only
- Output ONLY a valid JSON array of strings, nothing else
- No numbering, no explanation, no markdown

Example format:
["Question one?", "Question two?", "Question three?"]

Now generate {total} questions for {field} ({level} level):"""

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=60)

        raw = response.json().get('response', '').strip()

        # Extract JSON array from response
        start = raw.find('[')
        end = raw.rfind(']') + 1
        if start == -1 or end == 0:
            return jsonify({'error': 'Failed to parse questions from AI response', 'raw': raw}), 500

        json_str = clean_json_string(raw[start:end])
        questions = json.loads(json_str)
        # Ensure we have exactly the right count
        questions = questions[:total]

        return jsonify({'questions': questions})

    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Ollama is not running. Please start Ollama first.'}), 503
    except json.JSONDecodeError as e:
        return jsonify({'error': f'JSON parse error: {str(e)}', 'raw': raw}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
