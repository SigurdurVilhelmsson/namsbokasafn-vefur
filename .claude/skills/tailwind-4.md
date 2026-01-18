---
name: tailwind-4
description: Tailwind CSS v4 patterns. Triggers for styling, CSS, Tailwind, theme.
---

# Tailwind CSS 4

This project uses Tailwind v4 with CSS-first configuration.

## Configuration

No `tailwind.config.js` needed. Configuration is in `src/app.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  :root {
    --bg-primary: #faf8f5;
    --text-primary: #1a1a1a;
    --accent-color: #1a7d5c;
    /* ... */
  }

  .dark {
    --bg-primary: #1a1a2e;
    --text-primary: #e2e8f0;
    /* ... */
  }
}
```

## Using Theme Variables

Reference CSS variables directly:

```svelte
<div class="bg-[var(--bg-primary)] text-[var(--text-primary)]">
  Content
</div>
```

Or use semantic classes defined in app.css.

## Dark Mode

This project uses class-based dark mode (`.dark` on html element):

```svelte
<div class="bg-white dark:bg-gray-900">
  <!-- Uses Tailwind's built-in dark: variant -->
</div>

<div class="bg-[var(--bg-primary)]">
  <!-- Uses CSS variables that change with .dark class -->
</div>
```

## Key Differences from Tailwind v3

| v3 | v4 |
|----|-----|
| `tailwind.config.js` | CSS `@theme` or `@layer base` |
| `theme.extend.colors` | CSS variables in `:root` |
| Plugin system (JS) | `@plugin` directive (CSS) |
| JIT always | Native CSS features |

## Project-Specific Variables

See `src/app.css` for the full list. Key ones:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`
- `--accent-color`, `--accent-hover`
- `--font-size-base`, `--line-height-normal`
