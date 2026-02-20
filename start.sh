#!/bin/bash
echo ""
echo "=========================================="
echo "  MockMind AI - Starting Application"
echo "=========================================="
echo ""

echo "[1/3] Starting Ollama..."
ollama serve &
sleep 2

echo "[2/3] Starting Flask backend..."
python3 app.py &
sleep 2

echo "[3/3] Starting React frontend..."
cd react-frontend && npm run dev &
sleep 4

echo ""
echo "=========================================="
echo "  App running at http://localhost:3000"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all servers"

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000
fi

wait
