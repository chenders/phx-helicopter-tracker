#!/usr/bin/env python3
"""
Test script to verify elevation service functionality
"""

import asyncio
import logging
from app.services.elevation_service import elevation_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_elevation_service():
    """Test elevation service with Phoenix area coordinates"""

    # Test locations in Phoenix area
    test_locations = [
        # Phoenix Sky Harbor Airport (elevation ~1,135 ft)
        (33.4343, -112.0117, "Phoenix Sky Harbor Airport"),

        # Deer Valley Airport (elevation ~1,478 ft)
        (33.6883, -112.0825, "Deer Valley Airport"),

        # Downtown Phoenix (elevation ~1,086 ft)
        (33.4484, -112.0740, "Downtown Phoenix"),

        # Camelback Mountain peak (elevation ~2,704 ft)
        (33.5151, -111.9619, "Camelback Mountain"),

        # South Mountain peak (elevation ~2,690 ft)
        (33.3353, -112.0607, "South Mountain"),
    ]

    try:
        await elevation_service.initialize()

        logger.info("Testing individual elevation lookups...")
        for lat, lon, name in test_locations:
            elevation = await elevation_service.get_elevation(lat, lon)
            logger.info(f"{name}: {elevation} ft (lat: {lat}, lon: {lon})")

        logger.info("\nTesting batch elevation lookup...")
        coordinates = [(lat, lon) for lat, lon, _ in test_locations]
        elevations = await elevation_service.get_elevations_batch(coordinates)

        for (lat, lon, name), coord in zip(test_locations, coordinates):
            elevation = elevations.get(coord)
            logger.info(f"{name}: {elevation} ft")

        # Test AGL calculation
        logger.info("\nTesting AGL calculation...")

        # Helicopter at 2,000 ft MSL over downtown Phoenix
        msl_altitude = 2000
        ground_elevation = 1086  # Downtown Phoenix elevation
        agl = elevation_service.calculate_agl(msl_altitude, ground_elevation)
        logger.info(f"MSL: {msl_altitude} ft, Ground: {ground_elevation} ft, AGL: {agl} ft")

        # Helicopter at 500 ft MSL over Camelback Mountain (should be negative/zero)
        msl_altitude = 500
        ground_elevation = 2704  # Camelback peak
        agl = elevation_service.calculate_agl(msl_altitude, ground_elevation)
        logger.info(f"MSL: {msl_altitude} ft, Ground: {ground_elevation} ft, AGL: {agl} ft")

        logger.info("\nAll tests completed successfully!")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise
    finally:
        await elevation_service.close()


if __name__ == "__main__":
    asyncio.run(test_elevation_service())