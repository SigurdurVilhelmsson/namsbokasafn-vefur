/**
 * What the generated PDFs say about a book (scripts/generate-pdfs.js). Pure:
 * every fact comes from the book registry that scripts/lib/book-config.js
 * loads from src/lib/types/book.ts, so a title has one source, the same one
 * the /print routes render.
 */

/**
 * Everything the PDFs say about a book: for now, its title.
 *
 * Throws when the book has no entry in book.ts (a retired book has none in
 * `books` either): a PDF must never fall back to the slug for its title.
 *
 * @param {{ books: Array<Record<string, any>> }} config what loadBookConfig() returns
 * @param {string} slug
 */
export function pdfBookInfo(config, slug) {
	const book = config.books.find((b) => b.slug === slug);
	if (!book) {
		throw new Error(
			`${slug} has no entry in src/lib/types/book.ts, so its PDFs would have no title: refusing to print the slug instead`
		);
	}
	return { title: book.title };
}
