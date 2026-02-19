#!/bin/bash
set -e

# ==========================================
# CheckIT System Unified Launcher
# ==========================================

echo ">>> CheckIT System Startup..."

# 1. Update Code (if git is available)
if command -v git &> /dev/null; then
    echo ">>> Checking for updates..."
    git pull || echo "WARN: Git pull failed, continuing with local code."
else
    echo "WARN: Git not installed. Skipping update check."
fi

# 2. Setup Config
if [ ! -f "config.yaml" ]; then
    echo ">>> No config.yaml found!"
    echo "Select your role:"
    echo "1) SERVER (PC/Proxmox - Database & API)"
    echo "2) CLIENT (Raspberry Pi - Hardware & Game)"
    read -p "Enter 1 or 2: " choice
    if [ "$choice" = "1" ]; then
        cp config-server.example.yaml config.yaml
        echo ">>> Configured as SERVER."
    else
        cp config-client.example.yaml config.yaml
        echo ">>> Configured as CLIENT."
    fi
fi

# 3. Setup Python Environment
cd backend
if [ ! -d "venv" ]; then
    echo ">>> Creating Python venv..."
    python3 -m venv venv
fi
source venv/bin/activate

# 4. Install Dependencies
echo ">>> Checking dependencies..."
# Core requirements are always needed
pip install -r requirements-core.txt

# Platform specific check
if grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo ">>> RPi detected. Installing hardware libs..."
    # Always install rpi-lgpio for modern support
    pip install rpi-lgpio
fi

# Check if Client config
if grep -q "platform_role: \"client\"" config.yaml; then
    echo ">>> Installing Client Dependencies..."
    pip install -r requirements-client.txt
fi

# 5. Start Frontend (Background)
# Go back to root first to be safe
cd ..
if [ -d "frontend" ]; then
    echo ">>> Checking Frontend..."
    if ! command -v npm &> /dev/null; then
        echo " WARN: 'npm' not found! Frontend cannot start."
        echo "       Please install nodejs and npm (e.g. 'sudo apt install nodejs npm')."
    else
        echo ">>> Starting Frontend..."
        cd frontend
        if [ ! -d "node_modules" ]; then
            echo ">>> Installing Frontend dependencies (first run)..."
            npm install
        fi
        
        # Run in background, logging to file
        echo ">>> Launching Frontend (npm run dev -- --host)..."
        npm run dev -- --host 0.0.0.0 > ../frontend_startup.log 2>&1 &
        FRONTEND_PID=$!
        echo ">>> Frontend PID: $FRONTEND_PID. Logs at frontend_startup.log"
        echo ">>> Access at http://localhost:5173 (or Server IP)"
        cd ..
    fi
else
    echo " WARN: frontend directory not found."
fi

# 6. Start Backend
cd backend
echo ">>> Starting Backend (Uvicorn)..."

# Trap Ctrl+C (SIGINT) and SIGTERM to kill frontend when backend stops
cleanup() {
    echo ">>> Shutting down..."
    if [ ! -z "$FRONTEND_PID" ]; then
        echo ">>> Killing Frontend (PID $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM

# Run Uvicorn WITHOUT exec, so we can trap signals
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
wait $BACKEND_PID
