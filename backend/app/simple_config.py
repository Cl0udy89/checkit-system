import os
import yaml
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
CONFIG_PATH = BASE_DIR / "config.yaml"

# Safe Defaults - system falls back to these if config.yaml is missing/broken
DEFAULTS = {
    "system": {
        "node_id": "checkit-default-node",
        "log_level": "INFO",
        "platform_role": "client",  # 'server' or 'client'
    },
    "api": {
        # prefer to override via ENV in production
        "sync_endpoint": "http://127.0.0.1:8000/api/v1/logs",
        "sync_interval_seconds": 60,
        "retry_interval_seconds": 10,
    },
    "game": {
        "initial_points": 10000,
        "points_decay_ms": 0.1,
        "decay_rate_per_ms": 0.05,
        "binary_brain_trigger_threshold": 0.8,
    },
    "hardware": {
        "solenoid_pin": 26,
        "solenoid_sensor_pin": 12,
        "solenoid_open_time_sec": 1,
        "patch_panel_scan_interval_ms": 50,
    },
    "auth": {
        "admin_user": "admin",
        # do NOT ship real password as default; override via ENV/real config
        "admin_pass": "change-me",
    },
    "security": {
        "profanity_list_url": "https://raw.githubusercontent.com/zacanger/profane-words/master/words.txt",
        "domain_blocklist": ["tempmail.com", "10minutemail.com"],
        "jwt_secret": "CHANGE_ME_IN_PROD_SECRET_KEY"
    },
}

class SimpleConfig:
    def __init__(self):
        # start from defaults
        self._config = {
            section: (values.copy() if isinstance(values, dict) else values)
            for section, values in DEFAULTS.items()
        }

        # then overlay config.yaml
        self.load_from_file()

        # then overlay ENV (highest priority)
        self.load_from_env()

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

            # shallow merge per section
            for section, values in user_config.items():
                if section in self._config and isinstance(self._config.get(section), dict) and isinstance(values, dict):
                    self._config[section].update(values)
                else:
                    self._config[section] = values

            print(f" INFO: Config loaded from {CONFIG_PATH}")
        except Exception as e:
            print(f" ERROR: Failed to load config.yaml: {e}. Using SAFE DEFAULTS.")

    def load_from_env(self):
        # system
        self._config["system"]["node_id"] = os.getenv("CHECKIT_NODE_ID", self._config["system"]["node_id"])
        self._config["system"]["log_level"] = os.getenv("CHECKIT_LOG_LEVEL", self._config["system"]["log_level"])
        self._config["system"]["platform_role"] = os.getenv(
            "CHECKIT_PLATFORM_ROLE", self._config["system"].get("platform_role", "client")
        )

        # api
        self._config["api"]["sync_endpoint"] = os.getenv("CHECKIT_SYNC_ENDPOINT", self._config["api"]["sync_endpoint"])
        self._config["api"]["sync_interval_seconds"] = int(
            os.getenv("CHECKIT_SYNC_INTERVAL_SECONDS", str(self._config["api"]["sync_interval_seconds"]))
        )
        self._config["api"]["retry_interval_seconds"] = int(
            os.getenv("CHECKIT_RETRY_INTERVAL_SECONDS", str(self._config["api"]["retry_interval_seconds"]))
        )

        # auth
        self._config["auth"]["admin_user"] = os.getenv("CHECKIT_ADMIN_USER", self._config["auth"]["admin_user"])
        self._config["auth"]["admin_pass"] = os.getenv("CHECKIT_ADMIN_PASS", self._config["auth"]["admin_pass"])

        # security
        self._config["security"]["jwt_secret"] = os.getenv("CHECKIT_JWT_SECRET", self._config["security"]["jwt_secret"])

    def get(self, section, key, default=None):
        return self._config.get(section, {}).get(key, default)

    # Helper properties
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

    # Root shortcuts
    @property
    def log_level(self): return self._config["system"]["log_level"]
    @property
    def node_id(self): return self._config["system"]["node_id"]

# Singleton instance
settings = SimpleConfig()
