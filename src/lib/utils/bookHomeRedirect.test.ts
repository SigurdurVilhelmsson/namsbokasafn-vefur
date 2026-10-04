import { describe, it, expect } from 'vitest';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import { redirectToBookHome } from './bookHomeRedirect';
import { books } from '$lib/types/book';

function thrown(fn: () => unknown): unknown {
	try {
		fn();
	} catch (e) {
		return e;
	}
	throw new Error('expected a throw');
}

describe('redirectToBookHome', () => {
	it('redirects a registered book to its home, with the trailing slash', () => {
		const slug = books[0].slug;
		const e = thrown(() => redirectToBookHome(slug));
		expect(isRedirect(e) && e.location).toBe(`/${slug}/`);
	});

	it('answers 404 for anything else, so the URL cannot steer it off-site', () => {
		for (const slug of ['//evil.example', 'evil.example', 'no-such-book']) {
			const e = thrown(() => redirectToBookHome(slug));
			expect(isHttpError(e) && e.status).toBe(404);
		}
	});
});
