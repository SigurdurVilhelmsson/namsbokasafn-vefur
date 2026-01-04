---
name: review-tags
description: Audit existing tags in a chemistry content file for consistency and correctness
arguments:
  - name: file
    description: Path to the markdown file to review (e.g., public/content/efnafraedi/chapters/1/1.md)
    required: true
---

# Review Tags Command

Audit existing markdown tags in a chemistry content file for consistency, correctness, and best practices.

## Workflow

1. **Read the skill documentation**
   - Read `.claude/skills/chemistry-reader-tags/SKILL.md` for principles
   - Read `.claude/skills/chemistry-reader-tags/examples/tagging-decisions.md` for guidelines

2. **Read and analyze the file**
   - Read the file at `$ARGUMENTS.file`
   - Identify all existing custom tags

3. **Check for issues**

   ### Syntax Issues
   - Missing required attributes (e.g., `:::definition` without `term`)
   - Unclosed blocks (missing `:::` at end)
   - Invalid nesting (e.g., `:::hint` outside `:::practice-problem`)

   ### Content Issues
   - Wrong tag choice (definition vs key-concept vs note)
   - Over-tagging (too many tags for the content density)
   - Under-tagging (important content that should be tagged)
   - Inconsistent styling within tags

   ### Chemistry Notation
   - Plain-text formulas that should use `$\ce{...}$`
   - Incorrect mhchem syntax

   ### Cross-References
   - Broken references `[ref:type:id]` pointing to non-existent anchors
   - Missing anchors on important equations/figures
   - Orphaned anchors that are never referenced

   ### Practice Problems
   - Missing hints (should have at least one)
   - Missing explanation (recommended for complex problems)
   - Hints that give away the answer too easily
   - Answer without showing work

4. **Present audit report**

   ```
   ## Tag Audit Report for [filename]

   ### Summary
   - Total tags found: X
   - Issues found: Y (Z critical, W warnings)

   ### Critical Issues (must fix)
   1. Line X: [description of issue]
      Suggestion: [how to fix]

   ### Warnings (should fix)
   1. Line X: [description of issue]
      Suggestion: [how to fix]

   ### Suggestions (optional improvements)
   1. Line X: [description]

   ### Tag Statistics
   - Definitions: X
   - Notes: X
   - Warnings: X
   - Examples: X
   - Practice problems: X
   - Key concepts: X
   - Checkpoints: X
   - Common misconceptions: X

   Would you like me to fix the critical issues?
   ```

5. **Apply fixes with user approval**
   - Fix critical issues first
   - Address warnings if requested
   - Document changes made

## Issue Categories

### Critical (Must Fix)

| Issue | Example |
|-------|---------|
| Syntax error | `:::definition` without closing `:::` |
| Missing required attribute | `:::definition` without `term="..."` |
| Invalid nesting | `:::answer` outside `:::practice-problem` |
| Broken cross-reference | `[ref:eq:missing]` |

### Warnings (Should Fix)

| Issue | Example |
|-------|---------|
| Wrong tag type | Using `:::note` for a definition |
| Plain-text chemistry | `H2O` instead of `$\ce{H2O}$` |
| Practice problem without hints | Just answer, no progressive hints |
| Orphaned anchor | `{#eq:unused}` never referenced |

### Suggestions (Optional)

| Issue | Example |
|-------|---------|
| Missing explanation | Answer without showing work |
| Could add checkpoint | Long section without comprehension check |
| Potential key concept | Important principle not tagged |

## Example Output

```
## Tag Audit Report for 2.3.md

### Summary
- Total tags found: 12
- Issues found: 4 (1 critical, 2 warnings, 1 suggestion)

### Critical Issues (must fix)
1. Line 45: `:::definition` missing closing `:::`
   ```markdown
   :::definition{term="Mólmassi"}
   Massi eins móls af efni.

   Næsti málsgrein byrjar hér...
   ```
   Suggestion: Add `:::` after the definition text

### Warnings (should fix)
1. Line 23: Plain-text formula should use mhchem
   Current: `NaCl`
   Suggested: `$\ce{NaCl}$`

2. Line 78: Practice problem has no hints
   Suggestion: Add 1-2 progressive hints before the answer

### Suggestions (optional improvements)
1. Line 112: Important principle could be tagged as key-concept
   "Massavarðveislulögmálið segir að..."

### Tag Statistics
- Definitions: 3
- Notes: 2
- Warnings: 1
- Examples: 2
- Practice problems: 3
- Key concepts: 1
- Checkpoints: 0
- Common misconceptions: 0

Would you like me to fix the critical issues?
```
