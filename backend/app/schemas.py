from pydantic import BaseModel, EmailStr
from typing import List, Optional

class UserCreate(BaseModel):
    nick: str
    email: EmailStr
    agree_newsletter: bool = False

class UserRead(BaseModel):
    id: int
    nick: str
    email: str
    is_blocked: bool
    agree_newsletter: bool
    screenshot_b64: Optional[str] = None
    screenshot_name: Optional[str] = None

class LeaderboardEntry(BaseModel):
    nick: str
    score: int
    game_type: str

class GameResult(BaseModel):
    nick: str
    game_type: str
    score: int
    duration_ms: int
