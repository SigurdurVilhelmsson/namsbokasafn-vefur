# Cache Strategy

This document describes the caching architecture for offline support in Námsbókasafn.

## Overview

The app uses a two-layer caching approach:

1. **Precaching** - App shell files cached at service worker install time
2. **Runtime caching** - Content cached on-demand or via explicit download

## Cache Names

| Cache Name | Contents | Strategy | Expiration |
|------------|----------|----------|------------|
| `workbox-precache-*` | App shell (JS, CSS, HTML, fonts) | Precache | Versioned |
| `book-content` | Markdown files, JSON (TOC, glossary) | CacheFirst | 30 days, 500 entries max |
| `book-images` | Chapter images (jpg, png, svg, webp) | CacheFirst | 30 days, 200 entries max |
| `google-fonts-cache` | Google Fonts stylesheets | CacheFirst | 1 year, 10 entries max |
| `gstatic-fonts-cache` | Google Fonts files (.woff2) | CacheFirst | 1 year, 10 entries max |

## Precaching (App Shell)

Configured in `vite.config.ts`:

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
}
```

**What gets precached:**
- SvelteKit route bundles (`_app/immutable/**`)
- KaTeX fonts (`.woff`, `.woff2`)
- App icons and favicon
- Web app manifest

**Total precache size:** ~1.8 MB (81 entries)

Precached files are versioned by content hash. When the app updates, old versions are automatically cleaned up.

## Runtime Caching

### Book Content (`book-content`)

**URL pattern:** `/content/**/*.{md,json}`

```typescript
{
  urlPattern: /^.*\/content\/.*\.(md|json)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'book-content',
    expiration: {
      maxEntries: 500,
      maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
    }
  }
}
```

**Files cached:**
- `toc.json` - Table of contents
- `glossary.json` - Glossary terms
- `chapters/{slug}/*.md` - Section markdown files

### Book Images (`book-images`)

**URL pattern:** `/content/**/*.{png,jpg,jpeg,gif,svg,webp}`

```typescript
{
  urlPattern: /^.*\/content\/.*\.(png|jpg|jpeg|gif|svg|webp)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'book-images',
    expiration: {
      maxEntries: 200,
      maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
    }
  }
}
```

**Files cached:**
- Chapter images referenced in markdown
- Diagrams, photos, figures

## Caching Strategies

### CacheFirst (used for all content)

```
Request → Check Cache → Found? → Return cached
                      ↓ Not found
                      Fetch from network → Cache response → Return
```

**Why CacheFirst:**
- Book content rarely changes
- Faster subsequent loads
- Works offline after first visit
- Network only needed for uncached content

### Alternative strategies (not used):

- **NetworkFirst** - Check network first, fall back to cache. Better for frequently changing data.
- **StaleWhileRevalidate** - Return cached immediately, update cache in background. Good for semi-dynamic content.

## Explicit Download Feature

The "Download for offline" button (`DownloadBookButton.svelte`) pre-populates caches before the user navigates to content.

### Download Flow

```
1. Fetch toc.json
2. Build URL list:
   - /content/{book}/toc.json
   - /content/{book}/glossary.json
   - /content/{book}/chapters/{chapter}/{section}.md (all sections)
3. For each markdown file:
   - Fetch and cache in 'book-content'
   - Extract image URLs from markdown
4. For each image:
   - Fetch and cache in 'book-images'
5. Store download state in localStorage
```

### Download State Storage

```typescript
// localStorage key: 'namsbokasafn:offline'
{
  books: {
    'efnafraedi': {
      downloaded: true,
      downloadedAt: '2025-01-08T12:00:00.000Z',
      version: '1.0',
      sizeBytes: 40335717
    }
  }
}
```

### Why Manual Caching?

The service worker's runtime caching only caches content when it's fetched. For true offline support, we need to:

1. **Pre-fetch all content** - User may not visit every section before going offline
2. **Cache images** - Images are discovered by parsing markdown, not by navigation
3. **Show progress** - User needs feedback during download
4. **Track state** - Know which books are available offline

## Cache Invalidation

### Automatic (Workbox)

- Precached files: Invalidated when content hash changes (new deploy)
- Runtime cached files: Expire after 30 days or when max entries exceeded

### Manual (User-initiated)

Users can delete cached content via the download button UI:

```typescript
// Clears matching entries from both caches
const contentCache = await caches.open('book-content');
const imagesCache = await caches.open('book-images');

const bookPattern = `/content/${bookSlug}/`;
// Delete all entries matching the book
```

## Content Size Reference

For the Chemistry textbook (efnafraedi):

| Content Type | Count | Size |
|--------------|-------|------|
| Markdown files | 25 | ~200 KB |
| JSON files | 2 | ~17 KB |
| Images | 68 | ~38 MB |
| **Total** | 95 | **~38.5 MB** |

## Offline Verification

Run the test script to verify all content is accessible:

```bash
npm run preview
node scripts/test-offline.js
```

Expected output:
```
✓ All files accessible - offline caching should work correctly
```

## Browser Support

Service workers and Cache API are supported in:
- Chrome 45+
- Firefox 44+
- Safari 11.1+
- Edge 17+

For unsupported browsers, the app works normally but without offline support.

## Debugging

### Chrome DevTools

1. **Application → Service Workers** - View registered SW, trigger update
2. **Application → Cache Storage** - Inspect cached files by cache name
3. **Network → Offline checkbox** - Test offline behavior

### Useful commands

```javascript
// List all caches
caches.keys().then(console.log);

// Inspect a cache
caches.open('book-content').then(cache =>
  cache.keys().then(keys => console.log(keys.map(k => k.url)))
);

// Clear all caches (development only)
caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
```

## Future Improvements

1. **Background sync** - Queue failed requests when offline, replay when online
2. **Cache versioning** - Invalidate book content when new version published
3. **Selective download** - Download individual chapters instead of full book
4. **Storage quota** - Check available storage before download, warn if low
