"""Add PostGIS location column to flight_positions

Revision ID: 8cbba93140d4
Revises: 21a584524a8e
Create Date: 2025-11-02 05:01:09.012214

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography


# revision identifiers, used by Alembic.
revision: str = "8cbba93140d4"
down_revision: Union[str, None] = "21a584524a8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure PostGIS extension is enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Add the location column as Geography type (POINT, SRID 4326)
    op.add_column(
        "flight_positions",
        sa.Column(
            "location", Geography(geometry_type="POINT", srid=4326), nullable=True
        ),
    )

    # Populate the location column from existing latitude/longitude data
    # Using ST_SetSRID and ST_MakePoint to create geography points
    op.execute(
        """
        UPDATE flight_positions
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """
    )

    # Create a GIST index on the location column for spatial queries
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_positions_location_gist ON flight_positions USING gist(location)"
    )

    # Drop the old btree index on latitude/longitude if it exists
    op.execute("DROP INDEX IF EXISTS idx_positions_location")

    # Create function to automatically populate location column from lat/lng
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_flight_position_location()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Automatically set location from latitude/longitude when they are provided
            IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
                NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """
    )

    # Create trigger that runs before INSERT or UPDATE
    op.execute(
        """
        CREATE TRIGGER flight_position_location_trigger
        BEFORE INSERT OR UPDATE ON flight_positions
        FOR EACH ROW
        EXECUTE FUNCTION update_flight_position_location();
    """
    )


def downgrade() -> None:
    # Drop the trigger
    op.execute(
        "DROP TRIGGER IF EXISTS flight_position_location_trigger ON flight_positions"
    )

    # Drop the function
    op.execute("DROP FUNCTION IF EXISTS update_flight_position_location()")

    # Recreate the btree index on latitude/longitude
    op.execute(
        "CREATE INDEX idx_positions_location ON flight_positions(latitude, longitude)"
    )

    # Drop the GIST index
    op.execute("DROP INDEX IF EXISTS idx_positions_location_gist")

    # Drop the location column
    op.drop_column("flight_positions", "location")
