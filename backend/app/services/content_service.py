import csv
import logging
from pathlib import Path
from typing import List, Dict, Optional
import random

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
        
        encodings = ['utf-8', 'utf-8-sig', 'windows-1250', 'cp1252', 'latin-1']
        items = []
        
        for encoding in encodings:
            try:
                with open(path, mode='r', encoding=encoding) as f:
                    reader = csv.DictReader(f)
                    items = [] # Reset on new attempt
                    for row in reader:
                        # Clean up keys (strip BOM, external whitespace)
                        clean_row = {k.strip(): v.strip() for k, v in row.items() if k}
                        items.append(clean_row)
                
                # If we got here, success
                logger.info(f"Successfully loaded {path} using {encoding}")
                return items
            except UnicodeDecodeError:
                continue # Try next encoding
            except Exception as e:
                logger.error(f"Error reading CSV {path} with {encoding}: {e}")
                
        logger.error(f"Failed to load {path} with any supported encoding.")
        return []

    def get_questions(self, game_type: str, limit: int = 10) -> List[Dict]:
        if game_type == "binary_brain":
            # Auto-reload if empty (e.g. valid file but loaded before write)
            if not self.binary_brain_questions:
                logger.info("Reloading Binary Brain questions...")
                self._load_content()
                
            # Shuffle and limit
            full_list = self.binary_brain_questions
            count = min(len(full_list), limit)
            if count == 0: return []
            return random.sample(full_list, count)
        elif game_type == "it_match":
            if not self.it_match_questions:
                logger.info("Reloading IT Match questions...")
                self._load_content()

            full_list = self.it_match_questions
            count = min(len(full_list), limit)
            if count == 0: return []
            return random.sample(full_list, count)
        return []

    def get_correct_answer(self, game_type: str, question_id: str) -> Optional[str]:
        questions = []
        if game_type == "binary_brain":
            questions = self.binary_brain_questions
        elif game_type == "it_match":
            questions = self.it_match_questions
            
        for q in questions:
            # Case insensitive check for ID
            if str(q.get("id", "")).lower() == str(question_id).lower():
                if game_type == "binary_brain":
                    return q.get("answer_correct")
                elif game_type == "it_match":
                    # IT Match CSV: id,question,image,is_correct
                    # We expect '1' or '0'
                    return q.get("is_correct")
        return None

content_service = ContentService()
