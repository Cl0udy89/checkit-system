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
    """Returns a random set of term↔definition pairs for the TextMatch game."""
    from app.models import SystemConfig
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
    return random.sample(mapped, sample_size)
