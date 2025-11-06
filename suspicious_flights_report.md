# Suspicious Helicopter Flights Near 1434 E Rose Ln, Phoenix, AZ 85014

This report identifies helicopter flights that exhibited suspicious hovering, circling, or positioning behavior before
entering a 0.5-mile radius around the target address (33.4942°N, 112.0556°W).

## Analysis Methodology

Each flight was analyzed for the 5-minute period before it first entered the 0.5-mile radius. The following metrics were
calculated:

- **Average Speed**: Mean ground speed during the pre-entry window (lower = more hovering)
- **Heading Standard Deviation**: Measure of directional changes (higher = more circling/spinning)
- **Large Heading Changes**: Number of heading changes > 30° (indicates maneuvering)
- **Loiter Positions**: Number of position reports within 0.5-2 miles at low speed (< 70 mph)
- **Minimum Distance**: Closest approach to target before entering the radius

### Suspicious Score Calculation

Flights are scored based on multiple factors:

- Low average speed (< 58 mph: +3, < 75 mph: +2, < 92 mph: +1)
- High heading variability (> 60°: +3, > 40°: +2, > 25°: +1)
- Multiple heading changes (≥ 5: +3, ≥ 3: +2, ≥ 1: +1)
- Extended loitering (> 100 positions: +3, > 50: +2, > 20: +1)
- Close proximity before entry (0.5-1.0 mi: +2, 1.0-1.5 mi: +1)

**Scores ≥ 10 indicate highly suspicious surveillance-like behavior.**

## Summary Statistics

- **Total flights analyzed**: 1,786
- **Flights with suspicious score ≥ 9**: {len(suspicious_flights)}
- **Highest suspicious score**: {max(r['suspicious_score'] for r in suspicious_flights)}
- **Date range**: {min(r['departure_time'][:10] for r in suspicious_flights)} to {max(r['departure_time'][:10] for r in
  suspicious_flights)}

## Suspicious Flights

### Flight #1: N622FB - Score 13

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [1737](https://helos.maxandbramble.org/flight/1737?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a42c16a`
- **Departure**: 2025-05-09 18:48:30
- **Arrival**: 2025-05-09 20:02:43
- **Entry Time**: 2025-05-09 19:30:18

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 62.6 mph (55.2-67.9 mph range)
- **Heading Variability**: 126.6° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 138 positions at low speed near target
- **Closest Approach Before Entry**: 0.514 miles
- **Average Distance Before Entry**: 0.681 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Extended loitering** - Spent 138 seconds hovering within 2 miles of target
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #2: N622FB - Score 12

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3392](https://helos.maxandbramble.org/flight/3392?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3cbaec1a`
- **Departure**: 2025-10-19 06:29:18
- **Arrival**: 2025-10-19 08:08:59
- **Entry Time**: 2025-10-19 07:44:11

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 69.4 mph (39.1-128.9 mph range)
- **Heading Variability**: 112.1° standard deviation
- **Large Heading Changes**: 42 changes > 30°
- **Loiter Positions**: 96 positions at low speed near target
- **Closest Approach Before Entry**: 0.551 miles
- **Average Distance Before Entry**: 1.481 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 42 major heading changes in 5 minutes
⚠️ **Significant loitering** - 96 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #3: N624FB - Score 12

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [3755](https://helos.maxandbramble.org/flight/3755?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3799d854`
- **Departure**: 2024-10-18 14:57:33
- **Arrival**: 2024-10-18 16:24:30
- **Entry Time**: 2024-10-18 15:33:41

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 62.6 mph (35.7-99.0 mph range)
- **Heading Variability**: 115.9° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 70 positions at low speed near target
- **Closest Approach Before Entry**: 0.52 miles
- **Average Distance Before Entry**: 1.151 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Significant loitering** - 70 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #4: N625FB - Score 12

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4372](https://helos.maxandbramble.org/flight/4372?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3693a9c5`
- **Departure**: 2024-08-10 23:04:26
- **Arrival**: 2024-08-11 00:43:52
- **Entry Time**: 2024-08-10 23:56:01

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 70.1 mph (50.6-123.1 mph range)
- **Heading Variability**: 104.2° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 53 positions at low speed near target
- **Closest Approach Before Entry**: 0.53 miles
- **Average Distance Before Entry**: 1.297 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Significant loitering** - 53 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #5: N624FB - Score 12

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [4833](https://helos.maxandbramble.org/flight/4833?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35ba1c1e`
- **Departure**: 2024-06-17 21:00:20
- **Arrival**: 2024-06-17 23:02:16
- **Entry Time**: 2024-06-17 21:16:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 64.2 mph (47.2-82.9 mph range)
- **Heading Variability**: 85.1° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 63 positions at low speed near target
- **Closest Approach Before Entry**: 0.537 miles
- **Average Distance Before Entry**: 1.222 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Significant loitering** - 63 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #6: N622FB - Score 12

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5058](https://helos.maxandbramble.org/flight/5058?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_354f492b`
- **Departure**: 2024-05-21 00:46:08
- **Arrival**: 2024-05-21 02:04:39
- **Entry Time**: 2024-05-21 01:11:37

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 62.9 mph (40.3-96.7 mph range)
- **Heading Variability**: 122.7° standard deviation
- **Large Heading Changes**: 76 changes > 30°
- **Loiter Positions**: 74 positions at low speed near target
- **Closest Approach Before Entry**: 0.504 miles
- **Average Distance Before Entry**: 0.813 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 76 major heading changes in 5 minutes
⚠️ **Significant loitering** - 74 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #7: N624FB - Score 12

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5348](https://helos.maxandbramble.org/flight/5348?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34da421b`
- **Departure**: 2024-04-20 07:59:19
- **Arrival**: 2024-04-20 09:34:31
- **Entry Time**: 2024-04-20 09:04:05

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 70.3 mph (50.6-131.2 mph range)
- **Heading Variability**: 123.0° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 62 positions at low speed near target
- **Closest Approach Before Entry**: 0.568 miles
- **Average Distance Before Entry**: 1.368 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Significant loitering** - 62 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #8: N621FB - Score 12

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [6173](https://helos.maxandbramble.org/flight/6173?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33609b3c`
- **Departure**: 2023-12-26 07:50:18
- **Arrival**: 2023-12-26 09:03:02
- **Entry Time**: 2023-12-26 08:28:56

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.2 mph (61.0-126.6 mph range)
- **Heading Variability**: 114.0° standard deviation
- **Large Heading Changes**: 31 changes > 30°
- **Loiter Positions**: 59 positions at low speed near target
- **Closest Approach Before Entry**: 0.529 miles
- **Average Distance Before Entry**: 0.972 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 31 major heading changes in 5 minutes
⚠️ **Significant loitering** - 59 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #9: N621FB - Score 12

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [6250](https://helos.maxandbramble.org/flight/6250?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_333bc757`
- **Departure**: 2023-12-15 02:05:11
- **Arrival**: 2023-12-15 03:36:59
- **Entry Time**: 2023-12-15 02:32:56

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 66.5 mph (57.5-85.2 mph range)
- **Heading Variability**: 131.9° standard deviation
- **Large Heading Changes**: 28 changes > 30°
- **Loiter Positions**: 79 positions at low speed near target
- **Closest Approach Before Entry**: 0.562 miles
- **Average Distance Before Entry**: 1.173 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 28 major heading changes in 5 minutes
⚠️ **Significant loitering** - 79 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #10: N621FB - Score 11

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [923](https://helos.maxandbramble.org/flight/923?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b8d050e`
- **Departure**: 2025-08-03 03:33:50
- **Arrival**: 2025-08-03 05:07:32
- **Entry Time**: 2025-08-03 03:49:49

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 67.8 mph (34.5-117.4 mph range)
- **Heading Variability**: 76.9° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 22 positions at low speed near target
- **Closest Approach Before Entry**: 0.539 miles
- **Average Distance Before Entry**: 2.038 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #11: N624FB - Score 11

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [1291](https://helos.maxandbramble.org/flight/1291?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3afd2276`
- **Departure**: 2025-06-26 22:40:42
- **Arrival**: 2025-06-27 00:10:40
- **Entry Time**: 2025-06-26 23:08:18

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.1 mph (46.0-130.0 mph range)
- **Heading Variability**: 105.6° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 59 positions at low speed near target
- **Closest Approach Before Entry**: 0.645 miles
- **Average Distance Before Entry**: 1.71 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 59 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #12: N622FB - Score 11

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [1756](https://helos.maxandbramble.org/flight/1756?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a3be005`
- **Departure**: 2025-05-07 23:06:53
- **Arrival**: 2025-05-08 00:32:08
- **Entry Time**: 2025-05-07 23:25:23

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 54.8 mph (33.4-80.6 mph range)
- **Heading Variability**: 66.5° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 109 positions at low speed near target
- **Closest Approach Before Entry**: 0.533 miles
- **Average Distance Before Entry**: 1.04 miles

**Pattern Analysis:**
⚠️ **Extensive hovering** - Very low average speed suggests prolonged hovering
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Extended loitering** - Spent 109 seconds hovering within 2 miles of target
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #13: N622FB - Score 11

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [2175](https://helos.maxandbramble.org/flight/2175?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_399258c0`
- **Departure**: 2025-03-22 03:32:10
- **Arrival**: 2025-03-22 05:01:39
- **Entry Time**: 2025-03-22 04:47:47

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 50.7 mph (13.8-138.1 mph range)
- **Heading Variability**: 105.6° standard deviation
- **Large Heading Changes**: 3 changes > 30°
- **Loiter Positions**: 36 positions at low speed near target
- **Closest Approach Before Entry**: 0.503 miles
- **Average Distance Before Entry**: 1.861 miles

**Pattern Analysis:**
⚠️ **Extensive hovering** - Very low average speed suggests prolonged hovering
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #14: N624FB - Score 11

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [2252](https://helos.maxandbramble.org/flight/2252?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_397b7be0`
- **Departure**: 2025-03-15 03:34:56
- **Arrival**: 2025-03-15 05:10:28
- **Entry Time**: 2025-03-15 04:32:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.0 mph (51.8-101.3 mph range)
- **Heading Variability**: 98.3° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 50 positions at low speed near target
- **Closest Approach Before Entry**: 0.517 miles
- **Average Distance Before Entry**: 1.621 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #15: N623FB - Score 11

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2498](https://helos.maxandbramble.org/flight/2498?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39346413`
- **Departure**: 2025-02-21 03:34:16
- **Arrival**: 2025-02-21 05:12:43
- **Entry Time**: 2025-02-21 05:04:54

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.6 mph (44.9-158.8 mph range)
- **Heading Variability**: 100.6° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 61 positions at low speed near target
- **Closest Approach Before Entry**: 0.513 miles
- **Average Distance Before Entry**: 1.038 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Significant loitering** - 61 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #16: N625FB - Score 11

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [2689](https://helos.maxandbramble.org/flight/2689?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3903005c`
- **Departure**: 2025-02-05 15:05:33
- **Arrival**: 2025-02-05 16:12:06
- **Entry Time**: 2025-02-05 15:37:13

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 72.2 mph (44.9-96.7 mph range)
- **Heading Variability**: 85.2° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 33 positions at low speed near target
- **Closest Approach Before Entry**: 0.506 miles
- **Average Distance Before Entry**: 1.835 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #17: N622FB - Score 11

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3023](https://helos.maxandbramble.org/flight/3023?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38944ef4`
- **Departure**: 2025-01-03 15:36:45
- **Arrival**: 2025-01-03 16:00:00
- **Entry Time**: 2025-01-03 15:34:26

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 66.2 mph (46.0-94.4 mph range)
- **Heading Variability**: 79.8° standard deviation
- **Large Heading Changes**: 3 changes > 30°
- **Loiter Positions**: 70 positions at low speed near target
- **Closest Approach Before Entry**: 0.519 miles
- **Average Distance Before Entry**: 1.381 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Significant loitering** - 70 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #18: N622FB - Score 11

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3883](https://helos.maxandbramble.org/flight/3883?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_376abc87`
- **Departure**: 2024-10-06 01:39:03
- **Arrival**: 2024-10-06 03:03:42
- **Entry Time**: 2024-10-06 02:19:33

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.5 mph (52.9-92.1 mph range)
- **Heading Variability**: 106.5° standard deviation
- **Large Heading Changes**: 31 changes > 30°
- **Loiter Positions**: 39 positions at low speed near target
- **Closest Approach Before Entry**: 0.501 miles
- **Average Distance Before Entry**: 1.357 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 31 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #19: N624FB - Score 11

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [4440](https://helos.maxandbramble.org/flight/4440?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36783801`
- **Departure**: 2024-08-03 22:42:03
- **Arrival**: 2024-08-04 00:29:39
- **Entry Time**: 2024-08-03 23:15:22

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.8 mph (41.4-112.8 mph range)
- **Heading Variability**: 119.8° standard deviation
- **Large Heading Changes**: 29 changes > 30°
- **Loiter Positions**: 46 positions at low speed near target
- **Closest Approach Before Entry**: 0.504 miles
- **Average Distance Before Entry**: 0.923 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 29 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #20: N622FB - Score 11

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4504](https://helos.maxandbramble.org/flight/4504?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36585962`
- **Departure**: 2024-07-26 23:03:13
- **Arrival**: 2024-07-27 00:30:18
- **Entry Time**: 2024-07-26 23:49:21

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.3 mph (44.9-84.0 mph range)
- **Heading Variability**: 111.0° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 21 positions at low speed near target
- **Closest Approach Before Entry**: 0.515 miles
- **Average Distance Before Entry**: 0.789 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #21: N623FB - Score 11

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [5049](https://helos.maxandbramble.org/flight/5049?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35542951`
- **Departure**: 2024-05-22 09:33:46
- **Arrival**: 2024-05-22 10:59:47
- **Entry Time**: 2024-05-22 10:23:45

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.6 mph (49.5-154.2 mph range)
- **Heading Variability**: 100.1° standard deviation
- **Large Heading Changes**: 31 changes > 30°
- **Loiter Positions**: 40 positions at low speed near target
- **Closest Approach Before Entry**: 0.549 miles
- **Average Distance Before Entry**: 1.268 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 31 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #22: N621FB - Score 11

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5993](https://helos.maxandbramble.org/flight/5993?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33b23fd8`
- **Departure**: 2024-01-21 03:32:06
- **Arrival**: 2024-01-21 05:05:37
- **Entry Time**: 2024-01-21 04:31:28

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.9 mph (63.3-86.3 mph range)
- **Heading Variability**: 114.5° standard deviation
- **Large Heading Changes**: 17 changes > 30°
- **Loiter Positions**: 23 positions at low speed near target
- **Closest Approach Before Entry**: 0.532 miles
- **Average Distance Before Entry**: 1.175 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 17 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #23: N622FB - Score 11

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6000](https://helos.maxandbramble.org/flight/6000?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33afa3a1`
- **Departure**: 2024-01-20 06:33:03
- **Arrival**: 2024-01-20 08:31:39
- **Entry Time**: 2024-01-20 08:24:30

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.2 mph (57.5-107.0 mph range)
- **Heading Variability**: 120.5° standard deviation
- **Large Heading Changes**: 25 changes > 30°
- **Loiter Positions**: 33 positions at low speed near target
- **Closest Approach Before Entry**: 0.542 miles
- **Average Distance Before Entry**: 1.288 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 25 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #24: N621FB - Score 11

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [6072](https://helos.maxandbramble.org/flight/6072?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33905507`
- **Departure**: 2024-01-09 23:16:20
- **Arrival**: 2024-01-10 00:40:56
- **Entry Time**: 2024-01-10 00:28:30

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 66.6 mph (36.8-88.6 mph range)
- **Heading Variability**: 89.2° standard deviation
- **Large Heading Changes**: 26 changes > 30°
- **Loiter Positions**: 50 positions at low speed near target
- **Closest Approach Before Entry**: 0.518 miles
- **Average Distance Before Entry**: 1.344 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 26 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #25: N625FB - Score 10

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [684](https://helos.maxandbramble.org/flight/684?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3bfee38e`
- **Departure**: 2025-08-31 18:31:14
- **Arrival**: 2025-08-31 19:18:50
- **Entry Time**: 2025-08-31 18:49:11

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 73.5 mph (62.1-93.2 mph range)
- **Heading Variability**: 92.1° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 14 positions at low speed near target
- **Closest Approach Before Entry**: 0.538 miles
- **Average Distance Before Entry**: 1.78 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #26: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [872](https://helos.maxandbramble.org/flight/872?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3ba1a790`
- **Departure**: 2025-08-08 06:32:35
- **Arrival**: 2025-08-08 08:10:56
- **Entry Time**: 2025-08-08 08:02:20

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 64.6 mph (47.2-123.1 mph range)
- **Heading Variability**: 120.2° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 120 positions at low speed near target
- **Closest Approach Before Entry**: 0.523 miles
- **Average Distance Before Entry**: 1.511 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Extended loitering** - Spent 120 seconds hovering within 2 miles of target
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #27: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [942](https://helos.maxandbramble.org/flight/942?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b850ee8`
- **Departure**: 2025-08-01 02:03:41
- **Arrival**: 2025-08-01 03:34:00
- **Entry Time**: 2025-08-01 02:34:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.1 mph (42.6-119.7 mph range)
- **Heading Variability**: 88.9° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 50 positions at low speed near target
- **Closest Approach Before Entry**: 0.552 miles
- **Average Distance Before Entry**: 1.434 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #28: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [1135](https://helos.maxandbramble.org/flight/1135?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b3748c9`
- **Departure**: 2025-07-12 05:04:18
- **Arrival**: 2025-07-12 06:39:14
- **Entry Time**: 2025-07-12 05:53:47

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.2 mph (28.8-125.4 mph range)
- **Heading Variability**: 111.9° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 45 positions at low speed near target
- **Closest Approach Before Entry**: 0.62 miles
- **Average Distance Before Entry**: 1.581 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #29: N625FB - Score 10

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1315](https://helos.maxandbramble.org/flight/1315?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3af51890`
- **Departure**: 2025-06-24 23:13:56
- **Arrival**: 2025-06-25 00:47:23
- **Entry Time**: 2025-06-25 00:34:49

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 80.8 mph (46.0-104.7 mph range)
- **Heading Variability**: 106.5° standard deviation
- **Large Heading Changes**: 11 changes > 30°
- **Loiter Positions**: 21 positions at low speed near target
- **Closest Approach Before Entry**: 0.507 miles
- **Average Distance Before Entry**: 1.441 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 11 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #30: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [1729](https://helos.maxandbramble.org/flight/1729?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a471e89`
- **Departure**: 2025-05-10 18:28:16
- **Arrival**: 2025-05-10 19:54:28
- **Entry Time**: 2025-05-10 18:43:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 61.7 mph (46.0-103.6 mph range)
- **Heading Variability**: 103.7° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 111 positions at low speed near target
- **Closest Approach Before Entry**: 0.559 miles
- **Average Distance Before Entry**: 1.093 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Extended loitering** - Spent 111 seconds hovering within 2 miles of target
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #31: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [1798](https://helos.maxandbramble.org/flight/1798?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a292b45`
- **Departure**: 2025-05-02 18:05:19
- **Arrival**: 2025-05-02 19:21:55
- **Entry Time**: 2025-05-02 18:51:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 80.0 mph (33.4-132.3 mph range)
- **Heading Variability**: 93.3° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 30 positions at low speed near target
- **Closest Approach Before Entry**: 0.503 miles
- **Average Distance Before Entry**: 1.637 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #32: N625FB - Score 10

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1944](https://helos.maxandbramble.org/flight/1944?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39f083cc`
- **Departure**: 2025-04-17 18:00:41
- **Arrival**: 2025-04-17 19:25:32
- **Entry Time**: 2025-04-17 18:53:54

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 56.5 mph (34.5-86.3 mph range)
- **Heading Variability**: 68.2° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 52 positions at low speed near target
- **Closest Approach Before Entry**: 0.502 miles
- **Average Distance Before Entry**: 2.073 miles

**Pattern Analysis:**
⚠️ **Extensive hovering** - Very low average speed suggests prolonged hovering
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Significant loitering** - 52 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #33: N624FB - Score 10

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [2088](https://helos.maxandbramble.org/flight/2088?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39b97d30`
- **Departure**: 2025-04-02 22:50:54
- **Arrival**: 2025-04-03 00:12:09
- **Entry Time**: 2025-04-02 23:52:37

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.4 mph (54.1-141.5 mph range)
- **Heading Variability**: 120.8° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 61 positions at low speed near target
- **Closest Approach Before Entry**: 0.515 miles
- **Average Distance Before Entry**: 1.485 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 61 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #34: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [2197](https://helos.maxandbramble.org/flight/2197?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_398b4370`
- **Departure**: 2025-03-20 03:32:49
- **Arrival**: 2025-03-20 04:35:42
- **Entry Time**: 2025-03-20 03:45:49

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 65.5 mph (39.1-108.2 mph range)
- **Heading Variability**: 136.3° standard deviation
- **Large Heading Changes**: 2 changes > 30°
- **Loiter Positions**: 75 positions at low speed near target
- **Closest Approach Before Entry**: 0.515 miles
- **Average Distance Before Entry**: 1.503 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 75 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #35: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2353](https://helos.maxandbramble.org/flight/2353?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_395abc39`
- **Departure**: 2025-03-04 23:15:05
- **Arrival**: 2025-03-05 00:34:49
- **Entry Time**: 2025-03-05 00:05:59

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 69.4 mph (43.7-90.9 mph range)
- **Heading Variability**: 114.4° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 138 positions at low speed near target
- **Closest Approach Before Entry**: 0.507 miles
- **Average Distance Before Entry**: 0.91 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Extended loitering** - Spent 138 seconds hovering within 2 miles of target
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #36: N624FB - Score 10

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [2521](https://helos.maxandbramble.org/flight/2521?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_392e5a62`
- **Departure**: 2025-02-19 07:12:39
- **Arrival**: 2025-02-19 08:06:58
- **Entry Time**: 2025-02-19 06:48:20

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.6 mph (31.1-100.1 mph range)
- **Heading Variability**: 92.2° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.55 miles
- **Average Distance Before Entry**: 2.506 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #37: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [2954](https://helos.maxandbramble.org/flight/2954?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38aaba55`
- **Departure**: 2025-01-10 08:02:38
- **Arrival**: 2025-01-10 09:37:47
- **Entry Time**: 2025-01-10 08:51:58

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 68.0 mph (18.4-94.4 mph range)
- **Heading Variability**: 79.4° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.588 miles
- **Average Distance Before Entry**: 2.553 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #38: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3133](https://helos.maxandbramble.org/flight/3133?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38722fcf`
- **Departure**: 2024-12-22 15:23:36
- **Arrival**: 2024-12-22 16:22:26
- **Entry Time**: 2024-12-22 16:14:34

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 70.5 mph (41.4-124.3 mph range)
- **Heading Variability**: 107.2° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 93 positions at low speed near target
- **Closest Approach Before Entry**: 0.57 miles
- **Average Distance Before Entry**: 1.617 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 93 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #39: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [3155](https://helos.maxandbramble.org/flight/3155?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_386a67ba`
- **Departure**: 2024-12-20 03:34:57
- **Arrival**: 2024-12-20 05:29:28
- **Entry Time**: 2024-12-20 04:36:16

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.1 mph (64.4-123.1 mph range)
- **Heading Variability**: 137.1° standard deviation
- **Large Heading Changes**: 49 changes > 30°
- **Loiter Positions**: 11 positions at low speed near target
- **Closest Approach Before Entry**: 0.518 miles
- **Average Distance Before Entry**: 1.044 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 49 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #40: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3277](https://helos.maxandbramble.org/flight/3277?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_383deafb`
- **Departure**: 2024-12-05 23:06:43
- **Arrival**: 2024-12-06 00:35:17
- **Entry Time**: 2024-12-05 23:28:44

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.1 mph (24.2-145.0 mph range)
- **Heading Variability**: 98.1° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 23 positions at low speed near target
- **Closest Approach Before Entry**: 0.518 miles
- **Average Distance Before Entry**: 2.538 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #41: N624FB - Score 10

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [3442](https://helos.maxandbramble.org/flight/3442?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3815de5b`
- **Departure**: 2024-11-23 02:32:49
- **Arrival**: 2024-11-23 03:33:21
- **Entry Time**: 2024-11-23 03:10:33

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 73.1 mph (56.4-136.9 mph range)
- **Heading Variability**: 111.9° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.756 miles
- **Average Distance Before Entry**: 2.363 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #42: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [318](https://helos.maxandbramble.org/flight/318?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_380ae87f`
- **Departure**: 2024-11-19 18:24:08
- **Arrival**: 2024-11-19 18:53:25
- **Entry Time**: 2024-11-19 18:45:59

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.3 mph (52.9-125.4 mph range)
- **Heading Variability**: 96.6° standard deviation
- **Large Heading Changes**: 16 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.614 miles
- **Average Distance Before Entry**: 2.828 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 16 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #43: N625FB - Score 10

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [3540](https://helos.maxandbramble.org/flight/3540?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37f084f7`
- **Departure**: 2024-11-11 19:00:16
- **Arrival**: 2024-11-11 20:09:42
- **Entry Time**: 2024-11-11 19:14:41

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.7 mph (48.3-135.8 mph range)
- **Heading Variability**: 88.2° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 42 positions at low speed near target
- **Closest Approach Before Entry**: 0.508 miles
- **Average Distance Before Entry**: 1.328 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #44: N625FB - Score 10

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [3581](https://helos.maxandbramble.org/flight/3581?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37e0a9c5`
- **Departure**: 2024-11-07 03:30:28
- **Arrival**: 2024-11-07 05:18:34
- **Entry Time**: 2024-11-07 05:11:40

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 70.2 mph (31.1-128.9 mph range)
- **Heading Variability**: 106.3° standard deviation
- **Large Heading Changes**: 63 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.588 miles
- **Average Distance Before Entry**: 2.36 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 63 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #45: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3730](https://helos.maxandbramble.org/flight/3730?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37a3ba23`
- **Departure**: 2024-10-21 08:03:25
- **Arrival**: 2024-10-21 09:39:02
- **Entry Time**: 2024-10-21 09:28:13

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.9 mph (48.3-136.9 mph range)
- **Heading Variability**: 70.2° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 22 positions at low speed near target
- **Closest Approach Before Entry**: 0.551 miles
- **Average Distance Before Entry**: 2.608 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #46: N625FB - Score 10

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4101](https://helos.maxandbramble.org/flight/4101?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_370ca91c`
- **Departure**: 2024-09-11 05:05:02
- **Arrival**: 2024-09-11 06:42:32
- **Entry Time**: 2024-09-11 05:40:16

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 55.8 mph (41.4-86.3 mph range)
- **Heading Variability**: 83.2° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 41 positions at low speed near target
- **Closest Approach Before Entry**: 0.534 miles
- **Average Distance Before Entry**: 1.833 miles

**Pattern Analysis:**
⚠️ **Extensive hovering** - Very low average speed suggests prolonged hovering
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #47: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4176](https://helos.maxandbramble.org/flight/4176?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36eb209c`
- **Departure**: 2024-09-02 07:58:46
- **Arrival**: 2024-09-02 09:34:42
- **Entry Time**: 2024-09-02 08:23:50

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 85.4 mph (57.5-146.1 mph range)
- **Heading Variability**: 108.1° standard deviation
- **Large Heading Changes**: 46 changes > 30°
- **Loiter Positions**: 27 positions at low speed near target
- **Closest Approach Before Entry**: 0.56 miles
- **Average Distance Before Entry**: 1.136 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 46 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #48: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4250](https://helos.maxandbramble.org/flight/4250?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36cbff49`
- **Departure**: 2024-08-25 03:25:51
- **Arrival**: 2024-08-25 05:06:00
- **Entry Time**: 2024-08-25 04:57:11

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 72.4 mph (56.4-115.1 mph range)
- **Heading Variability**: 109.8° standard deviation
- **Large Heading Changes**: 3 changes > 30°
- **Loiter Positions**: 43 positions at low speed near target
- **Closest Approach Before Entry**: 0.559 miles
- **Average Distance Before Entry**: 1.656 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #49: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4251](https://helos.maxandbramble.org/flight/4251?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36cbdc04`
- **Departure**: 2024-08-25 02:03:04
- **Arrival**: 2024-08-25 03:31:59
- **Entry Time**: 2024-08-25 03:08:52

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 73.5 mph (52.9-135.8 mph range)
- **Heading Variability**: 109.4° standard deviation
- **Large Heading Changes**: 46 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.708 miles
- **Average Distance Before Entry**: 2.732 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 46 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #50: N624FB - Score 10

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [4393](https://helos.maxandbramble.org/flight/4393?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_368bf4f0`
- **Departure**: 2024-08-09 00:46:10
- **Arrival**: 2024-08-09 02:45:43
- **Entry Time**: 2024-08-09 01:59:31

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 72.0 mph (36.8-97.8 mph range)
- **Heading Variability**: 78.3° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 9 positions at low speed near target
- **Closest Approach Before Entry**: 0.512 miles
- **Average Distance Before Entry**: 2.353 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #51: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4538](https://helos.maxandbramble.org/flight/4538?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_364a5113`
- **Departure**: 2024-07-23 15:31:57
- **Arrival**: 2024-07-23 17:01:47
- **Entry Time**: 2024-07-23 16:12:46

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 69.6 mph (56.4-95.5 mph range)
- **Heading Variability**: 106.8° standard deviation
- **Large Heading Changes**: 68 changes > 30°
- **Loiter Positions**: 52 positions at low speed near target
- **Closest Approach Before Entry**: 0.5 miles
- **Average Distance Before Entry**: 1.765 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 68 major heading changes in 5 minutes
⚠️ **Significant loitering** - 52 seconds near target area

---

### Flight #52: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4658](https://helos.maxandbramble.org/flight/4658?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36054c21`
- **Departure**: 2024-07-06 17:44:38
- **Arrival**: 2024-07-06 18:32:58
- **Entry Time**: 2024-07-06 17:48:14

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 73.9 mph (48.3-147.3 mph range)
- **Heading Variability**: 76.1° standard deviation
- **Large Heading Changes**: 11 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.673 miles
- **Average Distance Before Entry**: 3.113 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 11 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #53: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4790](https://helos.maxandbramble.org/flight/4790?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35cb3204`
- **Departure**: 2024-06-22 02:01:57
- **Arrival**: 2024-06-22 03:00:33
- **Entry Time**: 2024-06-22 02:15:07

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.2 mph (54.1-127.7 mph range)
- **Heading Variability**: 126.9° standard deviation
- **Large Heading Changes**: 3 changes > 30°
- **Loiter Positions**: 51 positions at low speed near target
- **Closest Approach Before Entry**: 0.554 miles
- **Average Distance Before Entry**: 1.242 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 51 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #54: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4969](https://helos.maxandbramble.org/flight/4969?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_357957c0`
- **Departure**: 2024-06-01 03:35:12
- **Arrival**: 2024-06-01 05:06:23
- **Entry Time**: 2024-06-01 04:58:58

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.6 mph (57.5-127.7 mph range)
- **Heading Variability**: 104.8° standard deviation
- **Large Heading Changes**: 42 changes > 30°
- **Loiter Positions**: 25 positions at low speed near target
- **Closest Approach Before Entry**: 0.521 miles
- **Average Distance Before Entry**: 1.552 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 42 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #55: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5012](https://helos.maxandbramble.org/flight/5012?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3565b7e4`
- **Departure**: 2024-05-27 00:39:53
- **Arrival**: 2024-05-27 02:13:12
- **Entry Time**: 2024-05-27 01:00:35

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 68.1 mph (41.4-143.8 mph range)
- **Heading Variability**: 110.0° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.745 miles
- **Average Distance Before Entry**: 2.127 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #56: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5061](https://helos.maxandbramble.org/flight/5061?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_354e3f9c`
- **Departure**: 2024-05-20 18:44:58
- **Arrival**: 2024-05-20 19:45:41
- **Entry Time**: 2024-05-20 19:29:47

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 64.7 mph (49.5-79.4 mph range)
- **Heading Variability**: 117.6° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 59 positions at low speed near target
- **Closest Approach Before Entry**: 0.524 miles
- **Average Distance Before Entry**: 0.993 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 59 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #57: N623FB - Score 10

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [5168](https://helos.maxandbramble.org/flight/5168?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3521a21f`
- **Departure**: 2024-05-09 06:34:00
- **Arrival**: 2024-05-09 08:24:24
- **Entry Time**: 2024-05-09 08:17:19

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 69.7 mph (42.6-128.9 mph range)
- **Heading Variability**: 104.7° standard deviation
- **Large Heading Changes**: 18 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.631 miles
- **Average Distance Before Entry**: 2.403 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 18 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #58: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5202](https://helos.maxandbramble.org/flight/5202?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35192c53`
- **Departure**: 2024-05-07 03:33:52
- **Arrival**: 2024-05-07 05:10:40
- **Entry Time**: 2024-05-07 04:13:13

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.9 mph (52.9-140.4 mph range)
- **Heading Variability**: 122.4° standard deviation
- **Large Heading Changes**: 27 changes > 30°
- **Loiter Positions**: 44 positions at low speed near target
- **Closest Approach Before Entry**: 0.543 miles
- **Average Distance Before Entry**: 0.874 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 27 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #59: N621FB - Score 10

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5519](https://helos.maxandbramble.org/flight/5519?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3493bbd9`
- **Departure**: 2024-03-31 04:58:32
- **Arrival**: 2024-03-31 06:30:42
- **Entry Time**: 2024-03-31 05:13:47

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.5 mph (57.5-100.1 mph range)
- **Heading Variability**: 83.1° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 25 positions at low speed near target
- **Closest Approach Before Entry**: 0.547 miles
- **Average Distance Before Entry**: 1.214 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #60: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5588](https://helos.maxandbramble.org/flight/5588?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3482bef2`
- **Departure**: 2024-03-26 02:21:53
- **Arrival**: 2024-03-26 03:42:32
- **Entry Time**: 2024-03-26 02:41:40

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 64.7 mph (51.8-90.9 mph range)
- **Heading Variability**: 117.6° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 72 positions at low speed near target
- **Closest Approach Before Entry**: 0.542 miles
- **Average Distance Before Entry**: 1.421 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 72 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #61: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5612](https://helos.maxandbramble.org/flight/5612?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34794f0a`
- **Departure**: 2024-03-22 22:53:34
- **Arrival**: 2024-03-23 00:43:10
- **Entry Time**: 2024-03-22 23:35:16

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.6 mph (57.5-82.9 mph range)
- **Heading Variability**: 97.4° standard deviation
- **Large Heading Changes**: 18 changes > 30°
- **Loiter Positions**: 6 positions at low speed near target
- **Closest Approach Before Entry**: 0.538 miles
- **Average Distance Before Entry**: 1.757 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 18 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #62: N624FB - Score 10

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [263](https://helos.maxandbramble.org/flight/263?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3414089e`
- **Departure**: 2024-02-21 03:31:11
- **Arrival**: 2024-02-21 04:30:43
- **Entry Time**: 2024-02-21 03:52:20

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 74.2 mph (54.1-97.8 mph range)
- **Heading Variability**: 85.8° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.538 miles
- **Average Distance Before Entry**: 2.222 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #63: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [216](https://helos.maxandbramble.org/flight/216?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33b4fe8e`
- **Departure**: 2024-01-22 03:34:08
- **Arrival**: 2024-01-22 04:35:38
- **Entry Time**: 2024-01-22 03:46:56

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 69.9 mph (55.2-100.1 mph range)
- **Heading Variability**: 94.5° standard deviation
- **Large Heading Changes**: 27 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.56 miles
- **Average Distance Before Entry**: 3.191 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 27 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #64: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6006](https://helos.maxandbramble.org/flight/6006?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33adb9f4`
- **Departure**: 2024-01-19 15:49:22
- **Arrival**: 2024-01-19 16:55:18
- **Entry Time**: 2024-01-19 16:48:04

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.6 mph (51.8-128.9 mph range)
- **Heading Variability**: 112.7° standard deviation
- **Large Heading Changes**: 42 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.558 miles
- **Average Distance Before Entry**: 2.573 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 42 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #65: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6336](https://helos.maxandbramble.org/flight/6336?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3319ccc9`
- **Departure**: 2023-12-05 18:31:29
- **Arrival**: 2023-12-05 19:46:29
- **Entry Time**: 2023-12-05 19:12:39

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 66.5 mph (52.9-82.9 mph range)
- **Heading Variability**: 82.0° standard deviation
- **Large Heading Changes**: 19 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.594 miles
- **Average Distance Before Entry**: 2.499 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 19 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #66: N624FB - Score 10

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [6459](https://helos.maxandbramble.org/flight/6459?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_32ce5efa`
- **Departure**: 2023-11-12 15:03:05
- **Arrival**: 2023-11-12 16:05:36
- **Entry Time**: 2023-11-12 15:54:21

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 66.9 mph (41.4-92.1 mph range)
- **Heading Variability**: 105.4° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 55 positions at low speed near target
- **Closest Approach Before Entry**: 0.521 miles
- **Average Distance Before Entry**: 1.214 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 55 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #67: N622FB - Score 10

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6460](https://helos.maxandbramble.org/flight/6460?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_32cc046e`
- **Departure**: 2023-11-11 18:05:43
- **Arrival**: 2023-11-11 19:19:25
- **Entry Time**: 2023-11-11 18:18:05

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.5 mph (63.3-141.5 mph range)
- **Heading Variability**: 95.6° standard deviation
- **Large Heading Changes**: 36 changes > 30°
- **Loiter Positions**: 39 positions at low speed near target
- **Closest Approach Before Entry**: 0.533 miles
- **Average Distance Before Entry**: 0.948 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 36 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #68: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3383](https://helos.maxandbramble.org/flight/3383?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3cbe54ca`
- **Departure**: 2025-10-20 06:30:08
- **Arrival**: 2025-10-20 08:05:33
- **Entry Time**: 2025-10-20 07:02:53

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.7 mph (55.2-101.3 mph range)
- **Heading Variability**: 88.5° standard deviation
- **Large Heading Changes**: 43 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.526 miles
- **Average Distance Before Entry**: 2.652 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 43 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #69: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3395](https://helos.maxandbramble.org/flight/3395?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3cba7438`
- **Departure**: 2025-10-19 02:06:11
- **Arrival**: 2025-10-19 03:45:40
- **Entry Time**: 2025-10-19 02:26:05

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.8 mph (12.7-153.1 mph range)
- **Heading Variability**: 112.5° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.654 miles
- **Average Distance Before Entry**: 2.74 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #70: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3396](https://helos.maxandbramble.org/flight/3396?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3cba044e`
- **Departure**: 2025-10-18 22:49:34
- **Arrival**: 2025-10-19 00:14:01
- **Entry Time**: 2025-10-18 23:41:45

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.7 mph (36.8-97.8 mph range)
- **Heading Variability**: 89.5° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.532 miles
- **Average Distance Before Entry**: 2.221 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #71: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [78](https://helos.maxandbramble.org/flight/78?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3ca03b9c`
- **Departure**: 2025-10-12 08:03:06
- **Arrival**: 2025-10-12 08:40:57
- **Entry Time**: 2025-10-12 08:45:54

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 85.0 mph (66.7-141.5 mph range)
- **Heading Variability**: 121.7° standard deviation
- **Large Heading Changes**: 72 changes > 30°
- **Loiter Positions**: 3 positions at low speed near target
- **Closest Approach Before Entry**: 0.507 miles
- **Average Distance Before Entry**: 1.639 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 72 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #72: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [515](https://helos.maxandbramble.org/flight/515?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3c4ab7d9`
- **Departure**: 2025-09-20 03:35:08
- **Arrival**: 2025-09-20 04:18:35
- **Entry Time**: 2025-09-20 04:35:13

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 80.6 mph (52.9-120.8 mph range)
- **Heading Variability**: 88.1° standard deviation
- **Large Heading Changes**: 19 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.503 miles
- **Average Distance Before Entry**: 3.019 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 19 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #73: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [576](https://helos.maxandbramble.org/flight/576?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3c2f165b`
- **Departure**: 2025-09-13 03:33:10
- **Arrival**: 2025-09-13 04:18:21
- **Entry Time**: 2025-09-13 03:59:44

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 85.6 mph (49.5-138.1 mph range)
- **Heading Variability**: 90.5° standard deviation
- **Large Heading Changes**: 35 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.513 miles
- **Average Distance Before Entry**: 2.253 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 35 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #74: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [654](https://helos.maxandbramble.org/flight/654?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3c0da822`
- **Departure**: 2025-09-04 18:07:13
- **Arrival**: 2025-09-04 19:06:33
- **Entry Time**: 2025-09-04 19:30:26

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.9 mph (32.2-134.6 mph range)
- **Heading Variability**: 76.7° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.662 miles
- **Average Distance Before Entry**: 4.723 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #75: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [690](https://helos.maxandbramble.org/flight/690?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3bfc9782`
- **Departure**: 2025-08-31 03:31:49
- **Arrival**: 2025-08-31 04:16:18
- **Entry Time**: 2025-08-31 03:44:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.0 mph (39.1-135.8 mph range)
- **Heading Variability**: 104.9° standard deviation
- **Large Heading Changes**: 15 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.676 miles
- **Average Distance Before Entry**: 2.741 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 15 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #76: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [729](https://helos.maxandbramble.org/flight/729?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3be94a69`
- **Departure**: 2025-08-26 06:32:40
- **Arrival**: 2025-08-26 08:04:18
- **Entry Time**: 2025-08-26 07:02:11

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.5 mph (42.6-117.4 mph range)
- **Heading Variability**: 80.0° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.583 miles
- **Average Distance Before Entry**: 3.739 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #77: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [412](https://helos.maxandbramble.org/flight/412?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3bd0b5d4`
- **Departure**: 2025-08-19 23:03:36
- **Arrival**: 2025-08-20 00:28:58
- **Entry Time**: 2025-08-20 00:20:48

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 87.5 mph (65.6-105.9 mph range)
- **Heading Variability**: 72.2° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.552 miles
- **Average Distance Before Entry**: 3.011 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #78: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [814](https://helos.maxandbramble.org/flight/814?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3bc156c4`
- **Departure**: 2025-08-15 22:47:15
- **Arrival**: 2025-08-16 00:02:39
- **Entry Time**: 2025-08-15 23:13:26

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 67.2 mph (57.5-78.3 mph range)
- **Heading Variability**: 127.5° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 94 positions at low speed near target
- **Closest Approach Before Entry**: 0.509 miles
- **Average Distance Before Entry**: 0.815 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 94 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #79: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [929](https://helos.maxandbramble.org/flight/929?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b89ca1e`
- **Departure**: 2025-08-02 07:42:01
- **Arrival**: 2025-08-02 08:02:56
- **Entry Time**: 2025-08-02 07:53:34

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.1 mph (41.4-156.5 mph range)
- **Heading Variability**: 115.6° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 70 positions at low speed near target
- **Closest Approach Before Entry**: 0.525 miles
- **Average Distance Before Entry**: 1.367 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 70 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #80: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [930](https://helos.maxandbramble.org/flight/930?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b89a8a2`
- **Departure**: 2025-08-02 06:31:30
- **Arrival**: 2025-08-02 07:40:27
- **Entry Time**: 2025-08-02 07:22:39

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 61.2 mph (43.7-99.0 mph range)
- **Heading Variability**: 104.5° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 57 positions at low speed near target
- **Closest Approach Before Entry**: 0.537 miles
- **Average Distance Before Entry**: 1.85 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 57 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #81: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [993](https://helos.maxandbramble.org/flight/993?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b6e19b7`
- **Departure**: 2025-07-26 06:32:22
- **Arrival**: 2025-07-26 08:10:46
- **Entry Time**: 2025-07-26 07:43:20

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 92.1 mph (52.9-142.7 mph range)
- **Heading Variability**: 76.0° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 30 positions at low speed near target
- **Closest Approach Before Entry**: 0.526 miles
- **Average Distance Before Entry**: 2.355 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #82: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [1023](https://helos.maxandbramble.org/flight/1023?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b635c49`
- **Departure**: 2025-07-23 15:14:40
- **Arrival**: 2025-07-23 16:09:52
- **Entry Time**: 2025-07-23 15:59:57

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.9 mph (49.5-102.4 mph range)
- **Heading Variability**: 79.4° standard deviation
- **Large Heading Changes**: 19 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.676 miles
- **Average Distance Before Entry**: 2.208 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 19 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #83: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [1064](https://helos.maxandbramble.org/flight/1064?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b54ac2d`
- **Departure**: 2025-07-19 17:22:39
- **Arrival**: 2025-07-19 18:16:21
- **Entry Time**: 2025-07-19 18:00:01

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.9 mph (10.4-124.3 mph range)
- **Heading Variability**: 107.2° standard deviation
- **Large Heading Changes**: 3 changes > 30°
- **Loiter Positions**: 28 positions at low speed near target
- **Closest Approach Before Entry**: 0.502 miles
- **Average Distance Before Entry**: 1.334 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #84: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [1117](https://helos.maxandbramble.org/flight/1117?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b3e6e7d`
- **Departure**: 2025-07-14 05:01:03
- **Arrival**: 2025-07-14 06:37:06
- **Entry Time**: 2025-07-14 05:23:10

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 85.6 mph (61.0-105.9 mph range)
- **Heading Variability**: 98.4° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.563 miles
- **Average Distance Before Entry**: 3.233 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #85: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [1119](https://helos.maxandbramble.org/flight/1119?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b3e1686`
- **Departure**: 2025-07-14 02:02:41
- **Arrival**: 2025-07-14 03:40:17
- **Entry Time**: 2025-07-14 02:32:30

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.6 mph (40.3-146.1 mph range)
- **Heading Variability**: 84.8° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 22 positions at low speed near target
- **Closest Approach Before Entry**: 0.501 miles
- **Average Distance Before Entry**: 1.759 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #86: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1131](https://helos.maxandbramble.org/flight/1131?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3b3988a7`
- **Departure**: 2025-07-12 18:13:40
- **Arrival**: 2025-07-12 19:03:40
- **Entry Time**: 2025-07-12 18:35:37

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.8 mph (56.4-101.3 mph range)
- **Heading Variability**: 76.0° standard deviation
- **Large Heading Changes**: 17 changes > 30°
- **Loiter Positions**: 15 positions at low speed near target
- **Closest Approach Before Entry**: 0.525 miles
- **Average Distance Before Entry**: 1.824 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 17 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #87: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [1356](https://helos.maxandbramble.org/flight/1356?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3ae05b59`
- **Departure**: 2025-06-19 18:13:47
- **Arrival**: 2025-06-19 19:09:32
- **Entry Time**: 2025-06-19 18:52:34

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.2 mph (56.4-117.4 mph range)
- **Heading Variability**: 63.8° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 18 positions at low speed near target
- **Closest Approach Before Entry**: 0.511 miles
- **Average Distance Before Entry**: 2.632 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #88: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [1358](https://helos.maxandbramble.org/flight/1358?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3adfa9b1`
- **Departure**: 2025-06-19 15:05:09
- **Arrival**: 2025-06-19 16:00:54
- **Entry Time**: 2025-06-19 15:51:54

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.5 mph (44.9-122.0 mph range)
- **Heading Variability**: 122.7° standard deviation
- **Large Heading Changes**: 12 changes > 30°
- **Loiter Positions**: 16 positions at low speed near target
- **Closest Approach Before Entry**: 0.663 miles
- **Average Distance Before Entry**: 1.853 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 12 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #89: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1549](https://helos.maxandbramble.org/flight/1549?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a97c5ff`
- **Departure**: 2025-06-01 02:06:27
- **Arrival**: 2025-06-01 03:33:16
- **Entry Time**: 2025-06-01 03:15:28

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 80.6 mph (36.8-153.1 mph range)
- **Heading Variability**: 138.3° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.54 miles
- **Average Distance Before Entry**: 2.712 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #90: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [1672](https://helos.maxandbramble.org/flight/1672?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a624a1e`
- **Departure**: 2025-05-18 02:00:04
- **Arrival**: 2025-05-18 03:38:26
- **Entry Time**: 2025-05-18 03:07:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 71.9 mph (29.9-128.9 mph range)
- **Heading Variability**: 98.5° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.547 miles
- **Average Distance Before Entry**: 2.623 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #91: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1782](https://helos.maxandbramble.org/flight/1782?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a2e8958`
- **Departure**: 2025-05-04 08:05:14
- **Arrival**: 2025-05-04 09:38:59
- **Entry Time**: 2025-05-04 09:06:02

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.4 mph (59.8-100.1 mph range)
- **Heading Variability**: 78.7° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.539 miles
- **Average Distance Before Entry**: 3.015 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #92: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1784](https://helos.maxandbramble.org/flight/1784?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a2e3344`
- **Departure**: 2025-05-04 05:01:12
- **Arrival**: 2025-05-04 06:41:17
- **Entry Time**: 2025-05-04 06:03:55

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.5 mph (62.1-134.6 mph range)
- **Heading Variability**: 89.4° standard deviation
- **Large Heading Changes**: 12 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.53 miles
- **Average Distance Before Entry**: 2.67 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 12 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #93: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [1847](https://helos.maxandbramble.org/flight/1847?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3a137666`
- **Departure**: 2025-04-27 05:01:10
- **Arrival**: 2025-04-27 06:34:21
- **Entry Time**: 2025-04-27 06:09:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.1 mph (41.4-104.7 mph range)
- **Heading Variability**: 95.2° standard deviation
- **Large Heading Changes**: 27 changes > 30°
- **Loiter Positions**: 4 positions at low speed near target
- **Closest Approach Before Entry**: 0.535 miles
- **Average Distance Before Entry**: 1.486 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 27 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #94: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [1951](https://helos.maxandbramble.org/flight/1951?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39ee069d`
- **Departure**: 2025-04-17 03:30:31
- **Arrival**: 2025-04-17 05:06:30
- **Entry Time**: 2025-04-17 04:29:33

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 65.0 mph (39.1-100.1 mph range)
- **Heading Variability**: 72.6° standard deviation
- **Large Heading Changes**: 2 changes > 30°
- **Loiter Positions**: 30 positions at low speed near target
- **Closest Approach Before Entry**: 0.509 miles
- **Average Distance Before Entry**: 1.979 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #95: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [1986](https://helos.maxandbramble.org/flight/1986?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39e28ae5`
- **Departure**: 2025-04-14 03:34:18
- **Arrival**: 2025-04-14 05:12:05
- **Entry Time**: 2025-04-14 04:10:06

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.8 mph (44.9-153.1 mph range)
- **Heading Variability**: 81.9° standard deviation
- **Large Heading Changes**: 23 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.516 miles
- **Average Distance Before Entry**: 2.63 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 23 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #96: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [1993](https://helos.maxandbramble.org/flight/1993?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39df4be2`
- **Departure**: 2025-04-13 05:02:10
- **Arrival**: 2025-04-13 06:34:43
- **Entry Time**: 2025-04-13 06:09:35

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 88.3 mph (54.1-130.0 mph range)
- **Heading Variability**: 93.5° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.652 miles
- **Average Distance Before Entry**: 3.321 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #97: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [2002](https://helos.maxandbramble.org/flight/2002?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39dbcf99`
- **Departure**: 2025-04-12 05:01:35
- **Arrival**: 2025-04-12 06:36:53
- **Entry Time**: 2025-04-12 06:20:46

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 89.6 mph (49.5-135.8 mph range)
- **Heading Variability**: 72.8° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.536 miles
- **Average Distance Before Entry**: 3.777 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #98: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [2062](https://helos.maxandbramble.org/flight/2062?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39c15fa3`
- **Departure**: 2025-04-05 03:32:21
- **Arrival**: 2025-04-05 04:59:31
- **Entry Time**: 2025-04-05 04:20:01

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 66.2 mph (48.3-100.1 mph range)
- **Heading Variability**: 135.6° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 86 positions at low speed near target
- **Closest Approach Before Entry**: 0.592 miles
- **Average Distance Before Entry**: 1.376 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 86 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #99: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2086](https://helos.maxandbramble.org/flight/2086?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39ba0d3d`
- **Departure**: 2025-04-03 03:31:52
- **Arrival**: 2025-04-03 05:01:29
- **Entry Time**: 2025-04-03 04:29:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.3 mph (43.7-130.0 mph range)
- **Heading Variability**: 113.9° standard deviation
- **Large Heading Changes**: 2 changes > 30°
- **Loiter Positions**: 60 positions at low speed near target
- **Closest Approach Before Entry**: 0.515 miles
- **Average Distance Before Entry**: 1.158 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 60 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #100: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [2092](https://helos.maxandbramble.org/flight/2092?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39b67aa5`
- **Departure**: 2025-04-02 02:04:33
- **Arrival**: 2025-04-02 03:35:25
- **Entry Time**: 2025-04-02 02:55:30

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 88.3 mph (54.1-115.1 mph range)
- **Heading Variability**: 83.3° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 10 positions at low speed near target
- **Closest Approach Before Entry**: 0.506 miles
- **Average Distance Before Entry**: 2.55 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #101: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2124](https://helos.maxandbramble.org/flight/2124?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39a69f40`
- **Departure**: 2025-03-28 03:29:23
- **Arrival**: 2025-03-28 04:09:42
- **Entry Time**: 2025-03-28 04:50:50

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 68.1 mph (33.4-115.1 mph range)
- **Heading Variability**: 94.0° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 77 positions at low speed near target
- **Closest Approach Before Entry**: 0.532 miles
- **Average Distance Before Entry**: 1.215 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 77 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #102: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [2184](https://helos.maxandbramble.org/flight/2184?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_398f3d24`
- **Departure**: 2025-03-21 08:04:01
- **Arrival**: 2025-03-21 09:28:23
- **Entry Time**: 2025-03-21 08:37:34

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 89.8 mph (35.7-142.7 mph range)
- **Heading Variability**: 87.4° standard deviation
- **Large Heading Changes**: 18 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.549 miles
- **Average Distance Before Entry**: 3.194 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 18 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #103: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2300](https://helos.maxandbramble.org/flight/2300?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_396b463e`
- **Departure**: 2025-03-10 05:00:11
- **Arrival**: 2025-03-10 06:45:52
- **Entry Time**: 2025-03-10 05:15:40

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.7 mph (26.5-141.5 mph range)
- **Heading Variability**: 87.0° standard deviation
- **Large Heading Changes**: 14 changes > 30°
- **Loiter Positions**: 16 positions at low speed near target
- **Closest Approach Before Entry**: 0.539 miles
- **Average Distance Before Entry**: 2.331 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 14 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #104: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2315](https://helos.maxandbramble.org/flight/2315?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_39656985`
- **Departure**: 2025-03-08 08:01:34
- **Arrival**: 2025-03-08 09:29:01
- **Entry Time**: 2025-03-08 08:31:09

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.8 mph (63.3-107.0 mph range)
- **Heading Variability**: 104.8° standard deviation
- **Large Heading Changes**: 19 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.501 miles
- **Average Distance Before Entry**: 2.659 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 19 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #105: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2729](https://helos.maxandbramble.org/flight/2729?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38f47cd3`
- **Departure**: 2025-02-01 03:32:27
- **Arrival**: 2025-02-01 04:55:19
- **Entry Time**: 2025-02-01 04:07:04

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.6 mph (49.5-95.5 mph range)
- **Heading Variability**: 68.1° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 19 positions at low speed near target
- **Closest Approach Before Entry**: 0.519 miles
- **Average Distance Before Entry**: 2.05 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #106: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [2836](https://helos.maxandbramble.org/flight/2836?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38d3d24d`
- **Departure**: 2025-01-22 17:57:59
- **Arrival**: 2025-01-22 19:03:39
- **Entry Time**: 2025-01-22 18:18:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.2 mph (64.4-104.7 mph range)
- **Heading Variability**: 72.1° standard deviation
- **Large Heading Changes**: 21 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.514 miles
- **Average Distance Before Entry**: 3.364 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 21 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #107: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [2888](https://helos.maxandbramble.org/flight/2888?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38c25959`
- **Departure**: 2025-01-17 06:33:11
- **Arrival**: 2025-01-17 08:15:45
- **Entry Time**: 2025-01-17 07:05:23

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 87.6 mph (58.7-102.4 mph range)
- **Heading Variability**: 92.2° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.57 miles
- **Average Distance Before Entry**: 2.547 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #108: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3028](https://helos.maxandbramble.org/flight/3028?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38937a19`
- **Departure**: 2025-01-03 02:01:26
- **Arrival**: 2025-01-03 03:50:38
- **Entry Time**: 2025-01-03 03:04:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 89.4 mph (49.5-148.5 mph range)
- **Heading Variability**: 78.5° standard deviation
- **Large Heading Changes**: 31 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.545 miles
- **Average Distance Before Entry**: 4.347 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 31 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #109: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3093](https://helos.maxandbramble.org/flight/3093?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_387e21fb`
- **Departure**: 2024-12-26 22:58:58
- **Arrival**: 2024-12-27 00:26:08
- **Entry Time**: 2024-12-26 23:58:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.4 mph (31.1-124.3 mph range)
- **Heading Variability**: 91.7° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.56 miles
- **Average Distance Before Entry**: 2.49 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #110: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [3144](https://helos.maxandbramble.org/flight/3144?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_386e3b54`
- **Departure**: 2024-12-21 08:05:15
- **Arrival**: 2024-12-21 09:09:20
- **Entry Time**: 2024-12-21 08:56:23

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 91.0 mph (57.5-147.3 mph range)
- **Heading Variability**: 81.3° standard deviation
- **Large Heading Changes**: 38 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.645 miles
- **Average Distance Before Entry**: 4.102 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 38 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #111: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3363](https://helos.maxandbramble.org/flight/3363?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_381eb6c7`
- **Departure**: 2024-11-25 23:24:26
- **Arrival**: 2024-11-26 00:49:15
- **Entry Time**: 2024-11-26 00:40:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.4 mph (64.4-117.4 mph range)
- **Heading Variability**: 131.5° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 19 positions at low speed near target
- **Closest Approach Before Entry**: 0.506 miles
- **Average Distance Before Entry**: 1.072 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #112: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [3367](https://helos.maxandbramble.org/flight/3367?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_381c2df4`
- **Departure**: 2024-11-25 06:30:44
- **Arrival**: 2024-11-25 08:15:36
- **Entry Time**: 2024-11-25 06:45:46

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.1 mph (62.1-115.1 mph range)
- **Heading Variability**: 90.7° standard deviation
- **Large Heading Changes**: 23 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.503 miles
- **Average Distance Before Entry**: 3.181 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 23 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #113: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3429](https://helos.maxandbramble.org/flight/3429?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_38192d66`
- **Departure**: 2024-11-24 06:31:38
- **Arrival**: 2024-11-24 08:05:41
- **Entry Time**: 2024-11-24 07:32:26

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.9 mph (61.0-93.2 mph range)
- **Heading Variability**: 97.6° standard deviation
- **Large Heading Changes**: 19 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.523 miles
- **Average Distance Before Entry**: 2.336 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 19 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #114: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [3553](https://helos.maxandbramble.org/flight/3553?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37eb41a8`
- **Departure**: 2024-11-10 03:29:27
- **Arrival**: 2024-11-10 05:08:26
- **Entry Time**: 2024-11-10 04:54:42

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.7 mph (63.3-111.6 mph range)
- **Heading Variability**: 93.8° standard deviation
- **Large Heading Changes**: 16 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.546 miles
- **Average Distance Before Entry**: 2.387 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 16 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #115: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [3575](https://helos.maxandbramble.org/flight/3575?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37e31742`
- **Departure**: 2024-11-07 20:08:03
- **Arrival**: 2024-11-07 21:44:06
- **Entry Time**: 2024-11-07 21:36:44

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 85.6 mph (67.9-134.6 mph range)
- **Heading Variability**: 85.9° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 1 positions at low speed near target
- **Closest Approach Before Entry**: 0.506 miles
- **Average Distance Before Entry**: 2.05 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #116: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [3592](https://helos.maxandbramble.org/flight/3592?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37dca15b`
- **Departure**: 2024-11-05 22:33:39
- **Arrival**: 2024-11-06 00:03:15
- **Entry Time**: 2024-11-05 23:35:46

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.1 mph (66.7-111.6 mph range)
- **Heading Variability**: 118.7° standard deviation
- **Large Heading Changes**: 37 changes > 30°
- **Loiter Positions**: 1 positions at low speed near target
- **Closest Approach Before Entry**: 0.552 miles
- **Average Distance Before Entry**: 1.067 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 37 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #117: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [3664](https://helos.maxandbramble.org/flight/3664?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37c46832`
- **Departure**: 2024-10-29 19:33:09
- **Arrival**: 2024-10-29 20:36:51
- **Entry Time**: 2024-10-29 20:14:37

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.6 mph (55.2-110.5 mph range)
- **Heading Variability**: 79.0° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.528 miles
- **Average Distance Before Entry**: 2.82 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #118: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [3692](https://helos.maxandbramble.org/flight/3692?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37b7a781`
- **Departure**: 2024-10-26 06:30:06
- **Arrival**: 2024-10-26 08:13:49
- **Entry Time**: 2024-10-26 06:55:53

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.0 mph (59.8-109.3 mph range)
- **Heading Variability**: 96.1° standard deviation
- **Large Heading Changes**: 33 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.648 miles
- **Average Distance Before Entry**: 3.359 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 33 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #119: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3703](https://helos.maxandbramble.org/flight/3703?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37b2b1bd`
- **Departure**: 2024-10-24 23:25:20
- **Arrival**: 2024-10-25 01:00:46
- **Entry Time**: 2024-10-25 00:42:52

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.7 mph (55.2-97.8 mph range)
- **Heading Variability**: 86.8° standard deviation
- **Large Heading Changes**: 19 changes > 30°
- **Loiter Positions**: 1 positions at low speed near target
- **Closest Approach Before Entry**: 0.512 miles
- **Average Distance Before Entry**: 1.467 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 19 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #120: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3743](https://helos.maxandbramble.org/flight/3743?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_379f6a18`
- **Departure**: 2024-10-20 01:25:16
- **Arrival**: 2024-10-20 03:03:59
- **Entry Time**: 2024-10-20 02:22:50

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.0 mph (56.4-141.5 mph range)
- **Heading Variability**: 107.3° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.613 miles
- **Average Distance Before Entry**: 2.822 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #121: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [3775](https://helos.maxandbramble.org/flight/3775?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3792aa5f`
- **Departure**: 2024-10-16 18:10:53
- **Arrival**: 2024-10-16 19:43:33
- **Entry Time**: 2024-10-16 18:21:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.0 mph (32.2-112.8 mph range)
- **Heading Variability**: 62.6° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.515 miles
- **Average Distance Before Entry**: 3.35 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #122: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3802](https://helos.maxandbramble.org/flight/3802?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_378861be`
- **Departure**: 2024-10-13 23:04:50
- **Arrival**: 2024-10-14 00:32:28
- **Entry Time**: 2024-10-13 23:56:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 88.7 mph (65.6-120.8 mph range)
- **Heading Variability**: 86.7° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.504 miles
- **Average Distance Before Entry**: 2.699 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #123: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3884](https://helos.maxandbramble.org/flight/3884?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_376a7da5`
- **Departure**: 2024-10-05 23:35:25
- **Arrival**: 2024-10-06 00:29:23
- **Entry Time**: 2024-10-06 00:09:40

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.5 mph (48.3-97.8 mph range)
- **Heading Variability**: 85.1° standard deviation
- **Large Heading Changes**: 16 changes > 30°
- **Loiter Positions**: 4 positions at low speed near target
- **Closest Approach Before Entry**: 0.533 miles
- **Average Distance Before Entry**: 1.944 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 16 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #124: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3899](https://helos.maxandbramble.org/flight/3899?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37629897`
- **Departure**: 2024-10-03 23:05:29
- **Arrival**: 2024-10-04 00:28:49
- **Entry Time**: 2024-10-03 23:55:35

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.1 mph (61.0-122.0 mph range)
- **Heading Variability**: 125.2° standard deviation
- **Large Heading Changes**: 25 changes > 30°
- **Loiter Positions**: 10 positions at low speed near target
- **Closest Approach Before Entry**: 0.604 miles
- **Average Distance Before Entry**: 1.527 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 25 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #125: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3957](https://helos.maxandbramble.org/flight/3957?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_37495780`
- **Departure**: 2024-09-27 08:02:08
- **Arrival**: 2024-09-27 10:20:24
- **Entry Time**: 2024-09-27 09:05:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 80.6 mph (38.0-120.8 mph range)
- **Heading Variability**: 88.0° standard deviation
- **Large Heading Changes**: 50 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.567 miles
- **Average Distance Before Entry**: 2.774 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 50 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #126: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [3960](https://helos.maxandbramble.org/flight/3960?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3748d3ef`
- **Departure**: 2024-09-27 03:31:36
- **Arrival**: 2024-09-27 05:09:03
- **Entry Time**: 2024-09-27 03:51:58

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 87.6 mph (64.4-149.6 mph range)
- **Heading Variability**: 87.9° standard deviation
- **Large Heading Changes**: 32 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.519 miles
- **Average Distance Before Entry**: 2.216 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 32 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #127: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3977](https://helos.maxandbramble.org/flight/3977?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_374170eb`
- **Departure**: 2024-09-25 02:18:51
- **Arrival**: 2024-09-25 03:38:24
- **Entry Time**: 2024-09-25 03:15:15

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.6 mph (62.1-97.8 mph range)
- **Heading Variability**: 92.6° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.535 miles
- **Average Distance Before Entry**: 2.713 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #128: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [3994](https://helos.maxandbramble.org/flight/3994?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_373ab496`
- **Departure**: 2024-09-23 07:59:59
- **Arrival**: 2024-09-23 09:53:50
- **Entry Time**: 2024-09-23 09:07:16

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.9 mph (55.2-143.8 mph range)
- **Heading Variability**: 115.5° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.56 miles
- **Average Distance Before Entry**: 2.364 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #129: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4029](https://helos.maxandbramble.org/flight/4029?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_372b07f7`
- **Departure**: 2024-09-19 06:31:58
- **Arrival**: 2024-09-19 08:07:21
- **Entry Time**: 2024-09-19 07:45:18

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 89.5 mph (55.2-163.4 mph range)
- **Heading Variability**: 122.5° standard deviation
- **Large Heading Changes**: 27 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.906 miles
- **Average Distance Before Entry**: 3.271 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 27 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #130: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [4073](https://helos.maxandbramble.org/flight/4073?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3716a81d`
- **Departure**: 2024-09-13 18:03:25
- **Arrival**: 2024-09-13 19:00:14
- **Entry Time**: 2024-09-13 18:17:44

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.0 mph (56.4-107.0 mph range)
- **Heading Variability**: 86.5° standard deviation
- **Large Heading Changes**: 11 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.553 miles
- **Average Distance Before Entry**: 2.223 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 11 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #131: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4082](https://helos.maxandbramble.org/flight/4082?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3713c764`
- **Departure**: 2024-09-13 00:04:40
- **Arrival**: 2024-09-13 01:00:50
- **Entry Time**: 2024-09-13 00:49:30

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.5 mph (36.8-127.7 mph range)
- **Heading Variability**: 69.3° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 1 positions at low speed near target
- **Closest Approach Before Entry**: 0.542 miles
- **Average Distance Before Entry**: 2.838 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #132: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4189](https://helos.maxandbramble.org/flight/4189?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36e7612d`
- **Departure**: 2024-09-01 03:53:07
- **Arrival**: 2024-09-01 05:30:32
- **Entry Time**: 2024-09-01 04:26:38

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 87.0 mph (51.8-117.4 mph range)
- **Heading Variability**: 87.7° standard deviation
- **Large Heading Changes**: 28 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.533 miles
- **Average Distance Before Entry**: 2.289 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 28 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #133: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4226](https://helos.maxandbramble.org/flight/4226?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36d7b739`
- **Departure**: 2024-08-28 03:45:12
- **Arrival**: 2024-08-28 05:37:22
- **Entry Time**: 2024-08-28 04:50:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 89.9 mph (71.3-104.7 mph range)
- **Heading Variability**: 76.2° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.576 miles
- **Average Distance Before Entry**: 3.199 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #134: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4228](https://helos.maxandbramble.org/flight/4228?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36d64873`
- **Departure**: 2024-08-27 18:30:27
- **Arrival**: 2024-08-27 19:27:19
- **Entry Time**: 2024-08-27 19:17:35

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.2 mph (63.3-127.7 mph range)
- **Heading Variability**: 83.2° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.546 miles
- **Average Distance Before Entry**: 2.673 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #135: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [4232](https://helos.maxandbramble.org/flight/4232?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36d40d2a`
- **Departure**: 2024-08-27 06:29:51
- **Arrival**: 2024-08-27 08:09:51
- **Entry Time**: 2024-08-27 07:32:39

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 88.8 mph (35.7-113.9 mph range)
- **Heading Variability**: 84.1° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.523 miles
- **Average Distance Before Entry**: 1.985 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #136: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4317](https://helos.maxandbramble.org/flight/4317?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36acf3a9`
- **Departure**: 2024-08-17 05:26:24
- **Arrival**: 2024-08-17 06:52:16
- **Entry Time**: 2024-08-17 05:56:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.4 mph (57.5-125.4 mph range)
- **Heading Variability**: 110.0° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 26 positions at low speed near target
- **Closest Approach Before Entry**: 0.515 miles
- **Average Distance Before Entry**: 0.861 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #137: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4326](https://helos.maxandbramble.org/flight/4326?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36a87c55`
- **Departure**: 2024-08-16 02:09:33
- **Arrival**: 2024-08-16 03:36:10
- **Entry Time**: 2024-08-16 02:38:03

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.9 mph (58.7-118.5 mph range)
- **Heading Variability**: 82.4° standard deviation
- **Large Heading Changes**: 11 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.544 miles
- **Average Distance Before Entry**: 2.536 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 11 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #138: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4336](https://helos.maxandbramble.org/flight/4336?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36a4d489`
- **Departure**: 2024-08-15 06:30:53
- **Arrival**: 2024-08-15 08:22:25
- **Entry Time**: 2024-08-15 07:34:46

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.0 mph (49.5-113.9 mph range)
- **Heading Variability**: 97.0° standard deviation
- **Large Heading Changes**: 52 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.55 miles
- **Average Distance Before Entry**: 2.249 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 52 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #139: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4349](https://helos.maxandbramble.org/flight/4349?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36a045ad`
- **Departure**: 2024-08-14 03:33:18
- **Arrival**: 2024-08-14 05:11:47
- **Entry Time**: 2024-08-14 04:48:31

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.3 mph (58.7-118.5 mph range)
- **Heading Variability**: 74.0° standard deviation
- **Large Heading Changes**: 21 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.686 miles
- **Average Distance Before Entry**: 4.624 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 21 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #140: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4374](https://helos.maxandbramble.org/flight/4374?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36925562`
- **Departure**: 2024-08-10 15:36:14
- **Arrival**: 2024-08-10 16:32:13
- **Entry Time**: 2024-08-10 15:52:02

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.2 mph (59.8-99.0 mph range)
- **Heading Variability**: 97.9° standard deviation
- **Large Heading Changes**: 18 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.528 miles
- **Average Distance Before Entry**: 2.169 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 18 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #141: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4387](https://helos.maxandbramble.org/flight/4387?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_368ee5de`
- **Departure**: 2024-08-09 18:20:16
- **Arrival**: 2024-08-09 19:27:27
- **Entry Time**: 2024-08-09 19:07:12

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.1 mph (65.6-112.8 mph range)
- **Heading Variability**: 85.5° standard deviation
- **Large Heading Changes**: 44 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.512 miles
- **Average Distance Before Entry**: 2.529 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 44 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #142: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4403](https://helos.maxandbramble.org/flight/4403?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36875b4b`
- **Departure**: 2024-08-07 21:27:18
- **Arrival**: 2024-08-07 23:14:50
- **Entry Time**: 2024-08-07 22:12:17

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.1 mph (51.8-111.6 mph range)
- **Heading Variability**: 99.5° standard deviation
- **Large Heading Changes**: 20 changes > 30°
- **Loiter Positions**: 14 positions at low speed near target
- **Closest Approach Before Entry**: 0.531 miles
- **Average Distance Before Entry**: 1.1 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 20 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #143: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4459](https://helos.maxandbramble.org/flight/4459?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_366f5c0b`
- **Departure**: 2024-08-01 18:04:04
- **Arrival**: 2024-08-01 19:22:16
- **Entry Time**: 2024-08-01 18:57:26

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.6 mph (59.8-127.7 mph range)
- **Heading Variability**: 82.8° standard deviation
- **Large Heading Changes**: 32 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.536 miles
- **Average Distance Before Entry**: 4.104 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 32 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #144: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4489](https://helos.maxandbramble.org/flight/4489?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_365e54c9`
- **Departure**: 2024-07-28 14:11:40
- **Arrival**: 2024-07-28 15:19:21
- **Entry Time**: 2024-07-28 15:01:16

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 91.5 mph (44.9-145.0 mph range)
- **Heading Variability**: 80.6° standard deviation
- **Large Heading Changes**: 14 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.537 miles
- **Average Distance Before Entry**: 3.467 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 14 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #145: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [4541](https://helos.maxandbramble.org/flight/4541?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3648b980`
- **Departure**: 2024-07-23 06:30:42
- **Arrival**: 2024-07-23 08:19:02
- **Entry Time**: 2024-07-23 07:07:50

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.6 mph (55.2-138.1 mph range)
- **Heading Variability**: 73.2° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.532 miles
- **Average Distance Before Entry**: 1.499 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #146: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [4556](https://helos.maxandbramble.org/flight/4556?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_36402b93`
- **Departure**: 2024-07-20 23:40:25
- **Arrival**: 2024-07-21 00:36:39
- **Entry Time**: 2024-07-20 23:57:41

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.0 mph (52.9-125.4 mph range)
- **Heading Variability**: 80.9° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.754 miles
- **Average Distance Before Entry**: 4.528 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #147: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [4561](https://helos.maxandbramble.org/flight/4561?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_363cf6e5`
- **Departure**: 2024-07-20 06:16:02
- **Arrival**: 2024-07-20 06:46:04
- **Entry Time**: 2024-07-20 06:38:53

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.7 mph (74.8-125.4 mph range)
- **Heading Variability**: 123.9° standard deviation
- **Large Heading Changes**: 25 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.503 miles
- **Average Distance Before Entry**: 1.321 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 25 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #148: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4568](https://helos.maxandbramble.org/flight/4568?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3638951f`
- **Departure**: 2024-07-19 06:33:42
- **Arrival**: 2024-07-19 08:19:59
- **Entry Time**: 2024-07-19 07:31:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.1 mph (58.7-147.3 mph range)
- **Heading Variability**: 100.7° standard deviation
- **Large Heading Changes**: 16 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.557 miles
- **Average Distance Before Entry**: 2.031 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 16 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #149: N625FB - Score 9

**Flight Details:**

- **Aircraft**: N625FB (N625FB)
- **Flight Log ID**: [4607](https://helos.maxandbramble.org/flight/4607?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_361f83b7`
- **Departure**: 2024-07-13 05:02:17
- **Arrival**: 2024-07-13 06:37:26
- **Entry Time**: 2024-07-13 06:12:14

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.1 mph (9.2-99.0 mph range)
- **Heading Variability**: 83.6° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.502 miles
- **Average Distance Before Entry**: 2.632 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #150: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [4633](https://helos.maxandbramble.org/flight/4633?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3612daef`
- **Departure**: 2024-07-10 06:30:26
- **Arrival**: 2024-07-10 08:18:13
- **Entry Time**: 2024-07-10 08:00:12

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.8 mph (61.0-116.2 mph range)
- **Heading Variability**: 87.6° standard deviation
- **Large Heading Changes**: 25 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.573 miles
- **Average Distance Before Entry**: 3.057 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 25 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #151: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [4673](https://helos.maxandbramble.org/flight/4673?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35ff4383`
- **Departure**: 2024-07-05 03:33:10
- **Arrival**: 2024-07-05 05:09:12
- **Entry Time**: 2024-07-05 04:10:06

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 91.6 mph (66.7-156.5 mph range)
- **Heading Variability**: 133.7° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 3 positions at low speed near target
- **Closest Approach Before Entry**: 0.569 miles
- **Average Distance Before Entry**: 1.188 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #152: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [4773](https://helos.maxandbramble.org/flight/4773?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35d2d4f4`
- **Departure**: 2024-06-24 03:39:47
- **Arrival**: 2024-06-24 05:01:51
- **Entry Time**: 2024-06-24 04:18:37

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.8 mph (36.8-111.6 mph range)
- **Heading Variability**: 101.8° standard deviation
- **Large Heading Changes**: 22 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.757 miles
- **Average Distance Before Entry**: 3.284 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 22 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #153: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [4786](https://helos.maxandbramble.org/flight/4786?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35cbb77f`
- **Departure**: 2024-06-22 06:32:07
- **Arrival**: 2024-06-22 08:07:07
- **Entry Time**: 2024-06-22 07:47:28

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.7 mph (35.7-118.5 mph range)
- **Heading Variability**: 92.3° standard deviation
- **Large Heading Changes**: 26 changes > 30°
- **Loiter Positions**: 18 positions at low speed near target
- **Closest Approach Before Entry**: 0.538 miles
- **Average Distance Before Entry**: 1.642 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 26 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #154: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4862](https://helos.maxandbramble.org/flight/4862?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35abf688`
- **Departure**: 2024-06-14 05:09:32
- **Arrival**: 2024-06-14 06:35:52
- **Entry Time**: 2024-06-14 06:16:38

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.5 mph (57.5-119.7 mph range)
- **Heading Variability**: 135.7° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 16 positions at low speed near target
- **Closest Approach Before Entry**: 0.657 miles
- **Average Distance Before Entry**: 1.456 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #155: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4911](https://helos.maxandbramble.org/flight/4911?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_359409da`
- **Departure**: 2024-06-08 03:29:19
- **Arrival**: 2024-06-08 05:18:25
- **Entry Time**: 2024-06-08 03:52:36

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 84.2 mph (62.1-118.5 mph range)
- **Heading Variability**: 105.5° standard deviation
- **Large Heading Changes**: 39 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.554 miles
- **Average Distance Before Entry**: 2.547 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 39 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #156: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4928](https://helos.maxandbramble.org/flight/4928?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_358c1f5a`
- **Departure**: 2024-06-06 06:30:51
- **Arrival**: 2024-06-06 08:25:47
- **Entry Time**: 2024-06-06 06:51:56

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 80.3 mph (49.5-117.4 mph range)
- **Heading Variability**: 105.2° standard deviation
- **Large Heading Changes**: 20 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.527 miles
- **Average Distance Before Entry**: 2.054 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 20 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #157: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4933](https://helos.maxandbramble.org/flight/4933?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_358aebaf`
- **Departure**: 2024-06-05 21:52:50
- **Arrival**: 2024-06-05 23:42:22
- **Entry Time**: 2024-06-05 23:34:15

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 85.3 mph (58.7-124.3 mph range)
- **Heading Variability**: 93.5° standard deviation
- **Large Heading Changes**: 12 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.529 miles
- **Average Distance Before Entry**: 2.273 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 12 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #158: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [4951](https://helos.maxandbramble.org/flight/4951?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3583108f`
- **Departure**: 2024-06-03 21:23:10
- **Arrival**: 2024-06-03 22:32:58
- **Entry Time**: 2024-06-03 22:20:23

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.2 mph (63.3-96.7 mph range)
- **Heading Variability**: 91.0° standard deviation
- **Large Heading Changes**: 12 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.516 miles
- **Average Distance Before Entry**: 2.333 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 12 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #159: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [4968](https://helos.maxandbramble.org/flight/4968?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35797e98`
- **Departure**: 2024-06-01 04:59:42
- **Arrival**: 2024-06-01 05:47:35
- **Entry Time**: 2024-06-01 05:13:52

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.8 mph (51.8-143.8 mph range)
- **Heading Variability**: 93.6° standard deviation
- **Large Heading Changes**: 22 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.525 miles
- **Average Distance Before Entry**: 2.392 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 22 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #160: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5021](https://helos.maxandbramble.org/flight/5021?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3562da50`
- **Departure**: 2024-05-26 05:00:09
- **Arrival**: 2024-05-26 06:32:54
- **Entry Time**: 2024-05-26 05:19:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.0 mph (62.1-155.4 mph range)
- **Heading Variability**: 89.2° standard deviation
- **Large Heading Changes**: 29 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.681 miles
- **Average Distance Before Entry**: 4.28 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 29 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #161: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [5056](https://helos.maxandbramble.org/flight/5056?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3550074e`
- **Departure**: 2024-05-21 06:57:18
- **Arrival**: 2024-05-21 08:48:59
- **Entry Time**: 2024-05-21 07:44:34

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.1 mph (64.4-84.0 mph range)
- **Heading Variability**: 83.0° standard deviation
- **Large Heading Changes**: 12 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.527 miles
- **Average Distance Before Entry**: 2.745 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 12 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #162: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [5059](https://helos.maxandbramble.org/flight/5059?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_354f1a7b`
- **Departure**: 2024-05-20 23:36:33
- **Arrival**: 2024-05-21 01:12:55
- **Entry Time**: 2024-05-21 01:02:31

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.0 mph (55.2-128.9 mph range)
- **Heading Variability**: 102.2° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.577 miles
- **Average Distance Before Entry**: 2.654 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #163: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5099](https://helos.maxandbramble.org/flight/5099?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_353d63ae`
- **Departure**: 2024-05-16 06:32:03
- **Arrival**: 2024-05-16 08:06:45
- **Entry Time**: 2024-05-16 06:55:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.9 mph (62.1-110.5 mph range)
- **Heading Variability**: 130.2° standard deviation
- **Large Heading Changes**: 45 changes > 30°
- **Loiter Positions**: 9 positions at low speed near target
- **Closest Approach Before Entry**: 0.557 miles
- **Average Distance Before Entry**: 1.142 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 45 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #164: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5103](https://helos.maxandbramble.org/flight/5103?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_353c6ca3`
- **Departure**: 2024-05-15 23:02:34
- **Arrival**: 2024-05-16 00:40:03
- **Entry Time**: 2024-05-16 00:16:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 68.9 mph (55.2-78.3 mph range)
- **Heading Variability**: 145.0° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 44 positions at low speed near target
- **Closest Approach Before Entry**: 0.508 miles
- **Average Distance Before Entry**: 0.745 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #165: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5201](https://helos.maxandbramble.org/flight/5201?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3519591d`
- **Departure**: 2024-05-07 05:03:31
- **Arrival**: 2024-05-07 06:50:06
- **Entry Time**: 2024-05-07 06:20:36

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.6 mph (57.5-136.9 mph range)
- **Heading Variability**: 90.6° standard deviation
- **Large Heading Changes**: 35 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.735 miles
- **Average Distance Before Entry**: 3.234 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 35 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #166: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5214](https://helos.maxandbramble.org/flight/5214?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_35128551`
- **Departure**: 2024-05-05 08:01:26
- **Arrival**: 2024-05-05 10:09:25
- **Entry Time**: 2024-05-05 08:25:27

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 91.5 mph (70.2-123.1 mph range)
- **Heading Variability**: 89.7° standard deviation
- **Large Heading Changes**: 40 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.547 miles
- **Average Distance Before Entry**: 2.593 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 40 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #167: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5219](https://helos.maxandbramble.org/flight/5219?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3511eb64`
- **Departure**: 2024-05-05 02:05:14
- **Arrival**: 2024-05-05 03:31:36
- **Entry Time**: 2024-05-05 03:23:59

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.8 mph (63.3-135.8 mph range)
- **Heading Variability**: 129.4° standard deviation
- **Large Heading Changes**: 48 changes > 30°
- **Loiter Positions**: 6 positions at low speed near target
- **Closest Approach Before Entry**: 0.54 miles
- **Average Distance Before Entry**: 1.022 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 48 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #168: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5273](https://helos.maxandbramble.org/flight/5273?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34f9f523`
- **Departure**: 2024-04-29 02:22:51
- **Arrival**: 2024-04-29 03:41:04
- **Entry Time**: 2024-04-29 03:16:58

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.9 mph (51.8-105.9 mph range)
- **Heading Variability**: 81.0° standard deviation
- **Large Heading Changes**: 35 changes > 30°
- **Loiter Positions**: 11 positions at low speed near target
- **Closest Approach Before Entry**: 0.536 miles
- **Average Distance Before Entry**: 1.684 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 35 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #169: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5304](https://helos.maxandbramble.org/flight/5304?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34ebee05`
- **Departure**: 2024-04-25 03:32:38
- **Arrival**: 2024-04-25 05:08:19
- **Entry Time**: 2024-04-25 04:37:23

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.7 mph (50.6-112.8 mph range)
- **Heading Variability**: 100.1° standard deviation
- **Large Heading Changes**: 11 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.546 miles
- **Average Distance Before Entry**: 2.492 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 11 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #170: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5325](https://helos.maxandbramble.org/flight/5325?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34e4c173`
- **Departure**: 2024-04-23 08:09:52
- **Arrival**: 2024-04-23 09:53:14
- **Entry Time**: 2024-04-23 08:41:00

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.4 mph (42.6-109.3 mph range)
- **Heading Variability**: 71.6° standard deviation
- **Large Heading Changes**: 28 changes > 30°
- **Loiter Positions**: 12 positions at low speed near target
- **Closest Approach Before Entry**: 0.547 miles
- **Average Distance Before Entry**: 1.976 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 28 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #171: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5441](https://helos.maxandbramble.org/flight/5441?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34b206d5`
- **Departure**: 2024-04-09 05:01:39
- **Arrival**: 2024-04-09 06:37:47
- **Entry Time**: 2024-04-09 05:15:05

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.2 mph (63.3-103.6 mph range)
- **Heading Variability**: 79.3° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.631 miles
- **Average Distance Before Entry**: 3.983 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #172: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5459](https://helos.maxandbramble.org/flight/5459?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_34aafbed`
- **Departure**: 2024-04-07 06:32:20
- **Arrival**: 2024-04-07 08:05:32
- **Entry Time**: 2024-04-07 07:01:57

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 83.4 mph (64.4-104.7 mph range)
- **Heading Variability**: 89.6° standard deviation
- **Large Heading Changes**: 22 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.534 miles
- **Average Distance Before Entry**: 2.69 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 22 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #173: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5503](https://helos.maxandbramble.org/flight/5503?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_349a4c23`
- **Departure**: 2024-04-02 08:43:09
- **Arrival**: 2024-04-02 09:41:48
- **Entry Time**: 2024-04-02 09:34:07

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.5 mph (64.4-109.3 mph range)
- **Heading Variability**: 87.1° standard deviation
- **Large Heading Changes**: 14 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.526 miles
- **Average Distance Before Entry**: 3.259 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 14 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #174: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5594](https://helos.maxandbramble.org/flight/5594?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_347fc84e`
- **Departure**: 2024-03-25 05:13:00
- **Arrival**: 2024-03-25 06:48:19
- **Entry Time**: 2024-03-25 06:25:48

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.9 mph (63.3-103.6 mph range)
- **Heading Variability**: 74.8° standard deviation
- **Large Heading Changes**: 5 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.681 miles
- **Average Distance Before Entry**: 3.649 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 5 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #175: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5660](https://helos.maxandbramble.org/flight/5660?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_345efd5c`
- **Departure**: 2024-03-15 06:33:13
- **Arrival**: 2024-03-15 08:10:11
- **Entry Time**: 2024-03-15 07:51:48

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.9 mph (65.6-99.0 mph range)
- **Heading Variability**: 104.8° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 2 positions at low speed near target
- **Closest Approach Before Entry**: 0.576 miles
- **Average Distance Before Entry**: 2.537 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #176: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5667](https://helos.maxandbramble.org/flight/5667?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3459cce2`
- **Departure**: 2024-03-13 18:32:01
- **Arrival**: 2024-03-13 19:54:42
- **Entry Time**: 2024-03-13 18:49:57

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 65.7 mph (44.9-84.0 mph range)
- **Heading Variability**: 116.0° standard deviation
- **Large Heading Changes**: 0 changes > 30°
- **Loiter Positions**: 54 positions at low speed near target
- **Closest Approach Before Entry**: 0.525 miles
- **Average Distance Before Entry**: 1.276 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Significant loitering** - 54 seconds near target area
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #177: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5677](https://helos.maxandbramble.org/flight/5677?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3450bdcd`
- **Departure**: 2024-03-11 03:34:54
- **Arrival**: 2024-03-11 05:08:24
- **Entry Time**: 2024-03-11 04:44:53

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.4 mph (38.0-146.1 mph range)
- **Heading Variability**: 96.3° standard deviation
- **Large Heading Changes**: 18 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.552 miles
- **Average Distance Before Entry**: 3.605 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 18 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #178: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5737](https://helos.maxandbramble.org/flight/5737?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_3436fd6e`
- **Departure**: 2024-03-02 23:11:56
- **Arrival**: 2024-03-03 00:50:13
- **Entry Time**: 2024-03-03 00:42:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.1 mph (57.5-127.7 mph range)
- **Heading Variability**: 119.6° standard deviation
- **Large Heading Changes**: 15 changes > 30°
- **Loiter Positions**: 17 positions at low speed near target
- **Closest Approach Before Entry**: 0.816 miles
- **Average Distance Before Entry**: 1.939 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 15 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #179: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5800](https://helos.maxandbramble.org/flight/5800?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_341da7ac`
- **Departure**: 2024-02-23 22:58:48
- **Arrival**: 2024-02-24 00:25:21
- **Entry Time**: 2024-02-23 23:22:26

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 87.2 mph (65.6-143.8 mph range)
- **Heading Variability**: 91.8° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.58 miles
- **Average Distance Before Entry**: 3.267 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #180: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [5835](https://helos.maxandbramble.org/flight/5835?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_340d38d5`
- **Departure**: 2024-02-19 03:30:38
- **Arrival**: 2024-02-19 05:11:36
- **Entry Time**: 2024-02-19 04:32:33

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 76.8 mph (63.3-102.4 mph range)
- **Heading Variability**: 71.8° standard deviation
- **Large Heading Changes**: 21 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.52 miles
- **Average Distance Before Entry**: 2.548 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 21 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #181: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5890](https://helos.maxandbramble.org/flight/5890?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33ef7858`
- **Departure**: 2024-02-09 18:03:11
- **Arrival**: 2024-02-09 19:21:22
- **Entry Time**: 2024-02-09 18:56:47

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 75.7 mph (35.7-97.8 mph range)
- **Heading Variability**: 92.2° standard deviation
- **Large Heading Changes**: 14 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.505 miles
- **Average Distance Before Entry**: 2.076 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 14 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #182: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5902](https://helos.maxandbramble.org/flight/5902?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33e56a9d`
- **Departure**: 2024-02-06 19:09:04
- **Arrival**: 2024-02-06 20:05:20
- **Entry Time**: 2024-02-06 19:33:11

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 70.9 mph (55.2-79.4 mph range)
- **Heading Variability**: 54.9° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 21 positions at low speed near target
- **Closest Approach Before Entry**: 0.511 miles
- **Average Distance Before Entry**: 1.928 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Notable maneuvering** - Moderate heading changes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #183: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [5924](https://helos.maxandbramble.org/flight/5924?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33d9dac0`
- **Departure**: 2024-02-02 23:10:29
- **Arrival**: 2024-02-03 00:32:00
- **Entry Time**: 2024-02-02 23:45:38

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 91.1 mph (52.9-112.8 mph range)
- **Heading Variability**: 72.8° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.754 miles
- **Average Distance Before Entry**: 3.79 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #184: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [5968](https://helos.maxandbramble.org/flight/5968?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33bddcf8`
- **Departure**: 2024-01-25 06:32:50
- **Arrival**: 2024-01-25 08:11:09
- **Entry Time**: 2024-01-25 07:51:36

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 81.4 mph (59.8-146.1 mph range)
- **Heading Variability**: 90.9° standard deviation
- **Large Heading Changes**: 54 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.786 miles
- **Average Distance Before Entry**: 3.608 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 54 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #185: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6011](https://helos.maxandbramble.org/flight/6011?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33ac1603`
- **Departure**: 2024-01-19 02:04:22
- **Arrival**: 2024-01-19 03:35:36
- **Entry Time**: 2024-01-19 02:57:22

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.5 mph (50.6-119.7 mph range)
- **Heading Variability**: 89.2° standard deviation
- **Large Heading Changes**: 9 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.597 miles
- **Average Distance Before Entry**: 2.793 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 9 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #186: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [6027](https://helos.maxandbramble.org/flight/6027?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33a61dd8`
- **Departure**: 2024-01-17 06:31:18
- **Arrival**: 2024-01-17 08:12:59
- **Entry Time**: 2024-01-17 07:14:20

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.1 mph (73.6-94.4 mph range)
- **Heading Variability**: 60.4° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.513 miles
- **Average Distance Before Entry**: 2.795 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #187: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [6045](https://helos.maxandbramble.org/flight/6045?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_339ce645`
- **Departure**: 2024-01-13 22:45:30
- **Arrival**: 2024-01-14 00:10:19
- **Entry Time**: 2024-01-13 23:17:39

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 87.9 mph (58.7-116.2 mph range)
- **Heading Variability**: 78.8° standard deviation
- **Large Heading Changes**: 39 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.559 miles
- **Average Distance Before Entry**: 2.746 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 39 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #188: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [6050](https://helos.maxandbramble.org/flight/6050?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_339a993a`
- **Departure**: 2024-01-13 02:08:48
- **Arrival**: 2024-01-13 03:34:12
- **Entry Time**: 2024-01-13 03:25:33

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 78.1 mph (62.1-108.2 mph range)
- **Heading Variability**: 116.8° standard deviation
- **Large Heading Changes**: 15 changes > 30°
- **Loiter Positions**: 1 positions at low speed near target
- **Closest Approach Before Entry**: 0.685 miles
- **Average Distance Before Entry**: 1.955 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 15 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #189: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [6095](https://helos.maxandbramble.org/flight/6095?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_338460bd`
- **Departure**: 2024-01-06 03:35:06
- **Arrival**: 2024-01-06 05:15:11
- **Entry Time**: 2024-01-06 04:02:59

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.2 mph (67.9-102.4 mph range)
- **Heading Variability**: 94.5° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.56 miles
- **Average Distance Before Entry**: 2.304 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #190: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6104](https://helos.maxandbramble.org/flight/6104?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_337dc025`
- **Departure**: 2024-01-04 08:57:26
- **Arrival**: 2024-01-04 10:37:53
- **Entry Time**: 2024-01-04 10:02:17

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 88.0 mph (59.8-133.5 mph range)
- **Heading Variability**: 88.9° standard deviation
- **Large Heading Changes**: 8 changes > 30°
- **Loiter Positions**: 4 positions at low speed near target
- **Closest Approach Before Entry**: 0.518 miles
- **Average Distance Before Entry**: 1.259 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 8 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #191: N624FB - Score 9

**Flight Details:**

- **Aircraft**: N624FB (N624FB)
- **Flight Log ID**: [6225](https://helos.maxandbramble.org/flight/6225?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33430062`
- **Departure**: 2023-12-17 02:13:34
- **Arrival**: 2023-12-17 03:46:42
- **Entry Time**: 2023-12-17 03:03:21

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.7 mph (66.7-97.8 mph range)
- **Heading Variability**: 68.9° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.531 miles
- **Average Distance Before Entry**: 2.884 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #192: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6235](https://helos.maxandbramble.org/flight/6235?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_33401e17`
- **Departure**: 2023-12-16 06:35:03
- **Arrival**: 2023-12-16 08:03:46
- **Entry Time**: 2023-12-16 07:30:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 82.1 mph (52.9-143.8 mph range)
- **Heading Variability**: 107.3° standard deviation
- **Large Heading Changes**: 4 changes > 30°
- **Loiter Positions**: 32 positions at low speed near target
- **Closest Approach Before Entry**: 0.608 miles
- **Average Distance Before Entry**: 1.117 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #193: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6241](https://helos.maxandbramble.org/flight/6241?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_333e4593`
- **Departure**: 2023-12-15 18:11:06
- **Arrival**: 2023-12-15 19:30:11
- **Entry Time**: 2023-12-15 18:55:32

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 90.8 mph (57.5-136.9 mph range)
- **Heading Variability**: 78.5° standard deviation
- **Large Heading Changes**: 7 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.52 miles
- **Average Distance Before Entry**: 3.397 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 7 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #194: N621FB - Score 9

**Flight Details:**

- **Aircraft**: N621FB (N621FB)
- **Flight Log ID**: [6285](https://helos.maxandbramble.org/flight/6285?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_332a0e45`
- **Departure**: 2023-12-10 06:30:50
- **Arrival**: 2023-12-10 08:16:05
- **Entry Time**: 2023-12-10 06:57:51

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 86.8 mph (51.8-119.7 mph range)
- **Heading Variability**: 61.9° standard deviation
- **Large Heading Changes**: 15 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.673 miles
- **Average Distance Before Entry**: 4.163 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 15 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #195: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6427](https://helos.maxandbramble.org/flight/6427?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_32e09e6c`
- **Departure**: 2023-11-18 03:30:32
- **Arrival**: 2023-11-18 05:06:12
- **Entry Time**: 2023-11-18 04:34:13

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.3 mph (39.1-117.4 mph range)
- **Heading Variability**: 88.9° standard deviation
- **Large Heading Changes**: 15 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.582 miles
- **Average Distance Before Entry**: 2.325 miles

**Pattern Analysis:**
⚠️ **Extreme circling/spinning** - Very high heading variability indicates circling or figure-8 patterns
⚠️ **Frequent direction changes** - 15 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #196: N623FB - Score 9

**Flight Details:**

- **Aircraft**: N623FB (N623FB)
- **Flight Log ID**: [6503](https://helos.maxandbramble.org/flight/6503?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_32c04b20`
- **Departure**: 2023-11-08 05:04:12
- **Arrival**: 2023-11-08 06:37:13
- **Entry Time**: 2023-11-08 06:24:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 77.0 mph (38.0-103.6 mph range)
- **Heading Variability**: 67.5° standard deviation
- **Large Heading Changes**: 10 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.566 miles
- **Average Distance Before Entry**: 4.002 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 10 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #197: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6517](https://helos.maxandbramble.org/flight/6517?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_32b9d0a9`
- **Departure**: 2023-11-06 06:33:11
- **Arrival**: 2023-11-06 08:19:00
- **Entry Time**: 2023-11-06 07:14:52

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 64.3 mph (48.3-76.0 mph range)
- **Heading Variability**: 62.6° standard deviation
- **Large Heading Changes**: 1 changes > 30°
- **Loiter Positions**: 40 positions at low speed near target
- **Closest Approach Before Entry**: 0.508 miles
- **Average Distance Before Entry**: 1.909 miles

**Pattern Analysis:**
⚠️ **Moderate hovering** - Below normal patrol speed
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Close positioning** - Positioned very close to target before entry

---

### Flight #198: N622FB - Score 9

**Flight Details:**

- **Aircraft**: N622FB (N622FB)
- **Flight Log ID**: [6574](https://helos.maxandbramble.org/flight/6574?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)
- **FlightRadar24 ID**: `fr24_complete_328d810b`
- **Departure**: 2023-10-23 15:29:23
- **Arrival**: 2023-10-23 16:25:11
- **Entry Time**: 2023-10-23 15:53:24

**Pre-Entry Behavior (5 minutes before entry):**

- **Average Speed**: 79.4 mph (65.6-94.4 mph range)
- **Heading Variability**: 72.4° standard deviation
- **Large Heading Changes**: 6 changes > 30°
- **Loiter Positions**: 0 positions at low speed near target
- **Closest Approach Before Entry**: 0.504 miles
- **Average Distance Before Entry**: 2.944 miles

**Pattern Analysis:**
⚠️ **Significant circling** - High heading variability suggests circling behavior
⚠️ **Frequent direction changes** - 6 major heading changes in 5 minutes
⚠️ **Close positioning** - Positioned very close to target before entry

---

## Summary Table

| Rank | Flight ID | Aircraft | Date       | Entry Time | Score | Avg Speed | Heading Std | Loiter Pos | Link                                      |
|------|-----------|----------|------------|------------|-------|-----------|-------------|------------|-------------------------------------------|
| 1    | 1737      | N622FB   | 2025-05-09 | 19:30:18   | 13    | 62.6 mph  | 126.6°      | 138        | [View](https://helos.maxandbramble.org/flight/1737?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 2    | 3392      | N622FB   | 2025-10-19 | 07:44:11   | 12    | 69.4 mph  | 112.1°      | 96         | [View](https://helos.maxandbramble.org/flight/3392?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 3    | 3755      | N624FB   | 2024-10-18 | 15:33:41   | 12    | 62.6 mph  | 115.9°      | 70         | [View](https://helos.maxandbramble.org/flight/3755?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 4    | 4372      | N625FB   | 2024-08-10 | 23:56:01   | 12    | 70.1 mph  | 104.2°      | 53         | [View](https://helos.maxandbramble.org/flight/4372?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 5    | 4833      | N624FB   | 2024-06-17 | 21:16:51   | 12    | 64.2 mph  | 85.1°       | 63         | [View](https://helos.maxandbramble.org/flight/4833?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 6    | 5058      | N622FB   | 2024-05-21 | 01:11:37   | 12    | 62.9 mph  | 122.7°      | 74         | [View](https://helos.maxandbramble.org/flight/5058?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 7    | 5348      | N624FB   | 2024-04-20 | 09:04:05   | 12    | 70.3 mph  | 123.0°      | 62         | [View](https://helos.maxandbramble.org/flight/5348?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 8    | 6173      | N621FB   | 2023-12-26 | 08:28:56   | 12    | 71.2 mph  | 114.0°      | 59         | [View](https://helos.maxandbramble.org/flight/6173?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 9    | 6250      | N621FB   | 2023-12-15 | 02:32:56   | 12    | 66.5 mph  | 131.9°      | 79         | [View](https://helos.maxandbramble.org/flight/6250?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 10   | 923       | N621FB   | 2025-08-03 | 03:49:49   | 11    | 67.8 mph  | 76.9°       | 22         | [View](https://helos.maxandbramble.org/flight/923?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 11   | 1291      | N624FB   | 2025-06-26 | 23:08:18   | 11    | 74.1 mph  | 105.6°      | 59         | [View](https://helos.maxandbramble.org/flight/1291?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 12   | 1756      | N622FB   | 2025-05-07 | 23:25:23   | 11    | 54.8 mph  | 66.5°       | 109        | [View](https://helos.maxandbramble.org/flight/1756?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 13   | 2175      | N622FB   | 2025-03-22 | 04:47:47   | 11    | 50.7 mph  | 105.6°      | 36         | [View](https://helos.maxandbramble.org/flight/2175?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 14   | 2252      | N624FB   | 2025-03-15 | 04:32:00   | 11    | 71.0 mph  | 98.3°       | 50         | [View](https://helos.maxandbramble.org/flight/2252?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 15   | 2498      | N623FB   | 2025-02-21 | 05:04:54   | 11    | 90.6 mph  | 100.6°      | 61         | [View](https://helos.maxandbramble.org/flight/2498?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 16   | 2689      | N625FB   | 2025-02-05 | 15:37:13   | 11    | 72.2 mph  | 85.2°       | 33         | [View](https://helos.maxandbramble.org/flight/2689?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 17   | 3023      | N622FB   | 2025-01-03 | 15:34:26   | 11    | 66.2 mph  | 79.8°       | 70         | [View](https://helos.maxandbramble.org/flight/3023?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 18   | 3883      | N622FB   | 2024-10-06 | 02:19:33   | 11    | 71.5 mph  | 106.5°      | 39         | [View](https://helos.maxandbramble.org/flight/3883?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 19   | 4440      | N624FB   | 2024-08-03 | 23:15:22   | 11    | 71.8 mph  | 119.8°      | 46         | [View](https://helos.maxandbramble.org/flight/4440?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 20   | 4504      | N622FB   | 2024-07-26 | 23:49:21   | 11    | 71.3 mph  | 111.0°      | 21         | [View](https://helos.maxandbramble.org/flight/4504?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 21   | 5049      | N623FB   | 2024-05-22 | 10:23:45   | 11    | 74.6 mph  | 100.1°      | 40         | [View](https://helos.maxandbramble.org/flight/5049?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 22   | 5993      | N621FB   | 2024-01-21 | 04:31:28   | 11    | 71.9 mph  | 114.5°      | 23         | [View](https://helos.maxandbramble.org/flight/5993?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 23   | 6000      | N622FB   | 2024-01-20 | 08:24:30   | 11    | 74.2 mph  | 120.5°      | 33         | [View](https://helos.maxandbramble.org/flight/6000?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 24   | 6072      | N621FB   | 2024-01-09 | 00:28:30   | 11    | 66.6 mph  | 89.2°       | 50         | [View](https://helos.maxandbramble.org/flight/6072?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 25   | 684       | N625FB   | 2025-08-31 | 18:49:11   | 10    | 73.5 mph  | 92.1°       | 14         | [View](https://helos.maxandbramble.org/flight/684?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 26   | 872       | N623FB   | 2025-08-08 | 08:02:20   | 10    | 64.6 mph  | 120.2°      | 120        | [View](https://helos.maxandbramble.org/flight/872?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 27   | 942       | N623FB   | 2025-08-01 | 02:34:51   | 10    | 75.1 mph  | 88.9°       | 50         | [View](https://helos.maxandbramble.org/flight/942?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 28   | 1135      | N623FB   | 2025-07-12 | 05:53:47   | 10    | 82.2 mph  | 111.9°      | 45         | [View](https://helos.maxandbramble.org/flight/1135?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 29   | 1315      | N625FB   | 2025-06-24 | 00:34:49   | 10    | 80.8 mph  | 106.5°      | 21         | [View](https://helos.maxandbramble.org/flight/1315?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 30   | 1729      | N622FB   | 2025-05-10 | 18:43:32   | 10    | 61.7 mph  | 103.7°      | 111        | [View](https://helos.maxandbramble.org/flight/1729?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 31   | 1798      | N622FB   | 2025-05-02 | 18:51:00   | 10    | 80.0 mph  | 93.3°       | 30         | [View](https://helos.maxandbramble.org/flight/1798?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 32   | 1944      | N625FB   | 2025-04-17 | 18:53:54   | 10    | 56.5 mph  | 68.2°       | 52         | [View](https://helos.maxandbramble.org/flight/1944?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 33   | 2088      | N624FB   | 2025-04-02 | 23:52:37   | 10    | 84.4 mph  | 120.8°      | 61         | [View](https://helos.maxandbramble.org/flight/2088?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 34   | 2197      | N622FB   | 2025-03-20 | 03:45:49   | 10    | 65.5 mph  | 136.3°      | 75         | [View](https://helos.maxandbramble.org/flight/2197?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 35   | 2353      | N623FB   | 2025-03-04 | 00:05:59   | 10    | 69.4 mph  | 114.4°      | 138        | [View](https://helos.maxandbramble.org/flight/2353?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 36   | 2521      | N624FB   | 2025-02-19 | 06:48:20   | 10    | 74.6 mph  | 92.2°       | 0          | [View](https://helos.maxandbramble.org/flight/2521?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 37   | 2954      | N621FB   | 2025-01-10 | 08:51:58   | 10    | 68.0 mph  | 79.4°       | 0          | [View](https://helos.maxandbramble.org/flight/2954?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 38   | 3133      | N623FB   | 2024-12-22 | 16:14:34   | 10    | 70.5 mph  | 107.2°      | 93         | [View](https://helos.maxandbramble.org/flight/3133?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 39   | 3155      | N621FB   | 2024-12-20 | 04:36:16   | 10    | 74.1 mph  | 137.1°      | 11         | [View](https://helos.maxandbramble.org/flight/3155?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 40   | 3277      | N623FB   | 2024-12-05 | 23:28:44   | 10    | 82.1 mph  | 98.1°       | 23         | [View](https://helos.maxandbramble.org/flight/3277?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 41   | 3442      | N624FB   | 2024-11-23 | 03:10:33   | 10    | 73.1 mph  | 111.9°      | 0          | [View](https://helos.maxandbramble.org/flight/3442?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 42   | 318       | N623FB   | 2024-11-19 | 18:45:59   | 10    | 74.3 mph  | 96.6°       | 0          | [View](https://helos.maxandbramble.org/flight/318?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 43   | 3540      | N625FB   | 2024-11-11 | 19:14:41   | 10    | 90.7 mph  | 88.2°       | 42         | [View](https://helos.maxandbramble.org/flight/3540?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 44   | 3581      | N625FB   | 2024-11-07 | 05:11:40   | 10    | 70.2 mph  | 106.3°      | 0          | [View](https://helos.maxandbramble.org/flight/3581?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 45   | 3730      | N622FB   | 2024-10-21 | 09:28:13   | 10    | 78.9 mph  | 70.2°       | 22         | [View](https://helos.maxandbramble.org/flight/3730?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 46   | 4101      | N625FB   | 2024-09-11 | 05:40:16   | 10    | 55.8 mph  | 83.2°       | 41         | [View](https://helos.maxandbramble.org/flight/4101?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 47   | 4176      | N621FB   | 2024-09-02 | 08:23:50   | 10    | 85.4 mph  | 108.1°      | 27         | [View](https://helos.maxandbramble.org/flight/4176?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 48   | 4250      | N622FB   | 2024-08-25 | 04:57:11   | 10    | 72.4 mph  | 109.8°      | 43         | [View](https://helos.maxandbramble.org/flight/4250?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 49   | 4251      | N621FB   | 2024-08-25 | 03:08:52   | 10    | 73.5 mph  | 109.4°      | 0          | [View](https://helos.maxandbramble.org/flight/4251?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 50   | 4393      | N624FB   | 2024-08-09 | 01:59:31   | 10    | 72.0 mph  | 78.3°       | 9          | [View](https://helos.maxandbramble.org/flight/4393?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 51   | 4538      | N622FB   | 2024-07-23 | 16:12:46   | 10    | 69.6 mph  | 106.8°      | 52         | [View](https://helos.maxandbramble.org/flight/4538?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 52   | 4658      | N622FB   | 2024-07-06 | 17:48:14   | 10    | 73.9 mph  | 76.1°       | 0          | [View](https://helos.maxandbramble.org/flight/4658?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 53   | 4790      | N622FB   | 2024-06-22 | 02:15:07   | 10    | 77.2 mph  | 126.9°      | 51         | [View](https://helos.maxandbramble.org/flight/4790?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 54   | 4969      | N621FB   | 2024-06-01 | 04:58:58   | 10    | 79.6 mph  | 104.8°      | 25         | [View](https://helos.maxandbramble.org/flight/4969?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 55   | 5012      | N621FB   | 2024-05-27 | 01:00:35   | 10    | 68.1 mph  | 110.0°      | 0          | [View](https://helos.maxandbramble.org/flight/5012?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 56   | 5061      | N621FB   | 2024-05-20 | 19:29:47   | 10    | 64.7 mph  | 117.6°      | 59         | [View](https://helos.maxandbramble.org/flight/5061?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 57   | 5168      | N623FB   | 2024-05-09 | 08:17:19   | 10    | 69.7 mph  | 104.7°      | 0          | [View](https://helos.maxandbramble.org/flight/5168?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 58   | 5202      | N621FB   | 2024-05-07 | 04:13:13   | 10    | 79.9 mph  | 122.4°      | 44         | [View](https://helos.maxandbramble.org/flight/5202?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 59   | 5519      | N621FB   | 2024-03-31 | 05:13:47   | 10    | 76.5 mph  | 83.1°       | 25         | [View](https://helos.maxandbramble.org/flight/5519?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 60   | 5588      | N622FB   | 2024-03-26 | 02:41:40   | 10    | 64.7 mph  | 117.6°      | 72         | [View](https://helos.maxandbramble.org/flight/5588?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 61   | 5612      | N622FB   | 2024-03-22 | 23:35:16   | 10    | 71.6 mph  | 97.4°       | 6          | [View](https://helos.maxandbramble.org/flight/5612?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 62   | 263       | N624FB   | 2024-02-21 | 03:52:20   | 10    | 74.2 mph  | 85.8°       | 0          | [View](https://helos.maxandbramble.org/flight/263?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 63   | 216       | N622FB   | 2024-01-22 | 03:46:56   | 10    | 69.9 mph  | 94.5°       | 0          | [View](https://helos.maxandbramble.org/flight/216?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 64   | 6006      | N622FB   | 2024-01-19 | 16:48:04   | 10    | 71.6 mph  | 112.7°      | 0          | [View](https://helos.maxandbramble.org/flight/6006?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 65   | 6336      | N622FB   | 2023-12-05 | 19:12:39   | 10    | 66.5 mph  | 82.0°       | 0          | [View](https://helos.maxandbramble.org/flight/6336?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 66   | 6459      | N624FB   | 2023-11-12 | 15:54:21   | 10    | 66.9 mph  | 105.4°      | 55         | [View](https://helos.maxandbramble.org/flight/6459?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 67   | 6460      | N622FB   | 2023-11-11 | 18:18:05   | 10    | 83.5 mph  | 95.6°       | 39         | [View](https://helos.maxandbramble.org/flight/6460?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 68   | 3383      | N622FB   | 2025-10-20 | 07:02:53   | 9     | 78.7 mph  | 88.5°       | 0          | [View](https://helos.maxandbramble.org/flight/3383?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 69   | 3395      | N623FB   | 2025-10-19 | 02:26:05   | 9     | 76.8 mph  | 112.5°      | 0          | [View](https://helos.maxandbramble.org/flight/3395?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 70   | 3396      | N623FB   | 2025-10-18 | 23:41:45   | 9     | 77.7 mph  | 89.5°       | 0          | [View](https://helos.maxandbramble.org/flight/3396?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 71   | 78        | N624FB   | 2025-10-12 | 08:45:54   | 9     | 85.0 mph  | 121.7°      | 3          | [View](https://helos.maxandbramble.org/flight/78?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)   |
| 72   | 515       | N621FB   | 2025-09-20 | 04:35:13   | 9     | 80.6 mph  | 88.1°       | 0          | [View](https://helos.maxandbramble.org/flight/515?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 73   | 576       | N621FB   | 2025-09-13 | 03:59:44   | 9     | 85.6 mph  | 90.5°       | 0          | [View](https://helos.maxandbramble.org/flight/576?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 74   | 654       | N624FB   | 2025-09-04 | 19:30:26   | 9     | 78.9 mph  | 76.7°       | 0          | [View](https://helos.maxandbramble.org/flight/654?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 75   | 690       | N625FB   | 2025-08-31 | 03:44:24   | 9     | 78.0 mph  | 104.9°      | 0          | [View](https://helos.maxandbramble.org/flight/690?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 76   | 729       | N625FB   | 2025-08-26 | 07:02:11   | 9     | 81.5 mph  | 80.0°       | 0          | [View](https://helos.maxandbramble.org/flight/729?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 77   | 412       | N621FB   | 2025-08-19 | 00:20:48   | 9     | 87.5 mph  | 72.2°       | 0          | [View](https://helos.maxandbramble.org/flight/412?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 78   | 814       | N621FB   | 2025-08-15 | 23:13:26   | 9     | 67.2 mph  | 127.5°      | 94         | [View](https://helos.maxandbramble.org/flight/814?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 79   | 929       | N621FB   | 2025-08-02 | 07:53:34   | 9     | 81.1 mph  | 115.6°      | 70         | [View](https://helos.maxandbramble.org/flight/929?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 80   | 930       | N621FB   | 2025-08-02 | 07:22:39   | 9     | 61.2 mph  | 104.5°      | 57         | [View](https://helos.maxandbramble.org/flight/930?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 81   | 993       | N621FB   | 2025-07-26 | 07:43:20   | 9     | 92.1 mph  | 76.0°       | 30         | [View](https://helos.maxandbramble.org/flight/993?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67)  |
| 82   | 1023      | N623FB   | 2025-07-23 | 15:59:57   | 9     | 83.9 mph  | 79.4°       | 0          | [View](https://helos.maxandbramble.org/flight/1023?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 83   | 1064      | N621FB   | 2025-07-19 | 18:00:01   | 9     | 77.9 mph  | 107.2°      | 28         | [View](https://helos.maxandbramble.org/flight/1064?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 84   | 1117      | N623FB   | 2025-07-14 | 05:23:10   | 9     | 85.6 mph  | 98.4°       | 0          | [View](https://helos.maxandbramble.org/flight/1117?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 85   | 1119      | N621FB   | 2025-07-14 | 02:32:30   | 9     | 84.6 mph  | 84.8°       | 22         | [View](https://helos.maxandbramble.org/flight/1119?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 86   | 1131      | N625FB   | 2025-07-12 | 18:35:37   | 9     | 76.8 mph  | 76.0°       | 15         | [View](https://helos.maxandbramble.org/flight/1131?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 87   | 1356      | N624FB   | 2025-06-19 | 18:52:34   | 9     | 90.2 mph  | 63.8°       | 18         | [View](https://helos.maxandbramble.org/flight/1356?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 88   | 1358      | N624FB   | 2025-06-19 | 15:51:54   | 9     | 82.5 mph  | 122.7°      | 16         | [View](https://helos.maxandbramble.org/flight/1358?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 89   | 1549      | N625FB   | 2025-06-01 | 03:15:28   | 9     | 80.6 mph  | 138.3°      | 0          | [View](https://helos.maxandbramble.org/flight/1549?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 90   | 1672      | N624FB   | 2025-05-18 | 03:07:51   | 9     | 71.9 mph  | 98.5°       | 0          | [View](https://helos.maxandbramble.org/flight/1672?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 91   | 1782      | N625FB   | 2025-05-04 | 09:06:02   | 9     | 84.4 mph  | 78.7°       | 0          | [View](https://helos.maxandbramble.org/flight/1782?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 92   | 1784      | N625FB   | 2025-05-04 | 06:03:55   | 9     | 90.5 mph  | 89.4°       | 0          | [View](https://helos.maxandbramble.org/flight/1784?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 93   | 1847      | N624FB   | 2025-04-27 | 06:09:32   | 9     | 84.1 mph  | 95.2°       | 4          | [View](https://helos.maxandbramble.org/flight/1847?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 94   | 1951      | N625FB   | 2025-04-17 | 04:29:33   | 9     | 65.0 mph  | 72.6°       | 30         | [View](https://helos.maxandbramble.org/flight/1951?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 95   | 1986      | N622FB   | 2025-04-14 | 04:10:06   | 9     | 86.8 mph  | 81.9°       | 0          | [View](https://helos.maxandbramble.org/flight/1986?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 96   | 1993      | N624FB   | 2025-04-13 | 06:09:35   | 9     | 88.3 mph  | 93.5°       | 0          | [View](https://helos.maxandbramble.org/flight/1993?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 97   | 2002      | N622FB   | 2025-04-12 | 06:20:46   | 9     | 89.6 mph  | 72.8°       | 0          | [View](https://helos.maxandbramble.org/flight/2002?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 98   | 2062      | N625FB   | 2025-04-05 | 04:20:01   | 9     | 66.2 mph  | 135.6°      | 86         | [View](https://helos.maxandbramble.org/flight/2062?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 99   | 2086      | N623FB   | 2025-04-03 | 04:29:32   | 9     | 76.3 mph  | 113.9°      | 60         | [View](https://helos.maxandbramble.org/flight/2086?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 100  | 2092      | N624FB   | 2025-04-02 | 02:55:30   | 9     | 88.3 mph  | 83.3°       | 10         | [View](https://helos.maxandbramble.org/flight/2092?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 101  | 2124      | N623FB   | 2025-03-28 | 04:50:50   | 9     | 68.1 mph  | 94.0°       | 77         | [View](https://helos.maxandbramble.org/flight/2124?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 102  | 2184      | N624FB   | 2025-03-21 | 08:37:34   | 9     | 89.8 mph  | 87.4°       | 0          | [View](https://helos.maxandbramble.org/flight/2184?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 103  | 2300      | N623FB   | 2025-03-10 | 05:15:40   | 9     | 86.7 mph  | 87.0°       | 16         | [View](https://helos.maxandbramble.org/flight/2300?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 104  | 2315      | N623FB   | 2025-03-08 | 08:31:09   | 9     | 86.8 mph  | 104.8°      | 0          | [View](https://helos.maxandbramble.org/flight/2315?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 105  | 2729      | N623FB   | 2025-02-01 | 04:07:04   | 9     | 75.6 mph  | 68.1°       | 19         | [View](https://helos.maxandbramble.org/flight/2729?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 106  | 2836      | N623FB   | 2025-01-22 | 18:18:24   | 9     | 84.2 mph  | 72.1°       | 0          | [View](https://helos.maxandbramble.org/flight/2836?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 107  | 2888      | N621FB   | 2025-01-17 | 07:05:23   | 9     | 87.6 mph  | 92.2°       | 0          | [View](https://helos.maxandbramble.org/flight/2888?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 108  | 3028      | N622FB   | 2025-01-03 | 03:04:51   | 9     | 89.4 mph  | 78.5°       | 0          | [View](https://helos.maxandbramble.org/flight/3028?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 109  | 3093      | N623FB   | 2024-12-26 | 23:58:24   | 9     | 77.4 mph  | 91.7°       | 0          | [View](https://helos.maxandbramble.org/flight/3093?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 110  | 3144      | N625FB   | 2024-12-21 | 08:56:23   | 9     | 91.0 mph  | 81.3°       | 0          | [View](https://helos.maxandbramble.org/flight/3144?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 111  | 3363      | N623FB   | 2024-11-25 | 00:40:51   | 9     | 75.4 mph  | 131.5°      | 19         | [View](https://helos.maxandbramble.org/flight/3363?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 112  | 3367      | N621FB   | 2024-11-25 | 06:45:46   | 9     | 81.1 mph  | 90.7°       | 0          | [View](https://helos.maxandbramble.org/flight/3367?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 113  | 3429      | N623FB   | 2024-11-24 | 07:32:26   | 9     | 77.9 mph  | 97.6°       | 0          | [View](https://helos.maxandbramble.org/flight/3429?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 114  | 3553      | N623FB   | 2024-11-10 | 04:54:42   | 9     | 79.7 mph  | 93.8°       | 0          | [View](https://helos.maxandbramble.org/flight/3553?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 115  | 3575      | N624FB   | 2024-11-07 | 21:36:44   | 9     | 85.6 mph  | 85.9°       | 1          | [View](https://helos.maxandbramble.org/flight/3575?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 116  | 3592      | N621FB   | 2024-11-05 | 23:35:46   | 9     | 90.1 mph  | 118.7°      | 1          | [View](https://helos.maxandbramble.org/flight/3592?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 117  | 3664      | N624FB   | 2024-10-29 | 20:14:37   | 9     | 79.6 mph  | 79.0°       | 0          | [View](https://helos.maxandbramble.org/flight/3664?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 118  | 3692      | N621FB   | 2024-10-26 | 06:55:53   | 9     | 83.0 mph  | 96.1°       | 0          | [View](https://helos.maxandbramble.org/flight/3692?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 119  | 3703      | N622FB   | 2024-10-24 | 00:42:52   | 9     | 78.7 mph  | 86.8°       | 1          | [View](https://helos.maxandbramble.org/flight/3703?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 120  | 3743      | N622FB   | 2024-10-20 | 02:22:50   | 9     | 75.0 mph  | 107.3°      | 0          | [View](https://helos.maxandbramble.org/flight/3743?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 121  | 3775      | N625FB   | 2024-10-16 | 18:21:00   | 9     | 83.0 mph  | 62.6°       | 0          | [View](https://helos.maxandbramble.org/flight/3775?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 122  | 3802      | N622FB   | 2024-10-13 | 23:56:32   | 9     | 88.7 mph  | 86.7°       | 0          | [View](https://helos.maxandbramble.org/flight/3802?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 123  | 3884      | N622FB   | 2024-10-05 | 00:09:40   | 9     | 76.5 mph  | 85.1°       | 4          | [View](https://helos.maxandbramble.org/flight/3884?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 124  | 3899      | N622FB   | 2024-10-03 | 23:55:35   | 9     | 86.1 mph  | 125.2°      | 10         | [View](https://helos.maxandbramble.org/flight/3899?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 125  | 3957      | N622FB   | 2024-09-27 | 09:05:51   | 9     | 80.6 mph  | 88.0°       | 0          | [View](https://helos.maxandbramble.org/flight/3957?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 126  | 3960      | N624FB   | 2024-09-27 | 03:51:58   | 9     | 87.6 mph  | 87.9°       | 0          | [View](https://helos.maxandbramble.org/flight/3960?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 127  | 3977      | N622FB   | 2024-09-25 | 03:15:15   | 9     | 81.6 mph  | 92.6°       | 0          | [View](https://helos.maxandbramble.org/flight/3977?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 128  | 3994      | N622FB   | 2024-09-23 | 09:07:16   | 9     | 78.9 mph  | 115.5°      | 0          | [View](https://helos.maxandbramble.org/flight/3994?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 129  | 4029      | N621FB   | 2024-09-19 | 07:45:18   | 9     | 89.5 mph  | 122.5°      | 0          | [View](https://helos.maxandbramble.org/flight/4029?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 130  | 4073      | N623FB   | 2024-09-13 | 18:17:44   | 9     | 76.0 mph  | 86.5°       | 0          | [View](https://helos.maxandbramble.org/flight/4073?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 131  | 4082      | N622FB   | 2024-09-13 | 00:49:30   | 9     | 79.5 mph  | 69.3°       | 1          | [View](https://helos.maxandbramble.org/flight/4082?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 132  | 4189      | N625FB   | 2024-09-01 | 04:26:38   | 9     | 87.0 mph  | 87.7°       | 0          | [View](https://helos.maxandbramble.org/flight/4189?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 133  | 4226      | N625FB   | 2024-08-28 | 04:50:00   | 9     | 89.9 mph  | 76.2°       | 0          | [View](https://helos.maxandbramble.org/flight/4226?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 134  | 4228      | N621FB   | 2024-08-27 | 19:17:35   | 9     | 86.2 mph  | 83.2°       | 0          | [View](https://helos.maxandbramble.org/flight/4228?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 135  | 4232      | N624FB   | 2024-08-27 | 07:32:39   | 9     | 88.8 mph  | 84.1°       | 0          | [View](https://helos.maxandbramble.org/flight/4232?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 136  | 4317      | N622FB   | 2024-08-17 | 05:56:00   | 9     | 79.4 mph  | 110.0°      | 26         | [View](https://helos.maxandbramble.org/flight/4317?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 137  | 4326      | N622FB   | 2024-08-16 | 02:38:03   | 9     | 81.9 mph  | 82.4°       | 0          | [View](https://helos.maxandbramble.org/flight/4326?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 138  | 4336      | N625FB   | 2024-08-15 | 07:34:46   | 9     | 78.0 mph  | 97.0°       | 0          | [View](https://helos.maxandbramble.org/flight/4336?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 139  | 4349      | N621FB   | 2024-08-14 | 04:48:31   | 9     | 90.3 mph  | 74.0°       | 0          | [View](https://helos.maxandbramble.org/flight/4349?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 140  | 4374      | N622FB   | 2024-08-10 | 15:52:02   | 9     | 79.2 mph  | 97.9°       | 0          | [View](https://helos.maxandbramble.org/flight/4374?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 141  | 4387      | N625FB   | 2024-08-09 | 19:07:12   | 9     | 83.1 mph  | 85.5°       | 0          | [View](https://helos.maxandbramble.org/flight/4387?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 142  | 4403      | N622FB   | 2024-08-07 | 22:12:17   | 9     | 86.1 mph  | 99.5°       | 14         | [View](https://helos.maxandbramble.org/flight/4403?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 143  | 4459      | N622FB   | 2024-08-01 | 18:57:26   | 9     | 82.6 mph  | 82.8°       | 0          | [View](https://helos.maxandbramble.org/flight/4459?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 144  | 4489      | N621FB   | 2024-07-28 | 15:01:16   | 9     | 91.5 mph  | 80.6°       | 0          | [View](https://helos.maxandbramble.org/flight/4489?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 145  | 4541      | N624FB   | 2024-07-23 | 07:07:50   | 9     | 90.6 mph  | 73.2°       | 0          | [View](https://helos.maxandbramble.org/flight/4541?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 146  | 4556      | N623FB   | 2024-07-20 | 23:57:41   | 9     | 76.0 mph  | 80.9°       | 0          | [View](https://helos.maxandbramble.org/flight/4556?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 147  | 4561      | N623FB   | 2024-07-20 | 06:38:53   | 9     | 86.7 mph  | 123.9°      | 0          | [View](https://helos.maxandbramble.org/flight/4561?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 148  | 4568      | N625FB   | 2024-07-19 | 07:31:24   | 9     | 90.1 mph  | 100.7°      | 0          | [View](https://helos.maxandbramble.org/flight/4568?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 149  | 4607      | N625FB   | 2024-07-13 | 06:12:14   | 9     | 75.1 mph  | 83.6°       | 0          | [View](https://helos.maxandbramble.org/flight/4607?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 150  | 4633      | N623FB   | 2024-07-10 | 08:00:12   | 9     | 84.8 mph  | 87.6°       | 0          | [View](https://helos.maxandbramble.org/flight/4633?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 151  | 4673      | N624FB   | 2024-07-05 | 04:10:06   | 9     | 91.6 mph  | 133.7°      | 3          | [View](https://helos.maxandbramble.org/flight/4673?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 152  | 4773      | N623FB   | 2024-06-24 | 04:18:37   | 9     | 81.8 mph  | 101.8°      | 0          | [View](https://helos.maxandbramble.org/flight/4773?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 153  | 4786      | N623FB   | 2024-06-22 | 07:47:28   | 9     | 78.7 mph  | 92.3°       | 18         | [View](https://helos.maxandbramble.org/flight/4786?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 154  | 4862      | N622FB   | 2024-06-14 | 06:16:38   | 9     | 81.5 mph  | 135.7°      | 16         | [View](https://helos.maxandbramble.org/flight/4862?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 155  | 4911      | N621FB   | 2024-06-08 | 03:52:36   | 9     | 84.2 mph  | 105.5°      | 0          | [View](https://helos.maxandbramble.org/flight/4911?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 156  | 4928      | N622FB   | 2024-06-06 | 06:51:56   | 9     | 80.3 mph  | 105.2°      | 0          | [View](https://helos.maxandbramble.org/flight/4928?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 157  | 4933      | N621FB   | 2024-06-05 | 23:34:15   | 9     | 85.3 mph  | 93.5°       | 0          | [View](https://helos.maxandbramble.org/flight/4933?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 158  | 4951      | N621FB   | 2024-06-03 | 22:20:23   | 9     | 83.2 mph  | 91.0°       | 0          | [View](https://helos.maxandbramble.org/flight/4951?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 159  | 4968      | N622FB   | 2024-06-01 | 05:13:52   | 9     | 77.8 mph  | 93.6°       | 0          | [View](https://helos.maxandbramble.org/flight/4968?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 160  | 5021      | N622FB   | 2024-05-26 | 05:19:00   | 9     | 90.0 mph  | 89.2°       | 0          | [View](https://helos.maxandbramble.org/flight/5021?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 161  | 5056      | N623FB   | 2024-05-21 | 07:44:34   | 9     | 75.1 mph  | 83.0°       | 0          | [View](https://helos.maxandbramble.org/flight/5056?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 162  | 5059      | N623FB   | 2024-05-20 | 01:02:31   | 9     | 86.0 mph  | 102.2°      | 0          | [View](https://helos.maxandbramble.org/flight/5059?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 163  | 5099      | N621FB   | 2024-05-16 | 06:55:32   | 9     | 82.9 mph  | 130.2°      | 9          | [View](https://helos.maxandbramble.org/flight/5099?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 164  | 5103      | N622FB   | 2024-05-15 | 00:16:32   | 9     | 68.9 mph  | 145.0°      | 44         | [View](https://helos.maxandbramble.org/flight/5103?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 165  | 5201      | N624FB   | 2024-05-07 | 06:20:36   | 9     | 90.6 mph  | 90.6°       | 0          | [View](https://helos.maxandbramble.org/flight/5201?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 166  | 5214      | N624FB   | 2024-05-05 | 08:25:27   | 9     | 91.5 mph  | 89.7°       | 0          | [View](https://helos.maxandbramble.org/flight/5214?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 167  | 5219      | N621FB   | 2024-05-05 | 03:23:59   | 9     | 83.8 mph  | 129.4°      | 6          | [View](https://helos.maxandbramble.org/flight/5219?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 168  | 5273      | N621FB   | 2024-04-29 | 03:16:58   | 9     | 82.9 mph  | 81.0°       | 11         | [View](https://helos.maxandbramble.org/flight/5273?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 169  | 5304      | N624FB   | 2024-04-25 | 04:37:23   | 9     | 79.7 mph  | 100.1°      | 0          | [View](https://helos.maxandbramble.org/flight/5304?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 170  | 5325      | N621FB   | 2024-04-23 | 08:41:00   | 9     | 75.4 mph  | 71.6°       | 12         | [View](https://helos.maxandbramble.org/flight/5325?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 171  | 5441      | N624FB   | 2024-04-09 | 05:15:05   | 9     | 83.2 mph  | 79.3°       | 0          | [View](https://helos.maxandbramble.org/flight/5441?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 172  | 5459      | N624FB   | 2024-04-07 | 07:01:57   | 9     | 83.4 mph  | 89.6°       | 0          | [View](https://helos.maxandbramble.org/flight/5459?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 173  | 5503      | N624FB   | 2024-04-02 | 09:34:07   | 9     | 76.5 mph  | 87.1°       | 0          | [View](https://helos.maxandbramble.org/flight/5503?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 174  | 5594      | N622FB   | 2024-03-25 | 06:25:48   | 9     | 79.9 mph  | 74.8°       | 0          | [View](https://helos.maxandbramble.org/flight/5594?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 175  | 5660      | N624FB   | 2024-03-15 | 07:51:48   | 9     | 86.9 mph  | 104.8°      | 2          | [View](https://helos.maxandbramble.org/flight/5660?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 176  | 5667      | N624FB   | 2024-03-13 | 18:49:57   | 9     | 65.7 mph  | 116.0°      | 54         | [View](https://helos.maxandbramble.org/flight/5667?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 177  | 5677      | N622FB   | 2024-03-11 | 04:44:53   | 9     | 86.4 mph  | 96.3°       | 0          | [View](https://helos.maxandbramble.org/flight/5677?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 178  | 5737      | N622FB   | 2024-03-02 | 00:42:24   | 9     | 75.1 mph  | 119.6°      | 17         | [View](https://helos.maxandbramble.org/flight/5737?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 179  | 5800      | N621FB   | 2024-02-23 | 23:22:26   | 9     | 87.2 mph  | 91.8°       | 0          | [View](https://helos.maxandbramble.org/flight/5800?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 180  | 5835      | N621FB   | 2024-02-19 | 04:32:33   | 9     | 76.8 mph  | 71.8°       | 0          | [View](https://helos.maxandbramble.org/flight/5835?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 181  | 5890      | N622FB   | 2024-02-09 | 18:56:47   | 9     | 75.7 mph  | 92.2°       | 0          | [View](https://helos.maxandbramble.org/flight/5890?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 182  | 5902      | N622FB   | 2024-02-06 | 19:33:11   | 9     | 70.9 mph  | 54.9°       | 21         | [View](https://helos.maxandbramble.org/flight/5902?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 183  | 5924      | N622FB   | 2024-02-02 | 23:45:38   | 9     | 91.1 mph  | 72.8°       | 0          | [View](https://helos.maxandbramble.org/flight/5924?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 184  | 5968      | N624FB   | 2024-01-25 | 07:51:36   | 9     | 81.4 mph  | 90.9°       | 0          | [View](https://helos.maxandbramble.org/flight/5968?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 185  | 6011      | N622FB   | 2024-01-19 | 02:57:22   | 9     | 90.5 mph  | 89.2°       | 0          | [View](https://helos.maxandbramble.org/flight/6011?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 186  | 6027      | N621FB   | 2024-01-17 | 07:14:20   | 9     | 86.1 mph  | 60.4°       | 0          | [View](https://helos.maxandbramble.org/flight/6027?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 187  | 6045      | N624FB   | 2024-01-13 | 23:17:39   | 9     | 87.9 mph  | 78.8°       | 0          | [View](https://helos.maxandbramble.org/flight/6045?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 188  | 6050      | N621FB   | 2024-01-13 | 03:25:33   | 9     | 78.1 mph  | 116.8°      | 1          | [View](https://helos.maxandbramble.org/flight/6050?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 189  | 6095      | N624FB   | 2024-01-06 | 04:02:59   | 9     | 86.2 mph  | 94.5°       | 0          | [View](https://helos.maxandbramble.org/flight/6095?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 190  | 6104      | N622FB   | 2024-01-04 | 10:02:17   | 9     | 88.0 mph  | 88.9°       | 4          | [View](https://helos.maxandbramble.org/flight/6104?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 191  | 6225      | N624FB   | 2023-12-17 | 03:03:21   | 9     | 77.7 mph  | 68.9°       | 0          | [View](https://helos.maxandbramble.org/flight/6225?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 192  | 6235      | N622FB   | 2023-12-16 | 07:30:32   | 9     | 82.1 mph  | 107.3°      | 32         | [View](https://helos.maxandbramble.org/flight/6235?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 193  | 6241      | N622FB   | 2023-12-15 | 18:55:32   | 9     | 90.8 mph  | 78.5°       | 0          | [View](https://helos.maxandbramble.org/flight/6241?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 194  | 6285      | N621FB   | 2023-12-10 | 06:57:51   | 9     | 86.8 mph  | 61.9°       | 0          | [View](https://helos.maxandbramble.org/flight/6285?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 195  | 6427      | N622FB   | 2023-11-18 | 04:34:13   | 9     | 77.3 mph  | 88.9°       | 0          | [View](https://helos.maxandbramble.org/flight/6427?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 196  | 6503      | N623FB   | 2023-11-08 | 06:24:24   | 9     | 77.0 mph  | 67.5°       | 0          | [View](https://helos.maxandbramble.org/flight/6503?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 197  | 6517      | N622FB   | 2023-11-06 | 07:14:52   | 9     | 64.3 mph  | 62.6°       | 40         | [View](https://helos.maxandbramble.org/flight/6517?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |
| 198  | 6574      | N622FB   | 2023-10-23 | 15:53:24   | 9     | 79.4 mph  | 72.4°       | 0          | [View](https://helos.maxandbramble.org/flight/6574?searchLat=33.527586&searchLng=-112.0504226&searchRadius=804.67) |

## Recommendations for Legal Case

These flights demonstrate patterns consistent with **targeted surveillance** rather than routine patrol or emergency
response:

1. **Pre-positioning**: Many flights positioned themselves near the target before entering the radius
2. **Loitering behavior**: Extended periods at low speed within 1-2 miles suggests observation
3. **Circling patterns**: High heading variability indicates deliberate circling or orbiting
4. **Repeated visits**: Multiple aircraft visiting the same location with similar patterns

This data could support arguments that:

- Surveillance is **systematic and intentional**, not incidental
- The **frequency and duration** exceeds reasonable patrol activity
- The **specific targeting** of this location violates reasonable privacy expectations
- The patterns are consistent with **warrantless surveillance** prohibited under the Fourth Amendment

## Technical Notes

- All distances calculated using haversine formula
- Analysis window: 5 minutes (300 seconds) before first entry into radius
- Only flights with ≥ 5 position reports in the analysis window are included
- Circular statistics used for heading calculations to handle 0°/360° wrap-around
- Speed conversions: 1 knot = 1.15078 mph
