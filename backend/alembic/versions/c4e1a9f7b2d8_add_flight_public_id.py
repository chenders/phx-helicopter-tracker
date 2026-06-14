"""add flight_logs.public_id (stable, vendor-neutral, rebuild-permanent id)

The numeric flight_logs.id is a sequence value reassigned on every rebuild from
source, so the same flight can change id (this is why /flight/<id> links broke
after a rebuild). public_id is derived deterministically from intrinsic,
vendor-neutral facts — the aircraft registration + departure time — so the same
flight always resolves to the same id, surviving both a plain restore and a
re-ingest from any provider.

Canonical derivation (kept identical to app/core/flight_identity.py):
    sha256( UPPER(registration) || '|' || departure_time(ISO-8601 UTC, seconds) )
    -> first 16 hex chars
Missing registration / departure_time fall back to the literal 'UNKNOWN'.

Revision ID: c4e1a9f7b2d8
Revises: b7e2f1a9c4d3
Create Date: 2026-06-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4e1a9f7b2d8"
down_revision: Union[str, None] = "b7e2f1a9c4d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # sha256 lives in pgcrypto's digest() (same pattern as the pg_trgm migration).
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.execute("ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS public_id varchar(16)")

    # Single SQL source of truth for the derivation. MUST stay byte-identical to
    # app/core/flight_identity.py::compute_public_id, or ids computed in Python
    # won't match ids the database computes. IMMUTABLE: pure function of inputs
    # (the to_char format is numeric/UTC-only, so locale-independent).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION flight_public_id(reg text, dep timestamptz)
        RETURNS text AS $$
            SELECT substr(
                encode(
                    digest(
                        coalesce(upper(reg), 'UNKNOWN') || '|' ||
                        coalesce(
                            to_char(dep AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                            'UNKNOWN'
                        ),
                        'sha256'
                    ),
                    'hex'
                ),
                1, 16
            )
        $$ LANGUAGE sql IMMUTABLE
        """
    )

    # Backfill existing rows (correlated subquery handles null/unmatched aircraft_id).
    op.execute(
        """
        UPDATE flight_logs fl
        SET public_id = flight_public_id(
            (SELECT registration FROM aircraft WHERE id = fl.aircraft_id),
            fl.departure_time
        )
        """
    )

    # Keep public_id in sync on insert and on changes to the inputs.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_flight_public_id() RETURNS trigger AS $$
        BEGIN
            NEW.public_id := flight_public_id(
                (SELECT registration FROM aircraft WHERE id = NEW.aircraft_id),
                NEW.departure_time
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS trg_set_flight_public_id ON flight_logs")
    op.execute(
        """
        CREATE TRIGGER trg_set_flight_public_id
        BEFORE INSERT OR UPDATE OF aircraft_id, departure_time ON flight_logs
        FOR EACH ROW EXECUTE FUNCTION set_flight_public_id()
        """
    )

    op.execute("ALTER TABLE flight_logs ALTER COLUMN public_id SET NOT NULL")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_flight_logs_public_id "
        "ON flight_logs (public_id)"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_set_flight_public_id ON flight_logs")
    op.execute("DROP FUNCTION IF EXISTS set_flight_public_id()")
    op.execute("DROP INDEX IF EXISTS uq_flight_logs_public_id")
    op.execute("ALTER TABLE flight_logs DROP COLUMN IF EXISTS public_id")
    op.execute("DROP FUNCTION IF EXISTS flight_public_id(text, timestamptz)")
    # pgcrypto left installed (harmless, may be used elsewhere).
