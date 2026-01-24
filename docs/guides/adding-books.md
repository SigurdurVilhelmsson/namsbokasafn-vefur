# Adding a New Book

This guide explains how to add a new translated book to Námsbókasafn.

## 1. Create Content Directory

Create a directory structure under `static/content/{bookSlug}/`:

```
static/content/liffraedi/
├── toc.json              # Table of contents with attribution
├── glossary.json         # Terms and definitions (optional)
└── chapters/
    └── 01/               # Chapter directory (zero-padded number)
        ├── 1-1-section-name.md
        ├── 1-2-section-name.md
        └── images/       # Chapter-specific images
```

## 2. Create Table of Contents

Create `static/content/{bookSlug}/toc.json`:

```json
{
  "title": "Líffræði 2e",
  "attribution": {
    "originalTitle": "Biology 2e",
    "originalAuthors": "Authors from OpenStax",
    "publisher": "OpenStax",
    "originalUrl": "https://openstax.org/details/books/biology-2e",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "translator": "Translator Name",
    "translationYear": 2025,
    "modifications": "Translated to Icelandic"
  },
  "chapters": [
    {
      "number": 1,
      "title": "Inngangur að líffræði",
      "sections": [
        {
          "number": "1.1",
          "title": "Vísindi líffræðinnar",
          "file": "1-1-the-science-of-biology.md"
        },
        {
          "number": "1.2",
          "title": "Þemu í líffræði",
          "file": "1-2-themes-in-biology.md"
        },
        {
          "number": "1.3",
          "title": "Lykilhugtök",
          "file": "1-key-terms.md",
          "type": "glossary"
        }
      ]
    }
  ]
}
```

### Section Types

Sections can have optional `type` values:
- `glossary` - Key terms for the chapter
- `equations` - Key equations
- `summary` - Chapter summary
- `exercises` - Practice exercises
- `answer-key` - Answers to exercises

## 3. Write Section Content

Each section is a Markdown file with YAML frontmatter:

```markdown
---
title: Vísindi líffræðinnar
section: "1.1"
chapter: 1
objectives:
  - Skilgreina líffræði og útskýra tengsl við aðrar vísindagreinar
  - Lýsa meginþemum líffræðinnar
---

## Hvað er líffræði?

Líffræði er vísindaleg rannsókn á lífinu...

:::note
Mikilvæg athugasemd hér.
:::

:::example
### Dæmi um efnahvörf
Innihald dæmis...
:::
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Section title |
| `section` | Yes | Section number (e.g., "1.1") |
| `chapter` | Yes | Chapter number |
| `objectives` | No | Learning objectives (array) |
| `difficulty` | No | `beginner`, `intermediate`, or `advanced` |
| `keywords` | No | Search keywords (array) |
| `prerequisites` | No | Prerequisite section numbers (array) |

## 4. Create Glossary (Optional)

Create `static/content/{bookSlug}/glossary.json`:

```json
{
  "terms": [
    {
      "term": "atóm",
      "definition": "Minnsta eining frumefnis sem hefur eiginleika þess frumefnis.",
      "chapter": 2
    },
    {
      "term": "sameind",
      "definition": "Tveir eða fleiri atóm tengd með efnatengi.",
      "chapter": 2
    }
  ]
}
```

## 5. Add Images

Place chapter images in `static/content/{bookSlug}/chapters/{chapterNum}/images/`.

Reference them in markdown with relative paths:

```markdown
![Alt text](images/figure-1-1.png)
```

The content loader automatically transforms these to absolute paths.

## 6. Create Cover Image

Add an SVG cover image to `static/covers/{bookSlug}.svg`.

Existing covers can be used as templates:
- `static/covers/efnafraedi.svg`
- `static/covers/liffraedi.svg`

## 7. Test Locally

```bash
npm run dev
```

Navigate to `http://localhost:5173/{bookSlug}` to test the new book.

## 8. Sync from Content Repository

If using the two-repository workflow with `namsbokasafn-efni`:

```bash
node scripts/sync-content.js --source ../namsbokasafn-efni
```

This copies prepared content from the content repository's publication directory.
