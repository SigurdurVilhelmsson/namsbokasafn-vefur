/**
 * Project-level "about" content for the landing page.
 *
 * This is PROJECT-WIDE copy (people, funding, host schools) — deliberately NOT in
 * book.ts, which carries per-book attribution. The roster names individuals and their
 * roles across the project; per-book translation credit is rendered separately from
 * book metadata (see $lib/data/bookCredits.ts and each book's /leyfi colophon).
 *
 * All strings Icelandic (UI language). Inserted verbatim per editorial copy; the only
 * adjustment is Sigurður's role ("þýðingar" → "ritstjórn") to keep the credit
 * method-accurate: the chemistry first draft is machine translation, humans edit it.
 */

export interface RosterMember {
	name: string;
	/** Affiliation + role, verbatim editorial copy. */
	detail: string;
	/** Contact email (school address). */
	email: string;
}

export const roster: RosterMember[] = [
	{
		name: 'Sigurður Einar Vilhelmsson',
		detail: 'efnafræðikennari við Kvennaskólann í Reykjavík. Verkefnastjóri og ritstjórn.',
		email: 'sigurdurev@kvenno.is'
	},
	{
		name: 'Guðrún Ingibjörg Stefánsdóttir',
		detail: 'efnafræðikennari. Yfirlestur og málfar í efnafræði.',
		email: 'gudruns@fa.is'
	},
	{
		name: 'Þórhallur Halldórsson',
		detail: 'líffræðikennari. Þýðing og yfirlestur í líffræði.',
		email: 'thorhallur@fa.is'
	}
];

/** Host schools + funding note, shown beneath the roster. */
export const rosterNote =
	'Efnið er notað í kennslu við Kvennaskólann í Reykjavík og Fjölbrautaskólann við Ármúla. Verkefnið er styrkt af Sprotasjóði.';
