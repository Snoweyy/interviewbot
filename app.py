import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.questions import questions_bp
from routes.resume import resume_bp
from routes.score import score_bp
from routes.stt import stt_bp

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

# Register blueprints
app.register_blueprint(questions_bp)
app.register_blueprint(resume_bp)
app.register_blueprint(score_bp)
app.register_blueprint(stt_bp)

@app.route('/')
def serve_dashboard():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

@app.route('/api/health', methods=['GET'])
def health():
    import requests
    try:
        r = requests.get('http://localhost:11434/api/tags', timeout=3)
        ollama_ok = r.status_code == 200
    except:
        ollama_ok = False
    return {'status': 'ok', 'ollama': ollama_ok}

if __name__ == '__main__':
    print("=" * 50)
    print("  Mock Interview Bot - Starting Server")
    print("  Open: http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, port=5000)
