# Reader development plan — closing the screen-vs-paper gap

**Date:** 2026-04-22
**Branch of origin:** `claude/evaluate-reader-research-aCOVa`
**Status:** Plan only — no code changes yet
**Source research:** "Why screens lose to paper — and how to build a reader that closes the gap" (Claude-generated literature review, April 2026), drawing on Delgado et al. 2018, Clinton 2019, Salmerón et al. 2024, Dunlosky et al. 2013, Ackerman & Lauterman 2012, Roediger & Karpicke 2006, and others.

## Executive summary

The screen-inferiority effect (Hedges' g ≈ −0.21 to −0.25 in favor of paper for expository text) is driven by two mechanisms screens make worse: shallow processing and over-confident self-monitoring. The literature is unusually clear about which UI choices import the failure mode and which mitigate it.

Audit of this reader against that literature shows the learning-science scaffolding is in place (SM-2, four-rating reviews, study-session phases, learning objectives, read-detection, analytics) but the four highest-evidence interventions are missing or implemented in ways that work against the research:

1. The whole section renders as one scrollable page (worst case in Salmerón et al. 2024)
2. Default measure (~97 chars/line) exceeds the 50–75 char band
3. Section completion shows a celebration animation with no retrieval prompt
4. Flashcard confidence is asked after the answer reveals, not before

This plan addresses each, sized in **Claude Code sessions** (one focused 1–3 hour session). Total P0: ~8 sessions; P1: ~6 sessions; P2: ~3 sessions; P3 (AI tutor) deferred.

## Audit summary

Full audit lives in conversation history; the structural findings are:

| Area | Current state | File:line |
|---|---|---|
| Section render | One scrollable `<article>` | `[sectionSlug]/+page.svelte:189`, `ContentRenderer.svelte:52-67` |
| Default measure | `--content-width: 52rem` ≈ 97 chars | `app.css:23-25,344-345` |
| Default theme | `'light'`, no `prefers-color-scheme` | `settings.ts:62` |
| Body font | Literata 16px, line-height 1.75 | `app.css:130,265,466-467` |
| OpenDyslexic | Offered as "Letur hannað fyrir lesblinda" | `SettingsModal.svelte:34-38` |
| Atkinson Hyperlegible | Not offered | — |
| Section markers in HTML | `<section>` with h2/h3 present | `content.css:147-161` |
| Read detection | IntersectionObserver + 1500ms | `readDetection.ts:31-106` |
| Section-end behavior | "Vel gert!" particle burst, no retrieval | `[sectionSlug]/+page.svelte:137-149` |
| Flashcard rating | Post-reveal only, no pre-prediction | `ReviewPhase.svelte:120-150` |
| Confidence ↔ performance | Stored separately, never compared | `objectives.ts:215-237`, `analytics.ts` |
| Highlights | Visual + Markdown export, no card path | `TextHighlighter.svelte`, `annotation.ts` |
| AI integration | None | — |

## Prioritized roadmap

### P0 — Closes the highest-evidence gaps

| # | Item | Sessions | Research basis |
|---|---|---|---|
| P0.1 | Tighten default measure to 38rem (~71 chars) | 1 | Baymard / NN-G / Bringhurst 50–75 char band |
| P0.2 | Replace section-completion celebration with free-recall prompt | 1 | Roediger & Karpicke 2006; Dunlosky 2013 |
| P0.3 | Predict-first flashcard rating (2-point pre-prediction) | 1 | Ackerman & Lauterman 2012; Clinton 2019 |
| P0.4 | Hybrid viewport-aware pagination (Option C — see detailed spec below) | 5 | Salmerón et al. 2024 (g 0.35–0.48 → 0.03–0.12) |

### P1 — Closes the metacognitive loop

| # | Item | Sessions | Research basis |
|---|---|---|---|
| P1.1 | Calibration tab on `/greining` (confidence vs. actual perf) | 2 | Ackerman; Clinton |
| P1.2 | Pre-question on section load | 1 | Pre-questions branch of testing-effect literature |
| P1.3 | Highlight → cloze card in one tap | 2 | Dunlosky 2013 (couple highlights to active use) |
| P1.4 | Typography corrections: relabel OpenDyslexic, add Atkinson Hyperlegible Next, `prefers-color-scheme` only when unset | 1 | Rello & Baeza-Yates 2013; Wery & Diliberto 2017 |

### P2 — Polish

| # | Item | Sessions |
|---|---|---|
| P2.1 | Bounded progress label ("Hluti N af M") replaces 2px scroll bar | 0.5 |
| P2.2 | Spaced-review surfacing in study planner | 1.5 |
| P2.3 | Recall-review tab in `/bokamerki` | 1 |
| P2.4 | `CLAUDE.md` note: optimize for expository, not narrative | 0 |

### P3 — Larger bets, evaluate after P0–P1

| # | Item | Sessions | Note |
|---|---|---|---|
| P3.1 | Socratic-only AI tutor | 8–12 | Build only after P0.2/P0.3 ship; constraints in research |
| P3.2 | Social annotation | — | Probably skip; not justified at current scale |

---

(Detailed Option C spec follows in next section.)
