"""add_trigger_to_auto_populate_location

Revision ID: e4575341c2cd
Revises: 6bfff77f1adb
Create Date: 2025-10-13 01:01:56.484667

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e4575341c2cd"
down_revision: Union[str, None] = "6bfff77f1adb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
