#!/usr/bin/env python3
"""
Flight Data Verification Script
Runs daily to verify integrity of flight data and detect anomalies
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.db.database import SessionLocal
from app.services.data_integrity_service import data_integrity_service

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Run data verification checks"""
    print("\n" + "="*60)
    print("FLIGHT DATA VERIFICATION REPORT")
    print(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    print("="*60 + "\n")

    db = SessionLocal()
    try:
        # Generate integrity report
        logger.info("Generating integrity report...")
        report = data_integrity_service.generate_integrity_report(db)

        # Display database statistics
        print("DATABASE STATISTICS:")
        print("-" * 30)
        stats = report.get('database_stats', {})
        print(f"  Total Flights: {stats.get('total_flights', 0)}")
        print(f"  Total Positions: {stats.get('total_positions', 0)}")
        print(f"  Total Discoveries: {stats.get('total_discoveries', 0)}")
        print(f"  Flights with Positions: {stats.get('flights_with_positions', 0)}")
        print()

        # Display sample verification results
        print("SAMPLE VERIFICATION:")
        print("-" * 30)
        sample = report.get('sample_verification', {})
        print(f"  Verified: {sample.get('verified', 0)}")
        print(f"  Failed: {sample.get('failed', 0)}")
        if sample.get('errors'):
            print("  Errors:")
            for error in sample['errors'][:5]:  # Show first 5 errors
                print(f"    - {error}")
        print()

        # Display alerts
        if report.get('alerts'):
            print("⚠️  ALERTS:")
            print("-" * 30)
            for alert in report['alerts']:
                if isinstance(alert, dict):
                    alert_type = alert.get('type', alert.get('alert', 'Unknown'))
                    print(f"  [{alert_type}]")
                    if 'message' in alert:
                        print(f"    {alert['message']}")
                    if 'errors' in alert:
                        for error in alert['errors'][:3]:
                            print(f"      - {error}")
                else:
                    print(f"    - {alert}")
            print()

        # Save report to file
        reports_dir = Path("/home/phx/phx-helicopter-tracker/backups/integrity_reports")
        reports_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_file = reports_dir / f"integrity_report_{timestamp}.json"

        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"✓ Report saved to: {report_file}")

        # Check overall status
        has_critical_alerts = any(
            alert.get('alert') == 'CRITICAL'
            for alert in report.get('alerts', [])
            if isinstance(alert, dict)
        )

        if has_critical_alerts:
            print("\n❌ CRITICAL ISSUES DETECTED - IMMEDIATE ACTION REQUIRED")
            sys.exit(1)
        elif report.get('alerts'):
            print("\n⚠️  Some issues detected - review recommended")
            sys.exit(0)
        else:
            print("\n✅ All checks passed - data integrity verified")
            sys.exit(0)

    except Exception as e:
        logger.error(f"Verification failed: {e}")
        print(f"\n❌ ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()