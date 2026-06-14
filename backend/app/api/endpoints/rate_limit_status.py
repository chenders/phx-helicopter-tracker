"""
API endpoint for monitoring FR24 rate limit status
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.services.fr24_rate_limiter import fr24_rate_limiter

router = APIRouter()


@router.get("/fr24/rate-limit-status")
async def get_rate_limit_status() -> Dict[str, Any]:
    """
    Get current FR24 API rate limit status

    Returns current usage and remaining limits for:
    - Per minute
    - Per hour
    - Per day
    - Per month (credits)
    """
    return fr24_rate_limiter.get_usage_stats()


@router.post("/fr24/rate-limit-reset-minute")
async def reset_minute_counter() -> Dict[str, str]:
    """
    Reset the per-minute rate limit counter
    Useful for testing or recovering from rate limit issues
    """
    fr24_rate_limiter.reset_minute_counter()
    return {"status": "Minute counter reset successfully"}


@router.post("/fr24/rate-limit-adjust")
async def adjust_rate_limits(plan_type: str = "essential") -> Dict[str, Any]:
    """
    Adjust rate limits based on FR24 subscription plan

    Args:
        plan_type: One of "basic", "essential", "premium"
    """
    if plan_type not in ["basic", "essential", "premium"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid plan type. Must be 'basic', 'essential', or 'premium'",
        )

    fr24_rate_limiter.adjust_limits_based_on_plan(plan_type)
    return {
        "status": f"Rate limits adjusted for {plan_type} plan",
        "new_limits": fr24_rate_limiter.get_usage_stats(),
    }
