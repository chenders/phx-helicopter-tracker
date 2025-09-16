#!/usr/bin/env python3
"""Check the status of flight discovery and track downloads"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog
from sqlalchemy import func, select
from datetime import datetime, timedelta

db = SessionLocal()

# Get discovery stats
total_discovered = db.query(func.count(FlightDiscovery.id)).scalar()
tracks_downloaded = db.query(func.count(FlightDiscovery.id)).filter(FlightDiscovery.track_downloaded == True).scalar()
tracks_pending = db.query(func.count(FlightDiscovery.id)).filter(FlightDiscovery.track_downloaded == False).scalar()

# Get flight logs stats  
total_flight_logs = db.query(func.count(FlightLog.id)).scalar()
logs_with_tracks = db.query(func.count(func.distinct(FlightLog.flight_id))).filter(FlightLog.raw_data.isnot(None)).scalar()

# Get position counts from discovered flights
total_positions = db.query(func.sum(FlightDiscovery.positions_count)).scalar() or 0
avg_positions = db.query(func.avg(FlightDiscovery.positions_count)).filter(FlightDiscovery.positions_count > 0).scalar()

# Get total flight hours from discovered flights
total_flight_hours = db.query(func.sum(FlightDiscovery.flight_duration_minutes)).scalar()
if total_flight_hours:
    total_flight_hours = total_flight_hours / 60

print(f"Flight Discovery Status:")
print(f"  Total discovered flights: {total_discovered:,}")
print(f"  Tracks downloaded: {tracks_downloaded:,} ({tracks_downloaded/total_discovered*100:.1f}%)")
print(f"  Tracks pending: {tracks_pending:,} ({tracks_pending/total_discovered*100:.1f}%)")
print()
print(f"Position Data:")
print(f"  Total positions downloaded: {int(total_positions):,}")
if avg_positions:
    print(f"  Average positions per flight: {avg_positions:.0f}")
print()
print(f"Flight Time:")
if total_flight_hours:
    print(f"  Total flight hours discovered: {total_flight_hours:,.1f} hours")
    print(f"  Estimated total cost: ${total_flight_hours * 2160:,.0f} (at $2,160/hour)")

# Processing rate estimate
if tracks_pending > 0:
    # AGGRESSIVE DOWNLOAD MODE: 20 flights every minute
    flights_per_batch = 20
    minutes_per_batch = 1
    flights_per_hour = (60 / minutes_per_batch) * flights_per_batch  # 1,200 flights/hour
    
    hours = tracks_pending / flights_per_hour
    minutes = hours * 60
    print()
    print(f"Download Progress (AGGRESSIVE MODE):")
    print(f"  Rate: {flights_per_batch} flights every minute ({int(flights_per_hour):,} flights/hour)")
    print(f"  Time to complete remaining: {hours:.1f} hours ({minutes:.0f} minutes)")
    
    completion_date = datetime.now() + timedelta(hours=hours)
    print(f"  🚀 Estimated completion: {completion_date.strftime('%Y-%m-%d %H:%M')}")

db.close()