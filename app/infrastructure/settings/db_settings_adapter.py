from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.shared_kernel.ports.settings_port import SettingsPort
from app.domains.settings.models import SystemSetting, UserSetting

class DbSettingsAdapter(SettingsPort):
    def __init__(self, db: Session):
        self.db = db

    def get_system_setting(self, key: str) -> Optional[Any]:
        setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return setting.value if setting else None

    def get_all_system_settings(self) -> Dict[str, Any]:
        return {s.key: s.value for s in self.db.query(SystemSetting).all()}

    def get_setting(self, key: str, user_id: Optional[int] = None) -> Optional[Any]:
        if user_id is None:
            from app.shared_kernel.user_context import get_current_user_id
            user_id = get_current_user_id()
        user_setting = self.db.query(UserSetting).filter(UserSetting.user_id == user_id, UserSetting.key == key).first()
        if user_setting is not None:
            return user_setting.value
        return self.get_system_setting(key)

