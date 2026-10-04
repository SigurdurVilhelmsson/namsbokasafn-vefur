import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
	migrateLegacyBooks,
	getBookContentUrls,
	offline,
	currentDownload,
	workerServesOfflineBooks,
	type BookDownloadState
} from './offline';
import type { TableOfContents } from '$lib/types/content';

const legacy: BookDownloadState = {
	downloaded: true,
	downloadedAt: '2026-01-01T00:00:00.000Z',
	version: '1.0',
	sizeBytes: 321829656
};

describe('migrateLegacyBooks', () => {
	it('stops reporting a pre-2026-10 download as downloaded', () => {
		expect(migrateLegacyBooks({ b: legacy }).b.downloaded).toBe(false);
	});

	it('flags it so the reader is asked to download again', () => {
		expect(migrateLegacyBooks({ b: legacy }).b.legacyIncomplete).toBe(true);
	});

	it('is idempotent', () => {
		const once = migrateLegacyBooks({ b: legacy });
		expect(migrateLegacyBooks(once)).toBe(once);
	});

	it('leaves a current record untouched', () => {
		const books = { b: { ...legacy, version: '3ab14def915a' } };
		expect(migrateLegacyBooks(books)).toBe(books);
	});
});

describe('getBookContentUrls', () => {
	const toc = {
		title: 'Bók',
		frontMatter: [{ number: '', title: 'Formáli', file: '0-1-formali.html' }],
		chapters: [{ number: 1, title: 'K1', sections: [{ number: '1.1', title: 'S', file: '1-1-s.html' }] }],
		appendices: [
			{ letter: 'A', title: 'Lotukerfið', file: 'appendices/appendices-1-a.html' },
			{ letter: 'B', title: 'Gagnvirkt', file: 'appendices/b.html', isInteractive: true }
		],
		answerKey: [{ chapter: 1, title: 'Kafli 1', file: '01/1-answer-key.html' }],
		glossary: { title: 'Orðasafn', file: 'glossary.json' }
	} as unknown as TableOfContents;

	it('lists every page a reader can open, front matter, appendices and answer keys included', () => {
		expect(getBookContentUrls('b', toc)).toEqual([
			'/content/b/toc.json',
			'/content/b/glossary.json',
			'/content/b/chapters/00/0-1-formali.html',
			'/content/b/chapters/01/1-1-s.html',
			'/content/b/chapters/appendices/appendices-1-a.html',
			'/content/b/chapters/01/1-answer-key.html'
		]);
	});

	it('asks for no glossary or index the book does not have', () => {
		const bare = { ...toc, glossary: undefined } as TableOfContents;
		expect(getBookContentUrls('b', bare)).not.toContain('/content/b/glossary.json');
	});
});

describe('download progress belongs to one book', () => {
	afterEach(() => offline.reset());

	it("reports a failure on that book's own progress", () => {
		offline.startDownload('a', 10);
		offline.finishDownload('a');
		offline.setError('b', 'Villa við niðurhal');
		expect(get(currentDownload)).toMatchObject({ bookSlug: 'b', status: 'error' });
	});

	it("never overwrites another book's running download", () => {
		offline.startDownload('a', 10);
		offline.setError('b', 'Villa við niðurhal');
		expect(get(currentDownload)).toMatchObject({ bookSlug: 'a', status: 'downloading' });
	});

	it("ignores progress reported for another book", () => {
		offline.startDownload('a', 10);
		offline.updateProgress('b', 5, 500);
		expect(get(currentDownload)?.downloadedFiles).toBe(0);
	});
});

describe('workerServesOfflineBooks', () => {
	afterEach(() => vi.unstubAllGlobals());

	const withWorker = (answer: boolean) =>
		vi.stubGlobal('navigator', {
			...navigator,
			serviceWorker: {
				ready: Promise.resolve({
					active: {
						postMessage: (_msg: unknown, [port]: MessagePort[]) => {
							if (answer) port.postMessage({ offlineBook: 1 });
						}
					}
				})
			}
		});

	it('is true when the active worker answers', async () => {
		withWorker(true);
		expect(await workerServesOfflineBooks()).toBe(true);
	});

	it('is false when the active worker is an older one that does not answer', async () => {
		withWorker(false);
		expect(await workerServesOfflineBooks()).toBe(false);
	});

	it('is false without service-worker support', async () => {
		const { serviceWorker: _omit, ...rest } = navigator as Navigator & { serviceWorker?: unknown };
		vi.stubGlobal('navigator', rest);
		expect(await workerServesOfflineBooks()).toBe(false);
	});
});
