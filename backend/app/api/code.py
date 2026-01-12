from fastapi import APIRouter
from pydantic import BaseModel
from app.services.code_evaluation_pipeline import evaluate_code_submission

router = APIRouter(prefix="/code", tags=["Code"])

class CodeSubmitRequest(BaseModel):
    code: str
    language: str

@router.post("/submit")
def submit_code(req: CodeSubmitRequest):
    if req.language != "python":
        return {"error": "Only Python supported for now"}

    test_cases = [
        {"input": "5", "output": "25"},
        {"input": "2", "output": "4"}
    ]

    result = evaluate_code_submission(req.code, test_cases)
    return result
