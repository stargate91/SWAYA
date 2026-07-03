# Swaya Development Plans & Roadmap

This document serves as a living roadmap for future features, architecture adjustments, and configuration options.

---

## 1. Persistent Session Mode (SFW/NSFW)
*   **Status:** Done (July 2026)
*   **Description:** Changed backend/frontend state storage from transient session storage (`sessionStorage`) to local persistence storage (`localStorage`).
*   **Benefit:** The SFW/NSFW active state persists across application restarts, keeping users in their preferred mode without needing to toggle it on every launch.

---

## 2. Onboarding Flow Refactoring
*   **Status:** Proposed / Backlog
*   **Goal:** Allow a frictionless setup experience for users who only want to manage Adult (NSFW) collections.
*   **Proposed Steps:**
    1.  **Primary Focus Selection:** A new first step in the wizard asking:
        *   *"What type of library are you setting up?"*
        *   Options: `Mainstream (Movies & TV)`, `Adult (Scenes & Performers)`, or `Mixed (Both)`.
    2.  **Optional API Keys:** 
        *   Make TMDB and OMDB keys optional. If a user selects `Adult`, skip or allow bypassing mainstream keys.
    3.  **Adult Metadata Providers:**
        *   Incorporate input fields during onboarding for:
            *   `ThePornDB API Token`
            *   `StashDB API URL & Key`
            *   `FansDB API Token`

---

## 3. Adult Provider Configurations in Settings
*   **Status:** Proposed / Backlog
*   **Goal:** Provide full settings configuration fields for adult API keys alongside mainstream settings.
*   **Details:**
    *   Create a new sub-section under **Settings > Providers** for Adult Providers.
    *   Expose endpoints in the Python backend to securely store these keys in `UserSetting` or database configurations.
    *   Enable automatic fallback/validation checks on those API tokens.
