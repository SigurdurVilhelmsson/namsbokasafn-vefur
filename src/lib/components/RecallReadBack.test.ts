/**
 * RecallReadBack (plan step S5.5; D18 and its 2026-11-01 follow-up; CODE-24): on a return visit
 * to a section already recalled, its latest entry shows at the section end with 'Eyða'.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import RecallReadBack from './RecallReadBack.svelte';
import { recallStore } from '$lib/stores/recall';
import { announcement, ANNOUNCE_DELAY_MS } from '$lib/stores/announcer';

const BOOK = 'efnafraedi-2e';
const CHAPTER = '01';
const SECTION = '1-3-efnislegir-og-efnafraedilegir-eiginleikar';

let component: ReturnType<typeof mount> | null = null;

function render(props: Record<string, unknown> = {}) {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(RecallReadBack, {
		target,
		props: {
			bookSlug: BOOK,
			chapterSlug: CHAPTER,
			sectionSlug: SECTION,
			sectionNumber: '1.3',
			onclose: () => {},
			...props
		} as never
	});
	flushSync();
	return target;
}

const button = (t: HTMLElement, name: string) =>
	[...t.querySelectorAll('button')].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined;
const shownText = (t: HTMLElement) => t.querySelector('blockquote')?.textContent?.trim();
const add = (text: string, section = SECTION) => recallStore.addEntry(BOOK, CHAPTER, section, text)!;
const confirmAnswer = (answer: boolean) => vi.spyOn(window, 'confirm').mockReturnValue(answer);

beforeEach(() => {
	vi.useFakeTimers();
	localStorage.clear();
	recallStore.reset();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('RecallReadBack', () => {
	it("shows the section's latest entry", () => {
		add('fyrri');
		add('annar kafli', '1-4-annar');
		add('nýjust');
		const t = render();
		expect(shownText(t)).toBe('nýjust');
	});

	it('shows nothing when the section has no entry', () => {
		add('annar kafli', '1-4-annar');
		const t = render();
		expect(t.textContent?.trim()).toBe('');
	});

	it('follows the store without a remount (CODE-24)', () => {
		add('fyrri');
		const t = render();
		add('nýrri');
		flushSync();
		expect(shownText(t)).toBe('nýrri');
	});

	it('names the section in its heading', () => {
		add('texti');
		const t = render();
		expect(t.querySelector('h3')?.textContent).toContain('1.3');
	});

	it("'Eyða', confirmed, deletes that entry and leaves the other", () => {
		confirmAnswer(true);
		const older = add('fyrri');
		add('nýjust');
		const t = render();
		button(t, 'Eyða')?.click();
		expect(get(recallStore).entries).toEqual([older]);
	});

	it("'Eyða' closes it, so the page moves focus", () => {
		confirmAnswer(true);
		add('texti');
		const onclose = vi.fn();
		const t = render({ onclose });
		button(t, 'Eyða')?.click();
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it("'Eyða' announces the deletion", () => {
		confirmAnswer(true);
		add('texti');
		const t = render();
		button(t, 'Eyða')?.click();
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toMatch(/eytt/);
	});

	it('a declined confirm keeps the entry', () => {
		confirmAnswer(false);
		add('texti');
		const t = render();
		const eyda = button(t, 'Eyða');
		eyda?.click();
		expect([eyda !== undefined, get(recallStore).entries.length]).toEqual([true, 1]);
	});

	it("'Loka' closes it", () => {
		add('texti');
		const onclose = vi.fn();
		const t = render({ onclose });
		button(t, 'Loka')?.click();
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('takes no focus when it appears (KEEP-01)', () => {
		add('texti');
		const t = render();
		expect([shownText(t), document.activeElement]).toEqual(['texti', document.body]);
	});
});
