/**
 * Which links the PDFs print an address after (static/styles/print.css).
 *
 * print.css prints a link's address after its text, for a reader of a paper copy. Since
 * the print loaders send links into the reader to namsbokasafn.is
 * (src/lib/utils/printLinks.ts), that rule would print the site's address after every
 * one of them; [USER] ruled on 2026-11-07 that those print as text only. Each rule that
 * writes `attr(href)` is matched, as a selector, against real links.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('static/styles/print.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The selectors of every rule that prints a link's href, without the pseudo-element. */
const addressSelectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
	.filter(([, , body]) => /\bcontent\s*:[^;]*attr\(\s*href\s*\)/.test(body))
	.flatMap(([, selector]) => selector.split(','))
	.map((s) => s.trim().replace(/::?(after|before)$/, ''));

function printsAddress(href: string): boolean {
	const a = document.createElement('a');
	a.setAttribute('href', href);
	document.body.append(a);
	try {
		return addressSelectors.some((s) => a.matches(s));
	} finally {
		a.remove();
	}
}

describe('the address print.css prints after a link', () => {
	it('is printed after a link to another site', () => {
		expect(printsAddress('https://openstax.org/details/books/chemistry-2e')).toBe(true);
	});

	it('is not printed after a link to namsbokasafn.is', () => {
		expect(printsAddress('https://namsbokasafn.is/efnafraedi-2e/vidauki/B/')).toBe(false);
	});

	it('is not printed after a link inside the document', () => {
		expect(printsAddress('#sec-1-2-efnishamir-og-flokkun-efnis')).toBe(false);
	});
});
