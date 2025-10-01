#!/bin/bash

# FR24 API Test - Mimics what the Python service does

API_KEY="0198f8ec-7e4c-70e6-b98f-54d1704798b9|I3LmVyOqSVjc8Hsvw8bNkML5guofmFdvOD75YsOCbb1ab15b"
BASE_URL="https://fr24api.flightradar24.com/api"

echo "Testing FR24 API from $(hostname)"
echo "================================="
echo ""

# Simple test matching what Python service does
curl -X GET \
  "${BASE_URL}/flights/search?registration=N624FB&limit=1" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Accept: application/json" \
  -H "Accept-Version: v1" \
  -H "User-Agent: Python/3.12 aiohttp/3.8.5" \
  --verbose \
  --write-out "\n\nHTTP Status: %{http_code}\n" \
  --output /tmp/fr24_response.txt

echo ""
echo "Response saved to: /tmp/fr24_response.txt"
echo "Response content:"
cat /tmp/fr24_response.txt