@echo off
REM Quick Setup Script for Internshala Voice Interview Platform (Windows)
REM This script automates the initial setup process

echo.
echo 🎙️  Internshala Voice Interview Platform - Quick Setup
echo =======================================================
echo.

REM Check Node.js
echo 📦 Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo ✅ Node.js found
echo.

REM Check Python
echo 🐍 Checking Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ from https://python.org/
    pause
    exit /b 1
)
python --version
echo ✅ Python found
echo.

REM Check pip
echo 📦 Checking pip...
where pip >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ pip is not installed. Please install pip
    pause
    exit /b 1
)
echo ✅ pip found
echo.

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo ✅ Node.js dependencies installed
echo.

REM Install Python dependencies
echo 🐍 Installing Python dependencies...
pip install -r api_py\requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)
echo ✅ Python dependencies installed
echo.

REM Setup .env file
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created
    echo.
    echo ⚠️  IMPORTANT: Please edit .env and add your GEMINI_API_KEY
    echo    Get your API key from: https://aistudio.google.com/app/apikey
    echo.
) else (
    echo ✅ .env file already exists
    echo.
)

REM Final instructions
echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit .env and add your GEMINI_API_KEY (if not done already)
echo 2. Run 'npm run dev' to start the application
echo 3. Open http://localhost:5173 in your browser
echo.
echo For detailed instructions, see SETUP.md
echo.
pause
