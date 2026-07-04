# Swaya Development Plans & Roadmap

This document serves as a living roadmap for future features, architecture adjustments, and configuration options.

---

## 1. Persistent Session Mode (SFW/NSFW)
*   **Status:** Done (July 2026)
*   **Description:** Changed backend/frontend state storage from transient session storage (`sessionStorage`) to local persistence storage (`localStorage`).
*   **Benefit:** The SFW/NSFW active state persists across application restarts, keeping users in their preferred mode without needing to toggle it on every launch.

---

## 2. Onboarding Flow & Local-First (Zero-Config) Fallback
*   **Status:** Proposed / Backlog
*   **Goal:** Provide a friction-free setup experience where all API keys are optional, allowing instant offline library browsing.
*   **Proposed Behavior:**
    1.  **Fully Optional Keys:** All mainstream (TMDB/OMDB) and adult (StashDB/PornDB/FansDB) API keys are entirely optional during onboarding.
    2.  **Zero-Config Scans:** If a user scans a library folder without any API keys configured, the app successfully imports all media files.
    3.  **Local Thumbnail Extraction:** The backend automatically extracts a random frame/preview image from the video file itself (using ffmpeg or mpv) to serve as a local cover/backdrop, maintaining a rich visual library layout.
    4.  **Minimalist Info Page:** For unmatched local files, the details page displays a clean, dark-mode technical layout containing:
        *   Sanitized filename as the title.
        *   Local file path and size.
        *   Codec info, resolution, frame rate, and embedded audio/subtitle details.
    5.  **"Videos" Tab in Library:** Both SFW and NSFW library sections get a dedicated **"Videos"** tab. If no API keys are configured, all scanned files (regardless of their matched type) bypass the match/scraping steps completely and are placed directly into this tab as local raw videos.
    6.  **Dashboard CTA Card for API Keys:** If the library scan detects unmatched items and no API keys are set, display a sleek, dismissible recommendation card on the Dashboard:
        *   *"Unlock the Full Power of Swaya: Add API keys to automatically load cover art, actor profiles, and studio details."*
        *   Contains direct links to the Providers settings page and a close button `[x]` to dismiss it permanently.
    7.  **Stealth Mode:** SFW/NSFW toggle is completely hidden in the UI if only SFW folders are scanned, preventing accidental exposures.

---

## 3. Adult Provider Configurations in Settings
*   **Status:** Proposed / Backlog
*   **Goal:** Provide full settings configuration fields for adult API keys alongside mainstream settings.
*   **Details:**
    *   Create a new sub-section under **Settings > Providers** for Adult Providers.
    *   Expose endpoints in the Python backend to securely store these keys in `UserSetting` or database configurations.
    *   Enable automatic fallback/validation checks on those API tokens.

---

## 4. Smart Language & Audio/Subtitle Track Preferences
*   **Status:** Proposed / Backlog
*   **Goal:** Automate audio and subtitle track selection based on global user preferences.
*   **Details:**
    *   **Global Preferences:** Add settings in settings panel (e.g., `Preferred Audio Language` [Hungarian, English, etc.], `Preferred Subtitle Language`, and `Auto-hide Subtitles if audio matches preferred language`).
    *   **Startup Logic:** Pass preference languages to MPV via `--alang` and `--slang` startup arguments.
    *   **Smart Subtitle Rules (React Layer):** Detect active audio tracks inside `handleMpvEvent` (`track-list`). If the active audio track matches the user's native language (e.g., Hungarian), automatically execute `set_property sid no` to turn off subtitles. If audio is in a foreign language (e.g., English), automatically activate subtitles of the preferred language.
    *   **Per-Video Customization Override:** Remember manual overrides (e.g. if the user manually changes subtitle/audio for a specific video) by saving selected track IDs inside the media item's playback progress metadata, allowing future resumes of that video to preserve choices.
    *   **Visual Priority List:** Enable a Drag-and-Drop list in Settings to sort language priorities.

---

## 5. Advanced Player Quality-of-Life (QoL) Features (VLC Inspiration)
*   **Status:** Proposed / Backlog
*   **Goal:** Port best-in-class media playback QoL mechanics from VLC player to Swaya's embedded MPV player.
*   **Details:**
    *   **Audio/Subtitle Sync Sliders:** Provide fine-grained adjustments in the audio and subtitle tracks selectors (or hotkeys `G`/`H` for subtitle delay, `J`/`K` for audio delay) to correct sync offsets.
    *   **Software Audio Amplification (Volume Boost):** Allow the volume slider/mouse-wheel scroll to go up to 200% using MPV's native software gain scaling (very useful for quiet laptop speakers).
    *   **Multi-tier Léptetési Távolságok (Custom Skip Steps):**
        *   `Shift + Left/Right`: Micro-skip (3 seconds - e.g., to catch a missed word)
        *   `Alt + Left/Right`: Medium-skip (10 seconds)
        *   `Ctrl + Left/Right`: Long-skip (1 minute)
    *   **Frame-by-Frame Stepping:** Add a hotkey (e.g., `E`) to advance the paused video frame-by-frame, enabling high-precision Peak Moment selection.
    *   **Subtitle Style Customization:** Add a font-size scale slider (e.g., 50% to 150%) to adjust subtitle sizes on the fly.

---

## 6. Tone of Voice & Explicit/Elegant Language Selection
*   **Status:** Proposed / Backlog
*   **Goal:** Provide customizable application tone of voice by introducing selectable locale/translation variants.
*   **Proposed Behavior:**
    1.  **Multiple Tone Variants:** In addition to standard language locales (e.g., English, Hungarian), introduce tone variants:
        *   **Standard / Elegant (Default):** Polite, clean, professional, and discreet vocabulary (perfect for SFW environments or keeping a clean profile).
        *   **Explicit / Fun:** Playful, direct, and explicit/adult-humored text (e.g., customized empty states, playful peak moment descriptors, and fun buttons).
    2.  **Locales Registration:** Leverage the existing i18next translation namespace structure to create `en-explicit`, `hu-explicit` variants by copying and customizing JSON files (`dashboard.json`, `library.json`, etc.) without altering React layout or logic code.
    3.  **Dropdown Toggle in Settings:** Expose a "Tone of Voice / Style" selection dropdown (or append it directly in Settings > General > Language options as e.g. "English (Explicit / Fun)") allowing users to switch tone preferences dynamically.
