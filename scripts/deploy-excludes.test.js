import { describe, it, expect } from 'vitest';
import { deployExcludes, deployFilterRules } from './deploy-excludes.js';

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

// The rule set scripts/deploy.js hands rsync as `--filter=merge <file>`. Its
// effect on a real transfer is pinned by the rsync test in deploy.test.js; these
// pin how the rules are DERIVED, so they hold even where rsync is not installed.
describe('deployFilterRules', () => {
	// 🔴 The frozen books' kept pages load hashed CSS/JS from the build they were
	// deployed with. Without a receiver-side protect rule, a --delete deploy of a
	// newer build removes those files and the frozen pages lose their styling and
	// scripts. `/**` matters: `P _app/immutable/` matches only the directory.
	it('protects the hashed assets of earlier builds from deletion', () => {
		expect(deployFilterRules(SOURCE_BOOKS)).toContain('P /_app/immutable/**');
	});

	it('keeps every held-back book and the PDFs out of the transfer', () => {
		const rules = deployFilterRules(SOURCE_BOOKS);
		for (const pattern of ['downloads/', 'edlisfraedi-2e/', 'liffraedi-2e/', 'orverufraedi/']) {
			expect(rules).toContain(`- ${pattern}`);
		}
	});

	// 🔴 Same regression as for deployExcludes: an excluded published book can
	// never be updated again, and the deploy still reports success.
	it('never excludes a published book', () => {
		const rules = deployFilterRules(SOURCE_BOOKS);
		expect(rules).not.toContain('- efnafraedi-2e/');
		expect(rules).not.toContain('- lifraen-efnafraedi/');
	});

	// The dev machine's static/content holds thousands of editor backups that
	// predate the sync's exclude list; a build copies them into build/.
	it('keeps editor artifacts out of the transfer', () => {
		const rules = deployFilterRules(SOURCE_BOOKS);
		for (const pattern of ['*.backup.*', '*.pre-fix-*', '*.orig', '*.bak', '*~', '.DS_Store']) {
			expect(rules).toContain(`- ${pattern}`);
		}
	});

	// A merge file takes only prefixed rules; a bare pattern line makes rsync
	// stop with "unknown filter rule" before it transfers anything.
	it('writes every line as a protect or an exclude rule', () => {
		for (const rule of deployFilterRules(SOURCE_BOOKS)) {
			expect(rule).toMatch(/^(P|-) \S/);
		}
	});
});
