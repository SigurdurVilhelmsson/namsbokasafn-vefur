/**
 * The title, document metadata and footer licence line of the generated PDFs
 * (scripts/generate-pdfs.js; docs/plans/2026-07-01-pdf-redesign-plan.md, Tasks
 * 4.2 and 4.3). Pure: every fact comes from the book registry that
 * scripts/lib/book-config.js loads from src/lib/types/book.ts, so a title, a
 * licence or a credit has one source, the same one the /print routes render.
 *
 * Licence facts come from the descriptor of `attribution.derivativeLicence` in
 * LICENCES, never from the book's slug (CLAUDE.md, Attribution & Licensing).
 * Credit follows the translation METHOD (src/lib/data/bookCredits.ts): the
 * Author field carries the colophon's own credit line, so machine-translated
 * content never names a human as its translator.
 */

/** The reader's host, named in the footer licence line beside the source's. */
export const SITE_HOST = 'namsbokasafn.is';

/**
 * Everything the PDFs say about a book: its title, document metadata and the
 * licence line stamped in the folio band.
 *
 * Throws when the book has no entry in book.ts (a retired book has none in
 * `books` either) or its attribution is incomplete: a PDF must never fall back
 * to the slug for its title or print without its licence.
 *
 * @param {{
 *   books: Array<Record<string, any>>,
 *   LICENCES: Record<string, Record<string, any>>,
 *   validateAttribution: (attribution: unknown) => string[],
 *   creditLine: (slug: string, status: string, translators: string) => string
 * }} config what loadBookConfig() returns
 * @param {string} slug
 */
export function pdfBookInfo(config, slug) {
	const book = config.books.find((b) => b.slug === slug);
	if (!book) {
		throw new Error(
			`${slug} has no entry in src/lib/types/book.ts, so its PDFs would have no title or licence: refusing to print the slug instead`
		);
	}
	const problems = config.validateAttribution(book.attribution);
	if (problems.length > 0) {
		throw new Error(`${slug}: attribution in src/lib/types/book.ts — ${problems.join('; ')}`);
	}
	const attribution = book.attribution;
	const licence = config.LICENCES[attribution.derivativeLicence];
	if (!licence) throw new Error(`${slug}: unknown licence ${attribution.derivativeLicence}`);

	// The colophon's credit line (src/routes/print/[bookSlug]/colophon), verbatim.
	const credit = config.creditLine(book.slug, book.status, attribution.translators);
	const sourceHost = new URL(attribution.sourceUrl).hostname.replace(/^www\./, '');

	// The Author, Subject, fixed keywords and footer line below were checked by [USER] as
	// D20 batch 10 (2026-11-07), who added 'námsbók' to the keywords then.
	return {
		title: book.title,
		// The original authors and publisher, then the colophon's credit
		author: `${attribution.originalAuthors.join(', ')} (${attribution.publisher}); ${credit}`,
		// The colophon's licence sentence, verbatim
		subject: `Leyfi: ${licence.name} (${licence.fullName}) — ${licence.url}`,
		keywords: [
			book.title,
			'kennslubók',
			'námsbók',
			'íslensk þýðing',
			attribution.originalTitle,
			attribution.publisher,
			licence.name
		],
		// e.g. "CC BY 4.0 · openstax.org · namsbokasafn.is"
		licenceLine: [licence.name, sourceHost, SITE_HOST].join(' · ')
	};
}

/**
 * The same facts for one standalone chapter PDF: the chapter in the title and
 * among the keywords.
 *
 * @param {ReturnType<typeof pdfBookInfo>} info
 * @param {{ number: number, title: string }} chapter
 */
export function chapterDocInfo(info, chapter) {
	return {
		...info,
		title: `${info.title} — ${chapter.number}. ${chapter.title}`,
		keywords: [info.keywords[0], chapter.title, ...info.keywords.slice(1)]
	};
}

/**
 * Write the document information dictionary: title, author, subject, keywords
 * and the document language.
 *
 * pdf-lib joins a keyword array with spaces, which runs "íslensk þýðing" and
 * "CC BY 4.0" into the words around them, so the keywords go in as one
 * comma-separated string.
 *
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {ReturnType<typeof pdfBookInfo>} info
 */
export function applyDocumentInfo(doc, info) {
	doc.setTitle(info.title, { showInWindowTitleBar: true });
	doc.setAuthor(info.author);
	doc.setSubject(info.subject);
	doc.setKeywords([info.keywords.join(', ')]);
	doc.setLanguage('is');
}

/**
 * Left edge of the licence line, centred on the page. Throws if the line would
 * reach into `sideReserve` points from either edge, where the folio sits: the
 * line and the folio share a baseline, so a line that long would print over
 * the page number.
 *
 * @param {number} pageWidth
 * @param {number} textWidth
 * @param {number} sideReserve
 */
export function footerLineX(pageWidth, textWidth, sideReserve) {
	if (textWidth > pageWidth - 2 * sideReserve) {
		throw new Error(
			`The footer licence line is ${textWidth.toFixed(1)} pt wide and would run into the folio (room: ${(pageWidth - 2 * sideReserve).toFixed(1)} pt)`
		);
	}
	return (pageWidth - textWidth) / 2;
}
