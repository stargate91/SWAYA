from app.core.database import SessionLocal
from app.modules.tasks.manager import TaskManager

task_manager = TaskManager(session_factory=SessionLocal)
