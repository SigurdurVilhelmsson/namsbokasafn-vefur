/**
 * The title and document metadata of the generated PDFs
 * (scripts/generate-pdfs.js; docs/plans/2026-07-01-pdf-redesign-plan.md, Task
 * 4.2). Pure: every fact comes from the book registry that
 * scripts/lib/book-config.js loads from src/lib/types/book.ts, so a title, a
 * licence or a credit has one source, the same one the /print routes render.
 *
 * Licence facts come from the descriptor of `attribution.derivativeLicence` in
 * LICENCES, never from the book's slug (CLAUDE.md, Attribution & Licensing).
 * Credit follows the translation METHOD (src/lib/data/bookCredits.ts): the
 * Author field carries the colophon's own credit line, so machine-translated
 * content never names a human as its translator.
 */

/**
 * Everything the PDFs say about a book: its title and document metadata.
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

	return {
		title: book.title,
		// D20: proposed — the original authors and publisher, then the colophon's credit
		author: `${attribution.originalAuthors.join(', ')} (${attribution.publisher}); ${credit}`,
		// D20: proposed — the colophon's licence sentence, verbatim
		subject: `Leyfi: ${licence.name} (${licence.fullName}) — ${licence.url}`,
		keywords: [
			book.title,
			'kennslubók', // D20: proposed
			'íslensk þýðing', // D20: proposed
			attribution.originalTitle,
			attribution.publisher,
			licence.name
		]
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
