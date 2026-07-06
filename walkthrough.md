# Infinite Scroll Implementation Walkthrough

Introduced an optional Infinite Scroll mode to the Media Library page, toggled directly from the Pagination Bar.

## Changes Made

### 1. State & Data Accumulation Logic
- **File**: [useLibraryState.js](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/hooks/useLibraryState.js)
- Introduced `paginationMode` (persisted in `localStorage`) and `accumulatedItems` states.
- Handled automatic resetting of `accumulatedItems` to `[]` whenever filters, tabs, search queries, active tab, sort direction, or page size change.
- Appends new query data to `accumulatedItems` when fetching next pages under server-paged lists.
- Dynamically calculates `paginatedItems` depending on the current pagination mode.

### 2. Mode Toggle UI
- **File**: [PaginationBar.jsx](file:///e:/projects/python/Swaya/frontend/src/app/ui/PaginationBar.jsx) and [PaginationBar.css](file:///e:/projects/python/Swaya/frontend/src/app/ui/PaginationBar.css)
- Added new toggle button styles and JSX components to swap pagination modes.
- Hid standard page nav controls when `infinite` mode is active.

### 3. Prop Delegation
- **File**: [LibraryPagination.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/components/LibraryPagination.jsx)
- Passed down `paginationMode` and `onPaginationModeChange` props.

### 4. Scroll Sentinel & Behavior
- **File**: [LibraryPage.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/LibraryPage.jsx)
- Added an `IntersectionObserver` sentinel below the media grid to automatically trigger loading the next page when the user scrolls near the bottom.
- Disabled the default scroll-to-top transition on page changes when infinite scroll is enabled.

### 5. Genre Localization and Language Switch Caching Fixes
- **Files**:
  - [LibraryFilters.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/components/LibraryFilters.jsx)
  - [TMDBDiscoveryWidget.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/dashboard/widgets/TMDBDiscoveryWidget.jsx)
  - [MediaHeaderInfo.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/components/detail/MediaHeaderInfo.jsx)
- **Fix**: Corrected the localization default value arguments by passing `{ defaultValue: value }` as an options object instead of a string to the `t()` translation function. This allows dynamically fetched database genres to fall back gracefully to their original names (e.g. `"Akció"`, `"Bűnügyi"`) rather than showing raw key prefixes like `"library.genres.Akció"`.
- **Cache Invalidation**: Updated [useLibraryState.js](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/hooks/useLibraryState.js) to pass `settings?.primary_metadata_language` to `useLibraryFiltersQuery`. This automatically invalidates and refetches the filters list when the user switches metadata languages.

### 6. Automated Butt Size Calculation & EXTRA_BIG Option
- **Backend Logic**: Updated [models.py](file:///e:/projects/python/Swaya/app/domains/people/models.py) in `recalculate_projection` to automatically calculate `butt_size` using a weighted formula based on `height` (cm), `waist` (inches), and `hip` (inches) if the user has not manually set a custom butt size.
- **Formulas & Ranges**:
  - `FAH = hip / (height_in * 0.53)`
  - `WHR = waist / hip`
  - `CCF = 0.72 / WHR`
  - `BCS = hip * FAH * CCF`
  - Maps to: `SMALL` (< 33), `MEDIUM` (33-39), `BIG` (40-49), `EXTRA_BIG` (>= 50).
- **Frontend Dropdowns**: Added the new `EXTRA_BIG` option to both:
  - Custom values tab options in [performerCustomValuesConfig.js](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/performer-edit/tabs/performerCustomValuesConfig.js)
  - Advanced filtering options in [LibraryAdvancedFilters.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/components/LibraryAdvancedFilters.jsx)

### 7. Video Snapshot on Finish Log
- **Backend Storage**: Added a `snapshot_path` column to the `PlaybackPeakLog` database model and updated schemas/endpoints to support storing and resolving the local snapshot file URL under the static `/media` path.
- **Electron IPC Integration**: Created the `mpv-take-snapshot` IPC handler in [mpvPlayer.js](file:///e:/projects/python/Swaya/frontend/mpvPlayer.js) which triggers MPV's native screenshot-to-file command directly to `data/media/images/snapshots/`.
- **Frontend Player Capture**: Updated `handleAddPeak` in [useVideoPlayer.js](file:///e:/projects/python/Swaya/frontend/src/app/pages/player/hooks/useVideoPlayer.js) to first invoke the screenshot handler, then save the generated file path alongside the peak moment position in the database.
- **UI Lightbox**: Rendered the snapshot image instead of the droplets placeholder on history cards in [HistoryPage.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/history/HistoryPage.jsx) and added a zoom-in lightbox magnifying modal overlay.
- **Enter Hotkey**: Added a keydown event listener in [useVideoPlayer.js](file:///e:/projects/python/Swaya/frontend/src/app/pages/player/hooks/useVideoPlayer.js) to trigger the finish snapshot/log when hitting the `Enter` key during adult media playback.

### 8. Performer Finishes Statistics
- **Backend Collation**: Added database queries in [detail_collator.py](file:///e:/projects/python/Swaya/app/domains/people/services/detail/detail_collator.py) to compute `finish_count` and retrieve `last_finish_at` for adult performers, exposing them via the updated `PersonDetailResponse` schema.
- **UI Metadata Grid**: Appended a 3rd row to the sidebar metadata table in [PeopleHeroSection.jsx](file:///e:/projects/python/Swaya/frontend/src/app/pages/library/components/entityDetail/PeopleHeroSection.jsx) to display **Finishes** and **Last Finish** stats cleanly without breaking the design.
