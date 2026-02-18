from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nick: str = Field(index=True, unique=True)
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_blocked: bool = Field(default=False)

class GameScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    game_type: str = Field(index=True) # "binary_brain", "patch_master", "it_match"
    score: int
    duration_ms: int
    played_at: datetime = Field(default_factory=datetime.utcnow)
    synced: bool = Field(default=False)

class GameLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_type: str
    details: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    synced: bool = Field(default=False)

class SystemConfig(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str

class EmailTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True) # e.g. "winner_grandmaster"
    subject: str
    body_template: str # Jinja2 format or simple f-string placeholders
