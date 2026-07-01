import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber } from 'pdf-lib';
import {
	harvestDests,
	defineNamedDest,
	addGoToLink,
	findCollidingNames,
	mergeChapterDests,
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
