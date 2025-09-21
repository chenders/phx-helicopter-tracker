# Flight Data Export for Noise Impact Analysis

## Overview
This guide explains how to export Phoenix PD helicopter flight data for noise impact and FAA compliance analysis in a separate project.

## Data Export Instructions

### 1. Export Complete Flight Data with Positions

Run this command to export all flight data with positions to CSV files:

```bash
# Export flight discoveries (basic flight info)
docker compose exec db psql -U postgres phoenix_helicopters -c "\copy (
    SELECT
        fd.id,
        fd.fr24_id,
        fd.registration,
        fd.callsign,
        fd.aircraft_type,
        fd.departure_time,
        fd.arrival_time,
        fd.origin_airport,
        fd.destination_airport,
        fd.flight_duration_minutes,
        fd.first_seen,
        fd.last_seen,
        fd.positions_count
    FROM flight_discoveries fd
    WHERE fd.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    ORDER BY fd.departure_time
) TO '/tmp/flight_discoveries.csv' WITH CSV HEADER;"

# Export flight logs (detailed flight info)
docker compose exec db psql -U postgres phoenix_helicopters -c "\copy (
    SELECT
        fl.id,
        fl.flight_id,
        a.registration,
        fl.callsign,
        fl.departure_time,
        fl.arrival_time,
        fl.flight_duration_minutes,
        fl.departure_airport,
        fl.arrival_airport,
        fl.max_altitude_feet,
        fl.min_altitude_feet,
        fl.avg_altitude_feet,
        fl.estimated_cost,
        fl.fuel_consumed_gallons
    FROM flight_logs fl
    JOIN aircraft a ON fl.aircraft_id = a.id
    WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    ORDER BY fl.departure_time
) TO '/tmp/flight_logs.csv' WITH CSV HEADER;"

# Export all position data (this will be large!)
docker compose exec db psql -U postgres phoenix_helicopters -c "\copy (
    SELECT
        fp.id,
        fp.flight_log_id,
        a.registration,
        fp.timestamp,
        fp.latitude,
        fp.longitude,
        fp.altitude_feet,
        fp.ground_speed_knots,
        fp.track_degrees,
        fp.vertical_rate,
        fp.is_hovering,
        fp.hover_duration_seconds,
        fp.is_circling,
        fp.circle_radius_feet
    FROM flight_positions fp
    JOIN aircraft a ON fp.aircraft_id = a.id
    WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    ORDER BY fp.timestamp
) TO '/tmp/flight_positions.csv' WITH CSV HEADER;"

# Export abnormal patterns (includes hovering/circling events)
docker compose exec db psql -U postgres phoenix_helicopters -c "\copy (
    SELECT
        ap.id,
        fl.flight_id,
        a.registration,
        ap.pattern_type,
        ap.confidence_score,
        ap.detected_at,
        ap.detection_metadata->>'start_time' as start_time,
        ap.detection_metadata->>'end_time' as end_time,
        (ap.detection_metadata->>'duration_seconds')::float as duration_seconds,
        (ap.detection_metadata->>'center_lat')::float as center_latitude,
        (ap.detection_metadata->>'center_lon')::float as center_longitude,
        (ap.detection_metadata->>'radius_meters')::float as radius_meters,
        (ap.detection_metadata->>'max_altitude')::float as max_altitude_feet,
        (ap.detection_metadata->>'min_altitude')::float as min_altitude_feet,
        ap.detection_metadata->>'description' as description,
        ap.detection_metadata->>'geographic_feature' as geographic_feature,
        ap.reviewed,
        ap.legal_relevance,
        ap.potential_violation
    FROM abnormal_patterns ap
    JOIN flight_logs fl ON ap.flight_log_id = fl.id
    JOIN aircraft a ON fl.aircraft_id = a.id
    WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    ORDER BY ap.detected_at
) TO '/tmp/abnormal_patterns.csv' WITH CSV HEADER;"

# Copy files from container to host
docker cp phx-helicopter-tracker-db-1:/tmp/flight_discoveries.csv ./flight_discoveries.csv
docker cp phx-helicopter-tracker-db-1:/tmp/flight_logs.csv ./flight_logs.csv
docker cp phx-helicopter-tracker-db-1:/tmp/flight_positions.csv ./flight_positions.csv
docker cp phx-helicopter-tracker-db-1:/tmp/abnormal_patterns.csv ./abnormal_patterns.csv
```

### 2. Export Aggregated Noise Impact Data

For focused noise analysis, export aggregated data by neighborhood/time:

```bash
# Export hourly flight counts by area
docker compose exec db psql -U postgres phoenix_helicopters -c "\copy (
    WITH hourly_activity AS (
        SELECT
            DATE_TRUNC('hour', fp.timestamp) as hour,
            a.registration,
            COUNT(DISTINCT fp.flight_log_id) as unique_flights,
            COUNT(*) as position_records,
            AVG(fp.altitude_feet) as avg_altitude,
            MIN(fp.altitude_feet) as min_altitude,
            COUNT(CASE WHEN fp.altitude_feet < 500 THEN 1 END) as low_altitude_count,
            COUNT(CASE WHEN fp.is_hovering THEN 1 END) as hover_count,
            SUM(CASE WHEN fp.is_hovering THEN fp.hover_duration_seconds ELSE 0 END) as total_hover_seconds
        FROM flight_positions fp
        JOIN aircraft a ON fp.aircraft_id = a.id
        WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
        GROUP BY DATE_TRUNC('hour', fp.timestamp), a.registration
    )
    SELECT * FROM hourly_activity ORDER BY hour, registration
) TO '/tmp/hourly_noise_impact.csv' WITH CSV HEADER;"

# Export night operations (10 PM - 6 AM)
docker compose exec db psql -U postgres phoenix_helicopters -c "\copy (
    SELECT
        DATE(fp.timestamp) as flight_date,
        a.registration,
        EXTRACT(HOUR FROM fp.timestamp) as hour,
        COUNT(*) as position_count,
        AVG(fp.altitude_feet) as avg_altitude,
        MIN(fp.altitude_feet) as min_altitude
    FROM flight_positions fp
    JOIN aircraft a ON fp.aircraft_id = a.id
    WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
        AND (EXTRACT(HOUR FROM fp.timestamp) >= 22 OR EXTRACT(HOUR FROM fp.timestamp) < 6)
    GROUP BY DATE(fp.timestamp), a.registration, EXTRACT(HOUR FROM fp.timestamp)
    ORDER BY flight_date, hour
) TO '/tmp/night_operations.csv' WITH CSV HEADER;"

docker cp phx-helicopter-tracker-db-1:/tmp/hourly_noise_impact.csv ./hourly_noise_impact.csv
docker cp phx-helicopter-tracker-db-1:/tmp/night_operations.csv ./night_operations.csv
```

### 3. Export GeoJSON for Mapping

```bash
# Export flight paths as GeoJSON
docker compose exec backend python -c "
import json
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://'))

with engine.connect() as conn:
    # Get flight paths
    result = conn.execute(text('''
        SELECT
            fl.id,
            fl.flight_id,
            a.registration,
            fl.departure_time,
            fl.arrival_time,
            fl.flight_duration_minutes,
            json_agg(
                json_build_object(
                    'lat', fp.latitude,
                    'lon', fp.longitude,
                    'alt', fp.altitude_feet,
                    'time', fp.timestamp
                ) ORDER BY fp.timestamp
            ) as path
        FROM flight_logs fl
        JOIN aircraft a ON fl.aircraft_id = a.id
        JOIN flight_positions fp ON fp.flight_log_id = fl.id
        WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
        GROUP BY fl.id, fl.flight_id, a.registration, fl.departure_time, fl.arrival_time, fl.flight_duration_minutes
    '''))

    features = []
    for row in result:
        if row.path:
            coordinates = [[p['lon'], p['lat'], p['alt']] for p in row.path]
            features.append({
                'type': 'Feature',
                'properties': {
                    'flight_id': row.flight_id,
                    'registration': row.registration,
                    'departure_time': str(row.departure_time),
                    'arrival_time': str(row.arrival_time),
                    'duration_minutes': row.flight_duration_minutes
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coordinates
                }
            })

    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }

    with open('flight_paths.geojson', 'w') as f:
        json.dump(geojson, f, indent=2)

    print(f'Exported {len(features)} flight paths to flight_paths.geojson')
"
```

### 4. Create Summary Statistics

```bash
# Generate summary statistics
docker compose exec db psql -U postgres phoenix_helicopters -c "
SELECT
    'Total Flights' as metric,
    COUNT(DISTINCT fl.id)::text as value
FROM flight_logs fl
JOIN aircraft a ON fl.aircraft_id = a.id
WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
UNION ALL
SELECT
    'Total Flight Hours' as metric,
    ROUND((SUM(fl.flight_duration_minutes)/60.0)::numeric, 1)::text || ' hours' as value
FROM flight_logs fl
JOIN aircraft a ON fl.aircraft_id = a.id
WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
UNION ALL
SELECT
    'Average Daily Flights' as metric,
    ROUND((COUNT(DISTINCT fl.id)::numeric / NULLIF(COUNT(DISTINCT DATE(fl.departure_time)), 0))::numeric, 1)::text as value
FROM flight_logs fl
JOIN aircraft a ON fl.aircraft_id = a.id
WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
UNION ALL
SELECT
    'Night Operations (10PM-6AM)' as metric,
    COUNT(DISTINCT fl.id)::text as value
FROM flight_logs fl
JOIN aircraft a ON fl.aircraft_id = a.id
WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    AND (EXTRACT(HOUR FROM fl.departure_time) >= 22 OR EXTRACT(HOUR FROM fl.arrival_time) < 6)
UNION ALL
SELECT
    'Low Altitude Operations (<500ft)' as metric,
    COUNT(*)::text as value
FROM flight_positions fp
JOIN aircraft a ON fp.aircraft_id = a.id
WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    AND fp.altitude_feet < 500
UNION ALL
SELECT
    'Total Hovering Time' as metric,
    ROUND((SUM(COALESCE(fp.hover_duration_seconds, 0))/3600.0)::numeric, 1)::text || ' hours' as value
FROM flight_positions fp
JOIN aircraft a ON fp.aircraft_id = a.id
WHERE a.registration IN ('N620FB', 'N621FB', 'N622FB', 'N623FB', 'N624FB', 'N625FB')
    AND fp.is_hovering = true;"
```

## Files You'll Have After Export

1. **flight_discoveries.csv** - Basic flight information
2. **flight_logs.csv** - Detailed flight records
3. **flight_positions.csv** - GPS position data (every few seconds)
4. **abnormal_patterns.csv** - Hovering, circling, and unusual patterns
5. **hourly_noise_impact.csv** - Hourly aggregated activity
6. **night_operations.csv** - Night flight data (10 PM - 6 AM)
7. **flight_paths.geojson** - Map-ready flight path data

## Data Size Estimates

- flight_discoveries.csv: ~500 KB
- flight_logs.csv: ~500 KB
- flight_positions.csv: ~500-1000 MB (large!)
- abnormal_patterns.csv: ~100 KB
- hourly_noise_impact.csv: ~200 KB
- night_operations.csv: ~100 KB
- flight_paths.geojson: ~100-200 MB

## Next Steps

1. Create a new project for noise analysis
2. Copy the exported CSV files to the new project
3. Add the CLAUDE.md section below to the new project
4. Begin analysis focusing on:
   - Night operations frequency
   - Low altitude operations over residential areas
   - Hovering duration and locations
   - Repetitive flight patterns
   - FAA minimum altitude violations (500 feet over congested areas)

---

# CLAUDE.md Section for Noise Analysis Project

Add this to your new project's CLAUDE.md:

```markdown
## Phoenix PD Helicopter Noise Impact Analysis

### Project Context
This project analyzes Phoenix Police Department helicopter flight data to assess noise impact on neighborhoods and potential FAA regulation violations. The data comes from FlightRadar24 tracking of 6 Phoenix PD aircraft (N620FB through N625FB).

### Available Data Files

#### Core Flight Data
- **flight_discoveries.csv**: Basic flight records with departure/arrival times
- **flight_logs.csv**: Detailed flight information including altitudes and duration
- **flight_positions.csv**: GPS positions recorded every few seconds during flights
- **abnormal_patterns.csv**: Identified hovering, circling, and unusual flight patterns

#### Aggregated Analysis Data
- **hourly_noise_impact.csv**: Pre-aggregated hourly statistics
- **night_operations.csv**: Night flights (10 PM - 6 AM)
- **flight_paths.geojson**: GeoJSON formatted flight paths for mapping

### Key FAA Regulations to Check

1. **14 CFR § 91.119 - Minimum Safe Altitudes**
   - Over congested areas: 1,000 feet above highest obstacle within 2,000 feet
   - Over other areas: 500 feet above surface
   - Helicopters may operate below if not hazardous to persons/property

2. **14 CFR § 91.13 - Careless or Reckless Operation**
   - No operation endangering life or property

3. **AC 91-36D - Visual Flight Rules (VFR) Flight Near Noise-Sensitive Areas**
   - Recommends 2,000 feet AGL over noise-sensitive areas
   - Avoid flight below 2,000 feet when practical

4. **Local Noise Ordinances**
   - Phoenix City Code Chapter 23 - Noise levels
   - Residential areas: 55 dB(A) daytime, 45 dB(A) nighttime

### Analysis Focus Areas

1. **Noise Impact Metrics**
   - Flight frequency by hour/day/week
   - Altitude distributions over residential areas
   - Hovering duration and locations
   - Night operations (10 PM - 6 AM)
   - Weekend vs. weekday patterns

2. **FAA Compliance Issues**
   - Flights below 500 feet over residential areas
   - Extended hovering over homes
   - Repetitive patterns suggesting surveillance vs. emergency response
   - Night operations without apparent emergency

3. **Geographic Analysis**
   - Heat maps of flight density
   - Neighborhoods most affected
   - Correlation with demographic data
   - Distance from police/emergency incidents

### Data Schema

#### flight_positions.csv columns:
- `id`: Unique position record ID
- `flight_log_id`: Links to flight_logs.id
- `registration`: Aircraft registration (N620FB, etc.)
- `timestamp`: UTC timestamp
- `latitude`, `longitude`: GPS coordinates
- `altitude_feet`: Altitude in feet
- `ground_speed_knots`: Ground speed
- `is_hovering`: Boolean flag
- `hover_duration_seconds`: Duration if hovering
- `is_circling`: Boolean flag
- `circle_radius_feet`: Radius if circling

#### abnormal_patterns.csv columns:
- `id`: Unique pattern ID
- `flight_id`: Links to flight_logs
- `registration`: Aircraft registration
- `pattern_type`: 'hovering', 'circling', 'sky_art', etc.
- `confidence_score`: 0.0 to 1.0
- `detected_at`: When pattern was detected
- `start_time`, `end_time`: Pattern duration (from metadata)
- `duration_seconds`: Total duration
- `center_latitude`, `center_longitude`: Pattern center
- `radius_meters`: Pattern radius
- `min_altitude_feet`, `max_altitude_feet`: Altitude range
- `description`: Pattern description
- `geographic_feature`: Nearby location
- `reviewed`: Review status ('pending', 'confirmed', 'rejected')
- `legal_relevance`: Legal significance rating
- `potential_violation`: Description of potential FAA violations

### Useful Queries/Analysis

1. **Find extended hovering over residential areas**:
```python
df_hover = df_positions[df_positions['is_hovering'] == True]
df_hover_long = df_hover[df_hover['hover_duration_seconds'] > 300]  # >5 minutes
```

2. **Identify low altitude operations**:
```python
df_low = df_positions[df_positions['altitude_feet'] < 500]
low_altitude_percentage = len(df_low) / len(df_positions) * 100
```

3. **Night operations analysis**:
```python
df_positions['hour'] = pd.to_datetime(df_positions['timestamp']).dt.hour
df_night = df_positions[(df_positions['hour'] >= 22) | (df_positions['hour'] < 6)]
```

4. **Geographic clustering**:
```python
from sklearn.cluster import DBSCAN
coords = df_hover[['latitude', 'longitude']].values
clustering = DBSCAN(eps=0.001, min_samples=10).fit(coords)
```

### Known Issues from "Alex" Incident
On July 10, 2025, helicopter N624FB spent 1 hour 48 minutes skywriting "ALEX" over the Maryvale neighborhood:
- Flew below 2,000 feet for 45 minutes
- No emergency or official purpose
- Cost taxpayers ~$2,160
- No disciplinary action taken

This incident demonstrates:
1. Non-emergency use of police helicopters
2. Extended low-altitude operations over residential areas
3. Lack of oversight/accountability
```