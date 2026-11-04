/**
 * The phrase that ends a chapter or section page's meta description and
 * og:description: '<book title> kennslubók á íslensku' (June code review M18).
 *
 * Both pages hardcoded 'Efnafræði kennslubók á íslensku', so every book's
 * chapters and sections described themselves as chemistry. Chemistry's phrase
 * is unchanged, byte for byte: it is the only book deployed, and the paused
 * books' live pages are not rebuilt until each is deployed again.
 *
 * Without a title the phrase names no subject, never another book's. The book
 * layout's load answers 404 for an unknown book, so that is a guard, not a path.
 */
export function textbookPhrase(book: { title?: string | null } | null | undefined): string {
	const title = book?.title?.trim();
	// D20: proposed (M18): '<title> kennslubók á íslensku' is new for every book but
	// chemistry, whose phrase is the old one, and so is 'Kennslubók á íslensku'
	return title ? `${title} kennslubók á íslensku` : 'Kennslubók á íslensku';
}
