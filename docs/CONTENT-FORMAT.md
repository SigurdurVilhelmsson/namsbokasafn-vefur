# Content Format Specification

This document describes the data formats and content structure used in Námsbókasafn.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Table of Contents (toc.json)](#table-of-contents-tocjson)
3. [Glossary (glossary.json)](#glossary-glossaryjson)
4. [Section Content (Markdown)](#section-content-markdown)
5. [Images and Media](#images-and-media)

---

## Directory Structure

Each book has a dedicated directory under `/public/content/`:

```
public/content/{bookSlug}/
├── toc.json                    # Table of contents
├── glossary.json               # Vocabulary terms
└── chapters/
    ├── 01-chapter-slug/        # Chapter directory
    │   ├── 1-1-section.md      # Section content
    │   ├── 1-2-section.md
    │   └── images/             # Chapter images
    │       ├── figure-1-1.png
    │       └── figure-1-2.svg
    ├── 02-chapter-slug/
    │   ├── 2-1-section.md
    │   └── images/
    └── ...
```

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Chapter directories | `{number}-{slug}` | `01-grunnhugmyndir` |
| Section files | `{chapter}-{section}-{slug}.md` | `1-1-efnafraedi.md` |
| Image files | `figure-{chapter}-{number}.{ext}` | `figure-1-3.png` |

---

## Table of Contents (toc.json)

The table of contents defines the book structure and navigation.

### Schema

```typescript
interface TableOfContents {
  title: string;                    // Book title
  attribution?: SourceAttribution;  // CC BY 4.0 attribution info
  chapters: Chapter[];              // Ordered list of chapters
}

interface SourceAttribution {
  original: string;       // Original work title
  authors: string;        // Author names (comma-separated)
  license: string;        // License name
  licenseUrl: string;     // URL to license text
  originalUrl: string;    // URL to original work
  translator: string;     // Translator name
  translationYear: number;
  modifications: string;  // Description of adaptations
}

interface Chapter {
  number: number;         // Chapter number (1, 2, 3...)
  title: string;          // Chapter title
  slug: string;           // URL-safe identifier
  sections: Section[];    // Ordered list of sections
}

interface Section {
  number: string;   // Section number ("1.1", "1.2")
  title: string;    // Section title
  slug: string;     // URL-safe identifier
  file: string;     // Filename in chapters directory
}
```

### Example

```json
{
  "title": "Efnafræði",
  "attribution": {
    "original": "Chemistry 2e",
    "authors": "Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "originalUrl": "https://openstax.org/details/books/chemistry-2e",
    "translator": "Sigurður E. Vilhelmsson",
    "translationYear": 2024,
    "modifications": "Translated to Icelandic with cultural adaptations for Icelandic students."
  },
  "chapters": [
    {
      "number": 1,
      "title": "Grunnhugmyndir efnafræðinnar",
      "slug": "01-grunnhugmyndir",
      "sections": [
        {
          "number": "1.1",
          "title": "Efnafræði í samhengi",
          "slug": "1-1-efnafraedi-i-samhengi",
          "file": "1-1-efnafraedi-i-samhengi.md"
        },
        {
          "number": "1.2",
          "title": "Stiklur í vísindalegri aðferð",
          "slug": "1-2-visindaadferd",
          "file": "1-2-visindaadferd.md"
        }
      ]
    },
    {
      "number": 2,
      "title": "Atóm og sameindir",
      "slug": "02-atom-og-sameindir",
      "sections": [
        {
          "number": "2.1",
          "title": "Byggingareining efnis",
          "slug": "2-1-byggingareining",
          "file": "2-1-byggingareining.md"
        }
      ]
    }
  ]
}
```

---

## Glossary (glossary.json)

The glossary contains vocabulary terms for the book.

### Schema

```typescript
interface Glossary {
  terms: GlossaryTerm[];
}

interface GlossaryTerm {
  id: string;           // Unique identifier
  term: string;         // The word/phrase
  definition: string;   // Definition in Icelandic
  englishTerm?: string; // Original English term
  chapter?: number;     // First chapter where term appears
  section?: string;     // First section reference
  tags?: string[];      // Categorization tags
}
```

### Example

```json
{
  "terms": [
    {
      "id": "efnafraedi",
      "term": "efnafræði",
      "definition": "Vísindaleg rannsókn á samsetningu, byggingu, eiginleikum og breytingum efnis.",
      "englishTerm": "chemistry",
      "chapter": 1,
      "section": "1.1",
      "tags": ["grunnhugtök"]
    },
    {
      "id": "atom",
      "term": "atóm",
      "definition": "Minnsta eining frumefnis sem heldur efnafræðilegum eiginleikum þess.",
      "englishTerm": "atom",
      "chapter": 2,
      "section": "2.1",
      "tags": ["atómbygging"]
    },
    {
      "id": "sameind",
      "term": "sameind",
      "definition": "Tveir eða fleiri atóm bundin saman með efnatengjum.",
      "englishTerm": "molecule",
      "chapter": 2,
      "section": "2.1",
      "tags": ["atómbygging", "efnatengi"]
    }
  ]
}
```

---

## Section Content (Markdown)

Section content is written in Markdown with YAML frontmatter.

### Frontmatter Schema

```yaml
---
title: string          # Section title (required)
section: string        # Section number like "1.1" (required)
chapter: number        # Chapter number (required)
objectives:            # Learning objectives (optional)
  - string
  - string
source:                # Override book attribution (optional)
  original: string
  authors: string
  # ... same as SourceAttribution
---
```

### Example Frontmatter

```yaml
---
title: "Efnafræði í samhengi"
section: "1.1"
chapter: 1
objectives:
  - Lýsa hvernig efnafræði tengist daglegu lífi
  - Útskýra muninn á efnafræði og eðlisfræði
  - Þekkja helstu greinar efnafræðinnar
---
```

### Markdown Features

#### Standard Markdown

All standard Markdown syntax is supported:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- Unordered list
- Item 2

1. Ordered list
2. Item 2

[Link text](https://example.com)

> Blockquote

`inline code`

```python
code block
```
```

#### Math Equations (KaTeX)

Inline math with single dollar signs:

```markdown
The formula $E = mc^2$ shows mass-energy equivalence.
```

Block math with double dollar signs:

```markdown
$$
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
```

#### Custom Directives

**Note Block:**
```markdown
::: note
Important information for students.
:::
```

**Warning Block:**
```markdown
::: warning
Common mistake to avoid.
:::
```

**Example Block:**
```markdown
::: example
Worked example with step-by-step solution.
:::
```

**Tip Block:**
```markdown
::: tip
Helpful hint or study suggestion.
:::
```

#### Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

#### Images

```markdown
![Alt text for accessibility](images/figure-1-1.png)

*Figure 1.1: Caption text below image*
```

Images should be placed in the `images/` subdirectory of the chapter.

### Complete Section Example

```markdown
---
title: "Efnafræði í samhengi"
section: "1.1"
chapter: 1
objectives:
  - Lýsa hvernig efnafræði tengist daglegu lífi
  - Útskýra vísindalega aðferð
---

# Efnafræði í samhengi

Efnafræði er vísindaleg rannsókn á efni og breytingum þess. Við notum efnafræði á hverjum degi án þess að gera okkur grein fyrir því.

## Efnafræði í daglegu lífi

Þegar þú eldar morgunverð, notar þú efnafræðilegar umbreytingar:

::: example
**Dæmi: Að steikja egg**

Þegar egg er steikt verður hvítan ógegnsæ og fast. Þetta er vegna þess að hiti veldur umbreytingu á próteinum í eggjahvítunni.
:::

Hitinn breytir formgerð próteinanna í ferlinu sem kallast *denaturering*.

## Stærðfræði í efnafræði

Efnafræðingar nota stærðfræði til að lýsa efnahvörfum. Massavarðveislulögmálið segir:

$$
m_{hvarfefni} = m_{myndefni}
$$

þar sem $m$ táknar massa.

::: note
Munið að massi getur ekki myndast né horfið í efnahvörfum.
:::

## Helstu greinar efnafræðinnar

| Grein | Viðfangsefni |
|-------|--------------|
| Lífefnafræði | Efni í lífverum |
| Lífrænefnafræði | Kolefnissambönd |
| Ólífræn efnafræði | Önnur frumefni |

![Periodic table](images/figure-1-1.png)

*Mynd 1.1: Lotukerfið sýnir öll þekkt frumefni.*

::: warning
Ekki rugla saman eðlisbreytingum og efnabreytingum. Eðlisbreytingar breyta ekki efnasamsetningu.
:::
```

---

## Images and Media

### Supported Formats

| Format | Use Case |
|--------|----------|
| PNG | Screenshots, diagrams with transparency |
| SVG | Vector graphics, diagrams, icons |
| JPG | Photographs |
| WebP | Optimized web images |
| GIF | Simple animations |

### Image Guidelines

1. **Resolution**: 2x for retina displays (e.g., 1440px for 720px display width)
2. **File size**: Optimize to under 200KB per image
3. **Alt text**: Always include descriptive alt text for accessibility
4. **Naming**: Use descriptive, kebab-case names: `figure-1-3-water-molecule.png`

### Directory Structure

```
chapters/01-chapter/
└── images/
    ├── figure-1-1.png
    ├── figure-1-2.svg
    └── table-1-1.png
```

### Referencing Images in Markdown

Use relative paths from the section file:

```markdown
![Water molecule structure](images/figure-1-1.png)
```

The content loader automatically transforms these to absolute paths.

---

## Validation

### Required Files

Each book must have:
- [ ] `toc.json` - Valid JSON matching schema
- [ ] At least one chapter directory
- [ ] At least one section file per chapter
- [ ] Cover image in `/public/covers/`

### Section File Requirements

Each section file must have:
- [ ] Valid YAML frontmatter
- [ ] `title` field
- [ ] `section` field
- [ ] `chapter` field
- [ ] At least one heading in content

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Gat ekki hlaðið efnisyfirliti" | Invalid JSON in toc.json | Check JSON syntax |
| "Gat ekki hlaðið kafla" | Missing section file | Verify file path matches toc.json |
| Missing frontmatter | No `---` delimiters | Add frontmatter block |
| Image not loading | Wrong path | Use `images/` relative path |

---

## Content Checklist

When adding new content:

- [ ] Add chapter to `toc.json`
- [ ] Create chapter directory with correct naming
- [ ] Create section files with frontmatter
- [ ] Add learning objectives
- [ ] Include images in `images/` subdirectory
- [ ] Add new terms to `glossary.json`
- [ ] Test markdown rendering locally
- [ ] Verify all images load
- [ ] Check math equations render correctly
- [ ] Test navigation (prev/next links)
