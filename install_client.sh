#!/bin/bash

# CheckIT System Installer - CLIENT MODE (Raspberry Pi)
# INSTALLS HARDWARE LIBRARIES & KIOSK CONFIG

set -e

# Detect sudo
if command -v sudo &> /dev/null; then
    SUDO="sudo"
    SUDO_E="sudo -E"
else
    SUDO=""
    SUDO_E=""
fi

echo ">>> Starting CheckIT CLIENT Installation..."

# 1. System Updates & Dependencies (With Hardware Libs)
echo ">>> Updating system and installing dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y python3-pip python3-venv git build-essential python3-dev \
    libgpiod2 libopenjp2-7 libtiff5 libatlas-base-dev \
    python3-rpi.gpio 

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
    python3 -m venv venv --system-site-packages
    # --system-site-packages ensures we can use apt-installed RPi.GPIO if pip fails
    echo "Created venv."
fi

source venv/bin/activate
echo ">>> Installing Python CLIENT requirements..."
if [ -f "requirements-client.txt" ]; then
    pip install -r requirements-client.txt
else
    echo "Error: backend/requirements-client.txt not found!"
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

# 5. Kiosk Autostart Configuration (LXDE/Openbox common on RPi)
echo ">>> Configuring Kiosk Autostart (assuming LXDE/Openbox)..."
AUTOSTART_DIR="/home/$USER/.config/lxsession/LXDE-pi"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

if [ -d "$AUTOSTART_DIR" ]; then
    if ! grep -q "chromium-browser" "$AUTOSTART_FILE"; then
        echo "@xset s off" >> "$AUTOSTART_FILE"
        echo "@xset -dpms" >> "$AUTOSTART_FILE"
        echo "@xset s noblank" >> "$AUTOSTART_FILE"
        echo "@chromium-browser --kiosk --incognito http://localhost:5173" >> "$AUTOSTART_FILE"
        echo "Added Kiosk autostart to $AUTOSTART_FILE"
    else
        echo "Kiosk config likely already exists in $AUTOSTART_FILE"
    fi
else
    echo "Warning: LXDE-pi config directory not found. Skipping Kiosk autostart config."
    echo "Please configure your Wayland/X11 autostart manually."
fi

echo ""
echo ">>> CLIENT INSTALLATION COMPLETE!"
echo ">>> To run Backend: cd backend && source venv/bin/activate && python main.py"
echo ">>> To run Frontend: cd frontend && npm run dev"
echo ">>> Ensure 'config.yaml' IP points to the SERVER."
