import subprocess
import uuid
import os

BASE_DIR = "storage/code_submissions"

def run_python(code: str, test_input: str):
    os.makedirs(BASE_DIR, exist_ok=True)  # ✅ IMPORTANT FIX

    file_id = str(uuid.uuid4())
    file_path = os.path.join(BASE_DIR, f"{file_id}.py")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    try:
        result = subprocess.run(
            ["python", file_path],
            input=test_input,
            text=True,
            capture_output=True,
            timeout=5
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "TIME_LIMIT_EXCEEDED"
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
