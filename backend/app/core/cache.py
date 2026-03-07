import json
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config import settings

_redis: Optional[redis.Redis] = None


async def init_cache() -> None:
    """Called during app startup lifespan."""
    global _redis
    _redis = await redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


async def get_redis() -> redis.Redis:
    """FastAPI dependency — returns the shared Redis client."""
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    """Retrieve and deserialize a value from Redis."""
    if _redis is None:
        return None
        
    val = await _redis.get(key)
    if val:
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return val
    return None


async def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    """Serialize and store a value in Redis with a TTL."""
    if _redis is None:
        return
        
    if isinstance(value, (dict, list)):
        value = json.dumps(value)
        
    await _redis.setex(key, ttl, value)


async def cache_delete(key: str) -> None:
    """Delete a key from Redis."""
    if _redis is None:
        return
    await _redis.delete(key)
