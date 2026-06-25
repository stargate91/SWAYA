from typing import Protocol, Any, Dict, Optional

class SettingsPort(Protocol):
    def get_system_setting(self, key: str) -> Optional[Any]:
        """Gets system setting value by key."""
        ...

    def get_all_system_settings(self) -> Dict[str, Any]:
        """Gets all system settings as a dictionary of key-value pairs."""
        ...

    def get_setting(self, key: str, user_id: Optional[int] = None) -> Optional[Any]:
        """Gets a setting value, trying user preferences first then falling back to system settings."""
        ...

    def get_user_settings(self, user_id: int) -> Any:
        """Gets all user settings for a user ID."""
        ...

    def get_user_setting_obj(self, user_id: int, key: str) -> Optional[Any]:
        """Gets the UserSetting object (or dict/DTO representation) by key."""
        ...

    def create_user_setting(self, user_id: int, key: str, value: Any, description: Optional[str] = None) -> Any:
        """Creates a UserSetting record and returns it."""
        ...

    def set_setting(self, key: str, value: Any, user_id: Optional[int] = None) -> None:
        """Creates or updates a user-specific setting (or system-wide setting if user_id is None)."""
        ...

    def get_system_settings(self) -> Any:
        """Gets all system settings records."""
        ...

    def set_system_setting(self, key: str, value: Any, description: Optional[str] = None) -> Any:
        """Sets a system setting value, creating it if it does not exist, and returns the object."""
        ...

    def set_user_setting(self, user_id: int, key: str, value: Any, description: Optional[str] = None) -> Any:
        """Sets a user setting value, creating it if it does not exist, and returns the object."""
        ...



