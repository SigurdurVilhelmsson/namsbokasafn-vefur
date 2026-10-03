# Security Audit — namsbokasafn-vefur (workflow-driven, reachability-first)

**Date:** 2026-05-29
**Method:** 6 audit dimensions, each finding adjudicated by 2 independent adversarial lenses (refute-reachability + impact-for-architecture), severity gated strictly on a traced untrusted-source-to-sink path.
**Prior baseline:** [`AUDIT-REPORT.md`](./AUDIT-REPORT.md) (2026-02-11; moved here from the repo root 2026-08-22).

---

## Scope & method

Námsbókasafn is a **static SvelteKit site**: `@sveltejs/adapter-static` with SPA fallback `200.html`, prerendered at build time and served by nginx as static files. There is **no backend, no SSR runtime, no `+server.*` endpoints, no `hooks.server.*`, no sessions, no auth, no server-side secrets, no database, no server-side PII.** All user state lives in per-origin `localStorage`, owned and editable only by that same user. All book HTML under `static/content/` is authored in the sister repo `namsbokasafn-efni`, PR-reviewed, and pre-rendered from a CNXML pipeline — **trusted by design.**

Six dimensions were reviewed by the automated workflow: `xss-dom`, `input-validation-protopoison`, `node-build-scripts`, `network-routing-redirect-worker`, `secrets-deploy-csp-pwa`, and `dependencies`. Each candidate finding was challenged by two adversarial lenses. **Severity is reachability-gated:** Critical/High requires a concrete traced path from an untrusted source (URL/route param, `location.hash`/`search`, a file imported/pasted from another user, an external-service response, or cross-origin `postMessage`) to a dangerous sink, with cross-trust-boundary impact. Trusted-content `{@html}`, self-only `localStorage`, and build-time-only code on trusted inputs are LOW at most. A seventh area — **CI/CD configuration** (`.github/workflows/ci.yml`, `dependabot.yml`) and **shell scripts** (`scripts/setup-goaccess.sh`) — was reviewed directly afterward (see the CI/CD section below).

Every finding's severity rests on the primary-source file evidence cited throughout, not on aggregate confidence. Three load-bearing facts were re-verified by hand after synthesis: (1) `highlightQuery` (`src/lib/utils/searchIndex.ts:351-371`) runs **both** its `text` and `query` arguments through `escapeHtml` before building any `<mark>` markup — confirmed safe by construction; (2) the `/ordabok` glossary route (`src/routes/[bookSlug]/ordabok/+page.svelte`) contains **no `{@html}`** and never reads the `?search=` URL parameter that `TextHighlighter.svelte:430` writes — so that parameter reaches no sink (a minor functional gap, not a security one); and (3) the `execSync` shell-string sink in `sync-content.js` was re-read and confirmed.

---

## Executive summary

**Zero critical, zero high, zero medium** security findings survive the reachability gate. No traced path exists from any untrusted source to a dangerous sink anywhere in the application surface. Every `{@html}`/`innerHTML` sink is fed by trusted CNXML content, developer-authored static data, or escaped values; every cross-origin egress is fire-and-forget and never read back; every `goto()` target is structurally same-origin; the search worker sanitizes its only user input before `RegExp`.

| Final severity | Count |
| -------------- | ----- |
| Critical       | 0     |
| High           | 0     |
| Medium         | 0     |
| Low            | 8     |
| Info           | 1     |

**Delta:** 7 NEW (1 build-time command-injection sink, its shared path-traversal hardening item, 4 dependency advisories, and 3 deploy/CSP/PWA hardening items), 1 functional-correctness config delta (CSP connect-src), 2 KNOWN-UNFIXED carry-overs, and **0 true regressions** of items the prior report marked fixed (one regression *note* is recorded — see Delta). **20 candidate findings were dismissed** as by-design trusted-content, self-only `localStorage`, or build-time-on-trusted-input noise, confirming severity was not inflated. A post-workflow review of **CI/CD and shell scripts surfaced no additional findings** — GitHub Actions is SHA-pinned, uses safe triggers (`pull_request`, not `pull_request_target`), and holds no secrets.

The single most actionable item is **cmdinj-1**: a shell-string-interpolation `execSync` in `sync-content.js` that the prior `rm -rf` fix (Q2) did not cover. It is LOW (build-time, trusted sister-repo input), and the fix is the array-form `spawnSync` already used elsewhere in the same file.

---

## Confirmed findings

Ordered by severity, then by delta importance.

### LOW

| # | Title | File:line | Status | Reachability | Recommendation |
|---|-------|-----------|--------|--------------|----------------|
| cmdinj-1 | Command injection via interpolated `bookSlug` in `execSync` | `scripts/sync-content.js:198`, `:249` | **NEW** | Build-time only on trusted (PR-reviewed sister-repo) directory names / membership-checked CLI args. Mechanism is real and reproducible, but no untrusted source per the trust model reaches it; never runs in a browser. | Use `spawnSync('node', ['scripts/generate-toc.js', bookSlug], {cwd, stdio:'inherit'})` (the array form already used for rsync at line 184) + a strict slug allowlist `/^[a-z0-9][a-z0-9-]*$/` at `getSourceBooks()`. |
| pathtrav-1 | Unvalidated book dir names as path segments for read/write/delete | `generate-toc.js:379`; `sync-content.js:158,240,367`; `process-content.js:87` | **NEW** | Build-time only. Dir scans return base names (no traversal); CLI args membership-checked; the one destructive `rmSync` is guarded by `startsWith(resolvedDestDir + '/')` (sync-content.js:233-236). Same root as cmdinj-1. | Apply the same allowlist centrally in `getSourceBooks()`/`getContentBooks()` so every downstream `resolve()`/`rmSync()` inherits the guarantee. Closed once cmdinj-1's allowlist lands. |
| dep-1 | `devalue 5.8.0` sparse-array DoS (GHSA-77vg-94rm-hx3p) | `package-lock.json` (transitive) | **NEW** | Real advisory, unreachable. Sink requires a live server deserializing untrusted bodies; adapter-static has no SSR/`+server`/remote functions and no `__data.json` in `build/`. Client deserializer parses only trusted build-time payloads. | `npm audit fix` -> devalue 5.8.1 (patch). |
| dep-2 | `svelte 5.55.5` SSR-XSS group (GHSA-pr6f / -f3cj / -rcqx) | `package-lock.json` | **NEW** | Real advisories, unreachable. SSR runs only at build-time prerender over trusted content; DOM-clobbering needs attacker-injected `id`/`name` DOM, but hydrated markup is build-fixed trusted content and runtime values are escaped. | `npm audit fix` -> svelte 5.55.10 (patch). |
| dep-3 | `svelte 5.55.5` `<svelte:element>` ReDoS (GHSA-9rmh-mm8f-r9h6) | `package-lock.json` | **NEW** | Real advisory, construct unused. Zero `<svelte:element>` usages in repo; vulnerable regex never emitted. | Covered by the same svelte bump. Informational. |
| dep-4 | `@sveltejs/kit 2.59.1` `query.batch` cross-talk (GHSA-hgv7-v322-mmgr) | `package-lock.json` | **NEW** | Real advisory, feature unused + no server runtime. No `query.batch`/`$app/server`/`*.remote.*`/`experimental.remoteFunctions`. | `npm audit fix` -> kit 2.61.1 (patch). Informational. |
| csp-1 | CSP `connect-src` omits the editorial API the client actually calls | `nginx-config-example.conf:84` (+6 dup blocks); consumer `src/lib/utils/api.ts:33-49` | **NEW** | Functional/config defect, not a vuln. `connect-src` lists `tutor.namsbokasafn.is` (called by no code) but omits `https://ritstjorn.namsbokasafn.is`, which `trackPageView` beacons to — so analytics is silently blocked. A missing allowlist entry fails CLOSED; no injection/exfil. | Add `https://ritstjorn.namsbokasafn.is` (and `tts-proxy.s-vilhelmsson.workers.dev` when TTS ships); drop unused `tutor.*`; define the CSP once to stop 7-block drift. |
| hdr-1 | Security headers live only in an EXAMPLE nginx file, not pinned/CI-verified | `nginx-config-example.conf` | **NEW** | Process/hardening gap. Real deployed config is host-side (outside VC); CI ships only `build/` and never verifies live headers. Header values are constants — no untrusted-source path. csp-1 is evidence drift can occur. | Add a post-deploy `curl -I` smoke check (or CI assertion) that fails if HSTS / CSP / X-Content-Type-Options are missing. Consider committing the real nginx snippet and referencing it from the deploy pipeline. |
| sri-1 | GoatCounter `count.js` from `gc.zgo.at` CDN, no SRI — breaks "all self-hosted" invariant | `src/app.html:15-19` | **NEW** | Supply-chain dependency. Theoretical cross-user impact IF gc.zgo.at/CDN/DNS/TLS is first compromised (conditional category-3 source); no in-repo trigger (the `src` is a fixed literal). SRI can't fully pin a self-updating loader. Contradicts CLAUDE.md "no external CDN dependencies". | Self-host `count.js` and drop `gc.zgo.at` from `script-src`/`connect-src`; OR accept the dependency and update CLAUDE.md. |
| proto-2 | Whole-object store fields are only shallow-type-checked (no deep validation) | `analytics.ts:146-157`; `quiz.ts:118-125`; `offline.ts:45-47`; `annotation.ts:25-27` | **KNOWN-UNFIXED** | Self-only, no trust boundary. `validateStoreData` checks only top-level `isObject`/`isArray`; nested shape unchecked. Both sources are the user's own `localStorage` + same-origin cross-tab `StorageEvent`; no import-from-another-user feature exists; no field reaches `{@html}`. Worst case: NaN math / error in the tampering user's own tab. Residual of the prior F7 work. | Acceptable as-is. **Precondition:** any future annotation/flashcard/reference IMPORT feature makes those files untrusted and MUST deep-validate nested shape + sanitize innerHTML-bound fields before merge. |
| pwa-1 | Service-worker runtime caching accepts opaque (status 0) responses with origin-agnostic patterns | `vite.config.ts:33-60`; mirrored in `build/sw.js` | **NEW** | Robustness nit, not reachable. `statuses:[0,200]` + unanchored `/content/` regexes would cache opaque cross-origin responses, but all real fetches are same-origin relative; opaque bodies are unreadable (`response.text()===''`), so attacker HTML can't reach `{@html}`. CSP `connect-src` further restricts. | Use `statuses:[200]` and anchor patterns to `self.location.origin`. |

### INFO

| # | Title | File:line | Status | Note |
|---|-------|-----------|--------|------|
| csp-2 | CSP relies on `'unsafe-inline'`; lacks `base-uri`/`form-action` | `nginx-config-example.conf:84` | **KNOWN-UNFIXED** | Defense-in-depth quality (both lenses downgraded low->info). `'unsafe-inline'` is an unavoidable, documented adapter-static/Svelte tradeoff (no nonces for files served by nginx). Same root as prior **S5** (left Open). Add `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`; migrate to hashed inline scripts if the toolchain later allows. |

---

## Delta vs [AUDIT-REPORT.md](./AUDIT-REPORT.md)

The prior report (2026-02-11) closed essentially all P0–P2 items. This re-audit's value is the **delta**, not a re-enumeration.

### NEW

- **cmdinj-1 — shell-string `execSync` in `sync-content.js` (lines 198, 249).** The most important new item. The prior **Q2** ("`sync-content.js` uses unsafe `rm -rf` via shell interpolation", marked **FIXED**) was correctly remediated: `rm -rf` became `rmSync(...)` guarded by a `startsWith` boundary check (lines 233-236) and `cp -r` became `cpSync(...)`. But the file still builds a shell command by interpolating `bookSlug` into `execSync(`node scripts/generate-toc.js ${bookSlug}`)` at two sites. This is a *distinct* sink that the Q2 fix did not touch. Build-time-only on trusted sister-repo input -> **LOW**. Fix is the `spawnSync` array form already present at line 184.
- **pathtrav-1** — shared root cause with cmdinj-1; the slug allowlist closes both. LOW.
- **dep-1 … dep-4** — four npm advisory groups (devalue DoS, svelte SSR-XSS, svelte ReDoS, kit `query.batch`) that did not appear in the prior report's dependency section. All real upstream, all **unreachable** in this no-SSR static deployment -> **LOW**, remediated by a single non-breaking `npm audit fix`.
- **csp-1** — `connect-src` now lists `tutor.namsbokasafn.is` and omits `ritstjorn.namsbokasafn.is`. The prior report's **S6** flagged a *different* host (`tutor.efnafraedi.app`) as "verify if still needed". The current mismatch is a functional defect (analytics silently blocked), not the same finding -> NEW, LOW.
- **hdr-1, sri-1, pwa-1** — deploy-verification, third-party-CDN-SRI, and SW-opaque-caching hardening items not enumerated before. All LOW.

### REGRESSION

- **0 true regressions.** No item the prior report marked fixed/resolved was observed reverted. One regression *note* is recorded for traceability: the shell-string-interpolation **class** of issue recurs in `sync-content.js` (cmdinj-1) despite Q2 being marked fixed — the Q2 fix scope covered `rm -rf`/`cp -r` but not the `generate-toc` invocation. It is tracked above as NEW with this note rather than as a reversion of Q2.

### KNOWN-UNFIXED

- **proto-2** — shallow store validation is the documented residual of the prior **F7** work (`storeValidation.ts`). F7 fixed prototype-pollution safety (proto-1, now dismissed as structurally immune) and added top-level validators; nested validation remains shallow by design. Self-only -> LOW, with an explicit gating precondition on any future import feature.
- **csp-2** — `'unsafe-inline'` / missing `base-uri`/`form-action` is the same root as the prior **S5** (left Open). INFO.

---

## Dependencies

`npm audit` reports 3 advisory groups (1 high-CVSS, collapsing to several moderate sub-advisories). All are **real upstream but effectively LOW for this app** because of the static, no-SSR architecture:

| Advisory | Package | Why unreachable here | Fix |
|----------|---------|----------------------|-----|
| GHSA-77vg-94rm-hx3p (DoS) | devalue 5.8.0 | No SSR server; client parses only trusted build-time payloads | 5.8.1 |
| GHSA-pr6f-5x2q-rwfp / -f3cj-j4f6-wq85 / -rcqx-6q8c-2c42 (XSS) | svelte 5.55.5 | SSR-render bugs run only at build-time prerender; DOM-clobbering needs attacker DOM that trusted-content rendering never provides | 5.55.10 |
| GHSA-9rmh-mm8f-r9h6 (ReDoS) | svelte 5.55.5 | `<svelte:element>` not used anywhere | 5.55.10 |
| GHSA-hgv7-v322-mmgr (info disclosure) | @sveltejs/kit 2.59.1 | `query.batch`/remote functions unused; no server runtime | 2.61.1 |

**Overrides verified clean (dismissed dep-5):** `cookie 0.7.2` and `serialize-javascript 7.0.5` both resolve above their fix lines, are dev/build-time only, and mask no current advisory.

**Remediation (dep-6):** Run `npm audit fix` (no `--force`) — all bumps are same-major patch (`devalue 5.8.0->5.8.1`, `svelte 5.55.5->5.55.10`, `@sveltejs/kit 2.59.1->2.61.1`, plus deduped `esrap`, `@sveltejs/acorn-typescript`). Then `npm ci && npm run check && npm run build && npm test`, and commit the regenerated `package-lock.json`. This is low-priority for *application security* — but note the practical urgency below: the CI `security` job is currently red because of the `devalue` HIGH advisory.

---

## CI/CD & operational scripts

Reviewed directly after the workflow run (outside the six automated dimensions). **No security findings**; one positive hardening note and one CI-status consequence.

**GitHub Actions (`.github/workflows/ci.yml`) — well-hardened:**

- All third-party actions are **pinned to full commit SHAs** (`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`), the GitHub-recommended defense against tag/ref-hijack supply-chain attacks.
- Triggers are `push` / `pull_request` to `main` — **not `pull_request_target`** — so untrusted fork PRs never execute with repository secrets.
- No `run:` step interpolates `${{ github.event.* }}` (or any other attacker-controllable context), so there is **no script-injection vector**.
- The workflow references **no secrets at all** (there is no deploy step here; deployment to the Linode host is handled out-of-band).
- `dependabot.yml` is present (dependency-update hygiene).
- **Relevance to cmdinj-1:** CI checks out the *trusted* content repo's default branch and runs `sync-content.js` over it. A pull request to *this* repo cannot inject content into that path, and the job holds no secrets — confirming cmdinj-1 stays LOW even in CI.

**One concrete present-day consequence (ties to dep-1):** the `security` job runs `npm audit --audit-level=high`, which **currently fails** because of the `devalue` HIGH advisory. So `npm audit fix` is not merely hygiene — it **unblocks the red CI security gate**.

**Shell scripts:**

- `scripts/setup-goaccess.sh` — a root/`sudo` server-admin tool (`set -euo pipefail`; installs GoAccess via apt; renders an nginx-log report). It operates only on fixed server paths and an admin-supplied day count; **no web/untrusted input reaches it**, no `curl | bash`, no hardcoded credentials, and it `--anonymize-ip`s. **No security finding.** (Minor *non-security* bug: the report title is assembled into a string-built command, so the embedded single quotes won't quote at expansion time and `--html-report-title` gets mangled — cosmetic, admin-only.)
- `.husky/_/husky.sh` is Husky-generated git-hook tooling — not in scope.

---

## Dismissed / by-design

Ruled out by both lenses; listed to show severity was not inflated.

**XSS / `{@html}` (all trusted-content or escaped):**
- `xss-1` SearchModal `highlightQuery` — both snippet and query HTML-escaped; query is typed-input-only.
- `xss-2` ContentRenderer — trusted CNXML files; route params only select the path.
- `xss-3` Print page — same trusted CNXML source, build/PDF-time.
- `xss-4` Landing FAQ — hardcoded developer-authored `faq.ts` array.
- `xss-5` Yfirlit — DOMParser round-trip of trusted CNXML via `outerHTML`.
- `xss-6` six action files' `innerHTML` — every dynamic value is escaped, a static literal, or a verbatim copy of trusted CNXML DOM.

**Input / proto-pollution:**
- `proto-1` `validateStoreData` — structurally immune (whitelist merge over trusted defaults keys).
- `proto-3` search-history `JSON.parse` — user's own data; auto-escaped text sink.
- `proto-4` page-data `JSON.parse` — trusted same-origin HTML; consumed as scalar metadata.

**Build scripts:**
- `checkstatus-1` `check-status.mjs execSync` — all callers pass hardcoded literals.
- `redos-audit-1` audit-content regexes — empirically linear; build-time over trusted content.
- `network-buildtime-1` TTS/local-server build fetches — localhost/dev URLs, trusted bodies, responses written as opaque bytes.

**Network / routing / worker:**
- `net-1` editorial-API egress — trusted route slugs only, fire-and-forget, response never read; `trackSearch` has zero callers.
- `net-2` TTS proxy env var — unused; no sink exists.
- `net-3` feedback mailto — fixed scheme + recipient, `encodeURIComponent`-wrapped, self-only.
- `net-4` `goto()` targets — structurally same-origin; `location.hash` feeds only `getElementById`.
- `net-5` section/print fs reads + content fetches — build-time-only fs read; runtime fetch components TOC-resolved; same-origin static GETs.
- `net-6` search worker — same-origin dedicated worker; `RegExp` built from `normalizeText`-stripped query (no metacharacters).

**Dependencies:**
- `dep-5` overrides verification, `dep-6` remediation rollup — informational, no sink.

---

## Recommended remediation order

1. **`npm audit fix`** (dep-1…dep-4) — one command, non-breaking patch bumps, clears the audit report **and unblocks the currently-failing CI `security` job** (`npm audit --audit-level=high` trips on the `devalue` HIGH advisory). Then `npm run check && npm run build && npm test`.
2. **`sync-content.js` hardening** (cmdinj-1 + pathtrav-1) — convert the two `execSync(`node scripts/generate-toc.js ${bookSlug}`)` calls to `spawnSync('node', ['scripts/generate-toc.js', bookSlug], …)` and add the `/^[a-z0-9][a-z0-9-]*$/` slug allowlist at `getSourceBooks()`. Removes the shell entirely and closes both items.
3. **CSP `connect-src` correctness** (csp-1) — add `https://ritstjorn.namsbokasafn.is`, drop unused `tutor.*`, centralize the header to stop 7-block drift. Restores analytics.
4. **Deploy-time header verification** (hdr-1) — add a `curl -I` smoke check to the deploy pipeline.
5. **CSP defense-in-depth** (csp-2) — add `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`.
6. **GoatCounter decision** (sri-1) — self-host `count.js` or update CLAUDE.md to acknowledge the one allowed third-party origin.
7. **SW cache tightening** (pwa-1) — `statuses:[200]` + origin-anchored patterns.
8. **Track the import-feature precondition** (proto-2) — document that any future cross-user import must deep-validate before merge.

_None of the above is an exploitable cross-user vulnerability in the current static, no-backend deployment; the list is hygiene and defense-in-depth, ordered by effort-to-value._
