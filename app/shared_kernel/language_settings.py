from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE
from app.shared_kernel.language import LanguageService

def get_user_ui_language(settings_port, user_id=None) -> str:
    """Returns normalized preferred metadata/UI language or default fallback ('en')."""
    lang = settings_port.get_setting("primary_metadata_language", user_id)
    return LanguageService.clean_locale(lang) if lang else DEFAULT_FALLBACK_LANGUAGE

def get_user_fallback_language(settings_port, user_id=None) -> str:
    """Returns normalized fallback metadata language or default fallback ('en')."""
    lang = settings_port.get_setting("fallback_metadata_language", user_id)
    return LanguageService.clean_locale(lang) if lang and lang != "none" else DEFAULT_FALLBACK_LANGUAGE
