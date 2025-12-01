# Chemistry Reader - Markdown Formatting Guide

This guide shows all the markdown features supported by the Chemistry Reader application.

---

## 📄 File Structure

Every content file must start with **frontmatter** (YAML metadata):

```markdown
---
title: "Section Title"
section: "1.3"
chapter: 1
objectives:
  - First learning objective
  - Second learning objective
  - Third learning objective
---
```

The `objectives` list will be displayed in a special card at the top of the section with emerald checkmark icons.

---

## 📝 Basic Text Formatting

### Headings

```markdown
# Main Chapter Title (H1)
## Major Section (H2)
### Subsection (H3)
#### Minor Heading (H4)
```

**Styling:**
- H1-H4: Serif font (Lora), bold
- H1: 3xl-4xl size
- H2: 2xl size with extra top margin
- H3-H4: Progressively smaller

### Text Styles

```markdown
**Bold text** for emphasis
*Italic text* for emphasis
`inline code` for chemical formulas or code
```

### Lists

**Unordered lists:**
```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

**Ordered lists:**
```markdown
1. First step
2. Second step
3. Third step
```

---

## 🧪 Math & Chemical Equations

The reader uses **KaTeX** for rendering mathematical and chemical equations.

### Inline Math

Use single `$` for inline equations:

```markdown
The formula for water is $\text{H}_2\text{O}$ and its molar mass is $18.015\text{ g/mol}$.
```

Renders: The formula for water is H₂O and its molar mass is 18.015 g/mol.

### Block Math (Display Mode)

Use double `$$` for centered equations:

```markdown
$$
\text{Fe}_2\text{O}_3 + 3\text{CO} \rightarrow 2\text{Fe} + 3\text{CO}_2
$$
```

### Common Chemical Notation

```markdown
- Subscripts: $\text{H}_2\text{O}$
- Superscripts: $\text{Fe}^{3+}$
- Arrows: $\rightarrow$ (forward), $\leftarrow$ (back), $\leftrightarrow$ (equilibrium)
- Greek letters: $\alpha$, $\beta$, $\gamma$, $\Delta$ (delta for change)
- Fractions: $\frac{numerator}{denominator}$
```

### Example Equations

```markdown
**Photosynthesis:**
$$
6\text{CO}_2 + 6\text{H}_2\text{O} + \text{light energy} \rightarrow \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2
$$

**pH calculation:**
$$
\text{pH} = -\log[\text{H}^+]
$$

**Ideal gas law:**
$$
PV = nRT
$$
```

---

## 📊 Tables

Tables are rendered as modern cards with no internal borders.

### Basic Table Syntax

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1A   | Row 1B   | Row 1C   |
| Row 2A   | Row 2B   | Row 2C   |
```

### Example with Chemistry Data

```markdown
| Element | Symbol | Atomic Mass |
|---------|--------|-------------|
| Hydrogen | H | 1.008 |
| Carbon | C | 12.011 |
| Oxygen | O | 15.999 |
```

**Styling:**
- Header row: Gray background with uppercase text
- Rows: Subtle divider lines, hover effect
- Rounded corners with subtle shadow
- Respects font size settings

---

## 💡 Callout Blocks (Special Boxes)

The reader supports three types of callout blocks for highlighting important information.

### Note Block (Blue)

Use `:::note` for information, tips, or important concepts:

```markdown
:::note
This is an important note that students should pay attention to.
It will be displayed in a blue box with an info icon.
:::
```

**Renders as:** Blue card with info (ⓘ) icon and "Athugið" title

### Warning Block (Amber)

Use `:::warning` for cautions, common mistakes, or safety information:

```markdown
:::warning
Be careful! This reaction is highly exothermic and requires proper safety equipment.
:::
```

**Renders as:** Amber card with warning (⚠️) icon and "Viðvörun" title

### Example Block (Gray)

Use `:::example` for worked examples or demonstrations:

```markdown
:::example
**Example 1.3.1: Calculating Molar Mass**

To find the molar mass of H₂O:
- H: 2 × 1.008 = 2.016 g/mol
- O: 1 × 15.999 = 15.999 g/mol
- Total: 18.015 g/mol
:::
```

**Renders as:** Gray card with lightbulb (💡) icon and "Dæmi" title

### Multi-paragraph Callouts

You can include multiple paragraphs, lists, and even equations:

```markdown
:::note
**Important Concept: Avogadro's Number**

Avogadro's number is $6.022 \times 10^{23}$ and represents:
- The number of atoms in 12 grams of carbon-12
- The number of molecules in one mole of any substance
- A fundamental constant in chemistry

Use it to convert between moles and particles:
$$
N = n \times N_A
$$
:::
```

---

## 🖼️ Images

Images are automatically wrapped in a `<figure>` element with captions.

### Basic Image Syntax

```markdown
![Alt text describing the image](/path/to/image.png)
```

### With Caption

The `alt` text becomes a caption below the image:

```markdown
![Periodic table showing the first 20 elements with atomic numbers and symbols](./images/periodic-table.png)
```

**Features:**
- Automatically centered
- Rounded corners with shadow
- Lazy loading for performance
- Alt text displayed as italic caption below

### Image Paths

Images should be placed in:
```
/public/content/chapters/{chapter-slug}/images/
```

Then reference them as:
```markdown
![Description](./images/filename.png)
```

---

## 🔗 Links

### External Links

External links (starting with `http://` or `https://`) automatically open in new tabs:

```markdown
See the [OpenStax Chemistry textbook](https://openstax.org/details/books/chemistry-2e) for more information.
```

### Internal Links

Internal links stay in the same tab:

```markdown
See [Section 1.2](../01-grunnhugmyndir/1-2-fasar-efna.md) for more on phases of matter.
```

---

## 📋 Complete Example

Here's a complete section showing various features:

```markdown
---
title: "Stoichiometry Basics"
section: "3.1"
chapter: 3
objectives:
  - Calculate molar masses from chemical formulas
  - Convert between moles and grams
  - Balance chemical equations using coefficients
---

# Stoichiometry Basics

**Stoichiometry** is the quantitative study of reactants and products in chemical reactions. The word comes from Greek: *stoicheion* (element) and *metron* (measure).

## Molar Mass

The **molar mass** of a substance is the mass of one mole of that substance, expressed in grams per mole ($\text{g/mol}$).

### Calculating Molar Mass

| Element | Symbol | Atomic Mass | Atoms | Total |
|---------|--------|-------------|-------|-------|
| Carbon | C | 12.011 | 1 | 12.011 |
| Hydrogen | H | 1.008 | 4 | 4.032 |
| Total | | | | **16.043 g/mol** |

:::note
The molar mass is numerically equal to the atomic/molecular weight but has units of g/mol instead of amu.
:::

## Example Problem

:::example
**Example 3.1.1: Converting Moles to Grams**

How many grams are in 2.5 moles of methane ($\text{CH}_4$)?

**Solution:**
1. Molar mass of $\text{CH}_4 = 16.043\text{ g/mol}$
2. Use the conversion formula:
   $$
   \text{mass} = \text{moles} \times \text{molar mass}
   $$
3. Calculate:
   $$
   \text{mass} = 2.5\text{ mol} \times 16.043\text{ g/mol} = 40.1\text{ g}
   $$

**Answer:** 40.1 grams of methane
:::

## Balancing Equations

:::warning
Always balance equations by adjusting coefficients (numbers in front), never by changing subscripts (numbers in formulas)!
:::

Unbalanced equation:
$$
\text{H}_2 + \text{O}_2 \rightarrow \text{H}_2\text{O}
$$

Balanced equation:
$$
2\text{H}_2 + \text{O}_2 \rightarrow 2\text{H}_2\text{O}
$$

![Molecular representation of water formation showing 2 hydrogen molecules reacting with 1 oxygen molecule](./images/water-formation.png)
```

---

## 🚫 Currently NOT Supported

These markdown features are **not currently supported** but could be added:

### 1. Hide/Reveal Sections (Spoilers)

Standard HTML `<details>` tags don't work yet. If you need this feature, let me know!

### 2. Task Lists

```markdown
- [ ] Incomplete task
- [x] Complete task
```

### 3. Footnotes

```markdown
Here's a sentence with a footnote[^1].

[^1]: This is the footnote content.
```

### 4. Definition Lists

### 5. Strikethrough

`~~strikethrough~~` doesn't render (though `remarkGfm` supports it)

---

## 💡 Best Practices

### 1. **Use Semantic Headings**
- One H1 per file (main title)
- Use H2 for major sections
- Use H3 for subsections
- Keep hierarchy consistent

### 2. **Write Clear Alt Text**
- Describe what's in the image
- Alt text becomes the caption
- Be descriptive for accessibility

### 3. **Use Callout Blocks Strategically**
- **Note** for important concepts
- **Warning** for common mistakes or safety
- **Example** for worked problems

### 4. **Format Equations Properly**
- Use `\text{}` for text in equations: `$\text{H}_2\text{O}$`
- Use subscripts/superscripts correctly
- Display complex equations in block mode ($$)

### 5. **Keep Tables Readable**
- Use clear column headers
- Keep cells concise
- Consider splitting very wide tables

### 6. **Test Your Content**
- Preview in the reader app
- Check on mobile devices
- Test all interactive elements

---

## 🔧 Need New Features?

If you need additional markdown features like:
- Hide/reveal answer sections
- Interactive quizzes
- Video embeds
- Diagram annotations
- Custom callout types

Let me know and I can extend the MarkdownRenderer component!
