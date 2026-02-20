#!/bin/bash
echo ""
echo "=========================================="
echo "  MockMind AI - Interview Bot Setup"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Install from https://python.org"
    exit 1
fi
echo "[OK] Python found"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Install from https://nodejs.org"
    exit 1
fi
echo "[OK] Node.js found"

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "[ERROR] Ollama not found. Install from https://ollama.ai"
    exit 1
fi
echo "[OK] Ollama found"

echo ""
echo "[1/3] Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "[2/3] Installing React frontend dependencies..."
cd react-frontend && npm install && cd ..

echo ""
echo "[3/3] Pulling AI model (llama3.2:3b)..."
ollama pull llama3.2:3b

echo ""
echo "=========================================="
echo "  Setup Complete! Run ./start.sh to launch"
echo "=========================================="
