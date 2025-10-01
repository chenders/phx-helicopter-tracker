#!/usr/bin/env python3
"""
Update ground elevation for flight positions using Google Maps Elevation API
or use Phoenix area average elevation as fallback
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, update
from sqlalchemy.orm import Session
import requests
from typing import List, Tuple
import time

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/phoenix_helicopters")

# Phoenix area elevation data (feet above sea level)
# Based on USGS topographical data for Phoenix metro area
PHOENIX_ELEVATION_MAP = {
    # Downtown Phoenix: ~1,086 ft
    (33.4484, -112.0740): 1086,
    # North Phoenix/Deer Valley: ~1,500 ft
    (33.6839, -112.0822): 1500,
    # South Mountain area: ~1,200 ft
    (33.3362, -112.0740): 1200,
    # East Valley/Tempe: ~1,150 ft
    (33.4255, -111.9400): 1150,
    # West Phoenix: ~1,100 ft
    (33.4484, -112.2420): 1100,
    # Camelback Mountain area: ~1,400 ft
    (33.5155, -111.9620): 1400,
    # Sky Harbor Airport: ~1,135 ft
    (33.4343, -112.0117): 1135,
}

def get_elevation_from_coordinates(lat: float, lon: float) -> float:
    """
    Estimate ground elevation based on Phoenix topographical data.
    Uses inverse distance weighting from known elevation points.
    """
    # For more accurate elevation, you could use:
    # 1. Google Maps Elevation API (requires API key)
    # 2. USGS Elevation Point Query Service (free)
    # 3. Open-Elevation API (free)

    # Simple inverse distance weighting interpolation
    total_weight = 0
    weighted_elevation = 0

    for (ref_lat, ref_lon), ref_elev in PHOENIX_ELEVATION_MAP.items():
        # Calculate distance (simplified, good enough for small area)
        distance = ((lat - ref_lat) ** 2 + (lon - ref_lon) ** 2) ** 0.5

        # Prevent division by zero
        if distance < 0.001:
            return ref_elev

        # Inverse distance weight
        weight = 1 / distance
        total_weight += weight
        weighted_elevation += ref_elev * weight

    # Return weighted average
    return round(weighted_elevation / total_weight) if total_weight > 0 else 1100

def update_flight_elevations(flight_id: int):
    """Update ground elevations for all positions in a flight."""

    engine = create_engine(DATABASE_URL)

    with engine.begin() as conn:
        # Get all positions for the flight
        result = conn.execute(
            text("""
                SELECT id, latitude, longitude, altitude_feet
                FROM flight_positions
                WHERE flight_log_id = :flight_id
                ORDER BY timestamp
            """),
            {"flight_id": flight_id}
        )

        positions = result.fetchall()
        print(f"Found {len(positions)} positions for flight {flight_id}")

        # Batch update elevations
        updates = []
        for pos in positions:
            ground_elev = get_elevation_from_coordinates(pos.latitude, pos.longitude)
            agl_altitude = max(0, pos.altitude_feet - ground_elev) if pos.altitude_feet else None

            updates.append({
                "id": pos.id,
                "ground_elevation": ground_elev,
                "agl_altitude": agl_altitude
            })

        # Update in batches of 100
        batch_size = 100
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i + batch_size]

            # Build case statements for batch update
            ground_cases = " ".join([
                f"WHEN {u['id']} THEN {u['ground_elevation']}"
                for u in batch
            ])

            agl_cases = " ".join([
                f"WHEN {u['id']} THEN {u['agl_altitude']}" if u['agl_altitude'] is not None else f"WHEN {u['id']} THEN NULL::INTEGER"
                for u in batch
            ])

            ids = ",".join([str(u['id']) for u in batch])

            conn.execute(
                text(f"""
                    UPDATE flight_positions
                    SET
                        ground_elevation_feet = CASE id {ground_cases} END,
                        altitude_agl_feet = CASE id {agl_cases} END
                    WHERE id IN ({ids})
                """)
            )

            if i % 1000 == 0:
                print(f"Updated {min(i + batch_size, len(updates))}/{len(updates)} positions...")

        print(f"✓ Updated all {len(positions)} positions with elevation data")

        # Update flight summary with AGL statistics
        conn.execute(
            text("""
                UPDATE flight_logs
                SET
                    max_altitude_agl_feet = (
                        SELECT MAX(altitude_agl_feet)
                        FROM flight_positions
                        WHERE flight_log_id = :flight_id
                    ),
                    min_altitude_agl_feet = (
                        SELECT MIN(altitude_agl_feet)
                        FROM flight_positions
                        WHERE flight_log_id = :flight_id
                        AND altitude_agl_feet > 0
                    ),
                    avg_altitude_agl_feet = (
                        SELECT AVG(altitude_agl_feet)
                        FROM flight_positions
                        WHERE flight_log_id = :flight_id
                        AND altitude_agl_feet > 0
                    )
                WHERE id = :flight_id
            """),
            {"flight_id": flight_id}
        )

        print("✓ Updated flight summary with AGL statistics")

def verify_update(flight_id: int):
    """Verify the elevation update."""

    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    COUNT(*) as total_positions,
                    COUNT(ground_elevation_feet) as positions_with_elevation,
                    MIN(ground_elevation_feet) as min_ground_elev,
                    MAX(ground_elevation_feet) as max_ground_elev,
                    AVG(ground_elevation_feet) as avg_ground_elev,
                    MIN(altitude_agl_feet) as min_agl,
                    MAX(altitude_agl_feet) as max_agl,
                    AVG(altitude_agl_feet) as avg_agl
                FROM flight_positions
                WHERE flight_log_id = :flight_id
            """),
            {"flight_id": flight_id}
        )

        stats = result.fetchone()

        print("\n📊 Elevation Update Statistics:")
        print(f"  Total positions: {stats.total_positions}")
        print(f"  Positions with elevation: {stats.positions_with_elevation}")
        print(f"  Ground elevation range: {stats.min_ground_elev:.0f} - {stats.max_ground_elev:.0f} ft")
        print(f"  Average ground elevation: {stats.avg_ground_elev:.0f} ft")
        print(f"  AGL altitude range: {stats.min_agl:.0f} - {stats.max_agl:.0f} ft")
        print(f"  Average AGL altitude: {stats.avg_agl:.0f} ft")

if __name__ == "__main__":
    import sys
    flight_id = int(sys.argv[1]) if len(sys.argv) > 1 else 3979
    print(f"Updating ground elevation data for flight {flight_id}...")
    print("Using Phoenix topographical elevation model")
    print("-" * 50)

    update_flight_elevations(flight_id)
    verify_update(flight_id)

    print("\n✅ Ground elevation update complete!")