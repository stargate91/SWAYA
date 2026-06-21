from app.core.database import SessionLocal
from app.core.tasks.manager import TaskManager

task_manager = TaskManager(session_factory=SessionLocal)
