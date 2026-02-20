@echo off
title MockMind AI
color 0A

echo.
echo  ==========================================
echo   MockMind AI - Starting Application
echo  ==========================================
echo.

REM Start Ollama in background
echo [1/3] Starting Ollama AI server...
start "Ollama" /min cmd /c "ollama serve"
timeout /t 2 /nobreak >nul
echo [OK] Ollama started

REM Start Flask backend  
echo [2/3] Starting Flask backend (port 5000)...
start "Flask Backend" /min cmd /c "python app.py"
timeout /t 2 /nobreak >nul
echo [OK] Flask backend started

REM Start React frontend
echo [3/3] Starting React frontend (port 3000)...
start "React Frontend" /min cmd /c "cd react-frontend && npm run dev"
timeout /t 4 /nobreak >nul
echo [OK] React frontend started

echo.
echo  ==========================================
echo   App is running!
echo   Open: http://localhost:3000
echo  ==========================================
echo.

REM Open browser automatically
start http://localhost:3000

echo Press any key to stop all servers...
pause >nul

REM Cleanup
taskkill /f /fi "WINDOWTITLE eq Ollama*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Flask Backend*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq React Frontend*" >nul 2>&1
echo All servers stopped.
pause
