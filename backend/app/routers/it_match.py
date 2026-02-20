from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import csv
import random
import os
from typing import List

router = APIRouter()

# Schema for sending questions to frontend
class ITMatchQuestion(BaseModel):
    id: int
    question: str
    image: str
    # We generally don't send 'is_correct' to frontend to prevent easy cheating, 
    # but for this simple kiosk game it might be easier to validate on frontend 
    # OR we validate on backend. 
    # Let's validate on backend for "security" practice, or send it if we want instant feedback without lag.
    # Given it's a "Tinder" swipe, instant feedback is key. Let's send it but maybe obfuscated?
    # For simplicity in this kiosk app, we will send it.
    is_correct: bool 

from app.services.content_service import content_service

from app.security import get_current_user
from app.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

@router.get("/questions", response_model=List[ITMatchQuestion])
async def get_questions(count: int = 10, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """
    Returns a random set of questions from ContentService.
    """
    from app.models import SystemConfig
    from sqlmodel import select
    conf_res = await session.execute(select(SystemConfig).where(SystemConfig.key == "competition_active"))
    conf = conf_res.scalar_one_or_none()
    if conf:
        if conf.value == "false":
            raise HTTPException(status_code=403, detail="ZAWODY_ZAKONCZONE")
        elif conf.value == "technical_break":
            raise HTTPException(status_code=403, detail="PRZERWA_TECHNICZNA")

    questions_data = content_service.get_questions("it_match", limit=50) # Get all avaliable
    
    # Map to schema
    mapped = []
    for q in questions_data:
        try:
            mapped.append(ITMatchQuestion(
                id=int(q.get('id', 0)),
                question=q.get('question', ''),
                image=q.get('image', ''),
                is_correct=bool(int(q.get('is_correct', 0)))
            ))
        except ValueError:
            continue
            
    if not mapped:
        return []
        
    sample_size = min(count, len(mapped))
    return random.sample(mapped, sample_size)
