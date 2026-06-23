# Follow-up session — reader fixes (from 2026-06-23 live QA)

**Date:** 2026-06-23
**Scope:** Reader-side issues found during the post-deploy live QA of
namsbokasafn.is. **vefur-rooted session.**
**Sibling track:** editorial-server items (term-mining route 404, `/api/images`
404, logout, editor-UX) are specced in **namsbokasafn-efni**
`docs/plans/2026-06-23-live-qa-followup-efni.md`. Keep the two sessions separate.

**Context.** The lead deployed both repos to latest `main` + ran a content sync,
then walked the QA. **Everything pipeline-side passed** (section slug 404s
cleared, A1 appendix link, A2 footnotes, check-knowledge reveal, intro-outline
links). The issues below are all in how the _reader_ consumes/displays content —
efni emits correct data; no efni change is needed for any of these.

Suggested order: **I → J → H → G** (severity, then effort).

---

## I — ⚠️ Learning objectives render twice on section pages

**Symptom.** Section pages (e.g. `/efnafraedi-2e/kafli/02/2-1-…`) show the
objectives **twice**: efni's static block **and** the interactive objectives UI.

**Root cause.** By design (efni PR #140), efni emits objectives in **two** forms,
same source:

1. a visible `<div class="learning-objectives">` in the content HTML (graceful
   baseline — shows even if reader JS/tracking is off), and
2. structured `objectives:[]` in the page-data `<script>` (to drive tracking
   without scraping HTML).

The objectives-revival (PR #151) renders an interactive block from (2) but does
**not** suppress (1), so both appear. efni's dual emission is intentional and
must stay (graceful degradation) — **the reader must hide the static block when
it renders the interactive one.**

**Fix (vefur).** When the section view renders the interactive objectives
component from page-data, remove/hide the static `.learning-objectives` block
from the injected content HTML (e.g. in `ContentRenderer.svelte` or the section
`+page.svelte`, strip/hide that node; or CSS-hide `.learning-objectives` only
when the interactive block mounts). Keep a fallback: if page-data objectives are
empty, leave the static block visible.

**Acceptance.** Exactly one objectives presentation per section: interactive when
page-data has objectives, static otherwise. No duplicate.

---

## J — ⚠️ `/{book}/markmid` redirects to the front page

**Symptom.** `/efnafraedi-2e/markmid` redirects to the front page; no UI link to
it. (vefur memory says `/markmid` was "live-verified" pre-deploy — that note is
now stale against real efni objective data.)

**Likely cause (verify).** A route guard / empty-state fallback in
`src/routes/[bookSlug]/markmid/+page.(ts|svelte)` — e.g. it bounces when it
thinks the book has no objective total, or a prerender/`entries()` mismatch. Data
is present (page-data carries objectives; `toc.json` regenerated and verified via
the Group-1 slug check), so it's **routing/guard, not missing data**.

**Fix (vefur).** Trace why the route redirects with real data loaded; make it
render the markmið page; add a nav link/affordance once it works.

**Acceptance.** `/efnafraedi-2e/markmid` renders objective tracking (coverage bar,
not always-100%); reachable from the UI.

---

## H — In-page anchors land under the sticky banner

**Symptom.** Jumping to any `#anchor` (footnote back-ref, cross-reference,
section jump) scrolls the target to viewport-top, where the sticky/semi-
transparent top banner (search/settings) covers it.

**Fix (vefur, one line).** Add `scroll-padding-top: <banner-height>` to the
scroll root (`html` / the main scroll container) in the shared stylesheet, or
`scroll-margin-top` on anchor targets (`[id]`, content headings,
`.footnote-item`, `.preserved-anchor`). Site-wide — fixes all anchor navigation.

**Acceptance.** After any in-page anchor jump the target sits **below** the
banner, fully visible.

---

## G — Appendix A is two clicks deep (low priority)

**Symptom.** "viðauka A" → `/efnafraedi-2e/vidauki/A` (a **landing page**) →
link → `/efnafraedi-2e/lotukerfi/` (interactive periodic table). Two clicks.

**Context.** efni correctly emits the semantic `/vidauki/{letter}` (it must not
hardcode the bespoke `/lotukerfi/` route — separation of concerns). Making it one
click is purely a vefur appendix-route decision. See efni's A1 spec
`docs/plans/2026-06-22-a1-appendix-crossref-design.md` § "Deployed behavior".

**Fix (vefur, pick one).** (a) Redirect `/vidauki/A` → `/lotukerfi/` for the
interactive appendix (matches the A1 spec's original `isInteractive`→component
model — see `src/routes/[bookSlug]/vidauki/[appendixLetter]/+page.ts`), or
(b) render the component at `/vidauki/A` (drop the separate landing). (a) is
smaller. Fixes every "Appendix A" reference at once.

**Acceptance.** "viðauka A" reaches the interactive periodic table in one click;
non-interactive (prose) appendices still land on their normal page.
