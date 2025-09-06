from typing import Generator
from sqlalchemy.orm import Session
from app.db.database import SessionLocal


def get_db() -> Generator:
    """
    Database dependency to get DB session.
    This will be used as a FastAPI dependency.
    """
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()
