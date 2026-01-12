# AI-Driven Interview Platform Backend

This is the backend for an AI-driven interview platform, built with FastAPI.

## Project Structure

- `app/`: Main application logic.
  - `api/`: API endpoints.
  - `models/`: Database models.
  - `services/`: Business logic and AI services.
  - `utils/`: Utility functions.
- `storage/`: Local storage for recordings and code submissions.

## Getting Started

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```
