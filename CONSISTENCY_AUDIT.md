# SWAYA – Konzisztencia-elemzés

Átfogó áttekintés az egységesítendő mintákról, backend és frontend oldalon.

---

## 1. Backend – Domain struktúra inkonzisztencia

| Domain | `__init__.py` | `schemas.py` | `models.py` | `services/` dir |
|---|---|---|---|---|
| library | ✅ | ✅ | ✅ | ✅ |
| people | – | ✅ | ✅ | ✅ |
| metadata | ✅ | ✅ | ✅ | ✅ |
| history | – | ✅ | ✅ | ✅ |
| settings | – | – | ✅ | ✅ |
| users | – | ✅ | ✅ | ✅ |
| tasks | ✅ | – | ✅ | – (`manager.py`, `worker.py` top-level) |
| recommendations | – | – | – | ✅ (services dir only) |
| media | – | – | – | `models/`, `services/` (subdirectory models) |
| media_assets | ✅ | – | – | ✅ |

**Probléma:** Nincs egységes domain mappa sablon. Néhány domain-nek van `__init__.py`-ja, másnak nincs. A `tasks` és `media` domainek teljesen eltérő belső struktúrát követnek.

**Javaslat:** Egységes domain sablon: minden domain tartalmaz `__init__.py`, `models.py`, `schemas.py` (ha van API felülete), `services/` könyvtárat.

---

## 2. Backend – Application layer schema kezelés

Három különböző minta létezik:

| Minta | Példa | Leírás |
|---|---|---|
| **Re-export** | `application/library/schemas.py`, `people/schemas.py`, `history/schemas.py`, `users/schemas.py`, `metadata/schemas.py` | Domain schemas re-exportálva `as` aliasokkal |
| **Saját schemák** | `application/settings/schemas.py`, `media/schemas.py`, `organizer/schemas.py`, `recommendations/schemas.py` | Saját Pydantic model definíciók az application rétegben |
| **Inline modellek** | `organizer/routes.py:13-19`, `media/routes.py:29-43`, `users/routes.py:267-269`, `recommendations/routes.py:13-15` | Request modellek közvetlenül a routes fájlban definiálva |

**Probléma:** A settings domain-nek nincs domain-szintű `schemas.py` fájlja – a schemák közvetlenül az application rétegben vannak definiálva, ami sérti az architektúra rétegződést.

**Javaslat:**
- Minden domain-nek legyen saját `schemas.py`
- Application réteg csak re-exportáljon vagy saját request/response DTO-kat adjon hozzá
- Inline model definíciók kerüljenek a `schemas.py` fájlba

---

## 3. Backend – Dependency Injection inkonzisztencia

### 3.1 Service factory pattern

| Minta | Példa |
|---|---|
| **`_service()` helper function** | `settings/routes.py:20` → `_settings_service(db)` |
| **`_service()` + lazy import** | `people/routes_detail.py:16` → `_people_detail_service(db)` |
| **Inline instantiation** | `organizer/routes.py:23` → `OrganizerService(db, scraper_gateway)` |
| **Inline instantiation + local import** | `library/routes.py:81` → `from ... import; LibraryStatsService(db, ...)` |

### 3.2 Infrastructure dependency injection

A `DbMediaResolver` és `DbSettingsAdapter` 26+ helyen van importálva és inline példányosítva. Nincs FastAPI `Depends()` alapú DI.

**Javaslat:**
- Egységes factory function minta minden route fájlban
- Közös `dependencies.py` fájl a gyakori infrastruktúra adapterekhez (pl. `get_media_resolver`, `get_settings_adapter`)
- FastAPI `Depends()` használata ezekhez

---

## 4. Backend – Error handling kétféle módja

| Minta | Hol |
|---|---|
| **Domain exceptions** (`DomainException`, `NotFoundException`) | `shared_kernel/exceptions.py` – központi handler a `main.py:106`-ben |
| **Közvetlen `HTTPException`** | 45+ helyen, **beleértve domain service-eket** (pl. `people_detail_service.py:140`, `person_linker_service.py:34`, `asset_manager.py:42`) |

**⚠️ KRITIKUS:** Domain service-ek **közvetlenül `HTTPException`-t** dobnak (FastAPI-specifikus), ami sérti a Hexagonal Architecture elvét. A domain réteg nem kellene, hogy tudjon a HTTP rétegről.

**Javaslat:** Domain service-ek `NotFoundException` / `BadRequestException`-t dobjanak, az application réteg konvertálja.

---

## 5. Backend – Router prefix és naming kuszaság

| Modul | Router név | Prefix | Tag |
|---|---|---|---|
| library | `mainstream_router` | `/api/v1/mainstream/media` | Mainstream Media |
| library | `adult_router` | `/api/v1/adult/media` | Adult Media |
| library | `router` | `/api/v1/media` | General Media |
| library | `library_router` | `/api/v1` | Library |
| media | `router` | `/api/v1` | Media Operations |
| metadata | `library_router` | `/api/v1` | Metadata |
| users | `router` | `/api/v1/users` | Users |
| users | `catalog_router` | `/api/v1` | User Catalog |
| people | `router` (composite) | `/api/v1/people` | General People |
| organizer | `router` | `/api/v1` | Organizer |
| recommendations | `router` | `/api/v1` | Recommendations |

**Problémák:**
- A `library_router` név **két különböző modult** is jelöl (library routes + metadata routes)
- Több router használ `/api/v1` prefix-et domain-specifikus útvonalak nélkül, ami nehezen áttekinthető
- A library domain 4 külön routert exportál, míg más domaineknek 1-2 van

**Javaslat:** Egységes naming convention, pl. minden domain egyetlen router-t exportáljon `router` néven, domain-specifikus prefix-szel (pl. `/api/v1/metadata`, `/api/v1/library`).

---

## 6. Backend – Untyped payloadok és response-ok

### Tipizálatlan request payloadok – 12 endpoint `payload: dict`-et fogad Pydantic model helyett:

- **users/routes.py:** `create_tag`, `update_tag`, `create_list`, `update_list`, `set_list_image`, `add_item_to_list`, `bulk_update_catalog_status`
- **settings/routes.py:** `update_settings`, `import_settings`, `validate_folders`, `validate_api_keys`
- **metadata/routes.py:** `trigger_sync_language`

### Tipizálatlan response modellek – 9 endpoint `response_model=dict`:

- **settings/routes.py** (7 endpoint)
- Több endpoint `response_model` nélkül

**Javaslat:** Pydantic modelleket használni mindenhol.

---

## 7. Backend – Import szervezés

Három import stílus keveredik:

| Stílus | Példa |
|---|---|
| **Top-level import** | `organizer/routes.py` – minden import a fájl tetején |
| **Lazy function-level import** | `library/routes.py:81` – `from ... import` az endpoint function-ön belül |
| **Vegyes** | `history/routes.py` – néhány top-level, néhány inline |

A lazy importok valószínűleg circular import elkerülésére szolgálnak, de nincs dokumentálva miért kell ez bizonyos helyeken.

---

## 8. Frontend – API réteg szervezés

### 8.1 API client vs Query/Mutation fájlok

| API modul | Dedikált fájl? | Queries/Mutations |
|---|---|---|
| library | `api/library.js` ✅ | `libraryQueries.js` ✅ |
| people | `api/people.js` ✅ | `peopleQueries.js` + `personMutations.js` |
| media | `api/media.js` ✅ | `mediaMutations.js` + `mediaAssetMutations.js` + `mediaPeakMutations.js` |
| scan, image, hydrate, organizer, task, history, tv, tags, rename, recommendations | `api/misc.js` 🔀 | szétszórva: `scanQueries.js`, `historyQueries.js`, stb. |

**Probléma:** A `misc.js` egy catch-all fájl, ami 8 különböző API domain-t tartalmaz (~128 sor). Ez nem skálázódik.

**Javaslat:** Minden API domain kapjon saját fájlt (`api/scan.js`, `api/history.js`, `api/tags.js`, stb.).

### 8.2 Query key kezelés

- `queryKeys.js` – centralizált `QK` konstansok ✅
- **DE** a query fájlok string literálokat is használnak: pl. `['stats', includeAdult]` a `libraryQueries.js`-ben ahelyett, hogy `QK.stats`-t használna

**Javaslat:** Mindenhol `QK.*` konstansokat használni.

---

## 9. Frontend – Stílus szervezés

Két különálló stílus könyvtár:
- `src/styles/` – globális `variables.css` + `themes/`
- `src/app/styles/` – layout és page-szintű CSS-ek (`layout.css` **és** `layout_clean.css`)
- UI komponensek saját CSS-sel `src/app/ui/` alatt (co-located)
- Page-specifikus CSS-ek a page mappában (co-located)

**Megjegyzés:** Van egy `layout.css` és egy `layout_clean.css` is az `app/styles/` mappában – ez gyanúsan duplikáció.

---

## 10. Frontend – Page szintű szervezés

| Page | Belső struktúra |
|---|---|
| library | `components/`, `hooks/`, `modals/`, `performer-edit/`, `utils/` – nagyon moduláris ✅ |
| organizer | 19 top-level fájl + `components/`, `hooks/`, `providers/` – **sok fájl a gyökérben** |
| settings | `components/`, `hooks/` + 14 top-level fájl |
| dashboard | `widgets/` + 3 top-level fájl – egyszerű de konzisztens |
| history | `components/` + 2 fájl |

Az organizer és settings oldalak sok top-level utility/hook/config fájlt tartalmaznak, amelyek logikailag al-mappákba tartozhatnának.

---

## 11. Frontend – HTTP path rewrite hack

A `http.js`-ben:

```js
if (adjustedPath.startsWith('/api/')) {
    adjustedPath = '/api/v1/' + adjustedPath.slice(5);
}
```

Ez mágikusan hozzáadja a `/v1/` szegmenst, de az API fájlok közvetlenül `/api/` prefix-szel hívják az URL-eket. Ez nem transzparens és error-prone.

**Javaslat:** Vagy a backend routerek használjanak `/api/` prefixet (v1 nélkül), vagy a frontend explicit `/api/v1/` útvonalakat használjon.

---

## Összefoglaló prioritás

| # | Terület | Hatás | Nehézség |
|---|---|---|---|
| 1 | **HTTPException a domain rétegben** | 🔴 Architekturális sérülés | Közepes |
| 2 | **Untyped `payload: dict` endpointok** | 🔴 Nincs validáció, nincs API doc | Közepes |
| 3 | **DI minta egységesítés** | 🟡 Karbantarthatóság | Nagy |
| 4 | **Router naming és prefix kuszaság** | 🟡 API átláthatóság | Nagy (breaking) |
| 5 | **Frontend `misc.js` szétbontása** | 🟢 Karbantarthatóság | Kicsi |
| 6 | **Domain mappa struktúra sablon** | 🟢 Konzisztencia | Kicsi |
| 7 | **Inline schema definíciók kiszervezése** | 🟢 Konzisztencia | Kicsi |
| 8 | **Query key konstansok egységesítése** | 🟢 Bug prevenció | Kicsi |
| 9 | **HTTP path rewrite eltávolítása** | 🟡 Átláthatóság | Közepes |
