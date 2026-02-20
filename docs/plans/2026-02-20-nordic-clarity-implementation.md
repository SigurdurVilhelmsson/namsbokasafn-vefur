# Nordic Clarity Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full visual redesign of Námsbókasafn with the "Nordic Clarity" aesthetic — warm amber/gold accent, Bricolage Grotesque + Literata typography, knowledge-graph hero, left-border content blocks, FAB replacing mobile bottom nav, first-class dark mode.

**Architecture:** CSS-first approach. Phase 1 updates design tokens (CSS variables, fonts) so the entire site inherits the new palette immediately. Subsequent phases rework individual components. The existing Svelte component structure, stores, and routing stay unchanged — this is a visual overhaul, not an architectural rewrite.

**Tech Stack:** SvelteKit 2, Svelte 5, Tailwind CSS v4, TypeScript, Google Fonts (Bricolage Grotesque, Literata, JetBrains Mono).

**Design Doc:** `docs/plans/2026-02-20-nordic-clarity-redesign.md`

---

## Phase 1: Design System Foundation

### Task 1: Update Google Fonts in app.html

**Files:**

- Modify: `src/app.html:8-14`

**Step 1: Replace the Google Fonts link**

Change the current font imports (Source Serif Pro, Lora) to the new stack (Bricolage Grotesque, Literata, JetBrains Mono):

```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,700;1,7..72,400&family=JetBrains+Mono:wght@400&display=swap"
  rel="stylesheet"
/>
```

**Step 2: Verify fonts load**

Run: `npm run dev`
Open browser dev tools → Network tab → filter by "fonts.googleapis.com" → confirm 3 font families load.

**Step 3: Commit**

```bash
git add src/app.html
git commit -m "chore: switch Google Fonts to Bricolage Grotesque, Literata, JetBrains Mono"
```

---

### Task 2: Update CSS custom properties — colors and typography

**Files:**

- Modify: `src/app.css:1-66`

**Step 1: Replace the `:root` and `.dark` variable blocks**

Replace lines 8-66 in `src/app.css` with the new design tokens:

```css
@layer base {
  :root {
    color-scheme: light;

    /* Font sizes */
    --font-size-base: 16px;
    --font-size-small: 14px;
    --font-size-large: 18px;
    --font-size-xlarge: 20px;

    /* Line heights */
    --line-height-normal: 1.7;
    --line-height-relaxed: 1.8;
    --line-height-loose: 2;

    /* Line widths (max-width for reading content) */
    --line-width-narrow: 38rem;
    --line-width-medium: 48rem;
    --line-width-wide: 60rem;

    /* Spacing scale (4px base) */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-12: 3rem;
    --space-16: 4rem;
    --space-24: 6rem;

    /* Border radius */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;

    /* Light theme colors */
    --bg-primary: #f7f4ef;
    --bg-secondary: #ffffff;
    --bg-tertiary: #efeae0;
    --text-primary: #1b2838;
    --text-secondary: #5a6474;
    --text-tertiary: #8a919c;
    --border-color: #ddd6c9;
    --accent-color: #c78c20;
    --accent-hover: #a87518;
    --accent-light: #fdf6e8;
    --accent-subtle: #f0e4c8;
    --accent-decorative: #c78c20;
    --header-banner: #c78c20;
    --header-banner-text: #ffffff;

    /* Shadows (warm-tinted) */
    --shadow-sm: 0 1px 2px rgba(27, 40, 56, 0.06);
    --shadow-md: 0 2px 8px rgba(27, 40, 56, 0.08);
    --shadow-lg: 0 4px 16px rgba(27, 40, 56, 0.1);
    --shadow-xl: 0 8px 32px rgba(27, 40, 56, 0.12);

    /* Subject colors */
    --subject-chemistry: #2e7d9c;
    --subject-chemistry-light: #e8f4f8;
    --subject-biology: #4a8c5c;
    --subject-biology-light: #e8f4ec;
    --subject-math: #7c5cad;
    --subject-math-light: #f0e8f8;
    --subject-social: #b07040;
    --subject-social-light: #f8f0e8;
  }

  .dark {
    color-scheme: dark;

    --bg-primary: #16161c;
    --bg-secondary: #1e1e26;
    --bg-tertiary: #26262f;
    --text-primary: #e8e4de;
    --text-secondary: #9a9590;
    --text-tertiary: #6a6560;
    --border-color: #2e2e38;
    --accent-color: #e8a838;
    --accent-hover: #f0bc5a;
    --accent-light: #2a2418;
    --accent-subtle: #332c1e;
    --accent-decorative: #e8a838;
    --header-banner: #e8a838;
    --header-banner-text: #16161c;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.4);
    --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.5);

    --subject-chemistry: #4da8c9;
    --subject-chemistry-light: #1a2d38;
    --subject-biology: #6aac7c;
    --subject-biology-light: #1a2d1e;
    --subject-math: #9c7cd0;
    --subject-math-light: #241a38;
    --subject-social: #d09060;
    --subject-social-light: #2d1e1a;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: "Literata", Georgia, serif;
  }
}
```

**Step 2: Update the heading font-family rule**

Find the heading styles in `src/app.css` (around lines 99-114 and 192-279) and change any `font-family` references from "Source Serif Pro" or "Lora" to "Bricolage Grotesque":

```css
/* For headings in reading content */
h1,
h2,
h3,
h4 {
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
}
```

**Step 3: Verify in browser**

Run: `npm run dev`

- Confirm warm paper background color (#f7f4ef)
- Confirm amber accent color appears where teal used to be
- Toggle dark mode — confirm warm charcoal background (#16161c)
- Check that body text is Literata, headings are Bricolage Grotesque

**Step 4: Run existing tests**

Run: `npm run check` and `npm run test`
Confirm no TypeScript errors and all unit tests pass.

**Step 5: Commit**

```bash
git add src/app.css
git commit -m "feat: update design tokens — Nordic Clarity color palette, typography, spacing"
```

---

### Task 3: Update PWA manifest theme color

**Files:**

- Modify: `vite.config.ts:108-109`

**Step 1: Update theme color**

Change `theme_color` from `'#1a7d5c'` to `'#c78c20'` and `background_color` from `'#ffffff'` to `'#f7f4ef'`.

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore: update PWA manifest colors to match Nordic Clarity palette"
```

---

### Task 4: Update content block styles (left-border approach)

**Files:**

- Modify: `src/app.css:389-840` (content block directives)

**Step 1: Redesign content block pattern**

Replace the full-color-background content blocks with the left-border pattern. Each block type gets:

- 3px colored left border
- `var(--bg-secondary)` background (not colored fill)
- Block type label + icon inline at top in semantic color
- Exception: `.warning` blocks keep a subtle tinted background

Pattern for each block type:

```css
.content-block,
.note,
.example,
.definition,
.key-concept,
.checkpoint,
.common-misconception,
.learning-objectives,
.link-to-learning,
.everyday-life,
.chapter-overview,
.chemist-portrait,
.sciences-interconnect {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-left: 3px solid; /* color set per type */
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  margin-block: var(--space-6);
}
```

Then per-type, only set `border-left-color` and the icon/header color:

```css
.note {
  border-left-color: #2563eb;
}
.note .block-header {
  color: #2563eb;
}

.warning {
  border-left-color: #d97706;
  background: #fffbeb; /* exception: warnings keep tinted bg */
}
.dark .warning {
  background: #332c1a;
}

.example {
  border-left-color: #6b7280;
}
.definition {
  border-left-color: #7c3aed;
}
.key-concept {
  border-left-color: #0891b2;
}
.checkpoint {
  border-left-color: #16a34a;
}
/* ... etc for each type */
```

**Step 2: Verify content blocks render correctly**

Navigate to a chapter with multiple block types. Verify:

- Each has a colored left border (not colored background fill)
- Warning blocks still have a subtle tinted background
- Dark mode works for all block types
- Text is readable in both modes

**Step 3: Commit**

```bash
git add src/app.css
git commit -m "feat: redesign content blocks with left-border pattern"
```

---

### Task 5: Update remaining app.css styles

**Files:**

- Modify: `src/app.css` — reading content typography (lines 192-279), status badges (302-330), tables (1250-1308), blockquotes (1309-1320), code blocks (1321-1345), figure lightbox (1346-1484), responsive styles (1533-1612)

**Step 1: Update reading content typography**

Update heading styles to use Bricolage Grotesque. Update body font references from "Source Serif Pro" to "Literata". Increase default line-height from 1.6 to 1.7.

**Step 2: Update status badges**

Update `.badge-available`, `.badge-in-progress`, `.badge-coming-soon` colors to use the new semantic colors from the design doc.

**Step 3: Update table, blockquote, and code styles**

- Tables: update header backgrounds to `var(--bg-tertiary)`, hover rows to `var(--accent-light)`, borders to `var(--border-color)`
- Blockquotes: update left border to `var(--accent-color)`
- Code: update background to `var(--bg-tertiary)`, use JetBrains Mono: `font-family: "JetBrains Mono", monospace;`

**Step 4: Update figure lightbox modal**

Update modal background, button colors, and border styles to use new CSS variables.

**Step 5: Verify visually**

Navigate through a chapter with tables, code, blockquotes, and figures. Verify all styles are consistent with the new palette. Test dark mode.

**Step 6: Run tests**

Run: `npm run check` and `npm run test`

**Step 7: Commit**

```bash
git add src/app.css
git commit -m "feat: update typography, tables, code blocks, lightbox to Nordic Clarity"
```

---

## Phase 2: Landing Page

### Task 6: Rewrite landing page — script and head

**Files:**

- Modify: `src/routes/+page.svelte:1-33`

**Step 1: Update the script block**

Replace the `subjectColors` record with the new subject color mapping:

```typescript
const subjectColors: Record<string, { primary: string; light: string }> = {
  chemistry: { primary: "#2e7d9c", light: "#e8f4f8" },
  biology: { primary: "#4a8c5c", light: "#e8f4ec" },
  math: { primary: "#7c5cad", light: "#f0e8f8" },
  social: { primary: "#b07040", light: "#f8f0e8" },
};
```

**Step 2: Update the svelte:head block**

Replace Fraunces font import with nothing (Bricolage Grotesque already loaded globally in app.html). Update the title if needed.

```svelte
<svelte:head>
  <title>Námsbókasafn - Opnar kennslubækur á íslensku</title>
</svelte:head>
```

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "refactor: update landing page script — new subject colors, remove Fraunces"
```

---

### Task 7: Rewrite landing page — header and hero

**Files:**

- Modify: `src/routes/+page.svelte:35-138`

**Step 1: Replace decorations, header, and hero sections**

Remove the floating molecular SVG decorations and orbital ring animation. Replace with:

1. **Knowledge graph background** — an SVG/CSS-only animated pattern of interconnected dots and lines at very low opacity
2. **Simplified header** — text-only brand "Námsbókasafn" (Bricolage Grotesque 700), theme toggle, no book SVG icon
3. **New hero content** — eyebrow text, main heading "Námsbækur þýddar og gefnar öllum", subheading, CTA button "Skoða bækur", secondary link

```svelte
<div class="landing" class:mounted>
  <!-- Knowledge graph background -->
  <div class="knowledge-graph" aria-hidden="true">
    <svg class="graph-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <!-- Nodes and connections rendered with CSS animations -->
      <!-- 24 nodes on desktop, CSS hides half on mobile -->
      {#each Array(24) as _, i}
        <circle
          class="graph-node"
          cx={100 + (i % 6) * 120 + Math.sin(i * 1.7) * 40}
          cy={80 + Math.floor(i / 6) * 130 + Math.cos(i * 2.3) * 30}
          r={3 + (i % 3)}
          style="animation-delay: {i * 0.3}s"
        />
      {/each}
      <!-- Connection lines between nearby nodes -->
      {#each Array(18) as _, i}
        <line
          class="graph-line"
          x1={100 + (i % 6) * 120 + Math.sin(i * 1.7) * 40}
          y1={80 + Math.floor(i / 6) * 130 + Math.cos(i * 2.3) * 30}
          x2={100 + ((i + 1) % 6) * 120 + Math.sin((i + 1) * 1.7) * 40}
          y2={80 + Math.floor((i + 1) / 6) * 130 + Math.cos((i + 1) * 2.3) * 30}
          style="animation-delay: {i * 0.2}s"
        />
      {/each}
    </svg>
  </div>

  <!-- Header -->
  <header class="landing-header">
    <a href="/" class="brand">Námsbókasafn</a>
    <nav class="landing-nav">
      <a href="#kennslubakur">Kennslubækur</a>
      <a href="#verkfaeri">Verkfæri</a>
      <a href="#um">Um verkefnið</a>
    </nav>
    <button
      class="theme-toggle"
      on:click={() => settings.toggleTheme()}
      aria-label={$settings.theme === 'dark' ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
    >
      {#if $settings.theme === 'dark'}
        <svg><!-- sun icon --></svg>
      {:else}
        <svg><!-- moon icon --></svg>
      {/if}
    </button>
  </header>

  <!-- Hero -->
  <section class="hero">
    <div class="hero-content">
      <span class="eyebrow">Opin námsgögn á íslensku</span>
      <h1>Námsbækur þýddar og gefnar öllum</h1>
      <p class="hero-sub">
        Þýddar OpenStax kennslubækur með innbyggðum námsverkfærum — gjaldfrjálst og opið öllum.
      </p>
      <div class="hero-actions">
        <a href="#kennslubakur" class="btn-primary">Skoða bækur</a>
        <a href="#um" class="btn-secondary">Læra meira um verkefnið</a>
      </div>
    </div>
  </section>
```

**Step 2: Verify hero renders**

Run dev server, check that hero text is visible, CTA buttons work (scroll to sections), knowledge graph is subtle background, header shows brand + nav links on desktop.

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: redesign landing hero — knowledge graph, text-only brand, new copy"
```

---

### Task 8: Rewrite landing page — book catalog section

**Files:**

- Modify: `src/routes/+page.svelte` (catalog section, ~lines 140-242)

**Step 1: Replace the book catalog section**

New clean card design with subject-colored left borders instead of gradient backgrounds:

```svelte
  <!-- Book Catalog -->
  <section class="catalog" id="kennslubakur">
    <div class="section-header">
      <h2>Kennslubækur</h2>
      <p>Veldu bók til að byrja að læra</p>
    </div>
    <div class="book-grid">
      {#each books as book}
        {@const colors = subjectColors[subjectIcons[book.slug]] || { primary: '#5a6474', light: '#f3f4f6' }}
        <a href="/{book.slug}" class="book-card" style="--subject-color: {colors.primary}; --subject-light: {colors.light}">
          <div class="book-card-header">
            <h3>{book.title}</h3>
            {#if book.status === 'available'}
              <span class="badge badge-available">Í boði</span>
            {:else if book.status === 'in-progress'}
              <span class="badge badge-in-progress">Í vinnslu</span>
            {:else}
              <span class="badge badge-coming-soon">Væntanlegt</span>
            {/if}
          </div>
          <p class="book-source">Byggt á {book.source.title}
            <svg class="external-icon" viewBox="0 0 16 16" width="12" height="12"><path d="M4 1h8v8m0-8L4 9" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
          </p>
          {#if book.stats}
            <div class="progress-row">
              <div class="progress-bar">
                <div class="progress-fill" style="width: {(book.stats.translatedChapters / book.stats.totalChapters) * 100}%"></div>
              </div>
              <span class="progress-label">{book.stats.translatedChapters} / {book.stats.totalChapters} kaflar</span>
            </div>
          {/if}
          {#if book.features}
            <div class="tool-icons">
              {#if book.features.flashcards}<span title="Minniskort">🗂</span>{/if}
              {#if book.features.glossary}<span title="Orðasafn">📖</span>{/if}
              {#if book.features.exercises}<span title="Próf">✓</span>{/if}
              {#if book.features.periodicTable}<span title="Lotukerfi">⚛</span>{/if}
            </div>
          {/if}
          <span class="card-link">Opna bók <span class="arrow">→</span></span>
        </a>
      {/each}
    </div>
  </section>
```

**Step 2: Verify cards render**

Confirm book cards show with subject-colored left border, status badge, progress bar, tool icons.

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: redesign book catalog cards — left-border style, tool icons"
```

---

### Task 9: Rewrite landing page — study tools and about sections

**Files:**

- Modify: `src/routes/+page.svelte` (about section ~lines 244-302)

**Step 1: Add study tools section (new)**

Insert a study tools section between the catalog and about sections:

```svelte
  <!-- Study Tools -->
  <section class="tools" id="verkfaeri">
    <div class="section-header">
      <h2>Verkfæri til náms</h2>
      <p>Innbyggð verkfæri sem hjálpa þér að læra betur</p>
    </div>
    <div class="tools-grid">
      <div class="tool-card" style="--tool-color: var(--accent-color)">
        <div class="tool-icon"><!-- layered cards SVG --></div>
        <h3>Minniskort</h3>
        <p>Endurtekningarkerfi sem aðlagar sig að þér</p>
      </div>
      <div class="tool-card" style="--tool-color: var(--subject-chemistry)">
        <div class="tool-icon"><!-- book+bookmark SVG --></div>
        <h3>Orðasafn</h3>
        <p>Smelltu á hugtök til að sjá skilgreiningar</p>
      </div>
      <div class="tool-card" style="--tool-color: var(--subject-math, #7c5cad)">
        <div class="tool-icon"><!-- checkmark SVG --></div>
        <h3>Próf</h3>
        <p>Aðlöguð próf til að prófa þekkingu</p>
      </div>
      <div class="tool-card" style="--tool-color: var(--subject-biology, #4a8c5c)">
        <div class="tool-icon"><!-- bar chart SVG --></div>
        <h3>Framvinda</h3>
        <p>Fylgstu með hvar þú ert stödd/staðinn</p>
      </div>
    </div>
  </section>
```

**Step 2: Rewrite about/attribution section**

```svelte
  <!-- About -->
  <section class="about" id="um">
    <div class="about-grid">
      <div class="about-card">
        <h3>Um Námsbókasafn</h3>
        <p>
          Námsbókasafn er sjálfboðaverkefni sem miðar að því að gera gæðanámsefni aðgengilegt
          á íslensku. Við þýðum opnar kennslubækur og bjóðum þær öllum að kostnaðarlausu.
        </p>
      </div>
      <div class="about-card">
        <h3>OpenStax og Rice University</h3>
        <p>
          Upprunaefnið kemur frá <a href="https://openstax.org" target="_blank" rel="noopener">OpenStax</a>,
          gefið út af Rice University. Efnið er gefið út undir
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> leyfi.
          Við erum ekki tengd OpenStax — við notum efni þeirra samkvæmt leyfisskilmálum.
        </p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="landing-footer">
    <p>
      © {new Date().getFullYear()} Námsbókasafn ·
      Efni byggt á <a href="https://openstax.org" target="_blank" rel="noopener">OpenStax</a> ·
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>
    </p>
  </footer>
</div>
```

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add study tools section, rewrite about/attribution"
```

---

### Task 10: Rewrite landing page — styles

**Files:**

- Modify: `src/routes/+page.svelte` (the `<style>` block, ~lines 304-1128)

**Step 1: Replace the entire style block**

This is the largest single change. Replace the ~850 lines of scoped styles with new styles matching the design doc. Key patterns:

- **Knowledge graph**: low-opacity SVG with gentle CSS animations (node drift, line pulse)
- **Header**: sticky, `backdrop-filter: blur(12px)`, text-only brand, nav links visible on desktop, hamburger icon on mobile (hidden for now — landing page only)
- **Hero**: left-aligned text on desktop (60% width), centered on mobile, staggered mount animation
- **Book cards**: white cards with subject-colored left border, hover elevates shadow
- **Study tools**: 2x2 grid mobile, 4-col desktop, icon in colored circle
- **About**: two cards on `--bg-tertiary`, no border
- **Footer**: centered, one-line, `--text-tertiary`
- **Responsive**: mobile-first, breakpoints at 640px and 1024px
- **Dark mode**: all colors via CSS variables (no `.dark` overrides needed in scoped styles if variables are used correctly)
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all animations

The full style block should use CSS variables from the design system (no hardcoded colors). All font references use `"Bricolage Grotesque"` for headings and inherit `"Literata"` from body.

**Step 2: Verify the full landing page**

Test in browser:

- [ ] Hero text renders with correct typography and stagger animation
- [ ] Knowledge graph background is subtle (barely visible)
- [ ] Book cards show correctly with subject border, progress bar, tool icons
- [ ] Study tools section shows 4 cards in grid
- [ ] About section shows two cards
- [ ] Footer shows one line
- [ ] Dark mode toggle works throughout
- [ ] Mobile responsive: check at 375px, 768px, 1024px widths
- [ ] `prefers-reduced-motion` disables animations (can test in Chrome DevTools → Rendering → Emulate CSS media feature)

**Step 3: Run tests**

Run: `npm run check` and `npm run test`

**Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: complete landing page redesign — Nordic Clarity styles"
```

---

## Phase 3: Global Navigation

### Task 11: Redesign Header component

**Files:**

- Modify: `src/lib/components/layout/Header.svelte` (250 lines)

**Step 1: Simplify and restyle the header**

Key changes:

- Slim 56px height
- Replace Tailwind color classes (`bg-white/80 dark:bg-gray-900/80`) with CSS variable equivalents
- Back arrow on mobile (replaces separate hamburger + home + back buttons)
- Center: book title (tappable for quick-nav on mobile)
- Right: search (Ctrl+K hint), keyboard shortcuts (?), theme toggle
- Breadcrumb on desktop: "Námsbókasafn > Book Title > Chapter Title"
- Background transparent → opaque on scroll (add `scroll` class via JS)
- Remove the colored banner section — integrate breadcrumb into the header bar itself

**Step 2: Verify header in book context**

Navigate to a chapter. Verify:

- Header shows breadcrumb on desktop
- Mobile shows back arrow + centered title + search + theme toggle
- Scrolling adds background opacity
- All buttons function correctly

**Step 3: Commit**

```bash
git add src/lib/components/layout/Header.svelte
git commit -m "feat: redesign header — slim bar, breadcrumb, scroll-aware bg"
```

---

### Task 12: Redesign Sidebar component

**Files:**

- Modify: `src/lib/components/layout/Sidebar.svelte` (429 lines)

**Step 1: Update width and styling**

Key changes:

- Reduce width from `w-80` (320px) to `w-[280px]`
- Replace Tailwind color classes with CSS variable equivalents:
  - Background: `var(--bg-secondary)` instead of `bg-white dark:bg-gray-900`
  - Borders: `var(--border-color)` instead of `border-gray-100 dark:border-gray-800`
  - Active section: `var(--accent-light)` bg + `var(--accent-color)` left border
  - Progress indicators: filled/empty dots instead of progress bars inside sections
  - Chapter numbers in subject-color circles
- Add study tool links at the bottom of the sidebar (Minniskort, Orðasafn, Próf, Lotukerfi)
- Mobile overlay: backdrop blur, `var(--shadow-xl)`

**Step 2: Verify sidebar navigation**

- Desktop: sidebar shows at 280px, chapter accordions expand, current section highlighted
- Mobile: sidebar slides in from left, backdrop blur, close button works
- Study tool links at bottom navigate correctly

**Step 3: Commit**

```bash
git add src/lib/components/layout/Sidebar.svelte
git commit -m "feat: redesign sidebar — narrower, dot indicators, tool links"
```

---

### Task 13: Replace MobileBottomNav with FAB

**Files:**

- Modify: `src/lib/components/layout/MobileBottomNav.svelte` (118 lines) — rewrite as FAB
- Modify: `src/routes/[bookSlug]/+layout.svelte:115-117` — update component reference

**Step 1: Rewrite MobileBottomNav as a FAB**

Replace the bottom navigation bar with a floating action button:

- 48px circle, fixed bottom-right, 16px inset
- `var(--accent-color)` background, white icon (grid/tools icon)
- On tap: expand to vertical stack of 4 study tool icons (40px each, 8px gap)
- Semi-transparent backdrop when expanded
- Auto-collapse after 5 seconds of inactivity or on scroll
- Only visible on mobile (`lg:hidden`)

**Step 2: Update the book layout to remove bottom padding**

The current layout adds `pb-24` padding to compensate for the fixed bottom nav. With a FAB, this padding is no longer needed. Update `src/routes/[bookSlug]/+layout.svelte` to remove the bottom padding on the main content area.

**Step 3: Verify FAB behavior**

- FAB appears bottom-right on mobile
- Tapping expands to show 4 tool icons
- Each icon navigates to the correct tool page
- Auto-collapses after 5s or on scroll
- Desktop: FAB is hidden

**Step 4: Commit**

```bash
git add src/lib/components/layout/MobileBottomNav.svelte src/routes/[bookSlug]/+layout.svelte
git commit -m "feat: replace mobile bottom nav with floating action button"
```

---

### Task 14: Update FocusModeNav styling

**Files:**

- Modify: `src/lib/components/layout/FocusModeNav.svelte` (32 lines)

**Step 1: Update colors and styling**

Replace Tailwind color classes with CSS variable equivalents:

- Background: `var(--bg-secondary)`
- Border: `var(--border-color)`
- Text: `var(--text-secondary)`
- Add: prev/next section arrows (in addition to existing home + exit)

**Step 2: Commit**

```bash
git add src/lib/components/layout/FocusModeNav.svelte
git commit -m "feat: update focus mode nav styling to Nordic Clarity"
```

---

## Phase 4: Reading View

### Task 15: Add scroll progress bar

**Files:**

- Modify: `src/routes/[bookSlug]/+layout.svelte` — add progress bar element
- Modify: `src/app.css` — add progress bar styles

**Step 1: Add a scroll progress bar to the book layout**

Add a thin (2px) bar fixed at the very top of the viewport (above the header, `z-index: 50`). Color: `var(--accent-color)`. Width: percentage of scroll through the current section.

In the layout component, add:

```svelte
<script>
  let scrollProgress = 0;

  function handleScroll() {
    const winHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = winHeight > 0 ? (window.scrollY / winHeight) * 100 : 0;
  }
</script>

<svelte:window on:scroll={handleScroll} />

<div class="scroll-progress" style="width: {scrollProgress}%"></div>
```

CSS in app.css:

```css
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--accent-color);
  z-index: 50;
  transition: width 50ms linear;
}
```

**Step 2: Verify progress bar**

Scroll through a chapter section — bar should grow from 0% to 100% width. Confirm it sits above the header. Hidden in focus mode.

**Step 3: Commit**

```bash
git add src/routes/[bookSlug]/+layout.svelte src/app.css
git commit -m "feat: add scroll progress bar to reading view"
```

---

### Task 16: Update section navigation

**Files:**

- Locate and modify the section navigation component (bottom of section view — likely in `src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte` or a shared component)

**Step 1: Find the section navigation**

Search for the prev/next section navigation at the bottom of reading pages.

**Step 2: Update desktop layout**

Full-width bar with left-aligned "previous" and right-aligned "next". Each shows section title + arrow icon. Hover lifts slightly.

**Step 3: Update mobile layout**

Stacked: next on top (primary action, `var(--accent-color)` bg), previous below (secondary). Full-width, 56px height tap targets.

**Step 4: Commit**

```bash
git commit -m "feat: redesign section navigation — stacked mobile, inline desktop"
```

---

### Task 17: Update book home page

**Files:**

- Modify: `src/routes/[bookSlug]/+page.svelte` (175 lines)

**Step 1: Restyle chapter cards**

Replace Tailwind color classes with CSS variable approach:

- Cards: `var(--bg-secondary)` background, `var(--border-color)` border, `var(--radius-lg)` corners
- Subject-colored left border (3px)
- Chapter numbers in subject-color circles
- Progress: use subject color for fill bar
- Hover: border shifts to subject color, shadow elevates

**Step 2: Update attribution section**

Use `var(--bg-tertiary)` for background. Typography updates for Bricolage Grotesque headings.

**Step 3: Verify book home page**

Navigate to /efnafraedi — confirm chapter grid renders with new card styles, progress bars work, attribution section is clean.

**Step 4: Commit**

```bash
git add src/routes/[bookSlug]/+page.svelte
git commit -m "feat: redesign book home page — chapter cards, attribution"
```

---

## Phase 5: Study Tools

### Task 18: Update flashcard UI

**Files:**

- Locate flashcard components in `src/lib/components/study/` and `src/routes/[bookSlug]/minniskort/`

**Step 1: Update card styling**

- Card: `var(--bg-secondary)`, `var(--radius-xl)`, `var(--shadow-lg)`
- 3D flip animation: `transform: rotateY(180deg)`
- Rating buttons: pills with semantic colors (Again red, Hard amber, Good subject color, Easy green)
- Phase stepper: horizontal dots + line, current filled with `var(--accent-color)`

**Step 2: Verify flashcard flow**

Test a full study session through all 4 phases.

**Step 3: Commit**

```bash
git commit -m "feat: restyle flashcard UI to Nordic Clarity"
```

---

### Task 19: Update glossary page

**Files:**

- Locate glossary components in `src/routes/[bookSlug]/ordabok/`

**Step 1: Add sticky alphabet bar**

Full Icelandic alphabet (A, Á, B, D, Ð, E, É, F, G, H, I, Í, J, K, L, M, N, O, Ó, P, R, S, T, U, Ú, V, X, Y, Ý, Þ, Æ, Ö). Letters with terms in `var(--text-primary)`, empty in `var(--text-tertiary)`.

**Step 2: Restyle term list**

Term in Bricolage Grotesque 600, definition in Literata. Dividers between terms. Search input at top.

**Step 3: Commit**

```bash
git commit -m "feat: redesign glossary — sticky alphabet bar, clean term list"
```

---

### Task 20: Update quiz and periodic table styling

**Files:**

- Locate quiz components in `src/routes/[bookSlug]/prof/`
- Locate periodic table in `src/routes/[bookSlug]/lotukerfi/`

**Step 1: Quiz**

- Question: centered, max-width 600px, `var(--text-xl)` font size
- Answer options: full-width selectable cards with `var(--accent-color)` left border when selected
- Progress bar at top
- Results card at end

**Step 2: Periodic table**

- Cell backgrounds: Chemistry subject color palette
- Selected element: `var(--accent-color)` ring
- Detail card: `var(--bg-secondary)`, `var(--radius-lg)`

**Step 3: Commit**

```bash
git commit -m "feat: update quiz and periodic table styles"
```

---

## Phase 6: Polish & Print

### Task 21: Update annotation highlight colors

**Files:**

- Modify: wherever annotation highlight colors are defined (likely `src/lib/stores/annotation.ts` or a component)

**Step 1: Update highlight palette**

Change to warm tones: soft yellow (`#f5e6b8`), amber (`#f0d0a0`), rose (`#f0c8c8`), blue (`#c8daf0`).

**Step 2: Commit**

```bash
git commit -m "feat: update annotation highlight colors to warm tones"
```

---

### Task 22: Update print stylesheet

**Files:**

- Modify: `src/app.css:1679-2292` (print styles)

**Step 1: Update print colors**

Replace old color references with new palette values. Content blocks use their semantic border colors. Ensure Bricolage Grotesque and Literata are used.

**Step 2: Test print preview**

Open a chapter page, Ctrl+P, verify print layout looks correct.

**Step 3: Commit**

```bash
git add src/app.css
git commit -m "feat: update print stylesheet for Nordic Clarity palette"
```

---

### Task 23: Final verification and E2E tests

**Files:**

- Modify: E2E test files in `tests/` if selectors have changed

**Step 1: Run full test suite**

```bash
npm run check
npm run test
npm run test:e2e
```

**Step 2: Fix any broken tests**

Update selectors/assertions that reference old class names, colors, or text content that changed.

**Step 3: Manual visual verification checklist**

Test at 375px (mobile), 768px (tablet), 1440px (desktop):

- [ ] Landing page: hero, catalog, tools, about, footer
- [ ] Dark mode toggle throughout
- [ ] Book home page: chapter grid
- [ ] Reading view: content blocks, figures, equations, tables
- [ ] Sidebar: desktop + mobile overlay
- [ ] FAB: expand/collapse, navigation
- [ ] Flashcards: full study session
- [ ] Glossary: alphabet bar, search
- [ ] Quiz: full quiz flow
- [ ] Focus mode: toggle with 'f'
- [ ] Scroll progress bar
- [ ] Print preview

**Step 4: Commit any test fixes**

```bash
git commit -m "fix: update E2E tests for Nordic Clarity redesign"
```

---

## Summary

| Phase          | Tasks | Description                                      |
| -------------- | ----- | ------------------------------------------------ |
| 1. Foundation  | 1–5   | Fonts, CSS variables, content blocks, PWA colors |
| 2. Landing     | 6–10  | Hero, catalog, tools, about, styles              |
| 3. Navigation  | 11–14 | Header, sidebar, FAB, focus mode                 |
| 4. Reading     | 15–17 | Scroll progress, section nav, book home          |
| 5. Study Tools | 18–20 | Flashcards, glossary, quiz, periodic table       |
| 6. Polish      | 21–23 | Annotations, print, E2E tests, verification      |

Total: 23 tasks across 6 phases. Each phase can be committed independently and the site remains functional between phases (CSS variables cascade, so Phase 1 alone improves the whole site).
