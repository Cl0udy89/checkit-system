#!/bin/bash

# CheckIT System Installer for Raspberry Pi OS (Bookworm)

set -e

echo ">>> Starting CheckIT System Installation..."

# 1. System Updates & Dependencies
echo ">>> Updating system and installing dependencies..."

# Detect sudo
if command -v sudo &> /dev/null; then
    SUDO="sudo"
    SUDO_E="sudo -E"
else
    SUDO=""
    SUDO_E=""
fi

$SUDO apt-get update
$SUDO apt-get install -y python3-pip python3-venv git libgpiod2 libopenjp2-7 libtiff5 libatlas-base-dev build-essential python3-dev

# 2. Node.js Setup (using nvm or simpler method for RPi)
echo ">>> Installing Node.js (Latest LTS)..."
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
echo ">>> Installing Python requirements..."
# Note: requirements.txt should be created first
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Warning: backend/requirements.txt not found. Skipping pip install."
fi

# 4. Frontend Setup
echo ">>> Setting up Frontend..."
cd ../frontend
if [ -f "package.json" ]; then
    npm install
else
    echo "Warning: frontend/package.json not found. Skipping npm install."
fi

echo ">>> Installation Complete! Please check config.yaml and populate content/."
