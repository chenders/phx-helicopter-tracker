"""Tests for the stable flight public-id derivation.

These guard the contract that makes public_id permanent across rebuilds: the
canonical key format and the resulting hash must never change, and must match
what the Postgres trigger computes (see the add_flight_public_id migration).
The golden values below were cross-checked against the SQL derivation.
"""

from datetime import datetime, timezone

from app.core.flight_identity import canonical_flight_key, compute_public_id

UTC = timezone.utc

# Golden values — DO NOT change without intentionally migrating every public_id.
GOLDEN = {
    ("N623FB", datetime(2025, 8, 25, 5, 2, 34, tzinfo=UTC)): "0e8145e711d8bba9",
    (None, None): "e5137f85e1b2535a",
}


def test_golden_values_are_stable():
    for (reg, dep), expected in GOLDEN.items():
        assert compute_public_id(reg, dep) == expected


def test_registration_is_upper_cased():
    dt = datetime(2025, 8, 25, 5, 2, 34, tzinfo=UTC)
    assert compute_public_id("n623fb", dt) == compute_public_id("N623FB", dt)


def test_subsecond_precision_is_dropped():
    """Microsecond jitter (e.g. across data sources) must not change the id."""
    base = datetime(2025, 8, 25, 5, 2, 34, tzinfo=UTC)
    jittered = datetime(2025, 8, 25, 5, 2, 34, 123456, tzinfo=UTC)
    assert compute_public_id("N623FB", base) == compute_public_id("N623FB", jittered)


def test_naive_datetime_treated_as_utc():
    aware = datetime(2025, 8, 25, 5, 2, 34, tzinfo=UTC)
    naive = datetime(2025, 8, 25, 5, 2, 34)
    assert compute_public_id("N623FB", naive) == compute_public_id("N623FB", aware)


def test_canonical_key_format():
    dt = datetime(2025, 8, 25, 5, 2, 34, tzinfo=UTC)
    assert canonical_flight_key("N623FB", dt) == "N623FB|2025-08-25T05:02:34Z"
    assert canonical_flight_key(None, None) == "UNKNOWN|UNKNOWN"


def test_output_shape():
    pid = compute_public_id("N624FB", datetime(2024, 1, 1, tzinfo=UTC))
    assert len(pid) == 16
    assert all(c in "0123456789abcdef" for c in pid)


def test_distinct_flights_distinct_ids():
    dt = datetime(2025, 8, 25, 5, 2, 34, tzinfo=UTC)
    a = compute_public_id("N623FB", dt)
    b = compute_public_id("N624FB", dt)  # different aircraft, same time
    c = compute_public_id("N623FB", datetime(2025, 8, 25, 5, 2, 35, tzinfo=UTC))
    assert a != b and a != c and b != c
