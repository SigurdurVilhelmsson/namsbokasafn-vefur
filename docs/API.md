# Component & API Documentation

## Table of Contents

1. [State Management (Stores)](#state-management-stores)
2. [Custom Hooks](#custom-hooks)
3. [Utility Functions](#utility-functions)
4. [Type Definitions](#type-definitions)
5. [Component Reference](#component-reference)

---

## State Management (Stores)

All stores use Zustand with localStorage persistence.

### settingsStore

User preferences for UI display.

```typescript
import { useSettingsStore } from '@/stores/settingsStore';

// Types
type Theme = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
type FontFamily = 'serif' | 'sans';

// State
interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  sidebarOpen: boolean;
}

// Actions
setTheme(theme: Theme): void
toggleTheme(): void
setFontSize(size: FontSize): void
setFontFamily(family: FontFamily): void
setSidebarOpen(open: boolean): void
toggleSidebar(): void
```

**Usage Example:**

```tsx
function ThemeToggle() {
  const { theme, toggleTheme } = useSettingsStore();

  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
```

**Persistence Key:** `efnafraedi-settings`

---

### readerStore

Reading progress and bookmarks.

```typescript
import { useReaderStore } from '@/stores/readerStore';

// State
interface ReaderState {
  progress: Record<string, boolean>; // sectionId -> completed
  currentChapter: string | null;
  currentSection: string | null;
  bookmarks: string[]; // Array of section IDs
}

// Actions
markSectionComplete(sectionId: string): void
markSectionIncomplete(sectionId: string): void
setCurrentLocation(chapter: string, section: string): void
addBookmark(sectionId: string): void
removeBookmark(sectionId: string): void
toggleBookmark(sectionId: string): void
isBookmarked(sectionId: string): boolean
getSectionProgress(sectionId: string): boolean
```

**Usage Example:**

```tsx
function ProgressIndicator({ sectionId }: { sectionId: string }) {
  const { getSectionProgress, markSectionComplete } = useReaderStore();
  const isComplete = getSectionProgress(sectionId);

  return (
    <button onClick={() => markSectionComplete(sectionId)}>
      {isComplete ? <CheckCircle /> : <Circle />}
    </button>
  );
}
```

**Persistence Key:** `efnafraedi-reading`

---

### flashcardStore

Flashcard decks and SRS study records.

```typescript
import { useFlashcardStore } from '@/stores/flashcardStore';

// State
interface FlashcardState {
  decks: FlashcardDeck[];
  studyRecords: Record<string, FlashcardStudyRecord>;
  currentDeckId: string | null;
  currentCardIndex: number;
  showAnswer: boolean;
  studyQueue: string[]; // Card IDs in priority order
  todayStudied: number;
  studyStreak: number;
  lastStudyDate: string | null;
}

// Deck Management
addDeck(deck: FlashcardDeck): void
removeDeck(deckId: string): void
getDeck(deckId: string): FlashcardDeck | undefined

// Card Management
addCardToDeck(deckId: string, card: Flashcard): void
removeCardFromDeck(deckId: string, cardId: string): void

// Study Session
startStudySession(deckId: string, mode?: 'all' | 'due' | 'new'): void
nextCard(): void
previousCard(): void
toggleAnswer(): void

// SRS Functions
rateCard(cardId: string, rating: DifficultyRating): void
getCardRecord(cardId: string): FlashcardStudyRecord | undefined
isCardDue(cardId: string): boolean
getDeckStats(deckId: string): DeckStats
getPreviewIntervals(cardId: string): Record<DifficultyRating, string>

// Reset
resetSession(): void
```

**Usage Example:**

```tsx
function StudyCard() {
  const {
    studyQueue,
    currentCardIndex,
    showAnswer,
    toggleAnswer,
    rateCard
  } = useFlashcardStore();

  const currentCardId = studyQueue[currentCardIndex];

  return (
    <div>
      {showAnswer ? (
        <div className="rating-buttons">
          <button onClick={() => rateCard(currentCardId, 'again')}>Again</button>
          <button onClick={() => rateCard(currentCardId, 'hard')}>Hard</button>
          <button onClick={() => rateCard(currentCardId, 'good')}>Good</button>
          <button onClick={() => rateCard(currentCardId, 'easy')}>Easy</button>
        </div>
      ) : (
        <button onClick={toggleAnswer}>Show Answer</button>
      )}
    </div>
  );
}
```

**Persistence Key:** `efnafraedi-flashcards`

---

## Custom Hooks

### useBook

Provides book context to child components.

```typescript
import { useBook, useBookFromParams } from '@/hooks/useBook';

// Context Value
interface BookContextValue {
  book: BookConfig | undefined;
  toc: TableOfContents | null;
  loading: boolean;
  error: string | null;
}

// Hook for consuming context
function useBook(): BookContextValue

// Hook for creating context from URL params
function useBookFromParams(): BookContextValue
```

**Usage Example:**

```tsx
function ChapterList() {
  const { toc, loading, error } = useBook();

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {toc?.chapters.map(chapter => (
        <li key={chapter.slug}>{chapter.title}</li>
      ))}
    </ul>
  );
}
```

---

### useTheme

Applies theme on mount and listens for system preference changes.

```typescript
import { useTheme } from '@/hooks/useTheme';

// Called at App root to initialize theme
function useTheme(): void
```

**Usage Example:**

```tsx
function App() {
  useTheme(); // Initialize theme on app load

  return <Router>...</Router>;
}
```

---

### useGlossary

Loads glossary data for a book.

```typescript
import { useGlossary } from '@/hooks/useGlossary';

interface UseGlossaryReturn {
  terms: GlossaryTerm[];
  loading: boolean;
  error: string | null;
}

function useGlossary(bookSlug: string): UseGlossaryReturn
```

**Usage Example:**

```tsx
function GlossaryList() {
  const { book } = useBook();
  const { terms, loading } = useGlossary(book?.slug ?? '');

  if (loading) return <Spinner />;

  return (
    <dl>
      {terms.map(term => (
        <div key={term.id}>
          <dt>{term.term}</dt>
          <dd>{term.definition}</dd>
        </div>
      ))}
    </dl>
  );
}
```

---

## Utility Functions

### contentLoader

Functions for loading content from static files.

```typescript
import {
  loadTableOfContents,
  loadSectionContent,
  findChapterBySlug,
  findSectionBySlug
} from '@/utils/contentLoader';

// Load table of contents
async function loadTableOfContents(bookSlug: string): Promise<TableOfContents>

// Load section markdown content
async function loadSectionContent(
  bookSlug: string,
  chapterSlug: string,
  sectionFile: string
): Promise<SectionContent>

// Find chapter in TOC by slug
function findChapterBySlug(
  toc: TableOfContents,
  slug: string
): Chapter | undefined

// Find section and its parent chapter
function findSectionBySlug(
  toc: TableOfContents,
  chapterSlug: string,
  sectionSlug: string
): { chapter: Chapter; section: Section } | null
```

**Usage Example:**

```typescript
// Load content for a section
const content = await loadSectionContent(
  'efnafraedi',
  '01-grunnhugmyndir',
  '1-1-efnafraedi.md'
);

console.log(content.title);      // "Hvað er efnafræði?"
console.log(content.objectives); // ["Skilið skilgreiningu..."]
console.log(content.content);    // Markdown content string
```

---

### srs (Spaced Repetition System)

SM-2 algorithm implementation for flashcard scheduling.

```typescript
import {
  processReview,
  isCardDue,
  sortCardsByPriority,
  getDueCards,
  getNewCards,
  calculateDeckStats,
  previewRatingIntervals
} from '@/utils/srs';

// Process a card review and return updated study record
function processReview(
  cardId: string,
  quality: StudyQuality,        // 0-5
  existingRecord?: FlashcardStudyRecord
): FlashcardStudyRecord

// Check if card is due for review
function isCardDue(record: FlashcardStudyRecord | undefined): boolean

// Sort cards by study priority
function sortCardsByPriority(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
): string[]

// Get cards due today
function getDueCards(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
): string[]

// Get new (never reviewed) cards
function getNewCards(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
): string[]

// Calculate deck statistics
function calculateDeckStats(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
): {
  total: number;
  new: number;
  due: number;
  learning: number;  // interval < 7 days
  review: number;    // interval >= 7 days
}

// Preview intervals for each rating
function previewRatingIntervals(
  existingRecord?: FlashcardStudyRecord
): Record<DifficultyRating, string>
```

**Algorithm Details:**

| Quality | Meaning | Next Interval |
|---------|---------|---------------|
| 0 (Again) | Complete blackout | Reset to 1 day |
| 1 | Incorrect, but recognized | Reset to 1 day |
| 2 (Hard) | Incorrect, easy to recall | Reset to 1 day |
| 3 | Correct, difficult | Continue progression |
| 4 (Good) | Correct, some hesitation | Continue progression |
| 5 (Easy) | Perfect response | Continue progression |

**Interval Progression:**
- First correct: 1 day
- Second correct: 6 days
- Subsequent: previous × ease factor (default 2.5)
- Maximum interval: 365 days

---

### searchIndex

Full-text search across content.

```typescript
import { searchContent, buildSearchIndex } from '@/utils/searchIndex';

interface SearchResult {
  chapterSlug: string;
  chapterTitle: string;
  sectionSlug: string;
  sectionTitle: string;
  snippet: string;
  matchCount: number;
}

// Search across all content
async function searchContent(
  query: string,
  toc: TableOfContents,
  bookSlug: string
): Promise<SearchResult[]>
```

**Usage Example:**

```typescript
const results = await searchContent('efnafræði', toc, 'efnafraedi');
// Returns sections containing the search term with highlighted snippets
```

---

## Type Definitions

### Content Types

```typescript
// src/types/content.ts

interface SourceAttribution {
  original: string;       // Original work title
  authors: string;        // Author names
  license: string;        // License name (e.g., "CC BY 4.0")
  licenseUrl: string;     // URL to license
  originalUrl: string;    // URL to original work
  translator: string;     // Translator name
  translationYear: number;
  modifications: string;  // Description of changes
}

interface Section {
  number: string;   // e.g., "1.1"
  title: string;    // Section title
  slug: string;     // URL slug
  file: string;     // Filename (e.g., "1-1-section.md")
}

interface Chapter {
  number: number;        // Chapter number
  title: string;         // Chapter title
  slug: string;          // URL slug
  sections: Section[];   // Sections in chapter
}

interface TableOfContents {
  title: string;
  attribution?: SourceAttribution;
  chapters: Chapter[];
}

interface SectionContent {
  title: string;
  section: string;        // Section number
  chapter: number;        // Chapter number
  objectives?: string[];  // Learning objectives
  source?: SourceAttribution;
  content: string;        // Markdown content
}

interface NavigationContext {
  current: { chapter: Chapter; section: Section };
  previous?: { chapter: Chapter; section: Section };
  next?: { chapter: Chapter; section: Section };
}
```

### Flashcard Types

```typescript
// src/types/flashcard.ts

type DifficultyRating = 'again' | 'hard' | 'good' | 'easy';
type StudyQuality = 0 | 1 | 2 | 3 | 4 | 5;

interface Flashcard {
  id: string;
  front: string;     // Question/term
  back: string;      // Answer/definition
  tags?: string[];   // Optional categorization
  source?: string;   // Where the card came from
}

interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  cards: Flashcard[];
  createdAt: string;
  updatedAt: string;
}

interface FlashcardStudyRecord {
  cardId: string;
  lastReviewed: string;      // ISO date
  nextReview: string;        // ISO date
  ease: number;              // Ease factor (default 2.5)
  interval: number;          // Current interval in days
  reviewCount: number;       // Total reviews
  consecutiveCorrect: number; // Streak of correct answers
}

// Mapping from user rating to SM-2 quality
const DIFFICULTY_TO_QUALITY: Record<DifficultyRating, StudyQuality> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5
};
```

### Book Configuration Types

```typescript
// src/config/books.ts

interface BookConfig {
  id: string;
  slug: string;              // URL slug
  title: string;             // Display title
  subtitle: string;
  description: string;
  subject: 'raunvisindi' | 'staerdfraedi' | 'felagsvisindi' | 'annað';
  coverImage: string;        // Path to cover image
  translator: string;
  translatorContact?: string;
  status: 'available' | 'in-progress' | 'coming-soon';
  source: {
    title: string;           // Original work title
    publisher: string;       // e.g., "OpenStax"
    url: string;             // Link to original
    authors: string[];
    license: string;
    licenseUrl: string;
  };
  stats?: {
    totalChapters: number;
    translatedChapters: number;
  };
  features?: {
    glossary: boolean;
    flashcards: boolean;
    exercises: boolean;
  };
}
```

---

## Component Reference

### Layout Components

#### `BookLayout`

Wrapper component providing book context and page structure.

```tsx
// Props: None (uses URL params)
// Provides: BookContext to all children

<BookLayout>
  <Header />
  <Sidebar />
  <main>
    <Outlet /> {/* Child routes render here */}
  </main>
</BookLayout>
```

**Features:**
- Applies font size/family from settings
- Provides skip-to-content link for accessibility
- Redirects to landing if book not found

---

#### `Header`

Navigation header with search, settings, and theme toggle.

```tsx
// Props: None
// Uses: useBook(), useSettingsStore()

<Header>
  <Hamburger />        {/* Mobile sidebar toggle */}
  <BookTitle />        {/* Current book/section title */}
  <SearchButton />     {/* Opens SearchModal */}
  <SettingsButton />   {/* Opens SettingsModal */}
  <ThemeToggle />      {/* Light/dark mode */}
</Header>
```

---

#### `Sidebar`

Collapsible table of contents with progress indicators.

```tsx
// Props: None
// Uses: useBook(), useReaderStore()

<Sidebar>
  <ChapterList>
    <ChapterItem>     {/* Expandable chapter header */}
      <SectionLink /> {/* Link with progress checkmark */}
    </ChapterItem>
  </ChapterList>
</Sidebar>
```

---

### Reader Components

#### `SectionView`

Displays section content with markdown rendering.

```tsx
// Props: None (uses URL params)
// Uses: useBook(), loadSectionContent()

<SectionView>
  <LearningObjectives objectives={content.objectives} />
  <MarkdownRenderer content={content.content} />
  <NavigationButtons />
  <ContentAttribution source={content.source} />
</SectionView>
```

---

#### `MarkdownRenderer`

Custom markdown processor with extensions.

```tsx
interface Props {
  content: string;  // Markdown content
}

<MarkdownRenderer content={markdown} />
```

**Supported Features:**
- GitHub Flavored Markdown (tables, strikethrough)
- Math equations (KaTeX): `$inline$` and `$$block$$`
- Custom directives: `::: note`, `::: warning`, `::: example`
- Lazy-loaded images with figure captions
- Syntax highlighting for code blocks
- Automatic heading IDs for linking

---

#### `FlashcardDeck`

Interactive flashcard study interface.

```tsx
interface Props {
  deckId: string;
  onClose: () => void;
}

<FlashcardDeck deckId="glossary-terms" onClose={handleClose} />
```

**Features:**
- Card flip animation
- Rating buttons with interval preview
- Progress indicator
- Keyboard navigation (Space to flip, 1-4 to rate)

---

### UI Components

#### `Modal`

Base modal component with accessibility features.

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Settings">
  <ModalContent />
</Modal>
```

**Features:**
- Focus trap
- ESC to close
- Click outside to close
- Smooth animations

---

#### `Button`

Styled button component.

```tsx
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  // ...standard button props
}

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

---

#### `SearchModal`

Full-text search interface.

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

<SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
```

**Features:**
- Keyboard shortcut: Ctrl/Cmd+K
- Debounced input (300ms)
- Highlighted search snippets
- Click result to navigate

---

#### `SettingsModal`

User preferences interface.

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

<SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
```

**Settings Available:**
- Font size (small, medium, large, xlarge)
- Font family (serif, sans-serif)
- Theme toggle (also in header)
