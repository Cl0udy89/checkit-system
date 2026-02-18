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
            bad_words = {"chuj", "kurwa", "dupa", "pizda", "jebac", "pierdolic", "cipa"} 
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
        # 1. Validate Profanity
        if self.is_profane(user_in.nick):
            raise HTTPException(status_code=400, detail="Nick contains inappropriate language.")

        # 2. Validate Email Domain
        if self.is_domain_blocked(user_in.email):
            raise HTTPException(status_code=400, detail="Email domain is blocked.")

        # 3. Check uniqueness
        statement = select(User).where(User.nick == user_in.nick)
        result = await session.execute(statement)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Nick already taken.")

        # 4. Create User
        user = User(nick=user_in.nick, email=user_in.email)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

auth_service = AuthService()
