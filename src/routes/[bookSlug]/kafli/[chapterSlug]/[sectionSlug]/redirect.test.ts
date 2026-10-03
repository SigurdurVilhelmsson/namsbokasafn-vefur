import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isRedirect, isHttpError } from '@sveltejs/kit';
import { load } from './+page';
import type { TableOfContents } from '$lib/types/content';

/** Post-prune TOC: only the corrected filename is published. */
const POST_PRUNE_TOC: TableOfContents = {
	title: 'Efnafræði 2e',
	chapters: [
		{
			number: 10,
			title: 'Vökvar og fastefni',
			sections: [
				{ number: '10.4', title: 'Fasarit', file: '10-4-fasarit.html' },
				{ number: '10.5', title: 'Fastur efnishamur', file: '10-5-fastur-efnishamur.html' }
			]
		}
	]
};

function fetchReturning(toc: TableOfContents) {
	return vi.fn(async (url: string) => {
		if (url.endsWith('toc.json')) {
			return { ok: true, status: 200, json: async () => toc } as unknown as Response;
		}
		return {
			ok: true,
			status: 200,
			text: async () => '<article data-module-id="m68770">efni</article>'
		} as unknown as Response;
	});
}

/** Invoke the route's universal load with just the bits it reads. */
function callLoad(params: { bookSlug: string; chapterSlug: string; sectionSlug: string }, toc = POST_PRUNE_TOC) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (load as any)({ params, fetch: fetchReturning(toc) });
}

describe('renamed section slugs redirect instead of 404ing', () => {
	it('redirects the old ch10 slug to the corrected one', async () => {
		const err = await callLoad({
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '10',
			sectionSlug: '10-5-fast-astand-efnis'
		}).then(
			() => null,
			(e: unknown) => e
		);

		expect(isRedirect(err)).toBe(true);
	});

	it('sends the reader to the new slug, with a trailing slash', async () => {
		const err = await callLoad({
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '10',
			sectionSlug: '10-5-fast-astand-efnis'
		}).catch((e: unknown) => e);

		// The prerenderer copies Location verbatim; a slash-less target costs the
		// reader an extra nginx 301 hop because trailingSlash is 'always'.
		expect((err as { location: string }).location).toBe(
			'/efnafraedi-2e/kafli/10/10-5-fastur-efnishamur/'
		);
	});

	// CONTROL: our own overlay can delete the page efni named as the target.
	// When the target is not published, we must fall through to the 404 rather
	// than redirect onto a dead URL.
	it('does NOT redirect when the target section is absent from the TOC', async () => {
		const emptyToc: TableOfContents = { title: 'Efnafræði 2e', chapters: [] };

		const err = await callLoad(
			{ bookSlug: 'efnafraedi-2e', chapterSlug: '10', sectionSlug: '10-5-fast-astand-efnis' },
			emptyToc
		).catch((e: unknown) => e);

		expect(isRedirect(err)).toBe(false);
		expect(isHttpError(err)).toBe(true);
	});

	// CONTROL: the current slug must load normally, not bounce.
	it('does not redirect the current slug', async () => {
		const result = await callLoad({
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '10',
			sectionSlug: '10-5-fastur-efnishamur'
		}).catch((e: unknown) => e);

		expect(isRedirect(result)).toBe(false);
	});
});

describe('the catch block must not swallow redirects', () => {
	// This is the trap: `load` opens its try BEFORE loadTableOfContents, and the
	// catch re-throws only isHttpError. A Redirect is not an HttpError, so
	// without `|| isRedirect(e)` the redirect is converted to error(404) and the
	// whole feature becomes a silent no-op that still builds green.
	it('propagates a redirect rather than converting it to a 404', async () => {
		const err = await callLoad({
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '10',
			sectionSlug: '10-5-fast-astand-efnis'
		}).catch((e: unknown) => e);

		expect(isHttpError(err)).toBe(false);
		expect((err as { status: number }).status).toBe(301);
	});
});

describe('entries() prerenders a stub for every renamed slug', () => {
	// The local toc.json may still be PRE-PRUNE and list the old file, in which
	// case entries() would emit the old slug anyway and the test would prove
	// nothing. So we mock the filesystem with a POST-PRUNE toc: the old slug can
	// then only appear if SECTION_REDIRECTS put it there.
	const POST_PRUNE_JSON = JSON.stringify({
		title: 'Efnafraedi 2e',
		chapters: [
			{
				number: 10,
				title: 'Vokvar og fastefni',
				sections: [{ number: '10.5', title: 'Fastur efnishamur', file: '10-5-fastur-efnishamur.html' }]
			}
		]
	});

	beforeEach(() => {
		vi.doMock('node:fs', () => ({
			existsSync: (p: string) => String(p).includes('efnafraedi-2e'),
			readFileSync: () => POST_PRUNE_JSON
		}));
	});

	afterEach(() => {
		vi.doUnmock('node:fs');
		vi.resetModules();
	});

	it('emits the old slug even though the TOC no longer lists it', async () => {
		const { entries: freshEntries } = await import('./+page');
		const all = await freshEntries();

		expect(all).toContainEqual({
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '10',
			sectionSlug: '10-5-fast-astand-efnis'
		});
	});

	// CONTROL: the real section must still be emitted; if the union dropped it,
	// the whole chapter would stop prerendering.
	it('still emits the current slug', async () => {
		const { entries: freshEntries } = await import('./+page');
		const all = await freshEntries();

		expect(all).toContainEqual({
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '10',
			sectionSlug: '10-5-fastur-efnishamur'
		});
	});

	// CONTROL: no duplicate entry when the TOC *does* still list the old file
	// (the pre-prune state we are in today) — a duplicate would make the
	// prerenderer write the real page and the stub to the same path.
	it('does not emit duplicates', async () => {
		const { entries: freshEntries } = await import('./+page');
		const all = await freshEntries();
		const keys = all.map((e) => `${e.bookSlug}/${e.chapterSlug}/${e.sectionSlug}`);

		expect(keys.length).toBe(new Set(keys).size);
	});
});
