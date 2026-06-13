"""
Data Integrity Service for Flight Data Protection
Monitors and verifies the integrity of flight data to prevent loss or corruption
"""
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import random
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog
from app.models.flight_positions import FlightPosition  # Use PostGIS-enabled model
from app.models.flight_discoveries import FlightDiscovery

logger = logging.getLogger(__name__)


class DataIntegrityService:
    """Service for monitoring and verifying flight data integrity"""

    def __init__(self):
        self.checksum_cache = {}
        self.alert_callbacks = []

    def calculate_flight_checksum(
        self, flight_log: FlightLog, positions: List[FlightPosition]
    ) -> str:
        """Calculate MD5 checksum for a flight's data"""
        # Create a deterministic string representation of the flight
        flight_data = {
            "flight_id": flight_log.flight_id,
            "departure_time": flight_log.departure_time.isoformat()
            if flight_log.departure_time
            else None,
            "arrival_time": flight_log.arrival_time.isoformat()
            if flight_log.arrival_time
            else None,
            "positions": [],
        }

        # Add sorted positions
        for pos in sorted(positions, key=lambda x: x.timestamp):
            flight_data["positions"].append(
                {
                    "timestamp": pos.timestamp.isoformat(),
                    "lat": round(pos.latitude, 6) if pos.latitude else None,
                    "lon": round(pos.longitude, 6) if pos.longitude else None,
                    "alt": pos.altitude_feet,
                }
            )

        # Create checksum
        data_string = json.dumps(flight_data, sort_keys=True)
        return hashlib.md5(data_string.encode()).hexdigest()

    def verify_flight_integrity(
        self, db: Session, flight_id: str
    ) -> Tuple[bool, Optional[str]]:
        """Verify a single flight's data integrity"""
        try:
            # Get flight log
            flight_log = (
                db.query(FlightLog).filter(FlightLog.flight_id == flight_id).first()
            )
            if not flight_log:
                return False, "Flight not found"

            # Get positions
            positions = (
                db.query(FlightPosition)
                .filter(FlightPosition.flight_log_id == flight_log.id)
                .all()
            )

            # Check for data consistency
            if not positions:
                return False, "No positions found for flight"

            # Check for time gaps
            sorted_positions = sorted(positions, key=lambda x: x.timestamp)
            gaps = []
            for i in range(1, len(sorted_positions)):
                time_diff = (
                    sorted_positions[i].timestamp - sorted_positions[i - 1].timestamp
                ).total_seconds()
                if time_diff > 60:  # More than 60 seconds gap
                    gaps.append(time_diff)

            # Check for impossible speeds (helicopter max ~180 knots)
            invalid_speeds = [
                p
                for p in positions
                if p.ground_speed_knots and p.ground_speed_knots > 200
            ]

            # Check for impossible altitudes (Phoenix area, helicopter ceiling ~20,000 ft)
            invalid_altitudes = [
                p
                for p in positions
                if p.altitude_feet
                and (p.altitude_feet < -500 or p.altitude_feet > 20000)
            ]

            # Calculate checksum
            current_checksum = self.calculate_flight_checksum(flight_log, positions)

            # Report issues
            issues = []
            if gaps:
                issues.append(
                    f"Time gaps detected: {len(gaps)} gaps, largest: {max(gaps):.0f}s"
                )
            if invalid_speeds:
                issues.append(f"Invalid speeds: {len(invalid_speeds)} positions")
            if invalid_altitudes:
                issues.append(f"Invalid altitudes: {len(invalid_altitudes)} positions")

            if issues:
                return False, "; ".join(issues)

            # Store checksum for future comparison
            self.checksum_cache[flight_id] = current_checksum
            return True, current_checksum

        except Exception as e:
            logger.error(f"Error verifying flight {flight_id}: {e}")
            return False, str(e)

    def verify_random_sample(
        self, db: Session, sample_size: int = 10
    ) -> Dict[str, any]:
        """Verify a random sample of flights"""
        results = {
            "verified": 0,
            "failed": 0,
            "errors": [],
            "checksums": {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            # Get random flights
            flight_count = db.query(func.count(FlightLog.id)).scalar()
            if flight_count == 0:
                return results

            # Select random flights
            sample_size = min(sample_size, flight_count)
            all_flights = db.query(FlightLog).all()
            sample_flights = random.sample(all_flights, sample_size)

            for flight in sample_flights:
                valid, result = self.verify_flight_integrity(db, flight.flight_id)
                if valid:
                    results["verified"] += 1
                    results["checksums"][flight.flight_id] = result
                else:
                    results["failed"] += 1
                    results["errors"].append(f"{flight.flight_id}: {result}")

        except Exception as e:
            logger.error(f"Error in random sample verification: {e}")
            results["errors"].append(str(e))

        return results

    def detect_mass_deletion(self, db: Session) -> Optional[Dict[str, any]]:
        """Detect if mass deletion has occurred"""
        try:
            # Get current counts
            current_flights = db.query(func.count(FlightLog.id)).scalar()
            current_positions = db.query(func.count(FlightPosition.id)).scalar()
            current_discoveries = db.query(func.count(FlightDiscovery.id)).scalar()

            # Compare with last known counts (would be stored in a monitoring table)
            # For now, check if counts are suspiciously low
            if current_flights < 10 and current_positions < 100:
                return {
                    "alert": "CRITICAL",
                    "message": "Possible mass deletion detected",
                    "current_flights": current_flights,
                    "current_positions": current_positions,
                    "current_discoveries": current_discoveries,
                }

            return None

        except Exception as e:
            logger.error(f"Error detecting mass deletion: {e}")
            return None

    def validate_position_sequence(self, positions: List[FlightPosition]) -> List[str]:
        """Validate a sequence of positions for consistency"""
        errors = []
        if not positions:
            return errors

        sorted_positions = sorted(positions, key=lambda x: x.timestamp)

        for i in range(1, len(sorted_positions)):
            prev = sorted_positions[i - 1]
            curr = sorted_positions[i]

            # Calculate time difference
            time_diff = (curr.timestamp - prev.timestamp).total_seconds()

            if time_diff > 0:
                # Calculate distance (rough approximation)
                if (
                    prev.latitude
                    and prev.longitude
                    and curr.latitude
                    and curr.longitude
                ):
                    lat_diff = abs(curr.latitude - prev.latitude)
                    lon_diff = abs(curr.longitude - prev.longitude)
                    # Very rough distance in degrees
                    distance = (lat_diff**2 + lon_diff**2) ** 0.5

                    # Check for impossible speed (helicopter can't go faster than ~0.05 degrees/second)
                    speed = distance / time_diff
                    if speed > 0.05:
                        errors.append(
                            f"Impossible speed between positions at {prev.timestamp} and {curr.timestamp}"
                        )

            # Check for altitude changes (helicopters can't climb/descend faster than ~2000 fpm)
            if prev.altitude_feet and curr.altitude_feet and time_diff > 0:
                altitude_change = abs(curr.altitude_feet - prev.altitude_feet)
                max_change = (time_diff / 60) * 2000  # 2000 feet per minute max
                if altitude_change > max_change:
                    errors.append(
                        f"Impossible altitude change at {curr.timestamp}: {altitude_change}ft in {time_diff}s"
                    )

        return errors

    def generate_integrity_report(self, db: Session) -> Dict[str, any]:
        """Generate a comprehensive integrity report"""
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database_stats": {},
            "sample_verification": {},
            "alerts": [],
        }

        try:
            # Get database statistics
            report["database_stats"] = {
                "total_flights": db.query(func.count(FlightLog.id)).scalar(),
                "total_positions": db.query(func.count(FlightPosition.id)).scalar(),
                "total_discoveries": db.query(func.count(FlightDiscovery.id)).scalar(),
                "flights_with_positions": db.query(
                    func.count(func.distinct(FlightPosition.flight_log_id))
                ).scalar(),
            }

            # Verify random sample
            report["sample_verification"] = self.verify_random_sample(db, sample_size=5)

            # Check for mass deletion
            deletion_alert = self.detect_mass_deletion(db)
            if deletion_alert:
                report["alerts"].append(deletion_alert)

            # Check recent flights for issues
            recent_flights = (
                db.query(FlightLog)
                .filter(
                    FlightLog.created_at
                    >= datetime.now(timezone.utc) - timedelta(days=1)
                )
                .all()
            )

            for flight in recent_flights:
                positions = (
                    db.query(FlightPosition)
                    .filter(FlightPosition.flight_log_id == flight.id)
                    .all()
                )

                errors = self.validate_position_sequence(positions)
                if errors:
                    report["alerts"].append(
                        {
                            "flight_id": flight.flight_id,
                            "type": "position_validation",
                            "errors": errors,
                        }
                    )

            return report

        except Exception as e:
            logger.error(f"Error generating integrity report: {e}")
            report["error"] = str(e)
            return report


# Singleton instance
data_integrity_service = DataIntegrityService()
