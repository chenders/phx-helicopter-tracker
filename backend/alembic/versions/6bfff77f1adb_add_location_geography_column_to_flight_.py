"""add_location_geography_column_to_flight_positions

Revision ID: 6bfff77f1adb
Revises: 7dcc4653a86a
Create Date: 2025-10-13 01:00:05.059464

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6bfff77f1adb'
down_revision: Union[str, None] = '7dcc4653a86a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PostGIS extension if not already enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Add location column as geography(Point, 4326)
    op.execute("""
        ALTER TABLE flight_positions
        ADD COLUMN IF NOT EXISTS location geography(Point, 4326)
    """)

    # Backfill existing data - convert lat/lng to PostGIS geography point
    # Use batch updates to avoid locking the table for too long
    op.execute("""
        UPDATE flight_positions
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND location IS NULL
    """)

    # Create spatial index for fast geographic queries
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_flight_positions_location
        ON flight_positions USING GIST (location)
    """)


def downgrade() -> None:
    # Drop the spatial index
    op.execute("DROP INDEX IF EXISTS idx_flight_positions_location")

    # Drop the location column
    op.execute("ALTER TABLE flight_positions DROP COLUMN IF EXISTS location")
