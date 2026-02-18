from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc
from sqlalchemy.future import select
from app.database import get_session
from app.models import GameScore, User
from typing import List, Dict

router = APIRouter(tags=["Leaderboard"])

@router.get("/")
async def get_leaderboard(session: AsyncSession = Depends(get_session)):
    # 1. Top Scores per Game
    # We want top 10 for each game type
    
    async def get_top(game_type: str):
        stmt = (
            select(GameScore.score, User.nick)
            .join(User)
            .where(GameScore.game_type == game_type)
            .order_by(desc(GameScore.score))
            .limit(10)
        )
        result = await session.execute(stmt)
        rows = result.all()
        print(f"DEBUG: Leaderboard for {game_type}: Found {len(rows)} rows")
        return [{"nick": row.nick, "score": row.score} for row in rows]

    binary_brain = await get_top("binary_brain")
    patch_master = await get_top("patch_master")
    it_match = await get_top("it_match")
    
    # 2. Grandmaster (Sum of max scores per user)
    # This is complex in SQL. 
    # Simplify: Get all scores, group by user in python? Or use complex query.
    # For now, let's just show top individual game scores. 
    # Implementing Grandmaster logic in SQL:
    # SELECT user_id, SUM(max_score_per_game) ...
    # Let's do a simplified aggregation: Sum of all scores? No, sum of BEST score per game.
    
    # Correct Logic:
    # 1. For each user, find max score in each game type.
    # 2. Sum these max scores.
    # 3. Sort.
    
    # Given SQLite constraints and complexity, let's fetch all scores and aggregate in Python (assuming < 1000 users for this event).
    stmt = select(GameScore.user_id, GameScore.game_type, GameScore.score, User.nick).join(User)
    all_scores_result = await session.execute(stmt)
    
    user_best = {} # user_id -> {nick: str, scores: {game_type: max_score}}
    
    for row in all_scores_result:
        uid, gtype, score, nick = row.user_id, row.game_type, row.score, row.nick
        if uid not in user_best:
            user_best[uid] = {"nick": nick, "total": 0, "games": {}}
        
        current_max = user_best[uid]["games"].get(gtype, 0)
        if score > current_max:
            user_best[uid]["games"][gtype] = score
            
    # Calculate totals
    grandmaster_list = []
    for uid, data in user_best.items():
        total = sum(data["games"].values())
        grandmaster_list.append({"nick": data["nick"], "score": total})
        
    # Sort and limit
    grandmaster_list.sort(key=lambda x: x["score"], reverse=True)
    grandmaster_top = grandmaster_list[:10]

    return {
        "binary_brain": binary_brain,
        "patch_master": patch_master,
        "it_match": it_match,
        "grandmaster": grandmaster_top
    }
