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

	it('protects the PDFs whatever the efni tree holds', () => {
		expect(deployExcludes([])[0]).toBe('downloads/');
		expect(deployExcludes(['efnafraedi-2e'])[0]).toBe('downloads/');
	});

	// 🔴 The efni tree the deploy reads can lack a frozen book: a deploy pinned
	// to an efni commit from before the book existed there, or a book left with
	// no rendered chapter directory. Deriving the freeze from that tree alone
	// dropped the book from the list, and the deploy deleted its live pages.
	it('keeps protecting a withheld book the efni tree lacks', () => {
		expect(deployExcludes(['efnafraedi-2e', 'liffraedi-2e', 'orverufraedi'])).toContain(
			'edlisfraedi-2e/'
		);
	});

	it('protects every withheld book even when efni holds only one book', () => {
		const out = deployExcludes(['efnafraedi-2e']);
		for (const p of ['edlisfraedi-2e/', 'liffraedi-2e/', 'orverufraedi/']) {
			expect(out).toContain(p);
		}
	});

	// A book vefur does not register is withheld by the allowlist's fail-safe
	// default, so it is protected rather than deleted — the safe side for a book
	// efni has and vefur has not heard of yet.
	it('protects a book the allowlist has never heard of', () => {
		expect(deployExcludes(['stjornufraedi'])).toContain('stjornufraedi/');
	});

	it('lists each protected book once when efni and the registry both name it', () => {
		const out = deployExcludes(SOURCE_BOOKS);
		expect(new Set(out).size).toBe(out.length);
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
	// predate the sync's exclude list; a build copies them into build/. They are
	// HIDE rules (sender side only): a plain `-` exclude would also protect any
	// copy already on the server from --delete, forever.
	it('keeps editor artifacts out of the transfer without protecting them on the server', () => {
		const rules = deployFilterRules(SOURCE_BOOKS);
		for (const pattern of ['*.backup.*', '*.pre-fix-*', '*.orig', '*.bak', '*~', '.DS_Store']) {
			expect(rules).toContain(`H ${pattern}`);
			expect(rules).not.toContain(`- ${pattern}`);
		}
	});

	// A merge file takes only prefixed rules; a bare pattern line makes rsync
	// stop with "unknown filter rule" before it transfers anything.
	it('writes every line as a protect, exclude or hide rule', () => {
		for (const rule of deployFilterRules(SOURCE_BOOKS)) {
			expect(rule).toMatch(/^(P|-|H) \S/);
		}
	});
});
