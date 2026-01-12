from app.services.code_runner import run_python
from app.services.code_analyzer import analyze_code

def evaluate_code_submission(code: str, test_cases: list):
    """
    test_cases = [
        {"input": "5", "output": "25"},
        {"input": "0", "output": "0"}
    ]
    """

    passed = 0
    total = len(test_cases)

    # 1️⃣ Run test cases
    for case in test_cases:
        output = run_python(code, case["input"])
        if output.strip() == case["output"].strip():
            passed += 1

    correctness_score = (passed / total) * 70  # 70% weight

    # 2️⃣ AST analysis
    ast_result = analyze_code(code)

    structure_score = 0
    if ast_result["loops"] <= 1:
        structure_score += 10
    if ast_result["functions"] >= 1:
        structure_score += 10
    if not ast_result["recursion"]:
        structure_score += 10

    # 3️⃣ Final score
    final_score = round(correctness_score + structure_score, 2)

    return {
        "passed_cases": passed,
        "total_cases": total,
        "ast_analysis": ast_result,
        "final_score": final_score
    }
