# Swaya

A desktop media library manager for movies, TV shows, and scenes. Scans your local folders, pulls metadata from several online databases, downloads artwork, tracks what you've watched, and plays files with an embedded MPV player - all from one app.

## What It Does

- **Folder scanning** - Point it at a directory and it will find video files, identify them using `guessit`, and match them against TMDB, OMDb, StashDB, PornDB, or FansDB.
- **Metadata resolution** - Automated pipeline resolves titles, cast, genres, ratings, and artwork. Supports mainstream and adult content pipelines separately.
- **Image handling** - Downloads posters, backdrops, logos, and headshots. Resizes originals, generates thumbnails, and filters logos/backdrops by brightness so you don't end up with invisible art on dark UIs.
- **Embedded playback** - MPV runs as a child process controlled over a JSON IPC socket. Supports picture-in-picture, chapter navigation, subtitle/audio track switching, and playback speed controls.
- **Watch history** - Tracks progress per file. Resume where you left off.
- **File organization** - Organizer module can rename and move matched files into a clean folder structure based on configurable strategies (movie, episode, scene).
- **Recommendations** - Basic recommendation engine surfaces titles based on your library and history.
- **Background tasks** - Long-running operations (scanning, metadata sync, image downloads, people enrichment) run in background workers with status tracking and abort support.
- **System tray** - Minimizes to tray on close. Tray context menu for quick access or quit.
- **SFW/NSFW modes** - Separate content views with persisted toggle. Adult content is filtered at both the API and UI level.
- **Custom lists & tags** - Create and manage personal collections and tag items freely.
- **Hotkeys** - Global hotkey listener on Windows for media control.
- **Live folder watching** - Watchdog monitors library directories for changes and auto-updates the database.

## Architecture

The project is split into two parts: a Python backend and a JavaScript frontend.

### Backend (`app/`)

FastAPI server, structured in a DDD-inspired layered layout:

```
app/
├── application/        Routes, schemas, request handling
│   ├── catalog/        Discovery/browsing API
│   ├── history/        Watch history endpoints
│   ├── library/        Library listing, filtering, details
│   ├── maintenance/    DB maintenance operations
│   ├── media/          Playback control and media serving
│   ├── metadata/       TMDB search, detail lookups
│   ├── organizer/      File rename/move strategies
│   ├── people/         Person detail and enrichment endpoints
│   ├── recommendations/Recommendation API
│   ├── settings/       App config endpoints
│   ├── tasks/          Background task control
│   └── users/          User management, overrides, lists
│
├── domains/            Core business logic, models, services
│   ├── history/        Watch log and audit trail models
│   ├── library/        Media item models, scanner, file categorizer
│   ├── media/          Media access and playback logic
│   ├── media_assets/   Image download, crop, thumbnail generation
│   ├── metadata/       Match models and lock management
│   ├── people/         Person models, detail resolution
│   ├── recommendations/Rec engine logic
│   ├── settings/       Settings models
│   ├── tasks/          Task manager, download worker, background jobs
│   └── users/          User overrides, custom lists, tags
│
├── infrastructure/     External integrations and adapters
│   ├── cache/          SQLite API response cache with TTL + negative caching
│   ├── filesystem/     Folder watcher (watchdog), file utilities
│   ├── media/          DB adapters and query mixins
│   ├── playback/       Player detection, playback monitor, hotkey listener
│   ├── repositories/   Generic SQLAlchemy repository base
│   ├── scrapers/       Provider clients (TMDB, OMDb, StashDB, PornDB, FansDB)
│   ├── settings/       Settings persistence
│   └── tasks/          Task-specific adapters
│
└── shared_kernel/      Enums, constants, DB session, logging, ports
```

Key design decisions:
- Read/write separation - readers are pure query classes, services handle mutations.
- Two SQLite databases - `swaya.db` for application data, `cache.db` for API response caching with configurable TTLs.
- Background workers run on the main event loop via async, with a thread pool executor for blocking I/O.
- Scraper gateway provides a unified interface over all provider clients with rate limiting.

### Frontend (`frontend/`)

Electron shell wrapping a Vite + React 19 SPA.

```
frontend/
├── main.js             Electron main process, window management, tray, IPC
├── mpvPlayer.js        MPV child process management over JSON IPC socket
├── dev-runner.js       Dev mode launcher (Vite + Electron concurrently)
├── src/
│   ├── main.jsx        React entry point
│   └── app/
│       ├── shell/      App shell, sidebar, titlebar, global search
│       ├── pages/      Route-level page components
│       │   ├── dashboard/
│       │   ├── library/
│       │   ├── organizer/
│       │   ├── player/
│       │   ├── history/
│       │   ├── search/
│       │   ├── settings/
│       │   ├── lists/
│       │   ├── tags/
│       │   ├── ratings/
│       │   ├── statistics/
│       │   ├── about/
│       │   └── onboarding/
│       ├── ui/         Shared component library (~50 primitives)
│       ├── queries/    TanStack Query hooks and mutations
│       ├── stores/     Zustand state stores
│       ├── hooks/      Shared utility hooks
│       ├── routes/     Route definitions (core, library, organizer)
│       ├── providers/  React context providers
│       ├── locales/    i18n translations (English)
│       └── styles/     Global CSS, design tokens
```

Frontend details:
- Custom frameless window with a hand-built titlebar (minimize, maximize, close).
- Hash router (required for Electron `file://` protocol in production builds).
- Global search with keyboard shortcut support.
- Skeleton loading states, infinite scroll, scroll position restoration.
- Renderer heartbeat watchdog - Electron main process monitors responsiveness and auto-reloads on crash.
- Production builds bundled with `electron-builder` (Windows `.exe`, Linux `AppImage`).
- Backend is bundled as a PyInstaller executable shipped in `extraResources`.

## Tech Stack

### Backend

| Component         | Technology              |
|-------------------|-------------------------|
| Framework         | FastAPI + Uvicorn       |
| Validation        | Pydantic v2             |
| ORM               | SQLAlchemy 2.0          |
| Database          | SQLite (WAL mode)       |
| Migrations        | Alembic                 |
| Image processing  | Pillow                  |
| File ID           | guessit                 |
| File watching     | watchdog                |
| HTTP client       | requests                |
| Packaging         | PyInstaller             |
| Testing           | pytest + anyio + httpx  |

### Frontend

| Component         | Technology              |
|-------------------|-------------------------|
| Runtime           | Electron                |
| Bundler           | Vite                    |
| UI                | React 19                |
| State             | Zustand                 |
| Data fetching     | TanStack Query v5       |
| Routing           | React Router 7          |
| Icons             | Lucide React            |
| Linting           | ESLint + Stylelint      |
| E2E testing       | Playwright              |
| Packaging         | electron-builder        |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- FFmpeg and FFprobe on your PATH
- MPV installed (`mpv` binary accessible, or placed in `frontend/bin/win/` for bundled builds)
- **Linux only**: install MPV via your package manager (e.g. `sudo apt install mpv`)

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
python run.py
```

The server starts on `http://127.0.0.1:8000`. Databases and data directories are created automatically on first launch.

You can also run via Uvicorn directly:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start development mode (Vite dev server + Electron window)
npm run dev
```

### Building for Production

```bash
cd frontend

# Build the React app
npm run build

# Package into a distributable
npm run dist
```

The packaged output goes to `frontend/dist-electron/`.

### Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration after changing models
alembic revision --autogenerate -m "describe your change"
```

### Running Tests

Backend:
```bash
python -m pytest
```

Frontend (smoke tests):
```bash
cd frontend
npx playwright test
```

### Linting

```bash
cd frontend

# JS/JSX
npm run lint

# CSS
npm run lint:style
```

## Project Layout

```
.
├── app/                Python backend (FastAPI)
├── frontend/           Electron + React frontend
├── alembic/            Database migration scripts
├── data/               Runtime data (DBs, images, previews) - gitignored
├── logs/               Application logs - gitignored
├── requirements.txt    Python dependencies
├── alembic.ini         Alembic configuration
├── run.py              Backend entry point
└── LICENSE             Source-available license
```

## Licensing & Sustainability

Swaya is built with a commitment to transparency, open collaboration, and long-term active development. To make the project sustainable while keeping the code accessible, it is distributed under a **Source-Available License**:

* **For Developers & Contributors:** The entire source code is public, inspectable, and open for community contributions. You can download, compile, and run the software locally for free for personal, non-commercial use.
* **For Convenience & Support:** Official pre-built installers (.exe), automatic background updates, and certain premium features require a commercial license (subscription or one-time lifetime purchase). 

This hybrid model ensures that I can dedicate the massive amount of time required to actively maintain and improve Swaya as a solo developer, while keeping the codebase fully transparent to everyone.
