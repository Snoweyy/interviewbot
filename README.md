# 🎯 MockMind AI — Interview Bot

An AI-powered mock interview bot with voice input, camera, and detailed scoring.  
Built with **React + Vite** (frontend) and **Python Flask + Ollama** (backend).

---

## ✅ Prerequisites

Before starting, make sure you have these installed:

| Tool | Install Link |
|------|-------------|
| Python 3.9+ | https://python.org/downloads |
| Node.js 18+ | https://nodejs.org |
| Ollama | https://ollama.ai |

---

## 🚀 Quick Setup (Windows)

Just double-click **`setup.bat`** — it will do everything automatically:
- Install Python dependencies
- Install Node.js dependencies for the React frontend
- Pull the `llama3.2:3b` AI model

Then to **run** the project, double-click **`start.bat`**.

---

## 🚀 Quick Setup (Mac / Linux)

```bash
chmod +x setup.sh
./setup.sh
```

Then to run:
```bash
./start.sh
```

---

## 🖐 Manual Setup

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Install React frontend dependencies
```bash
cd react-frontend
npm install
cd ..
```

### 3. Pull the AI model
```bash
ollama pull llama3.2:3b
```

### 4. Start Ollama (in a terminal)
```bash
ollama serve
```

### 5. Start Flask backend (in another terminal)
```bash
python app.py
```

### 6. Start React frontend (in another terminal)
```bash
cd react-frontend
npm run dev
```

### 7. Open the app
Go to 👉 **http://localhost:3000**

---

## 📁 Project Structure

```
interview bot/
├── app.py                  # Flask backend entry point
├── requirements.txt        # Python dependencies
├── routes/
│   ├── questions.py        # AI question generation
│   ├── score.py            # AI interview scoring
│   ├── resume.py           # Resume PDF parsing
│   └── health.py           # Health check
├── react-frontend/         # React app (Vite)
│   └── src/pages/
│       ├── Dashboard.jsx   # Setup page
│       ├── Checkin.jsx     # Camera/mic check
│       ├── Interview.jsx   # Interview page
│       └── Result.jsx      # Results page
└── frontend/               # (Legacy HTML pages, not used)
```

---

## ⚙️ How It Works

1. **Dashboard** — Enter your role, level, questions count, and upload your resume (PDF)
2. **Check-In** — Camera + mic permissions, AI generates questions in background
3. **Interview** — Answer questions via voice or text. AI reads questions aloud (TTS)
4. **Results** — Detailed score breakdown, strengths, improvements, and full transcript

---

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite + React Router + CSS Modules
- **Backend**: Python Flask + Flask-CORS
- **AI**: Ollama (`llama3.2:3b`) — runs fully locally
- **Resume**: PyMuPDF (PDF parsing)
- **Voice**: Browser Web Speech API (STT) + SpeechSynthesis (TTS)

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| `Ollama is not running` | Run `ollama serve` in a terminal |
| `Cannot connect to backend` | Make sure `python app.py` is running on port 5000 |
| `Voice not working` | Use Chrome or Edge (Web Speech API not supported in Firefox) |
| Questions not generating | Check Ollama is running and `llama3.2:3b` is pulled |
