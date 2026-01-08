# SvelteKit Proof of Concept - Námsbókasafn

This proof of concept demonstrates how Námsbókasafn could be rewritten from React to SvelteKit.

## Quick Start

```bash
cd sveltekit-poc
npm install
npm run dev
```

Then open http://localhost:5173

## What This Demonstrates

### 1. Landing Page
- **File:** `src/routes/+page.svelte`
- **Original:** `src/components/catalog/LandingPage.tsx` (React)
- **Benefit:** ~30% less code, no hooks boilerplate

### 2. Svelte Stores (State Management)
- **Files:** `src/lib/stores/settings.ts`, `src/lib/stores/flashcard.ts`
- **Original:** Zustand stores with persist middleware
- **Benefit:** Simpler API, built-in reactivity, ~60% less code

### 3. Chapter Section View
- **File:** `src/routes/[book]/kafli/[...slug]/+page.svelte`
- **Original:** Required useEffect for data loading, loading states
- **Benefit:** Data loaded in +page.ts, component always has data ready

### 4. Flashcard System (SM-2)
- **File:** `src/lib/components/FlashcardStudy.svelte`
- **Original:** ~400 lines with useState, useCallback, useMemo
- **Benefit:** ~150 lines, built-in transitions, automatic reactivity

## Architecture Comparison

| Aspect | React (Current) | SvelteKit (PoC) |
|--------|-----------------|-----------------|
| **Total Bundle** | ~150KB+ | ~40KB (-73%) |
| **State Management** | Zustand + persist | Built-in stores |
| **Routing** | React Router | Built-in (file-based) |
| **SSR/SSG** | Not available | Built-in |
| **Animations** | Framer Motion | Built-in transitions |
| **Data Loading** | useEffect + loading states | Load functions |

## Code Comparison

### Settings Store

**React/Zustand (~150 lines):**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'system',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark'
      })),
    }),
    { name: 'settings' }
  )
);

// In component:
const { theme, toggleTheme } = useSettingsStore();
```

**SvelteKit (~50 lines):**
```typescript
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createSettingsStore() {
  const { subscribe, update } = writable({ theme: 'system' });

  if (browser) {
    subscribe(s => localStorage.setItem('settings', JSON.stringify(s)));
  }

  return {
    subscribe,
    toggleTheme: () => update(s => ({
      ...s,
      theme: s.theme === 'dark' ? 'light' : 'dark'
    }))
  };
}

export const settings = createSettingsStore();

// In component:
<script>
  import { settings } from '$lib/stores/settings';
</script>
<button on:click={settings.toggleTheme}>{$settings.theme}</button>
```

### Component with Reactivity

**React (~50 lines):**
```tsx
function FlashcardStudy() {
  const [flipped, setFlipped] = useState(false);
  const { currentCard, rate } = useFlashcardStore();

  const handleRate = useCallback((rating: number) => {
    rate(rating);
    setFlipped(false);
  }, [rate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') setFlipped(f => !f);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (/* JSX */);
}
```

**SvelteKit (~30 lines):**
```svelte
<script>
  import { flashcardStore, currentCard } from '$lib/stores/flashcard';

  let flipped = false;

  function handleRate(rating) {
    flashcardStore.rate(rating);
    flipped = false;
  }

  function handleKeydown(e) {
    if (e.key === ' ') flipped = !flipped;
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<!-- Template -->
```

## File Structure

```
sveltekit-poc/
├── src/
│   ├── app.html              # HTML template
│   ├── app.css               # Global styles
│   ├── lib/
│   │   ├── components/       # Svelte components
│   │   │   ├── BookCard.svelte
│   │   │   └── FlashcardStudy.svelte
│   │   ├── stores/           # Svelte stores
│   │   │   ├── settings.ts
│   │   │   └── flashcard.ts
│   │   └── types/            # TypeScript types
│   │       ├── book.ts
│   │       └── flashcard.ts
│   └── routes/
│       ├── +layout.svelte    # Root layout
│       ├── +page.svelte      # Landing page
│       ├── demo/
│       │   └── +page.svelte  # Demo page
│       └── [book]/
│           └── kafli/
│               └── [...slug]/
│                   ├── +page.ts      # Data loader
│                   └── +page.svelte  # Section view
├── static/
│   └── favicon.svg
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

## Key Svelte Concepts Used

### 1. Reactive Declarations
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;  // Automatically updates when count changes
</script>
```

### 2. Store Auto-subscription
```svelte
<script>
  import { settings } from '$lib/stores/settings';
</script>

<!-- $ prefix auto-subscribes and unsubscribes -->
<p>Theme: {$settings.theme}</p>
```

### 3. Built-in Transitions
```svelte
<script>
  import { fade, slide } from 'svelte/transition';
</script>

{#if visible}
  <div transition:fade={{ duration: 200 }}>
    Content
  </div>
{/if}
```

### 4. Load Functions
```typescript
// +page.ts
export const load = async ({ params, fetch }) => {
  const data = await fetch(`/api/chapters/${params.slug}`);
  return { chapter: await data.json() };
};

// +page.svelte
<script>
  export let data;  // Type-safe, already loaded
</script>
```

## Migration Timeline

With Claude doing the heavy lifting:

| Week | Tasks |
|------|-------|
| **1** | SvelteKit setup, routing, stores, landing page, chapter views |
| **2** | Flashcards (SM-2), quizzes, annotations, glossary, search |
| **3** | PWA, KaTeX, testing, performance tuning, deployment |

## Advantages Over Astro

For Námsbókasafn specifically:

| Factor | Astro | SvelteKit |
|--------|-------|-----------|
| **Unified codebase** | Hybrid (Astro + React islands) | Single framework |
| **Interactive features** | React islands required | Native Svelte |
| **State sharing** | Complex (Nanostores) | Simple (stores) |
| **Learning curve** | Learn Astro + keep React | Learn Svelte only |
| **Long-term maintenance** | Two paradigms | One paradigm |

## Migration Progress

### Completed Features

| Feature | Status | Files |
|---------|--------|-------|
| **Core Infrastructure** | | |
| Landing page | ✅ | `src/routes/+page.svelte` |
| Book layout & navigation | ✅ | `src/routes/[bookSlug]/+layout.svelte` |
| Chapter view | ✅ | `src/routes/[bookSlug]/kafli/[chapterSlug]/+page.svelte` |
| Section view | ✅ | `src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte` |
| **State Management** | | |
| Settings store | ✅ | `src/lib/stores/settings.ts` |
| Reader store | ✅ | `src/lib/stores/reader.ts` |
| Flashcard store (SM-2) | ✅ | `src/lib/stores/flashcard.ts` |
| Annotation store | ✅ | `src/lib/stores/annotation.ts` |
| Quiz store | ✅ | `src/lib/stores/quiz.ts` |
| Analytics store | ✅ | `src/lib/stores/analytics.ts` |
| Objectives store | ✅ | `src/lib/stores/objectives.ts` |
| Offline store | ✅ | `src/lib/stores/offline.ts` |
| **Content Rendering** | | |
| Markdown renderer | ✅ | `src/lib/components/MarkdownRenderer.svelte` |
| KaTeX/math equations | ✅ | `src/lib/actions/equations.ts` |
| Practice problems | ✅ | `src/lib/actions/practiceProblems.ts` |
| Custom directives | ✅ | Content blocks in `app.css` |
| **Study Tools** | | |
| Flashcard study | ✅ | `src/lib/components/FlashcardStudy.svelte` |
| Glossary page | ✅ | `src/routes/[bookSlug]/ordabok/+page.svelte` |
| Periodic table | ✅ | `src/lib/components/PeriodicTable.svelte` |
| **Annotation System** | ✅ | |
| Text highlighter | ✅ | `src/lib/components/TextHighlighter.svelte` |
| Selection popup | ✅ | `src/lib/components/SelectionPopup.svelte` |
| Note modal | ✅ | `src/lib/components/NoteModal.svelte` |
| Annotation sidebar | ✅ | `src/lib/components/AnnotationSidebar.svelte` |
| **Figure Viewer** | ✅ | |
| Figure viewer component | ✅ | `src/lib/components/FigureViewer.svelte` |
| Image lightbox | ✅ | `src/lib/components/ImageLightbox.svelte` |
| Lightbox action | ✅ | `src/lib/actions/figureViewer.ts` |
| **Quiz System** | ✅ | |
| Adaptive quiz | ✅ | `src/lib/components/AdaptiveQuiz.svelte` |
| Quiz page | ✅ | `src/routes/[bookSlug]/prof/+page.svelte` |
| **UI Components** | | |
| Header | ✅ | `src/lib/components/layout/Header.svelte` |
| Sidebar | ✅ | `src/lib/components/layout/Sidebar.svelte` |
| Search modal | ✅ | `src/lib/components/SearchModal.svelte` |
| Settings modal | ✅ | `src/lib/components/SettingsModal.svelte` |
| Keyboard shortcuts | ✅ | `src/lib/actions/keyboardShortcuts.ts` |
| **PWA Support** | ✅ | |
| PWA updater | ✅ | `src/lib/components/PWAUpdater.svelte` |
| Download book button | ✅ | `src/lib/components/DownloadBookButton.svelte` |
| **Testing** | | |
| Unit tests | ✅ | 129 tests passing |
| E2E tests | ✅ | Playwright smoke tests |

### Still Missing (from React app)

| Feature | Priority | Notes |
|---------|----------|-------|
| TTSControls | Medium | Text-to-speech functionality |
| BookmarksPage | Medium | Dedicated bookmarks management page |
| LearningObjectives display | Medium | Objectives dashboard |
| Analytics dashboard | Low | Reading analytics visualization |
| InlineFlashcardReview | Low | Review flashcards inline in content |

## Next Steps

To complete the migration:

1. **Add TTSControls** - Web Speech API wrapper for read-aloud feature
2. **Create BookmarksPage** - Dedicated page for managing bookmarks
3. **Convert remaining chapters** - Chapter 3 still in .docx format
4. **Add analytics dashboard** - Visualize reading progress and study stats

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://learn.svelte.dev)
- [Svelte Stores](https://svelte.dev/docs/svelte-store)
- [SvelteKit Routing](https://kit.svelte.dev/docs/routing)

---

## Summary

SvelteKit offers significant advantages for Námsbókasafn:

1. **~60% less code** - No hooks boilerplate, automatic reactivity
2. **~73% smaller bundles** - Svelte compiles away the framework
3. **Better DX** - Simpler mental model, less to remember
4. **Built-in features** - SSR, routing, transitions, stores
5. **Unified codebase** - Everything is Svelte, no hybrid approach

Given the 2-3 week timeline before launch, a full SvelteKit rewrite is achievable and would result in a more maintainable codebase long-term.
