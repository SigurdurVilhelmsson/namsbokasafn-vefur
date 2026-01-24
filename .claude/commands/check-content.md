---
name: check-content
description: Validate book content files for correctness
arguments:
  - name: book
    description: Book slug to check (e.g., "efnafraedi"). Omit to check all books.
    required: false
---

# Check Content Command

Validate book content files for structural correctness and consistency.

## Checks to Perform

### 1. Directory Structure
For each book in `static/content/`:
- [ ] Has `toc.json`
- [ ] Has `glossary.json` (can be empty `{"terms": []}`)
- [ ] Has `chapters/` directory

### 2. TOC Validation
Parse each `toc.json` and verify:
- [ ] Valid JSON syntax
- [ ] Has required fields: `title`, `chapters`
- [ ] Has `attribution` object with license info
- [ ] Each chapter has: `number`, `title`, `sections`
- [ ] Each section has: `number`, `title`, `file`

### 3. File Existence
For each section in toc.json:
- [ ] Referenced markdown file exists in `chapters/{chapterNum}/`
- [ ] Chapter directory uses zero-padded numbers (01, 02, etc.)

### 4. Frontmatter Validation
For each markdown file:
- [ ] Has YAML frontmatter between `---` markers
- [ ] Has required fields: `title`, `section`, `chapter`
- [ ] `section` matches toc.json entry
- [ ] `chapter` is correct number

### 5. Image References
For each markdown file:
- [ ] Image references use relative paths (`images/...`)
- [ ] Referenced images exist in chapter's `images/` directory

### 6. Glossary Validation
Parse `glossary.json`:
- [ ] Valid JSON syntax
- [ ] Has `terms` array
- [ ] Each term has: `term`, `definition`
- [ ] Optional: `chapter` field for filtering

## Output Format

```
Checking: efnafraedi
  ✓ toc.json valid
  ✓ glossary.json valid
  ✓ 4 chapters found

  Chapter 01:
    ✓ 1-1-chemistry-in-context.md
    ✓ 1-2-phases-and-classification-of-matter.md
    ✗ 1-3-missing-section.md - FILE NOT FOUND

  Chapter 02:
    ✓ All 12 sections valid

  Images:
    ✓ 24 images referenced, all found
    ⚠ 3 unused images in chapters/01/images/

Summary: 1 error, 1 warning
```

## Common Issues

1. **File not found**: Section listed in toc.json but markdown file missing
2. **Frontmatter mismatch**: Section number in file doesn't match toc.json
3. **Missing images**: Markdown references image that doesn't exist
4. **Invalid JSON**: Syntax error in toc.json or glossary.json
5. **Orphaned images**: Images in directory not referenced by any file
