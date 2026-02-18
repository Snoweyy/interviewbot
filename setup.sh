#!/bin/bash

# Quick Setup Script for Internshala Voice Interview Platform
# This script automates the initial setup process

echo "🎙️  Internshala Voice Interview Platform - Quick Setup"
echo "======================================================="
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

# Check Python
echo "🐍 Checking Python..."
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Python is not installed. Please install Python 3.8+ from https://python.org/"
        exit 1
    fi
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi
echo "✅ Python $($PYTHON_CMD --version) found"

# Check pip
echo "📦 Checking pip..."
if ! command -v pip3 &> /dev/null; then
    if ! command -v pip &> /dev/null; then
        echo "❌ pip is not installed. Please install pip"
        exit 1
    fi
    PIP_CMD="pip"
else
    PIP_CMD="pip3"
fi
echo "✅ pip found"

# Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi
echo "✅ Node.js dependencies installed"

# Install Python dependencies
echo ""
echo "🐍 Installing Python dependencies..."
$PIP_CMD install -r api_py/requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi
echo "✅ Python dependencies installed"

# Setup .env file
echo ""
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your GEMINI_API_KEY"
    echo "   Get your API key from: https://aistudio.google.com/app/apikey"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Final instructions
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your GEMINI_API_KEY (if not done already)"
echo "2. Run 'npm run dev' to start the application"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "For detailed instructions, see SETUP.md"
echo ""
