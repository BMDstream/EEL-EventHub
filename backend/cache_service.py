import os
import json
import redis
from typing import Optional, Any

REDIS_URL = os.environ.get("REDIS_URL")

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
    """
    if not redis_client:
        return None
    try:
        data = redis_client.get(f"event:{slug}")
        if data:
            return json.loads(data)
    except Exception as e:
        print(f"Redis GET error: {e}")
    return None

def set_cached_event(slug: str, data: Any, expire_seconds: int = 3600) -> bool:
    """
    Caches the event schema for a given slug with a default expiration.
    """
    if not redis_client:
        return False
    try:
        redis_client.setex(
            f"event:{slug}",
            expire_seconds,
            json.dumps(data)
        )
        return True
    except Exception as e:
        print(f"Redis SETEX error: {e}")
    return False

def clear_cached_event(slug: str) -> bool:
    """
    Clears the cached event schema for a given slug.
    """
    if not redis_client:
        return False
    try:
        redis_client.delete(f"event:{slug}")
        return True
    except Exception as e:
        print(f"Redis DELETE error: {e}")
    return False
