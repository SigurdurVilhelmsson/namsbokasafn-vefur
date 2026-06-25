/**
 * Per-book translation CREDIT (who/what did the translating), distinct from the
 * licence/provenance attribution in book.ts.
 *
 * Why a separate module (not a new field on BookAttribution): the credit model differs
 * by translation METHOD, and we have a rich, role-separated breakdown for exactly one
 * book (chemistry). Forcing role-fields onto the schema would make us invent data for
 * the other books or break the validation gate — the opposite of "fail loud, never
 * guess". So this module carries the rich block ONLY where it genuinely exists; every
 * other book gets a method-accurate one-liner derived from its existing data.
 *
 * Accuracy principle (method-based, not blanket): the chemistry first draft is MACHINE
 * translation (Erlendur/Miðeind) that humans then edit — so the machine is the
 * translator and the humans are ritstjórn/yfirlestur. Raw machine-translated previews
 * credit the machine only (no reviewer claim). Manually translated content (biology)
 * credits the human translator. We never claim yfirlestur where it has not happened.
 *
 * All strings Icelandic (UI language); inserted verbatim from editorial copy.
 */

export interface CreditLine {
	label: string;
	value: string;
}

/**
 * The honest credit for raw machine-translated content (the project-wide engine).
 * Single source of truth so the rendered MT floor and the data in book.ts can't drift.
 */
export const MACHINE_TRANSLATION_CREDIT = 'Íslensk vélþýðing (Erlendur, Miðeind)';

export interface BookCreditDetail {
	/** Verbatim "Um þessa þýðingu" prose, rendered on the colophon (/leyfi). */
	prefaceParagraphs: string[];
	/** Role-separated credit list rendered under the prose. */
	creditList: CreditLine[];
	/** Note about preview chapters not yet reviewed. */
	note: string;
	/** Compact, method-accurate one-liner for tight render sites (book-home, print). */
	summary: string;
}

/**
 * Rich credit blocks, keyed by book slug. Present only for books with a genuine
 * role-separated breakdown. Absence is normal — callers fall back to compactCredit().
 */
export const BOOK_CREDITS: Record<string, BookCreditDetail> = {
	'efnafraedi-2e': {
		prefaceParagraphs: [
			'Þetta er íslensk þýðing á Chemistry 2e frá OpenStax (Rice University), sem gefin er út undir Creative Commons Attribution 4.0 (CC BY 4.0). Þýðingin er sjálfstætt afleitt verk á ábyrgð Námsbókasafns og er hvorki gefin út né samþykkt af OpenStax.',
			'Frumþýðing var unnin með vélþýðingarvélinni Erlendi frá Miðeind. Faghugtök byggja á Íðorðabankanum (Stofnun Árna Magnússonar í íslenskum fræðum) og orðasafni Efnafræðifélags Íslands. Vélþýðingin var síðan yfirfarin, leiðrétt og staðfærð af kennurum með sérþekkingu á efninu.'
		],
		creditList: [
			{ label: 'Frumtexti', value: 'OpenStax, Rice University (CC BY 4.0)' },
			{ label: 'Vélþýðing', value: 'Erlendur (Miðeind)' },
			{ label: 'Íðorð', value: 'Íðorðabankinn (Árnastofnun), Efnafræðifélag Íslands' },
			{
				label: 'Ritstjórn og fagyfirlestur',
				value: 'Guðrún Ingibjörg Stefánsdóttir, Sigurður Einar Vilhelmsson'
			}
		],
		note: 'Kaflar merktir „forskoðun" hafa ekki enn farið í gegnum yfirlestur.',
		summary:
			'Vélþýðing: Erlendur (Miðeind). Ritstjórn og fagyfirlestur: Guðrún Ingibjörg Stefánsdóttir, Sigurður Einar Vilhelmsson.'
	}
};

/** Rich credit block for a book, or undefined when only a compact credit applies. */
export function getBookCredit(slug: string): BookCreditDetail | undefined {
	return BOOK_CREDITS[slug];
}

/**
 * Method-accurate label/value credit for books WITHOUT a rich block.
 *
 * - Preview books are raw machine translation → credit the machine, no reviewer.
 * - Everything else is human-translated content → credit the human translator.
 *
 * Branches on `status` (data), never on book identity.
 */
export function compactCreditPair(status: string, translators: string): CreditLine {
	return status === 'preview'
		? { label: 'Þýðing', value: MACHINE_TRANSLATION_CREDIT }
		: { label: 'Þýðandi', value: translators };
}

/** Single-string form of compactCreditPair for label-less render sites. */
export function compactCredit(status: string, translators: string): string {
	const { label, value } = compactCreditPair(status, translators);
	// The preview value already reads as a full statement — avoid "Þýðing: Íslensk vélþýðing…".
	return status === 'preview' ? value : `${label}: ${value}`;
}

/** The single credit line to show in tight spots: rich summary if present, else compact. */
export function creditLine(slug: string, status: string, translators: string): string {
	return getBookCredit(slug)?.summary ?? compactCredit(status, translators);
}
