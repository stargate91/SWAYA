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

