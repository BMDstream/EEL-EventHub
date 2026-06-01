from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import Dict, Any
from backend.email_service import send_confirmation_email, send_broadcast_email

router = APIRouter()

class TaskPayload(BaseModel):
    task: str
    args: Dict[str, Any]

@router.post("/worker", status_code=status.HTTP_202_ACCEPTED)
async def tasks_worker(payload: TaskPayload, background_tasks: BackgroundTasks):
    """
    HTTP Worker Endpoint for executing QStash tasks in production.
    """
    task_name = payload.task
    args = payload.args
    
    if task_name == "send_confirmation_email":
        try:
            # We execute it inside background_tasks so the worker responds immediately
            # avoiding gateway timeouts
            background_tasks.add_task(
                send_confirmation_email,
                **args
            )
            return {"status": "accepted", "task": task_name}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error preparing task execution: {e}")
            
    elif task_name == "send_broadcast_email":
        try:
            background_tasks.add_task(
                send_broadcast_email,
                **args
            )
            return {"status": "accepted", "task": task_name}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error preparing task execution: {e}")
            
    else:
        raise HTTPException(status_code=400, detail=f"Unknown task: {task_name}")
