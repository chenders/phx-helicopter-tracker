"""
Improved sky art detection algorithm based on ALEX pattern analysis
"""
import numpy as np
from math import radians, cos, sin, sqrt, atan2
from typing import List, Dict, Any, Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters"""
    R = 6371000  # Earth radius in meters
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing between two points in degrees"""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    x = sin(dlon) * cos(lat2)
    y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
    return np.degrees(atan2(x, y)) % 360

def detect_concentrated_activity(positions: List[Dict], window_size: int = 100) -> List[Dict]:
    """
    Detect areas of concentrated activity that might be sky art.
    Looking for dense movements in small geographic areas.
    """
    segments = []
    
    for i in range(0, len(positions) - window_size, 25):
        window = positions[i:i + window_size]
        
        # Calculate geographic extent
        lats = [p['latitude'] for p in window]
        lons = [p['longitude'] for p in window]
        
        lat_range = max(lats) - min(lats)
        lon_range = max(lons) - min(lons)
        
        # Calculate complexity within window
        total_distance = 0
        bearing_changes = []
        prev_bearing = None
        
        for j in range(len(window) - 1):
            dist = haversine_distance(
                window[j]['latitude'], window[j]['longitude'],
                window[j+1]['latitude'], window[j+1]['longitude']
            )
            total_distance += dist
            
            bearing = calculate_bearing(
                window[j]['latitude'], window[j]['longitude'],
                window[j+1]['latitude'], window[j+1]['longitude']
            )
            
            if prev_bearing is not None:
                change = abs(bearing - prev_bearing)
                if change > 180:
                    change = 360 - change
                bearing_changes.append(change)
            prev_bearing = bearing
        
        # Direct distance from start to end
        direct_dist = haversine_distance(
            window[0]['latitude'], window[0]['longitude'],
            window[-1]['latitude'], window[-1]['longitude']
        )
        
        # Efficiency (low = complex pattern)
        efficiency = direct_dist / total_distance if total_distance > 0 else 0
        
        # Count significant bearing changes
        significant_changes = sum(1 for c in bearing_changes if c > 30)
        
        # Sky art characteristics:
        # 1. Small geographic area (but not too small - needs room to draw)
        # 2. Low efficiency (lots of back and forth)
        # 3. Many bearing changes
        # 4. Reasonable total distance covered
        is_concentrated = (
            lat_range > 0.0005 and lat_range < 0.02 and  # ~55m to 2.2km
            lon_range > 0.0005 and lon_range < 0.02 and
            efficiency < 0.3 and  # Indirect path
            significant_changes > 10 and  # Many direction changes
            total_distance > 1000  # At least 1km of movement
        )
        
        if is_concentrated:
            confidence = min(1.0, (significant_changes / 30) * (1 - efficiency) * 0.8)
            segments.append({
                'start': i,
                'end': i + window_size,
                'confidence': confidence,
                'lat_range': lat_range,
                'lon_range': lon_range,
                'efficiency': efficiency,
                'bearing_changes': significant_changes,
                'total_distance': total_distance
            })
    
    # Merge overlapping segments
    merged = []
    for seg in segments:
        if not merged or seg['start'] > merged[-1]['end']:
            merged.append(seg)
        elif seg['confidence'] > merged[-1]['confidence']:
            # Replace with higher confidence segment
            merged[-1] = seg
    
    return merged

def identify_improved_sky_art_segments(
    positions: List[Dict],
    min_segment_length: int = 50,
    confidence_threshold: float = 0.3
) -> List[Dict]:
    """
    Improved sky art segment detection based on ALEX pattern analysis.
    """
    # Detect concentrated activity areas
    concentrated_segments = detect_concentrated_activity(positions, window_size=100)
    
    # Also check smaller windows for individual letters
    letter_segments = detect_concentrated_activity(positions, window_size=50)
    
    # Combine and deduplicate
    all_segments = concentrated_segments + letter_segments
    all_segments.sort(key=lambda x: x['start'])
    
    # Final filtering and formatting
    final_segments = []
    for seg in all_segments:
        if seg['confidence'] >= confidence_threshold:
            length = seg['end'] - seg['start']
            if length >= min_segment_length:
                final_segments.append({
                    'start': seg['start'],
                    'end': seg['end'],
                    'confidence': round(seg['confidence'], 3),
                    'length': length,
                    'characteristics': {
                        'geographic_extent': f"{seg['lat_range']:.4f} x {seg['lon_range']:.4f}",
                        'efficiency': round(seg['efficiency'], 3),
                        'bearing_changes': seg['bearing_changes'],
                        'distance_covered': round(seg['total_distance'], 0)
                    }
                })
    
    return final_segments

def calculate_improved_position_confidence(
    positions: List[Dict],
    segments: List[Dict] = None
) -> List[float]:
    """
    Calculate per-position confidence for sky art detection.
    Higher confidence for positions within detected segments.
    """
    confidence = [0.0] * len(positions)
    
    if not segments:
        segments = identify_improved_sky_art_segments(positions)
    
    for seg in segments:
        segment_conf = seg['confidence']
        start = seg['start']
        end = seg['end']
        
        # Apply confidence to all positions in segment
        for i in range(start, min(end, len(positions))):
            confidence[i] = max(confidence[i], segment_conf)
        
        # Gradual falloff at edges
        falloff_range = 10
        for i in range(max(0, start - falloff_range), start):
            dist_factor = (i - (start - falloff_range)) / falloff_range
            confidence[i] = max(confidence[i], segment_conf * dist_factor * 0.5)
        
        for i in range(end, min(len(positions), end + falloff_range)):
            dist_factor = 1 - ((i - end) / falloff_range)
            confidence[i] = max(confidence[i], segment_conf * dist_factor * 0.5)
    
    return confidence

def test_on_alex_flight():
    """Test the improved algorithm on the ALEX flight data"""
    import pandas as pd
    
    df = pd.read_csv('/app/3b2f4a3c.csv')
    
    # Convert to position format
    positions = []
    for _, row in df.iterrows():
        lat, lon = map(float, row['Position'].split(','))
        positions.append({
            'latitude': lat,
            'longitude': lon,
            'altitude': row['Altitude'],
            'speed': row['Speed'],
            'timestamp': row['UTC']
        })
    
    print(f"Testing on {len(positions)} positions from ALEX flight...")
    
    # Detect segments
    segments = identify_improved_sky_art_segments(positions)
    
    print(f"\nFound {len(segments)} sky art segments:")
    for i, seg in enumerate(segments):
        duration = seg['end'] - seg['start']
        print(f"\nSegment {i+1}:")
        print(f"  Positions: {seg['start']}-{seg['end']} ({duration} points)")
        print(f"  Confidence: {seg['confidence']}")
        print(f"  Geographic extent: {seg['characteristics']['geographic_extent']}")
        print(f"  Efficiency: {seg['characteristics']['efficiency']}")
        print(f"  Bearing changes: {seg['characteristics']['bearing_changes']}")
        print(f"  Distance covered: {seg['characteristics']['distance_covered']}m")
    
    # Calculate position confidence
    confidence = calculate_improved_position_confidence(positions, segments)
    high_conf_positions = sum(1 for c in confidence if c > 0.5)
    
    print(f"\nPosition confidence:")
    print(f"  High confidence positions: {high_conf_positions}")
    print(f"  Max confidence: {max(confidence):.3f}")
    print(f"  Average confidence: {sum(confidence)/len(confidence):.3f}")
    
    return segments, confidence

if __name__ == "__main__":
    segments, confidence = test_on_alex_flight()