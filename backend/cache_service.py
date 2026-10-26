import os
import json
import time
import redis
from typing import Optional, Any

REDIS_URL = os.environ.get("REDIS_URL")

# In-memory cache fallback when Redis is not configured
_in_memory_event_cache: dict = {}

# Initialize redis connection safely
redis_client = None
if REDIS_URL:
    try:
        # standard decoder response configuration
        redis_client = redis.Redis.from_url(
            REDIS_URL, 
            decode_responses=True, 
            socket_timeout=5,
            socket_connect_timeout=5
        )
        print("Redis cache service initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Redis connection: {e}")

def get_cached_event(slug: str) -> Optional[Any]:
    """
    Retrieves the cached event schema for a given slug.
    Falls back to high-speed in-memory cache when Redis is unavailable.
    """
    if redis_client:
        try:
            data = redis_client.get(f"event:{slug}")
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"Redis GET error: {e}")
    
    # In-memory fallback check
    cached = _in_memory_event_cache.get(f"event:{slug}")
    if cached and time.time() < cached[1]:
        return cached[0]
    return None

def set_cached_event(slug: str, data: Any, expire_seconds: int = 300) -> bool:
    """
    Caches the event schema for a given slug with a default expiration.
    Falls back to high-speed in-memory cache when Redis is unavailable.
    """
    if redis_client:
        try:
            redis_client.setex(
                f"event:{slug}",
                expire_seconds,
                json.dumps(data)
            )
            return True
        except Exception as e:
            print(f"Redis SETEX error: {e}")
            
    # In-memory fallback storage
    _in_memory_event_cache[f"event:{slug}"] = (data, time.time() + expire_seconds)
    return True

def clear_cached_event(slug: str) -> bool:
    """
    Clears the cached event schema for a given slug.
    """
    if redis_client:
        try:
            redis_client.delete(f"event:{slug}")
        except Exception as e:
            print(f"Redis DELETE error: {e}")
            
    _in_memory_event_cache.pop(f"event:{slug}", None)
    return True
