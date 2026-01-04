# Feature Accessibility Analysis

This document analyzes how each implemented feature is accessible to users through the web interface and identifies gaps in discoverability.

## Navigation Structure Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ LANDING PAGE (/)                                                    │
│  ├─ Theme toggle (header)                                           │
│  └─ Book cards → Click to enter book                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BOOK LAYOUT (/:bookSlug/*)                                          │
│                                                                     │
│ HEADER:                                                             │
│  ├─ Home icon (→ catalog)                                           │
│  ├─ Book title (→ book home)                                        │
│  ├─ Search button (opens modal)                                     │
│  ├─ Theme toggle                                                    │
│  └─ Settings button (opens modal: font size, font family)          │
│                                                                     │
│ SIDEBAR:                                                            │
│  ├─ Table of Contents (chapters → sections)                         │
│  ├─ Orðasafn (Glossary) ✓                                           │
│  ├─ Minniskort (Flashcards) ✓                                       │
│  └─ Æfingadæmi (Practice) ✓                                         │
│                                                                     │
│ HIDDEN ROUTES (no navigation links):                                │
│  ├─ /markmid (Learning Objectives) ❌                               │
│  ├─ /greining (Analytics) ❌                                        │
│  └─ /lotukerfi (Periodic Table) ❌                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Accessibility Matrix

### ✅ FULLY ACCESSIBLE FEATURES

| Feature | Access Method | Location |
|---------|---------------|----------|
| Book Catalog | Direct URL `/` | Landing page |
| Book Home | Click book card or title | `/bookSlug` |
| Chapter View | Click chapter in sidebar | Sidebar |
| Section Reading | Click section in sidebar | Sidebar |
| Glossary | Sidebar link "Orðasafn" | Sidebar bottom |
| Flashcards | Sidebar link "Minniskort" | Sidebar bottom |
| Practice Progress | Sidebar link "Æfingadæmi" | Sidebar bottom |
| Full-text Search | Search icon in header | Header |
| Theme Toggle | Sun/moon icon in header | Header |
| Font Settings | Settings icon → modal | Header → Settings Modal |
| Reading Progress | Auto-tracked on scroll | Automatic |
| Mark as Read | Button in section view | Section toolbar |
| Bookmarks (add) | Bookmark icon in section | Section toolbar |
| Text Highlighting | Select text → popup | Section content |
| Annotations Sidebar | "Athugasemdir" button | Section toolbar |
| Export Annotations | Download button in sidebar | Annotation Sidebar |
| TTS Controls | "Lesa upphátt" button | Section toolbar |
| Learning Objectives | Displayed in sections | Section view |
| Practice Problems | Inline in content | Section content |
| Navigation (prev/next) | Bottom of section | Section footer |
| Chapter Progress | Progress bar in sidebar | Sidebar |

---

### ⚠️ PARTIALLY ACCESSIBLE FEATURES

| Feature | Issue | Current Access |
|---------|-------|----------------|
| **Keyboard Shortcuts** | No button in UI | Only via `?` key |
| **Bookmarks (view)** | Can add but not browse | No bookmarks list page |
| **Focus Mode** | No button in UI | Only via `Ctrl+.` or `f` key |

---

### ❌ HIDDEN/INACCESSIBLE FEATURES

| Feature | Route | Issue |
|---------|-------|-------|
| **Learning Objectives Dashboard** | `/markmid` | No navigation link anywhere |
| **Analytics Dashboard** | `/greining` | No navigation link anywhere |
| **Periodic Table** | `/lotukerfi` | No navigation link (chemistry-specific) |
| **Keyboard Shortcut Customization** | Modal | Only accessible via `?` key |

---

## Detailed Gap Analysis

### 1. Learning Objectives Dashboard (`/markmid`)
**Status:** Implemented but hidden

**Current State:**
- Full dashboard with objective tracking
- Self-assessment with confidence levels
- Progress visualization by chapter
- Low-confidence objective identification

**Problem:** Users cannot discover this feature. Only accessible if they:
- Know the URL directly
- Navigate from Analytics page (which is also hidden)

**Recommendation:** Add link in sidebar under study tools.

---

### 2. Analytics Dashboard (`/greining`)
**Status:** Implemented but hidden

**Current State:**
- Reading time statistics
- Weekly/monthly summaries
- Study streak tracking
- Activity log
- Data export/clear

**Problem:** Users have no way to discover their analytics.

**Recommendation:** Add link in sidebar or header.

---

### 3. Periodic Table (`/lotukerfi`)
**Status:** Implemented but hidden (chemistry-specific)

**Current State:**
- Interactive periodic table
- Element details
- Phase indicators
- Search/filter

**Problem:** Chemistry students cannot find this tool.

**Recommendation:** Show conditionally for chemistry books, add to sidebar.

---

### 4. Bookmarks List
**Status:** Partially implemented

**Current State:**
- Users CAN add bookmarks via section view
- Bookmarks ARE stored in readerStore
- No UI to VIEW/MANAGE bookmarks

**Problem:** Users add bookmarks but cannot browse or navigate to them.

**Recommendation:** Create BookmarksPage or add to sidebar.

---

### 5. Keyboard Shortcuts
**Status:** Working but undiscoverable

**Current State:**
- 11 configurable shortcuts
- Full customization modal
- Only accessible via `?` key

**Problem:** Users don't know shortcuts exist.

**Recommendation:** Add keyboard icon to header or settings modal.

---

### 6. Focus Mode
**Status:** Working but undiscoverable

**Current State:**
- Hides header/sidebar for distraction-free reading
- Floating nav appears
- Only accessible via `Ctrl+.` or `f` key

**Problem:** Users don't know this mode exists.

**Recommendation:** Add toggle button in section toolbar.

---

## Improvement Recommendations

### Priority 1: Critical (Hidden Routes)

#### 1.1 Add Study Tools Section to Sidebar

Expand sidebar bottom section:

```
Current:
├─ Orðasafn
├─ Minniskort
└─ Æfingadæmi

Proposed:
NÁMSVERKFÆRI (Study Tools)
├─ Orðasafn (Glossary)
├─ Minniskort (Flashcards)
├─ Æfingadæmi (Practice)
├─ Námsmarkmið (Objectives) ← NEW
├─ Námsgreining (Analytics) ← NEW
└─ Lotukerfi (Periodic Table) ← CONDITIONAL
```

**Files to modify:**
- `src/components/layout/Sidebar.tsx`

---

#### 1.2 Add Header Icons for Key Features

Add to header right side:

```
Current: [Search] [Theme] [Settings]

Proposed: [Search] [Keyboard] [Theme] [Settings]
```

**Files to modify:**
- `src/components/layout/Header.tsx`

---

### Priority 2: Medium (Incomplete Features)

#### 2.1 Create Bookmarks Page

Create `/:bookSlug/bokamerki` route with:
- List all bookmarks grouped by chapter
- Navigate to bookmarked sections
- Remove bookmarks

**Files to create:**
- `src/components/reader/BookmarksPage.tsx`

**Files to modify:**
- `src/App.tsx` (add route)
- `src/components/layout/Sidebar.tsx` (add link)

---

#### 2.2 Add Focus Mode Toggle Button

Add to section toolbar:

```tsx
<button onClick={toggleFocusMode}>
  <Maximize2 size={16} />
  <span>Einbeitingarhamur</span>
</button>
```

**Files to modify:**
- `src/components/reader/SectionView.tsx`
- Pass `onToggleFocusMode` from BookLayout

---

### Priority 3: Enhancement (UX Polish)

#### 3.1 Add Keyboard Shortcut Hint to Settings

In SettingsModal, add section showing:
- "Flýtilyklar: Ýttu á ? til að sjá og breyta"
- Or link that opens KeyboardShortcutsModal

**Files to modify:**
- `src/components/ui/SettingsModal.tsx`

---

#### 3.2 Conditional Periodic Table Link

Only show for chemistry books:

```tsx
{book?.subject === 'chemistry' && (
  <Link to={`/${bookSlug}/lotukerfi`}>
    <Atom size={20} />
    <span>Lotukerfi</span>
  </Link>
)}
```

**Files to modify:**
- `src/components/layout/Sidebar.tsx`
- `src/config/books.ts` (add subject field)

---

## Implementation Checklist

### Immediate (High Impact, Low Effort)

- [ ] Add Analytics link to sidebar
- [ ] Add Learning Objectives link to sidebar
- [ ] Add Keyboard icon to header (opens shortcuts modal)

### Short-term (Medium Effort)

- [ ] Create BookmarksPage component
- [ ] Add Bookmarks link to sidebar
- [ ] Add Focus Mode button to section toolbar
- [ ] Conditional Periodic Table link for chemistry

### Long-term (Polish)

- [ ] Add keyboard hints throughout UI
- [ ] Add first-time user onboarding
- [ ] Add feature discovery tooltips

---

## Summary

**Discovered:** 6 features with accessibility issues
**Hidden routes:** 3 fully implemented pages with no navigation
**Incomplete:** 1 feature (bookmarks) without view/manage UI
**Undiscoverable:** 2 features only accessible via keyboard

**Estimated effort:** 2-4 hours to fix critical issues (sidebar links + header icon)

*Generated: 2026-01-04*
