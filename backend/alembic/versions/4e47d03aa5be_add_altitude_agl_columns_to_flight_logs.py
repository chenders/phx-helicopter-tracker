"""Add altitude AGL columns to flight_logs

Revision ID: 4e47d03aa5be
Revises: fee285f9cbbc
Create Date: 2025-10-01 01:10:26.785700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4e47d03aa5be"
down_revision: Union[str, None] = "fee285f9cbbc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add altitude AGL (Above Ground Level) columns to flight_logs
    op.add_column(
        "flight_logs", sa.Column("max_altitude_agl_feet", sa.Integer(), nullable=True)
    )
    op.add_column(
        "flight_logs", sa.Column("min_altitude_agl_feet", sa.Integer(), nullable=True)
    )
    op.add_column(
        "flight_logs", sa.Column("avg_altitude_agl_feet", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    # Remove altitude AGL columns
    op.drop_column("flight_logs", "avg_altitude_agl_feet")
    op.drop_column("flight_logs", "min_altitude_agl_feet")
    op.drop_column("flight_logs", "max_altitude_agl_feet")
