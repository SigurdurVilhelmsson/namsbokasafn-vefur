# SvelteKit Migration Checklist

This tracker defines the SvelteKit migration with gated milestones. Each gate must be green before proceeding to the next. Features are implemented cleanly—the React app serves as UX reference, not code to copy.

**Last updated:** 2026-01-08

## Legend
- ☐ Not started
- ☐→ In progress
- ☑ Done

## Current Focus
**Milestone 3**: Quality & Testing - complete remaining items before polish phase.

---

## Milestone 0: Scope & Success Criteria (Gate) ☐→

| Status | Item |
| --- | --- |
| ☑ | Define v1 scope (see below). |
| ☐ | Define correctness criteria for each v1 feature. |
| ☑ | Define performance targets (see below). |
| ☑ | Identify what will be ignored from React (see "Do Not Port"). |

### V1 Scope (Ship Requirements)
**In v1:**
- Reader flow: catalog → book home → chapter list → section view
- Navigation: prev/next, sidebar TOC, keyboard shortcuts, deep links
- Content: Markdown with KaTeX, directives, practice problems
- Search: fuzzy search across book content
- Settings: theme, font size/family, focus mode
- Progress: current location, read markers (localStorage)
- Glossary + Flashcards + Periodic table
- Offline: download book for offline reading
- Basic accessibility: keyboard nav, ARIA labels, skip links

**Deferred to v2:**
- Annotations/highlights (React implementation is partial)
- TTS (needs Icelandic voice strategy)
- Analytics dashboards
- Learning objectives tracking
- Self-assessment features
- Bookmarks page
- Print stylesheet

### Performance Targets
- JS bundle: 25-35% smaller than React build on reader route
- TTI: 20-30% faster first contentful paint
- Offline: book loads fully after initial download

---

## Milestone 1: Core Reader Skeleton (Gate) ☑

| Status | Item |
| --- | --- |
| ☑ | Routes: landing, book home, section view, glossary, flashcards, periodic table. |
| ☑ | Content pipeline: markdown → HTML with KaTeX, directives, cross-references. |
| ☑ | Reader navigation: prev/next buttons, sidebar TOC, deep links. |
| ☑ | Progress tracking: current location + read markers stored locally. |
| ☑ | Settings: font size/family, focus mode, theme toggle. |
| ☑ | Keyboard shortcuts: navigation, search, focus mode, shortcuts modal. |
| ☑ | Search: fuzzy search modal with Ctrl/Cmd+K. |

### Ported Components (Milestone 1)

**Routes & Layouts:**
| React | Svelte | Status |
|-------|--------|--------|
| `src/components/layout/Header.tsx` | `src/lib/components/layout/Header.svelte` | ☑ |
| `src/components/layout/Sidebar.tsx` | `src/lib/components/layout/Sidebar.svelte` | ☑ |
| `src/components/layout/FocusModeNav.tsx` | `src/lib/components/layout/FocusModeNav.svelte` | ☑ |
| `src/components/layout/Layout.tsx` | `src/routes/+layout.svelte` | ☑ |
| `src/components/layout/BookLayout.tsx` | `src/routes/[bookSlug]/+layout.svelte` | ☑ |
| `src/components/reader/HomePage.tsx` | `src/routes/[bookSlug]/+page.svelte` | ☑ |
| `src/components/reader/ChapterView.tsx` | `src/routes/[bookSlug]/kafli/[chapterSlug]/+page.svelte` | ☑ |
| `src/components/reader/SectionView.tsx` | `src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte` | ☑ |
| `src/components/reader/GlossaryPage.tsx` | `src/routes/[bookSlug]/ordabok/+page.svelte` | ☑ |
| `src/components/reader/FlashcardsPage.tsx` | `src/routes/[bookSlug]/minniskort/+page.svelte` | ☑ |
| `src/components/reader/PeriodicTablePage.tsx` | `src/routes/[bookSlug]/lotukerfi/+page.svelte` | ☑ |

**UI Components:**
| React | Svelte | Status |
|-------|--------|--------|
| `src/components/reader/MarkdownRenderer.tsx` | `src/lib/components/MarkdownRenderer.svelte` | ☑ |
| `src/components/reader/NavigationButtons.tsx` | `src/lib/components/NavigationButtons.svelte` | ☑ |
| `src/components/reader/InteractivePracticeProblem.tsx` | `src/lib/components/InteractivePracticeProblem.svelte` | ☑ |
| `src/components/ui/SearchModal.tsx` | `src/lib/components/SearchModal.svelte` | ☑ |
| `src/components/ui/SettingsModal.tsx` | `src/lib/components/SettingsModal.svelte` | ☑ |
| `src/components/ui/KeyboardShortcutsModal.tsx` | `src/lib/components/KeyboardShortcutsModal.svelte` | ☑ |
| `src/components/periodic-table/PeriodicTable.tsx` | `src/lib/components/PeriodicTable.svelte` | ☑ |
| `src/components/catalog/BookCard.tsx` | `src/lib/components/BookCard.svelte` | ☑ |

**Stores:**
| React | Svelte | Status |
|-------|--------|--------|
| `src/stores/settingsStore.ts` | `src/lib/stores/settings.ts` | ☑ |
| `src/stores/readerStore.ts` | `src/lib/stores/reader.ts` | ☑ |
| `src/stores/flashcardStore.ts` | `src/lib/stores/flashcard.ts` | ☑ |
| `src/stores/annotationStore.ts` | `src/lib/stores/annotation.ts` | ☑ |
| `src/stores/quizStore.ts` | `src/lib/stores/quiz.ts` | ☑ |
| `src/stores/analyticsStore.ts` | `src/lib/stores/analytics.ts` | ☑ |
| `src/stores/objectivesStore.ts` | `src/lib/stores/objectives.ts` | ☑ |
| `src/stores/referenceStore.ts` | `src/lib/stores/reference.ts` | ☑ |

**Utils:**
| React | Svelte | Status |
|-------|--------|--------|
| `src/utils/markdown*` | `src/lib/utils/markdown.ts` | ☑ |
| `src/utils/contentLoader.ts` | `src/lib/utils/contentLoader.ts` | ☑ |
| `src/utils/searchIndex.ts` | `src/lib/utils/searchIndex.ts` | ☑ |
| `src/utils/srs.ts` | `src/lib/utils/srs.ts` | ☑ |

**Svelte Actions (new pattern):**
| Action | Purpose | Status |
|--------|---------|--------|
| `src/lib/actions/equations.ts` | KaTeX copy/zoom interactivity | ☑ |
| `src/lib/actions/practiceProblems.ts` | Practice problem reveal/check | ☑ |
| `src/lib/actions/keyboardShortcuts.ts` | Multi-key sequence shortcuts | ☑ |
| `src/lib/actions/figureViewer.ts` | Image lightbox for markdown images | ☑ |

---

## Milestone 2: Offline + Content Integrity (Gate) ☑

| Status | Item |
| --- | --- |
| ☑ | PWA setup with `@vite-pwa/sveltekit` (workbox runtime caching, manifest, update prompts). |
| ☑ | Explicit "Download book" UI with progress indicator. |
| ☑ | Storage size estimate shown before download. |
| ☑ | Offline read succeeds after download (TOC, markdown, images, math). |
| ☑ | Cache strategy documented (precache vs runtime). See `docs/CACHE_STRATEGY.md`. |
| ☑ | Content validation during build: broken refs, missing alt text, duplicate IDs. |
| ☑ | Production static file serving (not symlink). Uses `copy-content` script. |
| ☑ | Normalize storage keys to `namsbokasafn:*` namespace with migration. |

### Correctness Criteria (Milestone 2)
- User can tap "Download" and see progress bar
- After download completes, airplane mode still loads full book
- Images and math render correctly offline
- Cache clears properly on book update
- Multi-book data does not collide in localStorage

---

## Milestone 3: Quality & Testing (Gate) ☐→

| Status | Item |
| --- | --- |
| ☑ | Unit tests for stores (settings, reader, flashcard). |
| ☑ | Unit tests for markdown utils (KaTeX, directives). |
| ☑ | Smoke test for reader flow (catalog → book → section → navigate). |
| ☑ | Error handling for missing content. |
| ☑ | Error handling for offline failures. |
| ☐ | PWA update flow tested (version prompt or auto-reload). |
| ☐ | Sanitize/escape HTML in search result snippets. |

### Correctness Criteria (Milestone 3)
- All tests pass in CI
- Graceful fallback when content is missing
- Clear error message when offline and content not cached
- No XSS vectors in search results

---

## Milestone 4: Accessibility & Polish (Gate) ☐

| Status | Item |
| --- | --- |
| ☑ | Keyboard navigation for modals and key actions. |
| ☑ | ARIA labels for reader controls and dialogs. |
| ☑ | Focus outlines and skip-to-content link. |
| ☐ | Reader comfort: line length, line height tuning. |
| ☐ | Dyslexia-friendly font option. |
| ☐ | Responsive behavior verified on phone + tablet. |
| ☐ | Cross-reference hover previews (equations/figures/tables). |
| ☐ | Quick glossary lookup from reader view. |
| ☐ | IntersectionObserver for "end of section" read detection. |

---

## Milestone 5: V2 Features (Post-Launch) ☐→

These are explicitly deferred. Do not start until Milestones 1-4 are complete.

| Status | Item |
| --- | --- |
| ☑ | Annotations: highlight + note + delete + export. |
| ☐ | Highlight restore after refresh/navigation (stable anchors, not DOM-dependent). |
| ☐ | TTS: Icelandic voice with fallback and controls. |
| ☐ | Print stylesheet (@media print CSS). |
| ☐ | Analytics dashboard. |
| ☐ | Learning objectives tracking. |
| ☐ | Bookmarks page. |
| ☑ | Self-assessment modal (AdaptiveQuiz). |
| ☑ | Figure viewer (zoom modal). |

---

## Technical Improvements (Address When Relevant)

These are technical debt items to address opportunistically during development:

### Performance
| Status | Item |
| --- | --- |
| ☐ | Move search index building to web worker or precompute at build time. |
| ☐ | Cache TOC and section content to avoid repeated fetches. |

### Content Pipeline
| Status | Item |
| --- | --- |
| ☐ | Replace custom frontmatter parser with build-time step (gray-matter or similar). |
| ☐ | Precompute cross-reference numbering for deterministic results. |

### Data Integrity
| Status | Item |
| --- | --- |
| ☐ | Content linting for consistent frontmatter and directive usage. |

---

## Future Features (Backlog)

Ideas for post-v2. Not scheduled—evaluate based on user feedback.

### P1 - High Value
- **Line focus mode**: Highlight current line/paragraph while dimming others.
- **Contrast presets**: High contrast, sepia, and custom color schemes.
- **Indexed search with filters**: Filter by chapter, section, or content type.

### P2 - Medium Value
- **Optional auth with cross-device sync**: Login (Google/Microsoft) to sync progress, flashcard SRS state, and bookmarks across devices. App remains fully functional without login. Estimated 80-100 hours. Key challenges: conflict resolution for offline edits, first-login data merge. Recommended stack: Supabase or Firebase.
- **Auto-generated flashcards**: Create cards from definitions and key concepts.
- **Chapter recaps**: Quick summaries and quizzes tied to learning objectives.
- **"Next recommended section"**: Suggest sections based on progress and objectives.
- **Search history**: Save common study topic searches.

### P3 - Low Priority / Exploratory
- **Teacher/sharing tools**: Exportable study decks and reading plans.
- **Class progress summaries**: Local or export-based progress reports.
- **Spaced repetition dashboard**: Visualize SRS progress across all cards.

---

## Do Not Port (Use React Only as Reference)

These patterns should be reimplemented cleanly, not copied:

- **Partial implementations**: Highlight restore in React is buggy—design fresh.
- **Unstable DOM manipulation**: Any direct DOM queries that break with SSR.
- **Ad-hoc parsing**: Content validation should be build-time, not runtime.
- **Incomplete dashboards**: Analytics/objectives not in v1 scope.
- **Workarounds**: Any `// TODO` or `// HACK` comments in React code.
- **Hardcoded book slugs**: Storage keys like `efnafraedi-*` should be namespaced.

---

## React Reference Map

Use these files for UX reference and data shape, not for copying code:

| Feature | React Files |
|---------|-------------|
| Reader view | `src/components/reader/SectionView.tsx` |
| Markdown | `src/components/reader/MarkdownRenderer.tsx` |
| Content loading | `src/utils/contentLoader.ts` |
| Search | `src/components/ui/SearchModal.tsx`, `src/utils/searchIndex.ts` |
| Annotations | `src/components/reader/TextHighlighter.tsx`, `src/stores/annotationStore.ts` |
| Flashcards | `src/stores/flashcardStore.ts`, `src/utils/srs.ts` |
| TTS | `src/components/reader/TTSControls.tsx`, `src/hooks/useTextToSpeech.ts` |

---

## Decision Rule

1. All items in current milestone must be ☑ before moving to next gate.
2. If a gate is blocked, fix it before adding new features.
3. V2 features (Milestone 5) are frozen until v1 ships.
4. Technical Improvements are addressed opportunistically, not as blockers.
5. Future Features (Backlog) are not scheduled until v2 is complete.

---

## Progress Summary

| Milestone | Status | Completion |
|-----------|--------|------------|
| 0: Scope | ☐→ | 75% |
| 1: Core Reader | ☑ | 100% |
| 2: Offline | ☑ | 100% |
| 3: Testing | ☐→ | 71% |
| 4: Accessibility | ☐→ | 40% |
| 5: V2 Features | ☐→ | 33% (3/9 done early) |

**Overall v1 readiness: ~78%** (Milestones 1-2 complete, Milestone 3 at 71%)

**Note:** Some V2 features (annotations, figure viewer, adaptive quiz) were implemented ahead of schedule. Focus should return to completing Milestone 3 before adding more features.
