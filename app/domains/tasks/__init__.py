from app.core.database import SessionLocal
from app.domains.tasks.manager import TaskManager

task_manager = TaskManager(session_factory=SessionLocal)
