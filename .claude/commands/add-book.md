---
name: add-book
description: Scaffold a new book in the content directory
arguments:
  - name: slug
    description: URL slug for the book (e.g., "liffraedi")
    required: true
  - name: title
    description: Display title in Icelandic (e.g., "Líffræði")
    required: true
---

# Add Book Command

Scaffold directory structure and template files for a new translated book.

## Steps

1. **Create content directory**
   ```
   public/content/$ARGUMENTS.slug/
   ├── toc.json
   ├── glossary.json
   └── chapters/
       └── 01/
           └── 1-1-introduction.md
   ```

2. **Create toc.json template**
   ```json
   {
     "title": "$ARGUMENTS.title",
     "attribution": {
       "originalTitle": "Original English Title",
       "originalAuthors": "Author Names",
       "publisher": "OpenStax",
       "originalUrl": "https://openstax.org/details/books/...",
       "license": "CC BY 4.0",
       "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
       "translator": "Translator Name",
       "translationYear": 2025,
       "modifications": "Translated to Icelandic"
     },
     "chapters": [
       {
         "number": 1,
         "title": "Inngangur",
         "sections": [
           {"number": "1.1", "title": "First Section", "file": "1-1-introduction.md"}
         ]
       }
     ]
   }
   ```

3. **Create glossary.json template**
   ```json
   {
     "terms": []
   }
   ```

4. **Create sample section file** at `chapters/01/1-1-introduction.md`
   ```markdown
   ---
   title: First Section Title
   section: "1.1"
   chapter: 1
   objectives:
     - Learning objective 1
     - Learning objective 2
   ---

   Section content goes here.
   ```

5. **Create cover image placeholder**
   - Note: Add SVG cover to `public/covers/$ARGUMENTS.slug.svg`

6. **Update README.md**
   - Add row to "Tiltækar bækur" table with status "Væntanlegt"

## After Running

1. Fill in actual attribution details in toc.json
2. Create proper cover image
3. Begin translating chapters
4. Use `/tag-chapter` to apply proper markdown tags

## Reference

See `docs/guides/adding-books.md` for detailed documentation.
