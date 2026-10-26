/**
 * The 'Tilkynna villu' link on a machine-translated section and the /feedback
 * fields it prefills (plan step S3.3, register PED-15).
 *
 * The query string is untrusted: anyone can write a /feedback link. So every
 * value is checked and capped here, and anything that fails is dropped rather
 * than shown. Svelte escapes what reaches the page, and the values only go
 * into the student's own e-mail, which they read before sending.
 *
 * There is deliberately no free-text parameter (the register's optional
 * `texti`): GoatCounter's count.js sends the page's query string (`q`), so any
 * text put in this URL would leave the device. Book, chapter and section slugs
 * name a page of the book, nothing about the student.
 */
import { FEEDBACK_TYPES, type FeedbackType } from '$lib/config';

/** Longest value kept per field. The longest chemistry section slug is 55 characters. */
export const PREFILL_LIMITS = { kafli: 20, hluti: 120 } as const;

export interface FeedbackPrefill {
	tegund?: FeedbackType;
	bok?: string;
	kafli?: string;
	hluti?: string;
}

const SLUG = /^[a-z0-9-]+$/;

function slugParam(value: string | null, limit: number): string | undefined {
	if (!value) return undefined;
	const capped = value.trim().toLowerCase().slice(0, limit);
	return SLUG.test(capped) ? capped : undefined;
}

/**
 * The /feedback link for a section, with its route params.
 * @example feedbackHref({ bok: 'efnafraedi-2e', kafli: '01', hluti: '1-2-efnishamur' })
 *   → '/feedback/?tegund=translation_error&bok=efnafraedi-2e&kafli=01&hluti=1-2-efnishamur'
 */
export function feedbackHref(location: { bok: string; kafli: string; hluti?: string }): string {
	const params = new URLSearchParams({ tegund: 'translation_error', bok: location.bok, kafli: location.kafli });
	if (location.hluti) params.set('hluti', location.hluti);
	return `/feedback/?${params}`;
}

/**
 * Reads the prefill from a /feedback query string.
 * @param search `window.location.search`, or its parsed form
 * @param bookSlugs the books the form's select offers; any other `bok` is dropped
 */
export function readFeedbackPrefill(search: string | URLSearchParams, bookSlugs: readonly string[]): FeedbackPrefill {
	const params = typeof search === 'string' ? new URLSearchParams(search) : search;
	const prefill: FeedbackPrefill = {};

	const tegund = params.get('tegund');
	const type = FEEDBACK_TYPES.find((t) => t.value === tegund);
	if (type) prefill.tegund = type.value;

	const bok = params.get('bok')?.trim().toLowerCase();
	if (bok && bookSlugs.includes(bok)) prefill.bok = bok;

	const kafli = slugParam(params.get('kafli'), PREFILL_LIMITS.kafli);
	if (kafli) prefill.kafli = kafli;

	const hluti = slugParam(params.get('hluti'), PREFILL_LIMITS.hluti);
	if (hluti) prefill.hluti = hluti;

	return prefill;
}
