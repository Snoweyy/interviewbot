# 📚 Detailed Setup Guide

This guide will walk you through setting up the Internshala Voice Interview Platform step-by-step.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Installing Prerequisites](#installing-prerequisites)
3. [Project Setup](#project-setup)
4. [Getting API Keys](#getting-api-keys)
5. [Running the Application](#running-the-application)
6. [Common Issues](#common-issues)

---

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 18 or higher
- **Python**: Version 3.8 or higher
- **RAM**: At least 4GB (8GB recommended)
- **Internet**: Required for AI API calls

---

## Installing Prerequisites

### 1. Install Node.js

**Windows/macOS:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Python

**Windows:**
1. Download from [python.org](https://www.python.org/downloads/)
2. **Important**: Check "Add Python to PATH" during installation
3. Verify installation:
   ```bash
   python --version
   pip --version
   ```

**macOS:**
```bash
brew install python@3.11
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

---

## Project Setup

### Step 1: Clone or Download the Project

**Option A: Using Git**
```bash
git clone <your-repository-url>
cd "internshal version beta version alpha - 1"
```

**Option B: Download ZIP**
1. Download the project ZIP file
2. Extract it to your desired location
3. Open terminal/command prompt in that folder

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This will install all frontend dependencies. It may take a few minutes.

### Step 3: Install Python Dependencies

```bash
# Windows
pip install -r api_py/requirements.txt

# macOS/Linux
pip3 install -r api_py/requirements.txt
```

**Note**: If you encounter permission errors on Linux/macOS, use:
```bash
pip3 install --user -r api_py/requirements.txt
```

---

## Getting API Keys

### Google Gemini API Key (Required)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated API key
5. Keep it safe - you'll need it in the next step

### Supabase (Optional)

The app works in demo mode without Supabase. If you want to save interview data:

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys from Settings → API

---

## Configuration

### Step 1: Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Windows (if cp doesn't work)
copy .env.example .env
```

### Step 2: Edit .env File

Open `.env` in any text editor and add your API key:

```bash
# Required
GEMINI_API_KEY=AIzaSy...your_actual_key_here

# Optional (leave as-is if you don't have Supabase)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Keep these defaults
VITE_USE_BROWSER_STT=false
AUDIO_SAMPLE_RATE=16000
MAX_INTERVIEW_DURATION=60
```

**Save the file** after editing.

---

## Running the Application

### Method 1: Run Everything Together (Recommended)

```bash
npm run dev
```

This starts both frontend and backend. You'll see:
- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`

### Method 2: Run Separately

**Terminal 1 - Frontend:**
```bash
npm run client:dev
```

**Terminal 2 - Backend:**
```bash
npm run py:dev
```

### Step 3: Open in Browser

1. Open your browser (Chrome, Brave, Firefox, etc.)
2. Navigate to `http://localhost:5173`
3. Allow microphone permissions when prompted
4. Click "Start Interview" and begin speaking!

---

## Common Issues

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Python dependencies fail to install

**Solution:**
```bash
# Upgrade pip first
python -m pip install --upgrade pip

# Try installing again
pip install -r api_py/requirements.txt
```

### Issue: Port already in use

**Solution:**
```bash
# Find and kill the process using the port
# Windows
netstat -ano | findstr :5173
taskkill /PID <process_id> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

### Issue: Microphone not working

**Solutions:**
1. Check browser permissions (click lock icon in address bar)
2. Make sure you're using `localhost` or HTTPS
3. Try a different browser
4. Check system microphone settings

### Issue: "GEMINI_API_KEY not found"

**Solution:**
1. Verify `.env` file exists in project root
2. Check that `GEMINI_API_KEY=` has your actual key (no spaces)
3. Restart the backend server after editing `.env`

### Issue: Backend won't start

**Solution:**
```bash
# Check if port 8000 is in use
# Windows
netstat -ano | findstr :8000

# macOS/Linux
lsof -i:8000

# Kill the process if needed, then restart
npm run py:dev
```

### Issue: Proxy errors on corporate laptop

If you're behind a corporate firewall/proxy:

**Step 1: Find your proxy settings**
- Windows: Settings → Network & Internet → Proxy
- Look for proxy address and port (e.g., `proxy.company.com:8080`)

**Step 2: Configure environment**
Add to your `.env` file:
```bash
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1
```

**Step 3: Configure npm**
```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
npm config set strict-ssl false  # Only if SSL issues persist
```

**Step 4: Configure pip**
```bash
pip config set global.proxy http://proxy.company.com:8080
```

**Step 5: Test connection**
```bash
# Test if you can reach external sites
curl https://www.google.com

# If curl fails, verify proxy settings with IT
```

**Alternative solutions:**
- Use a personal device or home network
- Ask IT to whitelist required domains:
  - `aistudio.google.com` (Gemini API)
  - `npmjs.org` (npm packages)
  - `pypi.org` (Python packages)
- Use mobile hotspot temporarily for setup

---

## Verifying Installation

### Check Frontend
- Visit `http://localhost:5173`
- You should see the interview interface
- No console errors in browser DevTools (F12)

### Check Backend
- Visit `http://127.0.0.1:8000/docs`
- You should see FastAPI documentation
- Try the `/health` endpoint

### Check Full Flow
1. Click "Start Interview"
2. Allow microphone access
3. Speak a test phrase
4. You should hear an AI response

---

## Next Steps

- Customize interview questions in `api_py/services/`
- Modify UI styling in `src/assets/styles/`
- Add your own features!

## Getting Help

If you encounter issues not covered here:
1. Check the main [README.md](README.md)
2. Look for error messages in:
   - Browser console (F12)
   - Backend terminal output
3. Ensure all prerequisites are correctly installed

---

**Happy Interviewing! 🎉**
