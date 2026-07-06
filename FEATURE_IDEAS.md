# Swaya Feature Recommendations – UI/UX Impact vs Effort

Rangsorolás: **UI/UX hatás ÷ befektetett energia** szerint (legjobb ROI elöl).

> [!NOTE]
> A projekt jelenlegi állapota alapján: van dashboard (widgetekkel), library grid + detail page, organizer, player (MPV), history, ratings, lists, tags, search, settings, onboarding. Backend: DDD, scrapers (TMDB/OMDb/StashDB/PornDB/FansDB), action log (undo/redo modell), playback peaks.

---

## 🟢 Alacsony Effort / Magas Hatás

### 1. Keyboard Shortcuts rendszer
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐⭐ |
| **Effort** | ⭐⭐ |

Globális hotkey-ek: `Space` (play/pause), `F` (fullscreen), `/` (search focus), `←/→` (seek), `Esc` (back), `1-5` (quick rate). A shell szintjén egy `useHotkeys` hook, amely route-aware. Desktop app esetén ez elengedhetetlen power-user feature.

---

### 2. Skeleton loading states
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐ |

A library grid, detail page, dashboard widgetek jelenleg valószínűleg spinnerrel vagy üres állapottal töltenek. Shimmer/skeleton placeholder-ek (`PosterCard.skeleton`, `DetailPage.skeleton`) drasztikusan javítják a perceived performance-ot. Csak CSS + pár wrapper komponens.

---

### 3. Toast notification rendszer bővítés (undo action)
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐ |

Van `ToastViewport` + `ActionBatch/ActionLog` a backend-en. Összekapcsolás: destruktív műveletek (törlés, rating reset, tag eltávolítás) után toast "Undo" gombbal. Az infrastruktúra nagy része megvan (action log), csak a frontend wiring hiányzik.

---

### 4. Drag & Drop rendezés a listákban
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐ |

A `CustomList` modellben van `order` mező. A `ListsPage`-en drag-and-drop sorrendezés (pl. `@dnd-kit/core`) a lista elemekre. A dashboard widget order már localStorage-ban van, ugyanez a pattern.

---

### 5. Quick Actions a PosterCard-on (hover overlay)
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐⭐ |
| **Effort** | ⭐⭐ |

Hover-re megjelenő mini action bar a poster card-okon: ▶ Play, ❤ Favorite, ★ Quick Rate, 📋 Add to List. Jelenleg a PosterCard ~10KB, van context menu, de nincs hover quick action. Ez a leggyakoribb interakciós pattern media app-okban (Plex, Jellyfin, Letterboxd).

---

### 6. Animated page transitions
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐ |

`React Router` + `framer-motion` (vagy CSS `View Transitions API`) az `AppShell` children-jére. Fade/slide transition oldalak között. Egyetlen wrapper komponens az `Outlet` köré.

---

## 🟡 Közepes Effort / Magas Hatás

### 7. Library view mode toggle (Grid / List / Compact)
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

Jelenleg poster grid az egyetlen nézet (`PosterGrid`, `LibraryGrid`). Egy list/table view (Sonarr/Radarr stílusú) a technikai adatokkal (méret, codec, felbontás), és egy compact grid (kisebb kártyák, több tartalom). A `SegmentedControl` UI komponens már létezik.

---

### 8. Media detail page – Similar/Related titles szekció
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

A `recommendations` domain létezik de a services mappa üres (nincs .py fájl, csak `__pycache__`). A TMDB API-nak van `/movie/{id}/similar` endpoint-ja. Egy horizontálisan görgethető kártya sor a detail page alján. Backend: 1 endpoint, frontend: 1 section komponens.

---

### 9. Bulk selection mode a library grid-ben
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

`SelectableCard` komponens már van. Long-press vagy checkbox-os multi-select a grid-ben → bulk tag, bulk rate, bulk add-to-list, bulk delete. A `FloatingActionBar` komponens pont erre való.

---

### 10. Infinite scroll / Virtualized grid
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

Van `PaginationBar` (klasszikus lapozás). Virtualized grid (`react-window` vagy `@tanstack/react-virtual`) jobb UX nagy könyvtáraknál (1000+ item). Smooth scrolling, nincs page break. Opcionálisan: felhasználó választhat pagination vs infinite scroll.

---

### 11. "Now Playing" mini player bar
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

Van `PlayerControlBar` a shell-ben, de úgy tűnik csak a dedikált player page-en aktív. Egy persistent mini bar az app alján (Spotify-style) ami mutatja mit játszunk, progress bar, play/pause/seek. A `PlayerPage` jelenleg külön route (`/player/:itemId`), a mini bar lehetővé tenné a browsing közbeni lejátszást.

---

### 12. Watch statistics vizualizáció (heatmap / chart)
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

A `PlaybackLog` + `PlaybackPeakLog` adatok megvannak. GitHub-style activity heatmap (melyik napokon néztél tartalmat), genre breakdown pie chart, watch time trend line chart. A `StatisticsWidget` + `LibraryInsightsWidget` már létezik a dashboard-on – ez azok kibővítése lenne egy dedikált `/statistics` oldallal.

---

## 🟠 Közepes-Magas Effort / Magas Hatás

### 13. Smart Collections / Dynamic Filters (saved filters)
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐⭐ |

A `LibraryFilters` + `LibraryAdvancedFilters` (17KB + 6.5KB) gazdag szűrőrendszert jelez. Ezek mentése "Smart Collection"-ként (pl. "4K HDR Movies", "Unwatched Sci-Fi"). Sidebar-ban megjeleníthetők a custom listek mellett. Backend: 1 új modell a filter preset-eknek.

---

### 14. Notification center / Activity feed
| | |
|---|---|
| **Hatás** | ⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

A `tasks` domain (background task control + status) már létezik. Egy notification bell a titlebar-ban ami mutatja: scan kész, metadata sync kész, új fájlok találva, stb. Slide-in panel a jobb oldalon. SSE/WebSocket a backend-ről.

---

### 15. Collection / Franchise nézet
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐⭐ |

A `MediaCollection` modell létezik a metadata domain-ben. Vizuális franchise timeline (pl. MCU, Star Wars) – horizontális timeline kártyákkal, jelölve melyiket láttad. A `CustomListItem` már tud collection-re mutatni, szóval a backend adat megvan, csak a dedikált UI hiányzik.

---

### 16. Theme engine / Custom themes
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

CSS custom property-k valószínűleg már használatban (lásd a `var(--color-text-primary)` stílusú referenciákat). Egy theme selector a settings-ben: Dark (default), Light, OLED Black, Midnight Blue, stb. Akár user-defined accent color picker. Minimális backend, főleg CSS + settings UI.

---

### 17. Media comparison view
| | |
|---|---|
| **Hatás** | ⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

Ha van ugyanabból a filmből több verzió (különböző kiadások, felbontások), side-by-side összehasonlítás: technikai adatok táblázatban, melyik a jobb minőségű. Az `edition`, `resolution`, `video_codec`, `hdr_type` mezők megvannak a `MediaItem`-en. Duplicate detection (`hash_phash`, `group_hash`).

---

### 18. Person detail page bővítés – filmográfia timeline
| | |
|---|---|
| **Hatás** | ⭐⭐⭐ |
| **Effort** | ⭐⭐⭐ |

A `PeopleCollectionDetailPage` már létezik (15KB). Egy vizuális timeline a személy karrierjéről: filmek/sorozatok kronológikus sorrendben, jelölve melyeket láttad. A TMDB credits API adja az adatot, a frontend egy horizontális timeline komponens.

---

### 19. "Watch Party" szinkronizáció (multi-user)
| | |
|---|---|
| **Hatás** | ⭐⭐⭐⭐ |
| **Effort** | ⭐⭐⭐⭐⭐ |

A `User` modell multi-user ready (roles: owner/member/child). WebSocket alapú szinkronizált lejátszás: host indít, mindenki szinkronban nézi. Chat overlay. Magas effort, de a multi-user infra egy része megvan.

---

### 20. Offline metadata cache + Progressive image loading
| | |
|---|---|
| **Hatás** | ⭐⭐⭐ |
| **Effort** | ⭐⭐ |

Blur-up image loading (tiny placeholder → full res) a poster/backdrop képekhez. A `media_assets` domain (image processing, crop, thumbnails) támogatja a különböző méretű képek generálását. Kis LQIP (Low Quality Image Placeholder) generálás a backend-en, progressive loading a frontend-en.

---

## Összefoglaló mátrix

| # | Feature | UI/UX Hatás | Effort | ROI |
|---|---------|:-----------:|:------:|:---:|
| 1 | Keyboard shortcuts | ⭐⭐⭐⭐⭐ | ⭐⭐ | 🔥🔥🔥 |
| 2 | Skeleton loading | ⭐⭐⭐⭐ | ⭐ | 🔥🔥🔥 |
| 3 | Toast undo actions | ⭐⭐⭐⭐ | ⭐⭐ | 🔥🔥🔥 |
| 4 | Drag & drop lists | ⭐⭐⭐⭐ | ⭐⭐ | 🔥🔥🔥 |
| 5 | PosterCard quick actions | ⭐⭐⭐⭐⭐ | ⭐⭐ | 🔥🔥🔥 |
| 6 | Page transitions | ⭐⭐⭐⭐ | ⭐ | 🔥🔥🔥 |
| 7 | Grid/List/Compact view | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 8 | Similar titles | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 9 | Bulk selection | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 10 | Virtualized grid | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 11 | Mini player bar | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 12 | Watch stats charts | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 13 | Smart collections | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔥 |
| 14 | Notification center | ⭐⭐⭐ | ⭐⭐⭐ | 🔥 |
| 15 | Franchise timeline | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔥 |
| 16 | Theme engine | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥🔥 |
| 17 | Media comparison | ⭐⭐⭐ | ⭐⭐⭐ | 🔥 |
| 18 | Person timeline | ⭐⭐⭐ | ⭐⭐⭐ | 🔥 |
| 19 | Watch party | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔥 |
| 20 | Progressive images | ⭐⭐⭐ | ⭐⭐ | 🔥🔥 |
