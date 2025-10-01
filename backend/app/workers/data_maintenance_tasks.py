"""
Data maintenance tasks for backfilling and updating computed fields.
"""
import logging
from typing import Optional
from datetime import datetime
from sqlalchemy import text
from app.db.database import SessionLocal
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="backfill_altitude_agl_values")
def backfill_altitude_agl_values(
    self,
    batch_size: int = 100,
    ground_elevation_feet: int = 1086  # Phoenix average elevation in feet
) -> dict:
    """
    Backfill altitude AGL (Above Ground Level) values for existing flight logs.

    AGL altitude = MSL altitude - ground elevation

    For Phoenix, average elevation is about 1,086 feet (331 meters) above sea level.
    Areas range from about 1,000 feet in some valleys to 1,500+ feet in hillier areas.

    Args:
        batch_size: Number of records to process in each batch
        ground_elevation_feet: Ground elevation to use (default: Phoenix average)

    Returns:
        Dictionary with processing results
    """
    updated_count = 0
    error_count = 0

    try:
        with SessionLocal() as db:
            # Count total flights needing AGL values
            count_query = text("""
                SELECT COUNT(*)
                FROM flight_logs
                WHERE max_altitude_agl_feet IS NULL
                AND max_altitude_feet IS NOT NULL
            """)
            total_count = db.execute(count_query).scalar()

            if total_count == 0:
                logger.info("No flights need AGL altitude backfilling")
                return {
                    "success": True,
                    "updated": 0,
                    "message": "No flights need AGL altitude backfilling"
                }

            logger.info(f"Found {total_count} flights needing AGL altitude values")

            # Process in batches
            offset = 0
            while offset < total_count:
                # Update progress
                if hasattr(self, 'update_state'):
                    self.update_state(
                        state='PROGRESS',
                        meta={
                            'current': offset,
                            'total': total_count,
                            'status': f'Processing batch {offset // batch_size + 1}'
                        }
                    )

                # Update batch of records
                # AGL = MSL altitude - ground elevation
                update_query = text("""
                    UPDATE flight_logs
                    SET
                        max_altitude_agl_feet = GREATEST(0, max_altitude_feet - :ground_elevation),
                        min_altitude_agl_feet = GREATEST(0, min_altitude_feet - :ground_elevation),
                        avg_altitude_agl_feet = GREATEST(0, avg_altitude_feet - :ground_elevation),
                        updated_at = NOW()
                    WHERE id IN (
                        SELECT id
                        FROM flight_logs
                        WHERE max_altitude_agl_feet IS NULL
                        AND max_altitude_feet IS NOT NULL
                        LIMIT :batch_size
                    )
                """)

                result = db.execute(
                    update_query,
                    {
                        "ground_elevation": ground_elevation_feet,
                        "batch_size": batch_size
                    }
                )

                batch_updated = result.rowcount
                updated_count += batch_updated

                # Commit after each batch
                db.commit()

                logger.info(
                    f"Updated {batch_updated} records in batch "
                    f"(total: {updated_count}/{total_count})"
                )

                # If no more records were updated, we're done
                if batch_updated == 0:
                    break

                offset += batch_size

    except Exception as e:
        logger.error(f"Error backfilling AGL altitudes: {str(e)}")
        error_count += 1
        return {
            "success": False,
            "error": str(e),
            "updated": updated_count
        }

    return {
        "success": True,
        "updated": updated_count,
        "errors": error_count,
        "message": f"Successfully backfilled AGL altitudes for {updated_count} flights"
    }


@celery_app.task(bind=True, name="backfill_elevation_data_for_positions")
def backfill_elevation_data_for_positions(
    self,
    batch_size: int = 1000,
    use_google_elevation_api: bool = False
) -> dict:
    """
    Backfill ground elevation data for flight positions.

    This would ideally use Google Elevation API or similar service to get
    accurate ground elevation for each lat/lon position. For now, uses
    a simplified elevation model for Phoenix area.

    Args:
        batch_size: Number of positions to process at once
        use_google_elevation_api: Whether to use Google Elevation API (requires API key)

    Returns:
        Dictionary with processing results
    """
    if use_google_elevation_api:
        logger.warning(
            "Google Elevation API integration not yet implemented. "
            "Using simplified Phoenix elevation model."
        )

    updated_count = 0

    try:
        with SessionLocal() as db:
            # For now, we'll use a simplified approach based on Phoenix topography
            # Downtown/Valley: ~1,086 feet
            # North Mountain area: ~1,400 feet
            # South Mountain foothills: ~1,300 feet
            # Camelback Mountain area: ~1,500 feet

            # Update positions with estimated ground elevation based on location
            # This is a placeholder - ideally would use real elevation data
            update_query = text("""
                UPDATE flight_positions
                SET
                    ground_elevation_feet = CASE
                        -- North Phoenix (higher elevation)
                        WHEN latitude > 33.6 THEN 1400
                        -- South Mountain area
                        WHEN latitude < 33.35 THEN 1300
                        -- Camelback/Arcadia area (higher elevation)
                        WHEN longitude > -111.95 AND latitude BETWEEN 33.5 AND 33.55 THEN 1500
                        -- Default Phoenix valley floor
                        ELSE 1086
                    END,
                    altitude_agl_feet = altitude_feet - CASE
                        WHEN latitude > 33.6 THEN 1400
                        WHEN latitude < 33.35 THEN 1300
                        WHEN longitude > -111.95 AND latitude BETWEEN 33.5 AND 33.55 THEN 1500
                        ELSE 1086
                    END
                WHERE ground_elevation_feet IS NULL
                AND latitude IS NOT NULL
                AND longitude IS NOT NULL
                LIMIT :batch_size
            """)

            while True:
                result = db.execute(update_query, {"batch_size": batch_size})
                batch_updated = result.rowcount

                if batch_updated == 0:
                    break

                updated_count += batch_updated
                db.commit()

                logger.info(f"Updated ground elevation for {batch_updated} positions (total: {updated_count})")

                # Update progress
                if hasattr(self, 'update_state'):
                    self.update_state(
                        state='PROGRESS',
                        meta={
                            'updated': updated_count,
                            'status': f'Processing positions...'
                        }
                    )

    except Exception as e:
        logger.error(f"Error backfilling elevation data: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "updated": updated_count
        }

    return {
        "success": True,
        "updated": updated_count,
        "message": f"Successfully updated elevation data for {updated_count} positions"
    }


@celery_app.task(bind=True, name="compute_agl_statistics_for_flights")
def compute_agl_statistics_for_flights(self, flight_log_id: Optional[int] = None) -> dict:
    """
    Compute accurate AGL statistics for flights based on their position data.

    Args:
        flight_log_id: Specific flight to compute, or None for all flights

    Returns:
        Dictionary with processing results
    """
    try:
        with SessionLocal() as db:
            if flight_log_id:
                where_clause = "WHERE fl.id = :flight_id"
                params = {"flight_id": flight_log_id}
            else:
                where_clause = "WHERE fl.max_altitude_agl_feet IS NULL"
                params = {}

            # Compute AGL statistics from actual position data
            update_query = text(f"""
                UPDATE flight_logs fl
                SET
                    max_altitude_agl_feet = stats.max_agl,
                    min_altitude_agl_feet = stats.min_agl,
                    avg_altitude_agl_feet = stats.avg_agl,
                    updated_at = NOW()
                FROM (
                    SELECT
                        fp.flight_log_id,
                        MAX(fp.altitude_agl_feet) as max_agl,
                        MIN(fp.altitude_agl_feet) as min_agl,
                        AVG(fp.altitude_agl_feet)::INTEGER as avg_agl
                    FROM flight_positions fp
                    WHERE fp.altitude_agl_feet IS NOT NULL
                    GROUP BY fp.flight_log_id
                ) stats
                WHERE fl.id = stats.flight_log_id
                {where_clause}
            """)

            result = db.execute(update_query, params)
            updated_count = result.rowcount
            db.commit()

            return {
                "success": True,
                "updated": updated_count,
                "message": f"Updated AGL statistics for {updated_count} flights"
            }

    except Exception as e:
        logger.error(f"Error computing AGL statistics: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }