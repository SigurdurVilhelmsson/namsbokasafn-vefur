import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { books, retiredBooks } from '../../src/lib/types/book.ts';
import { LICENCES, validateAttribution } from '../../src/lib/data/licences.ts';
import { creditLine, MACHINE_TRANSLATION_CREDIT } from '../../src/lib/data/bookCredits.ts';
import { applyDocumentInfo, chapterDocInfo, pdfBookInfo } from './pdf-attribution.js';

// What loadBookConfig() returns, from the same modules (book-config.test.js
// checks that the esbuild bundle and these imports agree).
const config = { books, LICENCES, validateAttribution, creditLine };

/** The chemistry entry with its licence data swapped, under a made-up slug. */
function withLicence(code) {
	const chemistry = books.find((b) => b.slug === 'efnafraedi-2e');
	const book = {
		...chemistry,
		slug: 'tilraunabok',
		attribution: {
			...chemistry.attribution,
			derivativeLicence: code,
			derivativeLicenceUrl: LICENCES[code].url,
			sources: chemistry.attribution.sources.map((s) => ({ ...s, licenceAtObtaining: code }))
		}
	};
	return { ...config, books: [book] };
}

describe('pdfBookInfo: the title', () => {
	// The bug: generate-pdfs.js took toc.json's title, and generate-toc.js puts
	// the slug there when efni's toc has none (the live chemistry toc.json says
	// "efnafraedi-2e"), so running headers and the document title read
	// "efnafraedi-2e".
	it("is book.ts's title, not the slug", () => {
		expect(pdfBookInfo(config, 'efnafraedi-2e').title).toBe('Efnafræði');
	});

	it('is every registered book’s own title', () => {
		for (const book of books) expect(pdfBookInfo(config, book.slug).title).toBe(book.title);
	});

	it('throws for a slug book.ts does not know, rather than print the slug', () => {
		expect(() => pdfBookInfo(config, 'stjornufraedi')).toThrow(/no entry in src\/lib\/types\/book\.ts/);
	});

	// A retired book's entry stays in book.ts for efni's licence test, but out
	// of `books`: the reader serves no /print routes for it.
	it('throws for a retired book', () => {
		for (const book of retiredBooks) {
			expect(() => pdfBookInfo(config, book.slug)).toThrow(/no entry/);
		}
	});

	it('throws when the attribution is incomplete', () => {
		const broken = withLicence('CC-BY-4.0');
		broken.books[0].attribution = { ...broken.books[0].attribution, originalAuthors: [] };
		expect(() => pdfBookInfo(broken, 'tilraunabok')).toThrow(/originalAuthors/);
	});
});

describe('pdfBookInfo: licence facts come from the descriptor', () => {
	it('names the licence and its URL in the subject', () => {
		expect(pdfBookInfo(config, 'efnafraedi-2e').subject).toBe(
			'Leyfi: CC BY 4.0 (Creative Commons Attribution 4.0 International) — https://creativecommons.org/licenses/by/4.0/'
		);
	});

	// Same book, other licence: only the data changed, so the output follows
	// the data and not the slug.
	it('follows derivativeLicence for an NC-SA book', () => {
		const info = pdfBookInfo(withLicence('CC-BY-NC-SA-4.0'), 'tilraunabok');
		expect(info.subject).toContain('CC BY-NC-SA 4.0');
		expect(info.subject).toContain('https://creativecommons.org/licenses/by-nc-sa/4.0/');
		expect(info.keywords).toContain('CC BY-NC-SA 4.0');
	});

	it('gives every registered book the licence its attribution names', () => {
		for (const book of books) {
			const licence = LICENCES[book.attribution.derivativeLicence];
			const info = pdfBookInfo(config, book.slug);
			expect(info.subject).toContain(licence.url);
			expect(info.keywords).toContain(licence.name);
		}
	});
});

describe('pdfBookInfo: the author follows the translation method', () => {
	it("carries the original authors, the publisher and the colophon's credit line", () => {
		const chemistry = books.find((b) => b.slug === 'efnafraedi-2e');
		const { author } = pdfBookInfo(config, 'efnafraedi-2e');
		expect(author).toBe(
			`Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson (OpenStax, Rice University); ${creditLine(
				chemistry.slug,
				chemistry.status,
				chemistry.attribution.translators
			)}`
		);
		expect(author).toContain('Vélþýðing: Erlendur (Miðeind)');
	});

	// Biology names a human translator in book.ts but ships machine translation
	// as a preview (27d8ffe, R6-2): its PDF must credit the machine.
	it('never names a human as the translator of a preview book', () => {
		const previews = books.filter((b) => b.status === 'preview');
		expect(previews.length).toBeGreaterThan(0);
		for (const book of previews) {
			const { author } = pdfBookInfo(config, book.slug);
			expect(author).not.toMatch(/Þýðandi/);
			expect(author).not.toContain(book.translator);
		}
		expect(pdfBookInfo(config, 'liffraedi-2e').author).toContain(MACHINE_TRANSLATION_CREDIT);
	});
});

describe('chapterDocInfo', () => {
	it('puts the chapter in the title and the keywords, and keeps the rest', () => {
		const info = pdfBookInfo(config, 'efnafraedi-2e');
		const chapter = chapterDocInfo(info, { number: 3, title: 'Efnasamsetning og lausnir' });
		expect(chapter.title).toBe('Efnafræði — 3. Efnasamsetning og lausnir');
		expect(chapter.keywords.slice(0, 2)).toEqual(['Efnafræði', 'Efnasamsetning og lausnir']);
		expect(chapter.author).toBe(info.author);
		expect(chapter.subject).toBe(info.subject);
		expect(chapter.keywords).toEqual([
			info.keywords[0],
			'Efnasamsetning og lausnir',
			...info.keywords.slice(1)
		]);
	});
});

describe('applyDocumentInfo', () => {
	it('writes title, author, subject, keywords and language, readable after a save', async () => {
		const info = chapterDocInfo(pdfBookInfo(config, 'efnafraedi-2e'), {
			number: 3,
			title: 'Efnasamsetning og lausnir'
		});
		const doc = await PDFDocument.create();
		doc.addPage([595, 842]);
		applyDocumentInfo(doc, info);
		const reread = await PDFDocument.load(await doc.save(), { updateMetadata: false });

		expect(reread.getTitle()).toBe('Efnafræði — 3. Efnasamsetning og lausnir');
		expect(reread.getAuthor()).toBe(info.author);
		expect(reread.getSubject()).toContain('https://creativecommons.org/licenses/by/4.0/');
		expect(reread.getKeywords()).toBe(
			'Efnafræði, Efnasamsetning og lausnir, kennslubók, íslensk þýðing, Chemistry 2e, OpenStax, Rice University, CC BY 4.0'
		);
		expect(reread.catalog.lookup(PDFName.of('Lang'), PDFString).decodeText()).toBe('is');
	});
});
