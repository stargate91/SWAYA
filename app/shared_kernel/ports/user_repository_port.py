from typing import Protocol

class UserRepositoryPort(Protocol):
    def auto_heal_adult_tags(self) -> None:
        """Self-healing: Mark tags as adult if they are linked to adult items/performers."""
        ...
