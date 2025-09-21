#!/usr/bin/env python3
"""
Download all available historical flights for Phoenix PD helicopters
Using the Celery task import_fr24_complete_flights
"""
from app.workers.data_import_tasks import import_fr24_complete_flights
from app.services.fr24_rate_limiter import FR24RateLimiter
import time
from datetime import datetime

def download_all_historical():
    """Download all available historical flights within credit limits"""
    
    # Phoenix PD helicopter fleet
    aircraft = [
        'N620FB',
        'N621FB', 
        'N622FB',
        'N623FB',
        'N624FB',
        'N625FB'
    ]
    
    # Maximum days back (FR24 typically allows up to 365 days for Gold accounts)
    max_days_back = 365
    
    print(f"🚁 Phoenix PD Helicopter Historical Flight Download")
    print("=" * 60)
    print(f"Aircraft to download: {', '.join(aircraft)}")
    print(f"Days back: {max_days_back}")
    print(f"Start time: {datetime.now()}")
    print()
    
    # Check current credit balance
    limiter = FR24RateLimiter()
    stats = limiter.get_usage_stats()
    month_data = stats.get('month', {})
    credits_remaining = month_data.get('remaining', 565506)
    
    print(f"💰 Current Credits: {credits_remaining:,}")
    print(f"📊 Estimated credits per aircraft: ~5,000-10,000")
    print(f"📈 Total estimated: ~{len(aircraft) * 7500:,} credits")
    print()
    
    if credits_remaining < 50000:
        print("⚠️  Warning: Low credit balance. Proceeding with caution...")
        max_days_back = 180  # Reduce to 6 months if low on credits
        print(f"   Reducing to {max_days_back} days to conserve credits")
        print()
    
    results = []
    
    for i, registration in enumerate(aircraft, 1):
        print(f"\n[{i}/{len(aircraft)}] Processing {registration}")
        print("-" * 40)
        
        try:
            # Trigger the Celery task
            print(f"  📡 Queuing download task for {registration} ({max_days_back} days)...")
            result = import_fr24_complete_flights.delay(
                registration=registration,
                days_back=max_days_back
            )
            
            results.append({
                'registration': registration,
                'task_id': result.id,
                'status': 'queued'
            })
            
            print(f"  ✅ Task queued: {result.id}")
            
            # Check credit usage after each aircraft
            stats = limiter.get_usage_stats()
            month_data = stats.get('month', {})
            new_remaining = month_data.get('remaining', credits_remaining)
            credits_used = credits_remaining - new_remaining
            
            if credits_used > 0:
                print(f"  💳 Credits used for {registration}: {credits_used:,}")
                credits_remaining = new_remaining
                print(f"  💰 Credits remaining: {credits_remaining:,}")
            
            # Stop if running low on credits
            if credits_remaining < 10000:
                print(f"\n⚠️  LOW CREDIT WARNING: Only {credits_remaining:,} credits remaining!")
                print("  Stopping download to preserve credits.")
                break
            
            # Small delay between aircraft to avoid overwhelming the API
            if i < len(aircraft):
                print(f"  ⏳ Waiting 10 seconds before next aircraft...")
                time.sleep(10)
                
        except Exception as e:
            print(f"  ❌ Error queuing {registration}: {e}")
            results.append({
                'registration': registration,
                'task_id': None,
                'status': 'error',
                'error': str(e)
            })
    
    print(f"\n\n{'=' * 60}")
    print("📋 DOWNLOAD SUMMARY")
    print(f"{'=' * 60}")
    
    for r in results:
        status_icon = "✅" if r['status'] == 'queued' else "❌"
        print(f"{status_icon} {r['registration']}: {r['status']}")
        if r.get('task_id'):
            print(f"   Task ID: {r['task_id']}")
    
    # Final credit check
    stats = limiter.get_usage_stats()
    month_data = stats.get('month', {})
    final_remaining = month_data.get('remaining', credits_remaining)
    total_used = 565506 - final_remaining
    
    print(f"\n💳 CREDIT USAGE:")
    print(f"  Starting balance: 565,506")
    print(f"  Credits used: {total_used:,}")
    print(f"  Final balance: {final_remaining:,}")
    
    print(f"\n⏰ Completed at: {datetime.now()}")
    print("\n📝 Note: Tasks are running in the background via Celery.")
    print("   Check the logs for download progress:")
    print("   docker compose logs -f celery_worker")
    
    return results

if __name__ == "__main__":
    download_all_historical()