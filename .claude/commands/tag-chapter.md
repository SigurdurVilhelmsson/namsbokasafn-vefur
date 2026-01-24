---
name: tag-chapter
description: Review and apply Chemistry Reader markdown tags to a chapter file
arguments:
  - name: file
    description: Path to the markdown file to tag (e.g., static/content/efnafraedi/chapters/1/1.md)
    required: true
---

# Tag Chapter Command

Review a chemistry content file and apply appropriate markdown tags.

## Workflow

1. **Read the skill documentation**
   - Read `.claude/skills/chemistry-reader-tags/SKILL.md` for overview
   - Read `.claude/skills/chemistry-reader-tags/implemented-tags.md` for syntax

2. **Read the target file**
   - Read the file at `$ARGUMENTS.file`
   - Understand the content structure and pedagogical flow

3. **Identify tagging opportunities**
   - Look for terms that need `:::definition{term="..."}`
   - Identify safety warnings or common mistakes for `:::warning`
   - Find important supplementary info for `:::note`
   - Spot fundamental principles for `:::key-concept`
   - Locate problems suitable for `:::practice-problem`
   - Find comprehension checks for `:::checkpoint`
   - Identify misconceptions to address with `:::common-misconception`

4. **Check chemistry notation**
   - Verify all formulas use `$\ce{...}$` syntax
   - List any plain-text formulas that need conversion

5. **Present proposed changes**
   Before making any edits, present a summary:

   ```
   ## Proposed Tags for [filename]

   ### Definitions (X found)
   - Line Y: "term" - first introduction of [term]

   ### Key Concepts (X found)
   - Line Y: [brief description]

   ### Warnings (X found)
   - Line Y: [what the warning addresses]

   ### Practice Problems (X candidates)
   - Line Y: [problem description]

   ### Chemistry Notation Fixes (X needed)
   - Line Y: `H2O` → `$\ce{H2O}$`

   Would you like me to apply these changes?
   ```

6. **Apply changes with user approval**
   - Only proceed after user confirms
   - Apply tags preserving existing content structure
   - Use mhchem for all chemistry notation

## Guidelines

- **Don't over-tag**: Only tag genuinely important content
- **Preserve flow**: Tags should enhance, not interrupt, reading
- **Icelandic titles**: All tag titles use Icelandic
- **Progressive hints**: Practice problems should have 1-3 hints
- **Anchor important equations**: Add `{#eq:name}` to key equations

## Example Output

```
## Proposed Tags for 1.2.md

### Definitions (3 found)
- Line 15: "atóm" - first formal definition
- Line 28: "sameind" - first introduction
- Line 45: "jón" - explained with examples

### Key Concepts (2 found)
- Line 52: Conservation of mass principle
- Line 78: Atomic number determines element identity

### Warnings (1 found)
- Line 92: Common confusion between mass number and atomic mass

### Practice Problems (2 candidates)
- Line 105: Calculate protons/electrons from atomic number
- Line 130: Identify isotopes from notation

### Chemistry Notation Fixes (5 needed)
- Line 12: `H2O` → `$\ce{H2O}$`
- Line 34: `CO2` → `$\ce{CO2}$`
- Line 67: `Na+` → `$\ce{Na+}$`
- Line 89: `H2SO4` → `$\ce{H2SO4}$`
- Line 112: `Fe^3+` → `$\ce{Fe^3+}$`

Would you like me to apply these changes?
```
