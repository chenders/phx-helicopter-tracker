"""
Celery tasks for detecting abnormal flight patterns
Identifies potential sky-writing, unnecessary hovering, and other misuse
"""
import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta, timezone
import numpy as np
from scipy.spatial.distance import euclidean
from scipy.signal import find_peaks
import math

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.abnormal_patterns import AbnormalPattern
from sqlalchemy import and_, func, text, not_, exists
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def calculate_path_complexity(positions: List[Tuple[float, float]]) -> Dict[str, float]:
    """
    Calculate various metrics to determine path complexity using sliding window analysis
    High complexity + low efficiency = potential sky-writing
    Enhanced to detect complex patterns like the ALEX skywriting incident
    """
    if len(positions) < 10:
        return {"complexity": 0, "efficiency": 1, "curvature": 0}
    
    # Calculate total distance traveled
    total_distance = 0
    for i in range(1, len(positions)):
        total_distance += euclidean(positions[i-1], positions[i])
    
    # Calculate straight-line distance from start to end
    if len(positions) >= 2:
        direct_distance = euclidean(positions[0], positions[-1])
    else:
        direct_distance = 0
    
    # Path efficiency (straight line would be 1.0)
    efficiency = direct_distance / total_distance if total_distance > 0 else 0
    
    # Helper function to calculate bearing between two points
    def calculate_bearing(lat1, lon1, lat2, lon2):
        """Calculate bearing between two lat/lon points in degrees"""
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlon = lon2 - lon1
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        return math.degrees(math.atan2(x, y))
    
    # SLIDING WINDOW ANALYSIS - Critical for detecting skywriting patterns
    # This method catches complex maneuvers that point-to-point analysis misses
    window_size = min(10, max(3, len(positions) // 20))  # Adaptive window size
    
    sharp_turns_windowed = 0
    reversals_windowed = 0
    angles_windowed = []
    
    # Sliding window analysis for complex patterns
    if len(positions) > window_size * 2:
        for i in range(window_size, len(positions) - window_size):
            # Compare bearing from several points back to several points forward
            bearing_before = calculate_bearing(
                positions[i-window_size][0], positions[i-window_size][1],
                positions[i][0], positions[i][1]
            )
            bearing_after = calculate_bearing(
                positions[i][0], positions[i][1],
                positions[i+window_size][0], positions[i+window_size][1]
            )
            
            # Calculate the change in bearing
            change = abs(bearing_after - bearing_before)
            if change > 180:
                change = 360 - change
            
            angles_windowed.append(math.radians(change))
            
            # Count sharp turns and reversals with windowed analysis
            if change > 45:
                sharp_turns_windowed += 1
            if change > 150:
                reversals_windowed += 1
    
    # POINT-TO-POINT ANALYSIS - Still useful for immediate sharp turns
    angles = []
    sharp_turns_immediate = 0
    reversals_immediate = 0
    
    for i in range(1, len(positions) - 1):
        p1, p2, p3 = positions[i-1], positions[i], positions[i+1]
        
        # Calculate vectors
        v1 = (p2[0] - p1[0], p2[1] - p1[1])
        v2 = (p3[0] - p2[0], p3[1] - p2[1])
        
        # Calculate angle between vectors
        try:
            dot = v1[0]*v2[0] + v1[1]*v2[1]
            det = v1[0]*v2[1] - v1[1]*v2[0]
            angle = math.atan2(det, dot)
            angles.append(abs(angle))
            if abs(angle) > math.pi/4:
                sharp_turns_immediate += 1
        except:
            continue
    
    # Check for immediate reversals
    for i in range(2, len(positions)):
        v1 = (positions[i-1][0] - positions[i-2][0], positions[i-1][1] - positions[i-2][1])
        v2 = (positions[i][0] - positions[i-1][0], positions[i][1] - positions[i-1][1])
        if v1[0]*v2[0] + v1[1]*v2[1] < -0.5:  # Vectors pointing opposite directions
            reversals_immediate += 1
    
    # USE MAXIMUM OF BOTH METHODS - ensures we catch all complex patterns
    sharp_turns = max(sharp_turns_windowed, sharp_turns_immediate)
    reversals = max(reversals_windowed, reversals_immediate)
    
    # Calculate curvature metrics
    all_angles = angles + angles_windowed
    total_curvature = sum(all_angles) if all_angles else 0
    avg_curvature = np.mean(all_angles) if all_angles else 0
    
    # Complexity score (higher = more complex/suspicious)
    complexity = (sharp_turns * 2 + reversals * 3 + total_curvature) / len(positions)
    
    return {
        "complexity": complexity,
        "efficiency": efficiency,
        "total_distance_nm": total_distance,
        "direct_distance_nm": direct_distance,
        "sharp_turns": sharp_turns,
        "reversals": reversals,
        "avg_curvature": avg_curvature,
        "total_curvature": total_curvature,
        "window_size_used": window_size if len(positions) > window_size * 2 else 0,
        "sharp_turns_windowed": sharp_turns_windowed,
        "sharp_turns_immediate": sharp_turns_immediate,
        "reversals_windowed": reversals_windowed,
        "reversals_immediate": reversals_immediate
    }


def detect_hovering_patterns(positions: List[Dict]) -> List[Dict[str, Any]]:
    """
    Detect extended hovering in one location
    """
    hovering_events = []
    
    if len(positions) < 2:
        return hovering_events
    
    # Group positions by proximity (hovering radius ~0.1 nm)
    hover_threshold = 0.1  # nautical miles
    current_hover = {"positions": [], "start_time": None, "end_time": None}
    
    for i, pos in enumerate(positions):
        if not current_hover["positions"]:
            current_hover["positions"].append(pos)
            current_hover["start_time"] = pos.get("timestamp")
            continue
        
        # Check if still hovering (close to average position)
        avg_lat = np.mean([p.get("latitude", 0) for p in current_hover["positions"]])
        avg_lon = np.mean([p.get("longitude", 0) for p in current_hover["positions"]])
        
        distance = euclidean(
            (pos.get("latitude", 0), pos.get("longitude", 0)),
            (avg_lat, avg_lon)
        )
        
        if distance < hover_threshold:
            current_hover["positions"].append(pos)
            current_hover["end_time"] = pos.get("timestamp")
        else:
            # Hovering ended, check if it was significant
            if len(current_hover["positions"]) >= 10:  # At least 10 position reports
                duration = None
                if current_hover["start_time"] and current_hover["end_time"]:
                    try:
                        start = datetime.fromisoformat(current_hover["start_time"])
                        end = datetime.fromisoformat(current_hover["end_time"])
                        duration = (end - start).total_seconds() / 60  # minutes
                    except:
                        pass
                
                if duration and duration > 2:  # More than 2 minutes
                    hovering_events.append({
                        "latitude": avg_lat,
                        "longitude": avg_lon,
                        "duration_minutes": duration,
                        "start_time": current_hover["start_time"],
                        "end_time": current_hover["end_time"],
                        "position_count": len(current_hover["positions"])
                    })
            
            # Start new hover check
            current_hover = {"positions": [pos], "start_time": pos.get("timestamp"), "end_time": None}
    
    return hovering_events


def detect_circling_patterns(positions: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Detect circular flight patterns (repeated orbits around a point)
    """
    if len(positions) < 20:
        return {"circles_detected": 0, "avg_radius": 0}
    
    # Calculate center of mass
    center_lat = np.mean([p[0] for p in positions])
    center_lon = np.mean([p[1] for p in positions])
    
    # Calculate distances from center
    distances = [euclidean(p, (center_lat, center_lon)) for p in positions]
    
    # Check for consistent radius (circular pattern)
    std_dev = np.std(distances)
    mean_dist = np.mean(distances)
    
    # Low standard deviation relative to mean = circular
    if mean_dist > 0:
        circularity = 1 - (std_dev / mean_dist)
    else:
        circularity = 0
    
    # Count complete circles by tracking angle progression
    angles = []
    for pos in positions:
        angle = math.atan2(pos[1] - center_lon, pos[0] - center_lat)
        angles.append(angle)
    
    # Count angle wraps (complete circles)
    total_rotation = 0
    for i in range(1, len(angles)):
        delta = angles[i] - angles[i-1]
        # Handle wrap-around
        if delta > math.pi:
            delta -= 2 * math.pi
        elif delta < -math.pi:
            delta += 2 * math.pi
        total_rotation += delta
    
    complete_circles = abs(total_rotation) / (2 * math.pi)
    
    return {
        "circles_detected": int(complete_circles),
        "circularity_score": circularity,
        "avg_radius_nm": mean_dist,
        "center_lat": center_lat,
        "center_lon": center_lon
    }


@celery_app.task(bind=True, name="detect_abnormal_flight_patterns")
def detect_abnormal_flight_patterns(self,
                                   flight_id: Optional[str] = None,
                                   batch_size: int = 50,
                                   min_complexity_threshold: float = 2.0) -> Dict[str, Any]:
    """
    Analyze flight patterns to detect abnormal behavior like sky-writing
    Processes unanalyzed flights in batches to handle historical data

    Args:
        flight_id: Specific flight to analyze, or None for batch processing
        batch_size: Number of unanalyzed flights to process in this run
        min_complexity_threshold: Minimum complexity score to flag as abnormal
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "flights_analyzed": 0,
        "abnormal_patterns_found": [],
        "flights_skipped": 0,
        "summary": {}
    }

    try:
        # Get flights to analyze
        if flight_id:
            # Analyze specific flight
            query = db.query(FlightLog).filter(FlightLog.flight_id == flight_id)
        else:
            # Get unanalyzed flights - those without an entry in abnormal_patterns table
            # This includes both normal flights and those not yet checked
            subquery = db.query(AbnormalPattern.flight_log_id).subquery()
            query = db.query(FlightLog).filter(
                ~FlightLog.id.in_(subquery)
            ).order_by(FlightLog.departure_time.desc())  # Start with most recent

            # Limit to batch size
            query = query.limit(batch_size)

        flights = query.all()

        # Also count total unanalyzed flights for reporting
        total_unanalyzed = db.query(FlightLog).filter(
            ~FlightLog.id.in_(db.query(AbnormalPattern.flight_log_id))
        ).count()

        logger.info(f"Analyzing {len(flights)} flights for abnormal patterns ({total_unanalyzed} total unanalyzed)")
        
        for flight in flights:
            # Get flight positions
            positions = db.query(FlightPosition).filter(
                FlightPosition.flight_log_id == flight.id
            ).order_by(FlightPosition.timestamp).all()
            
            if len(positions) < 10:
                continue
            
            results["flights_analyzed"] += 1
            
            # Convert positions to tuples for analysis
            pos_tuples = [(p.latitude, p.longitude) for p in positions]
            pos_dicts = [{
                "latitude": p.latitude,
                "longitude": p.longitude,
                "timestamp": p.timestamp.isoformat() if p.timestamp else None,
                "altitude": getattr(p, 'altitude', None)  # altitude may not exist
            } for p in positions]
            
            # Calculate complexity metrics
            complexity_metrics = calculate_path_complexity(pos_tuples)
            
            # Detect hovering
            hovering_events = detect_hovering_patterns(pos_dicts)
            
            # Detect circling
            circling_metrics = detect_circling_patterns(pos_tuples)
            
            # Determine if pattern is abnormal
            is_abnormal = False
            abnormality_reasons = []
            
            # REMOVED - This check was too lenient and causing false positives
            # Sky-writing detection now only uses the more stringent ALEX-pattern check below
            
            # Check for excessive hovering
            total_hover_time = sum(h["duration_minutes"] for h in hovering_events)
            if total_hover_time > 10:  # More than 10 minutes hovering
                is_abnormal = True
                abnormality_reasons.append(f"Excessive hovering: {total_hover_time:.1f} minutes")
            
            # Check for repetitive circling
            if circling_metrics["circles_detected"] > 5:
                is_abnormal = True
                abnormality_reasons.append(f"Repetitive circling: {circling_metrics['circles_detected']} circles")
            
            # Differentiate between TRUE SKY ART and INTENSIVE SURVEILLANCE
            # Based on analysis of real FlightRadar24 sky art examples:
            # - Boeing 787 drawing 787 (18 hours)
            # - Airbus A321XLR drawing "XLR" (3 hours for pattern)
            # - COVID syringe (1h 44min)
            # - ALEX incident (1h 48min)
            
            # Calculate turn rate (turns per minute)
            turn_rate = complexity_metrics["sharp_turns"] / flight.flight_duration_minutes if flight.flight_duration_minutes and flight.flight_duration_minutes > 0 else 0
            
            # SKY ART DETECTION (like ALEX incident)
            # Characteristics: Deliberate patterns with moderate turn rate
            if (complexity_metrics["sharp_turns"] > 50 and 
                complexity_metrics["efficiency"] < 0.05 and
                turn_rate >= 5 and turn_rate <= 15 and  # Sky art: 5-15 turns/minute
                complexity_metrics["reversals"] > 20 and
                flight.flight_duration_minutes and flight.flight_duration_minutes > 40):
                is_abnormal = True
                abnormality_reasons.append(f"Sky art pattern detected (deliberate artistic pattern, {turn_rate:.1f} turns/min)")
            
            # INTENSIVE SURVEILLANCE DETECTION
            # Characteristics: Extremely high turn rate, searching/tracking behavior
            elif (complexity_metrics["sharp_turns"] > 200 and 
                  complexity_metrics["efficiency"] < 0.05 and
                  turn_rate > 18 and  # Surveillance: >18 turns/minute (typically 20-30)
                  flight.flight_duration_minutes and flight.flight_duration_minutes > 60):
                is_abnormal = True
                abnormality_reasons.append(f"Intensive surveillance pattern detected ({turn_rate:.1f} turns/min, {complexity_metrics['sharp_turns']} total turns)")
            
            # Always store analysis results (both normal and abnormal)
            # This allows us to track which flights have been analyzed
            if is_abnormal:
                abnormal_data = {
                    "flight_id": flight.flight_id,
                    "aircraft_id": flight.aircraft_id,
                    "departure_time": flight.departure_time.isoformat() if flight.departure_time else None,
                    "duration_minutes": flight.flight_duration_minutes,
                    "abnormality_reasons": abnormality_reasons,
                    "complexity_metrics": complexity_metrics,
                    "hovering_events": hovering_events,
                    "circling_metrics": circling_metrics,
                    "position_count": len(positions)
                }

                results["abnormal_patterns_found"].append(abnormal_data)

                # Determine pattern type
                pattern_type = "normal"
                if "Sky art" in str(abnormality_reasons):
                    pattern_type = "sky_art"  # Deliberate artistic patterns (like ALEX)
                elif "Intensive surveillance" in str(abnormality_reasons):
                    pattern_type = "intensive_surveillance"  # High-frequency search patterns
                elif "hovering" in str(abnormality_reasons):
                    pattern_type = "excessive_hovering"
                elif "circling" in str(abnormality_reasons):
                    pattern_type = "repetitive_circling"
                elif is_abnormal:
                    pattern_type = "abnormal_path"
            else:
                # Normal flight
                pattern_type = "normal"

            # Store in database (both normal and abnormal for tracking)
            abnormal_pattern = AbnormalPattern(
                flight_log_id=flight.id,
                pattern_type=pattern_type,
                confidence_score=min(complexity_metrics["complexity"] / min_complexity_threshold, 1.0) if is_abnormal else 0.0,
                detection_metadata={
                    "reasons": abnormality_reasons if is_abnormal else ["Normal flight pattern"],
                    "metrics": complexity_metrics,
                    "hovering": hovering_events,
                    "circling": circling_metrics,
                    "analyzed": True  # Mark as analyzed
                },
                detected_at=datetime.now(timezone.utc)
            )
            db.add(abnormal_pattern)
        
        db.commit()
        
        # Summary statistics
        results["summary"] = {
            "total_flights_analyzed": results["flights_analyzed"],
            "abnormal_patterns_found": len(results["abnormal_patterns_found"]),
            "detection_rate": len(results["abnormal_patterns_found"]) / results["flights_analyzed"]
                             if results["flights_analyzed"] > 0 else 0,
            "most_common_abnormality": max(
                [reason for flight in results["abnormal_patterns_found"]
                 for reason in flight.get("abnormality_reasons", [])],
                default="None"
            ) if results["abnormal_patterns_found"] else "None",
            "total_unanalyzed_remaining": total_unanalyzed - results["flights_analyzed"],
            "batch_size": batch_size
        }
        
        logger.info(f"Abnormal pattern detection complete: {len(results['abnormal_patterns_found'])} patterns found")
        
    except Exception as e:
        logger.error(f"Error detecting abnormal patterns: {e}")
        results["error"] = str(e)
    finally:
        db.close()
    
    return results


@celery_app.task(bind=True, name="analyze_alex_incident")
def analyze_alex_incident(self) -> Dict[str, Any]:
    """
    Specifically analyze flights from July 10, 2025 to find the ALEX sky-writing incident
    Aircraft N624FB, departed 11:30 PM, landed 1:17 AM, duration 1h 48m
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "incident_found": False,
        "matching_flights": []
    }
    
    try:
        # Search for flights on July 10-11, 2025
        start_date = datetime(2025, 7, 10, 20, 0, 0, tzinfo=timezone.utc)  # 8 PM UTC (1 PM Phoenix)
        end_date = datetime(2025, 7, 11, 10, 0, 0, tzinfo=timezone.utc)   # 10 AM UTC (3 AM Phoenix)
        
        flights = db.query(FlightLog).filter(
            and_(
                FlightLog.departure_time >= start_date,
                FlightLog.departure_time <= end_date,
                FlightLog.flight_duration_minutes > 90,  # At least 1.5 hours
                FlightLog.flight_duration_minutes < 120  # Less than 2 hours
            )
        ).all()
        
        logger.info(f"Found {len(flights)} flights matching ALEX incident timeframe")
        
        for flight in flights:
            # Analyze this flight
            result = detect_abnormal_flight_patterns.apply_async(
                kwargs={"flight_id": flight.flight_id, "min_complexity_threshold": 1.5}
            ).get(timeout=60)
            
            if result.get("abnormal_patterns_found"):
                pattern = result["abnormal_patterns_found"][0]
                
                # Check if this matches ALEX characteristics
                if (pattern["complexity_metrics"]["sharp_turns"] > 15 and
                    pattern["complexity_metrics"]["efficiency"] < 0.25):
                    
                    results["incident_found"] = True
                    results["matching_flights"].append({
                        "flight_id": flight.flight_id,
                        "aircraft_id": flight.aircraft_id,
                        "departure_time": flight.departure_time.isoformat(),
                        "duration_minutes": flight.flight_duration_minutes,
                        "pattern_analysis": pattern
                    })
                    
                    logger.info(f"Potential ALEX incident match found: {flight.flight_id}")
        
        if not results["incident_found"]:
            logger.info("ALEX incident pattern not found in analyzed flights")
            results["note"] = "Pattern not found - may need to download July 2025 flight data"
    
    except Exception as e:
        logger.error(f"Error analyzing ALEX incident: {e}")
        results["error"] = str(e)
    finally:
        db.close()
    
    return results