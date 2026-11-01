/**
 * One polite status region for the whole app (plan step S4.2, register UI-01).
 *
 * A component calls announce(); LiveAnnouncer, mounted once in the root layout, holds the
 * text in an always-present role="status" region, so screen readers have registered the
 * region before its first message. Use it for a result that moves no focus and shows no
 * text where focus is: after a flashcard rating, the counter of the next card.
 */
import { writable, type Readable } from 'svelte/store';

const message = writable('');

/** The current announcement, for LiveAnnouncer */
export const announcement: Readable<string> = { subscribe: message.subscribe };

/** How long the region stays empty before the new text, so a repeat is spoken again */
export const ANNOUNCE_DELAY_MS = 50;

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Speak `text` politely. A live region speaks only a change, so the region is cleared
 * first and the text set a moment later; announcing the same text twice speaks it twice.
 */
export function announce(text: string): void {
	if (pending) clearTimeout(pending);
	message.set('');
	pending = setTimeout(() => {
		message.set(text);
		pending = null;
	}, ANNOUNCE_DELAY_MS);
}
