/**
 * Cloze-card text construction (reader plan P1.3)
 *
 * Builds the front of a cloze card from a highlighted phrase and its
 * surrounding block text: the sentence containing the selection, with the
 * selection blanked out.
 */

const BLANK = '______';
const MAX_CONTEXT = 240;

/** Characters that end a sentence (Icelandic text uses the same set) */
const SENTENCE_END = /[.!?]/;

/**
 * Extract the sentence around `selected` within `blockText` and replace the
 * selection with a blank. Returns null when the selection can't be located
 * (caller falls back to the plain flashcard modal).
 */
export function buildClozeFront(blockText: string, selected: string): string | null {
	const text = blockText.replace(/\s+/g, ' ').trim();
	const needle = selected.replace(/\s+/g, ' ').trim();
	if (!needle) return null;

	const idx = text.indexOf(needle);
	if (idx === -1) return null;

	// Expand to sentence boundaries around the selection
	let start = idx;
	while (start > 0 && !SENTENCE_END.test(text[start - 1])) start--;
	let end = idx + needle.length;
	while (end < text.length && !SENTENCE_END.test(text[end])) end++;
	if (end < text.length) end++; // include the closing punctuation

	let sentence = text.slice(start, end).trim();

	// Cap very long sentences, keeping the blank visible
	if (sentence.length > MAX_CONTEXT) {
		const selStart = sentence.indexOf(needle);
		const half = Math.floor((MAX_CONTEXT - needle.length) / 2);
		const from = Math.max(0, selStart - half);
		const to = Math.min(sentence.length, selStart + needle.length + half);
		sentence =
			(from > 0 ? '… ' : '') + sentence.slice(from, to).trim() + (to < sentence.length ? ' …' : '');
	}

	const front = sentence.replace(needle, BLANK);
	// A cloze with no remaining context teaches nothing
	if (front.replace(BLANK, '').trim().length < 10) return null;

	return front;
}
