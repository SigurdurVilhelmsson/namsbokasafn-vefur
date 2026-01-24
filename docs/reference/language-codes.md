# Language Guidelines for Efnafræðilesari

This document outlines the language policy for the Chemistry Reader (Efnafræðilesari) project to ensure consistency across development and user-facing content.

## Overview

The project uses a bilingual approach:
- **Icelandic** for user-facing content and the textbook material
- **English** for technical documentation and code

## Detailed Language Usage

### Use Icelandic For:

1. **User Interface (UI) Text**
   - Button labels, menu items, navigation
   - Form labels and placeholder text
   - Error messages and notifications shown to users
   - All text visible in the application interface
   - Example: "Minniskort", "Leitartakki", "Stillingar"

2. **User-Facing Documentation**
   - README.md sections intended for end users
   - Installation instructions for users
   - User guides and tutorials
   - Help text within the application

3. **Content/Book Material**
   - All chemistry textbook content
   - Chapter titles and section headings (in content files)
   - Glossary terms and definitions
   - Learning objectives
   - Example: Files in `static/content/`

4. **aria-label and title Attributes**
   - Accessibility labels shown to Icelandic users
   - Example: `aria-label="Opna/loka valmynd"`

### Use English For:

1. **Code Comments**
   - All inline comments explaining code logic
   - Function and component documentation comments
   - TODO comments and implementation notes
   - Example:
     ```typescript
     // Load table of contents on mount
     // Check if read
     // Apply theme on mount
     ```

2. **Technical Documentation**
   - DEVELOPMENT.md and technical specs
   - Architecture documentation
   - API documentation
   - Contributing guidelines (for developers)
   - README.md sections intended for developers

3. **Git Messages** (Optional)
   - Commit messages can be in English
   - Branch names should use English
   - Pull request descriptions can be in English

4. **Code Identifiers**
   - Variable names, function names, type names
   - File names (use kebab-case English)
   - Example: `settingsStore.ts`, `useGlossary.ts`, `flashcardGenerator.ts`

5. **Developer Communications**
   - Code review comments
   - Issue discussions (technical aspects)
   - Development planning documents

## Examples

### ✅ Correct Usage

```typescript
// Hook to manage theme and apply to document
export function useTheme() {
  const { theme, setTheme } = useSettingsStore();

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);
}
```

```tsx
<button
  onClick={() => setSearchOpen(true)}
  aria-label="Leita"
  title="Leita (Ctrl+K)"
>
  <Search size={20} />
</button>
```

### ❌ Incorrect Usage

```typescript
// Beita þema við upphaf (DON'T: Use English for code comments)
export function useTheme() {
  // ...
}
```

```tsx
<button
  aria-label="Search"  {/* DON'T: Use Icelandic for UI text */}
>
  Search
</button>
```

## Rationale

This language policy ensures:

1. **Clarity for Developers**: English comments reduce the risk of translation ambiguities affecting code quality and maintainability
2. **Accessibility for International Contributors**: English technical documentation allows developers worldwide to contribute
3. **User Experience**: Icelandic UI provides a native experience for the target audience (Icelandic chemistry students)
4. **Consistency**: Clear guidelines prevent mixed-language confusion in either domain

## When in Doubt

- If it's visible to end users → **Icelandic**
- If it's for developers/maintainers → **English**
- If it's code logic or technical → **English**
- If it's UI/UX text → **Icelandic**

## Migration

All Phase 1 and Phase 2 code was initially written with Icelandic comments and has been migrated to English. Phase 3 and onwards follow the English comment standard from the start.

## Questions?

If you're unsure which language to use in a specific context, default to:
- English for anything code-related
- Icelandic for anything user-facing

This ensures code maintainability while preserving the Icelandic user experience.
