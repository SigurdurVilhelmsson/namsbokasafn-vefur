/**
 * PDF link/destination utilities for the assembly pass in generate-pdfs.js.
 *
 * Why this exists (the Phase 0.2 finding — see docs/plans/2026-07-01-pdf-redesign-plan.md):
 *
 * Chromium's `page.pdf()` emits internal `<a href="#id">` links as PDF **Link
 * annotations** whose `/Dest` is a *name object* (e.g. `/CNX_Chem_03_01_aspirin`).
 * Each per-chapter PDF also carries a catalog **`/Dests` dictionary** mapping those
 * names → `[pageRef, /XYZ, x, y, z]`. When generate-pdfs.js merges chapters with
 * `copyPages` into a fresh document, the page objects (and their Link annotations)
 * are copied, but the catalog `/Dests` dict is **not** — so every internal link in
 * the merged book dangles (the name resolves to nothing).
 *
 * The fix is not to touch the surviving annotations at all: we **harvest** each
 * chapter's `/Dests` entries, **rebase** their page references to the merged page
 * tree (via the chapter's page-index offset), and write one combined `/Dests` dict
 * into the merged catalog. The 792 internal name-dest links then resolve again.
 *
 * For links that have *no* Chromium source anchor — the TOC rows, the back-of-book
 * glossary, exercise↔answer jumps — there is nothing to harvest. Those are built
 * from scratch with `defineNamedDest` (register a target) + `addGoToLink` (draw a
 * clickable rect over a row/word that points at that name).
 *
 * Collisions: ids that repeat across separately-rendered chapters would clobber in
 * a flat dict. Observed: the footnote-return anchors `fnref-N` until the print
 * loaders scoped them per section (`printFootnotes.ts`), and since then only
 * `foot-00001`, a footnote id chapter 1 and the appendices each hold once.
 * `mergeChapterDests` namespaces a name only when it is known to collide, so the
 * globally-unique content ids (`CNX_Chem_NN_*`) stay untouched and cross-chapter
 * resolution keeps working. The links that point at a namespaced name are one
 * exception to "don't touch the annotations": `namespaceChapterLinks` renames them
 * the same way, or they would point at a name the merged book no longer has.
 *
 * The other exception is a link into the reader whose page is in another part of the
 * book. The print loaders write it as a link to the live site
 * (`src/lib/utils/printLinks.ts`), which is right for the chapter's own PDF; in the
 * book, `linkSiteUrisToDests` turns it into a jump to that page's anchor ([USER]'s
 * ruling of 2026-11-07: a link whose target is in the same PDF jumps there).
 */

import { PDFName, PDFArray, PDFDict, PDFNumber, PDFRef, PDFString, PDFHexString } from 'pdf-lib';

/**
 * Read a document's catalog `/Dests` name-dictionary.
 *
 * @param {import('pdf-lib').PDFDocument} doc
 * @returns {Map<string, { pageIndex: number, params: Array<any> }>}
 *   name (without leading `/`) → { pageIndex within `doc`, raw dest params after the page ref }
 */
export function harvestDests(doc) {
	const out = new Map();
	const dests = doc.context.lookup(doc.catalog.get(PDFName.of('Dests')));
	if (!(dests instanceof PDFDict)) return out;

	const pageRefs = doc.getPages().map((p) => p.ref);
	const indexByRef = new Map(pageRefs.map((r, i) => [r.toString(), i]));

	for (const [key, valueRef] of dests.entries()) {
		let dest = doc.context.lookup(valueRef);
		// Dest may be `[pageRef /XYZ …]` or a dict `<< /D [pageRef /XYZ …] >>`.
		if (dest instanceof PDFDict) dest = doc.context.lookup(dest.get(PDFName.of('D')));
		if (!(dest instanceof PDFArray)) continue;

		const pageRef = dest.get(0);
		const pageIndex = indexByRef.get(pageRef?.toString());
		if (pageIndex === undefined) continue; // dest points outside this doc — skip

		// Preserve the fit params ([/XYZ, left, top, zoom] etc.) verbatim.
		const params = [];
		for (let i = 1; i < dest.size(); i++) params.push(dest.get(i));

		// key is a PDFName like `/CNX_…`; strip the leading slash for a plain id.
		out.set(key.toString().replace(/^\//, ''), { pageIndex, params });
	}
	return out;
}

/**
 * Ensure the catalog has a `/Dests` name-dictionary and return it.
 * @param {import('pdf-lib').PDFDocument} doc
 * @returns {PDFDict}
 */
function ensureDestsDict(doc) {
	let dests = doc.context.lookup(doc.catalog.get(PDFName.of('Dests')));
	if (!(dests instanceof PDFDict)) {
		dests = doc.context.obj({});
		const ref = doc.context.register(dests);
		doc.catalog.set(PDFName.of('Dests'), ref);
	}
	return dests;
}

/**
 * Register a named destination in `doc`'s catalog `/Dests` dict.
 *
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {string} name        destination name (no leading `/`)
 * @param {PDFRef} pageRef      indirect ref of the target page (e.g. `page.ref`)
 * @param {Array<any>} [params] fit params after the page ref; defaults to top-of-page `/XYZ`.
 */
export function defineNamedDest(doc, name, pageRef, params) {
	if (!(pageRef instanceof PDFRef)) throw new TypeError('defineNamedDest: pageRef must be a PDFRef');
	const dests = ensureDestsDict(doc);
	const fit = params ?? [PDFName.of('XYZ'), PDFNumber.of(0), null, null];
	const arr = doc.context.obj([pageRef, ...fit]);
	dests.set(PDFName.of(name), arr);
}

/**
 * Add a clickable GoTo Link annotation over `rect` on `page`, targeting a named dest.
 *
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {import('pdf-lib').PDFPage} page
 * @param {[number, number, number, number]} rect  [x1, y1, x2, y2] in PDF points
 * @param {string} name  destination name (must be registered via defineNamedDest / harvested)
 */
export function addGoToLink(doc, page, rect, name) {
	const annot = doc.context.obj({
		Type: 'Annot',
		Subtype: 'Link',
		Rect: rect.map((n) => PDFNumber.of(n)),
		Border: [PDFNumber.of(0), PDFNumber.of(0), PDFNumber.of(0)],
		Dest: PDFName.of(name)
	});
	const ref = doc.context.register(annot);

	let annots = page.node.get(PDFName.of('Annots'));
	annots = annots instanceof PDFArray ? annots : doc.context.lookup(annots);
	if (!(annots instanceof PDFArray)) {
		annots = doc.context.obj([]);
		page.node.set(PDFName.of('Annots'), annots);
	}
	annots.push(ref);
}

/**
 * Merge one chapter's harvested dests into the growing merged-book registry,
 * rebasing page indices by `pageOffset` (the chapter's first page index in the
 * merged doc) and namespacing only names flagged as colliding.
 *
 * @param {Map<string,{mergedPageIndex:number, params:Array<any>, sourceName:string}>} registry
 *   accumulates name → merged-doc placement
 * @param {Map<string,{pageIndex:number, params:Array<any>}>} chapterDests  from harvestDests
 * @param {number} pageOffset  chapter's first page index within the merged doc
 * @param {number} chapterNum  used to namespace colliding names
 * @param {Set<string>} collidingNames  names known to appear in >1 chapter
 */
export function mergeChapterDests(registry, chapterDests, pageOffset, chapterNum, collidingNames) {
	for (const [name, { pageIndex, params }] of chapterDests) {
		const key = collidingNames.has(name) ? namespacedDestName(name, chapterNum) : name;
		registry.set(key, { mergedPageIndex: pageOffset + pageIndex, params, sourceName: name });
	}
}

/**
 * The name a colliding destination gets in the merged book: `cNN__<name>`.
 *
 * @param {string} name
 * @param {number} chapterNum
 */
export function namespacedDestName(name, chapterNum) {
	return `c${String(chapterNum).padStart(2, '0')}__${name}`;
}

/**
 * Point one part's link annotations at the names `mergeChapterDests` gave its
 * colliding destinations. Without this, every link to a namespaced name dangles
 * in the merged book: the catalog holds `c03__fnref-1`, while the footnote's
 * back link on chapter 3's page still says `/fnref-1`, which no longer exists
 * (36 of 36 footnote back links in the 2026-11-04 `-bok.pdf`).
 *
 * A link is rewritten only when its name collides and this part owns a
 * destination of that name (Chromium links only to ids in the same document, so
 * a part's links always mean its own destinations). Names exempt from
 * namespacing, such as the shared `gloss-N`, are simply not in `collidingNames`.
 * Reads both forms of a GoTo link: `/Dest name` and `/A << /S /GoTo /D name >>`.
 *
 * @param {import('pdf-lib').PDFDocument} doc  the merged book
 * @param {Array<import('pdf-lib').PDFPage>} pages  the part's pages, as copied into `doc`
 * @param {Map<string, any>} chapterDests  the part's destinations, from harvestDests
 * @param {number} chapterNum  the number mergeChapterDests namespaced them with
 * @param {Set<string>} collidingNames  the names mergeChapterDests namespaced
 * @returns {number} how many links were rewritten
 */
export function namespaceChapterLinks(doc, pages, chapterDests, chapterNum, collidingNames) {
	const renamed = (dest) => {
		if (!(dest instanceof PDFName)) return null;
		// The same spelling harvestDests keys the destinations by.
		const name = dest.toString().replace(/^\//, '');
		if (!collidingNames.has(name) || !chapterDests.has(name)) return null;
		return PDFName.of(namespacedDestName(name, chapterNum));
	};

	let rewritten = 0;
	for (const page of pages) {
		const annots = doc.context.lookup(page.node.get(PDFName.of('Annots')));
		if (!(annots instanceof PDFArray)) continue;
		for (let i = 0; i < annots.size(); i++) {
			const annot = doc.context.lookup(annots.get(i));
			if (!(annot instanceof PDFDict)) continue;
			if (annot.get(PDFName.of('Subtype'))?.toString() !== '/Link') continue;

			const direct = renamed(annot.get(PDFName.of('Dest')));
			if (direct) {
				annot.set(PDFName.of('Dest'), direct);
				rewritten++;
				continue;
			}
			const action = doc.context.lookup(annot.get(PDFName.of('A')));
			if (!(action instanceof PDFDict) || action.get(PDFName.of('S'))?.toString() !== '/GoTo') {
				continue;
			}
			const viaAction = renamed(doc.context.lookup(action.get(PDFName.of('D'))));
			if (viaAction) {
				action.set(PDFName.of('D'), viaAction);
				rewritten++;
			}
		}
	}
	return rewritten;
}

/**
 * Given per-chapter harvested dest maps, return the set of names that occur in
 * more than one chapter (must be namespaced to avoid clobbering in a flat dict).
 *
 * @param {Array<Map<string, any>>} chapterDestMaps
 * @returns {Set<string>}
 */
export function findCollidingNames(chapterDestMaps) {
	const counts = new Map();
	for (const m of chapterDestMaps) {
		for (const name of m.keys()) counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return new Set([...counts].filter(([, c]) => c > 1).map(([n]) => n));
}

/**
 * Write an accumulated registry into `doc`'s catalog `/Dests` dict, resolving
 * each merged page index to that page's indirect ref.
 *
 * @param {import('pdf-lib').PDFDocument} doc  the merged book
 * @param {Map<string,{mergedPageIndex:number, params:Array<any>}>} registry
 */
export function writeMergedDests(doc, registry) {
	const pageRefs = doc.getPages().map((p) => p.ref);
	const dests = ensureDestsDict(doc);
	for (const [name, { mergedPageIndex, params }] of registry) {
		const pageRef = pageRefs[mergedPageIndex];
		if (!pageRef) continue;
		dests.set(PDFName.of(name), doc.context.obj([pageRef, ...params]));
	}
}

/** The live site, where the print loaders send links to pages outside their render. */
export const SITE_ORIGIN = 'https://namsbokasafn.is';

/**
 * The anchor name the print renders give the reader page a site link opens:
 * `sec-<basename>` for a section of `bookSlug`, `vidauki-<letter>` for an appendix,
 * null for any other page or site. The same names as `readerAnchor` in
 * `src/lib/utils/printLinks.ts`; both are tested against `printLinks.cases.json`.
 *
 * @param {string} url  an absolute URL, as a URI link annotation holds it
 * @param {string} bookSlug
 * @returns {string | null}
 */
export function anchorForSiteUrl(url, bookSlug) {
	if (!url.startsWith(`${SITE_ORIGIN}/`)) return null;
	const path = url.slice(SITE_ORIGIN.length).split(/[?#]/, 1)[0];
	const parts = path.split('/').filter(Boolean);
	if (parts[0] !== bookSlug) return null;
	if (parts.length === 4 && parts[1] === 'kafli') return `sec-${parts[3]}`;
	if (parts.length === 3 && parts[1] === 'vidauki') return `vidauki-${parts[2]}`;
	return null;
}

/**
 * In the merged book, turn each URI link to a reader page the book holds into a jump to
 * that page's anchor: a chapter's link to an appendix, written as a site link because the
 * chapter's own PDF has no appendices. A link with a fragment lands at the start of its
 * page, because a part has a destination for an element only when that part links to it.
 * A link whose anchor the book has no destination for stays a site link.
 *
 * @param {import('pdf-lib').PDFDocument} doc  the merged book
 * @param {{ has(name: string): boolean }} destNames  the names the book has destinations
 *   for: the registry `mergeChapterDests` filled
 * @param {string} bookSlug
 * @returns {number} how many links were turned
 */
export function linkSiteUrisToDests(doc, destNames, bookSlug) {
	let turned = 0;
	for (const page of doc.getPages()) {
		const annots = doc.context.lookup(page.node.get(PDFName.of('Annots')));
		if (!(annots instanceof PDFArray)) continue;
		for (let i = 0; i < annots.size(); i++) {
			const annot = doc.context.lookup(annots.get(i));
			if (!(annot instanceof PDFDict)) continue;
			if (annot.get(PDFName.of('Subtype'))?.toString() !== '/Link') continue;
			const action = doc.context.lookup(annot.get(PDFName.of('A')));
			if (!(action instanceof PDFDict) || action.get(PDFName.of('S'))?.toString() !== '/URI') {
				continue;
			}
			const uri = action.lookup(PDFName.of('URI'));
			if (!(uri instanceof PDFString || uri instanceof PDFHexString)) continue;
			const name = anchorForSiteUrl(uri.decodeText(), bookSlug);
			if (!name || !destNames.has(name)) continue;
			annot.delete(PDFName.of('A'));
			annot.set(PDFName.of('Dest'), PDFName.of(name));
			turned++;
		}
	}
	return turned;
}
