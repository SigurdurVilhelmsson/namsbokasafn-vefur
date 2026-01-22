# CNXML Tag Analysis for Námsbókasafn

**Analysis Date:** 2026-01-22
**Purpose:** Identify valuable CNXML tags that should be preserved in the translation pipeline

---

## Executive Summary

The OpenStax CNXML source contains rich semantic markup that could significantly enhance the educational value of the web reader. Currently, the translation pipeline loses several valuable tags and attributes. This document identifies opportunities for improvement.

---

## 1. Tags Currently Used by Web Reader

These tags/directives are already supported and working:

| CNXML Source | Pipeline Output | Web Reader Directive |
|--------------|-----------------|---------------------|
| `<note class="link-to-learning">` | `:::link-to-material` | ✅ Supported |
| `<note class="everyday-life">` | `:::chemistry-everyday` | ✅ Supported |
| `<note class="chemist-portrait">` | `:::scientist-spotlight` | ✅ Supported |
| `<note class="sciences-interconnect">` | `:::how-science-connects` | ✅ Supported |
| `<example>` | `:::example` | ✅ Supported |
| `<exercise>` with `<problem>`/`<solution>` | `:::practice-problem` with `:::answer` | ✅ Supported |
| `<md:abstract>` (learning objectives) | `:::learning-objectives` | ✅ Supported |
| `<m:math>` (MathML) | LaTeX `$...$` / `$$...$$` | ✅ Supported (KaTeX) |
| `<figure>` with `<caption>` | Markdown image + caption | ✅ Supported |
| `<table>` | Markdown table | ✅ Supported |
| `<term>` with `id` | `**term**{#term-id}` | ✅ Supported (glossary linking) |
| `<link target-id>` | `[text](#id)` | ✅ Supported |
| `<link url>` | `[text](url)` | ✅ Supported |
| `<emphasis effect="bold">` | `**text**` | ✅ Supported |
| `<sub>`, `<sup>` | `~sub~`, `^sup^` | ✅ Supported |

---

## 2. Valuable Tags NOT Currently Preserved

### 2.1 High Priority - Direct Educational Value

#### **Image Alt Text** (`alt` attribute on `<media>`)
- **Current Status:** LOST in pipeline
- **Impact:** Critical for accessibility (screen readers)
- **CNXML:** `<media alt="Diagram showing electron configuration...">`
- **Recommendation:** Extract and preserve as markdown image alt text
- **Web Reader Benefit:** Accessibility compliance, SEO, image search

#### **Glossary Definitions** (`<glossary>`, `<definition>`, `<meaning>`)
- **Current Status:** Partially preserved (separate glossary.json)
- **Impact:** Could enable inline term tooltips
- **CNXML Structure:**
  ```xml
  <glossary>
    <definition id="fs-id1">
      <term>accuracy</term>
      <meaning>how closely a measurement aligns with a correct value</meaning>
    </definition>
  </glossary>
  ```
- **Recommendation:** Link term IDs to glossary definitions for hover tooltips
- **Web Reader Benefit:** Inline term definitions without navigation

#### **Equation IDs and Classes** (`id`, `class` on `<equation>`)
- **Current Status:** LOST
- **Impact:** Cannot reference specific equations
- **CNXML:** `<equation id="eq-ideal-gas" class="key-equation">`
- **Recommendation:** Preserve equation IDs for cross-references
- **Web Reader Benefit:** Enable `[ref:eq:ideal-gas]` cross-references, "Key Equations" filtering

#### **Figure IDs** (`id` on `<figure>`)
- **Current Status:** Partially preserved
- **Impact:** Cross-reference support
- **CNXML:** `<figure id="CNX_Chem_01_01_SciMethod">`
- **Recommendation:** Ensure consistent ID preservation
- **Web Reader Benefit:** Enable figure cross-references with previews

### 2.2 Medium Priority - Enhanced Learning Features

#### **Document Cross-References** (`<link document="m68807">`)
- **Current Status:** Converted but often broken
- **Impact:** Inter-chapter navigation
- **CNXML:** `<link document="m68807">See Chapter 3</link>`
- **Recommendation:** Build module-to-route mapping table
- **Web Reader Benefit:** Working cross-chapter links

#### **Footnotes** (`<footnote>`)
- **Current Status:** Converted to inline italic text
- **Impact:** Supplementary information display
- **CNXML:** `<footnote id="fn1">Additional context here</footnote>`
- **Recommendation:** Convert to proper footnote/sidenote UI
- **Web Reader Benefit:** Non-intrusive supplementary content

#### **Table Metadata** (`summary`, `id` on `<table>`)
- **Current Status:** LOST
- **CNXML:** `<table id="tbl-periodic" summary="Periodic table of elements">`
- **Recommendation:** Preserve for accessibility and references
- **Web Reader Benefit:** Table cross-references, screen reader descriptions

#### **List Type and Numbering** (`list-type`, `number-style` on `<list>`)
- **Current Status:** Partially preserved (bulleted vs numbered)
- **CNXML:** `<list list-type="enumerated" number-style="lower-alpha">`
- **Recommendation:** Preserve numbering style (a, b, c vs 1, 2, 3)
- **Web Reader Benefit:** Proper lettered lists for multi-part problems

### 2.3 Lower Priority - Nice to Have

#### **Emphasis Effects** (`effect` attribute on `<emphasis>`)
- **Current Status:** All converted to bold
- **CNXML:** `effect="italics"`, `effect="underline"`, `effect="bold"`
- **Recommendation:** Preserve italics separately from bold
- **Web Reader Benefit:** Proper typography (book titles, scientific names)

#### **Figure Classes** (`class` on `<figure>`)
- **Current Status:** LOST
- **CNXML:** `class="splash"`, `class="scaled-down"`, `class="scaled-down-30"`
- **Recommendation:** Preserve for layout hints
- **Web Reader Benefit:** Hero images, thumbnail sizing

#### **Table Cell Alignment** (`align` on `<entry>`)
- **Current Status:** LOST (defaults to left)
- **CNXML:** `align="center"`, `align="right"`
- **Recommendation:** Convert to markdown table alignment syntax
- **Web Reader Benefit:** Proper number alignment in data tables

#### **Math Strike-through** (`<m:menclose notation="horizontalstrike">`)
- **Current Status:** May be lost in LaTeX conversion
- **CNXML:** Used for showing cancellation in chemistry calculations
- **Recommendation:** Verify LaTeX `\cancel{}` is generated
- **Web Reader Benefit:** Proper cancellation display in stoichiometry

---

## 3. Metadata Fields to Preserve

### Currently Preserved
| Field | Source | Preserved As |
|-------|--------|--------------|
| Title | `<md:title>` | YAML `title:` |
| Created | `<md:created>` | YAML `created:` |
| Revised | `<md:revised>` | YAML `revised:` |
| License | `<md:license>` | YAML `license_url:` |
| Keywords | `<md:keyword>` | YAML `keywords:` |
| Subjects | `<md:subject>` | YAML `subjects:` |
| Module ID | `<md:content-id>` | YAML `module:` |

### Should Be Preserved (Currently Lost)
| Field | Source | Recommended Action |
|-------|--------|-------------------|
| UUID | `<md:uuid>` | Add to YAML for content tracking |
| Abstract | `<md:abstract>` | Already used for learning objectives |

---

## 4. Note Classes Mapping

### Currently Mapped
| CNXML Class | Directive | Count in Source |
|-------------|-----------|-----------------|
| `link-to-learning` | `:::link-to-material` | 95 instances |
| `everyday-life` | `:::chemistry-everyday` | 44 instances |
| `sciences-interconnect` | `:::how-science-connects` | 19 instances |
| `chemist-portrait` | `:::scientist-spotlight` | 9 instances |

### Not Currently Mapped (Should Add)
| CNXML Class | Suggested Directive | Purpose |
|-------------|--------------------| --------|
| `summary` | `:::summary` | Section/chapter summaries |
| `key-equations` | `:::key-equations` | Important equation collections |
| `emphasis-one` | `:::highlight` | Single-emphasis callouts |
| Generic `<note>` | `:::note` | General notes (already supported) |

---

## 5. Cross-Reference System Enhancement

### Current State
The web reader has a cross-reference system (`[ref:TYPE:ID]`) but it's not fully connected to source IDs.

### Recommended Pipeline Changes

1. **Preserve Element IDs:**
   ```markdown
   <!-- Current -->
   ![](image.jpg)
   *Figure 1.3: Caption*

   <!-- Recommended -->
   ![](image.jpg){#fig-CNX_Chem_01_03_Atoms}
   *Figure 1.3: Caption*{#fig-CNX_Chem_01_03_Atoms}
   ```

2. **Build Reference Index:**
   During conversion, create a `references.json` mapping:
   ```json
   {
     "CNX_Chem_01_03_Atoms": {
       "type": "figure",
       "number": "1.3",
       "title": "Atomic structure diagram",
       "chapter": 1,
       "section": "1.3"
     }
   }
   ```

3. **Enable Cross-References:**
   Convert `<link target-id="CNX_Chem_01_03_Atoms">Figure 1.3</link>` to `[ref:fig:CNX_Chem_01_03_Atoms]`

---

## 6. Implementation Priority

### Phase 1: Accessibility & Core Features
1. **Alt text preservation** - Critical for accessibility
2. **Equation IDs** - Enable equation cross-references
3. **Figure IDs** - Enable figure cross-references
4. **Emphasis types** - Restore italics vs bold distinction

### Phase 2: Enhanced Navigation
5. **Document cross-references** - Module-to-route mapping
6. **Glossary term linking** - Inline definitions
7. **Table IDs and summaries** - Accessibility + references

### Phase 3: Polish
8. **List numbering styles** - Lettered lists
9. **Figure classes** - Layout hints
10. **Table alignment** - Data table formatting
11. **Footnotes** - Sidenote UI

---

## 7. Pipeline Modification Checklist

### cnxml-to-md.js Changes Needed

- [ ] Extract `alt` attribute from `<media>` elements
- [ ] Preserve `id` attribute on `<equation>` elements
- [ ] Preserve `id` attribute on `<figure>` elements
- [ ] Preserve `id` attribute on `<table>` elements
- [ ] Map `effect="italics"` to `*text*` (not `**text**`)
- [ ] Preserve `list-type` and `number-style` attributes
- [ ] Extract `summary` attribute from tables
- [ ] Build reference index during conversion
- [ ] Map additional note classes (`summary`, `key-equations`)

### Web Reader Changes Needed

- [ ] Add `:::summary` directive styling
- [ ] Add `:::key-equations` directive styling
- [ ] Implement glossary term hover tooltips
- [ ] Support lettered lists (a, b, c)
- [ ] Add footnote/sidenote component
- [ ] Connect cross-reference system to preserved IDs

---

## 8. Sample Enhanced Output

### Current Pipeline Output
```markdown
![](CNX_Chem_01_03_Atoms.jpg)

*Figure 1.3: Atomic structure showing protons, neutrons, and electrons.*

The **atom** is the basic unit of matter.
```

### Recommended Enhanced Output
```markdown
![Atomic structure showing protons, neutrons, and electrons](CNX_Chem_01_03_Atoms.jpg){#fig-CNX_Chem_01_03_Atoms}

*Figure 1.3: Atomic structure showing protons, neutrons, and electrons.*{#fig-CNX_Chem_01_03_Atoms}

The *atom*{#term-00001} is the basic unit of matter.

<!-- With reference index entry -->
<!-- fig-CNX_Chem_01_03_Atoms: { type: "figure", number: "1.3", title: "Atomic structure..." } -->
```

---

## Appendix: Complete CNXML Tag Inventory

### All 56 Unique Tags Found in Source

**Document Structure:** `document`, `content`, `metadata`, `title`, `section`

**Text Content:** `para`, `emphasis`, `sub`, `sup`, `newline`, `term`, `link`, `footnote`

**Lists:** `list`, `item`, `label`

**Educational Blocks:** `note`, `example`, `exercise`, `problem`, `solution`

**Glossary:** `glossary`, `definition`, `meaning`

**Figures & Media:** `figure`, `media`, `image`, `caption`

**Tables:** `table`, `tgroup`, `colspec`, `thead`, `tbody`, `row`, `entry`

**Equations:** `equation`

**MathML (m: namespace):** `m:math`, `m:mrow`, `m:mi`, `m:mn`, `m:mo`, `m:mtext`, `m:msub`, `m:msup`, `m:mfrac`, `m:msqrt`, `m:mspace`, `m:mover`, `m:menclose`, `m:mtable`, `m:mtr`, `m:mtd`

**Metadata (md: namespace):** `md:content-id`, `md:title`, `md:abstract`, `md:uuid`, `md:created`, `md:revised`, `md:license`, `md:keyword`, `md:subject`
