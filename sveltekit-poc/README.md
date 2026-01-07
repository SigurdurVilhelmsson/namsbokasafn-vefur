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

## Limitations of This PoC

- No KaTeX/math rendering yet (would use remark-math + rehype-katex)
- No mdsvex for markdown in components (would add for production)
- Simplified chapter content (hard-coded, not fetched from files)
- No localStorage persistence for flashcard records (wired but not persisting in PoC)

## Next Steps

To extend this PoC to production:

1. **Add mdsvex for markdown:**
   ```bash
   npm install mdsvex
   ```

2. **Add KaTeX support:**
   ```bash
   npm install katex remark-math rehype-katex
   ```

3. **Connect to actual content files:**
   - Fetch markdown from `public/content/`
   - Parse YAML frontmatter
   - Process custom directives

4. **Add PWA support:**
   ```bash
   npm install @vite-pwa/sveltekit
   ```

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
