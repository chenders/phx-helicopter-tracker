"""
Script to fix missing sky_art_segments and position_confidence data for existing sky art patterns
"""
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, joinedload
from app.core.config import settings
from app.models.abnormal_patterns import AbnormalPattern
from app.models.flight_logs import FlightLog, FlightPosition
from app.workers.abnormal_pattern_tasks import calculate_position_confidence, identify_sky_art_segments

def main():
    engine = create_engine(settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://'))
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # Find sky art patterns missing segments data
    patterns = db.query(AbnormalPattern).options(joinedload(AbnormalPattern.flight_log)).filter(
        AbnormalPattern.pattern_type == 'sky_art'
    ).all()
    
    patterns_to_fix = []
    for pattern in patterns:
        if 'sky_art_segments' not in pattern.detection_metadata:
            patterns_to_fix.append(pattern)
    
    print(f"Found {len(patterns_to_fix)} sky art patterns missing segments data")
    
    if not patterns_to_fix:
        print("No patterns need fixing")
        return
    
    # Process all patterns that need fixing
    for i, pattern in enumerate(patterns_to_fix):
        print(f"\\nFixing pattern {pattern.id}...")
        
        # Get flight positions
        positions = db.query(FlightPosition).filter_by(flight_log_id=pattern.flight_log_id).order_by(FlightPosition.timestamp).all()
        
        if not positions:
            print(f"No positions found for flight {pattern.flight_log_id}")
            continue
            
        # Convert to format needed by functions
        pos_dicts = []
        for pos in positions:
            pos_dicts.append({
                'latitude': float(pos.latitude),
                'longitude': float(pos.longitude),
                'timestamp': pos.timestamp.isoformat() if pos.timestamp else None,
                'altitude': pos.altitude_feet,
                'speed': pos.ground_speed_knots
            })
        
        print(f"Processing {len(pos_dicts)} positions...")
        
        # Calculate missing data
        try:
            position_confidence = calculate_position_confidence(pos_dicts, window_size=20, turn_threshold=45.0)
            sky_art_segments = identify_sky_art_segments(pos_dicts, window_size=20, turn_threshold=45.0, min_segment_length=10)
            
            # Update metadata
            metadata = pattern.detection_metadata.copy()
            
            if position_confidence:
                metadata["position_confidence"] = position_confidence
                metadata["avg_confidence"] = sum(position_confidence) / len(position_confidence)
                metadata["max_confidence"] = max(position_confidence)
                metadata["high_confidence_positions"] = sum(1 for c in position_confidence if c > 0.7)
                print(f"Added position confidence: max={max(position_confidence):.3f}, avg={sum(position_confidence)/len(position_confidence):.3f}")
            
            if sky_art_segments:
                metadata["sky_art_segments"] = sky_art_segments
                metadata["total_sky_art_positions"] = sum(seg["length"] for seg in sky_art_segments)
                metadata["num_sky_art_segments"] = len(sky_art_segments)
                print(f"Added {len(sky_art_segments)} sky art segments")
            
            # Save updates
            pattern.detection_metadata = metadata
            db.commit()
            print(f"✅ Updated pattern {pattern.id}")
            
        except Exception as e:
            print(f"❌ Error processing pattern {pattern.id}: {e}")
            db.rollback()
    
    db.close()
    print(f"\\nCompleted fixing patterns")

if __name__ == "__main__":
    main()