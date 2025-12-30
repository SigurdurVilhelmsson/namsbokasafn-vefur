# Chemistry Reader - Markdown Formatting Guide

This guide shows all the markdown features supported by the Chemistry Reader application.

**🎨 Jump to:** [Frontmatter](#-file-structure) | [Basic Formatting](#-basic-text-formatting) | [Math & Chemistry](#-math--chemical-equations) | [Callouts](#-callout-blocks-special-boxes) | [Educational Blocks](#-educational-directive-blocks) | [Cross-References](#-cross-references) | [Future Ideas](#-future-possibilities-the-ultimate-chemistry-textbook)

---

## ✅ Currently Implemented Features

These features are **ready to use right now** in your markdown files.

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
difficulty: intermediate
keywords:
  - efnafræði
  - sýru-basa
  - pH-gildi
prerequisites:
  - Basic algebra
  - Understanding of atoms
---
```

### Required Fields

| Field | Description |
|-------|-------------|
| `title` | Section title displayed in header |
| `section` | Section number (e.g., "1.3") |
| `chapter` | Chapter number (integer) |

### Optional Fields

| Field | Description |
|-------|-------------|
| `objectives` | Learning objectives shown in emerald card at top |
| `difficulty` | Content difficulty: `beginner`, `intermediate`, or `advanced` |
| `keywords` | Topic keywords (shown in collapsible tag list) |
| `prerequisites` | Required prior knowledge |

### Difficulty Levels

When specified, a colored indicator appears below the section actions:

- **`beginner`** (Byrjandi): Green, 1 bar - introductory content
- **`intermediate`** (Miðstig): Amber, 2 bars - requires foundational knowledge
- **`advanced`** (Framhald): Red, 3 bars - complex topics

### Reading Time

Reading time is **automatically calculated** from content length (no frontmatter needed). Uses 180 words/minute for technical content.

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

The reader uses **KaTeX** with the **mhchem extension** for rendering mathematical and chemical equations.

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

---

### ⚗️ Chemical Notation with mhchem

**mhchem** makes writing chemical formulas much easier! Use the `\ce{}` command:

#### Chemical Formulas

```markdown
- Water: $\ce{H2O}$ (automatic subscripts!)
- Sulfuric acid: $\ce{H2SO4}$
- Iron(III) oxide: $\ce{Fe2O3}$
- Ions: $\ce{Fe^3+}$, $\ce{SO4^2-}$
```

**Why mhchem?** Compare these two approaches:

```markdown
Old way: $\text{H}_2\text{O}$
mhchem:  $\ce{H2O}$          ← Much simpler!
```

#### States of Matter

```markdown
- Liquid: $\ce{H2O(l)}$
- Solid: $\ce{NaCl(s)}$
- Gas: $\ce{CO2(g)}$
- Aqueous: $\ce{NaCl(aq)}$
```

#### Reaction Arrows

```markdown
- Forward: $\ce{A -> B}$
- Backward: $\ce{A <- B}$
- Equilibrium: $\ce{A <=> B}$
- Resonance: $\ce{A <-> B}$
- With conditions: $\ce{A ->[heat] B}$
- With catalyst: $\ce{A ->[H2SO4] B}$
```

#### Complete Chemical Equations

```markdown
**Combustion of methane:**
$$
\ce{CH4(g) + 2O2(g) -> CO2(g) + 2H2O(l)}
$$

**Photosynthesis:**
$$
\ce{6CO2 + 6H2O ->[light] C6H12O6 + 6O2}
$$

**Rusting of iron:**
$$
\ce{4Fe + 3O2 -> 2Fe2O3}
$$

**Acid-base reaction:**
$$
\ce{HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)}
$$

**With equilibrium:**
$$
\ce{N2(g) + 3H2(g) <=> 2NH3(g)}
$$
```

#### Complex Notation

```markdown
- Precipitate: $\ce{AgCl v}$ (↓ arrow)
- Gas evolution: $\ce{CO2 ^}$ (↑ arrow)
- Electron transfer: $\ce{Fe^2+ -> Fe^3+ + e-}$
- With heat (Δ): $\ce{CaCO3 ->[\Delta] CaO + CO2}$
```

---

### Traditional Math Notation

For pure mathematics (not chemistry), use standard LaTeX:

```markdown
- Greek letters: $\alpha$, $\beta$, $\gamma$, $\Delta$ (delta for change)
- Fractions: $\frac{numerator}{denominator}$
- Subscripts/superscripts: $x_1$, $x^2$
```

### Example Equations

```markdown
**pH calculation:**
$$
\text{pH} = -\log[\text{H}^+]
$$

**Ideal gas law:**
$$
PV = nRT
$$

**Concentration:**
$$
c = \frac{n}{V}
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

The reader supports multiple callout block types for highlighting important information.

**Available callout types:**
- Basic: `:::note`, `:::warning`, `:::example`
- Interactive: `:::practice-problem` (with `:::answer`, `:::hint`, `:::explanation`)
- Educational: `:::definition`, `:::key-concept`, `:::checkpoint`, `:::common-misconception`

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

### Practice Problem Block (Interactive)

Use `:::practice-problem` with nested `:::answer` for interactive problems with hide/reveal answers:

```markdown
:::practice-problem
Calculate the pH of a 0.01 M HCl solution.

:::answer
**Solution:**

HCl is a strong acid that completely dissociates:
- [H⁺] = 0.01 M
- pH = -log[H⁺] = -log(0.01) = 2

**Answer: pH = 2**
:::
:::
```

**Features:**
- **Amber header** with clipboard icon and "Æfingadæmi" title
- **White content area** for the problem statement
- **"Sýna svar" button** that reveals the answer when clicked
- **Green answer area** with smooth slide-down animation
- **Button changes** to "Fela svar" when answer is visible
- Students can attempt the problem before checking the solution

**Why this works:** Active recall (trying before checking) is one of the most effective learning techniques. This format encourages students to engage with problems rather than passively reading solutions.

### Hint Block (Inside Practice Problems)

Use `:::hint` inside practice problems to provide progressive hints:

```markdown
:::practice-problem
Calculate the pH of a 0.01 M HCl solution.

:::hint
Remember that HCl is a strong acid that completely dissociates.
:::

:::hint
Use the formula: pH = -log[H⁺]
:::

:::answer
**Solution:** pH = -log(0.01) = 2
:::
:::
```

**Features:**
- Multiple hints can be added (revealed progressively)
- Yellow/amber theme with lightbulb icon
- "Sýna vísbendingu" button reveals one hint at a time

### Explanation Block (Inside Practice Problems)

Use `:::explanation` for detailed explanations after the answer:

```markdown
:::practice-problem
What is the molar mass of water?

:::answer
18.015 g/mol
:::

:::explanation
Water (H₂O) contains:
- 2 hydrogen atoms: 2 × 1.008 = 2.016 g/mol
- 1 oxygen atom: 1 × 15.999 = 15.999 g/mol
- Total: 2.016 + 15.999 = **18.015 g/mol**
:::
:::
```

**Features:**
- Appears after answer is revealed
- Blue theme with info icon
- "Sýna útskýringu" button

---

## 📚 Educational Directive Blocks

These blocks are designed specifically for educational content.

### Definition Block (Purple)

Use `:::definition` for key term definitions:

```markdown
:::definition{term="Mólmassi"}
Mólmassi efnis er massi eins móls af efninu, gefinn upp í grömmum á mól (g/mol).
:::
```

**Features:**
- Purple theme with book icon
- Optional `term` attribute displays term in title
- Title shows "Skilgreining: Mólmassi" (or just "Skilgreining" without term)

### Key Concept Block (Cyan/Teal)

Use `:::key-concept` for essential concepts students must understand:

```markdown
:::key-concept
Lögmál Avogadros segir að jafnt rúmmál af gasi við sama þrýsting og hitastig innihaldi jafnmargar sameindir.
:::
```

**Features:**
- Cyan/teal theme with key icon
- Title: "Lykilhugtak"
- Use for concepts that will be built upon later

### Checkpoint Block (Green)

Use `:::checkpoint` for self-assessment questions mid-section:

```markdown
:::checkpoint
Getur þú:
- Reiknað mólmassa frá efnaformúlu?
- Umbreytt á milli móla og gramma?
- Útskýrt mólhugtakið?

Ef ekki, endurskoðaðu kafla 3.2!
:::
```

**Features:**
- Green theme with checkmark icon
- Title: "Sjálfsmat"
- Place after major concepts to verify understanding

### Common Misconception Block (Rose/Red)

Use `:::common-misconception` to address frequent student errors:

```markdown
:::common-misconception
**Rangt:** "Hiti eykur alltaf hraða efnahvarfa"

**Rétt:** Þótt hiti auki yfirleitt hvarfhraða, geta sum hvörf (exotherm) hægst við kælingu.
:::
```

**Features:**
- Rose/red theme with X-circle icon
- Title: "Algengur misskilningur"
- Explicitly teaching misconceptions is highly effective

---

## 🔗 Cross-References

Reference other sections, equations, figures, and definitions using the cross-reference syntax.

### Syntax

```markdown
[ref:type:id]
```

**Types:**
- `sec` - Section reference
- `eq` - Equation reference
- `fig` - Figure reference
- `tbl` - Table reference
- `def` - Definition reference

### Creating Reference Anchors

Add anchors after equations, figures, or definitions:

```markdown
$$
E = mc^2
$$ {#eq:einstein}

![Periodic table](./images/periodic-table.png) {#fig:periodic}
```

### Using References

```markdown
Sjá [ref:eq:einstein] fyrir orku-massa jöfnuna.

Eins og sýnt er í [ref:fig:periodic], eru frumefnin raðað eftir atómtölu.
```

**Features:**
- Hover preview shows referenced content
- Click navigates to source location
- Type-specific icons (equation, figure, table, definition)
- Keyboard accessible (focus triggers preview)

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

## 🚀 Future Possibilities: The Ultimate Chemistry Textbook

**The Vision:** Create an engaging, interactive chemistry learning experience for 15-25 year olds that goes beyond static text. Below are 30+ ideas for custom markdown tags that could transform chemistry education.

---

### 🎯 Interactive Problem Solving

#### 1. **Hide/Reveal Answer Blocks** ✅ **IMPLEMENTED!**

See the [Practice Problem Block](#practice-problem-block-interactive) section in "Currently Implemented Features" above for full documentation and examples.

This feature is now available for use in your markdown files!

#### 2. **Multiple Choice Quizzes**
```markdown
:::quiz
What is the atomic number of Carbon?

a) 6
b) 12
c) 14
d) 8

:::correct
a) 6 - Carbon has 6 protons!
:::
:::
```
**Why:** Immediate feedback. Could track scores, show explanations for wrong answers, gamify learning.

#### 3. **Fill-in-the-Blank Interactive**
```markdown
:::fill-blank
The formula for photosynthesis is: 6CO₂ + 6H₂O + light → ___ + 6O₂
:::
```
**Why:** Active recall is one of the most effective learning techniques. Forces engagement.

#### 4. **Drag-and-Drop Matching**
```markdown
:::match
Match the element to its symbol:
- Sodium
- Potassium
- Iron
- Gold

Options: Na, K, Fe, Au
:::
```
**Why:** Interactive, game-like. Great for memorization of symbols, formulas, lab equipment.

---

### 🔬 Lab & Safety

#### 5. **Safety Warning Blocks**
```markdown
:::safety
⚠️ **Strong Acid - Handle with Care**
- Wear goggles and gloves
- Work in fume hood
- Add acid to water, NEVER water to acid
- Have sodium bicarbonate nearby for spills
:::
```
**Why:** Critical for lab work. Red theme, prominent icons. Could include emergency procedures.

#### 6. **Lab Procedure Steps**
```markdown
:::lab-procedure
**Synthesis of Copper Sulfate Crystals**

1. Measure 5g of copper oxide
2. Add 25 mL of diluted sulfuric acid
3. Heat gently until dissolved
4. Filter the solution
5. Allow to crystallize over 3 days
:::
```
**Why:** Step-by-step formatting with checkboxes. Could include timers, photos for each step.

#### 7. **Lab Report Template**
```markdown
:::lab-report
**Experiment:** Determining Molar Mass

**Hypothesis:** ___
**Materials:** ___
**Procedure:** ___
**Data:** ___
**Analysis:** ___
**Conclusion:** ___
:::
```
**Why:** Teaches scientific writing. Students can download/print, or submit digitally.

---

### 📚 Learning Enhancements

#### 8. **Definition Boxes** ✅ **IMPLEMENTED!**

See the [Definition Block](#definition-block-purple) section above for full documentation.

```markdown
:::definition{term="Molarity"}
The concentration of a solution expressed as moles of solute per liter of solution (mol/L or M).
:::
```

#### 9. **Common Misconceptions** ✅ **IMPLEMENTED!**

See the [Common Misconception Block](#common-misconception-block-rosered) section above for full documentation.

```markdown
:::common-misconception
**Rangt:** "Hiti eykur alltaf hraða efnahvarfa"

**Rétt:** Þótt hiti auki yfirleitt hvarfhraða, geta sum hvörf hægst við kælingu.
:::
```

#### 10. **Mnemonic Helpers**
```markdown
:::mnemonic
**OIL RIG**
- **O**xidation **I**s **L**oss (of electrons)
- **R**eduction **I**s **G**ain (of electrons)
:::
```
**Why:** Memory aids make chemistry less intimidating. Could include student-submitted mnemonics.

#### 11. **Pronunciation Guide**
```markdown
:::pronunciation
**Stoichiometry:** stoy-kee-AH-meh-tree
[🔊 Listen]
:::
```
**Why:** Chemistry has complex terminology. Audio pronunciation builds confidence in speaking.

#### 12. **Simplified Explanation (ELI5)**
```markdown
:::simplify
**Complex:** "Le Chatelier's principle states that if a dynamic equilibrium is disturbed..."

**Simple:** Think of equilibrium like a seesaw. If you push one side down (add more reactant), the seesaw tips and the other side goes up (makes more product) to balance it out again.
:::
```
**Why:** Analogies and metaphors make abstract concepts concrete. Great for struggling students.

---

### 🌍 Real-World Connections

#### 13. **Real-World Applications**
```markdown
:::real-world
**Where you see this:** Airbags in cars use rapid decomposition reactions!

When a crash occurs, sodium azide (NaN₃) decomposes:
2NaN₃ → 2Na + 3N₂

The nitrogen gas inflates the airbag in milliseconds.
:::
```
**Why:** "When will I ever use this?" - Answers that question. Increases motivation and retention.

#### 14. **Career Connections**
```markdown
:::career
**Who uses this?**
- 💊 Pharmacists: Calculate drug concentrations
- 🏭 Chemical Engineers: Design production processes
- 🔬 Forensic Scientists: Analyze crime scene evidence
- 🌊 Environmental Scientists: Test water quality
:::
```
**Why:** Shows relevance to future jobs. Inspires career exploration.

#### 15. **Environmental Impact**
```markdown
:::environmental
🌱 **Sustainability Note**

Traditional ammonia production (Haber process) uses massive energy. New green ammonia methods using renewable electricity could reduce global CO₂ emissions by 1.8%!
:::
```
**Why:** Gen Z cares deeply about climate. Makes chemistry feel purposeful and urgent.

---

### 📖 Context & History

#### 16. **Historical Context**
```markdown
:::history
**Marie Curie (1867-1934)**

Discovered radium and polonium. First woman to win a Nobel Prize (1903), and first person to win two Nobel Prizes in different sciences (1911).

Her notebooks are still too radioactive to handle safely!
:::
```
**Why:** Humanizes science. Shows chemistry is created by people, not just facts from textbooks.

#### 17. **Timeline Visualizations**
```markdown
:::timeline
**Discovery of Atomic Structure**
- 1897: Thomson discovers electron (plum pudding model)
- 1911: Rutherford's gold foil experiment (nuclear model)
- 1913: Bohr model with electron shells
- 1926: Schrödinger's quantum mechanical model
:::
```
**Why:** Shows scientific progress isn't linear. Visual timeline helps organize historical development.

---

### 🎥 Multimedia Integration

#### 18. **Video Embeds**
```markdown
:::video
https://www.youtube.com/watch?v=abc123
**Title:** Why Does Ice Float?
**Duration:** 5:34
:::
```
**Why:** Visual learners benefit immensely. Shows reactions, demos impossible in classroom.

#### 19. **Interactive Simulations**
```markdown
:::simulation
**PhET: Balancing Chemical Equations**
[Launch Interactive Sim →](https://phet.colorado.edu/...)

Try balancing these equations yourself with molecular models!
:::
```
**Why:** Learning by doing. PhET sims are proven effective for conceptual understanding.

#### 20. **3D Molecule Viewer**
```markdown
:::molecule-viewer
**Caffeine (C₈H₁₀N₄O₂)**

[Rotate 3D Model]

Notice the planar structure of the aromatic rings and the bent geometry around nitrogen atoms.
:::
```
**Why:** Spatial reasoning is critical in chemistry. Interactive 3D beats static 2D drawings.

---

### 📊 Data & Visualization

#### 21. **Interactive Graphs**
```markdown
:::graph
**Plot:** Temperature vs. Solubility of KNO₃

Data:
20°C: 31.6 g/100mL
40°C: 63.9 g/100mL
60°C: 109.2 g/100mL

[Interactive graph students can manipulate]
:::
```
**Why:** Students learn to read graphs by interacting with them. Could add "predict the next point" challenges.

#### 22. **Comparison Tables**
```markdown
:::compare
| Property | Ionic Bonds | Covalent Bonds |
|----------|-------------|----------------|
| Formation | Metal + Nonmetal | Nonmetal + Nonmetal |
| Electrons | Transferred | Shared |
| Melting Point | High | Lower |
| Conductivity | Yes (when dissolved) | No |
:::
```
**Why:** Side-by-side comparisons highlight differences. Could include filtering, sorting.

---

### 🧮 Tools & Calculators

#### 23. **Embedded Calculators**
```markdown
:::calculator
**Molarity Calculator**

Enter values:
- Moles of solute: ___
- Volume (L): ___

Molarity = ___ M
:::
```
**Why:** Instant calculation removes arithmetic barriers. Focus on concepts, not arithmetic.

#### 24. **Unit Converter**
```markdown
:::unit-converter
Convert between:
- grams ⟷ moles
- Celsius ⟷ Kelvin
- atm ⟷ Pa ⟷ mmHg
:::
```
**Why:** Chemistry is full of unit conversions. Interactive tool reduces cognitive load.

#### 25. **Equation Balancer**
```markdown
:::balance-equation
Enter your unbalanced equation:
H₂ + O₂ → H₂O

[Check Balance] [Show Steps] [Get Hint]
:::
```
**Why:** Guided practice with immediate feedback. Could show step-by-step balancing process.

---

### 🤝 Collaborative Learning

#### 26. **Think-Pair-Share Prompts**
```markdown
:::think-pair-share
**Question:** Why do ionic compounds dissolve in water but not in oil?

1. 🤔 **Think:** Write your answer (30 sec)
2. 👥 **Pair:** Discuss with a partner (2 min)
3. 💬 **Share:** Class discussion

**Hint:** Consider the polar nature of water molecules.
:::
```
**Why:** Promotes active learning. Students articulate understanding to peers.

#### 27. **Discussion Prompts**
```markdown
:::discussion
**Debate:** Should genetic engineering be allowed for humans?

Consider:
- Medical benefits (cure genetic diseases)
- Ethical concerns (designer babies)
- Environmental impacts

💬 **Join the discussion thread** [245 comments]
:::
```
**Why:** Chemistry connects to ethics, society. Develops critical thinking beyond calculations.

---

### 🎓 Self-Assessment

#### 28. **Quick Check Questions** ✅ **IMPLEMENTED!**

See the [Checkpoint Block](#checkpoint-block-green) section above - use `:::checkpoint` for self-assessment:

```markdown
:::checkpoint
Getur þú:
- Skilgreint mólstyrk
- Reiknað mól frá massa
- Útskýrt mólhugtakið

Ef ekki, endurskoðaðu kafla 3.2!
:::
```

#### 29. **Progress Checkpoints** ✅ **IMPLEMENTED!**

The `:::checkpoint` directive serves this purpose. See [Checkpoint Block](#checkpoint-block-green) above.

#### 30. **Flashcard Sets**
```markdown
:::flashcard-deck
**Polyatomic Ions - Set 1**

Card 1: NO₃⁻ → [flip] → Nitrate
Card 2: SO₄²⁻ → [flip] → Sulfate
Card 3: PO₄³⁻ → [flip] → Phosphate

[Start Practice] [Shuffle] [Track Score]
:::
```
**Why:** Spaced repetition is proven for memorization. Built-in flashcards save students time.

---

### 🎨 Advanced Customization

#### 31. **Extension Material**
```markdown
:::extension
**For advanced students:**

Explore quantum mechanical derivation of atomic orbitals using Schrödinger's equation...

[Expand to read more]
:::
```
**Why:** Differentiated instruction. Advanced students stay engaged without slowing others down.

#### 32. **Worked Example Walkthroughs**
```markdown
:::worked-example
**Example 5.4: Finding Empirical Formula**

**Given:** 40% C, 6.7% H, 53.3% O by mass

**Step 1:** Assume 100g sample
- C: 40g
- H: 6.7g
- O: 53.3g

**Step 2:** Convert to moles
- C: 40g ÷ 12.01 g/mol = 3.33 mol
- H: 6.7g ÷ 1.008 g/mol = 6.65 mol
- O: 53.3g ÷ 16.00 g/mol = 3.33 mol

**Step 3:** Find smallest ratio...

[Continue step-by-step]
:::
```
**Why:** Breaks complex problems into manageable steps. Students can pause, rewind, review.

#### 33. **Reaction Mechanism Animator**
```markdown
:::mechanism-animator
**SN2 Reaction**

[▶️ Play Animation]

Watch how the nucleophile attacks the electrophile as the leaving group departs simultaneously.

[Pause] [Slow Motion] [Replay]
:::
```
**Why:** Reaction mechanisms are abstract. Animation makes electron movement visible.

---

## 💭 Pedagogical Principles

These features are grounded in research on effective learning:

1. **Active Recall** (quizzes, flashcards, fill-blanks)
2. **Spaced Repetition** (checkpoints, flashcard scheduling)
3. **Interleaving** (mixing problem types)
4. **Immediate Feedback** (calculators, auto-graded quizzes)
5. **Dual Coding** (text + visuals + animations)
6. **Elaboration** (explaining concepts in own words via discussion)
7. **Concrete Examples** (real-world applications)
8. **Reducing Cognitive Load** (calculators, step-by-step guides)
9. **Metacognition** (self-assessment, progress tracking)
10. **Motivation** (gamification, career connections)

---

## 🎯 Implementation Priority

**Already Implemented:** ✅
1. ✅ Hide/reveal answer blocks (`:::practice-problem` with `:::answer`)
2. ✅ Definition boxes (`:::definition`)
3. ✅ Safety warnings (`:::warning`)
4. ✅ Quick check self-assessments (`:::checkpoint`)
5. ✅ Progress checkpoints (`:::checkpoint`)
6. ✅ Common misconceptions (`:::common-misconception`)
7. ✅ Key concepts (`:::key-concept`)
8. ✅ Hints and explanations (`:::hint`, `:::explanation`)
9. ✅ Cross-references (`[ref:type:id]`)

**Still Available to Implement:**

**High Impact, Medium Complexity:**
- Multiple choice quizzes with feedback
- Calculators (molarity, pH, etc.)
- Flashcard decks (inline)
- Interactive graphs
- Video embeds

**High Impact, High Complexity:**
- 3D molecule viewers
- Simulation integrations
- Reaction mechanism animators
- Collaborative discussion threads
- Adaptive learning paths

---

## 🎓 The Bottom Line

Chemistry textbooks don't have to be static PDFs. With custom markdown tags, you can create an **interactive learning experience** that:

- ✅ Meets students where they are (videos, sims, games)
- ✅ Provides immediate feedback (quizzes, calculators)
- ✅ Connects to their lives (careers, environment, real-world)
- ✅ Adapts to their pace (hide/reveal, extensions, checkpoints)
- ✅ Builds deeper understanding (mechanisms, 3D models, discussions)

**The technology exists. The pedagogy is sound. The only limit is imagination.**

---

## 🔧 Want to Build One of These?

Every feature above is technically feasible with the current architecture. Custom markdown tags can be mapped to React components with full interactivity, state management, and even backend integration for things like discussion forums or progress tracking.

Pick the features that matter most for your students and let's build them!
