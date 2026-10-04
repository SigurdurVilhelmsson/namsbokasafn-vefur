import { describe, it, expect } from 'vitest';
import { planSync, deriveStatus, heldStateKey, type OfflineManifest, type HeldState } from './offlineSync';

const B = 'bok';
const f = (name: string, h: string, b = 10) => ({ p: `/content/${B}/chapters/01/${name}`, b, h });
const manifest = (...files: ReturnType<typeof f>[]): OfflineManifest => ({
	version: 'v1',
	bytes: files.reduce((s, x) => s + x.b, 0),
	files
});
const heldOf = (m: OfflineManifest, complete = true): HeldState => ({
	version: m.version,
	complete,
	total: m.files.length,
	files: Object.fromEntries(m.files.map((x) => [x.p, x.h]))
});
const pathsOf = (m: OfflineManifest) => new Set(m.files.map((x) => x.p));

describe('planSync', () => {
	it('fetches every file on a first download', () => {
		const m = manifest(f('a.html', '1', 5), f('b.svg', '2', 7));
		expect(planSync(B, m, null, new Set()).bytes).toBe(12);
	});

	it('fetches nothing when every file is stored with its hash', () => {
		const m = manifest(f('a.html', '1'), f('b.svg', '2'));
		expect(planSync(B, m, heldOf(m), pathsOf(m)).toFetch).toEqual([]);
	});

	it('fetches only changed and new files on an update', () => {
		const old = manifest(f('a.html', '1'), f('b.svg', '2'), f('c.svg', '3'));
		const now = manifest(f('a.html', '1'), f('b.svg', '2b'), f('d.svg', '4'));
		const plan = planSync(B, now, heldOf(old), pathsOf(old));
		expect(plan.toFetch.map((x) => x.p)).toEqual([f('b.svg', '').p, f('d.svg', '').p]);
	});

	it('deletes files the manifest no longer lists', () => {
		const old = manifest(f('a.html', '1'), f('c.svg', '3'));
		const now = manifest(f('a.html', '1'));
		expect(planSync(B, now, heldOf(old), pathsOf(old)).toDelete).toEqual([f('c.svg', '').p]);
	});

	it('never deletes toc.json or the held-state record', () => {
		const m = manifest(f('a.html', '1'));
		const cached = new Set([...pathsOf(m), `/content/${B}/toc.json`, heldStateKey(B)]);
		expect(planSync(B, m, heldOf(m), cached).toDelete).toEqual([]);
	});

	it('refetches a file the browser evicted', () => {
		const m = manifest(f('a.html', '1'), f('b.svg', '2'));
		const plan = planSync(B, m, heldOf(m), new Set([f('a.html', '').p]));
		expect(plan.toFetch.map((x) => x.p)).toEqual([f('b.svg', '').p]);
	});

	it('resumes an interrupted download from what was recorded', () => {
		const m = manifest(f('a.html', '1'), f('b.svg', '2'));
		const partial: HeldState = { version: 'v1', complete: false, total: 2, files: { [f('a.html', '').p]: '1' } };
		expect(planSync(B, m, partial, pathsOf(m)).toFetch.map((x) => x.p)).toEqual([f('b.svg', '').p]);
	});
});

describe('deriveStatus', () => {
	const m = manifest(f('a.html', '1'), f('b.svg', '2'));

	it('is none for a book never downloaded', () => {
		expect(deriveStatus('v1', null, new Set(), false).status).toBe('none');
	});

	it('is legacy for a record written by the old download', () => {
		expect(deriveStatus('v1', null, new Set(), true).status).toBe('legacy');
	});

	it('is complete when every file is stored and the version matches', () => {
		expect(deriveStatus('v1', heldOf(m), pathsOf(m), false).status).toBe('complete');
	});

	it('is outdated when the book has a newer version', () => {
		expect(deriveStatus('v2', heldOf(m), pathsOf(m), false).status).toBe('outdated');
	});

	it('is complete when the served version is unknown', () => {
		expect(deriveStatus(null, heldOf(m), pathsOf(m), false).status).toBe('complete');
	});

	it('is incomplete when the download did not finish', () => {
		expect(deriveStatus('v1', heldOf(m, false), pathsOf(m), false).status).toBe('incomplete');
	});

	it('counts files the browser evicted as missing', () => {
		expect(deriveStatus('v1', heldOf(m), new Set([f('a.html', '').p]), false)).toEqual({
			status: 'incomplete',
			missing: 1
		});
	});

	it('counts files that failed to download as missing', () => {
		const held: HeldState = { version: 'v1', complete: false, total: 2, files: { [f('a.html', '').p]: '1' } };
		expect(deriveStatus('v1', held, pathsOf(m), false).missing).toBe(1);
	});
});
