#!/usr/bin/env python3
"""Create PostgreSQL databases if they don't exist."""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.exc import ProgrammingError


async def create_database(
    database_name: str, host: str = "localhost", port: int = 5433
):
    """Create a PostgreSQL database if it doesn't exist.

    Args:
        database_name: Name of the database to create
        host: PostgreSQL host
        port: PostgreSQL port
    """
    # Connect to the default 'postgres' database to create other databases
    admin_url = f"postgresql+asyncpg://postgres:postgres@{host}:{port}/postgres"

    engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")

    async with engine.connect() as conn:
        # Check if database exists
        result = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
            {"dbname": database_name},
        )
        exists = result.scalar() is not None

        if not exists:
            # Create the database
            # Note: Can't use parameters for database name in CREATE DATABASE
            # So we need to be careful about SQL injection if this is user input
            await conn.execute(text(f'CREATE DATABASE "{database_name}"'))
            print(f"✓ Created database: {database_name}")
        else:
            print(f"✓ Database already exists: {database_name}")

    await engine.dispose()


async def create_all_databases():
    """Create all required databases for the application."""
    databases = [
        "phoenix_helicopters",  # Main application database
        "phoenix_helicopters_test",  # Test database
    ]

    for db_name in databases:
        try:
            await create_database(db_name)
        except Exception as e:
            print(f"✗ Error creating database {db_name}: {e}")


if __name__ == "__main__":
    asyncio.run(create_all_databases())
