# Manual QA checklist — June 2026

Everything from the audit-remediation release (Phase 1, on `main`) and
Reader v1.1 (P0, on `feature/reader-v1.1`) that needs human verification.
Designed to be done in batches, intermittently — tick boxes and commit as
you go. Each batch is independent.

**Where to run what:**

- **Batch A–C:** production (namsbokasafn.is) after deploying current `main`,
  or `npm run dev` against main.
- **Batch D–E:** on the live site (step S0.4), since 2026-11-12. Until then
  S0.4 named S0.3's trial build (`feature/reader-v1.1` at `dde768e` merged
  with main `62ea95e` of 2026-10-23, never pushed), which predated M1–M3 and
  whose worktrees were removed that day. On the live site the pager is dark,
  so page a section with `?lestur=sidur`, and batch E is "Batch E as M9
  amends it" below, which S9.6 also runs there (S9.1; M9's exit criterion is
  batch E "as amended"). Of batch D only P0.2, the recall prompt, is live:
  its P0.3 items run on a `main` build at S4.5, and P0.1 comes with M12.
  `feature/reader-v1.1` is never merged into main: its pieces are ported to
  main as small PRs.
- **Batch F:** on the Linode server itself.
- **Batch G:** a build of `main` after the step that ports each P1 item:
  P1.4 at S12.4, P1.2 at S13.4, P1.3 at S14.4, P1.1 at S14.7, each item
  amended to the ruled form first. `feature/reader-v1.2` is never merged.

Automated coverage already in place (no need to re-verify by hand):
svelte-check, ESLint, the full Vitest suite, and Playwright e2e (incl. the
pagination spec) — all green in CI, which also gates the `feature/**`
branches.

_(2026-10-01: not true of the release branches today. `feature/reader-v1.1`'s
head (4bfd570) has no CI run at all, and `feature/reader-v1.2`'s head (e3b29c7)
has one run, from 2026-07-25, in which lint-and-test and security failed within
3 seconds and e2e was skipped — the infrastructure-failure signature, not a real
result. Both branches are more than 250 commits behind `main` and no longer
merge cleanly.)_

_Status 2026-10-01: CI is still configured to run on `feature/**`, but neither
release branch has a real CI result on its current head — `feature/reader-v1.1`
(`4bfd570`) has 0 check-runs, and the only run on `feature/reader-v1.2` (`e3b29c7`,
2026-07-25) failed in about 3 s, before a runner started. Both are 250+ commits
behind `main`: merge `main` in and let CI run before relying on "all green" for
D–E or G._

_2026-11-04: the merge advice above no longer applies: neither release branch is
ever merged into main (strategy C), and main is never merged into
`feature/reader-v1.2` ([CODE-04]). Batches D–E run first on S0.3's trial build,
which was never pushed and so has no CI; S0.3's note records its checks
(svelte-check and lint clean, 863 unit tests passing, all 19 pagination tests
passing, and only #249's three expected flashcard e2e failures). Batch E's rerun
at S9.6 and batch G run on main builds, under main's CI._

_2026-11-12: S0.4 no longer uses S0.3's trial build, whose worktrees were
removed that day: batches D–E run on the live site, which serves main's code as
the last train deployed it (train 17, `main` `8754201`), under main's CI, as
S9.6's batch E and batch G do._

**Automated verification of Batches A & B (2026-06-17):** driven end-to-end with
Playwright/Chromium against `npm run dev`, using **in-app SPA navigation**
(clicking Næsta / book links) so the SvelteKit component-reuse path the
PR #110/#112/#113 fixes target is actually exercised (a full reload per section
would mask the bug). Boxes ticked below carry inline `_auto ✓_` evidence. Two
items could **not** be auto-verified and remain unticked: the practice-problem
checks — no `.practice-problem-container` / "Sýna svar" content exists in any
synced book (it uses `.example` blocks) — and the two-tab isolation check
(cross-tab `localStorage` timing). Both need manual follow-up.

---

## Batch A — Core reading flow (main, ~10 min)

The PR #110 fixes. Read with dev tools closed, like a student would.

- [x] Open a section, read to the bottom, click **Næsta** through 2–3 more
      sections. Each section auto-marks as read when you linger at the end
      (check the sidebar checkmarks) — not just the first one.
      _auto ✓: 4 sections marked read across soft-nav (not just the first)._
- [x] In one of the _later_ sections: equations have copy/zoom buttons,
      images lazy-load, and previously saved highlights render. (Make a
      highlight in section 2, navigate away and back without a full reload —
      it should reappear.)
      _auto ✓: 12 copy/zoom buttons + 3/3 lazy imgs on §1‑4 reached by soft-nav;
      a highlight created on §1‑6 re-rendered after soft-nav away & back._
- [x] Scroll halfway down a long section and select text — the highlight
      popup appears **at the selection**, not below the viewport.
      _auto ✓: popup top=280 within viewport (vh=768), adjacent to the selection._
- [x] `/greining`: reading time is attributed to each section you visited,
      not all lumped on the first one.
      _auto ✓: distinct per-section times recorded (1‑1=11s, 1‑2=8s, 1‑3=8s)._
- [x] Turn bionic reading on, navigate to the next section — bolding still
      applies there. Turn it off — practice-problem "Sýna svar" buttons in
      that section still work, and exercises don't get duplicate number links.
      _auto ✓: bionic `<b>` present on the next (soft-nav) section, cleared when
      off; exercise answer-number links stayed at 50 (no duplication) across a
      soft-nav round-trip. **N/A:** no "Sýna svar" practice content in any book._
- [x] "Halda áfram að lesa" prompt appears when returning to a section you
      left mid-way (past ~10%).
      _auto ✓: "Haltu áfram að lesa" prompt + button appear on return mid-section._

## Batch B — Study tools (main, ~15 min)

The reactivity sweep (#112), store fixes (#113, #115, #116) and Icelandic (#117).

- [x] `/nam` planner: clicking phase cards visibly toggles them, and the
      session starts with exactly the phases you selected.
      _auto ✓: phase count toggled 1→0→1 (reactive); session started with the
      selected phase._
- [x] Select text → create flashcard → **Ctrl+Enter**: exactly one card (and
      if "new deck" was open, exactly one deck) is created.
      _auto ✓: decks 0→1, cards 0→1 — no double-fire (#115 guard holds)._
- [x] `/greining` → Markmið: add a goal — it appears immediately; toggle and
      remove — list updates without leaving the tab.
      _auto ✓: goals 0→1 on add, →0 on remove, stayed on `/greining`._
- [x] Keyboard-shortcuts modal: rebind a key — the displayed binding and
      amber "customized" styling update immediately.
      _auto ✓: binding "←"→"M", shortcutPreferences 0→1, reset (customized)
      buttons appeared._
- [x] `/greining` → "Hreinsa gögn": the summary cards (Heildartími, Nýleg
      virkni, weekly) clear along with the chart.
      _auto ✓: seeded 11s reading time (Heildartími) → 0 after Hreinsa gögn._
- [x] Solve 2–3 practice problems in a section using "Rétt hjá mér" /
      "Þarf að æfa meira", then open `/prof` — the adaptive quiz now offers
      those problems with mastery badges. `/nam` practice/review phases pick
      them up too.
      _Superseded N/A: the earlier note was written against the dead
      `.practice-problem-container` flow, which rec7 (PR #150, merged 2026-06-19)
      replaced with the inline self-assessment this box describes._
      _auto ✓ (PR #150): Playwright vs dev server on 1-4-maelingar — the store gets
      `source:'inline'` entries with the full question text; `/nam` mounts and
      persists; `/prof` AdaptiveQuiz surfaces the inline data with the real
      question rendered._
      _auto ✓ (2026-10-01 audit run, local build of 2026-08-22): `/prof` shows the
      mastery badge for a rated problem; `/nam` lists rated problems under
      practice at once and under review after their 1-day interval._
- [x] Open the _other_ book's glossary after using the first book's — terms
      belong to the right book (tooltips too).
      _auto ✓: in-app SPA round-trip Chemistry→Biology→Chemistry showed
      288→0→288 terms — the store refreshes on book switch with no stale
      carry-over (#113). (Biology has no glossary file; in-content tooltips not
      separately driven.)_
- [x] `/markmid` shows only the current book's objectives (check both books
      if you have objectives in each).
      _auto ✓: seeded one objective per book — book A's page didn't leak B's and
      vice-versa._
- [x] Icelandic spot-check: `/prof` page text, the note modal, annotation
      sidebar ("Þessi kafli", "Flytja út", "N yfirstrikanir"), flashcard
      deck picker ("Velja stokk") — no ASCII pseudo-Icelandic anywhere.
      _auto ✓: `/prof`, note modal ("Bæta við athugasemd"), annotation sidebar
      ("Flytja út", "…yfirstrikanir") and deck picker ("Velja stokk") all render
      þ/ð/æ/ö with no mojibake. ("Þessi kafli" is an annotations-present filter,
      hidden on a fresh profile.)_
      _manual ✓ (2026-06-18): "Þessi kafli" filter confirmed with a real highlight._
- [x] Two tabs open: studying flashcards in tab A doesn't yank tab B's
      position; reading in A while B is open doesn't double-count time.
      _manual ✓ (2026-06-18): confirmed by developer (cross-tab timing not
      reliably automatable headless)._

## Batch C — Delivery/analytics (production after deploy, ~5 min)

- [ ] GoatCounter dashboard still records page views (script now loads
      after the `load` event).
- [ ] Page feels no slower; no console errors on landing/section pages.
- [ ] PWA: offline mode still serves previously visited pages; update
      prompt behaves normally on a new deploy.

## Batch D — Reader v1.1: measure, predict-first, recall (~15 min)

Run on the live site (S0.4), where only P0.2 is live; the P0.3 items run on a
`main` build at S4.5, and P0.1 comes with M12 (see "Where to run what").

- [ ] **P0.1:** in a private window (fresh profile), body text uses the
      narrow measure (~70 chars/line). Your normal profile keeps whatever
      Línubreidd you had chosen.
- [ ] **P0.3:** `/minniskort` study: the card no longer flips on tap — you
      must answer "Man það" / "Man það ekki" first; then the four-point
      rating appears with interval previews. Same in the study session's
      review phase. Practice problems there still reveal directly.
- [ ] **P0.3 data:** after a few reviews, `localStorage` →
      `namsbokasafn:flashcards` → `reviewHistory` entries carry
      `predictedKnown` matching what you pressed.
- [ ] **P0.2:** complete a section (scroll to end in scrolled mode, or
      advance past the last page in paged mode, or the manual button) —
      the recall prompt appears instead of the old particle burst. Save an
      entry (Ctrl+Enter works); skip works; entry lands in
      `namsbokasafn:recall`. Navigating to the next section clears the prompt.

## Batch E — Reader v1.1: pagination (the big one, ~30 min)

_2026-11-08: this is batch E as written for v1.1's trial build (S0.4). For the live
site at S9.6, run "Batch E as M9 amends it" below instead._

_2026-11-12: S0.4 now runs on the live site too, so it also runs "Batch E as M9
amends it" below, not this batch; the trial build's worktrees were removed that
day._

This is the batch that genuinely needs judgment, not just verification.
Use a long, figure-heavy chapter (Chapter 1 has many figures) and an
equation-heavy section.

**Correctness**

- [ ] Section renders as pages: no scrolling needed within a page at
      ~1024×768; "Hluti N af M · Síða X af Y" label is accurate.
- [ ] Figures+captions, tables, display equations, notes/examples and
      practice problems are never split across pages; an oversized figure
      gets its own page and can still be opened in the lightbox.
- [ ] No heading stranded as the last line of a page.
- [ ] Keyboard: →/Space/PageDown advance, ←/Shift+Space/PageUp go back —
      and typing in search or a textarea does NOT turn pages.
- [ ] Practice problems and glossary tooltips work on later pages (their
      listeners must survive page turns).
- [ ] Click a cross-reference to a figure/equation elsewhere in the section
      — you land on the page containing it.
- [ ] Reload a deep link (`...#sub-2-p-1`) — it opens on that page.
- [ ] Change font size mid-section — pages recompute, you stay within ±1
      page of where you were. Same for window resize.
- [ ] Bionic reading toggle in paged mode — the bold comes and goes on the
      page you are on, and the pages re-split with you within ±1 page of
      where you were. (The re-split comes from the pager's settings
      subscription, which re-splits on settings changes such as typography;
      bionic reading wraps and unwraps words in place, so nothing is
      rebuilt.)
- [ ] Settings → Lestrarstilling → "Samfellt skrun": controls disappear,
      the full section scrolls exactly as before, nothing missing. Toggle
      back — pagination returns.
- [ ] Advancing past the final page marks the section read and fires the
      recall prompt; section shows read in the sidebar.

**Mobile (375 px width / a real phone)**

- [ ] Pages fit; swipe left/right turns pages; vertical scroll and
      pull-to-refresh aren't hijacked.
- [ ] Controls usable with thumbs; label legible.

**Judgment calls — note your verdict**

- [ ] Page height: a page may fill the window's inner height − 96 px − the
      gap above the first block − the gap below the last − 76 px, never
      below 240 px (the same on the trial build and on main today). Do
      pages feel right, or chopped too short / too tall? Note the lines per
      page, and how many pages need window scrolling, at each width.
      _2026-11-04: call 1 was ruled on 2026-10-23: maximise usable lines.
      S9.5 applies it, so main's pages grow after S9.5, and M9 amends this
      item then._
- _2026-11-04: per-section or per-sub-section recall is no longer a
  judgment call here. Call 2 was ruled per section on 2026-10-23, as
  built: the prompt comes once, at the section's end. The pager's
  `onsubsectioncomplete` callback is declared but not passed: the section
  page gives the pager only `oncomplete`._
- [ ] Default `paged` for everyone, or `scrolled` default with paged
      opt-in for launch? This is open call 3: [USER] rules it at S10.2,
      from the in-class crossover, and until then D06 keeps main's default
      scrolled. (The trial build pages by default only because v1.1 was
      written that way.)

**Screen reader (VoiceOver or NVDA, ~10 min)**

- [ ] On arrival and on each page turn, the screen reader announces
      "Hluti N af M · Síða X af Y", the label's own text.
- [ ] The "Samfellt skrun" setting is discoverable and its explanation read.
- [ ] In scrolled mode the section reads top-to-bottom normally.

## Batch E as M9 amends it — the live dark pager (S9.6, ~45 min)

_Written 2026-11-08 for train 12, which ships S9.1–S9.5 dark: no reader sees the pager
without a link, and no picker is rendered (D06; the opt-in waits for S11.1–S11.3 and
S11.5). Run it on namsbokasafn.is after the train, at three widths (a phone, the iPad,
a laptop), with one screen reader. M9's exit criterion is this batch passing._

**How to open a section paged.** Add `?lestur=sidur` to its address. The link's mode
lasts until you leave the section pages (the link rule, sticky as built). Live addresses
(live chemistry is the 2026-08 sync, so take slugs from the live site, not efni):

- §1.1 <https://namsbokasafn.is/efnafraedi-2e/kafli/01/1-1-efnafraedi-i-samhengi/?lestur=sidur>
- §1.2 <https://namsbokasafn.is/efnafraedi-2e/kafli/01/1-2-efnishamur-og-flokkun-efnis/?lestur=sidur> (figures)
- §3.1 <https://namsbokasafn.is/efnafraedi-2e/kafli/03/3-1-formulumassi-og-molhugtakid/?lestur=sidur> (worked examples, Dæmi 3.1)
- §5.3 <https://namsbokasafn.is/efnafraedi-2e/kafli/05/5-3-vermi/?lestur=sidur> (equations, 18–27 pages)
- §14.3 <https://namsbokasafn.is/efnafraedi-2e/kafli/14/14-3-hlutfallslegur-styrkur-syra-og-basa/?lestur=sidur> (opens with a sub-section)

⚠️ 'Síðuskipt' and 'Samfellt skrun' store your choice. After 'Síðuskipt', every section
pages without a link; tap 'Samfellt skrun' to go back to scrolling.

**On every page (S9.2, S9.4)**

- [ ] The section title stands above every page, not only the first; no page is the
      title alone (§14.3 opens on its first sub-section).
- [ ] Page 1 has the full 'Vélþýtt efni' banner above the content; every page's bar
      has the compact '⚠ Vélþýtt' marker and 'Tilkynna villu', which opens the feedback
      form with this section filled in. The learning objectives stay above the window on
      arrival (ruling 1).
- [ ] "Hluti N af M · Síða X af Y" is accurate.

**The docked bar (S9.5): on a real phone**

_The bar was never seen on a device: in Chrome's phone emulation it stuck too low on tall
pages, which a plain touch test does not show. This is the check that matters most._

- [ ] iPhone (Safari) and an Android phone (Chrome), portrait: the bar sits at the
      bottom of the screen. On a page taller than the screen (scroll inside it, or find
      one on §1.2 or §5.3), the bar **stays on screen at the bottom** while you scroll,
      and nothing scrolls out from under it unread.
- [ ] Nothing covers '‹' or '›' (the arrows replace 'Fyrri' and 'Næsta' below 640 px):
      the tools button sits in the bar's right end, and the timer pill is hidden while
      the section pages and the timer is idle.
- [ ] Start a timer (switch to 'Samfellt skrun', start it, tap 'Síðuskipt'): the running
      timer sits in the bar's left end, clear of '‹'.
- [ ] The last page's button says 'Ljúka kafla' in words, and the counter stays legible.
- [ ] The second line ('⚠ Vélþýtt · Tilkynna villu', 'Samfellt skrun') is readable and
      each part takes a tap.
- [ ] Rotate to landscape and back: pages re-split, the label stays sane, nothing is
      covered. Note anything that sits under the iPhone's home indicator.
- [ ] Swipe left/right turns pages; a sideways drag in a wide table (§2.7) scrolls the
      table and keeps the page; a pinch never turns; vertical scroll and pull-to-refresh
      are not hijacked.
- [ ] On a short page you may see blank space after 'Næsti kafli' at the very end (room
      added so a page's top can scroll under the header; at most about 116 px measured).
      Say if it bothers you.

**Keys and pages (S9.1)**

- [ ] → and ← turn a page at once. Space and PageDown on a page taller than the window
      scroll to its end before turning; Shift+Space and PageUp do the same upwards.
      Typing in search or a text box never turns pages.
- [ ] Figures with captions, tables, display equations and notes are never split, and
      no heading is left as the last line of a page.
- [ ] **The 'Lausn' trial (D11), §3.1 at all three widths:** a worked example taller
      than the page breaks once, before its check-your-learning part, so that part and
      its 'Sýna svar' open the next page; an example that fits stays whole. Verdict:
      keep it, or switch it off (`EXAMPLE_BREAK_TRIAL` in `paginate.ts`).
- [ ] Practice problems and glossary tooltips work on later pages.
- [ ] Reload a deep link (`…#sub-2-p-1`): it opens on that page. Change the font size, or
      resize the window: pages re-split, and you stay within a page of where you were.
- [ ] Bionic reading on and off: the bold comes and goes on the page you are on.

**Figures and focus (S9.2, S9.4)**

- [ ] Tap a 'Mynd' link in the text (§1.1, §1.2): the figure opens in the lightbox over
      the page, and the page and its label stay. Escape or 'Loka' closes it, with focus
      back on the link. A link to a table still turns to the table's page.
- [ ] With the keyboard: focus a link in the text and press →: focus moves to the page,
      not lost. After an arrow-key turn a focus ring is drawn around the page. Verdict:
      fine, or distracting?

**The way out and the section's end (S9.3)**

- [ ] 'Síðuskipt' / 'Samfellt skrun' sit above the objectives, and 'Samfellt skrun' also
      under the counter. From a page past the first, 'Samfellt skrun' scrolls the whole
      section, nothing missing, with the text you were reading where it was. 'Síðuskipt'
      brings back the same page.
- [ ] No 'Merkja kafla sem lesinn' button sits under the pager; the toolbar's 'Merkja sem
      lesið' still works.
- [ ] 'Ljúka kafla' on the last page opens the recall prompt in the page's place (the
      page's text gone, the title above). 'Fyrri' shows the last page again. After
      'Sleppa' or 'Vista', focus is on 'Næsti kafli', in view. On a section already
      prompted, 'Ljúka kafla' goes straight to 'Næsti kafli'. The section shows read in
      the sidebar.
- [ ] Open Settings on a later page and close it (Loka or Escape): the page does not
      jump.

**Judgment calls: note your verdict**

- [ ] **Page height (call 1, now applied).** Do pages feel right, or too short or too
      tall? At each width note the lines a page holds and how many pages need window
      scrolling. Measured locally on §1.2 before the train: the page is 68% of a
      1280×800 window (24 pages), 76% at 768×1024 (18), 71% at 390×844 (31), 60% at
      375×667 (35).
- [ ] The 'Lausn' trial and the focus ring, above.
- [ ] Default reading mode (call 3) stays open until S10.2; nothing to rule here.

**Screen reader (VoiceOver on the iPad, or NVDA)**

- [ ] On arrival and on each turn it says the position with the sub-section, e.g.
      "Hluti 2 af 3: Flokkun efnis, síða 4 af 13" (or "Hluti 1 af 3, síða 2 af 2" in an
      introduction). Is the wording right? (D20 batch 12.)
- [ ] Headings list the section title (h1) on every page.
- [ ] 'Samfellt skrun' is reached before the objectives. **After switching to it, a
      say-all reads the section to the end** (M9's acceptance).
- [ ] The bar's marker reads "Vélþýtt efni. Þessi eining hefur ekki enn verið yfirlesin
      og kann að innihalda þýðingarvillur."; 'Ljúka kafla' is announced as a button.
- [ ] In scrolled mode the section reads top to bottom as before.

---

## Batch G — Reader v1.2: P1 features (~20 min)

Run on a build of `main` after the step that ports each P1 item: P1.4 at
S12.4, P1.2 at S13.4, P1.3 at S14.4 and P1.1 at S14.7. Each step amends
its items to the ruled form first, because this batch was written for a
`feature/reader-v1.2` build (on which P1.2 never renders). v1.2 is never
merged into main; each item gates the train that ships its feature (the
exit criteria of M12–M14).

- [ ] **P1.4 fonts:** Settings → Leturgerð shows "Atkinson Hyperlegible"
      ("Hannað fyrir hámarks læsileika") and it renders in the preview and
      the reading view. OpenDyslexic now reads "Sumir lesendur kjósa þetta
      letur".
- [ ] **P1.4 theme:** private window with the OS in dark mode → site starts
      dark; your normal profile keeps its saved theme.
- [ ] **P1.2 Forspurning:** opening an _unread_ section shows the
      pre-question card with one of its objectives; "Ég hugleiddi þetta"
      dismisses it; an already-read section shows none; the same section
      poses the same question on revisit.
- [ ] **P1.3 Eyðukort:** select a phrase mid-sentence → "Eyðukort" → toast
      confirms; `/minniskort` has an "Eyðukort" deck whose card front is the
      sentence with `______` and back is your selection. Selecting an entire
      short sentence falls back to the regular flashcard modal.
- [ ] **P1.1 Kvörðun (needs data):** after several predict-first reviews
      and a few practice problems + objective confidence ratings, the
      `/greining` → Kvörðun tab shows the 2×2 prediction matrix and the
      per-section Ofmat/Vanmat/Í jafnvægi list; both empty states read
      sensibly on a fresh profile.
- [ ] **P1 judgment call:** does the Forspurning card feel helpful or
      naggy on every unread section? (Option: limit to first section per
      chapter, or per-day.)

## Batch F — Server (Linode, during the deploy window)

- [x] Apply the new nginx config (from `nginx-config-example.conf`),
      `sudo nginx -t`, reload.
      _live ✓ (2026-10-01): the June policy is in effect — the four checks below
      pass. Later additions to the example are NOT applied on the server:
      `frame-src` (5d640da, 2026-07-17) is absent from the live CSP, and the
      `lifraen-efnafraedi` withdrawal blocks (#234) are not live — that URL still
      answers 200._
- [x] `curl -sI https://namsbokasafn.is/_app/immutable/...` (any built
      asset) → `Cache-Control: public, immutable`.
      _live ✓ (2026-10-01): `/_app/immutable/assets/Icon.Dc6oSaul.css` →
      `max-age=31536000` + `public, immutable`._
- [x] `curl -sI https://namsbokasafn.is/styles/content.css` →
      `Cache-Control: public, must-revalidate`, `Expires` ≈ 1 day.
      _live ✓ (2026-10-01): `max-age=86400` + `public, must-revalidate`;
      `Expires` = `Date` + 24 h._
- [x] `curl -sI https://namsbokasafn.is/` → CSP header includes
      `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`.
      _live ✓ (2026-10-01): all three present._
- [x] `curl -sI https://namsbokasafn.is/efnafraedi/kafli/01` → `301` to
      `/efnafraedi-2e/...`; same for a `/content/efnafraedi/...` image URL.
      _live ✓ (2026-10-01): both answer 301 to the `efnafraedi-2e` path
      (control: `/efnafraedi-2e/` → 200)._
- [ ] Browse the site normally for a few minutes watching the console for
      CSP violations (especially GoatCounter's image ping).
      _Not done in a browser. Static check only (2026-10-01): the live CSP
      allows `https://gc.zgo.at` (script-src) and `https://*.goatcounter.com`
      (img-src, connect-src)._

---

`feature/reader-v1.1` is never merged into main (strategy C): it stays
frozen at `dde768e` (tag `reader-v1.1-port-source`) as the porting source,
and each piece moves to main as a small PR. **v1.1.0** is tagged on main at
S11.4, once [USER] has ruled call 3 (S10.2) and batch E, as M9 amends it,
passes on the release build.
