#!/usr/bin/env python3
"""
Analyze pre-entry behavior for flights near 1434 E Rose Ln, Phoenix, AZ 85014, USA
Target coordinates: 33.4942, -112.0556
"""

import psycopg2
from datetime import timedelta
import json
import math
import statistics

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="phoenix_helicopters",
    user="postgres",
    password="postgres"
)

TARGET_LAT = 33.4942
TARGET_LON = -112.0556
ENTRY_RADIUS = 0.5  # miles
ANALYSIS_WINDOW = 300  # seconds (5 minutes) before entry

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in miles between two points"""
    R = 3959  # Earth radius in miles
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c

def circular_mean(angles):
    """Calculate circular mean of angles in degrees"""
    if not angles:
        return 0
    angles_rad = [math.radians(a) for a in angles]
    sin_sum = sum(math.sin(a) for a in angles_rad)
    cos_sum = sum(math.cos(a) for a in angles_rad)
    mean_rad = math.atan2(sin_sum, cos_sum)
    return math.degrees(mean_rad) % 360

def circular_std(angles):
    """Calculate circular standard deviation of angles in degrees"""
    if len(angles) < 2:
        return 0
    angles_rad = [math.radians(a) for a in angles]
    sin_sum = sum(math.sin(a) for a in angles_rad)
    cos_sum = sum(math.cos(a) for a in angles_rad)
    R = math.sqrt(sin_sum**2 + cos_sum**2) / len(angles)
    std_rad = math.sqrt(-2 * math.log(R)) if R > 0 else 0
    return math.degrees(std_rad)

def analyze_flight(flight_log_id):
    """Analyze pre-entry behavior for a single flight"""
    cur = conn.cursor()

    # Get all positions for this flight with distance from target
    cur.execute("""
        SELECT
            timestamp,
            latitude,
            longitude,
            altitude_feet,
            ground_speed_knots,
            track_degrees,
            (3959 * acos(
                cos(radians(%s)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(%s)) +
                sin(radians(%s)) * sin(radians(latitude))
            )) AS distance_miles
        FROM flight_positions
        WHERE flight_log_id = %s
        ORDER BY timestamp
    """, (TARGET_LAT, TARGET_LON, TARGET_LAT, flight_log_id))

    positions = cur.fetchall()

    if not positions:
        return None

    # Find first entry into the 0.5 mile radius
    entry_idx = None
    entry_time = None
    for i, pos in enumerate(positions):
        if pos[6] <= ENTRY_RADIUS:  # distance_miles
            entry_idx = i
            entry_time = pos[0]
            break

    if entry_idx is None:
        return None

    # Analyze positions in the 5 minutes before entry
    analysis_start_time = entry_time - timedelta(seconds=ANALYSIS_WINDOW)

    pre_entry_positions = []
    for i in range(entry_idx):
        pos = positions[i]
        if pos[0] >= analysis_start_time:
            pre_entry_positions.append(pos)

    if len(pre_entry_positions) < 5:  # Need at least 5 positions
        return None

    # Calculate metrics
    speeds = [pos[4] for pos in pre_entry_positions if pos[4] is not None]
    headings = [pos[5] for pos in pre_entry_positions if pos[5] is not None]
    distances = [pos[6] for pos in pre_entry_positions]

    avg_speed = statistics.mean(speeds) if speeds else 0
    min_speed = min(speeds) if speeds else 0
    max_speed = max(speeds) if speeds else 0

    heading_std = circular_std(headings) if len(headings) >= 2 else 0

    # Count heading changes > 30 degrees
    large_heading_changes = 0
    for i in range(1, len(headings)):
        diff = abs(headings[i] - headings[i-1])
        if diff > 180:
            diff = 360 - diff
        if diff > 30:
            large_heading_changes += 1

    min_distance = min(distances)
    avg_distance = statistics.mean(distances)

    # Calculate time spent loitering (distance 0.5-2 miles, speed < 60 knots)
    loiter_time = 0
    for pos in pre_entry_positions:
        if 0.5 < pos[6] <= 2.0 and (pos[4] is None or pos[4] < 60):
            loiter_time += 1  # Approximate, assumes ~1 second per position

    return {
        'flight_log_id': flight_log_id,
        'entry_time': entry_time.isoformat(),
        'pre_entry_window_positions': len(pre_entry_positions),
        'avg_speed_knots': round(avg_speed, 1),
        'min_speed_knots': round(min_speed, 1),
        'max_speed_knots': round(max_speed, 1),
        'heading_std_degrees': round(heading_std, 1),
        'large_heading_changes': large_heading_changes,
        'min_distance_miles': round(min_distance, 3),
        'avg_distance_miles': round(avg_distance, 3),
        'loiter_positions': loiter_time,
        'suspicious_score': 0  # Will calculate below
    }

# Get all flights that enter the radius
cur = conn.cursor()
cur.execute("""
    WITH target AS (
        SELECT %s AS lat, %s AS lon
    ),
    flights_near_target AS (
        SELECT DISTINCT
            fp.flight_log_id,
            fl.aircraft_id,
            fl.callsign,
            fl.departure_time,
            fl.arrival_time,
            fl.flight_id,
            a.registration
        FROM flight_positions fp
        CROSS JOIN target t
        JOIN flight_logs fl ON fp.flight_log_id = fl.id
        LEFT JOIN aircraft a ON fl.aircraft_id = a.id
        WHERE (3959 * acos(
            cos(radians(t.lat)) * cos(radians(fp.latitude)) *
            cos(radians(fp.longitude) - radians(t.lon)) +
            sin(radians(t.lat)) * sin(radians(fp.latitude))
        )) <= %s
    )
    SELECT
        flight_log_id,
        registration,
        callsign,
        departure_time,
        arrival_time,
        flight_id
    FROM flights_near_target
    ORDER BY departure_time DESC
""", (TARGET_LAT, TARGET_LON, ENTRY_RADIUS))

flights = cur.fetchall()
print(f"Analyzing {len(flights)} flights...")

results = []
for i, flight in enumerate(flights):
    if i % 20 == 0:
        print(f"Processing flight {i+1}/{len(flights)}...")

    flight_log_id, registration, callsign, departure_time, arrival_time, flight_id = flight

    analysis = analyze_flight(flight_log_id)

    if analysis:
        # Calculate suspicious score based on multiple factors
        score = 0

        # Low average speed before entry (hovering)
        if analysis['avg_speed_knots'] < 50:
            score += 3
        elif analysis['avg_speed_knots'] < 65:
            score += 2
        elif analysis['avg_speed_knots'] < 80:
            score += 1

        # High heading variability (circling/spinning)
        if analysis['heading_std_degrees'] > 60:
            score += 3
        elif analysis['heading_std_degrees'] > 40:
            score += 2
        elif analysis['heading_std_degrees'] > 25:
            score += 1

        # Multiple large heading changes
        if analysis['large_heading_changes'] >= 5:
            score += 3
        elif analysis['large_heading_changes'] >= 3:
            score += 2
        elif analysis['large_heading_changes'] >= 1:
            score += 1

        # Loitering nearby before entry
        if analysis['loiter_positions'] > 100:
            score += 3
        elif analysis['loiter_positions'] > 50:
            score += 2
        elif analysis['loiter_positions'] > 20:
            score += 1

        # Close proximity before entry (deliberate approach)
        if 0.5 < analysis['min_distance_miles'] <= 1.0:
            score += 2
        elif 1.0 < analysis['min_distance_miles'] <= 1.5:
            score += 1

        analysis['suspicious_score'] = score
        analysis['registration'] = registration
        analysis['callsign'] = callsign
        analysis['departure_time'] = departure_time.isoformat()
        analysis['arrival_time'] = arrival_time.isoformat()
        analysis['flight_id'] = flight_id

        results.append(analysis)

# Sort by suspicious score (descending)
results.sort(key=lambda x: x['suspicious_score'], reverse=True)

# Save results
with open('/home/phx/phx-helicopter-tracker/pre_entry_analysis_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nAnalysis complete! Analyzed {len(results)} flights.")
print(f"Results saved to pre_entry_analysis_results.json")
print(f"\nTop 10 most suspicious flights:")
for i, result in enumerate(results[:10]):
    print(f"{i+1}. Flight {result['flight_log_id']} ({result['registration']}) - Score: {result['suspicious_score']}")
    print(f"   Entry: {result['entry_time']}")
    print(f"   Avg Speed: {result['avg_speed_knots']} kts, Heading Std: {result['heading_std_degrees']}°")
    print(f"   Loiter positions: {result['loiter_positions']}, Heading changes: {result['large_heading_changes']}")
    print()

conn.close()
