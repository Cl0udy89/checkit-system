import csv
import logging
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

CONTENT_DIR = Path(__file__).parent.parent.parent.parent / "content"

class ContentService:
    def __init__(self):
        self.binary_brain_questions = []
        self.it_match_questions = []
        self._load_content()

    def _load_content(self):
        self.binary_brain_questions = self._load_csv(
            CONTENT_DIR / "binary_brain" / "questions.csv"
        )
        self.it_match_questions = self._load_csv(
            CONTENT_DIR / "it_match" / "questions.csv"
        )
        logger.info(f"Loaded {len(self.binary_brain_questions)} Binary Brain questions.")
        logger.info(f"Loaded {len(self.it_match_questions)} IT Match questions.")

    def _load_csv(self, path: Path) -> List[Dict]:
        if not path.exists():
            logger.warning(f"Content file not found: {path}")
            return []
        
        items = []
        try:
            with open(path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    items.append(row)
        except Exception as e:
            logger.error(f"Error reading CSV {path}: {e}")
        return items

    def get_questions(self, game_type: str, limit: int = 10) -> List[Dict]:
        if game_type == "binary_brain":
            # In a real app, maybe shuffle here
            return self.binary_brain_questions[:limit]
        elif game_type == "it_match":
            return self.it_match_questions[:limit]
        return []

    def get_correct_answer(self, game_type: str, question_id: str) -> Optional[str]:
        questions = []
        if game_type == "binary_brain":
            questions = self.binary_brain_questions
        elif game_type == "it_match":
            questions = self.it_match_questions
            
        for q in questions:
            if q.get("ID") == question_id:
                if game_type == "binary_brain":
                    return q.get("POPRAWNA")
                elif game_type == "it_match":
                    return q.get("ODPOWIEDZ_TAK_NIE") # Assuming this column holds the correct answer/logic
        return None

content_service = ContentService()
