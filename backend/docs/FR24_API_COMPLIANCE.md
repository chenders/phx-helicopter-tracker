# FR24 API Compliance Documentation

## Official FR24 API Endpoints Used

This document confirms that our application uses ONLY the official FlightRadar24 API endpoints as documented at https://fr24api.flightradar24.com/docs/endpoints/overview

### Approved Endpoints We Use:

1. **Live Flight Positions**
   - Endpoint: `/api/live/flight-positions/light`
   - Used in: `fr24_official_api.py`, `flightradar24_api_service.py`
   - Purpose: Get real-time aircraft positions within geographic bounds

2. **Flight Summary**
   - Endpoint: `/api/flight-summary/light`
   - Used in: `flightradar24_api_service.py`
   - Purpose: Get historical flight list for specific aircraft registrations

3. **Flight Tracks**
   - Endpoint: `/api/flight-tracks`
   - Used in: `flightradar24_api_service.py`
   - Purpose: Download complete GPS track for specific flights

### Endpoints We Do NOT Use:

We do NOT use any unofficial endpoints such as:
- ❌ `/common/v1/flight/list.json` (website scraping)
- ❌ `/cdn.flightradar24.com/*` (CDN resources)
- ❌ `/data-live.flightradar24.com/*` (internal data feeds)
- ❌ Any other undocumented endpoints

### Authentication

All API requests include proper authentication:
- Bearer token in Authorization header
- API keys stored in environment variables
- Rate limiting enforced (30 requests/minute)

### Rate Limiting

We implement proper rate limiting:
- Service: `fr24_rate_limiter.py`
- Max: 30 requests per minute
- Minimum delay: 3 seconds between requests
- Credit tracking for monthly limits

### Testing Official Endpoints

To test our API compliance:

```python
# Test script using only official endpoints
from app.services.fr24_official_api import FR24OfficialAPI

api = FR24OfficialAPI()

# Test live positions (official endpoint)
positions = api.get_flight_positions_by_bounds()

# Test Phoenix PD aircraft (uses official endpoint)
phoenix_aircraft = api.get_phoenix_pd_live()
```

### Compliance Actions Taken

1. ✅ Reviewed all code for unofficial endpoints
2. ✅ Confirmed we only use documented API endpoints
3. ✅ Implemented proper rate limiting
4. ✅ Use official authentication methods
5. ✅ Track API credit usage

### Contact

If there are any concerns about API usage, please contact the development team immediately to ensure continued compliance with FR24's terms of service.

Last reviewed: 2025-10-01