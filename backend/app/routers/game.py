from fastapi import APIRouter, Depends, HTTPException
from app.security import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.services.content_service import content_service
from app.services.game_service import game_service
from app.schemas import GameResult
from app.models import GameScore as GameScoreModel
from pydantic import BaseModel
from typing import List, Dict, Any
from app.hardware.patch_panel import patch_panel

router = APIRouter(tags=["Games"])

class GameSubmit(BaseModel):
    user_id: int
    game_type: str
    answers: Dict[str, Any] # question_id: answer
    duration_ms: int
    score: int | None = None # Optional client-side calculated score

@router.get("/status")
async def get_user_game_status(user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """
    Returns the user's best score for each game type.
    """
    from sqlmodel import select
    from app.models import GameScore
    
    # Get all scores for user
    stmt = select(GameScore).where(GameScore.user_id == user.id)
    result = await session.execute(stmt)
    scores = result.scalars().all()
    
    status = {
        "binary_brain": {"played": False, "score": 0},
        "patch_master": {"played": False, "score": 0},
        "it_match": {"played": False, "score": 0}
    }
    
    for s in scores:
        if s.game_type in status:
            if s.score > status[s.game_type]["score"] or not status[s.game_type]["played"]:
                status[s.game_type]["played"] = True
                status[s.game_type]["score"] = s.score
                
    return status

@router.get("/content/{game_type}")
async def get_content(game_type: str):
    questions = content_service.get_questions(game_type, limit=50)
    # Sanitize: remove correct answer if we want strict security, 
    # but for this kiosk app, simple is fine. 
    # Actually, CSVs have columns like "ODPOWIEDZ_TAK_NIE" or "POPRAWNA". 
    # We should probably strip them for the client.
    sanitized = []
    for q in questions:
        q_copy = q.copy()
        if game_type == "binary_brain":
            # q_copy.pop("answer_correct", None) # Frontend needs this to render options!
            pass
            # Shuffle answers? No, frontend handles shuffling of options. 
            # We send all: answer_correct, answer_wrong1... 
            # WAIT. If we send "answer_correct", frontend can see it in network tab.
            # But we need it for frontend validation? 
            # Strategy: Send { "options": ["A", "B", "C", "D"], "id": "1", "image": "..." } 
            # And validate on backend? 
            # User wants "kiosk" style. Frontend validation is faster/easier for UI feedback.
            # Let's send "answer_correct" encrypted? Or just send it. It's a game for fun.
            # actually better: Send a list of answers ["Wrong1", "Correct", "Wrong2", "Wrong3"] shuffled
            # But then how do we know which is correct? Frontend needs a hash?
            # Or just send "correct_index"?
            pass 
        elif game_type == "it_match":
            q_copy.pop("is_correct", None) # Logic handled in specific router usually, but if called here...
        sanitized.append(q_copy)
    return sanitized

@router.post("/submit", response_model=GameResult)
async def submit_game(submission: GameSubmit, session: AsyncSession = Depends(get_session)):
    result = await game_service.finish_game(
        game_type=submission.game_type,
        user_id=submission.user_id,
        answers=submission.answers,
        duration_ms=submission.duration_ms,
        session=session,
        score=submission.score
    )
    
    # We need to fetch nick or just return what we have? 
    # GameResult schema requires nick.
    # We should join user table or just return score.
    # Let's simple return the score and rely on frontend to know the nick.
    # Or fetch user.
    # Ideally finish_game returns the model which has user_id.
    
    return GameResult(
        nick="Player", # Placeholder, or fetch from DB if needed
        game_type=result.game_type,
        score=result.score,
        duration_ms=result.duration_ms
    )

@router.get("/patch_panel/state")
async def get_patch_panel_state():
    return {
        "pairs": patch_panel.get_state(),
        "solved": patch_panel.is_solved()
    }
