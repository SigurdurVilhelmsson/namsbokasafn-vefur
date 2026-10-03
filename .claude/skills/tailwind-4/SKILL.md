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
    --bg-primary: #f7f4ef;
    --accent-color: #c78c20;
    --accent-hover: #a87518;
    /* ... */
  }

  .dark {
    --bg-primary: #16161c;
    --accent-color: #e8a838;
    --accent-hover: #f0bc5a;
    /* ... */
  }
}
```

Accent is **amber/gold**, never blue — see CLAUDE.md "Design System" for when blue is allowed (semantic content only).

> **The values above are mirrored from `src/app.css`. If they disagree, `app.css` wins — go
> fix them here.** They drifted once already: this file taught `--accent-color: #1a7d5c`, a
> green, for a site whose accent has been amber since the design system landed.

⚠️ **`tailwind.config.js` still exists at the repo root and is DEAD — do not edit it expecting
an effect.** It is a v3 leftover (dated 2026-01-09). Tailwind v4 only reads a JS config when
CSS asks for it with `@config`, and `src/app.css` never does — verified: no `@config` anywhere,
and `font-dyslexic`, the one utility that file uniquely declares, appears in no source file and
in no built CSS. Its `darkMode: 'class'` is really `@custom-variant dark` in `app.css`, and its
`fontFamily.dyslexic` is really an `@font-face` in `app.css` plus the `fontFamily` setting in
`src/lib/stores/settings.ts`. Change theme things in `app.css`.

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

| v3                    | v4                            |
| --------------------- | ----------------------------- |
| `tailwind.config.js`  | CSS `@theme` or `@layer base` |
| `theme.extend.colors` | CSS variables in `:root`      |
| Plugin system (JS)    | `@plugin` directive (CSS)     |
| JIT always            | Native CSS features           |

## Project-Specific Variables

See `src/app.css` for the full, current list. Key ones:

- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`
- `--accent-color`, `--accent-hover`, `--accent-light`, `--accent-subtle`
- `--font-size-base`, `--line-height-normal`
