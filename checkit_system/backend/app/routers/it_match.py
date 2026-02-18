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

# Global cache
QUESTIONS_CACHE = []

def load_questions():
    global QUESTIONS_CACHE
    csv_path = "assets/it_match/questions.csv"
    if not os.path.exists(csv_path):
        # Fallback for dev/test if file missing
        print(f"WARNING: {csv_path} not found.")
        return []
    
    loaded = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # CSV: id,question,image,is_correct (1/0)
                loaded.append(ITMatchQuestion(
                    id=int(row['id']),
                    question=row['question'],
                    image=row['image'],
                    is_correct=bool(int(row['is_correct']))
                ))
    except Exception as e:
        print(f"Error loading questions: {e}")
    
    QUESTIONS_CACHE = loaded

# Load on startup (module import)
load_questions()

@router.get("/questions", response_model=List[ITMatchQuestion])
async def get_questions(count: int = 10):
    """
    Returns a random set of questions.
    """
    if not QUESTIONS_CACHE:
        load_questions()
    
    if not QUESTIONS_CACHE:
        return []
        
    # sample handles checking if count > len
    sample_size = min(count, len(QUESTIONS_CACHE))
    return random.sample(QUESTIONS_CACHE, sample_size)
