from .celery_app import celery_app

# from .tracking_tasks import refresh_adsb_data, import_flightradar24_file  # Lazy import
from .analysis_tasks import analyze_flight_patterns, generate_cost_analysis
from .legal_tasks import generate_legal_document

__all__ = [
    "celery_app",
    # "refresh_adsb_data",  # Available via direct import
    # "import_flightradar24_file",  # Available via direct import
    "analyze_flight_patterns",
    "generate_cost_analysis",
    "generate_legal_document",
]
