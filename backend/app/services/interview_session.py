import uuid

_sessions = {}

def start_session(user_id: str):
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "user_id": user_id,
        "current_question": 0,
        "answers": [],
        "score": 0
    }
    return session_id

def get_session(session_id: str):
    session = _sessions.get(session_id)
    if not session:
        raise ValueError("Invalid session ID")
    return session

def advance_question(session_id: str):
    _sessions[session_id]["current_question"] += 1
