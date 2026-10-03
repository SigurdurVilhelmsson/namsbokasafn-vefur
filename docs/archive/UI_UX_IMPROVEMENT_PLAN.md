# UI/UX Improvement Plan

**Original Review Date:** 2026-01-22
**Audit Date:** 2026-02-11
**Status:** Active Development

---

## Executive Summary

This document outlines a comprehensive UI/UX improvement plan for Námsbókasafn, an educational book reader for Icelandic translations of OpenStax textbooks. The recommendations are organized by priority and effort level.

**2026-02-11 Audit:** Verified implementation status against actual codebase. Corrected 5 status entries (2 overclaimed, 3 underclaimed). Added new Section 9 with additional suggestions focused on educational reading/studying effectiveness.

---

## Priority Matrix

| Priority | Effort | Impact | Recommendation                    | Status                                                             |
| -------- | ------ | ------ | --------------------------------- | ------------------------------------------------------------------ |
| High     | Low    | High   | ARIA live regions, focus halos    | ✅ Completed                                                       |
| High     | Medium | High   | Reading position persistence      | ✅ Completed                                                       |
| High     | Medium | High   | Mobile bottom navigation          | ✅ Completed                                                       |
| Medium   | Low    | Medium | Reading time estimates            | ✅ Completed                                                       |
| Medium   | Medium | High   | Flashcard-to-highlight connection | ✅ Completed                                                       |
| Medium   | High   | High   | Learning analytics dashboard      | ✅ Completed                                                       |
| Low      | Low    | Medium | Skeleton loading states           | ✅ Completed                                                       |
| Low      | Medium | Medium | Bionic reading mode               | ✅ Completed (partial — toggle + CSS exist, needs content testing) |

---

## Quick Wins (Low Effort, High Impact)

These can be implemented rapidly with significant user benefit:

- [x] **QW-1:** Add reading position indicator in sidebar (current position within chapter)
- [x] **QW-2:** "Copy citation" button for equations and figures — Citation button now injected by `enhanceEquation()` in `equations.ts`. Copies permalink (URL + #id) for all equations.
- [x] **QW-3:** Keyboard shortcut overlay (toggle with `?`) showing all available shortcuts
- [x] **QW-4:** Sound effects for flashcard success — Dead toggle removed from settings. `soundEffects` state, methods, and UI toggle all cleaned up.
- [x] **QW-5:** Section completion animation (confetti or subtle celebration)
- [x] **QW-6:** Print-friendly button per section (already have print CSS, just need UI trigger)
- [x] **QW-7:** Share button for sections (generate shareable link)
- [x] **QW-8:** Font size slider instead of dropdown (more intuitive)

---

## 1. Critical Accessibility Improvements

### 1.1 Focus Indicators Enhancement

**Location:** `src/app.css`
**Current state:** Generic 2px outline with accent color
**Issue:** On busy backgrounds (content blocks, flashcards), focus rings can be hard to see

**Recommendation:**

```css
*:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(26, 125, 92, 0.2);
}
```

**Status:** ✅ Completed - Enhanced focus styles with box-shadow halo for both light and dark modes

### 1.2 Color Contrast in Content Blocks

**Location:** `src/app.css:366-872`
**Issue:** Some content block title colors in dark mode may not meet WCAG AA (4.5:1)

**Status:** ✅ Completed - Audited dark mode colors, improved warning block title contrast (yellow-200 instead of yellow-400)

### 1.3 ARIA Live Regions

**Impact:** Screen reader users miss dynamic updates

**Needed additions:**

- Flashcard flip states: Add `aria-live="polite"` to announce when card flips
- Progress updates: Wrap progress counters in live region
- Search results count announcement

**Status:** ✅ Completed - Added aria-live regions to:

- `FlashcardStudy.svelte`: Progress indicator, card flip state announcements, session completion
- `SearchModal.svelte`: Search results count announcements

### 1.4 Keyboard Trap in Modals

**Location:** `SearchModal.svelte`, `SettingsModal.svelte`
**Recommendation:** Ensure focus trap cycles correctly

**Status:** ✅ Completed (corrected from "Pending" — focus trap code with Shift+Tab handling exists in both `SearchModal.svelte` and `SettingsModal.svelte`)

---

## 2. Reading Experience Enhancements

### 2.1 Reading Position Persistence

**Current gap:** No automatic scroll position memory
**Educational impact:** Students lose their place when navigating away

**Implementation:**

- Save scroll position per section in reader store
- Restore on return navigation
- Show "Continue where you left off" prompt

**Status:** ✅ Completed

- Added `scrollPositions` map to reader store with per-section scroll tracking
- Saves scroll position (pixels + percentage) when navigating away via `beforeNavigate`
- Shows "Haltu áfram að lesa" prompt when returning to a section with saved position (>10%)
- User can click "Halda áfram" to smooth-scroll to saved position or dismiss to start fresh
- Auto-hides prompt after 8 seconds

### 2.2 Estimated Reading Time

**Location:** Section headers
**Research:** Estimated time reduces cognitive load and helps planning

**Implementation:**

```svelte
<span class="reading-time">~{Math.ceil(wordCount / 200)} mín</span>
```

**Status:** ✅ Completed (already implemented, enhanced)

- Reading time calculation already existed at 180 WPM in `contentLoader.ts`
- Enhanced section header display with clock icon and "lestími" label
- Added reading time to sidebar section links (shows for unread sections)
- TOC already includes pre-computed reading times in section metadata

### 2.3 Reading Mode Improvements

**Focus mode enhancements:**

- Bionic reading toggle (bold first syllables)
- Paragraph focus (dim non-active paragraphs)
- Auto-scroll option

**Status:** ⚠️ Partially Completed

- ✅ Bionic reading: Toggle in SettingsModal, `bionicReadingAction` in MarkdownRenderer, `.bionic-bold` CSS class — infrastructure exists, needs content verification
- Pending: Paragraph focus mode
- Pending: Auto-scroll

### 2.4 Content Width Presets

**Recommendation:** Add subject-specific defaults:

- Chemistry/Math content: Wider for equations
- Text-heavy chapters: Narrower for comfortable reading

**Status:** ✅ Completed (corrected from "Pending" — three presets fully implemented):

- Narrow (Þröngt, 38rem), Medium (Miðlungs, 48rem), Wide (Breitt, 60rem)
- CSS variables and classes in `app.css`, toggle in `SettingsModal.svelte`
- Remaining idea: auto-select wider preset for equation-heavy chapters (enhancement, not a blocker)

---

## 3. Educational Tool Enhancements

### 3.1 Flashcard System

**Location:** `FlashcardStudy.svelte`

**Recommendations:**

1. Add confidence/mastery indicators
2. Spaced repetition calendar view
3. Card creation from highlights
4. Audio support for pronunciation

**Status:** Partially Completed

- ✅ Card creation from highlights implemented (see 3.1.1)

### 3.1.1 Flashcard-to-Highlight Connection

**Location:** `TextHighlighter.svelte`, `FlashcardModal.svelte`

**Implementation:**

- Created `FlashcardModal.svelte` component for creating flashcards from selected text
- Updated `TextHighlighter.svelte` to show modal when "Minniskort" button clicked
- Features:
  - Selected text becomes the "front" (question) of the card
  - User enters the "back" (answer)
  - Deck selection or creation of new deck
  - Source attribution (book > chapter > section)
  - Ctrl+Enter keyboard shortcut to save

**Status:** ✅ Completed

### 3.2 Progress Visualization

**Current:** Simple percentage in sidebar

**Recommendations:**

1. Chapter progress wheel (visual ring)
2. Streak counter for consecutive study days
3. Weekly summary statistics

**Status:** ✅ Partially Completed (corrected — the analytics dashboard at `/greining/` already includes streak counter, weekly stats, and activity charts; the sidebar has scroll progress rings. Missing: chapter progress wheel on book home page)

### 3.3 Annotation System Improvements

**Location:** `TextHighlighter.svelte`, `AnnotationSidebar.svelte`

**Recommendations:**

1. Smart highlight suggestions (auto-detect key terms)
2. Annotation categories ("Questions", "Exam prep", "Connections")
3. Export formats (Anki deck, PDF with annotations)

**Status:** Pending — current system has 4-color highlights, notes, and markdown export. Anki export would be high-value for students.

---

## 4. Visual Design Refinements

### 4.1 Typography Hierarchy

**Location:** `src/app.css:192-265`

**Issue:** H2 and H3 sizes too similar on mobile — currently h1: 1.5rem, h2: 1.5rem (identical!), h3: 1.1875rem

**Recommendation:**

```css
@media (max-width: 640px) {
  .reading-content h2 {
    font-size: 1.375rem;
  }
  .reading-content h3 {
    font-size: 1.125rem;
  }
  .reading-content h2 {
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
  }
}
```

**Status:** Done — mobile sizes now h1: 1.5rem, h2: 1.25rem, h3: 1.125rem with border-top on h2 for visual separation

### 4.2 Content Block Visual Hierarchy

**Issue:** 14 block types with similar visual weight

**Recommendation:** Create tiers:

1. Critical blocks (learning-objectives, checkpoint): Larger, prominent
2. Contextual blocks (note, example): Standard size
3. Supplementary blocks (scientist-spotlight): Collapsible by default

**Status:** Pending — all 14 block types are styled with unique colors/borders, but visual weight is similar across tiers

### 4.3 Image Treatment

**Recommendations:**

1. Lazy loading with blur-up placeholder
2. Automatic figure numbering ("Mynd 1.3")
3. Zoom indicators (magnifying glass icon)

**Status:** ⚠️ Partially Completed

- ✅ Full lightbox viewer with zoom (0.5x–4x), pan, keyboard controls, download
- ✅ Figure caption styling
- Pending: Native `loading="lazy"` attribute on images (easy win)
- Pending: Blur-up placeholders

### 4.4 Dark Mode Polish

**Recommendations:**

- Improve secondary text contrast
- Softer flashcard gradients
- OLED-friendly "true black" variant option

**Status:** Pending — current dark uses `#1a1a2e` (deep navy), no true-black variant

---

## 5. Navigation & Information Architecture

### 5.1 Breadcrumb Enhancement

**Location:** `Header.svelte`

**Recommendation:** Add dropdown breadcrumb for quick navigation to sibling sections

**Status:** Pending — current breadcrumb in `NavigationButtons.svelte` is display-only text ("Kafli X › Section Y"), not clickable

### 5.2 Section Navigation

**Recommendations:**

- Swipe gestures on mobile
- Visual preview of next section title
- "Mark as complete" confirmation

**Status:** ⚠️ Partially Completed

- ✅ Next/previous section titles shown on navigation buttons
- Pending: Swipe gestures
- Pending: Mark as complete confirmation

### 5.3 Sidebar Improvements

**Recommendations:**

1. Search within sidebar
2. Favorite sections
3. Recently viewed sections
4. Study session suggestions

**Status:** Pending

---

## 6. Mobile-Specific Improvements

### 6.1 Touch Gestures

**Recommendations:**

- Swipe left/right: Navigate sections
- Pinch to zoom: Equations and figures
- Pull down to refresh

**Status:** Pending

### 6.2 Mobile Reading Mode

**Consider:** Horizontal paging as alternative to scrolling

**Status:** Pending

### 6.3 Bottom Navigation Bar

**Pattern:** Bottom tab bar for primary actions on mobile

**Status:** ✅ Completed

- Created `MobileBottomNav.svelte` component with 4-5 navigation tabs
- Tabs: Heim (Home), Kort (Flashcards), Orðasafn (Glossary), Lotukerfi (Periodic Table - conditional), Valmynd (Menu)
- Fixed to bottom with safe-area padding for iPhone notch
- Hidden on desktop (lg: breakpoint), hidden in focus mode
- Active state highlighting with accent color
- Minimum 64px touch targets
- Added bottom padding (pb-24) to main content to prevent overlap

---

## 7. Performance & Loading UX

### 7.1 Skeleton Loading States

**Current:** Text-based loading messages
**Recommendation:** Skeleton screens matching content structure

**Status:** ✅ Completed

- Created `Skeleton.svelte` component with multiple variants: text, heading, paragraph, card, sidebar, content, list-item, chapter
- Shimmer animation for visual feedback during loading
- Integrated skeleton loaders into:
  - `Sidebar.svelte`: TOC loading state
  - `MarkdownRenderer.svelte`: Content loading state
  - Book home page: Chapter grid cards
  - Glossary page: Term list items
  - Objectives page: Learning objective cards
  - Analytics page: Stats grid
  - Bookmarks page: Grouped bookmark list

### 7.2 Prefetching

**Recommendation:** Prefetch next section when scroll > 80%

**Status:** Done — Global `data-sveltekit-preload-data="hover"` on body; `eager` prefetching on prev/next NavigationButtons

### 7.3 Offline Indicators

**Enhancement:** Show which content is cached vs. needs download

**Status:** ⚠️ Partially Completed — `OfflineIndicator.svelte` and `PWAUpdater.svelte` exist with offline detection and update prompts. Missing: per-section cache status indicators.

---

## 8. Learning Analytics Dashboard

**Location:** `src/routes/[bookSlug]/greining/+page.svelte`

**Recommended additions:**

1. Time spent per section
2. Flashcard success rate over time
3. Reading patterns (time of day, consistency)
4. Goal setting and tracking
5. Comparison with study plan (for teachers)

**Status:** ✅ Completed (corrected from "Pending")

- Full dashboard with 4 tabs: Overview, Reading Patterns, Flashcard Stats, Goals
- Overview: total time, daily time, weekly average, streak counter, 7-day activity chart
- Top sections by reading time, recent activity log
- Export and clear data buttons
- Remaining idea from list: teacher comparison view (item 5) — this is a larger feature requiring multi-user infrastructure and is out of scope for a localStorage-only app

---

## 9. Additional Suggestions (2026-02-11 Audit)

The following new suggestions address gaps not covered by the original plan, focused on the core use case: students reading and studying educational materials on computers, tablets, and phones.

### 9.1 Structured Study Sessions

**Priority:** High | **Effort:** Medium | **Impact:** High

**Problem:** The app has individual tools (flashcards, reading, quizzes) but no guided flow that ties them together. Students must self-direct their study workflow.

**Recommendation:** Add a "Study Session" mode that guides students through a structured cycle:

1. Review due flashcards (spaced repetition)
2. Read the next unread section
3. Complete practice problems from that section
4. Review new terms from the glossary
5. Session summary with what was covered

This is the single highest-impact feature for learning effectiveness. The SM-2 algorithm and progress tracking already provide the data — this just orchestrates it.

### 9.2 Table of Contents Progress Overview on Book Home

**Priority:** High | **Effort:** Low | **Impact:** High

**Problem:** The book home page shows chapter cards, but students can't see at a glance which sections within each chapter they've read vs. skipped. They must open the sidebar on a section page.

**Recommendation:** Add a small progress bar or section dots to each chapter card on the book home page, showing read/unread status for every section. This gives students a "bird's eye view" of their progress across the entire book.

### 9.3 Glossary Term Highlighting in Content

**Priority:** High | **Effort:** Medium | **Impact:** High

**Problem:** Glossary terms appear in the text but may not be visually marked. Students don't know which words have definitions available unless they happen to select them.

**Recommendation:** Automatically underline or subtly highlight glossary terms inline (dotted underline, like Wikipedia). On hover/tap, show the `GlossaryTooltip`. This creates a natural learning loop where students encounter definitions in context. Should be toggleable in settings to avoid visual noise.

### 9.4 "Quick Review" Summary Cards

**Priority:** Medium | **Effort:** Medium | **Impact:** High

**Problem:** Before exams, students need to review key concepts quickly. Currently they must re-read entire sections or rely on their own highlights.

**Recommendation:** Auto-generate summary cards from content block types that represent key information (key-concept, definition, learning-objectives, checkpoint). Present as a scrollable card stack per chapter — essentially a study guide generated from the structured content.

### 9.5 Reading Focus Timer (Pomodoro)

**Priority:** Medium | **Effort:** Low | **Impact:** Medium

**Problem:** Students struggle with sustained reading focus, especially on screens. The analytics track time spent but don't help students manage their attention.

**Recommendation:** Optional Pomodoro-style timer in the reading toolbar (25 min reading / 5 min break). Integrates with the analytics dashboard to track focused study time. Shows a subtle progress bar at the top of the content area. Could suggest flashcard review during breaks.

### 9.6 Cross-Reference Navigation

**Priority:** Medium | **Effort:** Medium | **Impact:** Medium

**Problem:** Educational content frequently references earlier concepts ("as discussed in Section 2.3"). If cross-references aren't linked, students lose continuity.

**Recommendation:** Ensure all cross-references are clickable and add a "back" button to return to the referring section after following a cross-reference. The `crossReferences.ts` action already handles some of this — verify coverage and add a navigation stack for "go back to where I was reading."

### 9.7 Equation/Figure Quick Reference Panel

**Priority:** Medium | **Effort:** Medium | **Impact:** Medium

**Problem:** In chemistry/physics, students frequently need to refer back to an equation or diagram from an earlier section while reading a later one. Currently they must navigate away and lose their place.

**Recommendation:** A slide-out side panel (or split view on desktop) that lets students pin equations or figures for reference while continuing to read. Similar to a "floating reference" that stays visible alongside the main content.

### 9.8 Spaced Repetition Calendar View

**Priority:** Low | **Effort:** Medium | **Impact:** Medium

**Problem:** Students using the flashcard system don't have visibility into their review schedule. They can't see when cards are due or plan their study time.

**Recommendation:** A calendar view in the flashcard section showing: days with due cards (highlighted), number of cards due per day, and past review sessions. Helps students maintain their spaced repetition streak and plan ahead.

### 9.9 Content Search Within Current Chapter

**Priority:** Low | **Effort:** Low | **Impact:** Medium

**Problem:** The global search (`Ctrl+K`) searches across the entire book. When studying a specific chapter, students often want to find something they just read in the current chapter without sifting through results from other chapters.

**Recommendation:** Add a "Search in this chapter" option or filter to the existing search modal. Pre-populate the chapter filter when searching from within a chapter view.

### 9.10 Tablet-Optimized Split View

**Priority:** Low | **Effort:** High | **Impact:** Medium

**Problem:** Tablets (iPad, 10"+ Android) have enough screen real estate for side-by-side views, but the app treats them like large phones (single column, hidden sidebar).

**Recommendation:** On tablet-width viewports (768px–1024px in landscape), offer an optional split-view mode: content on one side, study tools (flashcards, glossary, notes) on the other. Particularly useful during active study when students alternate between reading and reviewing.

---

## Recommended Next Steps

Based on the audit, here are the recommended actions in priority order:

### Immediate Fixes (correct broken/incomplete claimed features)

1. ~~**Fix QW-4: Implement actual sound effects**~~ — **Done.** Dead toggle removed from settings.
2. ~~**Fix QW-2: Wire up citation copy buttons**~~ — **Done.** Citation button injected by `enhanceEquation()`, copies permalink.
3. ~~**Fix 4.1: Mobile heading hierarchy**~~ — **Done.** h2 reduced to 1.25rem (was 1.375rem, same as h1's 1.5rem). h3 to 1.125rem.

### High-Value Next Implementations

4. ~~**9.2: Book home progress overview**~~ — **Done.** Chapter cards show completion %, section dots, and progress bars.
5. ~~**9.3: Glossary term highlighting in content**~~ — **Done.** Inline dotted underline + hover tooltips. Settings toggle added.
6. ~~**7.2: SvelteKit prefetching on nav links**~~ — **Done.** Global `hover` already set; `eager` added to prev/next navigation buttons.
7. ~~**9.1: Structured study sessions**~~ — **Done.** Full 4-phase guided session at `/:bookSlug/nam`.

### Deprioritize or Remove

- **6.2 Horizontal paging on mobile** — Against standard mobile reading conventions; users expect vertical scrolling for long-form content. Recommend removing this from the plan.
- **8.5 Teacher comparison view** — Requires multi-user backend infrastructure that doesn't exist and contradicts the localStorage-only design. Out of scope unless the architecture changes.
- **3.3.1 Smart highlight suggestions** — Requires NLP/ML capabilities disproportionate to the project's scale. The glossary term highlighting (9.3) achieves a similar effect with much less complexity.

---

## Implementation Log

### 2026-01-22

- Initial plan created from UI/UX review
- Starting implementation with Quick Wins
- **Completed Quick Wins QW-1, QW-3, QW-5, QW-6, QW-7, QW-8:**
  - QW-1: Circular progress ring in sidebar showing scroll position
  - QW-3: Verified existing KeyboardShortcutsModal works with `?` key
  - QW-5: Particle animation on section completion
  - QW-6: Print button in section header
  - QW-7: Share button with Web Share API and clipboard fallback
  - QW-8: Visual font size slider with Aa previews in SettingsModal
- **Completed Critical Accessibility Improvements (1.1-1.3):**
  - 1.1: Enhanced focus indicators with box-shadow halo effect for better visibility on busy backgrounds (both light and dark modes)
  - 1.2: Audited color contrast in content blocks, improved warning block title from yellow-400 to yellow-200 for better dark mode contrast
  - 1.3: Added ARIA live regions for screen reader support:
    - FlashcardStudy.svelte: Progress indicator, card flip announcements with full question/answer text, session completion
    - SearchModal.svelte: Search results count announcements
- **Completed Reading Position Persistence (2.1):**
  - Extended reader store with `scrollPositions` map for per-section position tracking
  - Added `saveScrollPosition`, `getScrollPosition`, `clearScrollPosition` methods
  - Section page now saves position via `beforeNavigate` hook when user leaves
  - On return visit, shows "Haltu áfram að lesa" prompt if user was >10% through the section
  - Smooth-scroll restoration with option to dismiss and start fresh
  - Prompt auto-dismisses after 8 seconds
- **Completed Mobile Bottom Navigation (6.3):**
  - Created `MobileBottomNav.svelte` component
  - 4-5 tab navigation: Heim, Kort, Orðasafn, Lotukerfi (conditional), Valmynd
  - Fixed bottom position with iPhone safe-area support
  - Responsive: hidden on lg: screens, hidden in focus mode
  - Active tab highlighting with accent color
  - Proper touch targets (min 64px width)
  - Added pb-24 padding to main content on mobile to prevent content overlap
- **Enhanced Reading Time Estimates (2.2):**
  - Reading time calculation already existed (180 WPM)
  - Enhanced section header: added clock icon and "lestími" label
  - Added reading time to sidebar section links for study planning
  - Shows only for unread sections to reduce visual clutter
- **Implemented Flashcard-to-Highlight Connection (3.1.1):**
  - Created `FlashcardModal.svelte` component
  - Modal allows creating flashcards directly from highlighted text
  - Selected text becomes "front" (question), user enters "back" (answer)
  - Deck selection with option to create new decks on the fly
  - Source attribution links card back to original section
  - Integrated into `TextHighlighter.svelte` selection popup
  - Keyboard shortcuts: Ctrl+Enter to save, Escape to close
- **Implemented Skeleton Loading States (7.1):**
  - Created reusable `Skeleton.svelte` component with multiple variants
  - Variants: text, heading, paragraph, card, sidebar, content, list-item, chapter
  - CSS shimmer animation for visual loading feedback
  - Replaced all "Hleður..." text spinners across the application

### 2026-02-11

- **Audit of plan against actual codebase:**
  - Corrected QW-2 status: backend handler exists but UI buttons not generated (non-functional)
  - Corrected QW-4 status: settings toggle exists but no audio implementation (dead control)
  - Corrected 1.4 status: focus trap already implemented in both modals (was listed as Pending)
  - Corrected 2.4 status: three content width presets fully implemented (was listed as Pending)
  - Corrected 8 status: full analytics dashboard with 4 tabs already built (was listed as Pending)
  - Corrected 4.3 status: lightbox viewer fully implemented, only lazy loading missing
  - Added Section 9: ten new suggestions focused on educational reading/studying effectiveness
  - Added Recommended Next Steps section with prioritized action items

---

## Notes

- All UI text must be in Icelandic
- Code comments in English
- Test on mobile devices throughout implementation
- Ensure WCAG 2.1 AA compliance for all changes
