import yaml
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Dict, Any, Optional

CONFIG_PATH = Path(__file__).parent.parent.parent / "config.yaml"

class HardwareConfig(BaseSettings):
    solenoid_pin: int = 26
    solenoid_open_time_sec: int = 5
    
class GameConfig(BaseSettings):
    initial_points: int = 10000
    points_decay_ms: float = 0.1
    
class APIConfig(BaseSettings):
    sync_endpoint: str = "https://api.checkit.event/v1/logs"
    sync_interval_seconds: int = 60
    retry_interval_seconds: int = 10

class AuthConfig(BaseSettings):
    admin_user: str = "admin"
    admin_pass: str = "checkit2024"

class SecurityConfig(BaseSettings):
    profanity_list_url: Optional[str] = None
    domain_blocklist: List[str] = []

class Settings(BaseSettings):
    node_id: str = "checkit-rpi-01"
    log_level: str = "INFO"
    
    api: APIConfig
    game: GameConfig
    hardware: HardwareConfig
    auth: AuthConfig
    security: SecurityConfig

    @classmethod
    def load(cls) -> "Settings":
        if not CONFIG_PATH.exists():
            print(f"Warning: Config file not found at {CONFIG_PATH}. Using defaults.")
            return cls(
                api=APIConfig(),
                game=GameConfig(),
                hardware=HardwareConfig(),
                auth=AuthConfig(),
                security=SecurityConfig()
            )
            
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            raw_config = yaml.safe_load(f)

        return cls(
            node_id=raw_config.get("system", {}).get("node_id", "checkit-rpi-01"),
            log_level=raw_config.get("system", {}).get("log_level", "INFO"),
            api=APIConfig(**raw_config.get("api", {})),
            game=GameConfig(**raw_config.get("game", {})),
            hardware=HardwareConfig(**raw_config.get("hardware", {})),
            auth=AuthConfig(**raw_config.get("auth", {})),
            security=SecurityConfig(**raw_config.get("security", {}))
        )

settings = Settings.load()
