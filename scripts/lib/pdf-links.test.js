import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber } from 'pdf-lib';
import {
	harvestDests,
	defineNamedDest,
	addGoToLink,
	findCollidingNames,
	mergeChapterDests,
	namespaceChapterLinks,
	namespacedDestName,
	writeMergedDests
} from './pdf-links.js';

/** A blank A4 PDF with `n` pages. */
async function makeDoc(n) {
	const doc = await PDFDocument.create();
	for (let i = 0; i < n; i++) doc.addPage([595, 842]);
	return doc;
}

/** Resolve a named dest via the catalog /Dests dict → 0-based page index (or null). */
function resolve(doc, name) {
	const dests = doc.context.lookup(doc.catalog.get(PDFName.of('Dests')));
	if (!(dests instanceof PDFDict)) return null;
	let dest = doc.context.lookup(dests.get(PDFName.of(name)));
	if (dest instanceof PDFDict) dest = doc.context.lookup(dest.get(PDFName.of('D')));
	if (!(dest instanceof PDFArray)) return null;
	const refIndex = new Map(doc.getPages().map((p, i) => [p.ref.toString(), i]));
	return refIndex.get(dest.get(0)?.toString()) ?? null;
}

describe('defineNamedDest + harvestDests', () => {
	it('registers a dest that harvestDests reads back with the right page index', async () => {
		const doc = await makeDoc(3);
		defineNamedDest(doc, 'alpha', doc.getPage(1).ref);
		defineNamedDest(doc, 'beta', doc.getPage(2).ref, [PDFName.of('Fit')]);

		const harvested = harvestDests(doc);
		expect(harvested.get('alpha')?.pageIndex).toBe(1);
		expect(harvested.get('beta')?.pageIndex).toBe(2);
	});

	it('rejects a non-ref page argument', async () => {
		const doc = await makeDoc(1);
		expect(() => defineNamedDest(doc, 'x', 0)).toThrow(TypeError);
	});

	it('returns an empty map when there is no /Dests dict', async () => {
		const doc = await makeDoc(1);
		expect(harvestDests(doc).size).toBe(0);
	});
});

describe('addGoToLink', () => {
	it('adds a Link annotation with the given rect and target name', async () => {
		const doc = await makeDoc(1);
		const page = doc.getPage(0);
		addGoToLink(doc, page, [10, 20, 110, 40], 'target');

		const annots = doc.context.lookup(page.node.get(PDFName.of('Annots')));
		expect(annots).toBeInstanceOf(PDFArray);
		const annot = doc.context.lookup(annots.get(0));
		expect(annot.get(PDFName.of('Subtype'))?.toString()).toBe('/Link');
		expect(annot.get(PDFName.of('Dest'))?.toString()).toBe('/target');
		const rect = annot.get(PDFName.of('Rect'));
		expect(rect).toBeInstanceOf(PDFArray);
		expect(rect.get(0)).toBeInstanceOf(PDFNumber);
		expect(rect.size()).toBe(4);
	});

	it('appends to an existing Annots array rather than replacing it', async () => {
		const doc = await makeDoc(1);
		const page = doc.getPage(0);
		addGoToLink(doc, page, [0, 0, 1, 1], 'a');
		addGoToLink(doc, page, [1, 1, 2, 2], 'b');
		const annots = doc.context.lookup(page.node.get(PDFName.of('Annots')));
		expect(annots.size()).toBe(2);
	});
});

describe('findCollidingNames', () => {
	it('flags only names present in more than one chapter map', () => {
		const a = new Map([
			['CNX_01', {}],
			['fnref-1', {}]
		]);
		const b = new Map([
			['CNX_02', {}],
			['fnref-1', {}]
		]);
		const colliding = findCollidingNames([a, b]);
		expect(colliding.has('fnref-1')).toBe(true);
		expect(colliding.has('CNX_01')).toBe(false);
		expect(colliding.size).toBe(1);
	});
});

describe('mergeChapterDests', () => {
	it('rebases page indices by the offset and namespaces only colliders', () => {
		const registry = new Map();
		const chapterDests = new Map([
			['CNX_Chem_03_x', { pageIndex: 2, params: [] }],
			['fnref-1', { pageIndex: 4, params: [] }]
		]);
		mergeChapterDests(registry, chapterDests, 10, 3, new Set(['fnref-1']));

		// Globally-unique name keeps its key, rebased by the offset.
		expect(registry.get('CNX_Chem_03_x')?.mergedPageIndex).toBe(12);
		// Collider is namespaced per chapter.
		expect(registry.has('fnref-1')).toBe(false);
		expect(registry.get('c03__fnref-1')?.mergedPageIndex).toBe(14);
	});
});

describe('writeMergedDests (end-to-end through save + reload)', () => {
	it('writes dests that resolve to the correct merged page after a round-trip', async () => {
		const merged = await makeDoc(8);
		const registry = new Map([
			['sec-a', { mergedPageIndex: 3, params: [PDFName.of('Fit')] }],
			['sec-b', { mergedPageIndex: 6, params: [PDFName.of('XYZ'), PDFNumber.of(0), null, null] }]
		]);
		writeMergedDests(merged, registry);

		// Also drop a GoTo link that targets one of them, to mirror the pipeline.
		addGoToLink(merged, merged.getPage(0), [10, 10, 100, 30], 'sec-b');

		const reloaded = await PDFDocument.load(await merged.save(), { updateMetadata: false });
		expect(resolve(reloaded, 'sec-a')).toBe(3);
		expect(resolve(reloaded, 'sec-b')).toBe(6);
	});

	it('skips registry entries whose merged page index is out of range', async () => {
		const merged = await makeDoc(2);
		writeMergedDests(merged, new Map([['ghost', { mergedPageIndex: 99, params: [] }]]));
		expect(resolve(merged, 'ghost')).toBe(null);
	});
});

/** Every Link annotation's target name in `doc`, with the index of the page it sits on. */
function linkTargets(doc) {
	const out = [];
	doc.getPages().forEach((page, pageIndex) => {
		const annots = doc.context.lookup(page.node.get(PDFName.of('Annots')));
		if (!(annots instanceof PDFArray)) return;
		for (let i = 0; i < annots.size(); i++) {
			const annot = doc.context.lookup(annots.get(i));
			let dest = annot.get(PDFName.of('Dest'));
			if (!dest) dest = doc.context.lookup(doc.context.lookup(annot.get(PDFName.of('A'))).get(PDFName.of('D')));
			out.push({ pageIndex, name: dest.toString().replace(/^\//, '') });
		}
	});
	return out;
}

/** A link in the `/A << /S /GoTo /D name >>` form, which Chromium does not write today. */
function addGoToActionLink(doc, page, name) {
	const annot = doc.context.obj({
		Type: 'Annot',
		Subtype: 'Link',
		Rect: [0, 0, 10, 10],
		A: { S: 'GoTo', D: PDFName.of(name) }
	});
	page.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(annot)]));
}

/**
 * A two-page chapter as Chromium prints one with a footnote: its `fnref-1` target on
 * page 1, the footnote's back link to it on page 2, and a uniquely named figure that
 * page 1 links to.
 */
async function chapterWithFootnote(figure) {
	const doc = await makeDoc(2);
	defineNamedDest(doc, 'fnref-1', doc.getPage(0).ref);
	defineNamedDest(doc, figure, doc.getPage(1).ref);
	addGoToLink(doc, doc.getPage(1), [0, 0, 10, 10], 'fnref-1');
	addGoToLink(doc, doc.getPage(0), [0, 0, 10, 10], figure);
	return doc;
}

/** Merge chapters the way generate-pdfs.js does, then save and reload the book. */
async function mergeBook(chapters, { renameLinks }) {
	const merged = await PDFDocument.create();
	const parts = [];
	for (const { num, doc } of chapters) {
		const mergedOffset = merged.getPageCount();
		const pages = await merged.copyPages(doc, doc.getPageIndices());
		for (const p of pages) merged.addPage(p);
		parts.push({ num, mergedOffset, pageCount: pages.length, pages, dests: harvestDests(doc) });
	}
	const colliding = findCollidingNames(parts.map((p) => p.dests));
	const registry = new Map();
	let renamed = 0;
	for (const { num, mergedOffset, pages, dests } of parts) {
		mergeChapterDests(registry, dests, mergedOffset, num, colliding);
		if (renameLinks) renamed += namespaceChapterLinks(merged, pages, dests, num, colliding);
	}
	writeMergedDests(merged, registry);
	const book = await PDFDocument.load(await merged.save(), { updateMetadata: false });
	return { book, parts, colliding, renamed };
}

describe('namespaceChapterLinks', () => {
	const chapters = async () => [
		{ num: 1, doc: await chapterWithFootnote('CNX_Chem_01_fig') },
		{ num: 2, doc: await chapterWithFootnote('CNX_Chem_02_fig') }
	];

	// The control: namespacing the destinations alone leaves every link to them
	// pointing at the bare name, which the merged book no longer has.
	it('is needed: without it, a link to a namespaced name resolves to nothing', async () => {
		const { book, colliding } = await mergeBook(await chapters(), { renameLinks: false });
		expect([...colliding]).toEqual(['fnref-1']);
		const backLinks = linkTargets(book).filter((l) => l.name.endsWith('fnref-1'));
		expect(backLinks).toHaveLength(2);
		for (const link of backLinks) expect(resolve(book, link.name)).toBe(null);
	});

	it("points each chapter's links at its own namespaced destination", async () => {
		const { book, parts, renamed } = await mergeBook(await chapters(), { renameLinks: true });
		expect(renamed).toBe(2);
		const links = linkTargets(book);
		expect(links).toHaveLength(4);
		for (const link of links) {
			const target = resolve(book, link.name);
			expect(target).not.toBe(null);
			const own = parts.find(
				(p) => link.pageIndex >= p.mergedOffset && link.pageIndex < p.mergedOffset + p.pageCount
			);
			// The footnote's back link lands on its own chapter's first page, not the other's.
			if (link.name.endsWith('fnref-1')) {
				expect(link.name).toBe(namespacedDestName('fnref-1', own.num));
				expect(target).toBe(own.mergedOffset);
			} else {
				// A unique name is left as it was and still resolves.
				expect(link.name).toBe(`CNX_Chem_0${own.num}_fig`);
				expect(target).toBe(own.mergedOffset + 1);
			}
		}
	});

	it('renames the /A GoTo form too', async () => {
		const one = await makeDoc(1);
		defineNamedDest(one, 'fnref-1', one.getPage(0).ref);
		addGoToActionLink(one, one.getPage(0), 'fnref-1');
		const two = await chapterWithFootnote('CNX_Chem_02_fig');
		const { book, renamed } = await mergeBook(
			[
				{ num: 1, doc: one },
				{ num: 2, doc: two }
			],
			{ renameLinks: true }
		);
		expect(renamed).toBe(2);
		const [action] = linkTargets(book).filter((l) => l.pageIndex === 0);
		expect(action.name).toBe('c01__fnref-1');
		expect(resolve(book, action.name)).toBe(0);
	});

	it('leaves names that were not namespaced, and colliding names the part does not own', async () => {
		const doc = await makeDoc(1);
		defineNamedDest(doc, 'gloss-7', doc.getPage(0).ref);
		addGoToLink(doc, doc.getPage(0), [0, 0, 1, 1], 'gloss-7'); // exempt: not in the set
		addGoToLink(doc, doc.getPage(0), [1, 1, 2, 2], 'fnref-1'); // collides, but not this part's
		const merged = await PDFDocument.create();
		const pages = await merged.copyPages(doc, [0]);
		merged.addPage(pages[0]);
		const renamed = namespaceChapterLinks(merged, pages, harvestDests(doc), 4, new Set(['fnref-1']));
		expect(renamed).toBe(0);
		expect(linkTargets(merged).map((l) => l.name)).toEqual(['gloss-7', 'fnref-1']);
	});
});
