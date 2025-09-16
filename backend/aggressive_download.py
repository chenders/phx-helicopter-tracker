#!/usr/bin/env python3
"""
Aggressive download script for all pending flight tracks
Downloads as fast as possible while respecting rate limits
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.workers.flight_discovery_tasks import download_tracks_for_discovered_flights
import logging
import time
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Run aggressive download of all pending tracks"""
    logger.info("Starting AGGRESSIVE download mode - downloading all pending flight tracks")
    logger.info("This will download 20 flights per minute (1,200/hour)")
    logger.info("Estimated completion time: ~3 hours for 3,500+ flights")
    
    batch_size = 20  # Download 20 flights at a time
    delay_between_batches = 60  # Wait 60 seconds between batches (rate limit: 30 req/min)
    
    total_downloaded = 0
    start_time = datetime.now()
    
    while True:
        try:
            logger.info(f"Starting batch download of {batch_size} flights...")
            
            # Queue the download task
            task = download_tracks_for_discovered_flights.delay(batch_size=batch_size)
            
            # Wait for completion (with timeout)
            result = task.get(timeout=300)  # 5 minute timeout
            
            if result:
                flights_processed = result.get('flights_processed', 0)
                total_downloaded += flights_processed
                
                if flights_processed == 0:
                    logger.info("No more flights to download! All tracks have been retrieved.")
                    break
                
                logger.info(f"Downloaded {flights_processed} flight tracks in this batch")
                logger.info(f"Total downloaded so far: {total_downloaded}")
                
                # Show progress
                elapsed = (datetime.now() - start_time).total_seconds() / 3600
                rate = total_downloaded / elapsed if elapsed > 0 else 0
                logger.info(f"Current rate: {rate:.0f} flights/hour")
            
            # Wait before next batch to respect rate limits
            logger.info(f"Waiting {delay_between_batches} seconds before next batch...")
            time.sleep(delay_between_batches)
            
        except KeyboardInterrupt:
            logger.info("Download interrupted by user")
            break
        except Exception as e:
            logger.error(f"Error during download: {e}")
            logger.info("Waiting 60 seconds before retrying...")
            time.sleep(60)
    
    # Final summary
    elapsed_total = (datetime.now() - start_time).total_seconds()
    logger.info(f"\n{'='*60}")
    logger.info(f"Download session complete!")
    logger.info(f"Total flights downloaded: {total_downloaded}")
    logger.info(f"Total time: {elapsed_total/3600:.1f} hours")
    logger.info(f"Average rate: {total_downloaded/(elapsed_total/3600):.0f} flights/hour")
    logger.info(f"{'='*60}")

if __name__ == "__main__":
    main()