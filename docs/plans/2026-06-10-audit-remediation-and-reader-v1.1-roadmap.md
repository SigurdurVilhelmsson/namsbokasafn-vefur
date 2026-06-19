# Roadmap — June 2026: audit remediation → production, then Reader v1.1

**Date:** 2026-06-10 (status updated 2026-06-11)
**Context:** Follows the full codebase review in `docs/code-review-2026-06.md` (PR #108) and the reader development plan in `docs/plans/2026-04-22-screen-vs-paper-reader-plan.md`.

## Status summary (2026-06-11)

| Track                     | State                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 1 (audit → main)    | **Complete** — all items below merged (#115 pipeline, #116 SRS, #117 Icelandic, #118 delivery, plus #126 CI gate, #130 audit-1.3 fix, #131 P2.4) |
| Reader v1.1 / plan P0     | **Complete** on `feature/reader-v1.1` (#119–#122) — gated on QA batches D–E + 3 judgment calls                                                   |
| Reader v1.2 / plan P1     | **Complete** on `feature/reader-v1.2` (#124, #125, #127, #128) — gated on QA batch G                                                             |
| Production deploy         | Pending: server pull/build/rsync + apply nginx changes (QA batch F)                                                                              |
| Releases                  | v1.1.0 after D–E verdicts; v1.2.0 after G, following v1.1.0                                                                                      |
| Reader plan P2.1–P2.3     | Not started (P2.4 done in #131; P2.1 label shipped inside P0.4, scroll-bar replacement open)                                                     |
| Reader plan P3 (AI tutor) | Deferred pending classroom feedback on P0/P1                                                                                                     |

Manual verification lives in `docs/manual-qa-2026-06.md`. The sections below
are the original plan, kept for the record.

## Phase 1 — Finish audit remediation, ship to production

### Already merged (this session)

| PR   | Change                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| #108 | Full audit report (`docs/code-review-2026-06.md`)                                                                          |
| #109 | Security: shell-safe `sync-content.js`, `persist-credentials: false` in CI                                                 |
| #110 | Section-navigation lifecycle (`afterNavigate` + `{#key}`), popup positioning, readDetection/bionicReading `update()` fixes |
| #111 | E2E selector fixes (CI green and meaningful again)                                                                         |
| #112 | Reactivity sweep: planner toggles, duplicate modal saves, frozen `$derived`-over-`get()` views; CLAUDE.md pitfalls note    |
| #113 | Glossary book switching; analytics session no longer persisted/adopted cross-tab, 30-min duration cap                      |

### Remaining before the production push (all complete as of 2026-06-11 — see status summary)

1. **Wire up the practice-tracking pipeline** (audit 1.4 + M1–M4, M6).
   Decision: **wire up, not delete** — the reader plan's P1.1 calibration tab and
   P2.2 spaced-review surfacing depend on the performance data this pipeline
   collects. Scope: connect `actions/practiceProblems.ts` events to the quiz
   store; add `bookSlug` to `PracticeProblem`/objectives chapter queries
   _before_ real data accumulates; fix the stats key migration corruption,
   answer dedupe by question id, and section-mastery aggregation.
   **Update (2026-06-19):** the wiring + M1/M3 fixes shipped (PR #115), but this item
   assumed `.practice-problem-container` content would supply the data — the CNXML
   decision removed that source, so the pipeline stayed empty. The data source has been
   re-established via the Example "Kannaðu þekkingu þína" reveal (inline self-assessment):
   see `docs/plans/2026-06-19-rec7-practice-self-assessment.md`. The dead
   `.practice-problem-container` writer is being removed there. (M4 still deferred —
   see below; M2 revisits with the Phase-2 quiz bank.)
2. **SRS ease-factor cap** — add the documented 2.5 upper clamp in
   `utils/srs.ts` (CLAUDE.md and standard SM-2 both specify 1.3–2.5); update
   the test that codified the unbounded behavior.
3. **Icelandic text restore** (audit M15) — `/prof` page, AdaptiveQuiz,
   NoteModal, AnnotationSidebar carry diacritic-stripped pseudo-Icelandic;
   plus three grammar nits (yfirstrikanir, skrár vantar, accusative stokk).
4. **nginx + CSP hardening** (audit 1.10, 2.3) — update
   `nginx-config-example.conf`: scope `immutable` caching to `/_app/`,
   `must-revalidate` for unhashed CSS/content images, add `object-src 'none';
base-uri 'self'; frame-ancestors 'none'`. **Manual step:** the live nginx
   on the Linode box must be updated to match at deploy time — this repo has
   no deploy workflow; production deploys are done from the server.
5. **GoatCounter non-blocking** — load the analytics script so it cannot
   block the page `load` event (caused a full e2e outage on 2026-06-09 when
   `gc.zgo.at` hung; also affects users on flaky networks).

Each ships as its own small PR. When all are merged, main is the production
candidate: pull/build/deploy on the server as usual and apply the nginx
changes in the same maintenance window.

### Explicitly deferred (documented, not forgotten)

- Objectives chapter/overall progress always-100% (audit M4 denominator) —
  needs per-chapter objective totals from content; revisit with reader-plan P1.1.
- Search-worker request ids (M8), pomodoro wall-clock timing (M12), modal
  focus-trap extraction, dead-code/duplication cleanups (audit §4) — quality
  tier, do opportunistically.

## Phase 2 — Reader v1.1 (screen-vs-paper plan)

Implements `docs/plans/2026-04-22-screen-vs-paper-reader-plan.md`. (At the
time of writing nothing had shipped; as of 2026-06-11, P0 is complete on
`feature/reader-v1.1` and P1 on `feature/reader-v1.2` — see the status
summary above.)

**Branch strategy:** long-lived integration branch `feature/reader-v1.1`,
created from main after Phase 1 merges. Individual P0 items land on it as
separate reviewed PRs, in the plan's own order:

1. P0.1 — default measure → `narrow` (38rem); one-line change now that the
   setting exists
2. P0.3 — predict-first flashcard rating
3. P0.2 — free-recall prompt replacing the completion celebration
   (scaffolded against scrolled mode)
4. P0.4 — hybrid viewport-aware pagination (Option C spec in the plan;
   rewires P0.2's trigger to per-sub-section)

When P0 is complete: merge `feature/reader-v1.1` → main, bump version
1.0.0 → 1.1.0, add CHANGELOG entry. P1 items (calibration tab, pre-questions,
highlight→cloze, typography) follow the same pattern toward 1.2.0, drawing on
the practice-pipeline data wired up in Phase 1.

**Audit↔plan interactions already accounted for:**

- The practice pipeline is wired up (Phase 1) because P1.1/P2.2 need its data.
  **(2026-06-19)** Its data source is the inline self-assessment on the Example reveal
  (`source:'inline'` in `practiceProblemProgress`), per
  `docs/plans/2026-06-19-rec7-practice-self-assessment.md`. Coordination when these branches merge:
  **P0.3** (predict-first) — upgrade the inline rating to the same predict-first pattern, don't
  build a parallel one; **P1.1** (Kvörðun / CalibrationTab) — include `source:'inline'` attempts
  in the prediction-vs-outcome matrix, not just flashcards; **P2.2** — draws on the same inline data.
- The completion celebration gets no cleanup investment — P0.2 replaces it.
- Section-page lifecycle fixes (PR #110) are the foundation P0.4's
  read-detection rewire builds on.
