from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import uuid

router = APIRouter(prefix="/record", tags=["Recording"])

BASE_DIR = "storage/recordings"

@router.post("/upload")
async def upload_recording(
    session_id: str = Form(...),
    video: UploadFile = File(...)
):
    os.makedirs(BASE_DIR, exist_ok=True)

    if not video.content_type.startswith("video/"):
        raise HTTPException(400, "Invalid video file")

    filename = f"{session_id}_{uuid.uuid4()}.webm"
    file_path = os.path.join(BASE_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(await video.read())

    return {
        "message": "Video uploaded",
        "file": filename
    }
