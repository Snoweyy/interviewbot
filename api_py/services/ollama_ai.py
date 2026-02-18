import os
import random
import json
import requests
from typing import Iterator

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")


def generate_with_ollama(prompt: str) -> str:
    """Generate content using Ollama API"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                    "num_predict": int(os.getenv("OLLAMA_NUM_PREDICT", "160"))  # ~2-3 sentences
                }
            },
            timeout=120  # 2 minutes timeout for slower models
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "").strip()
    except requests.exceptions.RequestException as e:
        print(f"Ollama API Error: {e}")
        raise

def stream_generate_with_ollama(prompt: str) -> Iterator[str]:
    try:
        r = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                    "num_predict": int(os.getenv("OLLAMA_NUM_PREDICT", "160"))
                }
            },
            stream=True,
            timeout=120
        )
        r.raise_for_status()
        for line in r.iter_lines():
            if not line:
                continue
            try:
                obj = line.decode("utf-8")
                data = requests.models.complexjson.loads(obj)
                chunk = data.get("response", "")
                if chunk:
                    yield chunk
            except Exception:
                continue
    except requests.exceptions.RequestException as e:
        print(f"Ollama Stream Error: {e}")
        yield ""


def generate_initial_greeting(field: str, difficulty: str) -> str:
    """Generate the initial interviewer greeting"""
    try:
        prompt = f"""You are an AI interviewer conducting a {difficulty}-level interview about {field}.

Start by greeting the candidate warmly and professionally. Introduce yourself briefly, mention the interview topic ({field}), and ask the candidate to introduce themselves.

Keep it natural and friendly, 2-3 sentences max. Don't ask any technical questions yet - just greet and ask for their introduction."""

        text = generate_with_ollama(prompt)
        return text.replace("**", "").strip()
    except Exception as e:
        print(f"Ollama API Error (Initial Greeting): {e}")
        return f"Hello! Welcome to your {field} interview. I'm your AI interviewer today. Before we begin, please tell me a little about yourself and your experience with {field}."


def generate_interview_response(transcript: str, context: dict) -> dict:
    """Generate contextual interview response based on phase and conversation"""
    try:
        history = context.get("conversationHistory", [])
        phase = context.get("phase", "questions")
        question_num = context.get("questionNumber", 1)
        total_questions = context.get("totalQuestions", 5)
        field = context.get("field", "general")
        difficulty = context.get("difficulty", "intermediate")
        time_remaining = context.get("timeRemaining", 600)
        
        # Build conversation context
        conversation_text = ""
        for turn in history[-6:]:  # Last 6 turns for shorter context (faster)
            speaker = "Candidate" if turn["speaker"] == "user" else "Interviewer"
            conversation_text += f"{speaker}: {turn['text']}\n"
        
        avoid_practical = False
        prefs = context.get("preferences", {})
        if isinstance(prefs, dict):
            avoid_practical = bool(prefs.get("avoid_practical", False))

        if phase == "ending":
            prompt = f"""You are an AI interviewer wrapping up an interview about {field}.

Previous conversation:
{conversation_text}

The candidate just said: "{transcript}"

The interview is now ending (time is almost up or all questions are done). 
Thank the candidate for their time, give them a brief positive note about the interview, and let them know they will receive their results shortly.

Keep it warm and professional, 2-3 sentences. This is a goodbye message."""
        
        else:  # questions phase
            difficulty_instructions = {
                "beginner": "Ask fundamental, conceptual questions. Focus on basic understanding and definitions.",
                "intermediate": "Ask applied questions that test practical knowledge and common patterns.",
                "advanced": "Ask deep, nuanced questions about edge cases, performance, architecture, and trade-offs."
            }
            
            additional_rules = ""
            if avoid_practical:
                additional_rules = "Do NOT ask the candidate to write code or implement functions now. Prefer conceptual discussion, reasoning, design decisions, and examples from experience."

            prompt = f"""You are an AI interviewer conducting a {difficulty}-level technical interview about {field}.

Current question: {question_num} of {total_questions}
Difficulty: {difficulty}
Time remaining: {int(time_remaining // 60)} minutes

{difficulty_instructions.get(difficulty, difficulty_instructions["intermediate"])}
{additional_rules}

Previous conversation:
{conversation_text}

The candidate just said: "{transcript}"

Instructions:
1. Briefly acknowledge their answer (1 sentence)
2. Ask the next interview question related to {field}
3. Keep it conversational and concise
4. Total response MUST be <= 2 sentences

Don't repeat questions already asked. Progress logically through topics."""

        text = generate_with_ollama(prompt)
        text = text.replace("**", "").strip()
        
        return {"response": text}
    
    except Exception as e:
        print(f"Ollama API Error (Interview Response): {e}")
        fallbacks = [
            "That's a good point. Can you tell me more about your approach to solving problems in this area?",
            "I see. What would you say is the most challenging aspect of working with this technology?",
            "Interesting perspective. How do you typically handle situations where you need to learn something new quickly?",
        ]
        return {"response": random.choice(fallbacks)}

def stream_interview_response(transcript: str, context: dict) -> Iterator[str]:
    try:
        history = context.get("conversationHistory", [])
        phase = context.get("phase", "questions")
        question_num = context.get("questionNumber", 1)
        total_questions = context.get("totalQuestions", 5)
        field = context.get("field", "general")
        difficulty = context.get("difficulty", "intermediate")
        time_remaining = context.get("timeRemaining", 600)

        conversation_text = ""
        for turn in history[-6:]:
            speaker = "Candidate" if turn["speaker"] == "user" else "Interviewer"
            conversation_text += f"{speaker}: {turn['text']}\n"

        avoid_practical = False
        prefs = context.get("preferences", {})
        if isinstance(prefs, dict):
            avoid_practical = bool(prefs.get("avoid_practical", False))

        if phase == "ending":
            prompt = f"""You are an AI interviewer wrapping up an interview about {field}.

Previous conversation:
{conversation_text}

The candidate just said: "{transcript}"

The interview is now ending. Thank the candidate, give a brief positive note, and say goodbye. 2 sentences max."""
        else:
            difficulty_instructions = {
                "beginner": "Ask fundamental, conceptual questions.",
                "intermediate": "Ask applied questions that test practical knowledge.",
                "advanced": "Ask deep questions about edge cases and architecture."
            }
            additional_rules = ""
            if avoid_practical:
                additional_rules = "Do NOT ask the candidate to write code or implement functions now. Prefer conceptual topics, reasoning, and real-world examples without coding tasks."

            prompt = f"""You are an AI interviewer conducting a {difficulty}-level technical interview about {field}.

Current question: {question_num} of {total_questions}
Difficulty: {difficulty}
Time remaining: {int(time_remaining // 60)} minutes

{difficulty_instructions.get(difficulty, difficulty_instructions["intermediate"])}
{additional_rules}

Previous conversation:
{conversation_text}

The candidate just said: "{transcript}"

Respond with <= 2 sentences: briefly acknowledge, then ask the next question (no coding tasks)."""

        for chunk in stream_generate_with_ollama(prompt):
            if chunk:
                yield chunk
    except Exception as e:
        print(f"Ollama Stream Interview Error: {e}")
        yield "Let's continue. Could you share a concrete example from your recent work?"


def generate_evaluation(history: list[dict], config: dict) -> dict:
    """Generate comprehensive interview evaluation"""
    try:
        field = config.get("field", "general")
        difficulty = config.get("difficulty", "intermediate")
        
        # Build full conversation
        conversation_text = ""
        for turn in history:
            speaker = "Candidate" if turn["speaker"] == "user" else "Interviewer"
            conversation_text += f"{speaker}: {turn['text']}\n"
        
        prompt = f"""You are evaluating a {difficulty}-level technical interview about {field}.

Full conversation:
{conversation_text}

Provide a comprehensive evaluation in the following JSON format (and ONLY JSON, no markdown):
{{
    "overallScore": <number 0-100>,
    "categories": [
        {{"name": "Technical Knowledge", "score": <number 0-100>, "feedback": "<1 sentence>"}},
        {{"name": "Communication", "score": <number 0-100>, "feedback": "<1 sentence>"}},
        {{"name": "Problem Solving", "score": <number 0-100>, "feedback": "<1 sentence>"}},
        {{"name": "Depth of Understanding", "score": <number 0-100>, "feedback": "<1 sentence>"}}
    ],
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "improvements": ["<area 1>", "<area 2>", "<area 3>"],
    "summary": "<2-3 sentence overall assessment>"
}}

Be fair but constructive. Base scores on the actual responses given."""

        text = generate_with_ollama(prompt)
        
        # Clean up any markdown formatting
        text = text.replace("```json", "").replace("```", "").strip()
        
        # Parse JSON
        result = json.loads(text)
        return result
    
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        return _default_evaluation()
    except Exception as e:
        print(f"Ollama API Error (Evaluation): {e}")
        return _default_evaluation()


def _default_evaluation() -> dict:
    """Return default evaluation when AI fails"""
    return {
        "overallScore": 70,
        "categories": [
            {"name": "Technical Knowledge", "score": 70, "feedback": "Showed solid understanding of core concepts."},
            {"name": "Communication", "score": 75, "feedback": "Explained thoughts clearly and concisely."},
            {"name": "Problem Solving", "score": 68, "feedback": "Demonstrated logical approach to problems."},
            {"name": "Depth of Understanding", "score": 65, "feedback": "Could explore topics more deeply."}
        ],
        "strengths": [
            "Good foundational knowledge",
            "Clear communication style",
            "Willing to engage with questions"
        ],
        "improvements": [
            "Provide more specific examples",
            "Explore edge cases in answers",
            "Elaborate on implementation details"
        ],
        "summary": "The candidate showed good overall performance with solid fundamentals. There's room to grow in providing more detailed technical explanations and exploring edge cases."
    }


# Keep old function for backwards compatibility (can be removed later)
def generate_initial_question(interview_type: str, tech_stack: list[str]):
    """Deprecated - use generate_initial_greeting instead"""
    return generate_initial_greeting(tech_stack[0] if tech_stack else interview_type, "intermediate")

def generate_ai_response(transcript: str, context: dict):
    """Deprecated - use generate_interview_response instead"""
    return generate_interview_response(transcript, context)
