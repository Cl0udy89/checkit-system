from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import random

from app.services.content_service import content_service
from app.security import get_current_user
from app.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class TextMatchPair(BaseModel):
    id: int
    term: str
    definition: str


@router.get("/questions", response_model=List[TextMatchPair])
async def get_text_match_questions(
    count: int = 8,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Returns a deterministic set of pairs for this user. Records game start on first call."""
    from app.models import SystemConfig, GameScore, GameSession
    from sqlmodel import select

    conf_res = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "competition_active")
    )
    conf = conf_res.scalar_one_or_none()
    if conf:
        if conf.value == "false":
            raise HTTPException(status_code=403, detail="ZAWODY_ZAKONCZONE")
        elif conf.value == "technical_break":
            raise HTTPException(status_code=403, detail="PRZERWA_TECHNICZNA")

    # Block if already scored
    existing_score = (await session.execute(
        select(GameScore).where(GameScore.user_id == user.id, GameScore.game_type == "text_match")
    )).scalar_one_or_none()
    if existing_score:
        raise HTTPException(status_code=403, detail="ALREADY_PLAYED")

    # Register game start (once — subsequent calls are no-ops)
    existing_session = (await session.execute(
        select(GameSession).where(GameSession.user_id == user.id, GameSession.game_type == "text_match")
    )).scalar_one_or_none()
    if not existing_session:
        session.add(GameSession(user_id=user.id, game_type="text_match"))
        await session.commit()

    pairs_data = content_service.get_questions("text_match", limit=100)

    mapped: List[TextMatchPair] = []
    for q in pairs_data:
        try:
            mapped.append(
                TextMatchPair(
                    id=int(q.get("id", 0)),
                    term=q.get("term", ""),
                    definition=q.get("definition", ""),
                )
            )
        except (ValueError, TypeError):
            continue

    if not mapped:
        return []

    sample_size = min(count, len(mapped))
    rng = random.Random(user.id)
    return rng.sample(mapped, sample_size)
