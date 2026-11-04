/**
 * Shared HTML transforms for the print pipeline (chapter + appendix loaders).
 */

/** Extract the `<article>` (or `<body>` fallback) from a rendered content HTML string. */
export function extractArticle(html: string): string {
	const article = html.match(/<article[^>]*>[\s\S]*?<\/article>/);
	if (article) return article[0];
	const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
	return body ? body[1] : html;
}

/**
 * Tag machine-translated (unreviewed) content so print.css renders a
 * "Vélþýtt efni" watermark behind it. Adds the `mt-content` class to the first
 * `<article>` (keeping it the direct child, so the section page-break rule still
 * applies — a wrapper div would defeat `article.cnx-module:first-of-type`).
 */
export function markMachineTranslated(articleHtml: string, reviewed: boolean): string {
	if (reviewed) return articleHtml;
	return articleHtml.replace(/(<article\b[^>]*\bclass=")/i, '$1mt-content ');
}

const attrPatterns = new Map<string, RegExp>();

/**
 * An attribute's value from a start tag (or its attribute string), as written in the
 * markup (entities not decoded). Anchored on whitespace, so `id` never matches inside
 * `data-exercise-id`, nor `href` inside `xlink:href`.
 */
export function readAttr(attrs: string, name: string): string | undefined {
	let re = attrPatterns.get(name);
	if (!re) {
		re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
		attrPatterns.set(name, re);
	}
	const m = re.exec(attrs);
	return m ? (m[1] ?? m[2]) : undefined;
}

/** Whether a start tag (or its attribute string) carries the class `cls`. */
export function hasClass(attrs: string, cls: string): boolean {
	return (readAttr(attrs, 'class') ?? '').split(/\s+/).includes(cls);
}
