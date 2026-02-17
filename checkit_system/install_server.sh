#!/bin/bash

# CheckIT System Installer - SERVER MODE (x86/Proxmox)
# INSTALS WEB SERVER ONLY - NO HARDWARE LIBRARIES

set -e

# Detect sudo
if command -v sudo &> /dev/null; then
    SUDO="sudo"
    SUDO_E="sudo -E"
else
    SUDO=""
    SUDO_E=""
fi

echo ">>> Starting CheckIT SERVER Installation..."

# 1. System Updates & Dependencies (Web Only)
echo ">>> Updating system and installing dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y python3-pip python3-venv git build-essential python3-dev

# 2. Node.js Setup
echo ">>> Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO_E bash -
    $SUDO apt-get install -y nodejs
else
    echo "Node.js already installed: $(node -v)"
fi

# 3. Python Environment
echo ">>> Setting up Python virtual environment..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created venv."
fi

source venv/bin/activate
echo ">>> Installing Python SERVER requirements (No GPIO)..."
if [ -f "requirements-server.txt" ]; then
    pip install -r requirements-server.txt
else
    echo "Error: backend/requirements-server.txt not found!"
    exit 1
fi

# 4. Frontend Setup
echo ">>> Setting up Frontend..."
cd ../frontend
if [ -f "package.json" ]; then
    npm install
else
    echo "Warning: frontend/package.json not found."
fi

echo ""
echo ">>> SERVER INSTALLATION COMPLETE!"
echo ">>> To run Backend: cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000"
echo ">>> To run Frontend: cd frontend && npm run dev (or build for production)"
