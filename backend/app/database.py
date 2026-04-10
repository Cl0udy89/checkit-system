from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# DB file in the root backend folder or appdata
DB_PATH = Path(__file__).parent.parent / "checkit.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)

async def init_db():
    import sqlalchemy
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Runtime migrations — silently add new columns if they don't exist yet
        for col, coltype in [("screenshot_b64", "TEXT"), ("screenshot_name", "TEXT")]:
            try:
                await conn.execute(sqlalchemy.text(f'ALTER TABLE "user" ADD COLUMN {col} {coltype}'))
            except Exception:
                pass  # column already exists

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
