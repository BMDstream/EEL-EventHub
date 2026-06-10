import os
import requests
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
    profile_update_link: str = None
):
    """Abstraction layer to dispatch confirmation email tasks asynchronously."""
    args = {
        "to_email": to_email,
        "first_name": first_name,
        "event_title": event_title,
        "clearance_id": clearance_id,
        "event_details": event_details,
        "config": config,
        "is_attending": is_attending,
        "matchup": matchup,
        "profile_update_link": profile_update_link
    }
    
    if QSTASH_TOKEN:
        try:
            url = f"https://qstash.upstash.io/v2/publish/{APP_BASE_URL}/api/py/tasks/worker"
            headers = {
                "Authorization": f"Bearer {QSTASH_TOKEN}",
                "Content-Type": "application/json"
            }
            payload = {
                "task": "send_confirmation_email",
                "args": args
            }
            res = requests.post(url, headers=headers, json=payload, timeout=5)
            print(f"QSTASH DISPATCH send_confirmation_email: status={res.status_code}")
            return
        except Exception as e:
            print(f"QStash dispatch failed, falling back to BackgroundTasks: {e}")

    # Fallback to local background tasks execution
    background_tasks.add_task(
        send_confirmation_email,
        **args
    )

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
    """Abstraction layer to dispatch broadcast email tasks asynchronously."""
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
    
    if QSTASH_TOKEN:
        try:
            url = f"https://qstash.upstash.io/v2/publish/{APP_BASE_URL}/api/py/tasks/worker"
            headers = {
                "Authorization": f"Bearer {QSTASH_TOKEN}",
                "Content-Type": "application/json"
            }
            payload = {
                "task": "send_broadcast_email",
                "args": args
            }
            res = requests.post(url, headers=headers, json=payload, timeout=5)
            print(f"QSTASH DISPATCH send_broadcast_email: status={res.status_code}")
            return
        except Exception as e:
            print(f"QStash dispatch failed, falling back to BackgroundTasks: {e}")

    # Fallback to local background tasks execution
    background_tasks.add_task(
        send_broadcast_email,
        **args
    )
