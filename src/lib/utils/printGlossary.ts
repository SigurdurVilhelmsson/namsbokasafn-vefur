/**
 * Shared glossary helpers for the PRINT pipeline, so the chapter loader and the
 * back-of-book glossary route agree on the `gloss-N` id for a term.
 *
 * The chapter loader wraps each `<dfn class="term">` in `<a href="#gloss-N">`;
 * the glossary route renders `<dt id="gloss-N">` in the same sorted order (and
 * emits hidden target-links so Chromium creates the destinations). After the
 * merge, generate-pdfs.js's harvest/rebase makes the term links resolve.
 */

export interface GlossaryTerm {
	term: string;
	definition: string;
	english?: string;
	chapter?: number;
}

/** Terms in Icelandic collation order — the canonical `gloss-N` ordering. */
export function sortGlossaryTerms(terms: GlossaryTerm[]): GlossaryTerm[] {
	return [...terms].sort((a, b) => a.term.localeCompare(b.term, 'is'));
}

/**
 * The Icelandic term without its " (e. …)" English suffix, lowercased — the key
 * both a `<dfn>`'s text and a glossary headword normalise to for matching.
 * Mirrors the reader's `glossaryTerms.ts` stripEnglishSuffix.
 */
export function normalizeTermKey(text: string): string {
	const i = text.indexOf(' (e. ');
	return (i !== -1 ? text.slice(0, i) : text).trim().toLowerCase();
}

/**
 * The English term from a `<dfn>`'s " (e. …)" suffix, lowercased (empty if none).
 * Mirrors the reader's extractEnglish (strip the trailing `)`), tolerating the
 * nested parens some terms carry, e.g. "(e. formation constant (Kf))".
 */
export function extractEnglishKey(text: string): string {
	const i = text.indexOf(' (e. ');
	if (i === -1) return '';
	return text
		.slice(i + ' (e. '.length)
		.replace(/\)\s*$/, '')
		.trim()
		.toLowerCase();
}

export interface TermIndex {
	byTerm: Map<string, number>;
	byEnglish: Map<string, number>;
}

/**
 * Icelandic-headword and English lookups → gloss index (first wins on a tie).
 * `<dfn>` matching tries Icelandic exact, then English — the same tiers the
 * reader uses — because dfn text and glossary headword are sometimes translated
 * differently while sharing an English term.
 */
export function buildTermIndex(sorted: GlossaryTerm[]): TermIndex {
	const byTerm = new Map<string, number>();
	const byEnglish = new Map<string, number>();
	sorted.forEach((t, i) => {
		const k = t.term.trim().toLowerCase();
		if (!byTerm.has(k)) byTerm.set(k, i);
		if (t.english) {
			const e = t.english.trim().toLowerCase();
			if (!byEnglish.has(e)) byEnglish.set(e, i);
		}
	});
	return { byTerm, byEnglish };
}

/**
 * Wrap the first `<dfn class="term">` of each distinct term in a section's HTML
 * in a link to its glossary entry (`#gloss-N`). Unmatched dfns are left as-is
 * (partial coverage is expected — some terms aren't in the glossary).
 * First-occurrence-per-section is enforced via `seen`.
 *
 * Chromium only emits a Link annotation when the `#gloss-N` target exists in the
 * SAME document, so we also append a hidden `<span id="gloss-N">` per linked term
 * (like the clickable-TOC targets). generate-pdfs.js re-points every `gloss-N`
 * name to the real glossary entry page after the merge (and exempts `gloss-*`
 * from collision-namespacing so the glossary's dest wins over these placeholders).
 */
export function linkGlossaryTerms(html: string, index: TermIndex): string {
	const seen = new Set<number>();
	const linked = html.replace(
		/<dfn\b([^>]*\bclass="[^"]*\bterm\b[^"]*"[^>]*)>([\s\S]*?)<\/dfn>/gi,
		(match, _attrs, inner) => {
			const text = inner.replace(/<[^>]*>/g, '');
			const n = index.byTerm.get(normalizeTermKey(text)) ?? index.byEnglish.get(extractEnglishKey(text));
			if (n == null || seen.has(n)) return match;
			seen.add(n);
			return `<a class="glossary-link" href="#gloss-${n}">${match}</a>`;
		}
	);
	if (seen.size === 0) return linked;
	const targets = [...seen].map((n) => `<span id="gloss-${n}"></span>`).join('');
	return `${linked}<div class="toc-anchor-targets" aria-hidden="true">${targets}</div>`;
}
