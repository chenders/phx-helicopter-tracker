#!/usr/bin/env python3
"""
Test downloading a single flight to debug position saving
"""
import asyncio
import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from app.db.database import SessionLocal
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog, FlightPosition
from app.services.flightradar24_api_service import fr24_api_service
from app.crud.flights import flight_position_crud
from app.schemas.flights import FlightPositionCreate

async def test_single_flight():
    """Test downloading and saving positions for one flight"""

    db = SessionLocal()

    try:
        # Get one unprocessed flight
        flight = db.query(FlightDiscovery).filter(
            FlightDiscovery.registration == "N623FB",
            FlightDiscovery.track_downloaded == False
        ).first()

        if not flight:
            logger.error("No unprocessed flights found")
            return

        logger.info(f"Testing with flight {flight.fr24_id}")

        async with fr24_api_service:
            # Download track
            positions = await fr24_api_service.get_flight_track(flight.fr24_id)
            logger.info(f"Got {len(positions) if positions else 0} positions")

            if not positions:
                logger.error("No positions returned")
                return

            # Get the flight log
            flight_log = db.query(FlightLog).filter(
                FlightLog.flight_id == f"fr24_complete_{flight.fr24_id}"
            ).first()

            if not flight_log:
                logger.error(f"No flight log found for fr24_complete_{flight.fr24_id}")
                # List all flight logs
                all_logs = db.query(FlightLog).all()
                logger.info(f"Found {len(all_logs)} flight logs total")
                for log in all_logs[:5]:
                    logger.info(f"  - {log.flight_id}")
                return

            logger.info(f"Found flight log id={flight_log.id}")

            # Try to create one position
            pos = positions[0]
            logger.info(f"First position: lat={pos.latitude}, lon={pos.longitude}, alt={pos.altitude_feet}")

            position_data = FlightPositionCreate(
                flight_log_id=flight_log.id,
                aircraft_id=flight_log.aircraft_id,
                timestamp=pos.timestamp,
                latitude=pos.latitude,
                longitude=pos.longitude,
                altitude_feet=pos.altitude_feet,
                ground_speed_knots=pos.ground_speed_knots,
                track_degrees=pos.track_degrees,
                vertical_rate=pos.vertical_speed_fpm,
                data_source="test"
            )

            logger.info(f"Creating position with data: {position_data}")
            created = flight_position_crud.create(db, obj_in=position_data)
            logger.info(f"Created position id={created.id}")

            # Check if it was saved
            count = db.query(FlightPosition).count()
            logger.info(f"Total positions in database: {count}")

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_single_flight())