import os
import requests
import base64
import uuid

BLOB_READ_WRITE_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN")

def upload_media(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Uploads file to Vercel Blob if BLOB_READ_WRITE_TOKEN is configured.
    Otherwise, returns a base64 encoded data URL.
    """
    if BLOB_READ_WRITE_TOKEN:
        # Generate a unique path name
        ext = os.path.splitext(filename)[1]
        unique_filename = f"media/{uuid.uuid4()}{ext}"
        url = f"https://blob.vercel-storage.com/{unique_filename}"
        
        headers = {
            "Authorization": f"Bearer {BLOB_READ_WRITE_TOKEN}",
            "x-api-version": "7",
            "x-content-type": content_type,
            "x-add-random-suffix": "1"
        }
        
        try:
            response = requests.put(url, data=file_bytes, headers=headers, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if "url" in data:
                    return data["url"]
            print(f"Vercel Blob returned status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Failed to upload to Vercel Blob: {e}")
            
    # Fallback to base64 encoding if no token or upload fails
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{content_type};base64,{encoded}"
