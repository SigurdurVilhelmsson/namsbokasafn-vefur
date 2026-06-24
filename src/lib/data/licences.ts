/**
 * Creative Commons licence model for per-book attribution.
 *
 * Attribution rendering is DATA-DRIVEN: components branch on the descriptor flags
 * (`nonCommercial`, `shareAlike`) — never on a book's identity. The only difference
 * between a CC BY book and a CC BY-NC-SA book is the licence code in the data.
 *
 * Licence verdicts derive from the provenance audit in the sister repo
 * (namsbokasafn-efni `docs/provenance/openstax-cnxml-licence-provenance.md`).
 *
 * UI-facing strings are Icelandic; CC licence short-names are kept as-is (proper nouns).
 */

export type LicenceCode = 'CC-BY-4.0' | 'CC-BY-NC-SA-4.0';

export interface LicenceDescriptor {
	code: LicenceCode;
	/** Short name shown to users, e.g. "CC BY 4.0" (kept untranslated). */
	name: string;
	/** Full human-readable name. */
	fullName: string;
	/** Canonical Creative Commons deed URL. */
	url: string;
	/** True when the licence forbids commercial use (the "NC" term). */
	nonCommercial: boolean;
	/** True when derivatives must carry the same licence (the "SA" term). */
	shareAlike: boolean;
	/**
	 * Icelandic notices for the extra terms, surfaced beside the licence name.
	 * Empty for permissive CC BY; populated for NC-SA.
	 */
	notices: string[];
	/**
	 * Relative restrictiveness used to compute the governing licence across
	 * multiple sources. Higher = more restrictive.
	 */
	restrictiveness: number;
}

export const LICENCES: Record<LicenceCode, LicenceDescriptor> = {
	'CC-BY-4.0': {
		code: 'CC-BY-4.0',
		name: 'CC BY 4.0',
		fullName: 'Creative Commons Attribution 4.0 International',
		url: 'https://creativecommons.org/licenses/by/4.0/',
		nonCommercial: false,
		shareAlike: false,
		notices: [],
		restrictiveness: 0
	},
	'CC-BY-NC-SA-4.0': {
		code: 'CC-BY-NC-SA-4.0',
		name: 'CC BY-NC-SA 4.0',
		fullName: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
		url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
		nonCommercial: true,
		shareAlike: true,
		notices: [
			'Óheimilt að nota efnið í ágóðaskyni.',
			'Afleitt efni skal bera sama leyfi (CC BY-NC-SA 4.0).'
		],
		restrictiveness: 1
	}
};

export interface BookSource {
	format: 'docx' | 'cnxml';
	/** ISO date the source was obtained (governs which licence is irrevocable for the copy held). */
	obtained: string;
	licenceAtObtaining: LicenceCode;
	licenceUrl: string;
	/** Upstream git repo / bundle the CNXML came from. */
	upstreamRepo?: string;
	/** OpenStax collection slug. */
	collection?: string;
	/** Relevant upstream relicence commit (hash + UTC date), for the record. */
	upstreamChangeCommit?: string;
	/** Human description of what this source covers. */
	chaptersCovered?: string;
}

export interface BookAttribution {
	bookKey: string;
	originalTitle: string;
	originalAuthors: string[];
	publisher: string;
	/** Free-access book URL on openstax.org. */
	sourceUrl: string;
	translators: string;
	adaptedBy?: string;
	/** Icelandic statement of the changes made (translation + localization). */
	modifications: string;
	/** The licence THIS Icelandic work carries — the most-restrictive source licence. */
	derivativeLicence: LicenceCode;
	derivativeLicenceUrl: string;
	/** Path/URL to the provenance report (served from /provenance after sync). */
	provenanceRef: string;
	sources: BookSource[];
}

/** Required string fields that must be non-empty on every book attribution. */
const REQUIRED_STRING_FIELDS: Array<keyof BookAttribution> = [
	'bookKey',
	'originalTitle',
	'publisher',
	'sourceUrl',
	'translators',
	'modifications',
	'derivativeLicence',
	'derivativeLicenceUrl',
	'provenanceRef'
];

/** Look up a licence descriptor, throwing on an unknown code (fail loud). */
export function getLicence(code: LicenceCode): LicenceDescriptor {
	const licence = LICENCES[code];
	if (!licence) {
		throw new Error(`Unknown licence code: ${String(code)}`);
	}
	return licence;
}

/**
 * The governing licence across a set of sources: the most restrictive one.
 * CC BY-NC-SA beats CC BY. Throws on an empty list (a book must have a source).
 */
export function mostRestrictive(codes: LicenceCode[]): LicenceCode {
	if (codes.length === 0) {
		throw new Error('mostRestrictive: no source licences provided');
	}
	return codes.reduce((winner, code) =>
		getLicence(code).restrictiveness > getLicence(winner).restrictiveness ? code : winner
	);
}

/**
 * Validate a book's attribution. Returns a list of human-readable error strings
 * (empty when valid) so callers can fail the build or render a visible placeholder.
 */
export function validateAttribution(attribution: BookAttribution | undefined): string[] {
	const errors: string[] = [];
	if (!attribution) {
		return ['attribution: missing entirely'];
	}

	for (const field of REQUIRED_STRING_FIELDS) {
		const value = attribution[field];
		if (typeof value !== 'string' || value.trim() === '') {
			errors.push(`${field}: missing or empty`);
		}
	}

	if (!Array.isArray(attribution.originalAuthors) || attribution.originalAuthors.length === 0) {
		errors.push('originalAuthors: must list at least one author');
	}

	if (!Array.isArray(attribution.sources) || attribution.sources.length === 0) {
		errors.push('sources: must list at least one source');
		return errors;
	}

	// The derivative licence must equal the most-restrictive licence actually used.
	const governing = mostRestrictive(attribution.sources.map((s) => s.licenceAtObtaining));
	if (attribution.derivativeLicence !== governing) {
		errors.push(
			`derivativeLicence: is ${attribution.derivativeLicence} but the most-restrictive source licence is ${governing}`
		);
	}

	return errors;
}
