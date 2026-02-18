import requests
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models import User
from app.schemas import UserCreate
from app.simple_config import settings
import logging

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.profanity_list = self._load_profanity_list()
        self.blocked_domains = set(settings.security.domain_blocklist)

    def _load_profanity_list(self) -> set:
        try:
            # Fallback/Default small list if download fails or for offline start
            bad_words = {
                "chuj", "kurwa", "dupa", "pizda", "jebac", "pierdolic", "cipa", "kutas", "fiut",
                "szmata", "dziwka", "pedal", "zjeb", "debil", "idiota", "frajer", "szwinia", "ruchanie"
            } 
            if settings.security.profanity_list_url:
                try:
                    response = requests.get(settings.security.profanity_list_url, timeout=5)
                    if response.status_code == 200:
                        online_list = set(word.strip().lower() for word in response.text.splitlines() if word.strip())
                        bad_words.update(online_list)
                except Exception as e:
                    logger.warning(f"Failed to download profanity list: {e}. Using fallback.")
            return bad_words
        except Exception:
            return set()

    def is_profane(self, text: str) -> bool:
        text_lower = text.lower()
        for word in self.profanity_list:
            # Simple containment check, can be improved with regex
            if word in text_lower:
                return True
        return False

    def is_domain_blocked(self, email: str) -> bool:
        domain = email.split('@')[-1].lower()
        return domain in self.blocked_domains

    async def register_user(self, user_in: UserCreate, session: AsyncSession) -> User:
        print(f"DEBUG: Registering User: Nick='{user_in.nick}', Email='{user_in.email}'")
        
        # Normalize inputs
        user_in.email = user_in.email.lower().strip()
        user_in.nick = user_in.nick.strip()

        # 1. Validate Profanity
        if self.is_profane(user_in.nick):
            raise HTTPException(status_code=400, detail="Nick zawiera wulgaryzmy. Wybierz inny.")

        # 2. Validate Email Domain
        if self.is_domain_blocked(user_in.email):
            raise HTTPException(status_code=400, detail="Domena email zablokowana.")

        # 3. Check if user exists (Get or Create Logic)
        # Check by Nick
        stmt_nick = select(User).where(User.nick == user_in.nick)
        result_nick = await session.execute(stmt_nick)
        existing_user_nick = result_nick.scalar_one_or_none()

        if existing_user_nick:
            # If nick exists, check if email matches
            if existing_user_nick.email == user_in.email:
                # Login successful (Return existing user)
                return existing_user_nick
            else:
                # Nick taken by someone else
                raise HTTPException(status_code=409, detail="Nick zajęty przez innego użytkownika.")

        # Check by Email (to prevent one email having multiple nicks if desired, or allow it?)
        # User said: "useerr moze sie zalogowac tlyko raz na jendego maila" -> One account per email?
        # Let's enforce unique email too for safety.
        stmt_email = select(User).where(User.email == user_in.email)
        result_email = await session.execute(stmt_email)
        existing_user_email = result_email.scalar_one_or_none()

        if existing_user_email:
             # Email exists but with different nick (since nick check failed above)
             # Option A: Allow multiple nicks per email?
             # Option B: Error.
             # User said: "jak bedzi enowy email to si eauto rejestruje"
             # imply unique email -> unique user.
             # If I register with new nick but old email, I should probably get the old user or error?
             # Let's return error to be safe and consistent.
             raise HTTPException(status_code=409, detail="Email już zarejestrowany z innym nickiem.")

        # 4. Create User
        user = User(nick=user_in.nick, email=user_in.email)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

auth_service = AuthService()
