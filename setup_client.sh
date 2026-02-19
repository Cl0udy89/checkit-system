#!/bin/bash

echo "========================================="
echo "  CheckIT Client Auto-Setup"
echo "========================================="

# 1. Ensure backend directory exists
mkdir -p backend

# 2. Check for config.yaml
if [ ! -f "backend/config.yaml" ]; then
    echo "❌ backend/config.yaml NOT found. Creating default..."
    
    cat > backend/config.yaml <<EOL
system:
  node_id: "checkit-rpi-auto"
  log_level: "INFO"
  platform_role: "client"

api:
  sync_endpoint: "http://57.128.247.85:8000/api/v1/logs"
  sync_interval_seconds: 5
  retry_interval_seconds: 5

game:
  initial_points: 10000
  points_decay_ms: 0.1

hardware:
  solenoid_pin: 17
  solenoid_open_time_sec: 5
EOL
    echo "✅ Created backend/config.yaml pointing to 57.128.247.85"
else
    echo "✅ backend/config.yaml already exists."
fi

# 3. Check for dependencies
echo "-----------------------------------------"
echo "Checking dependencies..."
if ! python3 -c "import rpi_lgpio" &> /dev/null; then
    echo "⚠️  rpi-lgpio not found. Installing..."
    pip install rpi-lgpio --break-system-packages
else
    echo "✅ rpi-lgpio installed."
fi

# 4. Start Application
echo "-----------------------------------------"
echo "Starting CheckIT Client..."
./start.sh
