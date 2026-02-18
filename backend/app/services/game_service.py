import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import GameScore, GameLog
from app.simple_config import settings
from app.services.content_service import content_service
from app.hardware.solenoid import solenoid
from app.hardware.patch_panel import patch_panel

logger = logging.getLogger(__name__)

class GameService:
    async def finish_game(self, 
                          game_type: str, 
                          user_id: int, 
                          answers: dict, 
                          duration_ms: int,
                          session: AsyncSession,
                          score: int = None) -> GameScore:
        
        score = 0
        passed = False
        
        # 1. Calculate Score
        if game_type == "binary_brain":
            if score is not None:
                # Trust client score for Kiosk mode
                pass
            else:
                score, _ = await self._calculate_binary_brain(answers, duration_ms)
            
            # Solenoid Trigger: Score >= 5000
            if score >= 5000:
                logger.info(f"Binary Brain passed! Score: {score}. Triggering Solenoid.")
                import asyncio
                asyncio.create_task(solenoid.open_box())
                
                # Log Event
                session.add(GameLog(event_type="SOLENOID", details=f"Open Triggered by User {user_id} (Score: {score})"))
            else:
                logger.info(f"Binary Brain finished but score {score} < 5000. No box.")

        elif game_type == "patch_master":
            score = await self._calculate_patch_master(duration_ms)
            # Patch Master validation is checking hardware state
            # Assuming client calls finish when it Thinks it's done.
            # Double check hardware:
            if not patch_panel.is_solved():
                logger.warning("Patch Master finish requested but hardware not solved.")
                score = 0 # Penalty?
            else:
                logger.info("Patch Master solved verified.")

        elif game_type == "it_match":
            score = await self._calculate_it_match(answers, duration_ms)

        # 2. Save Score
        game_score = GameScore(
            user_id=user_id,
            game_type=game_type,
            score=max(0, int(score)), # Ensure non-negative
            duration_ms=duration_ms,
            synced=False
        )
        try:
            session.add(game_score)
            
            # Add Log
            session.add(GameLog(event_type="GAME_FINISHED", details=f"User {user_id} finished {game_type} with {score} pts"))
            
            await session.commit()
            await session.refresh(game_score)
            logger.info(f"GameScore saved: {game_score}")
        except Exception as e:
            logger.error(f"Failed to save GameScore: {e}")
            await session.rollback()
            raise e
        
        return game_score

    async def _calculate_binary_brain(self, answers: dict, duration_ms: int):
        # answers: {question_id: selected_answer}
        correct_count = 0
        total_questions = len(answers)
        
        if total_questions == 0:
            return 0, False

        for q_id, ans in answers.items():
            correct = content_service.get_correct_answer("binary_brain", q_id)
            if correct and ans == correct:
                correct_count += 1
        
        accuracy = correct_count / total_questions
        
        # Time Decay
        # Max Score = 10000
        # Decay = duration_ms * decay_rate
        base_score = settings.game.initial_points
        time_penalty = duration_ms * settings.game.decay_rate_per_ms
        
        final_score = (base_score - time_penalty) * accuracy
        
        passed = accuracy >= settings.game.binary_brain_trigger_threshold
        
        return final_score, passed

    async def _calculate_patch_master(self, duration_ms: int):
        # Score purely based on time if solved
        base_score = settings.game.initial_points
        time_penalty = duration_ms * settings.game.decay_rate_per_ms
        return base_score - time_penalty

    async def _calculate_it_match(self, answers: dict, duration_ms: int):
        # Similar logic
        correct_count = 0
        for q_id, ans in answers.items():
            correct = content_service.get_correct_answer("it_match", q_id)
            # IT Match usually is YES/NO.
            if correct and str(ans).lower() == str(correct).lower():
                correct_count += 1
        
        accuracy = correct_count / max(1, len(answers))
        base_score = settings.game.initial_points
        time_penalty = duration_ms * settings.game.decay_rate_per_ms
        return (base_score - time_penalty) * accuracy

game_service = GameService()
