# D03 · The page-view event sent to the editorial server

- **Date:** 2026-10-23
- **Status:** Ruled. Event: (a) Remove. Guardrail: (a) Add KEEP-01's data rule to CLAUDE.md.
- **Decided by:** [USER], in step S0.2's decision session, with the follow-up answers [USER] gave the same day (below)
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D03 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S3.3
- **Register:** KEEP-01, PED-39, PED-17
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

A production build sends a page-view event to the editorial server (ritstjorn.namsbokasafn.is) on each page change inside a book, and nothing tells readers. Remove it, make it opt-in (off by default), or keep and disclose it? The review's answer turns on one fact only [USER] knows: does anyone use its counts? Second: should CLAUDE.md carry a guardrail about data leaving the device?

## Rulings

### The page-view event

**(a) Remove.** Delete the call in code, never by omitting .env.production (S3.3); the data rule can then say no learning data leave the device unless a student exports them [KEEP-01].

- Cost: Not estimated per option; S3.3 is 0.75 session.
- The review's recommendation: Remove it unless its counts are used; if they are, keep it and disclose it (report 8.5). efni's server keeps the events for a head-editor dashboard (efni 98a5fe2ff, server/routes/analytics.js:113). [USER] answered that nobody uses the counts (below), so the recommendation's own test gives (a).

### Guardrails in CLAUDE.md

**(a) Add KEEP-01's data rule to CLAUDE.md.** Worded to the event ruling; after removal it would say that no learning data leave the device unless the student exports them [KEEP-01].

- Cost: Not estimated (a short documentation edit).
- The review's recommendation: Report 8.5 says 'add the guardrails' without defining them; the nearest written rule is KEEP-01's data rule, which (a) adds. This ruling follows it.

## What follows

- Privacy wording waits for it (rule 10, report 9.5). With D20, it unblocks S3.3 (train 3 by about 11 December 2026, or M5's) and lets KEEP-01's data rule and a school data sheet [PED-39] be worded.
- The guardrail is read as KEEP-01's data rule, as the brief read report 8.5; [USER] left no note saying otherwise.

## [USER]'s answer, and what the efni repository shows

Asked on 2026-10-23 whether anyone uses the counts, [USER] answered: "I don't believe anyone uses the page-view counts", and asked for a check in efni. Read-only, on efni main `a4715ca55` (2026-10-23):

- The events are written by the public `POST /api/analytics/event` (`server/routes/analytics.js:66-107`, rate-limited at `server/index.js:273`). Each row stores the event's book, chapter and section, plus the user-agent, the referrer and any `sessionId` cookie (`:88-97`).
- One screen reads them: the 'Tölfræði' tab of the admin panel (`server/views/admin.html:1289-1290`, through `/api/analytics/stats` and `/api/analytics/recent`, for head editors). `GET /api/analytics/dashboard-data` (`:113`) has no caller.
- No efni document, decision, plan, script or Claude memory cites a figure from these counts or mentions using the tab. Every mention is code upkeep (tests, a lazy-open refactor, labels, size caps) or the 2026-07-11 server review's finding that efni's own server-side page-view tracking was never wired (its §34, still open).
- A repository cannot show whether anyone opens the tab. The ruling rests on [USER]'s answer to that.

## GoatCounter stays, and sets no cookies

[USER] also said GoatCounter uses no cookies. Checked on 2026-10-23:

- `src/app.html:13-26` (main `0cdeab0`) loads `https://gc.zgo.at/count.js` after the window's `load` event.
- That script, fetched the same day, has no cookie code, and its HTTP response sets no cookie. Its only browser storage is a `skipgc` flag in localStorage, written only when someone opens a page with `#toggle-goatcounter`: the site owner's way to stop counting their own visits.
- GoatCounter's documentation (https://www.goatcounter.com/help/sessions) says it tells visits apart by site, user-agent and IP address, held in memory for 8 hours and never written to its database or disk.

So the privacy page can call it a cookieless page count, as S3.3 plans. S3.3's request log, from a build made with the production env, is the final check.

## What S3.3 removes

S3.3 removes the event in code, never by leaving out `.env.production`. Measured on main `0cdeab0`:

- `src/lib/utils/api.ts` can go whole. All four of its exports (`trackEvent`, `trackPageView`, `trackError`, `trackSearch`) post to the editorial server, and `trackSearch` would send search queries if anything called it. Only `src/routes/[bookSlug]/+layout.svelte` imports it (`trackPageView`, lines 16 and 28).
- `API_BASE_URL` and `apiUrl` in `src/lib/config.ts` (lines 10-25) go with it: nothing else uses them. So do the `VITE_API_URL` row in `README.md:104` and `.env.production.example`.
- The event stays live until S3.3's deploy (train 3, by about 11 December 2026, or M5's train).

Left for efni, as [USER]'s calls there (efni's `server/` is AGPL and efni's to change): the rows already stored, the public endpoint, which stays open after vefur stops calling it, and the 'Tölfræði' tab. Raise them with efni when S3.3 lands.

## The data rule (the guardrail)

- It goes in CLAUDE.md, worded to the event ruling: no learning data leave the device unless the student exports them, and GoatCounter's cookieless page count is the only data the reader sends to another server.
- It lands with S3.3's deploy. Until then the event is live and the rule would be false.
- The CLAUDE.md edit is [USER]'s (S0.2's files leave CLAUDE.md alone), so this file fixes what the rule must say, not its words.

## The brief's evidence

- Nothing tells readers that anything leaves the device: none of main's 24 pages is a privacy page, /for-teachers has no data section, and the nearest string is 'Stillingar eru vistaðar sjálfkrafa í vafranum þínum' (main:src/lib/components/SettingsModal.svelte:416) [PED-39].
- Some readers are minors; letting any count leave the device other than by a student's own export is [USER]'s privacy call [PED-17].
- Not checked: whether production stores the rows, or whether ePrivacy Art. 5(3) applies (R5-22) [KEEP-01].

## Measured for the brief (main `0cdeab0`)

- main:src/routes/[bookSlug]/+layout.svelte:23-30 calls trackPageView on first load and each new path in a book; main:src/lib/utils/api.ts:26-57 sends {eventType, book, chapter, section} by sendBeacon to VITE_API_URL + '/api/analytics/event', or nothing if unset (:30). git grep: no other caller.
- Live build 1791155794060 (curl, read-only): CSP connect-src lists ritstjorn.namsbokasafn.is, nodes/2.DZ0RdiYq.js holds the sendBeacon and chunks/CUt84h42.js that host; local .env.production sets the same VITE_API_URL.
- efni 98a5fe2ff server/routes/analytics.js:66-97 also stores user-agent, referrer and any sessionId cookie, which a head-editor dashboard reads (:113).
- CLAUDE.md never mentions the event (git grep) and says 'No backend — all user state in localStorage' (main:CLAUDE.md:14).

## Caveats the brief listed

- No source defines 'guardrails in CLAUDE.md'; the nearest is KEEP-01's four rules plus a data rule, which KEEP-01 puts in the reader plan.
- KEEP-01 and PED-39 also allow removal by unsetting VITE_API_URL; the plan says in code only (S3.3, S0.5). Whether anyone reads the counts, which decides (a) or (c), is unknown.
- Option (a) of the guardrail question reads report 8.5's undefined 'guardrails in CLAUDE.md' as KEEP-01's data rule; say so in the note if you meant something else.

The second caveat's open question, whether anyone reads the counts, was answered on 2026-10-23 (above). [USER] left no note on the third, so its reading stands.

## Options not chosen

- The page-view event: (b) Opt-in, off by default
- The page-view event: (c) Keep and disclose
- Guardrails in CLAUDE.md: (b) Leave CLAUDE.md as it is
