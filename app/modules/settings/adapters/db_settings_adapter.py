from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.modules.settings.models import SystemSetting, UserSetting

class DbSettingsAdapter:
    def __init__(self, db: Session):
        self.db = db

    def get_system_setting(self, key: str) -> Optional[Any]:
        setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return setting.value if setting else None

    def get_all_system_settings(self) -> Dict[str, Any]:
        return {s.key: s.value for s in self.db.query(SystemSetting).all()}

    def get_setting(self, key: str, user_id: Optional[int] = None) -> Optional[Any]:
        if user_id is None:
            from app.core.user_context import get_current_user_id
            user_id = get_current_user_id()
        user_setting = self.db.query(UserSetting).filter(UserSetting.user_id == user_id, UserSetting.key == key).first()
        if user_setting is not None:
            return user_setting.value
        return self.get_system_setting(key)

    def get_user_settings(self, user_id: int) -> Any:
        return self.db.query(UserSetting).filter(UserSetting.user_id == user_id).all()

    def get_user_setting_obj(self, user_id: int, key: str) -> Optional[Any]:
        return self.db.query(UserSetting).filter(UserSetting.user_id == user_id, UserSetting.key == key).first()

    def create_user_setting(self, user_id: int, key: str, value: Any, description: Optional[str] = None) -> Any:
        setting = UserSetting(user_id=user_id, key=key, value=value, description=description)
        self.db.add(setting)
        self.db.flush()
        return setting

    def set_setting(self, key: str, value: Any, user_id: Optional[int] = None) -> None:
        if user_id is None:
            from app.core.user_context import get_current_user_id
            user_id = get_current_user_id()
        
        setting = self.db.query(UserSetting).filter(UserSetting.user_id == user_id, UserSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = UserSetting(user_id=user_id, key=key, value=value)
            self.db.add(setting)
        self.db.flush()

    def get_system_settings(self) -> Any:
        return self.db.query(SystemSetting).all()

    def set_system_setting(self, key: str, value: Any, description: Optional[str] = None) -> Any:
        setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not setting:
            setting = SystemSetting(key=key, value=value, description=description)
            self.db.add(setting)
        else:
            setting.value = value
            if description is not None:
                setting.description = description
        self.db.flush()
        return setting

    def set_user_setting(self, user_id: int, key: str, value: Any, description: Optional[str] = None) -> Any:
        setting = self.db.query(UserSetting).filter(UserSetting.user_id == user_id, UserSetting.key == key).first()
        if not setting:
            setting = UserSetting(user_id=user_id, key=key, value=value, description=description)
            self.db.add(setting)
        else:
            setting.value = value
            if description is not None:
                setting.description = description
        self.db.flush()
        return setting



