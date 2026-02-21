#!/bin/bash

# Update script for CheckIT System
# Pulls latest changes and updates dependencies

set -e

echo ">>> Updating CheckIT System..."

# Configure Git to use custom hooks (if not already set)
git config core.hooksPath .githooks

# 1. Pull Git Changes
echo ">>> Pulling latest code..."
git pull

echo ">>> Wiping database for a clean start..."
rm -f backend/checkit.db

# 2. Update Python Dependencies
echo ">>> Updating Python dependencies..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Error: venv not found! Run install_server.sh or install_client.sh first."
    exit 1
fi

# Detect Server or Client mode
if [ -f "../install_client.sh" ] && [ -f "/sys/firmware/devicetree/base/model" ]; then 
    # Likely RPi
    pip install -r requirements-client.txt
else
    # Likely Server
    pip install -r requirements-server.txt
fi

echo ">>> Update Complete! Please restart your service/uvicorn."
