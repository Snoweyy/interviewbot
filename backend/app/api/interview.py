from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.questions import QUESTIONS
from app.services.interview_session import (
    start_session,
    get_session,
    advance_question
)
from app.services.text_evaluator import evaluate_text
from app.services.code_evaluation_pipeline import evaluate_code_submission


router = APIRouter(prefix="/interview", tags=["Interview"])

class StartInterview(BaseModel):
    user_id: str

class TextAnswer(BaseModel):
    session_id: str
    answer: str

class CodeAnswer(BaseModel):
    session_id: str
    code: str

@router.post("/start")
def start_interview_api(data: StartInterview):
    session_id = start_session(data.user_id)
    return {
        "session_id": session_id,
        "question": QUESTIONS[0]
    }

@router.post("/answer/text")
def submit_text_answer(data: TextAnswer):
    session = get_session(data.session_id)
    q = QUESTIONS[session["current_question"]]

    score = evaluate_text(data.answer, q["ideal_answer"])
    session["score"] += score
    session["answers"].append(data.answer)

    advance_question(data.session_id)

    if session["current_question"] >= len(QUESTIONS):
        return {"message": "Interview finished", "final_score": session["score"]}

    return {"next_question": QUESTIONS[session["current_question"]]}

@router.post("/answer/code")
def submit_code_answer(data: CodeAnswer):
    try:
        session = get_session(data.session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session")

    q = QUESTIONS[session["current_question"]]

    # ✅ SAFETY CHECK
    if q["type"] != "code":
        raise HTTPException(
            status_code=400,
            detail="Current question is not a coding question"
        )

    result = evaluate_code_submission(data.code, q["test_cases"])

    # 🔥 FIX: convert numpy → python
    clean_result = {}
    for k, v in result.items():
        if hasattr(v, "item"):
            clean_result[k] = v.item()
        elif hasattr(v, "tolist"):
            clean_result[k] = v.tolist()
        else:
            clean_result[k] = v

    # ✅ USE clean_result ONLY
    session["score"] += float(clean_result.get("final_score", 0))
    session["answers"].append({
        "question": q["question"],
        "code": data.code,
        "result": clean_result
    })

    advance_question(data.session_id)

    if session["current_question"] >= len(QUESTIONS):
        return {
            "message": "Interview finished",
            "final_score": round(float(session["score"]), 2)
        }

    return {
        "code_result": clean_result,
        "next_question": QUESTIONS[session["current_question"]]
    }
