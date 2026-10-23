# Reader decision briefs (plan step S0.2)

**Written:** 2026-10-17, for step S0.2 of the reader v1.1/v1.2 review plan ([plan](2026-10-15-reader-v1.1-v1.2-review-plan.md), [report §8](2026-10-15-reader-v1.1-v1.2-review.md#8-decisions-for-user)). Each brief comes from report §8, the findings register and the plan; code facts were re-measured on `main` (0cdeab0) that day, and content counts on efni's ② preview unless a line says otherwise.

**How it is used.** [USER] rules D01–D10, D18–D20 and KEEP-01 in this decision session. Calls 1–4 stay open unless [USER] rules one early; they carry the review's recommendation, labelled, and nothing is preselected. D11–D13 and D21 are ruled at S9.0, D14–D17 and D22–D24 at S12.0, and D25 at S10.2; those sessions add to this file. Every ruling or deferral is a dated, append-only file in `docs/decisions/`.

**Costs** are in sessions (one focused 1–3 hour session) and come only from the plan's step estimates, report §8 or the register; "not estimated" means none of them gives a number. "Proposed" marks an Icelandic string that no native speaker has checked yet (D20).

## Contents

- Ruled in this session: [D01](#d01--text-on-the-amber-buttons-and-the-focus-ring-colour), [D02](#d02--existing-readers-saved-settings-chosen-or-migrate-once), [D03](#d03--the-page-view-event-sent-to-the-editorial-server), [D04](#d04--srs-the-rating-step-a-due-only-æfa-a-confident-error-message), [D05](#d05--release-timing-for-predict-first-and-the-srs-fixes), [D06](#d06--the-pager-until-call-3-dark-or-early-opt-in), [D07](#d07--p13-what-card-a-selection-makes), [D08](#d08--p11-kvörðun-action-list-per-section-half-or-defer), [D09](#d09--pilot-classes-and-a-counts-only-export), [D10](#d10--does-an-early-mark-read-open-the-recall-prompt), [D18](#d18--recall-read-back-with-a-delete-now-or-later), [D19](#d19--chapters-cleared-for-machine-translated-standards), [D20](#d20--who-checks-new-icelandic-strings), [KEEP-01](#keep-01--reword-claudemds-design-principle)
- Open calls: [CALL1](#call1--page-height-budget), [CALL2](#call2--recall-per-section-or-sub-section), [CALL3](#call3--launch-default-reading-mode), [CALL4](#call4--how-often-the-pre-question-appears)
- Ruled later: [D11](#d11--keys-and-oversized-worked-examples), [D12](#d12--a-title-on-every-page-figures-and-their-text), [D13](#d13--continue-reading-find-in-page-the-page-label), [D14](#d14--atkinson-family-and-font-caching), [D15](#d15--theme-when-unchosen-the-chrome-typeface), [D16](#d16--the-pre-questions-form-source-guess-and-placement), [D17](#d17--student-controls-and-fading), [D21](#d21--the-crossovers-term-margin-and-consent), [D22](#d22--key-term-starter-decks-per-book-or-shared), [D23](#d23--retiring-the-v12-branch), [D24](#d24--streaks-behind-halda-röð-daga), [D25](#d25--later-scope-after-the-crossover)
- [Appendix: re-measure scripts](#appendix-re-measure-scripts)

## Ruled in this session

### D01 · Text on the amber buttons, and the focus-ring colour

_Ruled at S0.2, before S2.1 (also S2.2 and S2.3)._

**Question.** White text on the amber fill fails WCAG AA (2.92:1 light, 2.08:1 dark; 4.5:1 needed), and the light focus ring is under 3:1. In light mode: dark ink on the unchanged amber, or white on a darker bronze fill? And a bronze or an ink ring?

**Options.**

- **(a) Ink on amber, bronze ring.** _(the review recommends this)_ Ink text: #1b2838 light (5.12:1), #16161c dark (8.66:1). The light hover turns lighter, #dd9f2c (6.45:1), as ink on today's #a87518 is 3.71:1. Light ring bronze #8a5d0e on a white gap (5.75:1). Cost: S2.1–S2.3: 1 + 0.75 + 0.75 sessions, not split by option.
- **(b) Ink on amber, ink ring.** As (a), with an ink ring #1b2838 (14.92:1). CLAUDE.md lists focus rings under the amber accent (main:CLAUDE.md:138). Cost: As (a).
- **(c) White on bronze, bronze ring.** A bronze #8a5d0e fill with white text (5.75:1) re-skins every primary button, off CLAUDE.md's amber/gold accent (main:CLAUDE.md:136). Dark mode still needs ink, or its own darker fill. Cost: As (a).
- **(d) White on bronze, ink ring.** As (c), with (b)'s ink ring. Cost: As (a).

**Recommendation.** The review's recommendation: 'Ink, bronze ring' (report 8.5, D01 row), one rule for both themes, as KEEP-07 proposes (report 6.1).

**Evidence.**

- White on amber is site-wide on main (.btn-accent, main:src/app.css:401-402); v1.1 adds 'Vista upprifjun' and the active 'Síðuskipt', and makes the amber 'Þröngt' the default [UI-02].
- The light ring (main:src/app.css:427-431) fails WCAG 1.4.11 on every control, and .glossary-term:focus removes it in the text (:1228-1233); dark passes [UI-07] (R4-18).
- --text-primary cannot be the ink: dark #e8e4de is 1.64:1 on the amber [UI-02].
- Colour tokens and the focus ring are a shared contract with the design track (main:docs/design/design-coordination-2026-06.md:36) [UI-02].

**Measured 2026-10-17.**

- origin/main:src/app.css: light accent #c78c20 (:60), hover #a87518 (:61); dark #e8a838 (:103), #f0bc5a (:104). #8a5d0e and #dd9f2c are in no src file (git grep; control #c78c20: 8 files).
- The WCAG 2.x contrast formula (appendix script `d01-contrast.py`) reproduces every ratio here. Light rings on the five surfaces: today 2.31–2.92 from the tokens (2.54–2.92 on screen [UI-07]; 1.97–2.41 against its own halo), bronze 4.55–5.75, ink 11.82–14.92.
- git grep: 14 lines in 10 files pair bg-[var(--accent-color)] with text-white; a scan of origin/main's CSS (scratch script, not committed): 22 same-block rules in 17 files, as UI-02 says.

**Cost.** S2.1: 1 session; S2.2: 0.75; S2.3: 0.75 (late November, with train 2's deploy). Plan estimates; S2.1's acceptance holds under either option.

**If ruled now.** Unblocks M2: S2.1 (tokens), S2.2 (the ring), S2.3 ([USER]'s sign-off, train 2). Rule 2 (report 9.5) keeps new features from students until they land.

**Caveats.**

- Sources differ on hexes, all passing: light ring #8a5d0e (UI-07, report 6.1) or #a87518 (UI-02's fix, 3.19–4.02:1); ink #1b2838 (UI-02) or #16161c (KEEP-07, 6.18:1).
- UI-02 and report 6.1 also ask whether the raised hint grey may sit near secondary (5.19 against 5.45); the D01 row omits it. No source gives a bronze hover.

Issues: UI-02, UI-07. Sources: Report 6.1, 8.5, 9.5; Register UI-02, UI-07, KEEP-07; Plan S2.1–S2.3, M2; origin/main: src/app.css, CLAUDE.md, docs/design/design-coordination-2026-06.md.

### D02 · Existing readers' saved settings: chosen, or migrate once

_Ruled at S0.2, before S6.1 (also S12.1 and S12.4)._

**Question.** Each browser that has opened the site has saved all ten settings, chosen or not (its 'profile'). When S6.1 stores only real choices, do those saved values count as chosen, or are values equal to today's defaults forgotten once, so later defaults reach them too?

**Options.**

- **(a) Count as chosen.** _(the review recommends this)_ Existing readers keep every value. New defaults reach new profiles only: P0.1's 'Þröngt' (S12.1) and, if D15 rules it, an OS-following theme (S12.4). Cost: S6.1: 1 session, not split by option.
- **(b) Migrate once.** Saved values equal to main's defaults ('Miðlungs', light) become unchosen once, so later defaults reach existing readers, including those who picked 'Miðlungs' or light on purpose (S12.1). Cost: As (a).

**Recommendation.** The review's recommendation: 'As chosen' (report 8.5, D02 row). UI-31 and PED-33 agree for a stored 'medium': an auto-save cannot be told from a choice.

**Evidence.**

- On load, before any choice, the store saves its whole state, with no version or record of choices, and a valid saved value beats the default (main:src/lib/stores/settings.ts:103-111; main:src/lib/utils/storeValidation.ts:45-58) [CODE-05].
- As v1.1 is built, P0.1's narrow default reaches new profiles only; readers who never touched 'Línubreidd' keep 'Miðlungs' [UI-31, PED-33].
- Theme likewise: a profile that never chose dark has saved 'light', so following the OS reaches it only by a migration, which also overrides readers who chose light [UI-22].
- D02 does not set the reading mode: no profile stores one yet, and call 3 rules it through S6.1's profile-age marker (report 8.3) [CODE-05].

**Measured 2026-10-17.**

- A Node harness (scratch, not committed) loads the real settings.ts over a stub localStorage, calling no setter: a fresh main profile saves 10 keys, theme 'light', lineWidth 'medium'; dde768e then adds readingMode 'paged' and keeps 'medium'; a fresh dde768e profile saves 'narrow' and 'paged'.
- Same harness: a main profile that picks 'Miðlungs' and light by hand stores byte-identical data to one that only loaded the page.
- The root layout imports the store on every page (main:src/routes/+layout.svelte:7).

**Cost.** S6.1: 1 session (plan estimate); its last chunk writes the one-time migrate function. No source costs the options.

**If ruled now.** Unblocks S6.1 (M6: mid-January 2027 at 1.5 sessions a week, mid-to-late February at one); S12.1 and S12.4 also wait on it. No reader sees a change when the seam ships (M6 exit criteria); the options diverge when S12.1 and S12.4 change defaults.

**Caveats.**

- The sources raise line width (CODE-05, UI-31, PED-33) and theme (UI-22) separately, and [USER] could rule each; none says whether (b) covers every setting equal to its default.
- QA batch D expects a stored width to survive (dde768e docs/manual-qa-2026-06.md:152-154); under (b) a stored 'medium' turns 'narrow' at S12.1.

Issues: CODE-05, UI-22, UI-31, PED-33. Sources: Report 5.2, 8.3, 8.5; Register CODE-05, UI-22, UI-31, PED-33; Plan S6.1, M6, S12.1, S12.4; origin/main and dde768e: settings.ts, storeValidation.ts, +layout.svelte, docs/manual-qa-2026-06.md.

### D03 · The page-view event sent to the editorial server

_Ruled at S0.2, before S3.3._

**Question.** A production build sends a page-view event to the editorial server (ritstjorn.namsbokasafn.is) on each page change inside a book, and nothing tells readers. Remove it, make it opt-in (off by default), or keep and disclose it? The review's answer turns on one fact only [USER] knows: does anyone use its counts? Second: should CLAUDE.md carry a guardrail about data leaving the device?

**The page-view event.**

- **(a) Remove.** Delete the call in code, never by omitting .env.production (S3.3); the data rule can then say no learning data leave the device unless a student exports them [KEEP-01]. Cost: Not estimated per option; S3.3 is 0.75 session.
- **(b) Opt-in, off by default.** Readers switch it on, and the privacy page names the switch. The switch stays out of the settings store, or waits until after S6.3 (S3.3). Cost: Not estimated; part of S3.3.
- **(c) Keep and disclose.** No code change; the privacy page and any school data sheet say what it carries and that the server logs user-agent, referrer and any sessionId cookie [PED-39]. Cost: Not estimated; part of S3.3.

_Review:_ Remove it unless its counts are used; if they are, keep it and disclose it (report 8.5). efni's server keeps the events for a head-editor dashboard (efni 98a5fe2ff, server/routes/analytics.js:113).

**Guardrails in CLAUDE.md.**

- **(a) Add KEEP-01's data rule to CLAUDE.md.** _(the review recommends this)_ Worded to the event ruling; after removal it would say that no learning data leave the device unless the student exports them [KEEP-01]. Cost: Not estimated (a short documentation edit).
- **(b) Leave CLAUDE.md as it is.** The data rule goes in the reader plan only, as KEEP-01's fix has it [KEEP-01]. Cost: None.

_Review:_ Report 8.5 says 'add the guardrails' without defining them; the nearest written rule is KEEP-01's data rule, which (a) adds.

**Recommendation.** The review's recommendation: 'Remove it unless its counts are used, then disclose it; add the guardrails' (report 8.5, D03 row).

**Evidence.**

- Nothing tells readers that anything leaves the device: none of main's 24 pages is a privacy page, /for-teachers has no data section, and the nearest string is 'Stillingar eru vistaðar sjálfkrafa í vafranum þínum' (main:src/lib/components/SettingsModal.svelte:416) [PED-39].
- Some readers are minors; letting any count leave the device other than by a student's own export is [USER]'s privacy call [PED-17].
- Not checked: whether production stores the rows, or whether ePrivacy Art. 5(3) applies (R5-22) [KEEP-01].

**Measured 2026-10-17.**

- main:src/routes/[bookSlug]/+layout.svelte:23-30 calls trackPageView on first load and each new path in a book; main:src/lib/utils/api.ts:26-57 sends {eventType, book, chapter, section} by sendBeacon to VITE_API_URL + '/api/analytics/event', or nothing if unset (:30). git grep: no other caller.
- Live build 1791155794060 (curl, read-only): CSP connect-src lists ritstjorn.namsbokasafn.is, nodes/2.DZ0RdiYq.js holds the sendBeacon and chunks/CUt84h42.js that host; local .env.production sets the same VITE_API_URL.
- efni 98a5fe2ff server/routes/analytics.js:66-97 also stores user-agent, referrer and any sessionId cookie, which a head-editor dashboard reads (:113).
- CLAUDE.md never mentions the event (git grep) and says 'No backend — all user state in localStorage' (main:CLAUDE.md:14).

**Cost.** S3.3: 0.75 session (plan estimate), with the privacy page and 'Tilkynna villu'; it may move to M5's train.

**If ruled now.** Privacy wording waits for it (rule 10, report 9.5). With D20, it unblocks S3.3 (train 3 by about 11 December 2026, or M5's) and lets KEEP-01's data rule and a school data sheet [PED-39] be worded.

**Caveats.**

- No source defines 'guardrails in CLAUDE.md'; the nearest is KEEP-01's four rules plus a data rule, which KEEP-01 puts in the reader plan.
- KEEP-01 and PED-39 also allow removal by unsetting VITE_API_URL; the plan says in code only (S3.3, S0.5). Whether anyone reads the counts, which decides (a) or (c), is unknown.
- Option (a) of the guardrail question reads report 8.5's undefined 'guardrails in CLAUDE.md' as KEEP-01's data rule; say so in the note if you meant something else.

Issues: KEEP-01, PED-39, PED-17. Sources: Report 8.5, 9.5, B.2; Register KEEP-01, PED-39, PED-17; Plan S3.3, S0.5, M3; origin/main: api.ts, config.ts, [bookSlug]/+layout.svelte, SettingsModal.svelte, for-teachers, CLAUDE.md; Local .env.production; live site (curl); efni 98a5fe2ff server/routes/analytics.js.

### D04 · SRS: the rating step, a due-only 'Æfa', a confident-error message

_Ruled at S0.2, before S4.4._

**Question.** Four flashcard-schedule (SRS) choices, under CLAUDE.md's caution: how an effortful correct recall scores, whether 'Æfa' takes only due cards, whether a confident error gets a message, and whether that card comes back once in the session.

**The rating step.**

- **(a) Relabel by correctness.** _(the review recommends this)_ 'Rangt' / 'Að hluta' / 'Rétt' / 'Auðvelt' (proposed); srs.ts untouched; effortful but correct is 'Rétt', a pass [PED-08]. Cost: Inside S4.4.
- **(b) 'Erfitt' becomes quality 3.** Both quality tables change; 'Erfitt' passes at a lower ease [PED-08]. Cost: Inside S4.4.
- **(c) Correctness first, then ease.** A deliberate SRS change; not in S4.4's chunks [PED-08]. Cost: Not estimated.
- **(d) As is.** Planner output (off-repo). With nothing ruled, S4.4 waits (S4.4). Cost: None.

_Review:_ Relabel by correctness (report 8.5).

**A due-only 'Æfa'.**

- **(yes) Yes: 'Æfa' takes due cards.** _(the review recommends this)_ Due cards plus capped new ones (the reviewer suggests 10); 'Aukaæfing' (proposed) leaves not-yet-due intervals alone but reschedules a lapse [PED-11]. Cost: Inside S4.4.
- **(no) No: 'Æfa' keeps every card.** Today's behaviour: due or not, every card is queued, so four 'Gott' ratings in one day move a new card to 38 days (see the table). Cost: None.

_Review:_ A due session (report 8.5) [PED-11].

**A message after a confident error.**

- **(yes) Yes: show a message.** _(the review recommends this)_ After 'Man það' and a miss: 'Þú hélst að þú myndir þetta — skoðaðu svarið vel.' (draft) [PED-20]. Cost: Inside S4.4.
- **(no) No message.** Cost: None.

_Review:_ The message (report 8.5) [PED-20].

**Bring a confident error back once in the session.**

- **(yes) Yes: bring it back once.** Built in S14.7, which does it 'only if D04 asked for it'. Cost: Part of S14.7 (not estimated separately).
- **(no) No.** Cost: None.

_Review:_ Report 8.5's recommendation leaves it out; report 4.5 says to bring a confident error back once.

**Recommendation.** The review's (report 8.5): 'Relabel, due session, message', that is rating (a), a due-only 'Æfa' and the message. Report 4.5 also says to bring a confident error back once.

**Evidence.**

- 'Hversu auðvelt var þetta?' asks about ease, but 'Erfitt' is quality 2, below the pass mark of 3: an effortful correct recall lapses, counts as wrong in /greining and, in a ported Kvörðun, as 'rangt'. Pre-existing on main, and conservative [PED-08].
- 'Æfa' queues every card, due or not; spaced beat massed retrieval, g = 0.74 after correction for publication bias (R2-21, mostly lab undergraduates) [PED-11].
- Confident errors are the likeliest to be corrected after feedback (R2-14, adults, abstract) [PED-20].

**Measured 2026-10-17.**

- `node d04-intervals.mjs` from the repo root (Node 22.22.2; the script is in the appendix): srs.ts and types/flashcard.ts, hash-equal to origin/main 0cdeab0, driven as rateCard drives them; no browser.
- New card, four 'Gott' in one day (interval / ease): 1 d / 2.50; 6 d / 2.50; 15 d / 2.50; 38 d / 2.50. As the plan expects.
- One 'Erfitt' at 1, 6 or 15 d: today 1 d each, ease 2.18, correct streak reset; as quality 3: 6, 14, 35 d, ease 2.36. 'Aftur': 1 d, ease 1.70. Previews show 'Erfitt' as '1 d', like 'Aftur'.
- Mapping, origin/main: minniskort/+page.svelte:218-248 and ReviewPhase.svelte:122-152 → stores/flashcard.ts:279, DIFFICULTY_TO_QUALITY (types/flashcard.ts:29-34): 0, 2, 4, 5; wasCorrect = quality >= 3 (:296), /greining's ring (:428); srs.ts RATING_TO_QUALITY (:27-32) only previews (:253). 'Æfa': no mode (minniskort :39-41) → 'all' (stores/flashcard.ts:226), which keeps cards 'due' drops.

**Cost.** S4.4: 1 session (plan), with one label table and a test pinning both quality tables. (c): not estimated.

**If ruled now.** Unblocks S4.4 (M4: December and the break); its decision file holds the table (M4 exit). Also sets S4.3's 'Erfitt' case, S14.6's Kvörðun cell and S14.7's re-queue.

**Caveats.**

- (a) changes what past 'Erfitt' ratings mean in /greining [PED-08].
- A miss in (f) follows the rating choice; today only 'Aftur' [PED-20].

Issues: PED-08, PED-11, PED-20, CODE-01. Sources: Report 8.5, 4.5, 9.5, B.2; register PED-08, PED-11, PED-20, CODE-01; plan S4.3, S4.4, S14.6, S14.7, M4; origin/main 0cdeab0 flashcard code; v1.2 e3b29c7 CalibrationTab.svelte; The review's planner output, summarised in report Appendix D.6 (D04).

### D05 · Release timing for predict-first and the SRS fixes

_Ruled at S0.2, before S4.5._

**Question.** When do predict-first and D04's SRS fixes reach students: on one train at the start of the spring term, or each on the first train after it merges?

**Options.**

- **(a) One train, first week of January 2027.** _(the review recommends this)_ S4.5 runs at the term boundary, after M1 and M2 are live, announced in class. It carries what has merged: S4.1 and S4.2 are its prerequisites, S4.3 is the first cut, S4.4 waits for D04 (S4.5, S4.4, M4). Cost: 0.5 session (S4.5).
- **(b) As ready, never in the December release week.** Planner output (off-repo): each piece goes live on the first train after it merges. Cost: Not estimated.

**Recommendation.** The review recommends (report 8.5): 'one January deploy'. Its planner adds: 'so it meets students at a term start'.

**Evidence.**

- M4 is 'live in the first week of January 2027 if D05 holds' (M4).
- About 15.5 sessions are supplied to the spring term against 16.5 demanded; predict-first makes the boundary only if S3.3 moves to M5's train and S4.3 waits (report 9.3; plan, Capacity).
- Its accessibility PR (S4.2) merges before the train that brings it to students, and SRS changes ship only with the interval tables shown (report 9.5, rules 2 and 13).
- A relabel changes what students' past 'Erfitt' ratings mean in /greining [PED-08].

**Measured 2026-10-17.**

- Main has no predict-first: `git grep -n 'Man það' origin/main -- src | wc -l` → 0 (control: dde768e → 4).
- On main, 'Æfa' still starts an all-cards session (minniskort/+page.svelte:39-41; stores/flashcard.ts:226). The live site was not checked.
- Trains before S4.5 ('Deploys: yes' in the plan): S1.3 (week of 2 November), S2.3 (late November), S3.4 (about 11 December).

**Cost.** (a) 0.5 session (S4.5). (b) Not estimated.

**If ruled now.** (a) fixes M4's live date: S4.5, in the first week of January 2027, brings predict-first and any merged D04 fixes. (b) lets each of S4.1–S4.4 go live on the next train after it merges. S4.4 still waits for D04.

**Caveats.**

- Section 8.5 says only 'one January deploy'; (b) and the planner's reason are its off-repo output (report Appendix D.6).
- The planner counts about 16 sessions of demand to the boundary; the report and plan say 16.5.
- Inference, not in the sources: a train carries everything merged since the last one (plan, How to use), so under (a) S4.1–S4.4 merge after train 3 (S3.4) or stay switched off on main until January.
- Either way, main's all-cards 'Æfa' [PED-11] stays until S4.4 ships.

Issues: PED-08, PED-11, PED-20, CODE-01. Sources: Report 8.5, 9.3, 9.5; register PED-08, PED-11, PED-20, CODE-01; plan How to use, Capacity, M4, S3.4, S4.1–S4.5, every 'Deploys: yes' step; origin/main 0cdeab0: minniskort/+page.svelte, stores/flashcard.ts; dde768e src; The review's planner output, summarised in report Appendix D.6 (D05).

### D06 · The pager until call 3: dark or early opt-in

_Ruled at S0.2, before S8.2._

**Question.** Until call 3 is ruled, does the ported pager stay dark (visit-only '?lestur=' links), or may readers opt in through 'Lestrarstilling' before the crossover?

**Options.**

- **(a) Dark until call 3.** Everyone reads scrolled; 'Lestrarstilling' stays unrendered (S8.2). Print, second clicks, progress and the kept place stay unfixed in the crossover's lessons (report 9.3). Cost: Nothing beyond the plan as written.
- **(b) Early opt-in.** _(the review recommends this)_ S11.1–S11.3 (those four fixes, an accessible 'Lestrarstilling') and S11.5 come before S9.6. A mode is stored only when picked, the default stays scrolled, and call 1 is ruled first (S8.2; S11.5; S9.6). Cost: About 4–5 sessions (M9 goal).

**Recommendation.** The review's recommendation (8.5): early opt-in, if the crossover still fits before the May exams (at 1.5 sessions a week it moves from mid-April to about early May).

**Evidence.**

- As built, v1.1 silently switches every existing profile to paged [PED-01], as today's store saves every default on first load [CODE-05]; a store saving only chosen values comes first (S8.2 needs S6.3).
- Paging's direct evidence is null or weak (R1-04, phones excluded; R1-14; a trend, p = .066, R1-13) (report 8.3); PED-01 reads one abstract-only study as a case for offering paged, not imposing it (R1-12).
- 'Lestrarstilling' as built shows its choice by colour only, an accessibility failure (WCAG 4.1.2, Level A) [UI-03]. One class can expose large harms, not prove equivalence [PED-35].

**Measured 2026-10-17.**

- `git show dde768e:src/lib/stores/settings.ts` → :77 readingMode: 'paged'; on origin/main :108-110 write the full state on load, and `grep -c -E 'settingsVersion|chosen'` → 0.
- `git grep -l -E 'readingMode|PagedReaderControls|lestur=' origin/main -- src` → none; dde768e SettingsModal.svelte: 0 aria-pressed.
- `python3 -I v0609_timing.py` (plan estimates; 5.5 sessions by 1 Nov; assumed none 14–20 Dec, 4 over 21 Dec–3 Jan) gives 16.5 to M4, 37.25 to S9.6 and, at one a week, 15.5 supplied by January (report 9.3). At 1.5 a week S10.2's desk work ends 6 Apr; 4–5 sessions ÷ 1.5 = 2.7–3.3 weeks → 24–29 Apr (to 3 May with other break dates). Reproduced.

**Cost.** Dark: nothing extra. Opt-in: S11.1–S11.3 (1 session each) and S11.5 (1–2) move before S9.6; M11 needs 3 fewer (M9 goal).

**If ruled now.** Unblocks S8.2. Under (a), an opt-in reaches readers if call 3 rules one, in M11 (late May 2027 at 1.5 a week); under (b), S9.6 first needs S11.1–S11.3 and S11.5.

**Caveats.**

- No source dates the May exams (spring term: January–May 2027 [PED-35]); at one a week the crossover is autumn 2027 either way (M10 goal).
- The M9 goal's 'about 37 sessions' follows the opt-in sentence but excludes it (with it, 41.25–42.25).

Issues: PED-01, CODE-05, PED-35, UI-03. Sources: report 8.1, 8.3, 8.5, 9.3, B.1, B.2; register PED-01, CODE-05, PED-35, UI-03; plan Capacity, M8–M11, S8.2, S9.6, S11.1–S11.5; dde768e, origin/main settings.ts; dde768e SettingsModal.svelte.

### D07 · P1.3: what card a selection makes

_Ruled at S0.2, before S14.1._

**Question.** When P1.3 is ported, what should a selection make: v1.2's one-tap verbatim cloze, reworked; a term card; the existing 'Minniskort' dialog; or nothing yet?

**Options.**

- **(a) Reworked cloze.** Port 02c5ce9's one-tap 'Eyðukort' with its text step fixed: no '(e. …)' gloss, maths kept, Icelandic sentence splitting [CODE-11]. Cost: Not estimated.
- **(b) Term-card middle path.** _(the review recommends this)_ A tap on a key term makes 'Hvað er {term}?' (proposed); the student writes the back, then sees the definition, labelled 'Vélþýtt' (cleared chapters, D19). Other selections get a template; key-term decks follow (report 4.9; S14.2). Cost: 3.75 sessions (S14.1–S14.4).
- **(c) The 'Minniskort' dialog.** No new button: the dialog opens with the front prefilled; the student writes the back (report 4.9), then sees the definition as a standard [PED-23]. Cost: Not estimated.
- **(d) Defer.** P1.3's steps wait (M14 goal). Cost: Not estimated.

**Recommendation.** The review's recommendation (8.5; 4.9): the middle path. The reviewers ranked verbatim cloze lowest and saw the dialog as the smaller change [PED-23].

**Evidence.**

- Against verbatim cloze: fill-in-the-blank helped only the exact items (R2-22); higher-order and mixed quizzes, not fact quizzes, improved higher-order performance (R2-23); self-made cards beat premade (R2-24, secondary) [PED-23].
- For it: fill-in-the-blank had the largest classroom effect of the quiz formats compared (g = 0.773 across studies; R2-01).
- v1.2's text step: with only the Icelandic term selected, 534 of 848 key-term fronts end in a dangling '(e.'; at most 132 are clean [CODE-11].
- The glossary is machine-translated and some books lack one [PED-23]; its terms are under efni's review [PED-36]. Cards come only from a mouseup popup, so P1.3 waits for M7 [PED-36] (S14.1 needs S7.2); highlight-to-card is untested [PED-31].

**Measured 2026-10-17.**

- `node v0609_dfn_probe.mjs` (e3b29c7's buildClozeFront and block rule; jsdom; 114 numbered sections, local ② preview) → 850 dfn.term; term alone: 534 end in '(e.', 182 null; whole term: 92 '(e.', 5 null.
- `git diff --quiet 02c5ce9 e3b29c7 -- src/lib/utils/cloze.ts` → exit 0; `git grep -l Eyðukort` → e3b29c7 only (not main, dde768e).
- `git show origin/main:…` → FlashcardModal.svelte:64 front: selectedText, :130 saving needs a typed back; TextHighlighter.svelte:449 onmouseup only.
- `python3 -I` on local glossary.json → 755 terms, all defined, 691 with English; orverufraedi has none.

**Cost.** Only (b) is estimated: S14.1–S14.4 (1, 1, 0.75, 1) = 3.75 sessions.

**If ruled now.** Unblocks S14.1 (after S7.2); S14.2 and S14.4 need D19, S14.4 also D22. (b) and (c) change plan P1.3, 'Highlight → cloze card in one tap' [PED-23].

**Caveats.**

- 8.5's '4.9's (B)' is 4.9's (b); the register's (B) puts the definition on the back, a premade card PED-23 walks back.
- Counts are from efni's ② preview; CODE-11 has 848 terms, 181 null.

Issues: PED-23, CODE-11, PED-36, PED-31. Sources: report 4.9, 8.5, B.2; register PED-23, CODE-11, PED-36, PED-31; plan M7, M14, S14.1–S14.4; 02c5ce9, e3b29c7, origin/main code; local content.

### D08 · P1.1 'Kvörðun': action list, per-section half, or defer

_Ruled at S0.2, before S14.5._

**Question.** When P1.1 ('Kvörðun') is ported, does it show an action list, the list plus a relabelled per-section half, or nothing yet; and one book's cards, or all as 'Öll minniskort' (proposed)?

**What 'Kvörðun' shows.**

- **(a) Action list only.** _(the review recommends this)_ Lead with 'Kort sem komu þér á óvart' and 'Æfa þessi kort núna' (both proposed), reviewing exactly those cards; counts replace the 'Raunsætt sjálfsmat' headline [PED-09]. Cost: S14.5–S14.7: 3 sessions.
- **(b) Plus the per-section half.** Adds rows such as 'Sjálfsöryggi 100% · merkt rétt í 1 af 4 tilraunum', with no 'Ofmat', 'Vanmat' or 'Í jafnvægi' badges [PED-10]. Cost: The same 3; the plan prices (a) and (b) alike.
- **(c) Defer.** S14.5–S14.7 wait (M14 goal). Cost: Not estimated.

_Review:_ The review's final recommendation (8.5): the action list after the pilot, without the per-section half. The reviewers' own recommendation (8.5; 4.7; PED-10): keep that half, relabelled as self-assessment, with no verdicts.

**Which cards it counts.**

- **(a) All books, labelled 'Öll minniskort' (proposed) for now.** _(the review recommends this)_ The register's fix: review entries carry no book today, so the flashcard half is labelled as covering every book [PED-09]. Cost: Inside S14.5–S14.7.
- **(b) One book at a time.** Each review must record its book first; the register's verifiers disagree on how [PED-09]. Cost: Not estimated.

_Review:_ PED-09's fix (5): label it 'Öll minniskort' for now.

**Overall.** The action list (a), after the pilot, counting all books as 'Öll minniskort' for now (report 8.5; PED-09). Which pilot is meant is not stated (see the caveats).

**Evidence.**

- 'Raunsætt sjálfsmat' is plain agreement: always tapping 'Man það' at 80% recall scores the same as predictions that separate known from unknown cards by 60 points [PED-09].
- The section verdicts compare two self-reports, objective confidence and self-graded practice [PED-10]. With the standard in view, middle-school students still credited 44% of their wrong definitions, 73% without (R2-18) (report 4.7).
- 'Erfitt' is stored as wrong (quality 2, below 3), so an effortful correct recall after 'Man það' counts as 'Ofmat'; S14.6 gives it its own cell unless D04 relabels the ratings [PED-08].
- Calibration feedback and dashboards have weak, abstract-level support (R2-19, R2-20, R5-21) (report 4.7); the tab's maths is untested and its sort runs backwards [CODE-14].

**Measured 2026-10-17.**

- `node v0609_calib.mjs` (e3b29c7 CalibrationTab.svelte:27-49, :102) → always 'Man það', 80 of 100 right: 80%; 50/50 predictions, 90% vs 30% right: 80%; 'Most overconfident first' sorts −60, 0, 25, 60.
- `git show origin/main:…` → types/flashcard.ts:31 hard: 2; stores/flashcard.ts:296 wasCorrect: quality >= 3. `node v0609_srs_hard.mjs` (main's srs.ts) → 'Gott', 'Gott', 'Erfitt': 1, 6, 1 days, ease 2.18.
- `git grep -l predictedKnown origin/main -- src` → none: P0.3 is not on main yet (S4.1).

**Cost.** (a) or (b): S14.5–S14.7, 1 session each (+0.5 in S14.5 if S4.3 was cut). (c): not estimated.

**If ruled now.** Unblocks S14.5 (after S4.5) and sets its book scope. S14.6 also needs D04 and D20; S14.7 builds the per-section half only as ruled, and needs D23.

**Caveats.**

- 8.5 does not say which pilot; elsewhere 'the pilot' is the classroom pager pilot (9.6), and M14 (autumn 2027) waits for weeks of predictions.
- Holding the half back 'until a scored outcome exists' means indefinitely: every practice writer self-grades [PED-10]. Verifiers differ on per-book scoping [PED-09].

Issues: PED-09, PED-10, CODE-14, PED-08. Sources: report 4.7, 8.5, 9.6, B.2; register PED-09, PED-10, CODE-14, PED-08; plan M14, S14.5–S14.7; e3b29c7 CalibrationTab.svelte; origin/main flashcard types, store, srs.ts.

### D09 · Pilot classes and a counts-only export

_Ruled at S0.2, before S5.5._

**Question.** Should pilot classes hand in a counts-only export that students start and preview, with which fields, and may counts leave the device otherwise, given some readers are minors?

**Options.**

- **(a) Student-started export.** _(the review recommends this)_ 'Flytja út' (proposed): counts only, started and previewed by the student, sending nothing (S5.5); data reach [USER] only through exports students choose to send [PED-17]. Cost: Inside S5.5's 1.25 stretch sessions; cut second, after the compare step.
- **(b) No export.** Counters stay on the device; students read their own /greining summary in class (S5.4; report 8.2). Cost: Nothing beyond S5.4 (0.5 session).
- **(c) Automatic sending.** Counts leave without the student acting, e.g. as GoatCounter events [PED-17]; the plan excludes this (report 9.6). Cost: Not estimated.

**Recommendation.** The review's recommendation (8.5): a student-started export.

**Evidence.**

- Nothing records a prompt shown, skipped or abandoned, or a mode switch [PED-17]; S5.4 and S9.5 add those counters; switch-off counts feed a revisit of call 3 [PED-01].
- Data already leave the device: GoatCounter's count and a production build's page-view event to the editorial server; D03 rules on it before any school data sheet [PED-39].
- The register on privacy: 'the readers are minors; a data sheet for schools belongs to the teacher-integration work' and 'a privacy decision about minors' [PED-17]; 'an export to the teacher would bring in Persónuvernd's school checklist (R5)' [PED-35]; 'they are 16–20, so some but not all are' [PED-34]; R5-23 is 'Persónuvernd 2022 school checklist; abstract; not legal advice' [PED-14].
- Counters show uptake, not efficacy (report 8.2).

**Measured 2026-10-17.**

- `git grep -l -i counters origin/main -- src` → none; no recall store on main (`git ls-tree`).
- `git show origin/main:src/lib/stores/analytics.ts` → :703-726 export has reading times, sessions, streaks, daily stats, last 100 activities, goals, hourly data; no recall or flashcard data.
- `git show origin/main:…` → [bookSlug]/+layout.svelte:28 trackPageView; api.ts:30 skips without an API URL, :38 sendBeacon to /api/analytics/event; app.html:13-26 GoatCounter.
- `git ls-tree -r --name-only origin/main -- src/routes` → no privacy route; greining/+page.svelte:163-164 promise 'eyða öllum námsupplýsingum', then clear analytics only.

**Cost.** (a) shares S5.5's 1.25 sessions with the compare step and read-back; (b) nothing extra; (c) not estimated.

**If ruled now.** S5.5 and S10.1 need D09. D21 (the crossover's term, margin and consent) is ruled at S9.0; a school data sheet waits for D03 [PED-39].

**Caveats.**

- Not legal advice. R5-23 is a summary page, read as an abstract, for 'Compulsory schools and municipalities' (B.2); these readers are 16–20. KEEP-01: whether the reader stays outside ePrivacy Art. 5(3) 'was not re-assessed'.
- PED-34 corrects PED-17's 'the readers are minors' to 'some but not all', as 8.5 does.

Issues: PED-17, PED-35, PED-39, PED-01. Sources: report 4.11, 8.2, 8.5, 9.6, B.2; register PED-17, PED-35, PED-39, PED-01, PED-34, PED-14, KEEP-01; plan S5.4, S5.5, S9.5, S10.1, cut order; origin/main analytics.ts, [bookSlug]/+layout.svelte, api.ts, app.html, greining/+page.svelte.

### D10 · Does an early mark-read open the recall prompt?

_Ruled at S0.2, before S5.2._

**Question.** Should the one-time recall prompt open when a reader marks a section read by hand before its end ('Merkja sem lesið' in the toolbar, 'Merkja kafla sem lesinn' at the bottom)?

**Options.**

- **(a) Yes, as built on v1.1.** The prompt opens at once and is used up; the later section end brings none [UI-04]. Cost: Inside S5.2.
- **(b) No: mark read without the prompt; it waits for the section end.** _(the review recommends this)_ Planner output (off-repo). Once a section is read nothing re-opens the prompt, so this needs a new trigger S5.2 does not list (dde768e :172-178, :451). Cost: Not estimated (the trigger).
- **(c) A small 'Rifja upp' button.** Planner output (off-repo): after an early mark-read, the prompt opens on request. Cost: Not estimated.
- **(d) No: mark read with no prompt for that section.** The other reading of report 8.5's 'No': the section is marked read and its one-time prompt is not shown; no new trigger. Cost: Inside S5.2.

**Recommendation.** The review recommends (report 8.5): 'No'. Its planner picks (b), since 'the one-time prompt would otherwise be spent before any reading'.

**Evidence.**

- On v1.1 the prompt opens on a section's first completion from four callers: both mark-read buttons, the last 'Næsta' and scroll detection [UI-04, UI-21].
- Paged, the bottom button shows on every page; pressed on page 1 it spends the prompt before any reading [UI-04]. S9.3 hides it while the pager works, whatever D10 says (S9.3).
- That leaves the toolbar button (icon-only on phones), which UI-04 keeps opening the prompt; the prompt takes focus, probably pulling the reader to the section end (inferred) [UI-04, KEEP-05].
- The reader plan keeps manual mark-read for accessibility 'and for users who already finished and want to skip' (origin/main docs/plans/2026-04-22-screen-vs-paper-reader-plan.md:190).
- S5.2 comes before the pager (M8), so the ruling first applies in scrolled mode (S5.2, M8).

**Measured 2026-10-17.**

- dde768e section +page.svelte: prompt only `if (!wasAlreadyRead)` (:177-178); callers: toolbar :356 (label hidden below 640 px, :361), pager :442, scroll detection :450 (`enabled: !isRead && !paged`, :451), bottom :473; RecallPrompt.svelte:24-26 focuses the textarea.
- Main: 0 RecallPrompt and 0 PagedReaderControls files (`git ls-tree`); 0 'readingMode', 0 'rifjaðu upp' in src (dde768e: 12; RecallPrompt.svelte:62). Its mark-read shows 'Vel gert!' for 2 s (:158-170, :498).
- Batch D expects 'the manual button' to open the prompt (dde768e docs/manual-qa-2026-06.md:162-166).

**Cost.** S5.2 (1 session, plan) wires the ruling; (b)'s trigger and (c)'s button are not estimated.

**If ruled now.** Sets how S5.2 wires the manual mark-read ('the mark-read follows D10'). Under (b) or (c), batch D's line and the tests written for (a) need amending.

**Caveats.**

- Report 8.5's 'No' fits (b) or (d); the sources do not say which.
- UI-04's and UI-21's acceptance tests and KEEP-05's scroll test are written for (a).
- Nothing changes on the live site before S5.2: main has no prompt.

Issues: UI-04, UI-21, KEEP-05. Sources: Report 8.5, 6.2, 7; register UI-04, UI-21, KEEP-05; plan S5.2, S9.3, M8; dde768e: section page, RecallPrompt, PagedReaderControls, manual QA; origin/main: section page, reader plan; The review's planner output, summarised in report Appendix D.6 (D10).

### D18 · Recall read-back with a delete: now or later

_Ruled at S0.2, before S5.5._

**Question.** Should a student be able to see, and delete, their earlier recall for a section from the first recall release (S5.5, a stretch step aimed at the early-February 2027 recall train), or only once P2.3's recall-review tab exists?

**Options.**

- **(a) Now, in S5.5.** _(the review recommends this)_ After a new save, show the section's earlier entry with 'Eyða' (proposed). S5.5's export stays counts-only (D09). Cost: Inside S5.5's 1.25 sessions (stretch); not estimated alone.
- **(b) Now, plus a download of one's own recalls.** As (a), plus a student-started Markdown file of their recall text [CODE-24, PED-39]. No plan step has it. Cost: Not estimated.
- **(c) Later, with P2.3.** Until then a student cannot see a saved recall, and can delete one only by erasing everything (S3.2) or clearing the browser's site data. Cost: None now; P2.3 not estimated.

**Recommendation.** The review's recommendation (8.5): 'Now', as S5.5's third chunk; the full list waits for P2 (plan, 'Deferred').

**Evidence.**

- On v1.1 nothing in the app shows, deletes or exports a saved recall, though the store has removeEntry and reset; as students may share school computers, CODE-24 pairs any read-back with a per-entry delete [CODE-24] (dde768e:src/lib/stores/recall.ts:95-116).
- After 'Vista upprifjun' the prompt closes after 1.2 s and the entry never shows again [PED-19] (dde768e:src/lib/components/RecallPrompt.svelte:33).
- Main's 'Hreinsa gögn' asks to erase all study data but clears analytics only; S3.2 adds a real erase (main:src/routes/[bookSlug]/greining/+page.svelte:163-164; S3.2).
- Show the earlier entry only after the new attempt, or the prompt turns into rereading [PED-19, PED-28].

**Measured 2026-10-17.**

- git grep -nE 'removeEntry|getForSection|getForBook|recallEntryCount' dde768e -- src, tests and recall.ts excluded → 0 lines (control: recall.test.ts → 4)
- git grep -n recallStore dde768e -- src, same exclusions → RecallPrompt.svelte:9, :30 (addEntry) only; stores/index.ts names recall 0 times (control: 10 exports of other stores)
- git show dde768e:src/lib/components/RecallPrompt.svelte → :33 setTimeout(() => onclose?.(), 1200); clearTimeout 0 times
- origin/main 0cdeab0: no stores/recall.ts; git grep clearAllStorage -- src → definition only (storageMigration.ts:97); greining/+page.svelte:163-164 → confirm, then analyticsStore.clearAllData() only

**Cost.** S5.5: 1.25 sessions (stretch) for four chunks; no share is given for the read-back alone.

**If ruled now.** (a) or (b) keeps S5.5's read-back chunk, on a selector that reads $recallStore (S5.1 drops the get()-based getters) [CODE-24]; (b) adds an unplanned download; (c) drops the chunk. S5.5 also waits on D19 and D09.

**Caveats.**

- CODE-24 stages the read-back 'after release', assuming it waits for P2.3; 8.5 says 'Now'.
- PED-36 sits in 8.5's joint D18/D19 row; it bears on D19 (S14.4), not on this timing.
- The cut order drops S5.5's compare step, then its counts export; it does not name the read-back.

Issues: CODE-24, PED-19, PED-36. Sources: report 4.4, 5.4, 8.5; register CODE-24, PED-19, PED-28, PED-36, PED-39; plan M5, S3.2, S5.1, S5.5, S5.6, cut order, 'Deferred'; dde768e: stores/recall.ts, stores/index.ts, components/RecallPrompt.svelte; origin/main: greining/+page.svelte, utils/storageMigration.ts.

### D19 · Chapters cleared for machine-translated standards

_Ruled at S0.2, before S5.5._

**Question.** Where may machine-translated text be the standard students check themselves against: Samantekt (summary) sentences after a recall (S5.5), and later glossary definitions on term cards and decks (S14.2, S14.4)? If you choose (b), say in the note who clears a chapter and on what evidence, for example efni's H6 answer or your terminology review.

**Options.**

- **(a) Reviewed only.** Summary page human-reviewed, which needs the whole chapter. None today. Cost: None.
- **(b) Reviewed, or checked by [USER].** _(the review recommends this)_ Plus chapters [USER] clears after the terminology review, listed by hand in readerPolicy, labelled 'Vélþýtt'. Cost: Inside S5.5 (1.25 sessions, stretch); [USER]'s checks not estimated.
- **(c) Every chapter, labelled 'Vélþýtt'.** PED-19's original fix. Cost: Inside S5.5.
- **(d) None yet.** No machine-translated standard; bounded recall only (report 9.4). Cost: None.

**Recommendation.** The review's (8.5): 'reviewed or checked only'. PED-05: the summaries are not yet a safe standard; gate any compare step on efni's terminology pass.

**Evidence.**

- Preview content: §1.5 defines 'nákvæmni (e. accuracy)', but its Samantekt uses 'nákvæmni' for precision [PED-05] (preview chapters/01, measured today).
- Live too: §1.3's Samantekt calls intensive properties 'Eðliseiginleikar', the section's own word for physical properties (live chapters/01/1-summary.html, fetched today).
- All 114 numbered sections have their own Samantekt block, keyed by module id [PED-19] (preview content, measured today).
- A standard in view cut the wrong definitions middle-school students credited from 73% to 44% (R2-18, abstract); fluent but wrong MT drew less distrust than disfluent MT (R4-24, abstract) (report 4.4, 4.11).

**Measured 2026-10-17.**

- origin/main, dde768e, e3b29c7: git cat-file -e src/lib/utils/readerPolicy.ts → absent; git grep -E 'compareStepChapters|summary-section' -- src → 0 (control 'Vista upprifjun': 1 on dde768e)
- origin/main:scripts/generate-toc.js:259-278 → a summary counts as reviewed only when its whole chapter is faithful
- curl namsbokasafn.is/content/efnafraedi-2e/toc.json → 200; reviewed 4 of 216 (1-0, 1.1, 3-0, 3.1), summaries 0 of 21; preview toc.json (efni ② 48dbbb7a2) → 0 of 216
- Preview 1-5, 1-summary.html → <dfn> 'nákvæmni (e. accuracy)'; Samantekt 'nákvæmni (breytileiki milli endurtekinna mæliniðurstaðna)'; 114 of 114 summary-<module id> blocks
- Live 1-5, 1-3, 1-summary.html → §1.5 Samantekt matches <dfn> 'nákvæmni (e. precision)'; §1.3 <dfn> 'Eðliseiginleiki (e. physical property)', Samantekt 'Eðliseiginleikar eru ekki háðir magni efnisins'

**Cost.** Inside S5.5 (1.25 sessions, stretch); (b)'s per-chapter checks not estimated.

**If ruled now.** (a)–(c) fill compareStepChapters (S5.5) and set the rule for term cards (S14.2) and decks (S14.4); (d) drops S5.5's compare chunk. Any clearing waits for efni's H6 answer.

**Caveats.**

- (a) clears nothing today; [USER] has ruled the old reviewed pages retired (main:CLAUDE.md:660).
- UI-09 calls live chemistry unreviewed; live toc.json marks 4 pages reviewed, no summary.
- 'Checked' is undefined; the plan says chapters '[USER] has cleared' (report 9.5, rule 12).
- PED-05's 'not live today' is about §1.5; the live §1.3 drift is this brief's own measurement.

Issues: PED-05, PED-23, PED-19, PED-36. Sources: report 4.4, 4.11, 8.5, 9.4, 9.5; register PED-05, PED-19, PED-23, PED-36, PED-39, UI-09; plan S5.5, S14.2, S14.4, H6; origin/main: generate-toc.js, CLAUDE.md, H6 handoff; toc.json, chapters/01: preview and live.

### D20 · Who checks new Icelandic strings

_Ruled at S0.2, before S1.3._

**Question.** Who checks new and changed Icelandic UI strings before they ship, and when: in each PR, or as one batch before each deploy?

**Options.**

- **(a) [USER], in each PR.** Planner output (off-repo): a PR that adds or changes Icelandic text is checked before it merges. Cost: Not estimated.
- **(b) A batch before each train.** Planner output (off-repo): strings merge marked 'proposed' and are checked together before the deploy that ships them. Cost: Not estimated.
- **(c) Per PR for one to three strings, else a batch.** The planner's suggestion as an option; strings stay 'proposed' until checked. Cost: Not estimated.

**Recommendation.** The review recommends (report 8.5): '[USER], per PR or per deploy'. It names the checker and leaves the timing open; its planner suggests (c).

**Evidence.**

- Strings the review marks '(proposed)' are not in the code; each needs a native-speaker check (report 4.2).
- Fixes to live strings need it too: the bionic setting promises easier reading where every recent test found no benefit or a cost [PED-27]; /greining's confirm says all study data is erased when only analytics is [PED-14]; the selection popup's aria-label looks misspelt [UI-13].
- New copy waits on the check: the recall prompt's wording [PED-18] and first-use explainers, whose rationale lines may claim only what the evidence supports [PED-25].
- 18 plan steps name D20 under 'Decide first', from S1.3 (train 1, week of 2 November) to SF.4 (plan).
- All UI text, aria-labels and error messages are Icelandic (origin/main CLAUDE.md:101-103).

**Measured 2026-10-17.**

- `git grep -n -E 'Hraðlestur|auðvelda lestur|Letur hannað fyrir lesblinda|Valmoguleikar|öllum námsupplýsingum' origin/main -- src` → SettingsModal.svelte:39, :365, :368; SelectionPopup.svelte:72 ('Valmoguleikar yfirstrokunar'); greining/+page.svelte:163. 'Valmöguleikar': 0 hits.
- awk over the plan's step headings and 'Decide first' lines: 18 steps name D20 (S1.3, S3.2, S3.3, S4.2, S4.3, S5.3, S5.4, S7.1, S9.3, S11.3, S11.5, S11.6, S12.1, S12.2, S13.2, S13.4, S14.6, SF.4).

**Cost.** Not estimated: no plan step or register entry costs the checking.

**If ruled now.** Unblocks S1.3 (0.75 session, week of 2 November, train 1, with the reworded bionic and OpenDyslexic labels) and sets the routine for the 17 later steps that name D20.

**Caveats.**

- Section 8.5 does not pick per PR or per deploy; all three options and 'proposed until checked' are the planner's (off-repo).
- No source names a checker other than [USER].
- PED-27 also asks for a copy review of claims; the sources do not say whether the language check covers it.

Issues: PED-27, PED-18, PED-25, PED-14, UI-13. Sources: Report 8.5, 4.2; register PED-27, PED-18, PED-25, PED-14, UI-13; plan S1.3 and every step's 'Decide first' line; origin/main 0cdeab0: SettingsModal.svelte, SelectionPopup.svelte, greining/+page.svelte, CLAUDE.md; The review's planner output, summarised in report Appendix D.6 (D20).

### KEEP-01 · Reword CLAUDE.md's design principle

_Ruled at S0.2, before None._

**Question.** CLAUDE.md calls pre-questions, recall prompts, predict-first ratings and pagination 'deliberate learning interventions backed by the testing-effect literature' and says 'don't "streamline" them away as friction'. Should it say instead: keep the interventions, and make them skippable, faded and measured?

**Options.**

- **(a) Reword as the review suggests.** _(the review recommends this)_ Replace the 'backed by' claim with that sentence: delivery may change, removal may not (report 4.2; rule 15, report 9.5). Cost: Not estimated; [USER]'s edit, ruled within S0.2 (1 session for the step).
- **(b) Keep today's wording.** CLAUDE.md stays as it is; KEEP-01's four rules still go into the reader plan. Cost: Not estimated (no edit).
- **(c) Reword and add the four rules.** As (a), plus: every prompt skippable in one tap, nothing gated on a prompt, no completion-contingent rewards, no peer comparison [KEEP-01]. Cost: Not estimated.

**Recommendation.** The review's suggested wording: 'keep the interventions, and make them skippable, faded and measured' (report B.1, R5 row 1). KEEP-01's decision line has the edit carry rules (1)–(4), i.e. (c).

**Evidence.**

- The citation audit rates the principle 'partly' accurate: the literature backs answered retrieval, not an objective-statement pre-question or pagination (report 4.2; B.1, R5 row 1).
- About half of the prompts shown led to the intended activity (R5-06, full text, 70 German undergraduates).
- Fixed prompts over a term lost their advantage; faded ones kept it (R5-05, full text, first-semester psychology students).
- Non-skippable prompts limited low performers' transfer (R5-07, full text, 72 German sixth graders) [KEEP-01].
- Dropping cards had small but consistent costs (R2-15, abstract); completion-contingent rewards lowered intrinsic motivation, d = −0.36 (R5-18, abstract) [KEEP-01].

**Measured 2026-10-17.**

- git show origin/main:CLAUDE.md: line 9 holds the principle as quoted.
- git cat-file -e, git grep: RecallPrompt, PreQuestionPrompt, PagedReaderControls and predictAndFlip are absent on main; dde768e has all but the pre-question, which only origin/feature/reader-v1.2 (e3b29c7) has.
- One-tap exits: dde768e RecallPrompt.svelte:79-84 'Sleppa'; v1.2 PreQuestionPrompt.svelte:52-57 'Ég hugleiddi þetta — byrja að lesa'; dde768e minniskort/+page.svelte:213-217, both predict buttons call predictAndFlip.
- Main's reader plan (docs/plans/2026-04-22-screen-vs-paper-reader-plan.md) states none of the four rules (grep for skip, gate, reward, badge, peer, social, compare: only unrelated hits; control 'recall': 6).

**Cost.** Not estimated separately; ruled in S0.2's decision session (1 session for the whole step).

**If ruled now.** No step waits on it; its data rule waits on D03. A reword carries rule 15 into the file that guides every Claude Code session here (main:CLAUDE.md:3). S0.2's files omit CLAUDE.md, so the edit is [USER]'s (KEEP-01).

**Caveats.**

- No study tests 16–20-year-olds reading chemistry on phones (report 4.2); the prompt studies are of undergraduates and sixth graders.
- 'Faded' and 'measured' are not built: no counters exist [PED-17] (S5.4 adds them), and fading is only proposed under calls 2 and 4 (report 8.2, 8.4). D03's undefined 'guardrails' may overlap (c).

Issues: KEEP-01. Sources: Register KEEP-01; Report 4.2, 8.2, 8.4, 9.5, B.1, B.2; Plan S0.2, S5.4; origin/main: CLAUDE.md, docs/plans/2026-04-22-screen-vs-paper-reader-plan.md; dde768e, origin/feature/reader-v1.2: RecallPrompt.svelte, PreQuestionPrompt.svelte, minniskort/+page.svelte.

## Open calls (ruled later unless [USER] rules early)

### CALL1 · Page-height budget

_Ruled at S9.6, before S10.1, or S9.6 under D06's early opt-in._

**Question.** How much of the screen may a paged page fill, and so how many lines does it hold?

**Options.**

- **(a) Maximise usable lines.** _(the review recommends this)_ Step 1, code only, removes the artefacts (about 67–68% of the screen on phone and desktop, 78% on tablet). Step 2 drops the 76 px clearance (about 77%), only after the floating chrome is docked, or it covers 'Næsta' [UI-12]. Cost: Inside S9.5.
- **(b) A fixed share.** Such as 60%, after step 1. Cost: A constant.
- **(c) Similar lines on every device.** About the same line count on phone, tablet and desktop. Cost: A per-device rule.
- **(d) Today's 53–67%.** In the preview content, 9–14 lines a page and 34 pages for §1.2 on phone and desktop. Cost: None.

**Recommendation.** The review recommends (a), step 1 first, judged by lines per page rather than tuned for learning; figures go through the lightbox. Rule after reading on the dark pager (live, link-only; S9.6), before S10.1.

**Evidence.**

- A page may fill 53% (1280×800), 61% (390×844) or 67% (768×1024) of the screen, so desktop pages hold 9.2–10.6 lines, phone pages 12.3–13.9 [UI-08].
- About 80–103 px of each page is code artefact, not chrome [UI-08].
- Pages break only between blocks, so average fill tops out near 58–59%; 100 px more joins only 3 of 18 split phone figure pairs [UI-08, PED-03].
- The 8 measured worked examples (§3.1) are taller than the whole screen on phone and at 1280×800, so no budget fits them there [PED-02].
- Window height showed no comprehension effect, though small windows cost page handling (R1-17, review, full text; R1-18, abstract; adults at desktops).

**Measured 2026-10-17.**

- git show dde768e:…/PagedReaderControls.svelte | grep -n 'OFFSET\|CLEARANCE\|96' → :64 SCROLL_OFFSET 96, :68 BOTTOM_CLEARANCE 76, :87-88 max(240, innerHeight − 96 − gapAbove − gapBelow − 76), :172 a second literal 96.
- python3 -I, that formula with UI-08's gaps → 427/514/683 px = 53/61/67%.
- git cat-file -e origin/main:…/PagedReaderControls.svelte → absent (dde768e: present); grep -n 260 docs/manual-qa-2026-06.md → stale 'viewport − 260 px' at main:204, dde768e:212.

**Cost.** (a) inside S9.5 (1 session); (b) and (c) not estimated in sessions; (d) none. [USER]'s reading is part of S9.6 (1 session).

**If ruled now.** S9.5 sets PAGE_BUDGET from one exported constant; a ruling after S9.6 ships as a small deploy before S10.1. S10.1 and S11.6 wait on it, and it sets how far D12's figure rule can reach [PED-03]. Ruling 1 holds regardless [UI-08].

**Caveats.**

- Gaps, lines and pages are from the review's browser capture (preview content); only constants and arithmetic were re-checked.
- D06 (ruled at S0.2) sets the gate. M9: about late March 2027 at 1.5 sessions a week, late May at one.

Issues: UI-08, UI-12, PED-03, PED-02. Sources: report 8.1, 8.5, 6.2, B.2; register UI-08, UI-12, PED-03, PED-02; plan S9.5, S9.6, S10.1, S11.6, M9; dde768e, origin/main.

### CALL2 · Recall per section or sub-section

_Ruled at S10.2, before S11.4._

**Question.** Does recall come once per section, or after each sub-section? (Extra: an authored sub-section check question, needing efni questions, H10.)

**Options.**

- **(a) Per section, as built.** _(the review recommends this)_ A separate type gate keeps it off rollups, introductions and the Formáli [PED-04]. Cost: An erratum to plan line 189 and criterion 6.
- **(b) Per sub-section, guarded.** Units of 400+ words, at most 2 per section, none after the last, footnote or title-only unit, faded after 3 saves or skips; about 125 units (preview content); paged only. Cost: +2–3 sessions, +1–2 for scrolled mode.
- **(c) (a) plus a one-class pilot of (b).** After the crossover (a paged-vs-scrolled class trial), so it cannot bend that result; a one-time link flags each pilot device (S11.7). Cost: (b)'s prompt, paged only, plus that switch.

**Recommendation.** The review recommends (a), made stronger rather than more frequent: the gated, accessible section-end prompt plus the compare step against the section's Samantekt in cleared chapters (D19). If [USER] wants interim recall too, (c), so one class's counters show its uptake first; if (a) stands, record the erratum. Rule at S10.2, after 4–6 weeks of counters.

**Evidence.**

- Plan line 189 and criterion 6 ask for per sub-section; the build prompts once per section, its per-unit hook unwired [PED-16].
- Interim tests helped recall of later sections (R2-03, abstract, lab); identical weekly prompts lost their effect while faded ones kept it (R5-05, full text, university), though fading did not change STEM scaffolding (R5-02, abstract).
- Between studies, free recall was the weakest classroom quiz format and feedback raised effects (R2-01, full text); a standard made middle-schoolers' self-scores more accurate (R2-18, abstract).
- Units exist only in paged mode; 172 of 428 already hold a Check-your-learning question [PED-16].

**Measured 2026-10-17.**

- git show dde768e:…/[sectionSlug]/+page.svelte → :171-180 prompt on first completion, no type gate; :442 omits onsubsectioncomplete, which the pager calls at :217.
- sed -n '189p;275p' of the reader plan on origin/main and dde768e → both say per sub-section.
- node + jsdom, dde768e's buildUnits over local preview chapters → 428 units, 172 with a Check-your-learning answer; 157 of 400+ words, not last, 125 after the cap (also under the footnote/title guards).

**Cost.** (a) a chunk of S11.4 (1 session); (b) S11.7: 2–3 sessions paged, +1–2 scrolled; (c) S11.7's paged prompt and pilot chunk (2–3); authored extra not estimated.

**If ruled now.** S11.4 applies it: the erratum for (a), S11.7 first for (b) or (c). M5's prompt ships regardless.

**Caveats.**

- The 'stronger' half needs D19's compare step, a stretch item cut first (S5.5); counters show uptake, not efficacy (report 8.2).
- S10.2: mid-April 2027 at 1.5 sessions a week, autumn 2027 at one (M10).

Issues: PED-16, PED-04, PED-19, PED-24, PED-17. Sources: report 8.2, 4.4, B.2; register PED-16, PED-04, PED-19, PED-24, PED-17; plan S5.5, S10.2, S11.4, S11.7, M10; dde768e, origin/main, preview content.

### CALL3 · Launch default reading mode

_Ruled at S10.2, before S11.4._

**Question.** What do new and existing profiles get on deploy? As built, v1.1 silently switches every existing profile to paged [PED-01].

**Options.**

- **(a) Scrolled for all.** 'Síðuskipt' one tap away; stored only when picked. Cost: +1–2 sessions in S11.4.
- **(b) Paged for all.** Every profile, new and existing. Cost: +4–6 sessions (a notice naming 'Samfellt skrun', the figure rule, lazy images).
- **(c) Paged for new profiles only.** Through S6.1's profile-age marker. Cost: As (b); realistically autumn 2027.
- **(d) A viewport rule.** Height or aspect, never width: 1280×800 pages hold 9–11 lines, phones 12–14 [PED-01]. Cost: Not estimated.

**Recommendation.** The review recommends deciding after the crossover (each student reads one section paged, one scrolled), by a rule fixed before it: (b) or (c) only if paged is not worse on main-idea or detail items, or on calibration, within the margin, and fewer than half of students switch it off; otherwise (a). Until then nobody's mode changes; if a default is needed sooner, (a), with a line naming both modes. Rule at S10.2.

**Evidence.**

- For paging: e-reader convention [PED-01]; a trend (p = .066) towards better integrated understanding, though scrolling was more enjoyable on tablets (R1-13, full text, university students).
- No difference across studies, phones excluded (R1-04, full text), or on phones for adult crowdworkers (R1-14, full text).
- The plan's '0.35–0.48 → 0.03–0.12' is an untested contrast; its authors say their findings may be limited to college students (R1-05, full text).
- Defaults tend to stick (d = 0.68, not reading-specific; R6-23, abstract).
- Paging's costs: worked examples taller than a page [PED-02], split figures [PED-03], table swipes turning the page (emulated) [CODE-09], say-all skipping later pages (inferred) [UI-05].

**Measured 2026-10-17.**

- git show dde768e:src/lib/stores/settings.ts → :77 readingMode 'paged' (:73-74 'highest-evidence intervention'); :118-122 saves the full state; storeValidation.ts:46 keeps defaults for missing keys.
- git grep -n setReadingMode dde768e -- src → one caller, SettingsModal.svelte:313.
- git grep -l readingMode origin/main -- src → 0 files (dde768e: 4); no readerPolicy.ts or settingsMigration.ts on main, so S6.1's marker is unbuilt.

**Cost.** (a) +1–2 sessions (S11.5); (b), (c) +4–6 (S11.6); (d) not estimated; S11.4 is 1 session. A paged default before the crossover adds 4–6 first.

**If ruled now.** S11.4 pins the ruling in a test, after S11.5 for (a) or S11.6 for (b)/(c), which also needs call 1, D12, D20 and efni's image sizes (H1). Until then S8.2 keeps unchosen profiles scrolled [CODE-05].

**Caveats.**

- One class can expose large harm, not prove equivalence [PED-35].
- Crossover: mid-April 2027 at 1.5 sessions a week, autumn 2027 at one (M10); D06's early opt-in moves S11.5 before S9.6 (M9).
- No study tests 16–20-year-olds reading chemistry on phones (report 8).

Issues: PED-01, PED-35, PED-02, PED-03, CODE-09, UI-05, CODE-05. Sources: report 8.3, 4.6, B.2; register PED-01, PED-35, PED-02, PED-03, CODE-09, UI-05, CODE-05; plan S8.2, S11.4–S11.6, M9, M10; dde768e, origin/main.

### CALL4 · How often the pre-question appears

_Ruled at S12.0 (with D16), before S13.1._

**Question.** How often does the pre-question card appear? Fading after 3 skips or 3 'Veit ekki' (proposed) in a row, deep-link arrival and a Settings choice (D17) belong here too.

**Options.**

- **(a) First visit per section.** Each unread section with a real question, remembered by module id. Cost: A record by module id.
- **(b) Every visit until read.** v1.2's design. Cost: None.
- **(c) First visit, capped.** _(the review recommends this)_ At most one card a calendar day or study session ([USER] picks; a session needs a backend-free definition, e.g. a browser tab); skipped sections stay eligible. Cost: As (a), plus a date or session check.
- **(d) First section per chapter.** The x.0 introduction (efni writes its question, H8) or the first numbered section; [USER] picks. Cost: efni work for introductions.

**Recommendation.** The review recommends (c) for the first weeks, only where a real question with a key answer exists, one tap to skip, revisited after 4–6 weeks of counters: a pilot hedge, since other sections read that day or session miss the benefit. vefur adds no page-type filter. Decide before S13.1, with D16.

**Evidence.**

- v1.2's card returns on every visit until the section is read; main gives 133 of 216 chapter pages objectives (preview), so an unchanged port goes live on its first deploy [PED-06].
- Benefit only on asked content: teenagers g = 0.51 vs 0.08 on the rest, 1.25 with feedback vs 0.60 without (R3-13, full text); 0.54 vs 0.04 (R2-09, abstract, mostly lab adults).
- Limits: repeated prompts lost their effect over a term (R5-05); pretests raised online-course dropout (R2-08, review); response prompts limited low performers' transfer (R5-07, 6th graders).
- A card needs a question from D16's source: all 114 sections have an answered exercise, 60 a conceptual one [PED-07].

**Measured 2026-10-17.**

- git show origin/feature/reader-v1.2:…/+page.svelte → :103-107 'first visits only' over a gate of unread + objectives; :427 dismissal not stored; 9b74bb2: 'revisits pose the same question'.
- origin/main: no PreQuestionPrompt.svelte; process-content.js:116, :157 copy objectives (v1.2:130 writes []).
- python3 -I, local toc.json → 133 of 216 chapter pages carry objectives; exercise pages → 873 of 1,736 answered, 114/114 sections with one.

**Cost.** Not estimated in sessions ((b) none; (d) efni work); S13.3, which encodes any ruling, is 0.75 session.

**If ruled now.** With D16 it unblocks S13.1 and S13.3 (one tested rule; 'posed' stored by module id only if frequency is limited). S13.4 adds counters and, if limited, dates a 4–6-week revisit.

**Caveats.**

- Three of PED-06's four reviewers preferred (a); PED-06 and PED-24 warn a cap forfeits the benefit for skipped sections.
- Under v1.2's objective form, 'real question' reads 'objective'. P1.2: June 2027 at the earliest (plan M13).

Issues: PED-06, PED-07, PED-24, PED-17. Sources: report 8.4, 8.5, 4.8, B.2; register PED-06, PED-07, PED-24, PED-17; plan S12.0, S13.1, S13.3, S13.4, M13; v1.2, origin/main, preview content.

## Ruled at later decision sessions

### D11 · Keys and oversized worked examples

_Ruled at S9.0, before S9.1._

**Question.** How should paged mode handle a worked example taller than the screen? And may Space and PageDown scroll a tall page before turning it?

**Options.**

- **(a) Split at safe boundaries.** [PED-02]. Cost: Not estimated.
- **(b) Let the unit scroll.** [PED-02]. Cost: Not estimated.
- **(c) Trial the 'Lausn' break.** _(the review recommends this)_ One break before the check-your-learning part, as an experiment [PED-02]. Cost: Not estimated.
- **(d) Keys: scroll before turning.** Changes the reader plan's keyboard spec (line 170) [CODE-06]. Cost: Inside S9.1.
- **(e) Keys: turn as specified.** [CODE-06]. Cost: None.

**Recommendation.** The review's (8.5): keys scroll first (d); trial the 'Lausn' break on §3.1 in batch E, else let the unit scroll. The reviewers recommended (a) or (b), with the break only as an experiment (6.2).

- By the code, Space and PageDown skip the unseen rest of a tall page, whatever the example policy [CODE-06].

Issues: CODE-06, PED-02, PED-26.

### D12 · A title on every page; figures and their text

_Ruled at S9.0, before S9.2._

**Question.** Does the section title stay visible on every paged page (UI-19 measured its cost at 29–58 px a page), and is the lightbox enough for figures split from the paragraph that cites them?

**Options.**

- **(a) Running title; lightbox only.** _(the review recommends this)_ [UI-19, UI-09, PED-03]. Cost: Not estimated.
- **(b) Running title; lightbox plus a keep-together rule.** [PED-03]. Cost: More than S9.4's 1 session; not estimated.
- **(c) Title kept for screen readers only; lightbox.** The h1 stays in the page but hidden from sight [UI-05, UI-19]. Cost: Not estimated.

**Recommendation.** The review's (8.5): a title on every page, the lightbox. PED-03's reviewers wanted the lightbox first, then a keep-with-figure flag with a capped figure or thumbnail.

Issues: UI-19, UI-05, UI-09, PED-03.

### D13 · Continue-reading, find-in-page, the page label

_Ruled at S9.0, before S11.1._

**Question.** In paged mode, does a return visit restore the saved page or offer it, how does find-in-page reach other pages, and does the label keep the spec's format?

**Options.**

- **(a) Offer the page; 'until-found'; the spec's label.** _(the review recommends this)_ 'Halda áfram' (existing) / 'Byrja á byrjun' (new; native-speaker check); 'until-found' lets the browser's find open a hidden page [CODE-07, CODE-08, UI-29]. Cost: Not estimated.
- **(b) Restore the page directly.** [CODE-07]. Cost: Not estimated.
- **(c) A section search box.** [CODE-08]. Cost: Not estimated.
- **(d) An overall page count.** [UI-29]. Cost: Not estimated.

**Recommendation.** The review's (8.5): offer the page, 'until-found', the spec's label.

Issues: CODE-07, CODE-08, UI-29.

### D14 · Atkinson family and font caching

_Ruled at S12.0, before S12.2._

**Question.** Does P1.4 ship the original Atkinson Hyperlegible 1.006 that v1.2 carries or the Next family the plan names, and are opt-in fonts precached for every visitor or fetched when first used?

**Options.**

- **(a) 1.006, fetched at runtime.** _(the review recommends this)_ [CODE-30]. Cost: Not estimated.
- **(b) Next, fetched at runtime.** [CODE-30]. Cost: Not estimated.
- **(c) Either family, precached as today.** Every visitor's install would fetch 97,040 B more (+22.2% font bytes) for 1.006 [CODE-30]. Cost: Not estimated.

**Recommendation.** The review's (8.5): 1.006 at runtime.

- Neither family has a reading or legibility study, so it is a design choice (R4-09) [CODE-30].

Issues: CODE-30, CODE-12, KEEP-09.

### D15 · Theme when unchosen; the chrome typeface

_Ruled at S12.0, before S12.3._

**Question.** When a reader never chose a theme, does it follow the operating system, for new profiles only or existing ones too? Which face do menus and buttons use?

**Options.**

- **(a) OS theme for new profiles; Bricolage.** _(the review recommends this)_ Bricolage is the heading font [UI-22, UI-23]. Cost: Not estimated.
- **(b) Existing profiles follow the OS once.** Overrides readers who chose light [UI-22]. Cost: Not estimated.
- **(c) OS on first visit only.** P1.4 as specified [UI-22]. Cost: Not estimated.
- **(d) Menus and buttons in Literata.** The body font [UI-23]. Cost: Not estimated.

**Recommendation.** The review's (8.5): OS theme for new profiles, Bricolage.

Issues: UI-22, UI-23, KEEP-09.

### D16 · The pre-question's form, source, guess and placement

_Ruled at S12.0, before S13.1._

**Question.** Where does the pre-question come from, does the student guess, and where does the card sit in paged mode? Ruled with call 4.

**Options.**

- **(a) An exercise tagged by efni.** _(the review recommends this)_ H8 [PED-07]. Cost: efni's tagging not estimated.
- **(b) An exercise picked by vefur, with a human pass.** [PED-07]. Cost: Not estimated.
- **(c) An efni-written multiple-choice question.** About 114 items [PED-07]. Cost: Not estimated.
- **(d) The objective under the content's own stem.** Interim: 'Í lok þessa kafla muntu geta:' plus an attempt prompt; needs H2 synced first [PED-07] (S13.4). Cost: Not estimated.

**Recommendation.** The review's (8.5): a real question tagged by efni, an optional guess, in place of page 1.

- The benefit is specific to the asked item (R2-09, abstract); objectives turned into questions beat objective statements (R2-10, full text) [PED-07].

Issues: PED-07, CODE-13, PED-21, PED-06.

### D17 · Student controls and fading

_Ruled at S12.0, before S13.3._

**Question.** Do students get settings for the prompts, and should any prompt fade?

**Options.**

- **(a) No controls until calls 2 and 4.** _(the review recommends this)_ One-tap skipping stays [PED-24]. Cost: None.
- **(b) A settings group now.** [PED-24]. Cost: Not estimated.
- **(c) Trial a fading rule.** e.g. the pre-question after 3 skips (8.4), or recall at chapter end after 3 saves [PED-24]. Cost: Pre-question fading inside S13.3; recall fading not estimated.

**Recommendation.** The review's (8.5): no controls until calls 2 and 4.

- Identical weekly prompts lost their effect in one university study (R5-05); fading did not change STEM scaffolding effects in a meta-analysis (R5-02, abstract) [PED-24].

Issues: PED-24, PED-06.

### D21 · The crossover's term, margin and consent

_Ruled at S9.0, before S10.1._

**Question.** When does the in-class paged-versus-scrolled crossover run, what rule and margin decide 'not worse', and is consent needed?

**Options.**

- **(a) The first term M9 is ready.** _(the review recommends this)_ Mid-April 2027 at 1.5 sessions a week; autumn 2027 at one (plan M10). Cost: S10.1 (0.75) and S10.2 (0.5 plus the lessons).
- **(b) A later term [USER] names.** Call 3 waits. Cost: The same steps, later.

**Recommendation.** The review's (8.5): the first term M9 is ready. PED-35 and S10.1 add: fix the rule and margin in writing first (e.g. paged at most 1 of 3 main-idea items worse on average); get consent if results will be published.

- One class with three main-idea items can expose large harms, not prove equivalence [PED-35].

Issues: PED-35, PED-01.

### D22 · Key-term starter decks: per book or shared

_Ruled at S12.0, before S14.4._

**Question.** Do the ready-made key-term decks belong to their book, or sit in one list shared across books?

**Options.**

- **(a) Per book.** _(the review recommends this)_ Each book's decks stay with it. Cost: Inside S14.4.
- **(b) Shared.** As /minniskort lists every deck today. Cost: Inside S14.4.

**Recommendation.** The review's (8.5): per book.

- Self-made cards beat premade ones (R2-24, secondary), so ready-made decks trade generation for reach [PED-36].

Issues: PED-36, CODE-14.

### D23 · Retiring the v1.2 branch

_Ruled at S12.0, before S14.7._

**Question.** Once P1 is ported, is feature/reader-v1.2 retired?

**Options.**

- **(a) Tag e3b29c7, then delete the branch.** _(the review recommends this)_ Proposed tag 'reader-v1.2-port-source'. Cost: Inside S14.7.
- **(b) Keep the branch.** Leave it as is. Cost: None.

**Recommendation.** The review's (8.5): delete after tagging e3b29c7.

- v1.2's June copy of P0 is superseded and broken against today's markup [CODE-04].

Issues: CODE-04.

### D24 · Streaks behind 'Halda röð daga'

_Ruled at S12.0, before SF.4._

**Question.** Do streak displays show only when a student turns on the 'Halda röð daga' goal?

**Options.**

- **(a) Opt-in.** _(the review recommends this)_ A 14-day line such as 'Þú hefur æft {n} af síðustu 14 dögum' (proposed) replaces the deck line. Cost: SF.4: 0.75 session, in chunks.
- **(b) As today.** On by default. Cost: None.

**Recommendation.** The review's (8.5): opt-in.

- The European Commission's 2025 guidance for minors recommends streaks off by default: a benchmark, not an obligation (R5-25) [PED-30].

Issues: PED-30.

### D25 · Later scope after the crossover

_Ruled at S10.2, before after S10.2._

**Question.** After the crossover, which new-scope item is built first?

**Options.**

- **(a) Attempt-first practice.** _(the review recommends this)_ [PED-22]. Cost: Not estimated.
- **(b) Interleaved chapter practice.** [PED-37]. Cost: Not estimated.
- **(c) A delayed re-recall.** [PED-28]. Cost: Not estimated.
- **(d) Read-aloud.** After a survey of voices [PED-40]. Cost: Not estimated.
- **(e) The feature-box experiment.** [PED-32]. Cost: Not estimated.
- **(f) The P3 AI tutor.** A decision record first [PED-34]. Cost: 8–12 sessions [PED-34].

**Recommendation.** The review's (8.5): attempt-first first, the likely first build after the pilot (plan, 'Deferred').

- Elaborated feedback scored 0.49, showing the correct answer (today's form) 0.32, and right/wrong alone 0.05 (R3-18, abstract) [PED-22].

Issues: PED-22, PED-37, PED-28, PED-34, PED-40, PED-32.

## Appendix: re-measure scripts

### D04: the interval table

Run from the repo root on `main`: `node <path>/d04-intervals.mjs` (Node 22.6 or later runs the `.ts` imports directly). It printed the D04 figures on 2026-10-17.

```js
// D04: what today's flashcard schedule does. Run from the repo root on main:
//   node <path>/d04-intervals.mjs      (Node 22.6+ runs the .ts imports directly)
// Drives src/lib/utils/srs.ts the way stores/flashcard.ts rateCard() does:
// quality = DIFFICULTY_TO_QUALITY[rating], then processReview(cardId, quality, record).
const root = process.cwd();
const { processReview } = await import(`file://${root}/src/lib/utils/srs.ts`);
const { DIFFICULTY_TO_QUALITY: Q } = await import(
  `file://${root}/src/lib/types/flashcard.ts`
);
const show = (r) => `${r.interval} d, ease ${r.ease.toFixed(2)}`;

console.log("Rating to quality:", JSON.stringify(Q));
console.log("\nA new card rated 'Gott' four times on one day:");
const after = [];
let rec;
for (let i = 1; i <= 4; i++) {
  rec = processReview("card", Q.good, rec);
  after.push(rec);
  console.log(`  'Gott' #${i}: ${show(rec)}`);
}
console.log("\nOne 'Erfitt' on that card after 1, 2 or 3 'Gott':");
for (const base of after.slice(0, 3)) {
  console.log(
    `  card at ${base.interval} d: 'Erfitt' today (quality ${Q.hard}) ${show(processReview("card", Q.hard, base))};` +
      ` as quality 3 ${show(processReview("card", 3, base))}; 'Aftur' ${show(processReview("card", Q.again, base))}`,
  );
}
```

### D01: the contrast ratios

Run: `python3 d01-contrast.py`. The formula is WCAG 2.x relative luminance.

```python
"""D01: WCAG 2.x contrast ratios for the pairs the brief names. Run: python3 d01-contrast.py"""
def lum(hex_):
    r, g, b = (int(hex_.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)

PAIRS = [
    ('white on the light amber, today', '#ffffff', '#c78c20'),
    ('white on the dark amber, today', '#ffffff', '#e8a838'),
    ('ink on the light amber', '#1b2838', '#c78c20'),
    ('dark ink on the dark amber', '#16161c', '#e8a838'),
    ('ink on the light hover, today', '#1b2838', '#a87518'),
    ('ink on a lighter light hover', '#1b2838', '#dd9f2c'),
    ('white on the bronze fill', '#ffffff', '#8a5d0e'),
    ('bronze ring on a white gap', '#8a5d0e', '#ffffff'),
    ('ink ring on a white gap', '#1b2838', '#ffffff'),
]
for name, fg, bg in PAIRS:
    print(f'{ratio(fg, bg):6.2f}:1  {name} ({fg} on {bg})')
```
