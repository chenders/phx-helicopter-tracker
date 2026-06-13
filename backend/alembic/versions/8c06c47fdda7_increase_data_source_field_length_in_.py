"""Increase data_source field length in flight_positions

Revision ID: 8c06c47fdda7
Revises: 253e7ebd36ad
Create Date: 2025-09-13 04:19:59.444705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c06c47fdda7"
down_revision: Union[str, None] = "253e7ebd36ad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Increase data_source field length from 20 to 50 characters
    op.alter_column(
        "flight_positions",
        "data_source",
        type_=sa.String(50),
        existing_type=sa.String(20),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Revert data_source field length back to 20 characters
    op.alter_column(
        "flight_positions",
        "data_source",
        type_=sa.String(20),
        existing_type=sa.String(50),
        existing_nullable=True,
    )
