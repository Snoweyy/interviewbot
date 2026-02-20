import os
import fitz  # PyMuPDF
import re
from flask import Blueprint, request, jsonify

resume_bp = Blueprint('resume', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')

def extract_name_from_text(text):
    """Try to extract candidate name from resume text (first non-empty line heuristic)."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines[:5]:
        # Skip lines that look like emails, phones, or headings
        if re.search(r'[@\d\|•]', line):
            continue
        if len(line.split()) <= 5 and len(line) < 50:
            return line
    return "Candidate"

@resume_bp.route('/api/parse-resume', methods=['POST'])
def parse_resume():
    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file uploaded'}), 400

    file = request.files['resume']
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are supported'}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()

        name = extract_name_from_text(full_text)
        return jsonify({'name': name, 'raw_text': full_text})
    except Exception as e:
        return jsonify({'error': f'Failed to parse resume: {str(e)}'}), 500
    finally:
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
