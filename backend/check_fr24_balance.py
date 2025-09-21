#!/usr/bin/env python3
"""
Check actual FR24 account balance by making an API request
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def check_fr24_balance():
    """
    Check FR24 account balance via API
    The FR24 API typically returns credit info in response headers
    """
    
    # Get API key from environment
    api_key = os.getenv('FR24_API_KEY_PRODUCTION') or os.getenv('FR24_API_KEY')
    if not api_key:
        print("❌ FR24_API_KEY not found in environment")
        return
    
    print(f"🔑 Using API key: {api_key[:10]}...")
    
    # Make a simple API request to check headers
    # Using a minimal request to not waste credits
    url = "https://fr24api.flightradar24.com/api/flights/search"
    
    headers = {
        'x-api-key': api_key,
        'Accept': 'application/json'
    }
    
    params = {
        'query': 'N624FB',  # Search for specific aircraft
        'limit': 1  # Minimal request
    }
    
    try:
        print("\n📡 Making API request to check balance...")
        response = requests.get(url, headers=headers, params=params)
        
        print(f"\n📊 Response Status: {response.status_code}")
        print("\n📋 Response Headers (looking for credit info):")
        print("-" * 60)
        
        # Check for credit-related headers
        credit_headers = [
            'x-rate-limit-limit',
            'x-rate-limit-remaining', 
            'x-rate-limit-reset',
            'x-credit-limit',
            'x-credit-remaining',
            'x-credits-remaining',
            'x-monthly-limit',
            'x-monthly-remaining',
            'x-account-credits'
        ]
        
        found_credit_info = False
        for header in response.headers:
            header_lower = header.lower()
            if any(credit_key in header_lower for credit_key in ['credit', 'limit', 'rate', 'remaining', 'quota']):
                print(f"  {header}: {response.headers[header]}")
                found_credit_info = True
        
        if not found_credit_info:
            print("  No credit-related headers found in response")
            print("\n  All headers:")
            for header, value in response.headers.items():
                print(f"    {header}: {value}")
        
        # Check response body for credit info
        if response.status_code == 200:
            data = response.json()
            if 'credits' in data or 'balance' in data or 'account' in data:
                print("\n💳 Account info in response:")
                if 'credits' in data:
                    print(f"  Credits: {data['credits']}")
                if 'balance' in data:
                    print(f"  Balance: {data['balance']}")
                if 'account' in data:
                    print(f"  Account: {data['account']}")
        
        # Try account endpoint if available
        print("\n🔍 Attempting to check account endpoint...")
        account_url = "https://fr24api.flightradar24.com/api/account"
        account_response = requests.get(account_url, headers=headers)
        
        if account_response.status_code == 200:
            account_data = account_response.json()
            print("\n✅ Account Information:")
            print(f"  {account_data}")
            
            # Look for credit/balance fields
            if 'credits' in account_data:
                print(f"\n💰 Current Balance: {account_data['credits']:,} credits")
            elif 'balance' in account_data:
                print(f"\n💰 Current Balance: {account_data['balance']:,} credits")
        else:
            print(f"  Account endpoint returned: {account_response.status_code}")
            
    except Exception as e:
        print(f"\n❌ Error checking balance: {e}")

if __name__ == "__main__":
    check_fr24_balance()