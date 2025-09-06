"""
Alert Service for monitoring and notifications
Handles credit usage alerts, surveillance pattern alerts, and system notifications
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings
from app.db.database import SessionLocal

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(Enum):
    """Types of alerts"""

    CREDIT_USAGE = "credit_usage"
    SURVEILLANCE_DETECTED = "surveillance_detected"
    LOW_ALTITUDE = "low_altitude"
    HOVERING = "hovering"
    SYSTEM_ERROR = "system_error"
    DATA_SOURCE_FAILURE = "data_source_failure"


class AlertService:
    """Service for managing alerts and notifications"""

    def __init__(self):
        self.alert_thresholds = {
            "credit_warning": 70,
            "credit_critical": 90,
            "credit_emergency": 95,
            "low_altitude_feet": 400,
            "hover_duration_seconds": 30,
        }

        # Track sent alerts to avoid spam
        self.sent_alerts: Dict[str, datetime] = {}
        self.alert_cooldown_minutes = 60  # Don't repeat same alert for 1 hour

    async def check_credit_usage(self, usage_stats: Dict[str, Any]):
        """Check credit usage and send alerts if needed"""
        percentage = usage_stats.get("monthly_percentage", 0)

        # Determine alert level
        if percentage >= self.alert_thresholds["credit_emergency"]:
            await self.send_alert(
                alert_type=AlertType.CREDIT_USAGE,
                severity=AlertSeverity.CRITICAL,
                title="CRITICAL: FR24 API Credits Nearly Exhausted",
                message=f"Credit usage at {percentage:.1f}%. Only {usage_stats['monthly_remaining']} credits remaining. "
                f"API calls will be severely limited to prevent overage.",
                data=usage_stats,
            )

            # Log critical alert
            logger.critical(f"FR24 API credit usage critical: {percentage:.1f}%")

        elif percentage >= self.alert_thresholds["credit_critical"]:
            await self.send_alert(
                alert_type=AlertType.CREDIT_USAGE,
                severity=AlertSeverity.ERROR,
                title="ERROR: FR24 API Credits Running Low",
                message=f"Credit usage at {percentage:.1f}%. {usage_stats['monthly_remaining']} credits remaining. "
                f"Consider reducing API usage.",
                data=usage_stats,
            )

            logger.error(f"FR24 API credit usage high: {percentage:.1f}%")

        elif percentage >= self.alert_thresholds["credit_warning"]:
            await self.send_alert(
                alert_type=AlertType.CREDIT_USAGE,
                severity=AlertSeverity.WARNING,
                title="Warning: FR24 API Credit Usage Above 70%",
                message=f"Credit usage at {percentage:.1f}%. Monitor usage to avoid hitting limits.",
                data=usage_stats,
            )

            logger.warning(f"FR24 API credit usage warning: {percentage:.1f}%")

    async def check_surveillance_pattern(self, aircraft_data: Dict[str, Any]):
        """Check for surveillance patterns and send alerts"""

        # Check for hovering
        if aircraft_data.get("is_hovering"):
            await self.send_alert(
                alert_type=AlertType.HOVERING,
                severity=AlertSeverity.WARNING,
                title=f"Hovering Detected: {aircraft_data['registration']}",
                message=f"Aircraft {aircraft_data['registration']} is hovering at "
                f"{aircraft_data['altitude_feet']}ft over "
                f"({aircraft_data['latitude']:.4f}, {aircraft_data['longitude']:.4f})",
                data=aircraft_data,
            )

        # Check for low altitude
        if (
            aircraft_data.get("altitude_feet", 9999)
            < self.alert_thresholds["low_altitude_feet"]
        ):
            await self.send_alert(
                alert_type=AlertType.LOW_ALTITUDE,
                severity=AlertSeverity.WARNING,
                title=f"Low Altitude Alert: {aircraft_data['registration']}",
                message=f"Aircraft {aircraft_data['registration']} flying at "
                f"{aircraft_data['altitude_feet']}ft (below 400ft threshold)",
                data=aircraft_data,
            )

        # Check for general surveillance pattern
        if aircraft_data.get("privacy_concern"):
            await self.send_alert(
                alert_type=AlertType.SURVEILLANCE_DETECTED,
                severity=AlertSeverity.INFO,
                title=f"Surveillance Pattern: {aircraft_data['registration']}",
                message=f"Aircraft {aircraft_data['registration']} exhibiting surveillance behavior",
                data=aircraft_data,
            )

    async def send_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send an alert through configured channels"""

        # Check cooldown
        alert_key = f"{alert_type.value}:{title}"
        if alert_key in self.sent_alerts:
            time_since_last = datetime.now() - self.sent_alerts[alert_key]
            if time_since_last < timedelta(minutes=self.alert_cooldown_minutes):
                logger.debug(f"Alert suppressed (cooldown): {alert_key}")
                return False

        # Record alert time
        self.sent_alerts[alert_key] = datetime.now()

        # Store alert in database
        db = SessionLocal()
        try:
            # TODO: Store alert in database
            pass
        finally:
            db.close()

        # Send email if configured
        if settings.ENABLE_REAL_TIME_ALERTS and settings.ALERT_EMAIL:
            await self.send_email_alert(title, message, severity, data)

        # Send to WebSocket for real-time UI updates
        await self.send_websocket_alert(alert_type, severity, title, message, data)

        # Log the alert
        log_message = f"Alert [{severity.value}] {title}: {message}"
        if severity == AlertSeverity.CRITICAL:
            logger.critical(log_message)
        elif severity == AlertSeverity.ERROR:
            logger.error(log_message)
        elif severity == AlertSeverity.WARNING:
            logger.warning(log_message)
        else:
            logger.info(log_message)

        return True

    async def send_email_alert(
        self,
        title: str,
        message: str,
        severity: AlertSeverity,
        data: Optional[Dict[str, Any]] = None,
    ):
        """Send email alert"""
        try:
            # Email configuration would go here
            # This is a placeholder implementation
            logger.info(f"Email alert would be sent: {title}")
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    async def send_websocket_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ):
        """Send alert through WebSocket for real-time UI updates"""
        try:
            from app.services.websocket_manager import websocket_manager

            alert_data = {
                "type": "alert",
                "alert_type": alert_type.value,
                "severity": severity.value,
                "title": title,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "data": data,
            }

            await websocket_manager.broadcast_alert(alert_data)

        except Exception as e:
            logger.error(f"Failed to send WebSocket alert: {e}")

    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get statistics about alerts"""
        db = SessionLocal()
        try:
            # TODO: Query alert statistics from database
            return {
                "total_alerts_today": 0,
                "alerts_by_type": {},
                "alerts_by_severity": {},
                "recent_alerts": [],
            }
        finally:
            db.close()

    async def test_alert_system(self):
        """Test the alert system"""
        logger.info("Testing alert system...")

        # Test credit usage alert
        await self.check_credit_usage(
            {
                "monthly_percentage": 75,
                "monthly_remaining": 15000,
                "monthly_used": 45000,
                "monthly_limit": 60000,
            }
        )

        # Test surveillance alert
        await self.check_surveillance_pattern(
            {
                "registration": "N623FB",
                "altitude_feet": 350,
                "latitude": 33.4484,
                "longitude": -112.0740,
                "is_hovering": True,
                "privacy_concern": True,
            }
        )

        logger.info("Alert system test complete")


# Global alert service instance
alert_service = AlertService()
