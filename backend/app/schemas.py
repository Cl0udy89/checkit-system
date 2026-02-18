from pydantic import BaseModel, EmailStr
from typing import List, Optional

class UserCreate(BaseModel):
    nick: str
    email: EmailStr

class UserRead(BaseModel):
    id: int
    nick: str
    email: str
    is_blocked: bool

class LeaderboardEntry(BaseModel):
    nick: str
    score: int
    game_type: str

class GameResult(BaseModel):
    nick: str
    game_type: str
    score: int
    duration_ms: int
