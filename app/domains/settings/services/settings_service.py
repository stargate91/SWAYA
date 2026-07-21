import os
import shutil
import platform
import logging
import requests
import uuid
from typing import List, Dict, Any, Optional
from pathlib import Path
from sqlalchemy.orm import Session


from app.modules.settings.models import UserSetting, SystemSetting
from app.shared_kernel.ports.library_port import LibraryPort
from app.core.constants import STASHDB_DEFAULT_ENDPOINT, FANSDB_DEFAULT_ENDPOINT, PORNDB_DEFAULT_ENDPOINT
from app.domains.media_assets.services.images import image_processing_service
from app.shared_kernel.ports.settings_port import SettingsPort

logger = logging.getLogger(__name__)

class SettingsService:
    def __init__(
        self,
        db: Session,
        library_port: Optional[LibraryPort] = None,
        user_id: Optional[int] = None,
        settings_port: Optional[SettingsPort] = None
    ):
        self.db = db
        self.library_port = library_port
        if user_id is None:
            from app.core.user_context import get_current_user_id
            user_id = get_current_user_id()
        self.user_id = user_id
        self.settings_port = settings_port

    def get_settings(self) -> Dict[str, Any]:
        # Auto-detect VLC path
        vlc_setting = self.settings_port.get_user_setting_obj(self.user_id, "vlc_path")
        if not vlc_setting or not vlc_setting.value:
            vlc_path = ""
            which_vlc = shutil.which("vlc")
            if which_vlc:
                vlc_path = which_vlc
            elif platform.system() == "Windows":
                for p in [r"C:\Program Files\VideoLAN\VLC\vlc.exe", r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe"]:
                    if os.path.exists(p):
                        vlc_path = p
                        break
            if not vlc_setting:
                self.settings_port.create_user_setting(self.user_id, "vlc_path", vlc_path)
            else:
                self.settings_port.set_setting("vlc_path", vlc_path, self.user_id)
            self.db.commit()

        # Auto-detect MPC path
        mpc_setting = self.settings_port.get_user_setting_obj(self.user_id, "mpc_path")
        if not mpc_setting or not mpc_setting.value:
            mpc_path = ""
            which_mpc = shutil.which("mpc-hc") or shutil.which("mpc-hc64")
            if which_mpc:
                mpc_path = which_mpc
            elif platform.system() == "Windows":
                for p in [r"C:\Program Files\MPC-HC\mpc-hc64.exe", r"C:\Program Files (x86)\MPC-HC\mpc-hc.exe"]:
                    if os.path.exists(p):
                        mpc_path = p
                        break
            if not mpc_setting:
                self.settings_port.create_user_setting(self.user_id, "mpc_path", mpc_path)
            else:
                self.settings_port.set_setting("mpc_path", mpc_path, self.user_id)
            self.db.commit()

        # Auto-detect or default preferred_player
        player_setting = self.settings_port.get_user_setting_obj(self.user_id, "preferred_player")
        if not player_setting:
            self.settings_port.create_user_setting(self.user_id, "preferred_player", "swaya")
            self.db.commit()

        # Default hover preview settings
        preview_defaults = {
            "hover_previews_enabled": True,
            "hover_previews_delay": 800,
            "hover_previews_duration": 16,
            "previews_cache_max_size_mb": 2048,
            "previews_cache_max_age_days": 30
        }
        db_changed = False
        for k, v in preview_defaults.items():
            if not self.settings_port.get_user_setting_obj(self.user_id, k):
                self.settings_port.create_user_setting(self.user_id, k, v)
                db_changed = True
        if db_changed:
            self.db.commit()

        settings = self.settings_port.get_user_settings(self.user_id)
        return {s.key: s.value for s in settings}

    def update_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        for key, value in settings.items():
            self.settings_port.set_setting(key, value, self.user_id)
        self.db.commit()
        return {"status": "success"}

    def upload_avatar(self, filename: str, file_stream) -> Dict[str, str]:
        extension = Path(filename or "").suffix.lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            raise ValueError("Unsupported image format")

        image_service = image_processing_service
        avatar_filename = f"user_{self.user_id}_{uuid.uuid4().hex}{extension}"
        original_path = image_service.get_original_path("avatars", avatar_filename)
        thumbnail_path = image_service.get_thumbnail_path("avatars", avatar_filename)

        if not image_service.write_upload(original_path, file_stream):
            raise ValueError("Invalid image file")
        if not image_service.generate_thumbnail(original_path, thumbnail_path, "avatars"):
            original_path.unlink(missing_ok=True)
            raise ValueError("Failed to process avatar")

        avatar_path = image_service.resolve_image_url(avatar_filename, "avatars")
        setting = self.settings_port.get_user_setting_obj(self.user_id, "avatar_path")
        if setting:
            self.settings_port.set_setting("avatar_path", avatar_path, self.user_id)
        else:
            self.settings_port.create_user_setting(self.user_id, "avatar_path", avatar_path)
        self.db.commit()
        return {"avatar_path": avatar_path}
    def validate_folders(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        scan_dir = (payload.get("default_scan_dir") or "").strip()
        library_dir = (payload.get("folder_library_path") or "").strip()
        adult_library_dir = (payload.get("folder_adult_library_path") or "").strip()
        move_to_library = bool(payload.get("folder_move_to_library"))

        errors = {}
        if scan_dir and not os.path.exists(scan_dir):
            errors["scanFolder"] = "scanDirNotExist"

        if move_to_library:
            if not library_dir:
                errors["targetFolder"] = "libraryDirRequired"
            elif not os.path.exists(library_dir):
                errors["targetFolder"] = "libraryDirNotExist"
            elif scan_dir and os.path.abspath(scan_dir) == os.path.abspath(library_dir):
                errors["targetFolder"] = "foldersCannotBeSame"

            if adult_library_dir:
                if not os.path.exists(adult_library_dir):
                    errors["adultTargetFolder"] = "adultTargetFolderNotExist"
                elif scan_dir and os.path.abspath(scan_dir) == os.path.abspath(adult_library_dir):
                    errors["adultTargetFolder"] = "foldersCannotBeSame"

        if errors:
            return {"valid": False, "errors": errors}
        return {"valid": True, "message": "foldersVerified"}


    def get_changelog(self) -> Dict[str, Any]:
        project_root = Path(__file__).resolve().parents[4]
        changelog_path = project_root / "CHANGELOG.md"
        if not changelog_path.exists():
            changelog_path = Path("CHANGELOG.md")
        if changelog_path.exists():
            return {"status": "success", "content": changelog_path.read_text(encoding="utf-8")}
        return {"status": "error", "message": "CHANGELOG.md not found.", "content": ""}

    def get_ignored_items(self, search: str = "", offset: int = 0, limit: int = 40) -> Dict[str, Any]:
        return self.library_port.get_ignored_items(search, offset, limit)

    def restore_ignored_items(self, item_ids: List[int]) -> Dict[str, Any]:
        restored_count = self.library_port.restore_ignored_items(item_ids)
        return {"status": "success", "restored": restored_count}

    def validate_api_keys(self, payload: dict) -> Dict[str, Any]:
        tmdb_api_key = (payload.get("tmdb_api_key") or "").strip()
        tmdb_bearer_token = (payload.get("tmdb_bearer_token") or "").strip()
        omdb_api_key = (payload.get("omdb_api_key") or "").strip()
        stashdb_api_key = (payload.get("stashdb_api_key") or "").strip()
        fansdb_api_key = (payload.get("fansdb_api_key") or "").strip()
        porndb_api_key = (payload.get("porndb_api_key") or "").strip()
        stashdb_endpoint = (payload.get("stashdb_endpoint") or STASHDB_DEFAULT_ENDPOINT).strip()
        fansdb_endpoint = (payload.get("fansdb_endpoint") or FANSDB_DEFAULT_ENDPOINT).strip()
        porndb_endpoint = (payload.get("porndb_endpoint") or PORNDB_DEFAULT_ENDPOINT).strip()

        result = {
            "tmdb": {"valid": False, "message": None},
            "omdb": {"valid": False, "message": None},
            "stashdb": {"valid": False, "message": None},
            "fansdb": {"valid": False, "message": None},
            "porndb": {"valid": False, "message": None},
        }

        def validate_graphql_provider(provider_key: str, endpoint: str, api_key: str, use_bearer: bool = False) -> Dict[str, Any]:
            if not api_key:
                return {"valid": False, "message": None}

            headers = {"Content-Type": "application/json"}
            if use_bearer:
                headers["Authorization"] = f"Bearer {api_key}"
            else:
                headers["ApiKey"] = api_key

            payload = {
                "query": """
                query ValidateAdultProvider($term: String!) {
                  searchScene(term: $term) {
                    id
                  }
                }
                """,
                "variables": {"term": "validation_probe"},
            }

            try:
                response = requests.post(endpoint, json=payload, headers=headers, timeout=15)
                if response.status_code in (401, 403):
                    return {
                        "valid": False,
                        "code": "adultApiKeyInvalid",
                        "provider": provider_key,
                    }

                response.raise_for_status()
                response_data = response.json()
                if response_data.get("errors"):
                    return {
                        "valid": False,
                        "code": "adultValidationFailedEndpointApiKey",
                        "provider": provider_key,
                    }
                return {"valid": True}
            except requests.Timeout:
                return {
                    "valid": False,
                    "code": "adultValidationTimedOut",
                    "provider": provider_key,
                }
            except requests.RequestException:
                return {
                    "valid": False,
                    "code": "adultValidationFailedEndpoint",
                    "provider": provider_key,
                }

        if tmdb_api_key or tmdb_bearer_token:
            if not tmdb_api_key or not tmdb_bearer_token:
                result["tmdb"]["message"] = "Both TMDB API Key (v3) and Read Access Token (v4) are required."
            else:
                try:
                    key_response = requests.get(
                        "https://api.themoviedb.org/3/configuration",
                        params={"api_key": tmdb_api_key},
                        timeout=15,
                    )
                    if key_response.status_code == 401:
                        result["tmdb"]["message"] = "The TMDB API Key (v3) is invalid."
                    else:
                        key_response.raise_for_status()
                        token_response = requests.get(
                            "https://api.themoviedb.org/3/authentication",
                            headers={"Authorization": f"Bearer {tmdb_bearer_token}"},
                            timeout=15,
                        )
                        if token_response.status_code == 401:
                            result["tmdb"]["message"] = "The TMDB Read Access Token (v4) is invalid."
                        else:
                            token_response.raise_for_status()
                            result["tmdb"] = {"valid": True, "message": "TMDB credentials verified."}
                except requests.Timeout:
                    result["tmdb"]["message"] = "TMDB validation timed out. Check your connection and try again."
                except requests.RequestException:
                    result["tmdb"]["message"] = "TMDB validation failed. Check your connection and try again."

        if omdb_api_key:
            try:
                omdb_response = requests.get(
                    "https://www.omdbapi.com/",
                    params={"apikey": omdb_api_key, "i": "tt0111161"},
                    timeout=15,
                )
                omdb_response.raise_for_status()
                omdb_data = omdb_response.json()
                if omdb_data.get("Response") == "True":
                    result["omdb"] = {"valid": True, "message": "OMDb API key verified."}
                else:
                    error_message = omdb_data.get("Error") or "OMDb validation failed."
                    result["omdb"]["message"] = error_message
            except requests.Timeout:
                result["omdb"]["message"] = "OMDb validation timed out. Check your connection and try again."
            except requests.RequestException:
                result["omdb"]["message"] = "OMDb validation failed. Check your connection and try again."

        result["stashdb"] = validate_graphql_provider("stashdb", stashdb_endpoint, stashdb_api_key)
        result["fansdb"] = validate_graphql_provider("fansdb", fansdb_endpoint, fansdb_api_key)
        result["porndb"] = validate_graphql_provider("porndb", porndb_endpoint, porndb_api_key, use_bearer=True)

        return result

    def get_system_settings(self) -> List[SystemSetting]:
        return self.settings_port.get_system_settings()

    def set_system_setting(self, key: str, value: Any, description: Optional[str] = None) -> SystemSetting:
        setting = self.settings_port.set_system_setting(key, value, description)
        self.db.commit()
        return setting

    def get_user_settings_list(self, user_id: int) -> List[UserSetting]:
        return self.settings_port.get_user_settings(user_id)

    def set_user_setting(self, user_id: int, key: str, value: Any, description: Optional[str] = None) -> UserSetting:
        setting = self.settings_port.set_user_setting(user_id, key, value, description)
        self.db.commit()
        return setting
