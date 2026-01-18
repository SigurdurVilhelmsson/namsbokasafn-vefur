# Implementation Progress Matrix

This document tracks progress on recommended improvements for Námsbókasafn.

**Legend:**
- ⬜ Not started
- 🔄 In progress
- ✅ Completed
- ⏸️ Blocked/Paused

---

## Phase 1: Core Experience

### 1.1 Annotation & Highlighting System
| Task | Status | Notes |
|------|--------|-------|
| Create `annotationStore.ts` | ✅ | Zustand store with localStorage persistence |
| Create `TextHighlighter.tsx` component | ✅ | Handle text selection events |
| Create selection popup menu | ✅ | Color picker, add note option (SelectionPopup.tsx) |
| Create `AnnotationSidebar.tsx` | ✅ | List/manage all annotations |
| Add annotation export (markdown) | ✅ | Export notes for external use |
| Integrate with `SectionView.tsx` | ✅ | Render saved highlights |
| Add annotation filtering/search | ✅ | Filter by color, chapter, current section |

### 1.2 Text-to-Speech Integration
| Task | Status | Notes |
|------|--------|-------|
| Create `useTextToSpeech.ts` hook | ✅ | Piper TTS with WASM (replaced Web Speech API) |
| Add TTS controls component | ✅ | Play/pause, speed, voice selection (TTSControls.tsx) |
| Integrate with `SectionView.tsx` | ✅ | Read section content |
| Handle equation content | ✅ | Skip or describe math blocks |
| Add Icelandic voice support | ✅ | 4 voices: Steinn, Búi, Salka, Ugla (Piper TTS) |
| Store voice preferences | ✅ | localStorage with voice ID and playback rate |
| Add follow-along highlighting | ⬜ | Highlight current sentence (future enhancement) |

### 1.3 WCAG 2.2 Compliance
| Task | Status | Notes |
|------|--------|-------|
| Add skip navigation links | ✅ | Skip to main content (BookLayout.tsx) |
| Audit heading hierarchy | ✅ | Markdown h1→h2, h2→h3 shift in MarkdownRenderer |
| Enhance focus indicators | ✅ | Visible focus rings on all interactive elements |
| Add `prefers-reduced-motion` support | ✅ | Disable animations when requested |
| Add ARIA live regions | ✅ | Announce dynamic content changes |
| Verify contrast ratios | ✅ | Updated accent colors (#1a7d5c light, #6ee7b7 dark) for 4.5:1+ |
| Test with screen reader | ⬜ | NVDA or VoiceOver testing (manual) |
| Add landmark roles | ✅ | nav, main, aside, etc. |

### 1.4 Enhanced Math Accessibility
| Task | Status | Notes |
|------|--------|-------|
| Add click-to-copy LaTeX | ✅ | EquationWrapper in MarkdownRenderer.tsx |
| Add equation zoom modal | ✅ | Zoom modal with enlarged equations |
| Implement equation numbering | ✅ | CSS counter in globals.css |
| Add math-to-speech descriptions | ✅ | latexToSpeech() converts LaTeX to Icelandic descriptions |
| Create equation wrapper component | ✅ | EquationWrapper with copy/zoom/aria-label |

### 1.5 Keyboard Navigation
| Task | Status | Notes |
|------|--------|-------|
| Create `useKeyboardShortcuts.ts` hook | ✅ | Central shortcut handler |
| Add shortcuts help modal | ✅ | Show on `?` key (KeyboardShortcutsModal.tsx) |
| Implement section navigation | ✅ | ←/→ for prev/next |
| Add quick jump shortcuts | ✅ | g+f flashcards, g+o glossary, g+h home |
| Toggle shortcuts (s, f, t) | ✅ | Sidebar, focus mode, theme |
| Store shortcut preferences | ✅ | Customizable via modal, localStorage persistence |

### 1.6 Focus Mode (Bonus)
| Task | Status | Notes |
|------|--------|-------|
| Add focus mode state | ✅ | In BookLayout.tsx |
| Hide header/sidebar in focus mode | ✅ | Clean reading experience |
| Add exit button | ✅ | Fixed position button to exit |
| Keyboard shortcut (F) | ✅ | Toggle focus mode |

---

## Phase 2: Learning Enhancement

### 2.1 Flashcard-Content Integration
| Task | Status | Notes |
|------|--------|-------|
| Add "Create flashcard" to highlight menu | ✅ | FlashcardModal.tsx, SelectionPopup updated |
| Create `InlineFlashcardReview.tsx` | ✅ | Inline card review with SM-2 ratings |
| Add review prompt at section end | ✅ | Integrated in SectionView.tsx |
| Link flashcards to source sections | ✅ | Source tracking via card.source property |

### 2.2 Enhanced Quiz System
| Task | Status | Notes |
|------|--------|-------|
| Add explanations to practice problems | ✅ | :::explanation directive in MarkdownRenderer |
| Implement hint system | ✅ | :::hint directive with progressive reveal |
| Create `AdaptiveQuiz.tsx` | ✅ | Adaptive problem selection based on mastery |
| Add mastery tracking | ✅ | MasteryLevel types, success rate tracking in quizStore |

### 2.3 Learning Objectives Tracking
| Task | Status | Notes |
|------|--------|-------|
| Add completion checkboxes | ✅ | Already in LearningObjectives.tsx |
| Create self-assessment modal | ✅ | SelfAssessmentModal with confidence ratings |
| Build objectives dashboard | ✅ | ObjectivesDashboardPage at /markmid route |
| Link objectives to flashcards | ✅ | Create flashcards from objectives, bulk create for low-confidence |

### 2.4 Focus Mode
| Task | Status | Notes |
|------|--------|-------|
| Add `focusMode` to settingsStore | ✅ | Implemented in Phase 1 |
| Modify `BookLayout.tsx` for focus mode | ✅ | Implemented in Phase 1 |
| Create floating mini-nav | ✅ | FocusModeNav.tsx with expand/collapse |
| Add keyboard shortcut (F) | ✅ | Implemented in Phase 1 |

### 2.5 Search Improvements
| Task | Status | Notes |
|------|--------|-------|
| Integrate Fuse.js for fuzzy search | ✅ | Weighted search with title priority |
| Add chapter/section filters | ✅ | Chapter dropdown filter in SearchModal |
| Add search history | ✅ | Recent searches with result counts |
| Improve result snippets | ✅ | Better context, relevance indicators |

---

## Phase 3: Scientific Features

### 3.1 Interactive Periodic Table
| Task | Status | Notes |
|------|--------|-------|
| Create `PeriodicTable.tsx` | ✅ | Full 118 element grid with category colors |
| Add element detail modal | ✅ | Modal with atomic/electronic/physical properties |
| Integrate with glossary | ✅ | Link to search glossary from element modal |
| Add keyboard navigation | ✅ | Arrow keys for grid, Esc to close, Enter to select |

### 3.2 Figure Viewer
| Task | Status | Notes |
|------|--------|-------|
| Create `FigureViewer.tsx` with zoom | ✅ | Mouse wheel zoom, pan with drag |
| Add figure numbering system | ✅ | Chapter.Figure format (e.g., Mynd 1.1) |
| Ensure all figures have alt text | ✅ | Alt text shown in caption and aria-label |
| Add lightbox functionality | ✅ | Full screen with keyboard nav, download |

### 3.3 Cross-Reference System
| Task | Status | Notes |
|------|--------|-------|
| Design reference syntax | ✅ | `[ref:type:id]` syntax in remarkCrossReferences.ts |
| Create reference parser | ✅ | remarkCrossReferences remark plugin |
| Build reference index | ✅ | referenceStore.ts with auto-indexing on content load |
| Add hover preview | ✅ | CrossReference.tsx with preview popup |

### 3.4 New Content Directives
| Task | Status | Notes |
|------|--------|-------|
| Add `:::definition` directive | ✅ | Purple theme, supports term attribute |
| Add `:::key-concept` directive | ✅ | Cyan/teal theme with key icon |
| Add `:::checkpoint` directive | ✅ | Green theme for self-assessment |
| Add `:::common-misconception` directive | ✅ | Rose/red theme with X icon |
| Update directive documentation | ✅ | Examples in IMPLEMENTATION_PROGRESS.md |

### 3.5 Enhanced Frontmatter
| Task | Status | Notes |
|------|--------|-------|
| Update content types | ✅ | Added DifficultyLevel type, readingTime, difficulty, keywords, prerequisites |
| Modify frontmatter parser | ✅ | calculateReadingTime(), parseDifficulty() in contentLoader.ts |
| Add reading time display | ✅ | SectionMetadata.tsx with clock icon and minute display |
| Add difficulty indicator | ✅ | Beginner/Intermediate/Advanced with color-coded bars |

---

## Phase 4: Advanced Features

### 4.1 Offline Support
| Task | Status | Notes |
|------|--------|-------|
| Set up Workbox service worker | ✅ | vite-plugin-pwa with Workbox, auto-generated SW |
| Cache content for offline reading | ✅ | NetworkFirst for JSON/MD, CacheFirst for images |
| Add offline indicator | ✅ | OfflineIndicator.tsx with useOnlineStatus hook |
| Sync when back online | ✅ | Automatic with NetworkFirst strategy |

### 4.2 Learning Analytics
| Task | Status | Notes |
|------|--------|-------|
| Create `analyticsStore.ts` | ✅ | Zustand store with reading sessions, daily stats, streaks |
| Track time per section | ✅ | useReadingSession hook with visibility/beforeunload handling |
| Build analytics dashboard | ✅ | AnalyticsDashboardPage at /greining route |
| Add data export | ✅ | JSON export with full analytics history |

### 4.3 Print Stylesheet
| Task | Status | Notes |
|------|--------|-------|
| Add `@media print` styles | ✅ | Comprehensive print CSS in globals.css (~500 lines) |
| Hide navigation in print | ✅ | Header, sidebar, buttons, modals hidden |
| Optimize equation rendering | ✅ | KaTeX equations sized for print, page-break-inside: avoid |
| Add page break controls | ✅ | orphans/widows, page-break-before/after, avoid breaks in tables |

---

## Summary Statistics

| Phase | Total Tasks | Completed | In Progress | Percentage |
|-------|-------------|-----------|-------------|------------|
| Phase 1 | 33 | 32 | 0 | 97% |
| Phase 2 | 20 | 20 | 0 | 100% |
| Phase 3 | 21 | 21 | 0 | 100% |
| Phase 4 | 12 | 12 | 0 | 100% |
| **Total** | **86** | **85** | **0** | **99%** |

---

## Changelog

### 2025-12-31 (Update 17)
- **Keyboard Shortcut Customization complete (Phase 1.5)**:
  - Extended `settingsStore.ts` with shortcut preferences:
    - `ShortcutAction` type for all keyboard actions
    - `DEFAULT_SHORTCUTS` constant with default key bindings
    - `shortcutPreferences` state (stores only user overrides)
    - `setShortcut()`, `resetShortcut()`, `resetAllShortcuts()` methods
    - `getShortcut()` returns user preference or default
  - Refactored `useKeyboardShortcuts.ts`:
    - Action-based shortcut system with metadata
    - `SHORTCUT_METADATA` defines descriptions (English + Icelandic) and categories
    - `KeyboardShortcut` interface with `isCustomized` flag
    - Dynamic key bindings from store
  - Enhanced `KeyboardShortcutsModal.tsx`:
    - Click any shortcut to enter edit mode
    - Press new key to rebind (single keys or multi-key like "g h")
    - Visual feedback during key capture
    - Customized shortcuts highlighted in amber
    - Reset individual shortcut button
    - Reset all shortcuts button (when customizations exist)
    - Icelandic instructions in modal footer
  - Shortcuts persist to localStorage via Zustand
- Phase 1 progress: 94% → 97%
- Overall progress: 98% → 99%

### 2025-12-31 (Update 16)
- **Learning Analytics complete (Phase 4.2)**:
  - Created `analyticsStore.ts` with comprehensive tracking:
    - Reading sessions per section with start/end times
    - Daily statistics (reading time, sections visited, flashcards, quizzes)
    - Study streak tracking (current and longest)
    - Activity log (last 500 entries)
    - Weekly and monthly summaries
  - Created `useReadingSession` hook:
    - Automatic session tracking on section mount/unmount
    - Visibility API integration (pause when tab hidden)
    - beforeunload handling for session save
    - Periodic updates every 30 seconds
  - Created `AnalyticsDashboardPage` at `/greining` route:
    - Overview cards: total time, today's time, weekly average, streak
    - Weekly bar chart showing last 7 days
    - Top 5 most-read sections
    - Recent activity feed
    - Monthly summary statistics
    - Data export (JSON download)
    - Clear all data option with confirmation
  - Added `formatReadingTime()` helper for Icelandic time formatting
  - Integrated with SectionView for automatic tracking
- **Phase 4 Complete! (100%)**
- Overall progress: 94% → 98%

### 2025-12-31 (Update 15)
- **Print Stylesheet complete (Phase 4.3)**:
  - Added comprehensive `@media print` styles to globals.css (~500 lines)
  - **Hidden elements in print**:
    - Navigation (header, nav, aside, sidebar)
    - Interactive controls (buttons, TTS controls, annotation sidebar)
    - Skip links, screen reader elements, modals
    - Bookmark and highlight action buttons
  - **Typography optimized for print**:
    - 12pt base font, headings 10-24pt
    - Proper orphans/widows control (3 lines)
    - pt-based margins and padding
  - **Page break controls**:
    - Avoid breaks inside tables, figures, equations, content blocks
    - Chapter headings (h1) start on new page
    - Keep headings with following content
  - **Content blocks styled for print**:
    - Colored left borders (4pt) for visual distinction
    - Note (blue), Warning (amber), Example (gray)
    - Definition (purple), Key Concept (cyan), Checkpoint (green), Misconception (rose)
  - **Math equations (KaTeX)**:
    - 11pt font size, centered display
    - Page-break-inside: avoid
    - Equation numbering preserved
  - **Tables**:
    - 1px borders, gray header background
    - thead repeats on each page
  - **Practice problems**:
    - Answers always visible in print (override hidden state)
    - Green border-top for answer section
  - **Links**: External URLs printed after link text
  - **Page setup**: A4 size, 2cm margins
- Phase 4 progress: 36% → 73%
- Overall progress: 89% → 94%

### 2025-12-30 (Update 14)
- **Offline Support complete (Phase 4.1)**:
  - Installed vite-plugin-pwa with Workbox for service worker generation
  - Created PWA manifest (`public/manifest.json`) with Icelandic metadata
  - Configured caching strategies in `vite.config.ts`:
    - **NetworkFirst** for content JSON and markdown (fresh when online)
    - **CacheFirst** for images and book covers (fast loading)
    - 61 precached entries (~1.9 MB app shell)
  - Created `useOnlineStatus` hook for online/offline detection
  - Created `OfflineIndicator` component (amber banner when offline)
  - Added service worker registration in `main.tsx` with update prompt
  - Updated `index.html` with manifest link, theme-color, Apple PWA meta tags
  - Integrated offline indicator in BookLayout
- Phase 4 progress: 0% → 36%
- Overall progress: 85% → 89%

### 2025-12-30 (Update 13)
- **Phase 3 Complete! (100%) - Enhanced Frontmatter**:
  - Updated content types with new fields:
    - `DifficultyLevel` type: beginner | intermediate | advanced
    - `readingTime`: Estimated minutes to read
    - `difficulty`: Section difficulty level
    - `keywords`: Optional keyword array
    - `prerequisites`: Optional prerequisite array
  - Added `calculateReadingTime()` in contentLoader.ts:
    - Cleans markdown syntax for accurate word count
    - Removes code blocks, math, images, directives
    - Uses 180 WPM reading speed for technical content
  - Added `parseDifficulty()` for validating difficulty levels
  - Created SectionMetadata.tsx component:
    - Clock icon with reading time in Icelandic ("X mínútur")
    - Difficulty indicator with color-coded bars:
      - Byrjandi (green, 1 bar)
      - Miðstig (amber, 2 bars)
      - Framhald (red, 3 bars)
    - Keywords display with hover tooltip
  - Integrated in SectionView.tsx after TTS controls
- Phase 3 progress: 81% → 100%
- Overall progress: 80% → 85%

### 2025-12-30 (Update 12)
- **New Content Directives complete (Phase 3.4)**:
  - Added `:::definition{term="Term"}` directive (purple theme)
    - Supports optional `term` attribute for the term being defined
    - Book icon, displays "Skilgreining: Term" as title
  - Added `:::key-concept` directive (cyan/teal theme)
    - Key icon, "Lykilhugtak" title
    - For highlighting essential concepts students must understand
  - Added `:::checkpoint` directive (green theme)
    - Checkmark icon, "Sjálfsmat" title
    - For self-assessment questions mid-section
  - Added `:::common-misconception` directive (rose/red theme)
    - X-circle icon, "Algeng misskilning" title
    - For addressing and correcting common student misconceptions
  - All directives follow existing content-block pattern with icons
  - Full dark mode support for all new directives
- **Pre-generated audio support** (bonus):
  - Added audioPlayer service for MP3 playback
  - TTSControls now checks for pre-generated audio files
  - Falls back to Web Speech API if no audio exists
  - Download button for pre-generated audio
  - Audio generation script (scripts/generate-audio.ts) for Tiro TTS
- Phase 3 progress: 71% → 81%
- Overall progress: 78% → 80%

### 2025-12-29 (Update 11)
- **Cross-Reference System complete**:
  - Created remarkCrossReferences.ts remark plugin
  - Syntax: `[ref:type:id]` where type is sec|eq|fig|tbl|def
  - Created referenceStore.ts for reference indexing
  - Auto-builds index from content on section load
  - Created CrossReference.tsx component with:
    - Hover preview popup with reference details
    - Type icons for equations, figures, tables, definitions
    - Link to source location
    - Keyboard-accessible (focus/blur triggers preview)
  - Integrated with MarkdownRenderer.tsx
  - Label anchor syntax: `{#eq:id}` after equations/figures
- Phase 3 progress: 47% → 71%
- Overall progress: 73% → 78%

### 2025-12-29 (Update 10)
- **Icelandic TTS with Piper**:
  - Replaced Web Speech API with Piper TTS (client-side WASM)
  - Added @mintplex-labs/piper-tts-web package
  - Created piperTts.ts service with voice management
  - 4 Icelandic voices from Talrómur/Reykjavík University:
    - Steinn (male, default)
    - Búi (male)
    - Salka (female)
    - Ugla (female)
  - Voice models (~56 MB each) cached in browser OPFS
  - Works offline after initial download
  - Rewrote useTextToSpeech.ts hook for Piper integration
  - Updated TTSControls.tsx with:
    - Download progress indicator
    - Voice selection grid with gender labels
    - Preload button for faster first playback
    - Info about offline capability
  - Voice preferences stored in localStorage
- Phase 1 progress: 91% → 94%
- Overall progress: 71% → 73%

### 2025-12-29 (Update 9)
- **Interactive Periodic Table complete**:
  - Created elements.ts with all 118 elements data
  - Icelandic names, electron configurations, physical properties
  - Category color scheme with background/border/text colors
  - Created PeriodicTable.tsx with standard 18-column grid layout
  - Element cells show atomic number, symbol, name, mass
  - Category filter with color-coded legend
  - Search by name (Icelandic/English), symbol, or atomic number
  - Element detail modal with:
    - Atomic properties (number, mass, period, group, block)
    - Electronic properties (configuration, oxidation states, electronegativity)
    - Physical properties (melting/boiling point, density)
    - Phase at room temperature (computed from melting/boiling points)
  - Keyboard navigation with arrow keys, Enter to select, Esc to close
  - Navigation between elements with prev/next buttons
  - Link to glossary search from modal
  - Created PeriodicTablePage.tsx at /lotukerfi route
- **Figure Viewer complete**:
  - Created FigureViewer.tsx with zoom and lightbox functionality
  - Figure numbering with chapter.figure format (e.g., "Mynd 1.1")
  - Mouse wheel zoom (0.5x-4x) with pan support
  - Lightbox mode with full-screen viewing
  - Keyboard shortcuts: +/- for zoom, 0 to reset, Esc to close
  - Download button for saving images
  - Gallery navigation with arrow keys and prev/next buttons
  - Loading and error states
  - Alt text displayed in caption and aria-label
- Phase 3 progress: 0% → 47%
- Overall progress: 61% → 71%

### 2025-12-29 (Update 8)
- **Phase 2 Complete! (100%)**:
  - Created ObjectivesDashboardPage at /markmid route
  - Shows all learning objectives grouped by chapter/section
  - Displays completion status and confidence ratings
  - Confidence statistics: average, assessed count, low-confidence count
  - Expandable/collapsible chapter sections
  - Create individual flashcards from any objective
  - Bulk create flashcards for all low-confidence objectives
  - Auto-creates "Markmið" deck for objective flashcards
  - Added route in App.tsx
- Phase 2 progress: 90% → 100%
- Overall progress: 59% → 61%

### 2025-12-29 (Update 7)
- **Enhanced Quiz System complete**:
  - Added `:::explanation` directive for practice problem explanations
  - Added `:::hint` directive with progressive reveal (multiple hints)
  - Updated InteractivePracticeProblem.tsx with hint/explanation support
  - Created AdaptiveQuiz.tsx component for adaptive learning
  - Added mastery tracking (MasteryLevel: novice→mastered)
  - Extended PracticeProblem type with successfulAttempts
  - Added quizStore methods: getProblemMastery, getSectionMastery, getChapterMastery
  - Added getProblemsForReview and getAdaptiveProblems for smart problem selection
- Phase 2 progress: 82% → 90%

### 2025-12-29 (Update 6)
- **Learning Objectives Self-Assessment**:
  - Added confidence ratings to objectivesStore (1-5 scale)
  - Created SelfAssessmentModal component
  - Emoji-based confidence indicators
  - Summary with average confidence score
  - Prompt to create flashcards for low-confidence objectives
- **Search History**:
  - localStorage-based history (max 10 items)
  - Recent searches with result counts
  - Remove individual items or clear all
  - One-click to repeat search
- Phase 2 progress: 65% → 82%

### 2025-12-29 (Update 5)
- **Fuse.js fuzzy search integration**:
  - Installed fuse.js for fuzzy matching
  - Refactored searchIndex.ts with SearchIndex class
  - Weighted search: titles (3x), chapters (2x), content (1x)
  - Threshold 0.4 for typo tolerance
  - Pre-built index for faster searches
- **Search filters**:
  - Chapter filter dropdown in SearchModal
  - Clear filters button
  - Filter indicator on search button
- **Improved search results**:
  - Relevance score indicator ("Nákvæm" for exact matches)
  - Better snippet context
  - line-clamp for consistent result sizing
- Phase 2 progress: 47% → 65%

### 2025-12-29 (Update 4)
- **Phase 2 Flashcard-Content Integration complete**:
  - Created FlashcardModal.tsx for creating cards from selected text
  - Added "Búa til minniskort" button to SelectionPopup
  - Deck selection and creation support
  - Source tracking (bookSlug/chapterSlug/sectionSlug)
  - Created InlineFlashcardReview.tsx for end-of-section review
  - SM-2 rating buttons with interval preview
  - Due card prioritization in inline review
- **Focus Mode floating mini-nav**:
  - Created FocusModeNav.tsx component
  - Collapsible navigation bar
  - Previous/next section navigation
  - Home and exit focus mode buttons
  - Current section title display
- Phase 2 progress: 18% → 47%

### 2025-12-29 (Update 3)
- **WCAG contrast compliance**: Updated accent colors
  - Light mode: #5dba9c → #1a7d5c (4.5:1+ contrast)
  - Dark mode: #5dba9c → #6ee7b7 (better contrast on dark bg)
  - Added --accent-decorative for non-text elements
- **Math-to-speech**: Added latexToSpeech() function
  - Converts LaTeX to Icelandic descriptions
  - role="math" and aria-label on equations
  - Supports fractions, powers, Greek letters, chemical notation
- Phase 1 progress: 84% → 91%

### 2025-12-29 (Update 2)
- **Heading hierarchy fix**: Markdown h1→h2, h2→h3 shift in MarkdownRenderer
- **Math accessibility improvements**:
  - Created EquationWrapper component with copy-to-clipboard
  - Added zoom modal for enlarged equations
  - Added CSS for equation numbering (counter-based)
  - Enhanced equation hover styles
- Documentation consolidation completed
- Phase 1 progress: 69% → 84%

### 2025-12-29
- Initial implementation matrix created
- **Phase 1 implementation completed:**
  - Created `annotationStore.ts` with full CRUD operations and export
  - Created `TextHighlighter.tsx` for text selection and highlighting
  - Created `SelectionPopup.tsx` for highlight color and note options
  - Created `NoteModal.tsx` for adding notes to highlights
  - Created `AnnotationSidebar.tsx` for managing all annotations
  - Created `useTextToSpeech.ts` hook with Web Speech API
  - Created `TTSControls.tsx` component with voice/speed controls
  - Created `useKeyboardShortcuts.ts` hook with multi-key support
  - Created `KeyboardShortcutsModal.tsx` for shortcuts help
  - Added WCAG 2.2 accessibility improvements to globals.css
  - Added highlight color styles to globals.css
  - Added focus mode support to globals.css
  - Added reduced motion support
  - Integrated all features into `SectionView.tsx`
  - Added focus mode to `BookLayout.tsx`
  - All TypeScript and ESLint checks pass

