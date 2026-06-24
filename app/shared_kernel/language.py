from typing import Optional, List, Any
from app.shared_kernel.enums import Provider
from app.shared_kernel.constants import DEFAULT_FALLBACK_LANGUAGE


class LanguageService:
    @staticmethod
    def clean_locale(locale: Optional[str]) -> str:
        """Normalizes a language/locale string to its short, lowercase form (e.g. 'en-US' -> 'en')."""
        if not locale:
            return ""
        return str(locale).split("-", 1)[0].strip().lower()

    """
    Central service coordinating request locale resolution, fallback language prioritization,
    and cache invalidation patterns for metadata synchronization.
    """

    @staticmethod
    def resolve_request_locale(provider: Provider, preferred_language: Optional[str]) -> Optional[str]:
        """
        Normalizes and resolves the language code for API queries.
        Only returns a normalized language code (e.g. 'hu', 'en') for TMDB.
        Returns None for all other non-localized providers (OMDB, StashDB, PornDB, FansDB).
        """
        if provider != Provider.TMDB or not preferred_language:
            return None

        clean_lang = LanguageService.clean_locale(preferred_language)
        return clean_lang if clean_lang else None

    @staticmethod
    def resolve_active_language(
        global_metadata_language: str,
        global_fallback_language: str = DEFAULT_FALLBACK_LANGUAGE,
        user_override_language: Optional[str] = None
    ) -> str:
        """
        Resolves the target language code for a media item.
        First checks if there is a per-item custom language override.
        Falls back to global metadata settings, then to standard fallback.
        """
        if user_override_language:
            clean_override = LanguageService.clean_locale(user_override_language)
            if clean_override:
                return clean_override

        if global_metadata_language:
            clean_global = LanguageService.clean_locale(global_metadata_language)
            if clean_global:
                return clean_global

        return LanguageService.clean_locale(global_fallback_language)

    @staticmethod
    def get_best_localization(
        localizations: List[Any],
        target_language: str,
        fallback_language: str = DEFAULT_FALLBACK_LANGUAGE
    ) -> Optional[Any]:
        """
        Filters and returns the best localization object from a list.
        1. Matches target_language (e.g. 'hu')
        2. Matches fallback_language (e.g. 'en')
        3. Returns the first available localization object if none match.
        """
        if not localizations:
            return None

        target_lang = LanguageService.clean_locale(target_language)
        fallback_lang = LanguageService.clean_locale(fallback_language)

        # Try to find exact target language match
        for loc in localizations:
            loc_locale = LanguageService.clean_locale(getattr(loc, "locale", ""))
            if loc_locale == target_lang:
                return loc

        # Try to find fallback language match
        for loc in localizations:
            loc_locale = LanguageService.clean_locale(getattr(loc, "locale", ""))
            if loc_locale == fallback_lang:
                return loc

        # Fallback to the first available
        return localizations[0]
