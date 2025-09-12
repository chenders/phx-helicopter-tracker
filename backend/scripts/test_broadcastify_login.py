#!/usr/bin/env python3
"""
Test Broadcastify login separately
"""
import os
import requests
from bs4 import BeautifulSoup

# Credentials
USERNAME = os.getenv("BROADCASTIFY_USERNAME")
PASSWORD = os.getenv("BROADCASTIFY_PASSWORD")
BASE_URL = "https://www.broadcastify.com"


def test_login():
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
    )

    # Get the login page first
    print("Getting login page...")
    login_page = session.get(f"{BASE_URL}/login")
    print(f"Login page status: {login_page.status_code}")

    # Parse the page to look for form fields
    soup = BeautifulSoup(login_page.text, "html.parser")

    # Find the login form
    form = soup.find("form")
    if form:
        print(f"\nForm action: {form.get('action', 'Not found')}")
        print(f"Form method: {form.get('method', 'Not found')}")

        # Find all input fields
        inputs = form.find_all("input")
        print(f"\nFound {len(inputs)} input fields:")
        for inp in inputs:
            field_name = inp.get("name", "unnamed")
            field_type = inp.get("type", "text")
            field_value = inp.get("value", "")
            print(f"  - {field_name} (type: {field_type})")
            if field_value and field_type == "hidden":
                print(f"    Value: {field_value}")

    # Try different login approaches
    print("\n" + "=" * 50)
    print("Attempting login...")
    session.headers["Referer"] = f"{BASE_URL}/login"

    # # Method 1: Try with email field
    # login_data = {
    #     "username": USERNAME,
    #     "password": PASSWORD,
    #     "action": "auth",
    #     "redirect": "https://www.broadcastify.com"
    # }
    #
    # response = session.post(f"{BASE_URL}/login", data=login_data)
    # print(f"Method 1 (email field) - Status: {response.status_code}")
    #
    # # Check if login was successful
    # if "logout" in response.text.lower() or "dashboard" in response.text.lower():
    #     print("✓ Login successful with email field!")
    #     return session
    #
    # # Method 2: Try with username field
    # login_data = {
    #     "username": USERNAME,
    #     "password": PASSWORD,
    #     "action": "auth",
    #     "redirect": "https://www.broadcastify.com"
    # }
    #
    # response = session.post(f"{BASE_URL}/login", data=login_data)
    # print(f"Method 2 (username field) - Status: {response.status_code}")
    #
    # if "logout" in response.text.lower() or "dashboard" in response.text.lower():
    #     print("✓ Login successful with username field!")
    #     return session
    #
    # # Method 3: Check if already logged in from cookies
    # test_page = session.get(f"{BASE_URL}/archives/feed/12145")
    # if test_page.status_code == 200 and "login" not in test_page.url.lower():
    #     print("✓ Access granted - may be using cached session")
    #     return session
    #
    # print("\n✗ Login failed - checking response for clues...")
    #
    # # Save response for debugging
    # with open("login_response.html", "w") as f:
    #     f.write(response.text)
    # print("Response saved to login_response.html for inspection")

    return None


if __name__ == "__main__":
    session = test_login()

    if session:
        print("\n" + "=" * 50)
        print("Testing archive access...")

        # Try to access the archives
        archive_url = f"{BASE_URL}/archives/feed/12145"
        response = session.get(archive_url)

        print(f"Archive page status: {response.status_code}")
        print(f"Archive page URL: {response.url}")

        if "login" in response.url.lower():
            print("✗ Redirected to login - authentication failed")
        else:
            print("✓ Archive access successful!")

            # Look for download links
            soup = BeautifulSoup(response.text, "html.parser")
            links = soup.find_all("a", href=lambda x: x and "download" in x)
            print(f"\nFound {len(links)} download links")

            if links:
                print("First few download links:")
                for link in links[:3]:
                    print(f"  - {link.get('href')}")
