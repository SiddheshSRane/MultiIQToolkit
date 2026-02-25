import time
import httpx
from typing import Optional
from fastapi import Request, Depends
from backend.core.config import supabase_url, supabase_key, logger, TOKEN_CACHE, CACHE_TTL

_HTTP_CLIENT: Optional[httpx.AsyncClient] = None

def set_http_client(client: httpx.AsyncClient):
    global _HTTP_CLIENT
    _HTTP_CLIENT = client

async def get_current_user(request: Request):
    """
    Verifies the user with Supabase Auth API directly using httpx.
    Uses a time-aware cache to minimize latency and memory bloat.
    """
    if not supabase_url or not supabase_key:
        return None

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    
    # Check cache with TTL
    now = time.time()
    if token in TOKEN_CACHE:
        user, expiry = TOKEN_CACHE[token]
        if now < expiry:
            return user
        else:
            del TOKEN_CACHE[token] # Expired
        
    user = await _verify_token(token)
    if user:
        TOKEN_CACHE[token] = (user, now + CACHE_TTL)
    return user

async def _verify_token(token: str):
    try:
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {token}"
        }
        if _HTTP_CLIENT is None:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{supabase_url}/auth/v1/user", headers=headers)
        else:
            response = await _HTTP_CLIENT.get(f"{supabase_url}/auth/v1/user", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            class User:
                def __init__(self, data):
                    self.id = data.get("id")
                    self.email = data.get("email")
            return User(user_data)
        return None
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        return None

async def log_activity(user_id: str, action: str, filename: str, file_url: Optional[str] = None):
    """
    Logs backend actions to Supabase via REST API directly using httpx.
    """
    if not supabase_url or not supabase_key:
        return
    
    try:
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        payload = {
            "user_id": user_id,
            "action": f"Backend: {action}",
            "filename": filename,
            "file_url": file_url
        }
        if _HTTP_CLIENT is None:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(f"{supabase_url}/rest/v1/activity_logs", headers=headers, json=payload)
        else:
            await _HTTP_CLIENT.post(f"{supabase_url}/rest/v1/activity_logs", headers=headers, json=payload)
    except Exception as e:
        logger.error(f"Failed to log activity: {str(e)}")

async def upload_processed_file(user_id: str, filename: str, buffer):
    """
    Uploads a processed file to Supabase Storage bucket 'refinery-outputs'.
    """
    if not supabase_url or not supabase_key:
        return None

    try:
        file_path = f"{user_id}/{int(time.time() * 1000)}_{filename}"
        
        content_type = "application/octet-stream"
        if filename.endswith(".csv"): content_type = "text/csv"
        elif filename.endswith(".xlsx"): content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif filename.endswith(".json"): content_type = "application/json"
        elif filename.endswith(".zip"): content_type = "application/zip"

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": content_type,
            "x-upsert": "true"
        }
        
        if hasattr(buffer, 'seek'):
            buffer.seek(0)
            data = buffer.read()
        else:
            data = buffer

        url = f"{supabase_url}/storage/v1/object/refinery-outputs/{file_path}"
        
        if _HTTP_CLIENT is None:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(url, headers=headers, content=data)
        else:
            response = await _HTTP_CLIENT.post(url, headers=headers, content=data)
            
        if response.status_code == 200:
            return f"{supabase_url}/storage/v1/object/public/refinery-outputs/{file_path}"
        else:
            logger.error(f"Storage upload failed: {response.status_code} {response.text}")
            return None
    except Exception as e:
        logger.error(f"Storage error: {str(e)}")
        return None
