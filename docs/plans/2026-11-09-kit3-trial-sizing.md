# SvelteKit 3 trial: what's left (2026-11-09)

Trial branch `trial/kit3-migration`, from `main` `045deee`, local only (not pushed).
Built in a `/var/tmp` worktree with the main checkout's content copied in (chemistry is
efni's ② preview there, so nothing here says anything about a deploy). Not for merge as
is: the real migration is its own step and train in late December (CLAUDE.md, "SvelteKit 3").

## Verdict

- **Kit 3 itself is small.** The codemod and a few hand edits do it; what remains is
  mechanical cleanup. About half a session.
- **The service-worker engine is the real work.** Kit 3 forces `@vite-pwa/sveltekit` 2.x,
  which swaps vite-plugin-pwa and workbox-build 7 for `@unplugin-pwa` 0.0.4 and a workbox
  fork (8.0.14), both published in the first week of November. It drops `importScripts`,
  and it has two traps that only e2e tests catch (the unit tests stay green). One to two
  sessions, plus device QA.
- **Overall: two to three sessions**, plus the phone and iPad offline checks.

## Gates: `main` against the trial

| Gate                                               | `main` (kit 2)                    | Trial (kit 3)                                                                |
| -------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| `npm ls`                                           | clean                             | clean                                                                        |
| `npm run check`                                    | 1,044 files, 0 errors, 0 warnings | 1,029 files, 0 errors, 0 warnings ¹                                          |
| `npm run lint`                                     | pass                              | pass                                                                         |
| `npm test`                                         | 1,901 passed, 1 skipped           | 1,899 passed, 2 failed, the same 1 skipped ²                                 |
| `npm run build:no-validate`                        | pass                              | pass, with three workarounds ³                                               |
| `build/sw.js` precache                             | 122 entries                       | 123: the 20 outside `_app/immutable/` identical, immutable JS 78 → 79        |
| `NavigationRoute` in the worker                    | 0                                 | 0                                                                            |
| Redirect stubs prerendered                         | 16                                | the same 16                                                                  |
| Files in `build/`                                  | 3,780                             | 3,781 (one more chunk); no `.map` files                                      |
| `deploy.js` dry run                                | accepts (122 listed, all present) | refuses a minified worker; accepts with `minify: false` (123)                |
| `npm audit`, production / full                     | 0 / 19                            | 0 / 15 (kit's own #1 and #2 gone; deepmerge #8 and minimatch #11 stay)       |
| e2e: pwa, offline, cold start, download (19 tests) | green in CI                       | 15 pass, 4 fail; with `importScripts` patched in by hand, 2 fail (see "e2e") |

¹ The 15 files are kit 2's 3 generated ambient `.d.ts` and 12 per-route `$types.d.ts` that
nothing imports; kit 3 supplies those through `node_modules/$app/types`. Kit 3 now also
checks `playwright.config.ts` and `e2e/helpers/seedSettings.ts`. No source file lost coverage.
`$app/tsconfig` still sets `allowJs`, `checkJs` and `esModuleInterop`.

² `devWorker.test.ts` finds vite-plugin-pwa's dev plugin by name; `runtimeCaching.test.ts`
reads the deleted `svelte.config.js`. Both need rewriting. Check, lint and the unit tests
were re-run on this report's own commit, with no `build/` in the tree.

³ Marked `TRIAL` in `vite.config.ts`; see "Must fix".

## Done on the branch

- `npx sv@1.3.0 migrate sveltekit-3`, every task but `lib-alias`: kit `^3.0.0` (3.1.1),
  adapter-static `^4.0.0` (4.0.1); `svelte.config.js` moved into the Vite config;
  `tsconfig.json` extends `$app/tsconfig`; `$app/environment` → `$app/env` (27 files);
  `$app/stores` → `$app/state` and `$page` → `page` (7 files). The other tasks (paths,
  external redirects, shallow routing, params, imports) found nothing to change.
- `@vite-pwa/sveltekit` 2.0.1; the `cookie` override deleted (cookie 2.0.2 now). The
  lockfile loses 321 packages (the Babel and Rollup chain behind workbox 7) and gains 12.
- `vite.config.ts` on `withPwa(kitOptions, pwaOptions)`: `workbox` → `generateSW`, the
  size cap to the top level, `injectRegister: false`, `navigateFallback: null` kept inside
  `generateSW` (see item 3 under "Must fix").
- Unit-test aliases and mocks for `$app/env` and `$app/state` (473 tests failed to resolve
  `$app/env` without them).

## Must fix before the train

1. **`/sw-offline-book.js` is no longer loaded into the worker.** The fork has no
   `importScripts` option (the build stops: "The option "importScripts" is unknown or has
   been deprecated"). The trial comments it out, so the page's "do you serve downloaded
   books?" check gets no answer. Choices, for December:
   - **(a) `buildSW`:** our own worker source, bundled by the plugin, importing the workbox
     modules. The routes become ordinary code: no source-text rule, no hidden plugin order
     (fixes 2 too). The most work, and the cleanest.
   - (b) keep `generateSW` and add the line to the emitted `sw.js` after the build. Small,
     but fragile: a later fork release can change the output. Done by hand in the trial,
     it made the whole-book download and the offline cold start pass (see "e2e").
   - (c) drop the plugin for kit 3's own service worker (`src/service-worker/`, `$app/manifest`)
     with Google's workbox libraries. Most control, most rework (the update prompt too).
2. **Trap: on the page route, the downloaded-book fallback now runs before `ExpirationPlugin`.**
   The fork always emits our `plugins` first, whatever the key order (seen in `build/sw.js`:
   `plugins: [{ cachedResponseWillBeUsed … }, new ExpirationPlugin(…), new CacheableResponsePlugin(…)]`).
   `runtimeCaching.ts` requires it after. So an offline reader whose downloaded copy was
   fetched more than 30 days ago gets nothing: `ExpirationPlugin` discards it. The unit
   test checks key order only and passes; `e2e/offline.spec.ts:171` reads the emitted
   order and fails (`offline-book:` at 475, `ExpirationPlugin` at 575), but only once the
   `importScripts` assertion above it passes. The download tests use fresh copies and
   pass. Fix with (a), or by moving the page fallback to `handlerDidError` (as the figure
   route does).
3. **Trap: `navigateFallback`.** 2.x sets it to `adapterFallback` (`/200.html`) unless the
   key is present inside `generateSW`: the CLAUDE.md "never `navigateFallback`" case. The
   trial keeps `navigateFallback: null` there and the worker has no `NavigationRoute`
   (counted by hand). `e2e/offline-cold-start.spec.ts:162` is the guard, but today it stops
   at its first assertion (the compact-text regex, item 6), so its
   `not.toContain('NavigationRoute')` line never runs: the guard is dark until item 6 is
   done. Keep the key, and fix the test first.
4. **The deploy check vs a minified worker.** 2.x bundles and minifies the worker
   (`precacheAndRoute` becomes `o([…])`), so `deploy.js` refuses the build ("Could not read
   the precache manifest"). The trial sets `minify: false`, and the dry run passes. Keep
   that (12.6 KB unminified, against main's 10.5 KB), or teach `parsePrecacheManifest` the
   minified form.
5. **`globStrict`.** 2.x appends a `prerendered/**` glob that our ignores empty, and now
   fails the build on an empty glob (1.x warned). The trial sets `globStrict: false`, which
   would also hide a real miss; better to make the patterns match what is precached.
6. Rewrite `devWorker.test.ts` for the new dev plugin (and check `npm run dev` still gets a
   worker), `runtimeCaching.test.ts`'s fallback check (read `vite.config.ts`), and the
   worker-text patterns in `offline-cold-start.spec.ts:162` (and any others that match
   workbox 7's compact output).
7. Re-read CLAUDE.md's service-worker section against the new engine: the source-text rule
   still holds (it serializes with `serialize-javascript`), "key order is plugin order" no
   longer does, and the vite-plugin-pwa names and the dev-worker note change.

## Cleanup (doesn't block)

- `error(404, { message })` → `error(404, 'message')`: 26 calls in 11 files, all
  message-only. Deprecated in 3.1.1 but still accepted.
- Remove `.github/dependabot.yml`'s three ignores (kit, adapter-static, `@vite-pwa/sveltekit`).
- Delete `MIGRATION_TASKS.md`. Its other items checked out: the 7 `goto` calls and 3
  `redirect` calls all go to internal routes, and its `json`/`text` and `invalidateAll`
  findings are false positives.
- 18 new `prerender_http_error` warnings: the PDF button fetches
  `/downloads/<book>/manifest.json` while prerendering, a folder only the server has
  (main's build printed none). Warnings only; quieten or leave.
- Docs: CLAUDE.md's "Path alias", `svelte.config.js` mentions (fallback, prerender) and the
  status block.

## Decisions for [USER]

- **`$lib` or `#lib`.** The trial keeps `$lib` with an explicit alias, but kit 3 warns that
  `config.alias` "is deprecated, and will be removed in a future version". The codemod's
  `lib-alias` task would rewrite 155 code files (+457/−457) and also edits CLAUDE.md and 12
  docs. Mechanical either way; now or at a later kit.
- **Version checks.** Kit 3 fetches `/_app/version.json` every time a reader's tab
  regains focus or becomes visible, and hourly. `version.pollInterval: 0` stops only the
  hourly one. Our own server, no reader data, so the D03 rule holds, but it is new traffic
  and nginx will log it. Mention it on /personuvernd or not? On its own it changes nothing
  on screen: kit acts on it only when a page fails to load (it then updates the worker and
  reloads).
- **Which service-worker route** (1a, 1b or 1c above).

## QA in December (behaviour no test sees)

- A link to the page you are on now re-runs its load (`refreshAll()`) instead of doing
  nothing: the sidebar's current section, the header's book link on the book home.
- The update flow: kit's own "new version" handling beside our "Uppfæra" prompt.
- `goto()` now rejects a destination that isn't a route; ours are all route-shaped.
- The offline set on a real phone and iPad, as for train 11.

## About the codemod (for December)

- Its `svelte-config` task stops on any file that mentions "svelte.config" and starts with
  a `#!` line (`scripts/deploy-excludes.js`), after it has already moved the config; the
  remaining tasks can be run by name.
- It reprints every file it touches (imports wrapped, regex parentheses, markup reflowed in
  `.svelte` templates): 33 files, +698/−540 for 49 real lines. The branch keeps that raw
  output in one commit and replaces it with the minimal edits in the next.
- It runs `npm run format` unasked, which reformatted three unrelated Markdown files.

## e2e

`pwa.spec.ts`, `offline.spec.ts`, `offline-cold-start.spec.ts` and
`offline-download.spec.ts` (19 tests), one worker, the build Playwright makes itself:

- **15 pass, 4 fail.** Three fail because `/sw-offline-book.js` isn't loaded: the page
  refuses the download ("Ónettengdur lestur er ekki tilbúinn enn. Opnaðu síðuna aftur og
  reyndu svo."), so the guard turns the gap into a visible refusal, as designed; and
  `offline.spec.ts:149` stops at its `importScripts` assertion. The fourth,
  `offline-cold-start.spec.ts:162`, matches workbox 7's compact text
  (`{url:"200.html",revision:"…"}`); the new worker has the same entry with a 32-hex
  revision and the same `NetworkOnly` + `PrecacheFallbackPlugin` route, written over
  several lines with plain names. That test needs its patterns updated, not the app.
- **With `importScripts("/sw-offline-book.js");` prepended to the built worker by hand**
  (an experiment, not committed; the patched `build/` and `.svelte-kit/output/` were deleted
  afterwards) and the three offline specs rerun against `vite preview`:
  9 pass, 2 fail. The whole-book download (every page and figure offline) and the cold
  start of a downloaded book pass. The two failures are `offline-cold-start.spec.ts:162`
  (format, above) and `offline.spec.ts:171` (the plugin order, trap 2).

Not run: the rest of the e2e suite (the a11y ratchet, the pager, print). Run all of it
in December.
