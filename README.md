# Swaya

Swaya is a media library management application consisting of an Electron and React frontend and a FastAPI backend.

The application scans local directories, identifies media files, resolves metadata from external services, and tracks playback state.

## Program State and Architecture

The backend codebase has been refactored into a highly modular, decoupled architecture following Domain-Driven Design (DDD) principles:

- **Routing Segregation**: Endpoints are split into specific sub-routers (e.g. people management endpoints are distributed across mainstream, adult, detail, images, linking, and status sub-routers) to avoid single large route files.
- **Polymorphic Strategies**: Tasks such as filmography querying, scraper normalization, and media organization use strategy patterns (e.g. MovieOrganizer, SceneOrganizer, EpisodeOrganizer) to handle type-specific logic.
- **Separation of Infrastructure and Domains**: Low-level network clients, caching, and rate limiting (e.g. PornDB Client) are separated from higher-level provider parsing logic.
- **Read-Write Separation**: Override systems separate query verification (e.g. TitleLockReader) from override updates and db sync operations (e.g. TitleLockService).
- **Sub-service Delegation**: Heavy domain services delegate specific behaviors (like cast building, playback resolving, and metadata syncing) to dedicated sub-components.

## Repository Structure

- **frontend/**: React and Electron client application
- **app/**: FastAPI backend engine (application services, domain models, infrastructure adapters, and scrapers)

---

## Backend Architecture

The backend follows a DDD layered structure:

```
app/
  application/       -- HTTP layer: routes, schemas, validation, and use cases
    catalog/           organizer/discovery API
    history/           watch history queries
    library/           library endpoints (listing, filtering, details)
    media/             media playback, preview, and logging delegation
    metadata/          metadata queries (TMDB search, details)
    organizer/         organizer page API and strategies
    people/            people endpoints and route packages
    recommendations/   recommendation API
    settings/          application settings
    tasks/             background task control and status
    users/             user management, overrides, custom lists

  domains/            -- Core business logic: entities, value objects, domain services
    history/           watch and audit log models
    library/           library, media item, and extra file models; scanners and formatters
    media/             media access and playback logic
    media_assets/      image processing (download, crop, thumbnails)
    metadata/          metadata match models
    people/            person models and detail resolvers
    recommendations/   recommendation algorithms
    settings/          system settings models
    tasks/             background task managers and workers
    users/             user overrides, custom lists, and tag models

  infrastructure/     -- External system integrations, repositories, and scrapers
    cache/             SQLite-based API cache (TTL, negative cache)
    filesystem/        file system operations and watchdog
    media/             DB adapters, mixins, and resolvers
    playback/          playback monitoring (player detector, monitor)
    repositories/      generic database repository implementations
    scrapers/          API providers (TMDB, OMDb, StashDB, PornDB, FansDB) and normalizers
    settings/          settings persistence adapters
    tasks/             task-specific adapters

  shared_kernel/      -- Shared components: enums, constants, DB session, and ports
```

### Tech Stack

| Category            | Tool                      |
|---------------------|---------------------------|
| Web framework       | FastAPI + Uvicorn          |
| Validation          | Pydantic v2                |
| ORM                 | SQLAlchemy 2.0             |
| Database            | SQLite                     |
| Migrations          | Alembic                    |
| Image processing    | Pillow                     |
| File identification | guessit                    |
| File watching       | watchdog                   |
| Testing             | pytest + anyio             |
| Platform            | Windows (pywin32)          |

### Prerequisites

- Python 3.10+
- FFmpeg and FFprobe available on PATH

### Setup and Running

Install dependencies:
```bash
pip install -r requirements.txt
```

Start the server:
```bash
python run.py
```

Or directly via Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

Databases and directories are created automatically on first run.

### Migrations

Managing Alembic migrations:
```bash
# Apply current schema
alembic upgrade head

# Generate a new migration after model changes
alembic revision --autogenerate -m "description"
```

### Tests

```bash
python -m pytest
```

---

## Frontend

The frontend is built with React 19, Vite, and runs inside Electron.

### Tech Stack

| Category            | Tool                      |
|---------------------|---------------------------|
| Shell/Runtime       | Electron                  |
| Bundler/Dev server  | Vite                      |
| UI Library          | React 19                  |
| State management    | Zustand                   |
| Data fetching       | TanStack Query (v5)       |
| Routing             | React Router 7            |

### Setup and Running

Go to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start in development mode (launches Vite dev server and Electron window):
```bash
npm run dev
```

Build and package instructions are defined in the `package.json` scripts.
