from typing import Protocol, Optional, Dict, Any

class PersonOverridePort(Protocol):
    def get_person_user_override(self, user_id: int, person_id: int) -> Optional[Dict[str, Any]]:
        """
        Gets a dictionary representation of the user override for a person.
        Returns keys like: custom_poster, custom_backdrop, is_favorite, user_rating, user_comment.
        """
        ...

    def update_person_user_override(
        self,
        user_id: int,
        person_id: int,
        custom_poster: Optional[str] = None,
        custom_backdrop: Optional[str] = None,
        update_poster: bool = False,
        update_backdrop: bool = False,
    ) -> None:
        """
        Updates (or creates) a user override record for a person with the specified fields.
        """
        ...
