import asyncio
import aiohttp
import json
import csv
import io
import zipfile
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import logging
from urllib.parse import urlencode
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class DownloadRequest:
    """FlightRadar24 download request parameters"""

    aircraft_registration: str
    start_date: datetime
    end_date: datetime
    format: str = "json"  # json, csv, kml


@dataclass
class DownloadResult:
    """FlightRadar24 download result"""

    success: bool
    data: Optional[bytes] = None
    filename: Optional[str] = None
    error_message: Optional[str] = None
    flights_count: Optional[int] = None


class FlightRadar24Downloader:
    """Automated FlightRadar24 historical data downloader using web scraping"""

    def __init__(self):
        self.base_url = "https://www.flightradar24.com"
        self.session = None
        self.logged_in = False

    async def _create_session(self) -> aiohttp.ClientSession:
        """Create aiohttp session with proper headers"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        connector = aiohttp.TCPConnector(limit=10, limit_per_host=3)
        timeout = aiohttp.ClientTimeout(total=60, connect=10)

        return aiohttp.ClientSession(
            headers=headers,
            connector=connector,
            timeout=timeout,
            cookie_jar=aiohttp.CookieJar(),
        )

    async def login(self) -> bool:
        """Login to FlightRadar24 using credentials from environment"""
        if not settings.FR24_USERNAME or not settings.FR24_PASSWORD:
            logger.error("FlightRadar24 credentials not found in environment")
            return False

        if not self.session:
            self.session = await self._create_session()

        try:
            # Get login page to extract CSRF token
            async with self.session.get(f"{self.base_url}/user/login") as response:
                if response.status != 200:
                    logger.error(f"Failed to access login page: {response.status}")
                    return False

                html = await response.text()
                soup = BeautifulSoup(html, "html.parser")

                # Find CSRF token
                csrf_token = None
                for meta in soup.find_all("meta"):
                    if meta.get("name") == "csrf-token":
                        csrf_token = meta.get("content")
                        break

                if not csrf_token:
                    # Try to find it in a form
                    csrf_input = soup.find("input", {"name": "_token"})
                    if csrf_input:
                        csrf_token = csrf_input.get("value")

            # Login payload
            login_data = {
                "email": settings.FR24_USERNAME,
                "password": settings.FR24_PASSWORD,
                "remember": "1",
            }

            if csrf_token:
                login_data["_token"] = csrf_token

            # Submit login form
            login_headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": f"{self.base_url}/user/login",
            }

            async with self.session.post(
                f"{self.base_url}/user/login",
                data=login_data,
                headers=login_headers,
                allow_redirects=True,
            ) as response:
                # Check if login was successful
                if response.status == 200:
                    # Verify we're logged in by checking for user account indicators
                    html = await response.text()
                    if "logout" in html.lower() or "account" in html.lower():
                        self.logged_in = True
                        logger.info("Successfully logged into FlightRadar24")
                        return True

                logger.error(f"Login failed with status: {response.status}")
                return False

        except Exception as e:
            logger.error(f"Login failed with error: {str(e)}")
            return False

    async def search_aircraft_flights(
        self, aircraft_registration: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Search for flights of a specific aircraft in date range"""
        if not self.logged_in:
            if not await self.login():
                return []

        try:
            # Format dates for FlightRadar24 API
            start_str = start_date.strftime("%Y-%m-%d")
            end_str = end_date.strftime("%Y-%m-%d")

            # Search URL - this might need adjustment based on FR24's actual API
            search_params = {
                "query": aircraft_registration,
                "from": start_str,
                "to": end_str,
                "type": "aircraft",
            }

            search_url = f"{self.base_url}/v1/search/web/find?" + urlencode(
                search_params
            )

            async with self.session.get(search_url) as response:
                if response.status != 200:
                    logger.error(f"Search failed with status: {response.status}")
                    return []

                data = await response.json()

                # Extract flight data from response
                flights = []
                if "results" in data:
                    for result in data["results"]:
                        if result.get("type") == "aircraft" and result.get("id"):
                            flights.append(result)

                logger.info(f"Found {len(flights)} flights for {aircraft_registration}")
                return flights

        except Exception as e:
            logger.error(f"Aircraft search failed: {str(e)}")
            return []

    async def download_flight_data(
        self, flight_id: str, format: str = "json"
    ) -> Optional[bytes]:
        """Download detailed flight data for a specific flight"""
        if not self.logged_in:
            if not await self.login():
                return None

        try:
            # FlightRadar24 flight data URL
            if format.lower() == "kml":
                url = f"{self.base_url}/v1/flight/{flight_id}/kml"
            elif format.lower() == "csv":
                url = f"{self.base_url}/v1/flight/{flight_id}/csv"
            else:
                url = f"{self.base_url}/v1/flight/{flight_id}/track"

            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.read()
                else:
                    logger.error(f"Failed to download flight data: {response.status}")
                    return None

        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
            return None

    async def download_aircraft_history(
        self, request: DownloadRequest
    ) -> DownloadResult:
        """Download complete historical data for an aircraft"""
        try:
            logger.info(
                f"Starting download for {request.aircraft_registration} "
                f"from {request.start_date} to {request.end_date}"
            )

            # Search for flights
            flights = await self.search_aircraft_flights(
                request.aircraft_registration, request.start_date, request.end_date
            )

            if not flights:
                return DownloadResult(
                    success=False,
                    error_message=f"No flights found for {request.aircraft_registration}",
                )

            # Download data for each flight
            all_flight_data = []

            for flight in flights:
                flight_id = flight.get("id")
                if flight_id:
                    flight_data = await self.download_flight_data(
                        flight_id, request.format
                    )
                    if flight_data:
                        if request.format.lower() == "json":
                            try:
                                parsed_data = json.loads(flight_data.decode("utf-8"))
                                all_flight_data.append(parsed_data)
                            except json.JSONDecodeError:
                                logger.warning(
                                    f"Failed to parse JSON for flight {flight_id}"
                                )
                        else:
                            all_flight_data.append(flight_data)

            if not all_flight_data:
                return DownloadResult(
                    success=False, error_message="No flight data could be downloaded"
                )

            # Combine all flight data
            if request.format.lower() == "json":
                combined_data = {
                    "aircraft_registration": request.aircraft_registration,
                    "date_range": {
                        "start": request.start_date.isoformat(),
                        "end": request.end_date.isoformat(),
                    },
                    "flights": all_flight_data,
                    "download_timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "flightradar24_gold",
                }
                data_bytes = json.dumps(combined_data, indent=2).encode("utf-8")
                filename = f"{request.aircraft_registration}_{request.start_date.strftime('%Y%m%d')}-{request.end_date.strftime('%Y%m%d')}.json"

            elif request.format.lower() == "csv":
                # Combine CSV data
                output = io.StringIO()
                csv_writer = csv.writer(output)

                # Write header
                csv_writer.writerow(
                    [
                        "timestamp",
                        "latitude",
                        "longitude",
                        "altitude_feet",
                        "ground_speed_knots",
                        "track_degrees",
                        "aircraft_registration",
                    ]
                )

                # Process all flight data
                for flight_data in all_flight_data:
                    if isinstance(flight_data, bytes):
                        # Parse CSV data if needed
                        csv_content = flight_data.decode("utf-8")
                        csv_reader = csv.DictReader(io.StringIO(csv_content))
                        for row in csv_reader:
                            csv_writer.writerow(
                                [
                                    row.get("timestamp", ""),
                                    row.get("latitude", ""),
                                    row.get("longitude", ""),
                                    row.get("altitude", ""),
                                    row.get("speed", ""),
                                    row.get("track", ""),
                                    request.aircraft_registration,
                                ]
                            )

                data_bytes = output.getvalue().encode("utf-8")
                filename = f"{request.aircraft_registration}_{request.start_date.strftime('%Y%m%d')}-{request.end_date.strftime('%Y%m%d')}.csv"

            else:  # KML
                # Combine KML files - simplified approach
                data_bytes = b"\n".join(all_flight_data)
                filename = f"{request.aircraft_registration}_{request.start_date.strftime('%Y%m%d')}-{request.end_date.strftime('%Y%m%d')}.kml"

            return DownloadResult(
                success=True,
                data=data_bytes,
                filename=filename,
                flights_count=len(flights),
            )

        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
            return DownloadResult(success=False, error_message=str(e))

    async def download_multiple_aircraft(
        self, requests: List[DownloadRequest]
    ) -> List[DownloadResult]:
        """Download historical data for multiple aircraft"""
        results = []

        for request in requests:
            result = await self.download_aircraft_history(request)
            results.append(result)

            # Add delay between requests to avoid rate limiting
            await asyncio.sleep(2)

        return results

    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()
            self.session = None
            self.logged_in = False


# Global instance
fr24_downloader = FlightRadar24Downloader()
