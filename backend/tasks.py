import os
import httpx
from fastapi import BackgroundTasks
from backend.email_service import send_confirmation_email, send_broadcast_email

# Read configuration from the environment
QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
# Base URL of this backend application for callbacks
APP_BASE_URL = os.getenv("APP_BASE_URL", "")

# Override base URL dynamically for Vercel preview environments so QStash targets the correct deployment
vercel_env = os.getenv("VERCEL_ENV", "")
vercel_url = os.getenv("VERCEL_URL", "")
if vercel_env == "preview" and vercel_url:
    APP_BASE_URL = f"https://{vercel_url}"
elif not APP_BASE_URL:
    if vercel_url:
        APP_BASE_URL = f"https://{vercel_url}"
    else:
        APP_BASE_URL = "http://localhost:8000"

def _post_qstash_sync(url: str, headers: dict, payload: dict, task_name: str):
    """Synchronously dispatch the QStash request during the request lifecycle to prevent serverless freezing."""
    try:
        with httpx.Client() as client:
            res = client.post(url, headers=headers, json=payload, timeout=5)
            print(f"QSTASH DISPATCH {task_name}: status={res.status_code}")
    except Exception as e:
        print(f"QStash dispatch failed for {task_name}: {e}")

def dispatch_send_confirmation_email(
    background_tasks: BackgroundTasks,
    to_email: str,
    first_name: str,
    event_title: str,
    clearance_id: str,
    event_details: dict = None,
    config: dict = None,
    is_attending: bool = True,
    matchup: str = None,
    profile_update_link: str = None,
    registration_id: str = None
):
    """Abstraction layer to dispatch confirmation email tasks inline synchronously on serverless environments."""
    args = {
        "to_email": to_email,
        "first_name": first_name,
        "event_title": event_title,
        "clearance_id": clearance_id,
        "event_details": event_details,
        "config": config,
        "is_attending": is_attending,
        "matchup": matchup,
        "profile_update_link": profile_update_link,
        "registration_id": registration_id
    }
    
    if QSTASH_TOKEN and vercel_env != "preview":
        url = f"https://qstash.upstash.io/v2/publish/{APP_BASE_URL}/api/py/tasks/worker"
        headers = {
            "Authorization": f"Bearer {QSTASH_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "task": "send_confirmation_email",
            "args": args
        }
        _post_qstash_sync(url=url, headers=headers, payload=payload, task_name="send_confirmation_email")
        return

    # Fallback: Use FastAPI BackgroundTasks so the email is sent AFTER the HTTP response
    # is returned to the client. This prevents the Vercel serverless function from timing out
    # while waiting for the Resend API call to complete inline.
    if background_tasks is not None:
        background_tasks.add_task(send_confirmation_email, **args)
    else:
        # Last resort: synchronous call (e.g. in test/local contexts without background tasks)
        send_confirmation_email(**args)

def dispatch_send_broadcast_email(
    background_tasks: BackgroundTasks,
    registrations_data: list,
    subject: str,
    body: str,
    event_title: str,
    signature: str = None,
    config: dict = None,
    attachments: list = None,
    event_details: dict = None
):
    """Abstraction layer to dispatch broadcast email tasks inline synchronously on serverless environments."""
    args = {
        "registrations_data": registrations_data,
        "subject": subject,
        "body": body,
        "event_title": event_title,
        "signature": signature,
        "config": config,
        "attachments": attachments,
        "event_details": event_details
    }
    
    if QSTASH_TOKEN and vercel_env != "preview":
        url = f"https://qstash.upstash.io/v2/publish/{APP_BASE_URL}/api/py/tasks/worker"
        headers = {
            "Authorization": f"Bearer {QSTASH_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "task": "send_broadcast_email",
            "args": args
        }
        _post_qstash_sync(url=url, headers=headers, payload=payload, task_name="send_broadcast_email")
        return

    # Fallback: Use FastAPI BackgroundTasks so the email is sent AFTER the HTTP response
    # is returned to the client, preventing Vercel serverless timeout.
    if background_tasks is not None:
        background_tasks.add_task(send_broadcast_email, **args)
    else:
        send_broadcast_email(**args)
