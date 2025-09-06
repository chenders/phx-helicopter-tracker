#!/usr/bin/env python3
"""Initialize database tables from SQLAlchemy models."""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.exc import ProgrammingError
from app.core.config import settings
from app.models import Base
# Import all models to ensure they're registered with Base
from app.models import (
    Aircraft, FlightLog, FlightPosition,
    LegalDocument, ConstitutionalAnalysis, LegalPrecedent,
    TaskHistory, TaskEvent, TaskMetrics
)


async def create_database_if_not_exists(database_name: str, host: str = "localhost", port: int = 5433):
    """Create a PostgreSQL database if it doesn't exist."""
    # Connect to the default 'postgres' database
    admin_url = f"postgresql+asyncpg://postgres:postgres@{host}:{port}/postgres"
    
    engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    
    async with engine.connect() as conn:
        # Check if database exists
        result = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
            {"dbname": database_name}
        )
        exists = result.scalar() is not None
        
        if not exists:
            # Create the database
            await conn.execute(text(f'CREATE DATABASE "{database_name}"'))
            print(f"✓ Created database: {database_name}")
        else:
            print(f"✓ Database already exists: {database_name}")
    
    await engine.dispose()


async def init_db(database_url: str = None, drop_all: bool = False):
    """Create all tables defined in the models.
    
    Args:
        database_url: Database URL to connect to. If None, uses default.
        drop_all: If True, drops all existing tables before creating new ones.
    """
    if database_url is None:
        database_url = "postgresql+asyncpg://postgres:postgres@localhost:5433/phoenix_helicopters"
    
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        if drop_all:
            # Drop all tables first (careful - this deletes all data!)
            await conn.run_sync(Base.metadata.drop_all)
            print("⚠️  Dropped all existing tables")
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print(f"✓ Database tables created successfully for: {database_url.split('/')[-1]}")
    
    await engine.dispose()


async def init_test_db(drop_all: bool = True):
    """Initialize the test database with fresh tables.
    
    Args:
        drop_all: If True, drops all existing tables before creating new ones.
    """
    test_db_url = "postgresql+asyncpg://postgres:postgres@localhost:5433/phoenix_helicopters_test"
    
    # First ensure the test database exists
    await create_database_if_not_exists("phoenix_helicopters_test")
    
    # Then create the tables
    await init_db(database_url=test_db_url, drop_all=drop_all)


async def main():
    """Main function to set up all databases."""
    # Create main database if it doesn't exist
    await create_database_if_not_exists("phoenix_helicopters")
    
    # Initialize main database tables
    print("\n📊 Initializing main database...")
    await init_db()
    
    # Create and initialize test database
    print("\n🧪 Initializing test database...")
    await init_test_db()
    
    print("\n✅ All databases initialized successfully!")


if __name__ == "__main__":
    # Run with: python init_database.py
    asyncio.run(main())