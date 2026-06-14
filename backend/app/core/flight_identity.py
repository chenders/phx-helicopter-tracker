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
