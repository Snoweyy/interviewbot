# 🎙️ Internshala Real-Time Voice Interview Platform

An AI-powered voice interview platform that works seamlessly in **Brave browser** and other modern browsers. Features real-time speech-to-text, AI-generated interview questions using Google Gemini, and natural text-to-speech responses.

## ✨ Features

- 🎤 **Real-time Voice Interaction** - Hands-free interview experience
- 🤖 **AI-Powered Interviews** - Powered by Google Gemini 2.0
- 🌐 **Brave Browser Compatible** - Uses server-side STT/TTS
- 🔊 **Natural Voice Responses** - Edge TTS for realistic speech
- 📝 **Live Transcription** - See your responses in real-time
- 💾 **Optional Database** - Supabase integration (demo mode available)

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "internshal version beta version alpha - 1"
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r api_py/requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your Gemini API key
   # GEMINI_API_KEY=your_actual_api_key_here
   ```

5. **Run the application**
   ```bash
   # Option 1: Run both frontend and backend together
   npm run dev
   
   # Option 2: Run separately in different terminals
   npm run client:dev  # Frontend at http://localhost:5173
   npm run py:dev      # Backend at http://127.0.0.1:8000
   ```

6. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Allow microphone permissions when prompted
   - Start your interview!

## 📋 Configuration

### Required Environment Variables

```bash
# Google Gemini API (Required)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Optional Environment Variables

```bash
# Supabase (Optional - app works in demo mode without this)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Google Cloud STT/TTS (Optional - uses Whisper + Edge TTS by default)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Advanced Configuration
VITE_USE_BROWSER_STT=false  # Set to true to use browser STT (won't work in Brave)
AUDIO_SAMPLE_RATE=16000
MAX_INTERVIEW_DURATION=60
```

## 🏗️ Project Structure

```
.
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   └── assets/            # Static assets
├── api_py/                # Python FastAPI backend
│   ├── main.py            # Main API server
│   ├── services/          # STT, TTS, AI services
│   └── requirements.txt   # Python dependencies
├── .env.example           # Environment template
└── package.json           # Node.js dependencies
```

## 🔧 Technology Stack

### Frontend
- **React** + **TypeScript** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management

### Backend
- **FastAPI** - Python web framework
- **Faster Whisper** - Speech-to-Text
- **Edge TTS** - Text-to-Speech
- **Google Gemini** - AI interview generation
- **Supabase** (optional) - Database

## 🎯 How It Works

1. **User speaks** → Audio captured in browser
2. **Audio sent to backend** → Converted to base64
3. **Speech-to-Text** → Whisper transcribes audio
4. **AI Processing** → Gemini generates response
5. **Text-to-Speech** → Edge TTS creates audio
6. **Response played** → Audio and text shown to user

## 🐛 Troubleshooting

### Microphone not working
- Check browser permissions (allow microphone access)
- Ensure you're using HTTPS or localhost
- Try a different browser

### Backend errors
- Verify Python dependencies are installed: `pip install -r api_py/requirements.txt`
- Check that port 8000 is not in use
- Ensure `GEMINI_API_KEY` is set in `.env`

### Frontend not loading
- Clear browser cache
- Check that port 5173 is available
- Run `npm install` again

### Proxy errors (Corporate networks)
If you're getting proxy errors on a work laptop:

1. **Set proxy environment variables** in `.env`:
   ```bash
   HTTP_PROXY=http://your-proxy:port
   HTTPS_PROXY=http://your-proxy:port
   NO_PROXY=localhost,127.0.0.1
   ```

2. **Configure npm proxy**:
   ```bash
   npm config set proxy http://your-proxy:port
   npm config set https-proxy http://your-proxy:port
   ```

3. **Configure pip proxy**:
   ```bash
   pip config set global.proxy http://your-proxy:port
   ```

4. **For detailed proxy setup**: See [PROXY-SETUP.md](PROXY-SETUP.md)

5. **Alternative**: Use your personal device or home network for testing

## 📝 Scripts

```bash
npm run dev          # Run both frontend and backend
npm run client:dev   # Run frontend only (port 5173)
npm run py:dev       # Run backend only (port 8000)
npm run build        # Build for production
npm run lint         # Run ESLint
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Faster Whisper for speech recognition
- Edge TTS for natural voice synthesis
- Supabase for database infrastructure

---

**Made with ❤️ for better interview experiences**
