import os
import random
import json
from google import genai
from google.genai import errors

# Lazy client initialization
_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required")
        _client = genai.Client(api_key=api_key)
    return _client


def generate_initial_greeting(field: str, difficulty: str) -> str:
    """Generate the initial interviewer greeting"""
    try:
        prompt = f"""You are an AI interviewer conducting a {difficulty}-level interview about {field}.

Start by greeting the candidate warmly and professionally. Introduce yourself briefly, mention the interview topic ({field}), and ask the candidate to introduce themselves.

Keep it natural and friendly, 2-3 sentences max. Don't ask any technical questions yet - just greet and ask for their introduction."""

        response = get_client().models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt
        )
        text = response.text.strip() if hasattr(response, "text") else response.candidates[0].content.parts[0].text
        return text.replace("**", "").strip()
    except Exception as e:
        print(f"Gemini API Error (Initial Greeting): {e}")
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
        for turn in history[-8:]:  # Last 8 turns for context
            speaker = "Candidate" if turn["speaker"] == "user" else "Interviewer"
            conversation_text += f"{speaker}: {turn['text']}\n"
        
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
            
            prompt = f"""You are an AI interviewer conducting a {difficulty}-level technical interview about {field}.

Current question: {question_num} of {total_questions}
Difficulty: {difficulty}
Time remaining: {int(time_remaining // 60)} minutes

{difficulty_instructions.get(difficulty, difficulty_instructions["intermediate"])}

Previous conversation:
{conversation_text}

The candidate just said: "{transcript}"

Instructions:
1. First, briefly acknowledge their answer (1 sentence - positive but honest)
2. Then ask the next interview question related to {field}
3. Keep your response conversational and natural
4. Total response should be 2-3 sentences

Don't repeat questions already asked. Progress logically through topics."""

        response = get_client().models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt
        )
        text = response.text.strip() if hasattr(response, "text") else response.candidates[0].content.parts[0].text
        text = text.replace("**", "").strip()
        
        return {"response": text}
    
    except Exception as e:
        print(f"Gemini API Error (Interview Response): {e}")
        fallbacks = [
            "That's a good point. Can you tell me more about your approach to solving problems in this area?",
            "I see. What would you say is the most challenging aspect of working with this technology?",
            "Interesting perspective. How do you typically handle situations where you need to learn something new quickly?",
        ]
        return {"response": random.choice(fallbacks)}


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

        response = get_client().models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt
        )
        text = response.text.strip() if hasattr(response, "text") else response.candidates[0].content.parts[0].text
        
        # Clean up any markdown formatting
        text = text.replace("```json", "").replace("```", "").strip()
        
        # Parse JSON
        result = json.loads(text)
        return result
    
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        return _default_evaluation()
    except Exception as e:
        print(f"Gemini API Error (Evaluation): {e}")
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
