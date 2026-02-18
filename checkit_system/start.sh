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
    # pip install RPi.GPIO # Uncomment if needed, usually installed system-wide or handled via core
else
    echo ">>> Server/PC detected. Skipping hardware libs."
fi

# 5. Start Frontend (Background)
if [ -d "../frontend" ]; then
    echo ">>> Starting Frontend..."
    cd ../frontend
    if [ ! -d "node_modules" ]; then
        echo ">>> Installing Frontend dependencies (first run)..."
        npm install
    fi
    # Run in background, silence output to keep terminal clean for backend logs
    npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo ">>> Frontend running on http://localhost:5173 (PID: $FRONTEND_PID)"
    cd ../backend
fi

# 6. Start Backend
echo ">>> Starting Backend..."
# Trap Ctrl+C to kill frontend too
trap "kill $FRONTEND_PID" EXIT

exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
