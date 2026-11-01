/**
 * RatingButtons (plan step S4.2, UI-16): the four ratings, each with its next interval, on
 * the --rating-* tokens. The first test file that mounts a Svelte component (CODE-21).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import RatingButtons from './RatingButtons.svelte';

const INTERVALS = { again: '<1 mín', hard: '1 dagur', good: '3 dagar', easy: '7 dagar' };

let component: ReturnType<typeof mount> | null = null;

function render(props: Record<string, unknown>) {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(RatingButtons, { target, props: props as never });
	flushSync();
	return target;
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('RatingButtons', () => {
	it('shows the four ratings in order, each with its interval', () => {
		const target = render({ intervals: INTERVALS, onrate: () => {} });
		const names = [...target.querySelectorAll('button')].map((b) => b.textContent?.replace(/\s+/g, ' ').trim());
		expect(names).toEqual(['Aftur <1 mín', 'Erfitt 1 dagur', 'Gott 3 dagar', 'Auðvelt 7 dagar']);
	});

	it('hides the interval line when there are no intervals', () => {
		const target = render({ intervals: null, onrate: () => {} });
		expect(target.querySelectorAll('.rating-interval')).toHaveLength(0);
	});

	it("reports the rating that was pressed ('Gott' gives 'good')", () => {
		const onrate = vi.fn();
		const target = render({ intervals: INTERVALS, onrate });
		(target.querySelectorAll('button')[2] as HTMLButtonElement).click();
		expect(onrate).toHaveBeenCalledWith('good');
	});

	it('gives each rating its own token class, and none the accent', () => {
		const target = render({ intervals: INTERVALS, onrate: () => {} });
		const classes = [...target.querySelectorAll('button')].map((b) =>
			[...b.classList].find((c) => c.startsWith('rating--') && c !== 'rating--compact')
		);
		expect(classes).toEqual(['rating--again', 'rating--hard', 'rating--good', 'rating--easy']);
	});
});
