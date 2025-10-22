from app.db.database import Base
from .aircraft import Aircraft
from .flight_logs import FlightLog
from .flight_positions import FlightPosition  # Use the PostGIS-enabled version
from .flight_discoveries import FlightDiscovery
from .abnormal_patterns import AbnormalPattern
from .legal import LegalDocument, ConstitutionalAnalysis, LegalPrecedent
from .task_history import TaskHistory, TaskEvent, TaskMetrics
from .system_issues import SystemIssue
from .system_logs import SystemLog
from .radio import RadioArchive, RadioTranscription, RadioSegment, RadioKeyword, FlightRadioCorrelation

__all__ = [
    "Base",
    "Aircraft",
    "FlightLog",
    "FlightPosition",
    "FlightDiscovery",
    "AbnormalPattern",
    "LegalDocument",
    "ConstitutionalAnalysis",
    "LegalPrecedent",
    "TaskHistory",
    "TaskEvent",
    "TaskMetrics",
    "SystemIssue",
    "SystemLog",
    "RadioArchive",
    "RadioTranscription",
    "RadioSegment",
    "RadioKeyword",
    "FlightRadioCorrelation",
]
