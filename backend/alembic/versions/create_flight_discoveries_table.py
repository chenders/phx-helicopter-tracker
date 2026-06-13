"""Create flight_discoveries table for historical flight backfill

Revision ID: create_flight_discoveries
Revises: 
Create Date: 2025-09-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "create_flight_discoveries"
down_revision = "8c06c47fdda7"
branch_labels = None
depends_on = None


def upgrade():
    # Create flight_discoveries table
    op.create_table(
        "flight_discoveries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fr24_id", sa.String(length=20), nullable=False),
        sa.Column("registration", sa.String(length=10), nullable=False),
        sa.Column("callsign", sa.String(length=10), nullable=True),
        sa.Column("aircraft_type", sa.String(length=10), nullable=True),
        sa.Column("hex_code", sa.String(length=10), nullable=True),
        sa.Column("departure_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("arrival_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("origin_airport", sa.String(length=10), nullable=True),
        sa.Column("destination_airport", sa.String(length=10), nullable=True),
        sa.Column("flight_duration_minutes", sa.Float(), nullable=True),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "discovered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "track_downloaded", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column(
            "track_download_attempted_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("track_download_error", sa.Text(), nullable=True),
        sa.Column("positions_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fr24_id"),
    )

    # Create indexes for efficient querying
    op.create_index(
        "idx_flight_discoveries_registration", "flight_discoveries", ["registration"]
    )
    op.create_index(
        "idx_flight_discoveries_track_downloaded",
        "flight_discoveries",
        ["track_downloaded"],
    )
    op.create_index(
        "idx_flight_discoveries_departure_time",
        "flight_discoveries",
        ["departure_time"],
    )
    op.create_index("idx_flight_discoveries_fr24_id", "flight_discoveries", ["fr24_id"])


def downgrade():
    op.drop_index("idx_flight_discoveries_fr24_id", table_name="flight_discoveries")
    op.drop_index(
        "idx_flight_discoveries_departure_time", table_name="flight_discoveries"
    )
    op.drop_index(
        "idx_flight_discoveries_track_downloaded", table_name="flight_discoveries"
    )
    op.drop_index(
        "idx_flight_discoveries_registration", table_name="flight_discoveries"
    )
    op.drop_table("flight_discoveries")
