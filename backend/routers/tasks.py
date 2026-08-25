from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import Dict, Any
from backend.email_service import send_confirmation_email, send_broadcast_email

router = APIRouter()

class TaskPayload(BaseModel):
    task: str
    args: Dict[str, Any]

@router.post("/worker", status_code=status.HTTP_200_OK)
def tasks_worker(payload: TaskPayload):
    """
    HTTP Worker Endpoint for executing QStash tasks in production.
    """
    task_name = payload.task
    args = payload.args
    
    if task_name == "send_confirmation_email":
        try:
            res = send_confirmation_email(**args)
            return {"status": "success", "task": task_name, "result": res}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error executing task: {e}")
            
    elif task_name == "send_broadcast_email":
        try:
            print(f"[WORKER_LOG] send_broadcast_email: template_key={args.get('template_key')}, subject={args.get('subject')}, body_len={len(args.get('body', ''))}")
            res = send_broadcast_email(**args)
            return {"status": "success", "task": task_name, "result": res}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error executing task: {e}")
            
    elif task_name == "send_confirmation_sms":
        try:
            from backend.sms_service import send_confirmation_sms
            res = send_confirmation_sms(**args)
            return {"status": "success", "task": task_name, "result": res}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error executing task: {e}")
            
    else:
        raise HTTPException(status_code=400, detail=f"Unknown task: {task_name}")
