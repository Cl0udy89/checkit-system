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
        
        # score argument is passed from controller. If None, we calculate it.
        final_score = score if score is not None else 0
        
        # 0. Check if user already played this game
        from sqlmodel import select
        existing_stmt = select(GameScore).where(GameScore.user_id == user_id, GameScore.game_type == game_type)
        existing = (await session.execute(existing_stmt)).scalar_one_or_none()
        
        if existing:
            if final_score > existing.score:
                logger.info(f"User {user_id} improved score in {game_type} from {existing.score} to {final_score}.")
                existing.score = final_score
                existing.duration_ms = duration_ms
                existing.synced = False
                session.add(existing)
                await session.commit()
                await session.refresh(existing)
                return existing
            else:
                logger.info(f"User {user_id} played {game_type} but score {final_score} not better than {existing.score}.")
                return existing

        passed = False
        
        # 1. Calculate Score
        if game_type == "binary_brain":
            if score is not None:
                # Trust client score for Kiosk mode
                final_score = score
            else:
                final_score, _ = await self._calculate_binary_brain(answers, duration_ms)
            
            # Solenoid Trigger: Score >= 5000
            if final_score >= 5000:
                logger.info(f"Binary Brain passed! Score: {final_score}. Triggering Solenoid.")
                import asyncio
                asyncio.create_task(solenoid.open_box())
                
                # Log Event
                session.add(GameLog(event_type="SOLENOID", details=f"Open Triggered by User {user_id} (Score: {final_score})"))
            else:
                logger.info(f"Binary Brain finished but score {final_score} < 5000. No box.")

        elif game_type == "patch_master":
            final_score = await self._calculate_patch_master(duration_ms)
            # Patch Master validation is checking hardware state
            # Assuming client calls finish when it Thinks it's done.
            # Double check hardware:
            if not patch_panel.is_solved():
                logger.warning("Patch Master finish requested but hardware not solved.")
                final_score = 0 # Penalty?
            else:
                logger.info("Patch Master solved verified.")

        elif game_type == "it_match":
            # If client provides score, maybe trust it too? 
            # But let's fix calculation first.
            final_score = await self._calculate_it_match(answers, duration_ms)

        # 2. Save Score
        game_score = GameScore(
            user_id=user_id,
            game_type=game_type,
            score=max(0, int(final_score)), # Ensure non-negative
            duration_ms=duration_ms,
            synced=False
        )
        try:
            session.add(game_score)
            
            # Add Log
            session.add(GameLog(event_type="GAME_FINISHED", details=f"User {user_id} finished {game_type} with {int(final_score)} pts"))
            
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
        # Max Score = 1000 per question
        base_score = total_questions * 1000
        
        # Decay logic: 
        # Calculate max possible time penalty? Or just relative decay?
        # User wants "points escape" (punkty uciekają).
        # Let's use the configured decay rate.
        time_penalty = duration_ms * settings.game.decay_rate_per_ms
        
        # Final Score = (Base - Penalty) * Accuracy
        # If penalty > base, score is 0.
        score_potential = max(0, base_score - time_penalty)
        final_score = score_potential * accuracy
        
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
            # IT Match usually is YES/NO.
            # Convert both to string and lower. 
            # Handle user boolean (True/False) vs '1'/'0' or 'true'/'false'
            
            user_ans = str(ans).lower()
            corr_ans = str(correct).lower()
            
            # Normalization
            if user_ans == 'true': user_ans = '1'
            if user_ans == 'false': user_ans = '0'
            if corr_ans == 'true': corr_ans = '1'
            if corr_ans == 'false': corr_ans = '0'
            
            if correct and user_ans == corr_ans:
                correct_count += 1
        
        accuracy = correct_count / max(1, len(answers))
        
        # New Logic: 1000 per question base
        base_score = len(answers) * 1000
        time_penalty = duration_ms * settings.game.decay_rate_per_ms
        
        score_potential = max(0, base_score - time_penalty)
        return score_potential * accuracy

game_service = GameService()
