# Performance Audit - 2025-12-08

## Summary

- **Status**: 🟡 NEEDS IMPROVEMENT
- **Build Size**: 1.17 MB (JS + CSS)
- **Gzipped Size**: 333 KB
- **Bundle Warning**: ⚠️ JS bundle exceeds 500KB threshold

---

## Build Output Analysis

### Bundle Sizes

| Asset | Size | Gzipped | Budget | Status |
|-------|------|---------|--------|--------|
| **JavaScript** | 1,073 KB | 320 KB | 200 KB | 🔴 Over |
| **CSS** | 73.6 KB | 12.8 KB | 50 KB | 🟡 Near |
| **HTML** | 0.58 KB | 0.35 KB | N/A | ✅ OK |
| **Total Assets** | 1,147 KB | 333 KB | 500 KB | 🔴 Over |

### Content & Static Assets

| Category | Size | Notes |
|----------|------|-------|
| Content (markdown + images) | 42 MB | Expected for textbook |
| KaTeX Fonts | 1.1 MB | 60 font files (woff2, woff, ttf) |
| Total dist/ | 45 MB | Includes content |

---

## Detailed Findings

### 1. JavaScript Bundle Size 🔴

**Issue**: The JS bundle is 1,073 KB (320 KB gzipped), exceeding the 500 KB warning threshold.

**Contributing Factors**:
- `react-markdown` + plugins (remark-gfm, remark-math, remark-directive)
- `rehype-katex` for math rendering
- `katex` library for LaTeX
- `lucide-react` icon library
- `zustand` state management
- `date-fns` date utilities
- `react-router-dom` routing

**Impact**: Slower initial page load, especially on mobile/slow connections.

---

### 2. No Code Splitting 🔴

**Finding**: No React.lazy() or dynamic imports detected.

**Current State**:
```typescript
// No lazy loading found in src/
grep "lazy(" src/ → No matches
grep "React.lazy" src/ → No matches
```

**Recommendation**: Implement code splitting for:
- Heavy components (MarkdownRenderer, FlashcardDeck)
- Route-based splitting
- KaTeX/math components (load on demand)

---

### 3. No Performance Hooks 🟡

**Finding**: No useMemo or useCallback hooks detected.

**Searched**: `grep "useMemo|useCallback" src/` → No matches

**Impact**: Potential unnecessary re-renders in complex components.

**Recommendation**: Add memoization to:
- Expensive computations
- Callback functions passed to children
- Heavy list rendering

---

### 4. Image Optimization 🟡

**Finding**: All images are JPG format, no WebP optimization.

**Current Images**:
- Location: `public/content/chapters/*/images/`
- Format: JPG (all)
- No responsive srcset found

**Recommendation**:
- Convert to WebP format (30-50% smaller)
- Add responsive images with srcset
- Ensure all images have lazy loading

**Positive**: Found `loading="lazy"` in MarkdownRenderer.tsx ✅

---

### 5. Font Loading 🟡

**Finding**: KaTeX loads 60 font files (woff2, woff, ttf formats).

**Current State**:
- Using all KaTeX fonts
- No font subsetting
- Fonts loaded from same origin (good)

**Recommendation**:
- Use only woff2 format (smallest, best browser support)
- Consider font subsetting for only used glyphs
- Add font-display: swap in CSS

---

### 6. Vite Configuration 🟡

**Finding**: Basic Vite config with no build optimizations.

**Current vite.config.ts**:
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': ... } },
  server: { port: 5173, host: true },
})
```

**Missing**:
- Manual chunks configuration
- Build optimization settings
- Rollup output configuration

**Recommendation**: Add build optimization:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'markdown': ['react-markdown', 'remark-gfm', 'remark-math'],
        'katex': ['katex', 'rehype-katex'],
      }
    }
  }
}
```

---

## Performance Patterns Analysis

### Good Practices Found ✅

| Pattern | Status | Location |
|---------|--------|----------|
| Image lazy loading | ✅ Found | MarkdownRenderer.tsx:166 |
| Modern build tool (Vite 7) | ✅ | vite.config.ts |
| Tree shaking enabled | ✅ | Default in Vite |
| CSS in single bundle | ✅ | Build output |
| TypeScript compilation | ✅ | tsc before build |

### Missing Patterns ❌

| Pattern | Status | Impact |
|---------|--------|--------|
| Code splitting (React.lazy) | ❌ Missing | High |
| useMemo/useCallback | ❌ Missing | Medium |
| WebP images | ❌ Missing | Medium |
| Manual chunk config | ❌ Missing | High |
| Service worker | ❌ Missing | Low |
| Preload critical assets | ❌ Missing | Medium |

---

## Recommendations

### Immediate Actions (High Impact)

1. **Add Code Splitting** (~2 hours)
   ```typescript
   // Lazy load heavy components
   const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));
   const FlashcardDeck = lazy(() => import('./FlashcardDeck'));
   ```

2. **Configure Manual Chunks** (~30 min)
   - Split vendor libraries into separate chunks
   - Improves caching and parallel loading

3. **Add Route-Based Splitting** (~1 hour)
   - Lazy load routes/pages
   - Reduce initial bundle size

### Medium Priority

4. **Convert Images to WebP** (~2 hours)
   - Expected 30-50% size reduction
   - Better loading times

5. **Add Performance Hooks** (~2 hours)
   - Audit components for re-render issues
   - Add useMemo/useCallback where needed

6. **Font Optimization** (~1 hour)
   - Remove woff and ttf (keep only woff2)
   - Add font-display: swap

### Future Improvements

7. **Service Worker** - Offline support and caching
8. **Preload Critical Assets** - Faster LCP
9. **Resource Hints** - dns-prefetch, preconnect

---

## Performance Budget

### Current vs Target

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| JS Bundle | 1,073 KB | < 500 KB | 🔴 214% |
| JS Gzipped | 320 KB | < 150 KB | 🔴 213% |
| CSS Bundle | 73.6 KB | < 50 KB | 🟡 147% |
| Total Assets | 1.15 MB | < 500 KB | 🔴 230% |

### Expected After Optimizations

| Optimization | Estimated Savings |
|--------------|------------------|
| Code splitting | -200-300 KB (initial load) |
| Image WebP conversion | -30% image size |
| Font optimization | -200 KB |
| Manual chunks | Better caching |

**Target After Optimization**: ~400-500 KB initial load

---

## Core Web Vitals Estimate

Based on code analysis (actual metrics require Lighthouse):

| Metric | Estimate | Target | Notes |
|--------|----------|--------|-------|
| **LCP** | 🟡 2-3s | < 2.5s | Large bundle affects this |
| **FID** | 🟢 < 100ms | < 100ms | React handles well |
| **CLS** | 🟢 < 0.1 | < 0.1 | Images have loading="lazy" |

**Recommendation**: Run Lighthouse audit on deployed site for accurate metrics.

---

## Lighthouse Score Estimate

Without running Lighthouse (not available in this environment), estimated scores:

| Category | Estimate | Notes |
|----------|----------|-------|
| Performance | 60-70 | Bundle size impact |
| Accessibility | 85+ | Already audited |
| Best Practices | 80-90 | Good patterns |
| SEO | 70-80 | SPA limitations |

---

## Next Steps

1. **Immediate**: Implement code splitting for heavy components
2. **This Week**: Configure Vite manual chunks
3. **This Month**: Convert images to WebP
4. **Next Audit**: After optimizations, run Lighthouse

---

## Files to Modify

1. `vite.config.ts` - Add build optimization
2. `src/App.tsx` - Add React.lazy() for routes
3. `src/components/*` - Add lazy loading where needed
4. `public/content/*/images/*` - Convert to WebP

---

**Auditor**: Claude Code
**Date**: 2025-12-08
**Method**: Build analysis + code review
**Next Audit**: After optimizations or 2025-03-08 (quarterly)
