#!/usr/bin/env python3
"""
Update local FR24 credit tracking to match actual account balance
"""
import asyncio
import redis.asyncio as redis
from app.core.config import settings

async def update_balance():
    """Update the local Redis tracking to match actual FR24 balance"""
    
    # Connect to Redis
    redis_client = redis.from_url(settings.REDIS_URL or "redis://redis:6379/0")
    
    # Your actual balance from FR24
    actual_balance = 565506
    monthly_limit = 666000
    credits_used = monthly_limit - actual_balance
    
    print(f"📊 Updating FR24 Credit Tracking")
    print(f"=" * 60)
    print(f"Actual balance from FR24: {actual_balance:,} credits")
    print(f"Monthly limit: {monthly_limit:,} credits")
    print(f"Credits used: {credits_used:,} credits")
    
    # Update Redis tracking
    # The rate limiter uses keys like "fr24_rate_limiter:monthly_credits"
    monthly_key = "fr24_rate_limiter:monthly_credits"
    
    # Set the correct usage count
    await redis_client.set(monthly_key, str(credits_used))
    
    # Verify update
    stored_value = await redis_client.get(monthly_key)
    if stored_value:
        stored_used = int(stored_value)
        print(f"\n✅ Updated local tracking:")
        print(f"  Credits used: {stored_used:,}")
        print(f"  Credits remaining: {monthly_limit - stored_used:,}")
        print(f"  Match actual balance: {(monthly_limit - stored_used) == actual_balance}")
    
    await redis_client.close()

if __name__ == "__main__":
    asyncio.run(update_balance())