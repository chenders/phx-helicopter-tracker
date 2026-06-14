"""Stable, vendor-neutral public identifier for a flight.

A flight's numeric ``flight_logs.id`` is a Postgres sequence value that gets
reassigned every time the database is rebuilt from source (e.g. re-downloading
from FlightRadar24), so the same flight can land on a different id — which is how
``/flight/736`` came to point at a different flight after a rebuild.

``public_id`` solves that by being **derived deterministically from intrinsic,
vendor-neutral facts about the flight** — the aircraft's registration (tail
number) and its departure time — so the same flight always hashes to the same
id, no matter how many times it is re-ingested or which provider it came from.

IMPORTANT — this MUST stay byte-for-byte identical to the SQL the database
trigger uses (see the ``*_add_flight_public_id`` Alembic migration), or ids
computed in Python won't match ids computed by the database. The canonical form:

    sha256( UPPER(registration) + "|" + departure_time(ISO-8601 UTC, seconds) )
    -> first 16 hex chars

Missing registration / departure_time fall back to the literal "UNKNOWN" so a
value can always be produced; callers should treat such flights as needing a
better key once the data is present.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Optional

_UNKNOWN = "UNKNOWN"
PUBLIC_ID_LENGTH = 16


def canonical_flight_key(
    registration: Optional[str], departure_time: Optional[datetime]
) -> str:
    """The canonical pre-hash string. Kept tiny and explicit so it can be
    mirrored exactly in SQL."""
    reg = registration.upper() if registration else _UNKNOWN

    if departure_time is None:
        dep = _UNKNOWN
    else:
        dt = departure_time
        # Treat naive timestamps as UTC (the DB stores timestamptz in UTC).
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        # ISO-8601, UTC, whole seconds (sub-seconds dropped) — matches
        # Postgres to_char(... AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"').
        dep = dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return f"{reg}|{dep}"


def compute_public_id(
    registration: Optional[str], departure_time: Optional[datetime]
) -> str:
    """Deterministic 16-hex-char public id for a flight."""
    key = canonical_flight_key(registration, departure_time)
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:PUBLIC_ID_LENGTH]


# --- SQL derivation -------------------------------------------------------
# The DB-side derivation MUST stay byte-identical to compute_public_id above.
# These DDL strings are the single source of truth, shared by the
# add_flight_public_id migration (production) and tests/conftest.py (test DB
# created via Base.metadata.create_all(), which does NOT include triggers), so
# both environments populate public_id exactly the same way.

# pgcrypto's digest() provides sha256. IMMUTABLE: pure function of inputs (the
# to_char format is numeric/UTC-only, so locale-independent).
PUBLIC_ID_FUNCTION_DDL = """
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

PUBLIC_ID_TRIGGER_FUNCTION_DDL = """
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

PUBLIC_ID_TRIGGER_DDL = """
CREATE TRIGGER trg_set_flight_public_id
BEFORE INSERT OR UPDATE OF aircraft_id, departure_time ON flight_logs
FOR EACH ROW EXECUTE FUNCTION set_flight_public_id()
"""


def install_public_id_sql(connection) -> None:
    """Install pgcrypto + the public_id function and sync trigger on a
    Postgres connection. Used by the migration and the test DB setup."""
    from sqlalchemy import text as _text

    connection.execute(_text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    connection.execute(_text(PUBLIC_ID_FUNCTION_DDL))
    connection.execute(_text(PUBLIC_ID_TRIGGER_FUNCTION_DDL))
    connection.execute(
        _text("DROP TRIGGER IF EXISTS trg_set_flight_public_id ON flight_logs")
    )
    connection.execute(_text(PUBLIC_ID_TRIGGER_DDL))
