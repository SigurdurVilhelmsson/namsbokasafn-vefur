# Svelte Migration Checklist

This checklist defines a no-regret bar for fully committing to the SvelteKit migration. Use it as a single source of truth for parity, performance, and ship readiness.

**Last updated:** 2025-01-08

## 1) Must-Have Parity (Blockers)
- [ ] Reader flow: book home → chapter list → section view with navigation, bookmarks, and progress tracking.
- [x] Markdown parity: directives, KaTeX, cross-references, and practice problems render correctly on real content.
- [ ] Key UX features: annotations/highlights + notes, search, flashcards, glossary, periodic table, and TTS (if still a priority).
- [ ] Offline/PWA: installable, works after first load, and caches book content reliably.
- [ ] Testing: unit tests for stores + markdown utils; at least one reader-flow smoke test.
- [ ] Content serving: static content properly served in production (not via symlink).

## 2) Performance & Quality Gates (Go/No-Go)
- JS payload: at least ~25–35% smaller on the reader route vs the React build.
- Speed: at least ~20–30% improvement in time-to-interactive or first contentful paint.
- Stability: no data regressions on annotations, bookmarks, or flashcards after a week of usage.

## 3) Parity Map (React → Svelte)

### Reader & Layout
- `src/components/layout/Header.tsx` → `sveltekit-poc/src/lib/components/layout/Header.svelte` (ported)
- `src/components/layout/Sidebar.tsx` → `sveltekit-poc/src/lib/components/layout/Sidebar.svelte` (ported)
- `src/components/layout/FocusModeNav.tsx` → `sveltekit-poc/src/lib/components/layout/FocusModeNav.svelte` (ported)
- `src/components/layout/Layout.tsx` → `sveltekit-poc/src/routes/+layout.svelte` (ported)
- `src/components/layout/BookLayout.tsx` → `sveltekit-poc/src/routes/[bookSlug]/+layout.svelte` (ported)

### Reader Pages
- `src/components/reader/HomePage.tsx` → `sveltekit-poc/src/routes/[bookSlug]/+page.svelte` (ported)
- `src/components/reader/ChapterView.tsx` → `sveltekit-poc/src/routes/[bookSlug]/+page.svelte` (ported as chapter list)
- `src/components/reader/SectionView.tsx` → `sveltekit-poc/src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte` (ported)
- `src/components/reader/GlossaryPage.tsx` → `sveltekit-poc/src/routes/[bookSlug]/ordabok/+page.svelte` (ported)
- `src/components/reader/FlashcardsPage.tsx` → `sveltekit-poc/src/routes/[bookSlug]/minniskort/+page.svelte` (ported)
- `src/components/reader/PeriodicTablePage.tsx` → `sveltekit-poc/src/routes/[bookSlug]/lotukerfi/+page.svelte` (ported)

### Reader UI Components
- `src/components/reader/MarkdownRenderer.tsx` → `sveltekit-poc/src/lib/components/MarkdownRenderer.svelte` (ported)
- `src/components/reader/InteractivePracticeProblem.tsx` → `sveltekit-poc/src/lib/components/InteractivePracticeProblem.svelte` (ported)
- `src/components/reader/NavigationButtons.tsx` → `sveltekit-poc/src/lib/components/NavigationButtons.svelte` (ported)
- `src/components/ui/SearchModal.tsx` → `sveltekit-poc/src/lib/components/SearchModal.svelte` (ported)
- `src/components/ui/SettingsModal.tsx` → `sveltekit-poc/src/lib/components/SettingsModal.svelte` (ported)
- `src/components/periodic-table/PeriodicTable.tsx` → `sveltekit-poc/src/lib/components/PeriodicTable.svelte` (ported)
- `src/components/catalog/BookCard.tsx` → `sveltekit-poc/src/lib/components/BookCard.svelte` (ported)

### Stores & Utils
- `src/stores/*Store.ts` → `sveltekit-poc/src/lib/stores/*.ts` (ported: settings, reader, flashcard, annotation, quiz, analytics, objectives, reference)
- `src/utils/markdown*` → `sveltekit-poc/src/lib/utils/markdown.ts` (ported, includes KaTeX + equation wrapper)
- `src/utils/contentLoader.ts` → `sveltekit-poc/src/lib/utils/contentLoader.ts` (ported)
- `src/utils/searchIndex.ts` → `sveltekit-poc/src/lib/utils/searchIndex.ts` (ported)
- `src/utils/srs.ts` → `sveltekit-poc/src/lib/utils/srs.ts` (ported)

### Svelte Actions (New Pattern)
- `sveltekit-poc/src/lib/actions/equations.ts` (new - KaTeX copy/zoom interactivity)
- `sveltekit-poc/src/lib/actions/practiceProblems.ts` (ported from React component logic)

## 4) Missing or Incomplete (To Port)

### P0 - Ship Blockers
These must be complete before removing the React app:

- [ ] **Annotations UI**: Text selection, highlights, notes
  - `src/components/reader/TextHighlighter.tsx`
  - `src/components/reader/SelectionPopup.tsx`
  - `src/components/reader/AnnotationSidebar.tsx`
  - `src/components/reader/NoteModal.tsx`
- [ ] **PWA/Offline**: Installable, caches content
  - `@vite-pwa/sveltekit` integration
  - Service worker for content caching
  - `src/components/ui/OfflineIndicator.tsx`
- [ ] **Tests**: Confidence before shipping
  - Unit tests for stores (settings, reader, flashcard)
  - Unit tests for markdown utils
  - Smoke test for reader flow
- [ ] **Content serving**: Production-ready static file setup

### P1 - Important Features
Should be ported for feature parity:

- [ ] **Keyboard shortcuts**: `src/hooks/useKeyboardShortcuts.ts` → Svelte action
  - Navigation (←/→), home (g+h), search (Cmd+K), etc.
  - `src/components/ui/KeyboardShortcutsModal.tsx`
- [ ] **TTS controls**: `src/components/reader/TTSControls.tsx`
  - `src/hooks/useTextToSpeech.ts` → Svelte store
- [ ] **Cross-reference UI**: `src/components/reader/CrossReference.tsx`
  - Hover previews for equations/figures/tables
- [ ] **Print stylesheet**: 500+ lines of @media print CSS
  - Currently in React's index.css

### P2 - Can Follow After Launch
Nice-to-have, can be added post-migration:

- [ ] **Figure viewer**: `src/components/reader/FigureViewer.tsx` (zoom modal)
- [ ] **Self-assessment**: `src/components/reader/SelfAssessmentModal.tsx`
- [ ] **Analytics pages**:
  - `src/components/reader/AnalyticsDashboardPage.tsx`
  - `src/components/reader/PracticeProgressPage.tsx`
- [ ] **Objectives dashboard**:
  - `src/components/reader/ObjectivesDashboardPage.tsx`
  - `src/components/reader/LearningObjectives.tsx`
- [ ] **Flashcard enhancements**:
  - `src/components/reader/FlashcardDeck.tsx`
  - `src/components/reader/FlashcardModal.tsx`
  - `src/components/reader/InlineFlashcardReview.tsx`
- [ ] **Bookmarks page**: `src/components/reader/BookmarksPage.tsx`
- [ ] **Metadata components**:
  - `src/components/reader/SectionMetadata.tsx`
  - `src/components/reader/ContentAttribution.tsx`

## 5) Decision Rule
- If all blockers are green and performance gates are met, commit fully to SvelteKit and remove the React app.
- If any blocker is red or metrics are flat, pause and either finish the gaps or keep a trimmed React path.

## 6) Progress Summary

| Category | Ported | Remaining | Status |
|----------|--------|-----------|--------|
| Stores | 8/8 | 0 | ✅ Complete |
| Routes | 6/8 | 2 | 🟡 In Progress |
| Layout Components | 5/5 | 0 | ✅ Complete |
| Reader Components | 7/18 | 11 | 🟡 In Progress |
| UI Components | 4/6 | 2 | 🟡 In Progress |
| Hooks → Actions | 1/4 | 3 | 🟡 In Progress |
| Utils | 5/5 | 0 | ✅ Complete |
| PWA | 0/1 | 1 | ❌ Not Started |
| Tests | 0/3 | 3 | ❌ Not Started |

**Overall: ~40% complete** (core infrastructure done, UI components remaining)
