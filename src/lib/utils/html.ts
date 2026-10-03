/**
 * Shared HTML utility functions
 */

/**
 * Escape HTML entities to prevent XSS when inserting text into HTML.
 * Uses string replacement (no DOM dependency, works in workers and SSR).
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Convert HTML to plain text for full-text search indexing.
 * Pure string replacement (no DOM dependency, works in workers and SSR).
 *
 * Strips math markup so it never enters the search index — both the visual
 * MathJax SVG and the visually-hidden assistive MathML sibling (a11y-2). The
 * assistive `<math>` is removed wholesale because the generic tag-strip below
 * would otherwise leave its text tokens (variable letters, digits, operators)
 * in the index. The lazy `[\s\S]*?</math>` is safe: MathML cannot nest `<math>`.
 *
 * 🔴 `data-en` is hoisted into the text BEFORE tags are stripped, and that
 * ordering is the whole point. An English term reaches this function one of two
 * ways: as an inline "(e. …)" gloss inside the element's text, which survives
 * the strip, or as a `data-en` attribute, which does not — the tag-strip below
 * discards attribute values along with the tags. Without the hoist, a reader who
 * today finds a section by typing "formula mass" finds nothing once efni retires
 * the inline gloss (its spec §4.7), silently and with no failing test. The
 * search index is the one consumer of that gloss no DOM change can reach: it is
 * built from raw published HTML, not from the rendered page.
 */
export function htmlToPlainText(html: string): string {
	return (
		html
			// Remove script and style blocks entirely
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?<\/style>/gi, '')
			// Remove MathJax/math markup
			.replace(/<mjx-container[\s\S]*?<\/mjx-container>/gi, '')
			.replace(/<span class="mathjax[\s\S]*?<\/span>(?=\s*(?:<\/span>)*)/gi, '')
			// Remove assistive MathML siblings (a11y-2) regardless of wrapper, so
			// inline math (wrapped in <span class="math-inline">) doesn't leak tokens.
			.replace(/<math\b[^>]*\bassistive-mathml\b[\s\S]*?<\/math>/gi, '')
			// Hoist data-en into the text stream. Replacing the whole opening tag
			// with its English value loses nothing — the tag itself was about to be
			// stripped — and keeps the element's own Icelandic text, so both are
			// searchable. Entities in the value are decoded by the pass below.
			.replace(/<[a-z][^>]*\sdata-en="([^"]*)"[^>]*>/gi, ' $1 ')
			// Remove all HTML tags, keeping text content
			.replace(/<[^>]*>/g, ' ')
			// Decode common HTML entities
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, ' ')
			// Clean up whitespace
			.replace(/\s+/g, ' ')
			.trim()
	);
}
