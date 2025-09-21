#!/usr/bin/env python3
"""
Download historical flights for Phoenix PD helicopters for a specific date range
Using smaller chunks to avoid timeouts
"""
from app.workers.data_import_tasks import import_fr24_historical_data
from app.services.fr24_rate_limiter import fr24_rate_limiter
from datetime import datetime, date, timedelta
import time

def download_historical_range_chunked():
    """Download historical flights in smaller monthly chunks to avoid timeouts"""
    
    # Phoenix PD helicopter fleet
    aircraft = [
        'N620FB',
        'N621FB',
        'N622FB',
        'N623FB',
        'N624FB',
        'N625FB'
    ]

    print(f"🚁 Phoenix PD Helicopter Historical Flight Download (Chunked)")
    print("=" * 60)
    print(f"Aircraft to download: {', '.join(aircraft)}")
    print(f"Start time: {datetime.now()}")
    print()
    
    # Check current credit balance
    stats = fr24_rate_limiter.get_usage_stats()
    month_data = stats.get('month', {})
    credits_remaining = month_data.get('remaining', 665603)

    print(f"💰 Current Credits: {credits_remaining:,}")
    print()

    # Create monthly chunks to avoid timeouts
    date_ranges = []

    # Split into monthly ranges from Sept 2023 to Sept 2024
    start_dates = [
        ('2023-09-18', '2023-10-31'),  # Sept-Oct 2023
        ('2023-11-01', '2023-12-31'),  # Nov-Dec 2023
        ('2024-01-01', '2024-02-29'),  # Jan-Feb 2024
        ('2024-03-01', '2024-04-30'),  # Mar-Apr 2024
        ('2024-05-01', '2024-06-30'),  # May-Jun 2024
        ('2024-07-01', '2024-08-31'),  # Jul-Aug 2024
        ('2024-09-01', '2024-09-13'),  # Sept 2024 (up to 13th)
    ]

    all_tasks = []

    print(f"📅 Queuing tasks in {len(start_dates)} date chunks to avoid timeouts")
    print("-" * 40)

    for chunk_idx, (start_date, end_date) in enumerate(start_dates, 1):
        print(f"\nChunk {chunk_idx}/{len(start_dates)}: {start_date} to {end_date}")

        for registration in aircraft:
            print(f"  Queuing {registration}...")

            try:
                # Use smaller interval (2 hours) for better chunking
                result = import_fr24_historical_data.delay(
                    registration=registration,
                    start_date=start_date,
                    end_date=end_date,
                    interval_hours=2  # Smaller chunks to avoid timeouts
                )
                all_tasks.append({
                    'registration': registration,
                    'task_id': result.id,
                    'start_date': start_date,
                    'end_date': end_date,
                    'status': 'queued'
                })

                print(f"    ✅ Task ID: {result.id}")

                # Small delay between tasks
                time.sleep(1)

            except Exception as e:
                print(f"    ❌ Error queuing {registration}: {e}")
                all_tasks.append({
                    'registration': registration,
                    'task_id': None,
                    'start_date': start_date,
                    'end_date': end_date,
                    'status': 'error',
                    'error': str(e)
                })

        # Delay between date chunks
        if chunk_idx < len(start_dates):
            print(f"  ⏳ Waiting 5 seconds before next chunk...")
            time.sleep(5)
    
    print(f"\n\n{'=' * 60}")
    print("📋 DOWNLOAD SUMMARY")
    print(f"{'=' * 60}")

    total_queued = sum(1 for t in all_tasks if t['status'] == 'queued')
    print(f"Total tasks queued: {total_queued}")
    print(f"Date ranges: {len(start_dates)}")
    print(f"Aircraft: {len(aircraft)}")

    # Estimate completion
    estimated_flights_per_aircraft_per_month = 60
    total_estimated_flights = estimated_flights_per_aircraft_per_month * len(aircraft) * 12
    credits_per_flight = 110  # Discovery + positions
    total_credits_needed = total_estimated_flights * credits_per_flight

    print(f"\n💳 CREDIT ESTIMATE:")
    print(f"  Estimated total flights: ~{total_estimated_flights:,}")
    print(f"  Credits needed: ~{total_credits_needed:,}")
    print(f"  Credits remaining: {credits_remaining:,}")

    if credits_remaining < total_credits_needed:
        print(f"  ⚠️  Warning: May need additional credits")
    else:
        print(f"  ✅ Sufficient credits available")

    # Time estimate with smaller chunks
    hours_needed = total_estimated_flights * 0.5 / 60  # ~30 seconds per flight with delays

    print(f"\n⏰ TIME ESTIMATE:")
    print(f"  With chunked processing: ~{hours_needed:.1f} hours")
    print(f"  Note: Smaller chunks should avoid timeout issues")

    print(f"\n📝 MONITORING:")
    print("  Check progress with: docker compose logs -f celery")
    print("  Check database with: docker compose exec db psql -U postgres phoenix_helicopters")
    print("  Query: SELECT DATE(first_seen), COUNT(*) FROM flight_discoveries")
    print("         WHERE first_seen >= '2023-09-18' GROUP BY DATE(first_seen) ORDER BY 1;")

    print(f"\n✅ All tasks queued at: {datetime.now()}")

    return all_tasks

if __name__ == "__main__":
    download_historical_range_chunked()