import os
import uuid
import json
import tempfile
import speech_recognition as sr
from flask import Blueprint, request, jsonify

stt_bp = Blueprint('stt', __name__)

@stt_bp.route('/api/stt', methods=['POST'])
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    recognizer = sr.Recognizer()

    # Save to temp file
    suffix = '.wav'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        with sr.AudioFile(tmp_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.3)
            audio_data = recognizer.record(source)
        
        transcript = recognizer.recognize_google(audio_data)
        return jsonify({'transcript': transcript})
    except sr.UnknownValueError:
        return jsonify({'transcript': '', 'error': 'Could not understand audio'})
    except sr.RequestError as e:
        return jsonify({'transcript': '', 'error': f'STT service error: {str(e)}'}), 500
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
