# Tailwind CSS v4.0 Reference for Claude Code

**Important**: This project uses Tailwind CSS v4.0 (released January 2025). Please follow these conventions carefully.

---

## Configuration: CSS-First, Not JavaScript

Tailwind 4 uses CSS-based configuration with `@theme`, NOT `tailwind.config.js`.

### Import Syntax (v4)
```css
/* ✅ Correct v4 syntax */
@import "tailwindcss";

@theme {
  --font-sans: "Inter", "system-ui", "sans-serif";
  --font-serif: "Lora", "Georgia", "serif";
  --color-cream-50: #fefdfb;
  --color-cream-100: #faf8f5;
  --color-ink-800: #1f2937;
  --breakpoint-3xl: 1920px;
}

/* ❌ Old v3 syntax - DO NOT USE */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Key Breaking Changes from v3

### 1. Border Default Color
```jsx
// v3: border defaulted to gray-200
// v4: border now uses currentColor

// ✅ v4: Always specify border color explicitly
<div className="border border-gray-200">

// ❌ This will use currentColor, not gray-200
<div className="border">
```

### 2. Ring Utility
```jsx
// v3: ring defaulted to 3px blue ring
// v4: ring defaults to 1px using currentColor

// ✅ v4: Be explicit about ring width and color
<button className="focus:ring-2 focus:ring-blue-500">

// ❌ This gives 1px currentColor ring, not 3px blue
<button className="focus:ring">
```

### 3. Shadow/Radius/Blur Naming
```jsx
// v3: shadow (unnamed default)
// v4: All utilities have named values

// ✅ v4: Use named values
<div className="shadow-sm">
<div className="shadow-md">
<div className="shadow-lg">
<div className="rounded-md">
<div className="rounded-lg">

// Note: "shadow" and "rounded" still work but prefer named values
```

### 4. Transition Transform
```jsx
// v3: transition-transform only needed transform property
// v4: Must include translate, scale, rotate properties too

// ✅ v4: Include all transform-related properties
<div className="transition-[transform,translate,scale,rotate,opacity]">

// Or use transition-all for simplicity
<div className="transition-all duration-300">
```

### 5. Container Queries (Built-in)
```jsx
// v4: No plugin needed! Container queries are built into core

// ✅ v4: Use @container and @size variants
<div className="@container">
  <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4">
    {/* Content */}
  </div>
</div>

// Max-width container queries
<div className="@container">
  <div className="@max-md:hidden">
    {/* Hidden below md container size */}
  </div>
</div>
```

---

## Removed Utilities (Do Not Use)

These v3 utilities have been removed in v4:

| Removed | Replacement |
|---------|-------------|
| `text-opacity-*` | Use color with opacity: `text-black/50` |
| `bg-opacity-*` | Use color with opacity: `bg-blue-500/75` |
| `border-opacity-*` | Use color with opacity: `border-gray-200/50` |
| `divide-opacity-*` | Use color with opacity |
| `ring-opacity-*` | Use color with opacity: `ring-blue-500/50` |
| `placeholder-opacity-*` | Use color with opacity |
| `flex-shrink-0` | Use `shrink-0` |
| `flex-grow` | Use `grow` |
| `decoration-slice` | Use `box-decoration-slice` |
| `decoration-clone` | Use `box-decoration-clone` |
| `overflow-ellipsis` | Use `text-ellipsis` |

---

## Color Opacity Syntax

v4 uses `color-mix()` under the hood, making opacity modifiers more powerful:

```jsx
// ✅ v4: Opacity works with any color, including CSS variables
<div className="bg-blue-500/50">       {/* 50% opacity */}
<div className="text-current/75">       {/* currentColor at 75% */}
<div className="border-[var(--brand)]/20"> {/* CSS variable at 20% */}
```

---

## Custom Variants (v4 Syntax)

```css
/* ✅ v4: Define custom variants in CSS */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* For complex selectors with multiple conditions */
@custom-variant dark {
  &:where([data-theme='dark'] *, [data-theme='dark']) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:not(html[data-theme='light'] *, [data-theme='light']) {
      @slot;
    }
  }
}
```

---

## Theme Variables Reference

When customizing in v4, use CSS custom properties with the `--` prefix:

```css
@theme {
  /* Colors: --color-{name}-{shade} */
  --color-primary-500: #3b82f6;
  --color-cream-100: oklch(0.98 0.01 90);
  
  /* Fonts: --font-{name} */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Lora", Georgia, serif;
  
  /* Spacing: --spacing-{name} */
  --spacing-18: 4.5rem;
  --spacing-88: 22rem;
  
  /* Breakpoints: --breakpoint-{name} */
  --breakpoint-3xl: 1920px;
  
  /* Easing: --ease-{name} */
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  
  /* Radius: --radius-{name} */
  --radius-4xl: 2rem;
}
```

These become utilities automatically:
- `--color-primary-500` → `bg-primary-500`, `text-primary-500`
- `--font-serif` → `font-serif`
- `--spacing-18` → `p-18`, `m-18`, `gap-18`

---

## Modern CSS Features Used by v4

Tailwind v4 uses these modern CSS features (ensure browser support):

- **Cascade Layers** (`@layer`) — native CSS layering
- **@property** — registered custom properties for animating gradients
- **color-mix()** — for opacity modifiers
- **Container Queries** — `@container`
- **Logical Properties** — for RTL support

**Browser Support**: Safari 16.4+, Chrome 111+, Firefox 128+

---

## Quick Migration Checklist

When writing new code or refactoring:

- [ ] Use `@import "tailwindcss"` not `@tailwind` directives
- [ ] Put theme customizations in `@theme {}` block, not JS config
- [ ] Always specify border color explicitly (`border-gray-200`)
- [ ] Always specify ring width and color (`ring-2 ring-blue-500`)
- [ ] Use opacity suffix instead of opacity utilities (`bg-black/50`)
- [ ] Use `shrink-0` and `grow` instead of `flex-shrink-0` and `flex-grow`
- [ ] Use `text-ellipsis` instead of `overflow-ellipsis`
- [ ] Container queries don't need a plugin anymore

---

## Example Component (v4 Style)

```jsx
export function Card({ children, className }) {
  return (
    <div className={`
      bg-white 
      rounded-xl 
      border border-gray-200/60 
      shadow-sm 
      p-6
      transition-all duration-200
      hover:shadow-md
      ${className}
    `}>
      {children}
    </div>
  );
}

export function Button({ children, variant = 'primary' }) {
  const base = "px-4 py-2.5 rounded-lg font-medium transition-colors duration-150";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200",
  };
  
  return (
    <button className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}
```
