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
