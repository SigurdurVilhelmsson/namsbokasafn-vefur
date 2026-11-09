# SvelteKit 3 · `$lib`, the version checks and the service worker

- **Date:** 2026-11-09
- **Status:** Ruled. `$lib`: keep it for now. Version checks: mention them on /personuvernd. Service worker: rebuild it with `buildSW`.
- **Decided by:** [USER], after reading the kit 3 trial's report
- **Names:** no earlier decision file. The kit 3 step and its timing are in CLAUDE.md's "SvelteKit 3" status item ([USER], 2026-11-02).
- **Brief:** `docs/plans/2026-11-09-kit3-trial-sizing.md`, its decisions section and "Must fix before the train", on the branch `trial/kit3-migration` (head `5221df5`, not merged)
- **Gates:** the kit 3 step and its train (late December 2026 to the first week of January 2027)

> **Frozen record, dated 2026-11-09.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

The kit 3 trial (2026-11-09) ran `npx sv migrate sveltekit-3` on a branch and measured what is left. It left three choices for [USER] before the step starts:

1. Kit 3 no longer generates the `$lib` alias. Keep `$lib`, or move to `#lib`?
2. Kit 3 asks the server for its version file when a tab comes back into view. Should the privacy page say so?
3. Kit 3 forces `@vite-pwa/sveltekit` 2.x, whose `generateSW` can no longer load `/sw-offline-book.js`. Which way should the service worker be rebuilt?

## Rulings

### `$lib` or `#lib`

**Keep `$lib` for now.** The kit 3 PR keeps the explicit alias the trial used (`alias: { $lib: 'src/lib', '$lib/*': 'src/lib/*' }` in the kit options, which move from `svelte.config.js` into `vite.config.ts`). The `#lib` rewrite waits for a later kit.

- Why it comes up: kit 3 marks `config.alias` as one that "is deprecated, and will be removed in a future version". The codemod's `lib-alias` task would rewrite 155 code files (+457/−457) and also edit CLAUDE.md and 12 docs. Mechanical either way; doing it later keeps the kit 3 diff smaller.

### The version checks

**Mention them on /personuvernd.** One sentence, added in the kit 3 PR and marked `D20: proposed`, so [USER] checks its wording with that train's other strings.

- What kit 3 does (3.1.1, `updated.check()` in `src/runtime/app/state/client.svelte.js`): it fetches `/_app/version.json` from our own server with `cache-control: no-cache` and compares the version, when the tab regains focus or becomes visible, and on a poll, hourly by default. `version.pollInterval: 0` stops only the poll. The request carries nothing about the reader beyond what every request to the server carries, so D03's data rule holds; the sentence is there because it is new traffic a reader might wonder about.
- Before wording it, check on the server whether nginx logs these requests. `nginx-config-example.conf` turns the access log off for `/_app/` (`location ^~ /_app/`), and on 2026-10-26 (read-only) the live log left out `/_app/` requests too; the page today says the server logs requests for the pages and the book text. The sentence must agree with what the live log does.
- The same block in the example sends `expires 1y` and `Cache-Control: public, immutable` for everything under `/_app/`, `version.json` included, although that file is not hashed. Kit's check asks with `cache-control: no-cache`. In the step, check the live server's headers for `/_app/version.json`, so a cached copy can't hide a new version.

### The service worker

**Rebuild it with `buildSW`:** our own worker source, bundled by `@vite-pwa/sveltekit` 2.x, importing the workbox modules. The trial's report calls this route (a).

- Why a rebuild is needed (measured in the trial): 2.x's workbox fork has no `importScripts` option, so `/sw-offline-book.js` isn't loaded and the page refuses the download. It also emits our `plugins` before `ExpirationPlugin` and `CacheableResponsePlugin`, whatever the key order. So on the page route the downloaded-book fallback runs before expiry, and an offline reader whose downloaded copy is over 30 days old would get nothing. `e2e/offline.spec.ts:171` catches it.
- With `buildSW` the routes, the plugin order and the offline-book check are ordinary code in the worker, not options a generator serializes.
- Cost: the most work of the three routes, so the upper end of the trial's estimate (two to three sessions), plus the offline checks on a real phone and iPad.

## What follows

- The worker source takes over `runtimeCaching.ts`'s routes, imported or moved. Bundled code is not serialized, so the source-text rule in CLAUDE.md (arrow functions only, no outside identifiers) no longer binds them; the unit test that rebuilds each function from its text gives way to tests of the worker's own code.
- The page route's downloaded-book fallback runs after `ExpirationPlugin`, as CLAUDE.md requires. `e2e/offline.spec.ts:171` reads that order from the emitted `sw.js`; it stays the guard, or a test of the same order replaces it.
- Still never `navigateFallback`: a page load offline gets `/200.html` only through the NetworkOnly route with `PrecacheFallbackPlugin` (`appShellNavigation`). `e2e/offline-cold-start.spec.ts:162` needs its patterns updated first (they match workbox 7's compact output), or its `NavigationRoute` check never runs.
- `/200.html` stays precached with a revision that changes every build, as `kit: { adapterFallback, spa: true }` gives today; check that it still does under `buildSW`.
- `scripts/deploy.js` keeps refusing a build whose worker imports a file the build lacks (`missingServiceWorkerImports`) or whose precache manifest it can't read or that lists a missing file (`parsePrecacheManifest`, `missingPrecacheEntries`). Both checks must still work on the new worker; the trial needed `minify: false` for the second.
- `npm run dev` still gets a worker; `src/lib/sw/devWorker.test.ts` is rewritten for the new dev plugin.
- `PWAUpdater.svelte` imports `virtual:pwa-register/svelte`, which still resolved in the trial; the update prompt is checked on a build.
- CLAUDE.md's "Service worker caching and offline download" section is rewritten in the same PR.
- The `$lib` line in CLAUDE.md ("Path alias") stays true; the mentions of `svelte.config.js` change when it goes.

## Options not chosen

- `$lib`: switch to `#lib` in the kit 3 step, with the codemod's `lib-alias` task.
- Version checks: leave the page as it is, since the checks send no reader data.
- Service worker (b): keep `generateSW` and add `importScripts("/sw-offline-book.js");` to the emitted `sw.js` after each build. Small, and done by hand in the trial it made the whole-book download and the offline cold start pass, but a later fork release can change the output, and it leaves the plugin order to fix another way.
- Service worker (c): drop the plugin for kit 3's own service worker (`src/service-worker/`, `$app/manifest`) with Google's workbox libraries. The most control and the most rework, the update prompt included.
