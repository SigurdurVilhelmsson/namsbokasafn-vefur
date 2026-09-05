import { describe, it, expect } from 'vitest';
import { deployExcludes } from './deploy-excludes.js';

// The five books that exist in namsbokasafn-efni's publication tree today.
const SOURCE_BOOKS = [
	'edlisfraedi-2e',
	'efnafraedi-2e',
	'liffraedi-2e',
	'lifraen-efnafraedi',
	'orverufraedi'
];

describe('deployExcludes', () => {
	it('protects every held-back book, and keeps the downloads exclusion', () => {
		expect(deployExcludes(SOURCE_BOOKS)).toEqual([
			'downloads/',
			'edlisfraedi-2e/',
			'liffraedi-2e/',
			'orverufraedi/'
		]);
	});

	// 🔴 The regression this exists to catch. A published book protected from
	// --delete would freeze the live site: its pages could never be updated
	// again, and nothing would fail — the deploy would report success.
	it('never protects a published book', () => {
		const out = deployExcludes(SOURCE_BOOKS);
		expect(out).not.toContain('efnafraedi-2e/');
		expect(out).not.toContain('lifraen-efnafraedi/');
	});

	// Patterns are unanchored on purpose: one per book covers build/<slug>/,
	// build/print/<slug>/ and build/content/<slug>/, and keeps covering a
	// per-book route added later. An anchored pattern would miss the new one.
	it('emits unanchored directory patterns', () => {
		for (const p of deployExcludes(SOURCE_BOOKS)) {
			expect(p.startsWith('/')).toBe(false);
			expect(p.endsWith('/')).toBe(true);
		}
	});

	it('still protects the PDFs when every book is published', () => {
		expect(deployExcludes(['efnafraedi-2e', 'lifraen-efnafraedi'])).toEqual(['downloads/']);
	});

	// A book that has left efni's tree entirely is not protected — it is no
	// longer paused, it is gone at source. Deliberate, and the reason the list is
	// derived from the source tree rather than hardcoded.
	it('protects only books that still exist at source', () => {
		expect(deployExcludes(['efnafraedi-2e', 'liffraedi-2e'])).toEqual([
			'downloads/',
			'liffraedi-2e/'
		]);
	});

	it('preserves source order among the withheld books', () => {
		expect(deployExcludes(['orverufraedi', 'edlisfraedi-2e'])).toEqual([
			'downloads/',
			'orverufraedi/',
			'edlisfraedi-2e/'
		]);
	});

	// An unknown slug is withheld by the allowlist's fail-safe default, so it is
	// protected rather than deleted — the safe side for a book vefur has not
	// heard of yet.
	it('protects a book the allowlist has never heard of', () => {
		expect(deployExcludes(['stjornufraedi'])).toEqual(['downloads/', 'stjornufraedi/']);
	});
});
