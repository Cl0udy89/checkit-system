import yaml
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Dict, Any

CONFIG_PATH = Path(__file__).parent.parent.parent / "config.yaml"

class HardwareConfig(BaseSettings):
    solenoid_pin: int = 26
    solenoid_active_duration: int = 5
    patch_panel_scan_interval_ms: int = 50

class GameConfig(BaseSettings):
    initial_points: int = 10000
    decay_rate_per_ms: float = 0.1
    binary_brain_trigger_threshold: float = 0.8

class APIConfig(BaseSettings):
    sync_endpoint: str
    sync_interval_seconds: int = 60
    retry_interval_seconds: int = 10

class SecurityConfig(BaseSettings):
    profanity_list_url: str
    domain_blocklist: List[str]

class Settings(BaseSettings):
    node_id: str
    log_level: str
    
    api: APIConfig
    game: GameConfig
    hardware: HardwareConfig
    security: SecurityConfig

    @classmethod
    def load(cls) -> "Settings":
        if not CONFIG_PATH.exists():
            raise FileNotFoundError(f"Config file not found at {CONFIG_PATH}")
            
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            raw_config = yaml.safe_load(f)

        # Map nested raw config to Pydantic models
        return cls(
            node_id=raw_config["system"]["node_id"],
            log_level=raw_config["system"]["log_level"],
            api=APIConfig(**raw_config["api"]),
            game=GameConfig(**raw_config["game"]),
            hardware=HardwareConfig(
                solenoid_pin=raw_config["hardware"]["solenoid"]["gpio_pin"],
                solenoid_active_duration=raw_config["hardware"]["solenoid"]["active_duration_seconds"],
                patch_panel_scan_interval_ms=raw_config["hardware"]["patch_panel"]["scan_interval_ms"]
            ),
            security=SecurityConfig(**raw_config["security"])
        )

settings = Settings.load()
