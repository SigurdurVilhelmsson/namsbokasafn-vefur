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

Automated coverage already in place (no need to re-verify by hand):
svelte-check, ESLint, 383 unit tests, Playwright e2e incl. the new
pagination spec — all green in CI.

---

## Batch A — Core reading flow (main, ~10 min)

The PR #110 fixes. Read with dev tools closed, like a student would.

- [ ] Open a section, read to the bottom, click **Næsta** through 2–3 more
      sections. Each section auto-marks as read when you linger at the end
      (check the sidebar checkmarks) — not just the first one.
- [ ] In one of the _later_ sections: equations have copy/zoom buttons,
      images lazy-load, and previously saved highlights render. (Make a
      highlight in section 2, navigate away and back without a full reload —
      it should reappear.)
- [ ] Scroll halfway down a long section and select text — the highlight
      popup appears **at the selection**, not below the viewport.
- [ ] `/greining`: reading time is attributed to each section you visited,
      not all lumped on the first one.
- [ ] Turn bionic reading on, navigate to the next section — bolding still
      applies there. Turn it off — practice-problem "Sýna svar" buttons in
      that section still work, and exercises don't get duplicate number links.
- [ ] "Halda áfram að lesa" prompt appears when returning to a section you
      left mid-way (past ~10%).

## Batch B — Study tools (main, ~15 min)

The reactivity sweep (#112), store fixes (#113, #115, #116) and Icelandic (#117).

- [ ] `/nam` planner: clicking phase cards visibly toggles them, and the
      session starts with exactly the phases you selected.
- [ ] Select text → create flashcard → **Ctrl+Enter**: exactly one card (and
      if "new deck" was open, exactly one deck) is created.
- [ ] `/greining` → Markmið: add a goal — it appears immediately; toggle and
      remove — list updates without leaving the tab.
- [ ] Keyboard-shortcuts modal: rebind a key — the displayed binding and
      amber "customized" styling update immediately.
- [ ] `/greining` → "Hreinsa gögn": the summary cards (Heildartími, Nýleg
      virkni, weekly) clear along with the chart.
- [ ] Solve 2–3 practice problems in a section using "Rétt hjá mér" /
      "Þarf að æfa meira", then open `/prof` — the adaptive quiz now offers
      those problems with mastery badges. `/nam` practice/review phases pick
      them up too.
- [ ] Open the _other_ book's glossary after using the first book's — terms
      belong to the right book (tooltips too).
- [ ] `/markmid` shows only the current book's objectives (check both books
      if you have objectives in each).
- [ ] Icelandic spot-check: `/prof` page text, the note modal, annotation
      sidebar ("Þessi kafli", "Flytja út", "N yfirstrikanir"), flashcard
      deck picker ("Velja stokk") — no ASCII pseudo-Icelandic anywhere.
- [ ] Two tabs open: studying flashcards in tab A doesn't yank tab B's
      position; reading in A while B is open doesn't double-count time.

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
