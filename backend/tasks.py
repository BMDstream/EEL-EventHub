import os
import httpx
import time
from fastapi import BackgroundTasks
from backend.email_service import send_confirmation_email, send_broadcast_email
from backend.sms_service import send_confirmation_sms

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
    if vercel_env == "production":
        APP_BASE_URL = "https://eel-event-hub-q61e.vercel.app"
    elif vercel_url:
        APP_BASE_URL = f"https://{vercel_url}"
    else:
        APP_BASE_URL = "http://localhost:8000"

def execute_with_retries(func, *args, **kwargs):
    """Helper wrapper to execute email tasks with up to 3 retries and linear backoff."""
    max_retries = 3
    initial_delay = 2
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"SMTP/Resend email task failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(initial_delay * (attempt + 1))
            else:
                # Log final failure
                print(f"SMTP/Resend email task completely failed after {max_retries} attempts.")
                raise e

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
    if event_details and "start_date" in event_details:
        sd = event_details["start_date"]
        if hasattr(sd, "isoformat"):
            event_details = {**event_details, "start_date": sd.isoformat()}

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
            "Content-Type": "application/json",
            "Upstash-Retries": "3"
        }
        payload = {
            "task": "send_confirmation_email",
            "args": args
        }
        _post_qstash_sync(url=url, headers=headers, payload=payload, task_name="send_confirmation_email")
        return
 
    # Fallback: Use FastAPI BackgroundTasks so the email is sent AFTER the HTTP response
    # is returned to the client. In Vercel preview environments, BackgroundTasks are frozen
    # immediately, so we execute inline/synchronously on preview to guarantee delivery.
    if background_tasks is not None and vercel_env != "preview":
        background_tasks.add_task(execute_with_retries, send_confirmation_email, **args)
    else:
        execute_with_retries(send_confirmation_email, **args)

def dispatch_send_broadcast_email(
    background_tasks: BackgroundTasks,
    registrations_data: list,
    subject: str,
    body: str,
    event_title: str,
    signature: str = None,
    config: dict = None,
    attachments: list = None,
    event_details: dict = None,
    survey_url: str = None,
    template_key: str = None
):
    """Abstraction layer to dispatch broadcast email tasks inline synchronously on serverless environments."""
    if event_details and "start_date" in event_details:
        sd = event_details["start_date"]
        if hasattr(sd, "isoformat"):
            event_details = {**event_details, "start_date": sd.isoformat()}

    args = {
        "registrations_data": registrations_data,
        "subject": subject,
        "body": body,
        "event_title": event_title,
        "signature": signature,
        "config": config,
        "attachments": attachments,
        "event_details": event_details,
        "survey_url": survey_url,
        "template_key": template_key
    }
    
    if QSTASH_TOKEN and vercel_env != "preview":
        if template_key:
            # Clear body to save QStash payload size (limit is 1MB)
            args["body"] = ""
        url = f"https://qstash.upstash.io/v2/publish/{APP_BASE_URL}/api/py/tasks/worker"
        headers = {
            "Authorization": f"Bearer {QSTASH_TOKEN}",
            "Content-Type": "application/json",
            "Upstash-Retries": "3"
        }
        payload = {
            "task": "send_broadcast_email",
            "args": args
        }
        _post_qstash_sync(url=url, headers=headers, payload=payload, task_name="send_broadcast_email")
        return

    # Fallback: Use FastAPI BackgroundTasks so the email is sent AFTER the HTTP response
    # is returned to the client. In Vercel preview environments, BackgroundTasks are frozen
    # immediately, so we execute inline/synchronously on preview to guarantee delivery.
    if background_tasks is not None and vercel_env != "preview":
        background_tasks.add_task(execute_with_retries, send_broadcast_email, **args)
    else:
        execute_with_retries(send_broadcast_email, **args)

def dispatch_send_confirmation_sms(
    background_tasks: BackgroundTasks,
    to_phone: str,
    first_name: str,
    event_title: str,
    clearance_id: str,
    pin: str = None,
    event_slug: str = None
):
    """Abstraction layer to dispatch confirmation SMS tasks inline synchronously on serverless environments."""
    args = {
        "to_phone": to_phone,
        "first_name": first_name,
        "event_title": event_title,
        "clearance_id": clearance_id,
        "pin": pin,
        "event_slug": event_slug
    }
    
    if QSTASH_TOKEN and vercel_env != "preview":
        url = f"https://qstash.upstash.io/v2/publish/{APP_BASE_URL}/api/py/tasks/worker"
        headers = {
            "Authorization": f"Bearer {QSTASH_TOKEN}",
            "Content-Type": "application/json",
            "Upstash-Retries": "3"
        }
        payload = {
            "task": "send_confirmation_sms",
            "args": args
        }
        _post_qstash_sync(url=url, headers=headers, payload=payload, task_name="send_confirmation_sms")
        return
 
    # Fallback: Use FastAPI BackgroundTasks so the SMS is sent AFTER the HTTP response
    # is returned to the client. In Vercel preview environments, BackgroundTasks are frozen
    # immediately, so we execute inline/synchronously on preview to guarantee delivery.
    if background_tasks is not None and vercel_env != "preview":
        background_tasks.add_task(execute_with_retries, send_confirmation_sms, **args)
    else:
        execute_with_retries(send_confirmation_sms, **args)
