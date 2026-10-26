/**
 * 'Tilkynna villu' and the /feedback prefill (plan step S3.3, register PED-15).
 * e2e/report-error.spec.ts follows the link from a real section page.
 */
import { describe, expect, it } from 'vitest';
import { feedbackHref, PREFILL_LIMITS, readFeedbackPrefill } from './feedbackPrefill';

const BOOKS = ['efnafraedi-2e', 'liffraedi-2e'];

describe('feedbackHref', () => {
	it("links a section to /feedback with its route params and the type 'Villa í þýðingu'", () => {
		expect(feedbackHref({ bok: 'efnafraedi-2e', kafli: '01', hluti: '1-2-efnishamur-og-flokkun-efnis' })).toBe(
			'/feedback/?tegund=translation_error&bok=efnafraedi-2e&kafli=01&hluti=1-2-efnishamur-og-flokkun-efnis'
		);
	});

	it('leaves out hluti when there is none', () => {
		expect(feedbackHref({ bok: 'efnafraedi-2e', kafli: '01' })).toBe('/feedback/?tegund=translation_error&bok=efnafraedi-2e&kafli=01');
	});

	it('round-trips through readFeedbackPrefill', () => {
		const href = feedbackHref({ bok: 'efnafraedi-2e', kafli: '04', hluti: '4-4-heimtur-efnahvarfa' });
		expect(readFeedbackPrefill(new URL(href, 'https://namsbokasafn.is').search, BOOKS)).toEqual({
			tegund: 'translation_error',
			bok: 'efnafraedi-2e',
			kafli: '04',
			hluti: '4-4-heimtur-efnahvarfa'
		});
	});
});

describe('readFeedbackPrefill', () => {
	it('returns nothing for an empty query string', () => {
		expect(readFeedbackPrefill('', BOOKS)).toEqual({});
	});

	it('drops a book the form does not offer', () => {
		expect(readFeedbackPrefill('?bok=lifraen-efnafraedi', BOOKS).bok).toBeUndefined();
	});

	it('drops an unknown feedback type', () => {
		expect(readFeedbackPrefill('?tegund=spam', BOOKS).tegund).toBeUndefined();
	});

	it('drops a chapter or section that is not a slug', () => {
		expect(readFeedbackPrefill('?kafli=<b>1</b>&hluti=1-1%20x', BOOKS)).toEqual({});
	});

	it('caps a long section slug', () => {
		const long = 'a'.repeat(PREFILL_LIMITS.hluti + 50);
		expect(readFeedbackPrefill(`?hluti=${long}`, BOOKS).hluti).toHaveLength(PREFILL_LIMITS.hluti);
	});

	it('caps a long chapter value', () => {
		expect(readFeedbackPrefill(`?kafli=${'1'.repeat(PREFILL_LIMITS.kafli + 5)}`, BOOKS).kafli).toHaveLength(PREFILL_LIMITS.kafli);
	});

	it('takes no free text: a texti parameter is ignored', () => {
		expect(readFeedbackPrefill('?texti=Hall%C3%B3', BOOKS)).toEqual({});
	});
});
