import yaml
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
CONFIG_PATH = BASE_DIR / "config.yaml"

# Safe Defaults - The system will ALWAYS fall back to these if config.yaml is missing or broken.
DEFAULTS = {
    "system": {
        "node_id": "checkit-default-node",
        "log_level": "INFO",
        "platform_role": "client"  # 'server' or 'client'
    },
    "api": {
        "sync_endpoint": "http://localhost:8000/api/v1/logs", # Default to local
        "sync_interval_seconds": 60,
        "retry_interval_seconds": 10
    },
    "game": {
        "initial_points": 10000,
        "points_decay_ms": 0.1,
        "binary_brain_trigger_threshold": 0.8
    },
    "hardware": {
        "solenoid_pin": 26, # BCM
        "solenoid_open_time_sec": 5,
        "patch_panel_scan_interval_ms": 50
    },
    "auth": {
        "admin_user": "admin",
        "admin_pass": "checkit2024"
    },
    "security": {
        "profanity_list_url": "https://raw.githubusercontent.com/zacanger/profane-words/master/words.txt",
        "domain_blocklist": ["tempmail.com", "10minutemail.com"]
    }
}

class SimpleConfig:
    def __init__(self):
        self._config = DEFAULTS.copy()
        self.load_from_file()

    def load_from_file(self):
        if not CONFIG_PATH.exists():
            print(f" WARN: Config file not found at {CONFIG_PATH}. Using SAFE DEFAULTS.")
            return

        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                user_config = yaml.safe_load(f)
                if not user_config:
                    print(" WARN: Config file is empty. Using SAFE DEFAULTS.")
                    return
                # Deep merge would be better, but for now simple override of sections
                for section, values in user_config.items():
                    if section in self._config and isinstance(values, dict):
                         self._config[section].update(values)
                    else:
                        self._config[section] = values
            print(f" INFO: Config loaded from {CONFIG_PATH}")
        except Exception as e:
            print(f" ERROR: Failed to load config.yaml: {e}. Using SAFE DEFAULTS.")

    def get(self, section, key, default=None):
        return self._config.get(section, {}).get(key, default)

    # Helper properties for cleaner access code
    @property
    def system(self): return type("SystemConfig", (), self._config["system"])
    @property
    def api(self): return type("APIConfig", (), self._config["api"])
    @property
    def game(self): return type("GameConfig", (), self._config["game"])
    @property
    def hardware(self): return type("HardwareConfig", (), self._config["hardware"])
    @property
    def auth(self): return type("AuthConfig", (), self._config["auth"])
    @property
    def security(self): return type("SecurityConfig", (), self._config["security"])

    # Root Level Shortcuts (Fixes AttributeError in main.py)
    @property
    def log_level(self): return self._config["system"]["log_level"]
    @property
    def node_id(self): return self._config["system"]["node_id"]

# Singleton instance
settings = SimpleConfig()
