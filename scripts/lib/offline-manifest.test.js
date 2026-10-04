import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { buildOfflineManifest } from './offline-manifest.js';

let staticDir;

function put(path, content) {
	const abs = join(staticDir, path);
	mkdirSync(dirname(abs), { recursive: true });
	writeFileSync(abs, content);
}

const paths = (m) => m.files.map((f) => f.p);

beforeEach(() => {
	staticDir = mkdtempSync(join(tmpdir(), 'offline-manifest-'));
	const book = 'content/bok';
	// Different sizes everywhere, so a byte total cannot pass by coincidence.
	put(
		`${book}/chapters/01/1-1-a.html`,
		'<p><img src="images/media/fig1.svg"><img src="images/media/fig1.svg"><img src="https://x.org/e.png"><img src="data:image/png;base64,AA"></p>'
	);
	put(`${book}/chapters/01/1-answer-key.html`, '<p><img src="/content/bok/chapters/01/images/media/fig2.png"></p>');
	put(`${book}/chapters/00/0-1-formali.html`, '<p>formáli</p>');
	put(`${book}/chapters/appendices/appendices-1-a.html`, '<p><img src="../01/images/media/gone.png"></p>');
	put(`${book}/chapters/01/images/media/fig1.svg`, '<svg>1</svg>');
	put(`${book}/chapters/01/images/media/fig2.png`, 'PNG-two-bytes-more');
	put(`${book}/chapters/01/images/media/unused.png`, 'never referenced');
	put(`${book}/chapters/01/1-1-a.html.backup.2026-06-16`, 'editor artifact');
	put(`${book}/glossary.json`, '{"terms":[]}');
	put(`${book}/toc.json`, '{}');
	put(`${book}/sync-stamp.json`, '{}');
});

afterEach(() => rmSync(staticDir, { recursive: true, force: true }));

describe('buildOfflineManifest', () => {
	it('lists every page under chapters/, glossary.json and each referenced image once', () => {
		expect(paths(buildOfflineManifest(staticDir, 'bok'))).toEqual([
			'/content/bok/chapters/00/0-1-formali.html',
			'/content/bok/chapters/01/1-1-a.html',
			'/content/bok/chapters/01/1-answer-key.html',
			'/content/bok/chapters/01/images/media/fig1.svg',
			'/content/bok/chapters/01/images/media/fig2.png',
			'/content/bok/chapters/appendices/appendices-1-a.html',
			'/content/bok/glossary.json'
		]);
	});

	it('reports an <img> whose file is missing', () => {
		expect(buildOfflineManifest(staticDir, 'bok').missing).toEqual(['../01/images/media/gone.png']);
	});

	it('reports an <img> tag whose src it cannot read', () => {
		put('content/bok/chapters/02/2-1-b.html', '<p><img data-src="lazy.png" srcset="a.png 1x"></p>');
		expect(buildOfflineManifest(staticDir, 'bok').unparsed).toHaveLength(1);
	});

	it('reports nothing unparsed for ordinary figures', () => {
		expect(buildOfflineManifest(staticDir, 'bok').unparsed).toEqual([]);
	});

	it('totals the disk bytes of the listed files', () => {
		const m = buildOfflineManifest(staticDir, 'bok');
		expect(m.bytes).toBe(m.files.reduce((sum, f) => sum + f.b, 0));
	});

	it('records each file at its real size', () => {
		const fig2 = buildOfflineManifest(staticDir, 'bok').files.find((f) => f.p.endsWith('fig2.png'));
		expect(fig2.b).toBe('PNG-two-bytes-more'.length);
	});

	it('gives the same version for the same content', () => {
		expect(buildOfflineManifest(staticDir, 'bok').version).toBe(buildOfflineManifest(staticDir, 'bok').version);
	});

	it('changes the version when one figure changes', () => {
		const before = buildOfflineManifest(staticDir, 'bok').version;
		put('content/bok/chapters/01/images/media/fig1.svg', '<svg>2</svg>');
		expect(buildOfflineManifest(staticDir, 'bok').version).not.toBe(before);
	});

	it('changes only the changed file’s hash', () => {
		const before = buildOfflineManifest(staticDir, 'bok').files;
		put('content/bok/chapters/01/images/media/fig1.svg', '<svg>2</svg>');
		const after = buildOfflineManifest(staticDir, 'bok').files;
		const changed = after.filter((f, i) => f.h !== before[i].h).map((f) => f.p);
		expect(changed).toEqual(['/content/bok/chapters/01/images/media/fig1.svg']);
	});

	it('copes with a book that has no chapters/ directory', () => {
		expect(buildOfflineManifest(staticDir, 'tom').files).toEqual([]);
	});
});
