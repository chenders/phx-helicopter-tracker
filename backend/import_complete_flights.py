#!/usr/bin/env python3
"""
Import complete flight tracks for all Phoenix PD helicopters
This gets ALL position data for legal documentation
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.workers.data_import_tasks import import_fr24_complete_flights
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PHOENIX_PD_REGISTRATIONS = [
    "N621FB", "N622FB", "N623FB", "N624FB", 
    "N625FB", "N626FB", "N627FB", "N628FB"
]

def main():
    """Import complete flight tracks for all Phoenix PD helicopters"""
    days_back = 7  # Import last 7 days
    
    logger.info(f"Starting complete flight import for {len(PHOENIX_PD_REGISTRATIONS)} aircraft")
    logger.info("This will get COMPLETE flight tracks with ALL positions for legal documentation")
    
    tasks = []
    for registration in PHOENIX_PD_REGISTRATIONS:
        logger.info(f"Queueing import for {registration} (last {days_back} days)")
        task = import_fr24_complete_flights.delay(registration, days_back)
        tasks.append((registration, task))
    
    logger.info(f"Queued {len(tasks)} import tasks")
    
    # Monitor tasks
    import time
    while tasks:
        time.sleep(5)
        remaining = []
        for reg, task in tasks:
            if task.ready():
                if task.successful():
                    result = task.result
                    logger.info(
                        f"✅ {reg}: Imported {result.get('flights_imported', 0)} flights, "
                        f"{result.get('positions_imported', 0)} positions"
                    )
                    if result.get('errors'):
                        logger.warning(f"   Errors: {result['errors']}")
                else:
                    logger.error(f"❌ {reg}: Task failed - {task.info}")
            else:
                remaining.append((reg, task))
        
        if remaining:
            logger.info(f"Waiting for {len(remaining)} tasks to complete...")
            tasks = remaining
        else:
            break
    
    logger.info("All import tasks completed!")
    logger.info("Run database queries to verify we have hundreds of positions per flight")

if __name__ == "__main__":
    main()