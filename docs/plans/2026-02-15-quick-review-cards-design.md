# Quick Review Summary Cards (Feature 9.4)

**Date:** 2026-02-15
**Status:** Approved

## Problem

Before exams, students need to review key concepts quickly. Currently they must re-read entire sections or rely on their own highlights. The structured content already contains high-value blocks (key concepts, definitions, checkpoints) but there's no way to view them in isolation.

## Solution

A dedicated page at `/:bookSlug/yfirlit` that auto-extracts key-concept, definition, learning-objectives, and checkpoint blocks from chapter HTML and presents them as a scrollable card stack. Students pick a chapter (or multiple) and get an instant study guide.

## Page Layout

**Top bar**: Chapter picker — horizontal scrollable chips for each chapter (like filter tabs). "Allir kaflar" (all chapters) option. Shows card count per chapter.

**Card stack**: Vertical scroll of cards, grouped by section within the selected chapter(s). Each card shows:

- Block type badge (color-coded, matching existing CSS theme — teal for key-concept, purple for definition, etc.)
- Section breadcrumb ("Kafli 5 > 5.3 Vermi") linking back to the source section
- The block's content (HTML rendered as-is — already styled)

**Empty state**: If a chapter has no extractable blocks, show a friendly message.

## Block Types Extracted

| Block type          | CSS selector                 | Theme color |
| ------------------- | ---------------------------- | ----------- |
| Key concept         | `.content-block.key-concept` | Teal        |
| Definition          | `.content-block.definition`  | Purple      |
| Learning objectives | `.learning-objectives`       | Accent/Teal |
| Checkpoint          | `.content-block.checkpoint`  | Green       |

## Data Flow

1. Page loads `toc.json` to get chapter/section list
2. On chapter selection, fetch each section's HTML file
3. Parse with DOMParser, query for the four block type selectors
4. Render extracted blocks as cards

## Extraction

Runtime in the browser — load chapter HTML on page visit, parse out content blocks with DOM queries. Simple, no build step, always up-to-date with content.

## Scope Boundaries (YAGNI)

- No flashcard-style flip interaction (that's what minniskort is for)
- No progress tracking on review cards
- No print/export
- No markdown content support (biology book is coming-soon/hidden)
