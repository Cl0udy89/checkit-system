#!/bin/bash
set -e

echo "========================================="
echo "  CheckIT RPi Hardware Agent"
echo "========================================="

# 1. System Dependencies (Run as root/sudo if needed, but try first)
if command -v apt-get &> /dev/null; then
    # Check if packages are installed to avoid sudo if possible, or just warn
    if ! dpkg -s swig liblgpio-dev python3-dev >/dev/null 2>&1; then
        echo ">>> Installing System Dependencies (Requires Root)..."
        sudo apt-get update && sudo apt-get install -y swig python3-dev python3-setuptools gcc liblgpio-dev
    fi
fi

# 2. Config Setup (Aggressive Fix)
CONFIG_FILE="config.yaml"

# Cleanup wrong location if I created it earlier
if [ -f "backend/config.yaml" ]; then
    echo "⚠️  Removing invalid backend/config.yaml..."
    rm "backend/config.yaml"
fi

# Check for BAD config domain and NUKE IT if found
if [ -f "$CONFIG_FILE" ]; then
    if grep -q "api.checkit.event" "$CONFIG_FILE"; then
        echo "⚠️  Outdated config detected ($CONFIG_FILE). Overwriting..."
        rm "$CONFIG_FILE"
    fi
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo ">>> Creating Client Configuration in ROOT..."
    cat > "$CONFIG_FILE" <<EOL
system:
  node_id: "checkit-rpi-01"
  log_level: "INFO"
  platform_role: "client"

api:
  sync_endpoint: "http://10.66.66.1:8080/api/v1/logs"
  sync_interval_seconds: 5
  retry_interval_seconds: 5

game:
  initial_points: 10000

hardware:
hardware:
  solenoid_pin: 26
  solenoid_open_time_sec: 5
EOL
    echo "✅ Configured for Server: 10.66.66.1"
fi

# 3. Python Environment & Dependencies
cd backend
if [ ! -d "venv" ]; then
    echo ">>> Creating venv..."
    python3 -m venv venv
fi
source venv/bin/activate

echo ">>> Installing Dependencies..."
# Install RPi specific lib first
if ! python3 -c "import rpi_lgpio" &> /dev/null; then
    pip install rpi-lgpio
fi
pip install -r requirements-core.txt

# 4. Run Application
echo ">>> Starting Hardware Agent..."
export CHECKIT_IS_RPI=true
exec uvicorn main:app --host 0.0.0.0 --port 8000
