/**
 * DeckCardList: a deck's cards on /minniskort, each with 'Eyða' (reader plan S7.2, register
 * UI-14). The delete asks first, removes the card and its study record, says so, and moves
 * focus off the button it removed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import { get } from 'svelte/store';
import DeckCardList from './DeckCardList.svelte';
import { flashcardStore } from '$lib/stores/flashcard';
import { announcement, ANNOUNCE_DELAY_MS } from '$lib/stores/announcer';
import type { Flashcard } from '$lib/types/flashcard';

let component: ReturnType<typeof mount> | null = null;
let confirmSpy: ReturnType<typeof vi.spyOn>;

const card = (id: string, front: string): Flashcard => ({
	id,
	front,
	back: `Svar við ${front}`,
	created: '2026-11-02T00:00:00.000Z'
});

function render() {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(DeckCardList, { target, props: { deckId: 'deck-1' } });
	flushSync();
	target.querySelector('details')!.open = true;
	return target;
}

const deleteButtons = (t: HTMLElement) => [...t.querySelectorAll<HTMLButtonElement>('li button')];
const cardIds = () => flashcardStore.getDeck('deck-1')!.cards.map((c) => c.id);

async function clickDelete(button: HTMLButtonElement) {
	button.click();
	await tick();
	flushSync();
}

beforeEach(() => {
	flashcardStore.reset();
	flashcardStore.addDeck({
		id: 'deck-1',
		name: 'Stokkur',
		created: '2026-11-02T00:00:00.000Z',
		cards: [card('c1', 'Hvað er mól?'), card('c2', 'Hvað er atóm?'), card('c3', 'Hvað er jón?')]
	});
	flashcardStore.rateCard('c1', 'good');
	confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.replaceChildren();
	confirmSpy.mockRestore();
	vi.useRealTimers();
});

describe('DeckCardList', () => {
	it("lists the deck's cards by their front", () => {
		const t = render();
		expect([...t.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
			expect.stringContaining('Hvað er mól?'),
			expect.stringContaining('Hvað er atóm?'),
			expect.stringContaining('Hvað er jón?')
		]);
	});

	it("names each 'Eyða' by its card, so the buttons differ", () => {
		const t = render();
		expect(deleteButtons(t).map((b) => b.getAttribute('aria-label'))).toEqual([
			'Eyða korti: Hvað er mól?',
			'Eyða korti: Hvað er atóm?',
			'Eyða korti: Hvað er jón?'
		]);
		expect(deleteButtons(t).map((b) => b.textContent?.trim())).toEqual(['Eyða', 'Eyða', 'Eyða']);
	});

	it('asks before it deletes', async () => {
		const t = render();
		await clickDelete(deleteButtons(t)[0]);
		expect(confirmSpy).toHaveBeenCalledWith('Eyða þessu korti? Þetta er ekki hægt að afturkalla.');
	});

	it('keeps the card when the student cancels', async () => {
		confirmSpy.mockReturnValue(false);
		const t = render();
		await clickDelete(deleteButtons(t)[0]);
		expect(cardIds()).toEqual(['c1', 'c2', 'c3']);
		expect(flashcardStore.getCardRecord('c1')).toBeDefined();
	});

	it('deletes the card and its study record when the student confirms', async () => {
		const t = render();
		await clickDelete(deleteButtons(t)[0]);
		expect(cardIds()).toEqual(['c2', 'c3']);
		expect(flashcardStore.getCardRecord('c1')).toBeUndefined();
		expect(deleteButtons(t)).toHaveLength(2);
	});

	it('says the card was deleted', async () => {
		vi.useFakeTimers();
		const t = render();
		await clickDelete(deleteButtons(t)[1]);
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toBe('Kortinu var eytt.');
	});

	it("moves focus to the next card's 'Eyða'", async () => {
		const t = render();
		await clickDelete(deleteButtons(t)[1]);
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Eyða korti: Hvað er jón?');
	});

	it("moves focus to the previous card's 'Eyða' when the last card goes", async () => {
		const t = render();
		await clickDelete(deleteButtons(t)[2]);
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Eyða korti: Hvað er atóm?');
	});

	it('moves focus to the summary when the deck is left empty', async () => {
		const t = render();
		for (let i = 0; i < 3; i++) await clickDelete(deleteButtons(t)[0]);
		expect(cardIds()).toEqual([]);
		expect(document.activeElement).toBe(t.querySelector('summary'));
	});
});
