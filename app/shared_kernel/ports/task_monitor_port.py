from typing import Protocol, Any

class TaskMonitorPort(Protocol):
    def is_cancelled(self, task_id: int) -> bool:
        """Checks if a background task has been cancelled."""
        ...

    def has_active_heavy_tasks(self) -> bool:
        """Checks if there are any active heavy background tasks running."""
        ...

    def update_progress(self, task_id: int, progress: float) -> None:
        """Updates the progress of a background task."""
        ...

    @property
    def executor(self) -> Any:
        """Returns the execution context or pool for running tasks."""
        ...
