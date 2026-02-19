import sys
import os
import time
import requests # Need to ensure requests is installed, usually is.
import platform

print("="*40)
print(" DIAGNOSTIC TOOL FOR CHECKIT RPI")
print("="*40)

# 1. Check Python & OS
print(f"Python: {sys.version.split()[0]}")
print(f"OS: {platform.system()} {platform.release()}")

# 2. Check GPIO Library
print("-" * 20)
print("Checking GPIO capability...")
try:
    import RPi.GPIO as GPIO
    print("✅ RPi.GPIO is installed.")
    try:
        GPIO.setmode(GPIO.BCM)
        print("✅ GPIO.setmode(GPIO.BCM) successful.")
        GPIO.cleanup()
    except Exception as e:
        print(f"❌ GPIO Hardware Error: {e}")
        print("   -> Try 'sudo apt-get install python3-rpi-lgpio' or 'pip install rpi-lgpio'")
except ImportError:
    print("❌ RPi.GPIO NOT found.")
    print("   -> Run: pip install rpi-lgpio")

# 3. Check Environment Variables
print("-" * 20)
force_rpi = os.environ.get("CHECKIT_IS_RPI")
print(f"CHECKIT_IS_RPI env var: {force_rpi}")

# 4. Check Config
print("-" * 20)
config_path = "backend/config.yaml"
if os.path.exists(config_path):
    print(f"✅ Config file found at {config_path}")
    with open(config_path, "r") as f:
        content = f.read()
        if "sync_endpoint" in content:
            print("   -> sync_endpoint is defined.")
        else:
            print("❌ sync_endpoint MISSING in config!")
else:
    print(f"❌ Config file NOT found at {config_path}!")

# 5. Network Connectivity
print("-" * 20)
SERVER_IP = "57.128.247.85"
print(f"Checking connectivity to Server ({SERVER_IP})...")
response = os.system(f"ping -c 1 {SERVER_IP} > /dev/null 2>&1")
if response == 0:
    print("✅ Ping Successful! Server is reachable.")
else:
    print("❌ Ping FAILED! Server is unreachable.")

# 6. API Check
print("-" * 20)
API_URL = f"http://{SERVER_IP}:8000/health" # Assuming health endpoint exists or similar
print(f"Checking API at {API_URL}...")
try:
    r = requests.get(API_URL, timeout=5)
    print(f"API Response: {r.status_code}")
    if r.status_code == 200:
        print("✅ API is accessible.")
    else:
        print("⚠️ API accessible but returned error.")
except Exception as e:
    print(f"❌ API Connection Failed: {e}")

print("="*40)
print("DIAGNOSTICS COMPLETE")
