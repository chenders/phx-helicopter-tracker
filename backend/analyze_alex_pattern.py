"""
Analyze the ALEX flight pattern to understand its characteristics
and develop better detection criteria
"""
import pandas as pd
import numpy as np
from math import radians, cos, sin, sqrt, atan2
import json

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in meters"""
    R = 6371000  # Earth radius in meters
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Calculate bearing between two points"""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    x = sin(dlon) * cos(lat2)
    y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
    return np.degrees(atan2(x, y)) % 360

def analyze_segment_characteristics(positions, start_idx, end_idx):
    """Analyze characteristics of a flight segment"""
    segment = positions[start_idx:end_idx]
    
    if len(segment) < 3:
        return None
    
    # Calculate turn angles
    bearings = []
    for i in range(len(segment) - 1):
        bearing = calculate_bearing(
            segment[i]['lat'], segment[i]['lon'],
            segment[i+1]['lat'], segment[i+1]['lon']
        )
        bearings.append(bearing)
    
    # Calculate angle changes
    angle_changes = []
    for i in range(len(bearings) - 1):
        change = abs(bearings[i+1] - bearings[i])
        if change > 180:
            change = 360 - change
        angle_changes.append(change)
    
    # Detect sharp turns (>45 degrees)
    sharp_turns = sum(1 for a in angle_changes if a > 45)
    very_sharp_turns = sum(1 for a in angle_changes if a > 90)
    
    # Calculate speed variations
    speeds = [p['speed'] for p in segment]
    speed_std = np.std(speeds) if len(speeds) > 1 else 0
    
    # Calculate path efficiency
    if len(segment) >= 2:
        direct_dist = haversine_distance(
            segment[0]['lat'], segment[0]['lon'],
            segment[-1]['lat'], segment[-1]['lon']
        )
        
        total_dist = 0
        for i in range(len(segment) - 1):
            total_dist += haversine_distance(
                segment[i]['lat'], segment[i]['lon'],
                segment[i+1]['lat'], segment[i+1]['lon']
            )
        
        efficiency = direct_dist / total_dist if total_dist > 0 else 0
    else:
        efficiency = 0
    
    return {
        'sharp_turns': sharp_turns,
        'very_sharp_turns': very_sharp_turns,
        'avg_angle_change': np.mean(angle_changes) if angle_changes else 0,
        'max_angle_change': max(angle_changes) if angle_changes else 0,
        'speed_std': speed_std,
        'efficiency': efficiency,
        'duration': (segment[-1]['timestamp'] - segment[0]['timestamp']) / 60,  # minutes
        'points': len(segment)
    }

def find_letter_patterns(positions):
    """Find segments that might be letters based on pattern characteristics"""
    letter_segments = []
    window_size = 30  # Analyze 30-point windows
    step_size = 5     # Step by 5 points
    
    for i in range(0, len(positions) - window_size, step_size):
        segment_stats = analyze_segment_characteristics(positions, i, i + window_size)
        
        if segment_stats:
            # Letters have specific characteristics:
            # - Multiple sharp turns in a small area
            # - Low efficiency (lots of back and forth)
            # - Relatively consistent altitude
            # - Speed variations as helicopter slows for turns
            
            is_letter_like = (
                segment_stats['sharp_turns'] >= 2 and  # Lowered threshold
                segment_stats['very_sharp_turns'] >= 1 and  # At least one sharp angle
                segment_stats['efficiency'] < 0.5 and  # Less strict efficiency
                segment_stats['avg_angle_change'] > 20  # Focus on angle changes
            )
            
            if is_letter_like:
                letter_segments.append({
                    'start': i,
                    'end': i + window_size,
                    'stats': segment_stats,
                    'confidence': min(1.0, segment_stats['sharp_turns'] / 10)
                })
    
    # Merge overlapping segments
    merged = []
    for seg in letter_segments:
        if not merged or seg['start'] > merged[-1]['end'] + 10:
            merged.append(seg)
        else:
            # Extend the previous segment
            merged[-1]['end'] = max(merged[-1]['end'], seg['end'])
            merged[-1]['confidence'] = max(merged[-1]['confidence'], seg['confidence'])
    
    return merged

def main():
    # Load the ALEX CSV data
    df = pd.read_csv('/app/3b2f4a3c.csv')
    
    # Parse positions
    positions = []
    for _, row in df.iterrows():
        lat, lon = map(float, row['Position'].split(','))
        positions.append({
            'timestamp': row['Timestamp'],
            'lat': lat,
            'lon': lon,
            'alt': row['Altitude'],
            'speed': row['Speed'],
            'direction': row['Direction']
        })
    
    print(f"Analyzing {len(positions)} positions from ALEX flight...")
    
    # Find letter-like segments
    letter_segments = find_letter_patterns(positions)
    
    print(f"\nFound {len(letter_segments)} potential letter segments:")
    for i, seg in enumerate(letter_segments):
        start_time = positions[seg['start']]['timestamp']
        end_time = positions[seg['end']]['timestamp']
        duration = (end_time - start_time) / 60
        print(f"  Segment {i+1}:")
        print(f"    Positions: {seg['start']}-{seg['end']} ({seg['end']-seg['start']} points)")
        print(f"    Duration: {duration:.1f} minutes")
        print(f"    Confidence: {seg['confidence']:.2f}")
        print(f"    Sharp turns: {seg['stats']['sharp_turns']}")
        print(f"    Efficiency: {seg['stats']['efficiency']:.3f}")
    
    # Analyze the entire flight
    print("\n=== Full Flight Analysis ===")
    full_stats = analyze_segment_characteristics(positions, 0, len(positions))
    if full_stats:
        print(f"Total sharp turns: {full_stats['sharp_turns']}")
        print(f"Total very sharp turns: {full_stats['very_sharp_turns']}")
        print(f"Average angle change: {full_stats['avg_angle_change']:.1f}°")
        print(f"Overall efficiency: {full_stats['efficiency']:.4f}")
        print(f"Flight duration: {full_stats['duration']:.1f} minutes")
    
    # Export segments for use in detection algorithm
    segments_data = {
        'flight_id': '3b2f4a3c',
        'total_positions': len(positions),
        'letter_segments': [
            {
                'start_index': seg['start'],
                'end_index': seg['end'],
                'confidence': seg['confidence'],
                'characteristics': seg['stats']
            }
            for seg in letter_segments
        ]
    }
    
    with open('/app/alex_segments_analysis.json', 'w') as f:
        json.dump(segments_data, f, indent=2, default=float)
    
    print("\nAnalysis complete. Results saved to alex_segments_analysis.json")
    
    # Recommendations for algorithm improvement
    print("\n=== RECOMMENDATIONS FOR ALGORITHM IMPROVEMENT ===")
    print("1. Use smaller window sizes (20-30 points) for letter detection")
    print("2. Look for clusters of sharp turns with low efficiency")
    print("3. Consider speed variations as indicator of deliberate maneuvering")
    print("4. Lower confidence threshold to 0.05 for segment detection")
    print("5. Focus on very sharp turns (>90°) as key indicator")

if __name__ == "__main__":
    main()