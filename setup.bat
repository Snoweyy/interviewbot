@echo off
title MockMind AI - Setup
color 0A

echo.
echo  ==========================================
echo   MockMind AI - Interview Bot Setup
echo  ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Install from https://python.org/downloads
    pause
    exit /b 1
)
echo [OK] Python found

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check Ollama
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ollama not found! Install from https://ollama.ai
    pause
    exit /b 1
)
echo [OK] Ollama found

echo.
echo [1/3] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)
echo [OK] Python dependencies installed

echo.
echo [2/3] Installing React frontend dependencies...
cd react-frontend
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node.js dependencies
    pause
    exit /b 1
)
cd ..
echo [OK] React dependencies installed

echo.
echo [3/3] Pulling AI model (llama3.2:3b)...
echo This may take a few minutes depending on your internet speed...
ollama pull llama3.2:3b
if %errorlevel% neq 0 (
    echo [WARNING] Could not pull model automatically. Run: ollama pull llama3.2:3b
) else (
    echo [OK] AI model ready
)

echo.
echo  ==========================================
echo   Setup Complete!
echo   Run start.bat to launch the application
echo  ==========================================
echo.
pause
