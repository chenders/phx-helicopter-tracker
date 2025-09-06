#!/usr/bin/env python3
"""Initialize database tables from SQLAlchemy models - simplified version."""

from sqlalchemy import create_engine
from app.models import Base
# Import all models to ensure they're registered with Base
from app.models import (
    Aircraft, FlightLog, FlightPosition, 
    LegalDocument, ConstitutionalAnalysis, LegalPrecedent,
    TaskHistory, TaskEvent, TaskMetrics
)

def init_db():
    """Create all tables defined in the models."""
    # Use the Docker internal connection
    database_url = "postgresql://postgres:postgres@db:5432/phoenix_helicopters"
    
    engine = create_engine(database_url, echo=True)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
    
    engine.dispose()

if __name__ == "__main__":
    init_db()