from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import interview, code, record

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview.router)
app.include_router(code.router)
app.include_router(record.router)

import os

os.makedirs("storage/code_submissions", exist_ok=True)
os.makedirs("storage/recordings", exist_ok=True)
