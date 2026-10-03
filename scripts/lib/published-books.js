/**
 * Which books may reach the website — the allowlist the sync reads.
 *
 * [LEAD] ruling 2026-08-22 (efni §C109): only chemistry and organic chemistry
 * were to be published. `edlisfraedi-2e`, `liffraedi-2e` and `orverufraedi` are
 * held back. It is a PAUSE, not a withdrawal — indefinite, reversible, and nothing
 * is deleted in either repo. The decision record is efni's
 * `docs/decisions/2026-08-22-two-book-focus-and-publication-withdrawal.md`;
 * status is owned by its active register (§C109), not by this file.
 *
 * SUPERSEDED IN PART, 2026-09-23: [USER] withdrew `lifraen-efnafraedi` (organic
 * only; the three books above stay paused as-is) — efni's
 * `docs/decisions/2026-09-23-organic-translation-stopped-openstax-notice.md`.
 * It is off the allowlist and on RETIRED_BOOKS below, which is a different
 * thing from being held back: see the note there.
 *
 * ⚠️ THE LIST IS AN ALLOWLIST, NOT A DENYLIST, AND THAT IS DELIBERATE. A book
 * that appears in efni and is not named here is withheld by default. efni gains
 * books faster than vefur hears about it (`stjornufraedi` is already in its
 * tree), and the failure that matters is publishing something unreviewed, not
 * failing to publish something ready.
 *
 * 🔴 SLUG-KEYED, NEVER STATUS-KEYED. `src/lib/types/book.ts` marks four of five
 * books `status: 'preview'` — INCLUDING `lifraen-efnafraedi`, which the 2026-08-22
 * ruling kept. Excluding "the preview books" would have unpublished organic
 * chemistry then, and a status-keyed retirement would delete the three paused
 * books now.
 *
 * ⚠️ THIS GOVERNS WHAT IS SYNCED, NOT WHAT IS ALREADY DEPLOYED. Withheld books
 * keep whatever is already in `static/content/` and on the server; the sync's
 * stale-directory sweep is keyed on the SOURCE tree, so it does not remove them
 * (see the note beside that sweep in sync-content.js). Retiring already-live
 * pages is a separate decision with its own consequences — `fallback: '200.html'`
 * plus nginx `try_files` means a removed page answers 200 with the SPA shell,
 * not 404 — and it is not implemented here.
 */

/** Book slugs permitted to be synced into `static/content/`. */
export const PUBLISHED_BOOKS = Object.freeze(['efnafraedi-2e']);

/**
 * Books taken OFF the website, as opposed to held back. A retired book is
 * withheld from the sync like any book not on PUBLISHED_BOOKS, but the deploy
 * does not freeze it: it hides the book from the transfer and lets `--delete`
 * remove the server's copy (scripts/deploy-excludes.js), and the reader stops
 * serving it (`retiredBooks` in src/lib/types/book.ts; a test keeps the two
 * equal). Its book.ts entry stays: efni's licence-contract test reads it.
 *
 * Every retired book stays in KNOWN_BOOKS, so the deploy can still name its
 * directories, and must never be on PUBLISHED_BOOKS. Slug-keyed for the same
 * reason as the allowlist: the books paused on 2026-08-22 share organic's
 * `status: 'preview'`, and they stay frozen.
 *
 * The real 404s are nginx's job (`nginx-config-example.conf`, "Withdrawn
 * book"): without them a removed page answers 200 with the SPA shell.
 *
 * To REVERSE: take the slug off this list, move its entry back into `books` in
 * book.ts, put it back on PUBLISHED_BOOKS, remove the nginx blocks and re-sync.
 */
export const RETIRED_BOOKS = Object.freeze(['lifraen-efnafraedi']);

/**
 * Every book the reader registers (`src/lib/types/book.ts`; a test keeps the two
 * equal). The deploy's freeze protects each of these the allowlist holds back
 * EVEN WHEN the efni checkout it reads lacks the book — a deploy pinned to an
 * older efni commit, or a book left with no rendered chapters, must not delete
 * a frozen book's live pages. Taking a book off the server is a decision, never
 * a side effect of what one efni tree happens to contain. (Published books get
 * the same guarantee from scripts/deploy.js, which refuses a build that lacks
 * one.)
 */
export const KNOWN_BOOKS = Object.freeze([
	'edlisfraedi-2e',
	'efnafraedi-2e',
	'liffraedi-2e',
	'lifraen-efnafraedi',
	'orverufraedi'
]);

/** Where the ruling lives, quoted in errors so the reader can go read it. */
export const RULING_REFERENCE =
	'[LEAD] 2026-08-22 — namsbokasafn-efni §C109, docs/decisions/2026-08-22-two-book-focus-and-publication-withdrawal.md';

/** Where the retirement ruling lives. */
export const RETIREMENT_REFERENCE =
	'[USER] 2026-09-23 — namsbokasafn-efni docs/decisions/2026-09-23-organic-translation-stopped-openstax-notice.md';

/**
 * Is this book allowed on the website?
 *
 * Unknown slugs are NOT published — see the allowlist note above.
 */
export function isPublished(bookSlug) {
	return PUBLISHED_BOOKS.includes(bookSlug);
}

/** Has this book been taken off the website? */
export function isRetired(bookSlug) {
	return RETIRED_BOOKS.includes(bookSlug);
}

/** The subset of `slugs` that may be published, order preserved. */
export function publishableBooks(slugs) {
	return slugs.filter((slug) => isPublished(slug));
}

/** The subset of `slugs` held back by the ruling, order preserved. */
export function withheldBooks(slugs) {
	return slugs.filter((slug) => !isPublished(slug));
}
