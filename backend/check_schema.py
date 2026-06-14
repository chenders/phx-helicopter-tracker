#!/usr/bin/env python3
"""
Check if database schema is in sync with Alembic migrations.
This should be run before starting the application or in CI/CD.
"""
import sys
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine
from app.core.config import settings


def check_schema():
    """Check if database schema matches migration head"""
    try:
        # Create Alembic config
        alembic_cfg = Config("alembic.ini")
        script = ScriptDirectory.from_config(alembic_cfg)

        # Get current database revision
        engine = create_engine(str(settings.DATABASE_URL))
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            current_rev = context.get_current_revision()

        # Get head revision from migrations
        head_rev = script.get_current_head()

        if current_rev != head_rev:
            print("❌ Database schema is OUT OF SYNC!")
            print(f"   Current database revision: {current_rev or 'None'}")
            print(f"   Latest migration revision: {head_rev}")
            print("\n   Run: alembic upgrade head")
            return False

        print(f"✅ Database schema is IN SYNC (revision: {current_rev})")
        return True

    except Exception as e:
        print(f"❌ Schema check failed: {e}")
        return False


if __name__ == "__main__":
    success = check_schema()
    sys.exit(0 if success else 1)
