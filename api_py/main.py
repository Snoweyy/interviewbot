import os
import base64
import time
from typing import Optional
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from .supabase_client import SupabaseClient
from .services.speech import recognize_speech, synthesize_speech
from .services.ollama_ai import generate_initial_greeting, generate_interview_response, generate_evaluation, stream_interview_response

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = SupabaseClient(
    os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL"),
    os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY"),
)

# In-memory session storage
session_data: dict[str, dict] = {}

class StartRequest(BaseModel):
    userId: str | None = None
    interviewType: str
    field: str = "general"
    techStack: list[str] | None = None
    difficulty: str = "intermediate"
    questionCount: int = 5
    timeLimit: int = 10  # minutes
    duration: int | None = 30

class StartResponse(BaseModel):
    sessionId: str
    initialGreeting: str
    initialAudioData: str
    config: dict
    status: str

class VoiceRequest(BaseModel):
    """Unified voice request - send audio, get audio response"""
    audioData: str
    sessionId: str
    interviewType: str = "technical"

class VoiceResponse(BaseModel):
    """Unified voice response - includes transcript, AI response, and audio"""
    userTranscript: str
    aiResponse: str
    audioData: str
    conversationHistory: list[dict]
    questionNumber: int
    totalQuestions: int
    phase: str  # greeting, questions, ending
    shouldEnd: bool
    timeRemaining: int

class EvaluateRequest(BaseModel):
    sessionId: str

class EvaluateResponse(BaseModel):
    overallScore: int
    categories: list[dict]
    strengths: list[str]
    improvements: list[str]
    summary: str

class EndRequest(BaseModel):
    sessionId: str

class CaptionRequest(BaseModel):
    audioData: str
    sessionId: str

class CaptionResponse(BaseModel):
    transcript: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/interview/start", response_model=StartResponse)
def start(req: StartRequest):
    user_id = req.userId
    demo = False
    session_id = None
    
    if not user_id or not supabase.is_configured:
        demo = True
        session_id = f"demo-{int(time.time()*1000)}"
    else:
        inserted = supabase.insert("interview_sessions", {
            "user_id": user_id,
            "type": req.interviewType,
            "tech_stack": req.techStack or [],
            "duration": req.duration or 30,
            "status": "active"
        })
        session_id = inserted.get("id") if isinstance(inserted, dict) else None
        if not session_id:
            demo = True
            session_id = f"demo-{int(time.time()*1000)}"
    
    # Generate initial greeting
    initial_greeting = generate_initial_greeting(req.field, req.difficulty)
    
    # Generate TTS for initial greeting
    tts_result = synthesize_speech(initial_greeting)
    initial_audio = base64.b64encode(tts_result["audioContent"]).decode("utf-8") if tts_result["audioContent"] else ""
    
    # Store session config
    session_data[session_id] = {
        "config": {
            "field": req.field,
            "difficulty": req.difficulty,
            "questionCount": req.questionCount,
            "timeLimit": req.timeLimit,
            "interviewType": req.interviewType,
            "techStack": req.techStack or []
        },
        "conversationHistory": [{
            "speaker": "ai",
            "text": initial_greeting
        }],
        "phase": "greeting",
        "questionNumber": 0,
        "startTime": time.time()
    }
    
    if not demo and session_id:
        supabase.insert("conversation_turns", {
            "session_id": session_id,
            "speaker_type": "ai",
            "text": initial_greeting,
            "confidence": 1.0
        })
    
    return {
        "sessionId": session_id,
        "initialGreeting": initial_greeting,
        "initialAudioData": initial_audio,
        "config": session_data[session_id]["config"],
        "status": "ready"
    }

@app.post("/api/interview/voice", response_model=VoiceResponse)
def voice(req: VoiceRequest):
    """
    Unified voice-to-voice endpoint with interview phase management
    """
    # Decode audio
    try:
        audio_bytes = base64.b64decode(req.audioData)
    except Exception as e:
        session = session_data.get(req.sessionId, {})
        return {
            "userTranscript": "",
            "aiResponse": "I couldn't process the audio. Please try again.",
            "audioData": "",
            "conversationHistory": session.get("conversationHistory", []),
            "questionNumber": session.get("questionNumber", 0),
            "totalQuestions": session.get("config", {}).get("questionCount", 5),
            "phase": session.get("phase", "questions"),
            "shouldEnd": False
        }
    if len(audio_bytes) < 4000:
        session = session_data.get(req.sessionId, {})
        return {
            "userTranscript": "",
            "aiResponse": "I didn't catch that. Please speak again.",
            "audioData": "",
            "conversationHistory": session.get("conversationHistory", []),
            "questionNumber": session.get("questionNumber", 0),
            "totalQuestions": session.get("config", {}).get("questionCount", 5),
            "phase": session.get("phase", "questions"),
            "shouldEnd": False,
            "timeRemaining": session.get("config", {}).get("timeLimit", 10) * 60
        }
    
    # Get session data
    session = session_data.get(req.sessionId, {
        "config": {"questionCount": 5, "timeLimit": 10, "field": "general", "difficulty": "intermediate"},
        "conversationHistory": [],
        "phase": "greeting",
        "questionNumber": 0,
        "startTime": time.time()
    })
    
    config = session["config"]
    history = session["conversationHistory"]
    current_phase = session["phase"]
    question_num = session["questionNumber"]
    
    # Step 1: Speech-to-Text
    stt_result = recognize_speech(audio_bytes)
    user_transcript = stt_result["transcript"]
    
    if not user_transcript or len(user_transcript.strip()) < 5:
        # Ask user to repeat; do not advance question/phase
        repeat_msg = "I couldn’t hear that clearly. Please repeat your answer."
        # Add user message (even if empty) for history
        history.append({
            "speaker": "user",
            "text": user_transcript or ""
        })
        # Keep phase and question number unchanged
        session_data[req.sessionId] = {
            **session,
            "conversationHistory": history,
            "phase": current_phase,
            "questionNumber": question_num
        }
        tts_result = synthesize_speech(repeat_msg)
        audio_data = base64.b64encode(tts_result["audioContent"]).decode("utf-8") if tts_result["audioContent"] else ""
        return {
            "userTranscript": user_transcript or "",
            "aiResponse": repeat_msg,
            "audioData": audio_data,
            "conversationHistory": history,
            "questionNumber": question_num,
            "totalQuestions": session["config"].get("questionCount", 5),
            "phase": current_phase,
            "shouldEnd": False,
            "timeRemaining": max(0, int((session["config"].get("timeLimit", 10) * 60) - (time.time() - session.get("startTime", time.time()))))
        }
    
    # Add user message to history
    history.append({
        "speaker": "user",
        "text": user_transcript
    })
    
    # Check time remaining
    elapsed_time = time.time() - session.get("startTime", time.time())
    time_limit_seconds = config.get("timeLimit", 10) * 60
    time_remaining = time_limit_seconds - elapsed_time
    should_end = False
    
    # Determine phase transitions
    if current_phase == "greeting":
        # After user responds to greeting, move to questions phase
        current_phase = "questions"
        question_num = 1
    elif current_phase == "questions":
        question_num += 1
    
    # Check if we should end
    total_questions = config.get("questionCount", 5)
    if question_num > total_questions or time_remaining < 30:
        current_phase = "ending"
        should_end = True
    
    # Step 2: Generate AI Response
    context = {
        "sessionId": req.sessionId,
        "interviewType": req.interviewType,
        "field": config.get("field", "general"),
        "difficulty": config.get("difficulty", "intermediate"),
        "questionNumber": question_num,
        "totalQuestions": total_questions,
        "phase": current_phase,
        "timeRemaining": time_remaining,
        "conversationHistory": history
    }
    
    ai_result = generate_interview_response(user_transcript, context)
    ai_response = ai_result["response"]
    
    # Add AI response to history
    history.append({
        "speaker": "ai",
        "text": ai_response
    })
    
    # Update session data
    session_data[req.sessionId] = {
        **session,
        "conversationHistory": history,
        "phase": current_phase,
        "questionNumber": question_num
    }
    
    # Step 3: Text-to-Speech
    tts_result = synthesize_speech(ai_response)
    audio_data = base64.b64encode(tts_result["audioContent"]).decode("utf-8") if tts_result["audioContent"] else ""
    
    # Save to database if configured
    if supabase.is_configured and req.sessionId and not req.sessionId.startswith("demo-"):
        supabase.insert("conversation_turns", {
            "session_id": req.sessionId,
            "speaker_type": "user",
            "text": user_transcript,
            "confidence": stt_result["confidence"]
        })
        supabase.insert("conversation_turns", {
            "session_id": req.sessionId,
            "speaker_type": "ai",
            "text": ai_response,
            "confidence": 1.0
        })
    
    return {
        "userTranscript": user_transcript,
        "aiResponse": ai_response,
        "audioData": audio_data,
        "conversationHistory": history,
        "questionNumber": question_num,
        "totalQuestions": total_questions,
        "phase": current_phase,
        "shouldEnd": should_end,
        "timeRemaining": max(0, int(time_remaining))
    }

@app.post("/api/interview/voice_stream")
def voice_stream(req: VoiceRequest):
    def gen():
        try:
            audio_bytes = base64.b64decode(req.audioData)
            stt_result = recognize_speech(audio_bytes)
            user_transcript = stt_result.get("transcript", "")
        except Exception:
            user_transcript = ""
        session = session_data.get(req.sessionId, {
            "config": {"questionCount": 5, "timeLimit": 10, "field": "general", "difficulty": "intermediate"},
            "conversationHistory": [],
            "phase": "greeting",
            "questionNumber": 0,
            "startTime": time.time()
        })
        config = session["config"]
        history = session["conversationHistory"]
        current_phase = session["phase"]
        question_num = session["questionNumber"]
        if user_transcript:
            history.append({"speaker": "user", "text": user_transcript})
        elapsed_time = time.time() - session.get("startTime", time.time())
        time_limit_seconds = config.get("timeLimit", 10) * 60
        time_remaining = time_limit_seconds - elapsed_time
        total_questions = config.get("questionCount", 5)
        # If transcript is too short, ask to repeat and do not advance
        if not user_transcript or len(user_transcript.strip()) < 5:
            repeat_msg = "I couldn’t hear that clearly. Please repeat your answer."
            # Stream final only (no incremental chunks)
            tts_result = synthesize_speech(repeat_msg)
            audio_data = base64.b64encode(tts_result["audioContent"]).decode("utf-8") if tts_result["audioContent"] else ""
            payload = {
                "type":"final",
                "aiResponse": repeat_msg,
                "audioData": audio_data,
                "questionNumber": question_num,
                "totalQuestions": config.get("questionCount", 5),
                "phase": current_phase,
                "shouldEnd": False,
                "timeRemaining": max(0, int(time_remaining))
            }
            yield (json.dumps(payload) + "\n")
            return
        # Normal advance when transcript is valid
        if current_phase == "greeting":
            current_phase = "questions"
            question_num = 1
        elif current_phase == "questions":
            question_num += 1
        should_end = False
        if question_num > total_questions or time_remaining < 30:
            current_phase = "ending"
            should_end = True
        context = {
            "sessionId": req.sessionId,
            "interviewType": req.interviewType,
            "field": config.get("field", "general"),
            "difficulty": config.get("difficulty", "intermediate"),
            "questionNumber": question_num,
            "totalQuestions": total_questions,
            "phase": current_phase,
            "timeRemaining": time_remaining,
            "conversationHistory": history
        }
        ai_text = ""
        for chunk in stream_interview_response(user_transcript, context):
            ai_text += chunk
            yield (f'{{"type":"text","text":{json.dumps(chunk)}}}\n')
        history.append({"speaker": "ai", "text": ai_text})
        session_data[req.sessionId] = {
            **session,
            "conversationHistory": history,
            "phase": current_phase,
            "questionNumber": question_num
        }
        if supabase.is_configured and req.sessionId and not req.sessionId.startswith("demo-"):
            supabase.insert("conversation_turns", {
                "session_id": req.sessionId,
                "speaker_type": "user",
                "text": user_transcript,
                "confidence": stt_result.get("confidence", 0)
            })
            supabase.insert("conversation_turns", {
                "session_id": req.sessionId,
                "speaker_type": "ai",
                "text": ai_text,
                "confidence": 1.0
            })
        tts_result = synthesize_speech(ai_text)
        audio_data = base64.b64encode(tts_result["audioContent"]).decode("utf-8") if tts_result["audioContent"] else ""
        payload = {
            "type":"final",
            "aiResponse": ai_text,
            "audioData": audio_data,
            "questionNumber": question_num,
            "totalQuestions": total_questions,
            "phase": current_phase,
            "shouldEnd": should_end,
            "timeRemaining": max(0, int(time_remaining))
        }
        yield (json.dumps(payload) + "\n")
    import json
    return StreamingResponse(gen(), media_type="application/json")

@app.post("/api/interview/caption", response_model=CaptionResponse)
def caption(req: CaptionRequest):
    try:
        audio_bytes = base64.b64decode(req.audioData)
        if len(audio_bytes) < 3000:
            return {"transcript": ""}
        stt_result = recognize_speech(audio_bytes)
        return {"transcript": stt_result.get("transcript", "")}
    except Exception:
        return {"transcript": ""}

@app.post("/api/interview/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    """
    Generate comprehensive interview evaluation using Ollama
    """
    session = session_data.get(req.sessionId, {})
    config = session.get("config", {})
    history = session.get("conversationHistory", [])
    
    result = generate_evaluation(history, config)
    return result

@app.post("/api/interview/end")
def end(req: EndRequest):
    # Clean up session data
    if req.sessionId in session_data:
        del session_data[req.sessionId]
    
    if supabase.is_configured and req.sessionId and not req.sessionId.startswith("demo-"):
        import datetime
        supabase.update(
            "interview_sessions", 
            {"status": "completed", "end_time": datetime.datetime.utcnow().isoformat()}, 
            "id", 
            req.sessionId
        )
    return {"status": "completed"}

@app.post("/api/interview/end")
def end(req: EndRequest):
    # Clean up session data
    if req.sessionId in session_data:
        del session_data[req.sessionId]
    
    if supabase.is_configured and req.sessionId and not req.sessionId.startswith("demo-"):
        import datetime
        supabase.update(
            "interview_sessions", 
            {"status": "completed", "end_time": datetime.datetime.utcnow().isoformat()}, 
            "id", 
            req.sessionId
        )
    return {"status": "completed"}
