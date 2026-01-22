# UI/UX Improvement Plan

**Review Date:** 2026-01-22
**Reviewer:** Claude (UI/UX Design Specialist)
**Status:** Active Development

---

## Executive Summary

This document outlines a comprehensive UI/UX improvement plan for Námsbókasafn, an educational book reader for Icelandic translations of OpenStax textbooks. The recommendations are organized by priority and effort level.

---

## Priority Matrix

| Priority | Effort | Impact | Recommendation | Status |
|----------|--------|--------|----------------|--------|
| High | Low | High | ARIA live regions, focus halos | ✅ Completed |
| High | Medium | High | Reading position persistence | ✅ Completed |
| High | Medium | High | Mobile bottom navigation | ✅ Completed |
| Medium | Low | Medium | Reading time estimates | ✅ Completed |
| Medium | Medium | High | Flashcard-to-highlight connection | ✅ Completed |
| Medium | High | High | Learning analytics dashboard | Pending |
| Low | Low | Medium | Skeleton loading states | ✅ Completed |
| Low | Medium | Medium | Bionic reading mode | Pending |

---

## Quick Wins (Low Effort, High Impact)

These can be implemented rapidly with significant user benefit:

- [x] **QW-1:** Add reading position indicator in sidebar (current position within chapter)
- [x] **QW-2:** "Copy citation" button for equations and figures
- [x] **QW-3:** Keyboard shortcut overlay (toggle with `?`) showing all available shortcuts
- [x] **QW-4:** Sound effects for flashcard success (optional, in settings)
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

**Status:** Pending - Needs testing

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

**Status:** Pending

### 2.4 Content Width Presets
**Recommendation:** Add subject-specific defaults:
- Chemistry/Math content: Wider for equations
- Text-heavy chapters: Narrower for comfortable reading

**Status:** Pending

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

**Status:** Pending

### 3.3 Annotation System Improvements
**Location:** `TextHighlighter.svelte`, `AnnotationSidebar.svelte`

**Recommendations:**
1. Smart highlight suggestions (auto-detect key terms)
2. Annotation categories ("Questions", "Exam prep", "Connections")
3. Export formats (Anki deck, PDF with annotations)

**Status:** Pending

---

## 4. Visual Design Refinements

### 4.1 Typography Hierarchy
**Location:** `src/app.css:192-265`

**Issue:** H2 and H3 sizes too similar on mobile

**Recommendation:**
```css
@media (max-width: 640px) {
  .reading-content h2 { font-size: 1.375rem; }
  .reading-content h3 { font-size: 1.125rem; }
  .reading-content h2 {
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
  }
}
```

**Status:** Pending

### 4.2 Content Block Visual Hierarchy
**Issue:** 12+ block types with similar visual weight

**Recommendation:** Create tiers:
1. Critical blocks (learning-objectives, checkpoint): Larger, prominent
2. Contextual blocks (note, example): Standard size
3. Supplementary blocks (scientist-spotlight): Collapsible by default

**Status:** Pending

### 4.3 Image Treatment
**Recommendations:**
1. Lazy loading with blur-up placeholder
2. Automatic figure numbering ("Mynd 1.3")
3. Zoom indicators (magnifying glass icon)

**Status:** Pending

### 4.4 Dark Mode Polish
**Recommendations:**
- Improve secondary text contrast
- Softer flashcard gradients
- OLED-friendly "true black" variant option

**Status:** Pending

---

## 5. Navigation & Information Architecture

### 5.1 Breadcrumb Enhancement
**Location:** `Header.svelte`

**Recommendation:** Add dropdown breadcrumb for quick navigation to sibling sections

**Status:** Pending

### 5.2 Section Navigation
**Recommendations:**
- Swipe gestures on mobile
- Visual preview of next section title
- "Mark as complete" confirmation

**Status:** Pending

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

```svelte
<nav class="mobile-bottom-nav lg:hidden">
  <a href="/{bookSlug}">Home</a>
  <a href="/{bookSlug}/minniskort">Flashcards</a>
  <a href="/{bookSlug}/ordabok">Glossary</a>
  <button on:click={toggleSidebar}>Menu</button>
</nav>
```

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

**Status:** Pending

### 7.3 Offline Indicators
**Enhancement:** Show which content is cached vs. needs download

**Status:** Pending

---

## 8. Learning Analytics Dashboard

**Location:** `src/routes/[bookSlug]/greining/+page.svelte`

**Recommended additions:**
1. Time spent per section
2. Flashcard success rate over time
3. Reading patterns (time of day, consistency)
4. Goal setting and tracking
5. Comparison with study plan (for teachers)

**Status:** Pending

---

## Implementation Log

### 2026-01-22
- Initial plan created from UI/UX review
- Starting implementation with Quick Wins
- **Completed all 8 Quick Wins:**
  - QW-1: Circular progress ring in sidebar showing scroll position
  - QW-2: Copy citation buttons for equations (markdown.ts, equations.ts) and figures (FigureViewer.svelte)
  - QW-3: Verified existing KeyboardShortcutsModal works with `?` key
  - QW-4: Web Audio API sounds for flashcard interactions (sounds.ts)
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
  - Replaced all "Hleður..." text spinners across the application:
    - Sidebar TOC loading
    - MarkdownRenderer content loading
    - Book home chapter grid
    - Glossary term list
    - Learning objectives cards
    - Analytics stats grid
    - Bookmarks grouped list

---

## Notes

- All UI text must be in Icelandic
- Code comments in English
- Test on mobile devices throughout implementation
- Ensure WCAG 2.1 AA compliance for all changes
