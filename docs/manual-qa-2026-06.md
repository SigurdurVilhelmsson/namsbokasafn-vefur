# Manual QA checklist — June 2026

Everything from the audit-remediation release (Phase 1, on `main`) and
Reader v1.1 (P0, on `feature/reader-v1.1`) that needs human verification.
Designed to be done in batches, intermittently — tick boxes and commit as
you go. Each batch is independent.

**Where to run what:**

- **Batch A–C:** production (namsbokasafn.is) after deploying current `main`,
  or `npm run dev` against main.
- **Batch D–E:** a build of `feature/reader-v1.1` (all four P0 items merged).
  These gate the v1.1.0 merge to main.
- **Batch F:** on the Linode server itself.
- **Batch G:** a build of `feature/reader-v1.2` (all four P1 items merged).
  Gates the v1.2.0 merge, after v1.1.0 ships.

Automated coverage already in place (no need to re-verify by hand):
svelte-check, ESLint, the full Vitest suite, and Playwright e2e (incl. the
pagination spec) — all green in CI, which also gates the `feature/**`
branches.

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
- [ ] Solve 2–3 practice problems in a section using "Rétt hjá mér" /
      "Þarf að æfa meira", then open `/prof` — the adaptive quiz now offers
      those problems with mastery badges. `/nam` practice/review phases pick
      them up too.
      _N/A (not auto-verifiable): no `.practice-problem-container` content in any
      synced book, so the practice→quiz path can't be driven. Needs manual /
      content check._
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

Run against a `feature/reader-v1.1` build.

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
- [ ] Bionic reading toggle in paged mode — content rebuilds, pagination
      recovers (MutationObserver heal).
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

- [ ] Available-height heuristic (viewport − 260 px chrome): do pages feel
      right, or chopped too short / too tall? → tune the constant in
      `PagedReaderControls.availableHeight()`.
- [ ] Should the recall prompt fire per _sub-section_ instead of per
      section (the spec's preference — callback already wired)? Decide
      after reading a few chapters paged.
- [ ] Default `paged` for everyone, or `scrolled` default with paged
      opt-in for launch? (Plan says paged default; this is the moment to
      veto.)

**Screen reader (VoiceOver or NVDA, ~10 min)**

- [ ] Page turns announce "Síða X af Y".
- [ ] The "Samfellt skrun" setting is discoverable and its explanation read.
- [ ] In scrolled mode the section reads top-to-bottom normally.

## Batch G — Reader v1.2: P1 features (~20 min)

Run against a `feature/reader-v1.2` build. Gates the v1.2.0 merge
(after v1.1.0 ships).

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

- [ ] Apply the new nginx config (from `nginx-config-example.conf`),
      `sudo nginx -t`, reload.
- [ ] `curl -sI https://namsbokasafn.is/_app/immutable/...` (any built
      asset) → `Cache-Control: public, immutable`.
- [ ] `curl -sI https://namsbokasafn.is/styles/content.css` →
      `Cache-Control: public, must-revalidate`, `Expires` ≈ 1 day.
- [ ] `curl -sI https://namsbokasafn.is/` → CSP header includes
      `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`.
- [ ] `curl -sI https://namsbokasafn.is/efnafraedi/kafli/01` → `301` to
      `/efnafraedi-2e/...`; same for a `/content/efnafraedi/...` image URL.
- [ ] Browse the site normally for a few minutes watching the console for
      CSP violations (especially GoatCounter's image ping).

---

When D and E pass (and the judgment calls are decided),
`feature/reader-v1.1` is ready to merge to main as **v1.1.0**.
