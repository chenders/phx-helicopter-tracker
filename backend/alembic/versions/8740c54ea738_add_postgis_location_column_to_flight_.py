"""Add PostGIS location column to flight_positions

Revision ID: 8740c54ea738
Revises: 4e47d03aa5be
Create Date: 2025-10-01 21:22:21.082968

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography


# revision identifiers, used by Alembic.
revision: str = "8740c54ea738"
down_revision: Union[str, None] = "4e47d03aa5be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the PostGIS location column
    op.add_column(
        "flight_positions",
        sa.Column(
            "location", Geography(geometry_type="POINT", srid=4326), nullable=True
        ),
    )

    # Populate the location column from existing lat/lon data
    op.execute(
        """
        UPDATE flight_positions
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """
    )

    # Create a spatial index for fast queries
    op.create_index(
        "idx_flight_positions_location",
        "flight_positions",
        ["location"],
        postgresql_using="gist",
    )


def downgrade() -> None:
    # Remove the spatial index
    op.drop_index("idx_flight_positions_location", table_name="flight_positions")

    # Remove the location column
    op.drop_column("flight_positions", "location")
