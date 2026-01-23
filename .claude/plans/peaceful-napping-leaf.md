# Plan: Fix Content Rendering Issues

## Summary of Issues Found

Multiple rendering issues stem from both **content problems** (in namsbokasafn-efni) and **web-reader limitations** (in this repo).

---

## PART 1: Content Issues (Fix in namsbokasafn-efni)

### 1.1 Unknown Directive `:::æfingadæmi`
**Impact**: Tags showing raw in text
**Scope**: 46 occurrences across 4 files:
- `1-exercises.md` (23)
- `1-6-mathematical-treatment-of-measurement-results.md` (11)
- `1-5-measurement-uncertainty-accuracy-and-precision.md` (10)
- `1-4-measurements.md` (2)

**Fix**: Replace `:::æfingadæmi{#id}` with `:::practice-problem{#id}` in all files

### 1.2 Escaped Brackets Breaking Links
**Impact**: Links showing as literal text `\[text\](url)`
**Scope**: 34 occurrences across 6 files

**Examples from content**:
```markdown
# BROKEN:
\[síðu\](http://openstax.org/l/16notation)
\[↗\](#fs-idm81346144)
\viðauka B\

# SHOULD BE:
[síðu](http://openstax.org/l/16notation)
[↗](#fs-idm81346144)
viðauka B
```

**Fix**: Remove backslash escaping from all link brackets

### 1.3 Orphaned `:::svar` Directives
**Impact**: Answers appearing at wrong level, inconsistent visibility
**Scope**: 15 occurrences in `1-exercises.md`

The exercises file has `:::svar` blocks at the document root level instead of nested inside `:::practice-problem` containers.

**Current structure (broken)**:
```markdown
**5.**
Problem text...

:::svar
Answer text
:::
```

**Required structure**:
```markdown
:::practice-problem{#ex-5}
**5.**
Problem text...

:::answer
Answer text
:::
:::
```

### 1.4 Problem Duplication
**Impact**: Same problems appearing twice
**Cause**: Problems exist in both section files (e.g., `1-1-chemistry-in-context.md`) AND the exercises chapter (`1-exercises.md`)

**Example**: Problems at end of section 1.1 (lines 256-363) are duplicated in exercises chapter.

**Decision needed**: Keep problems in one location only:
- Option A: Section files only (remove from exercises chapter)
- Option B: Exercises chapter only (remove from section files)
- Option C: Different problems in each location

---

## PART 2: Web-Reader Fixes (Fix in namsbokasafn-vefur)

### 2.1 Add `æfingadæmi` Directive Support (Quick Fix)
**File**: `src/lib/utils/markdown.ts`

Add alias for the Icelandic directive name:
```typescript
// In DIRECTIVE_CONFIG (around line 58):
'æfingadæmi': {
    className: 'practice-problem-container',
    additionalProps: (attrs) => ({ 'data-problem-id': attrs.id || undefined })
},
```

This provides immediate compatibility while content is being fixed.

### 2.2 Handle Escaped Link Syntax (Optional Fallback)
If content can't be fixed immediately, add preprocessing to unescape common patterns:
- `\[` → `[`
- `\]` → `]`

**File**: `src/lib/utils/markdown.ts`, add preprocessing step before `remarkParse`

### 2.3 Cross-Reference Navigation Fix
**File**: `src/lib/actions/crossReferences.ts` (around line 202-214)

Change from `window.location.href` to SvelteKit's `goto()` for client-side navigation.

---

## Implementation Order

### Phase 1: Quick fixes in web-reader (immediate relief)
1. Add `æfingadæmi` alias to DIRECTIVE_CONFIG
2. Add preprocessing to unescape `\[` and `\]`

### Phase 2: Content fixes in namsbokasafn-efni
1. Replace all `:::æfingadæmi` with `:::practice-problem`
2. Remove backslash escaping from links
3. Restructure exercises file:
   - Wrap each problem with `:::practice-problem{#id}`
   - Nest `:::svar` inside as `:::answer`
4. Decide on problem duplication strategy

### Phase 3: Code quality improvements
1. Fix cross-reference navigation to use client-side routing
2. Add validation/warnings for orphaned directives
3. Consider adding directive name normalization (auto-map Icelandic names)

---

## Verification

1. Run dev server: `npm run dev`
2. Navigate to Chapter 1 sections and exercises
3. Verify:
   - No raw `:::directive` tags visible
   - All links are clickable
   - Practice problems show/hide answers correctly
   - No duplicate problems in section + exercises views
   - Cross-references navigate without full page reload

---

## Files to Modify

### Web-reader (this repo):
- `src/lib/utils/markdown.ts` - Add directive alias and preprocessing
- `src/lib/actions/crossReferences.ts` - Fix navigation

### Content repo (namsbokasafn-efni):
- `books/*/05-publication/mt-preview/chapters/01/*.md` - All chapter 1 files
