/**
 * SearchModal after a failed search: the spinner stops (worklist bl-search-modal-spinner,
 * #387), and the modal says the search failed instead of 'Engar niðurstöður fundust'.
 *
 * The search module is real; only the browser's edges are stand-ins: the worker, which
 * answers builds and searches when the test says so, and fetch.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { SearchResult, WorkerMessage, WorkerResponse } from '$lib/workers/search.types';

const FAILED = 'Leitin tókst ekki. Reyndu aftur.';

const TOC = {
	title: 'bok',
	chapters: [{ number: 1, title: 'Kafli', sections: [{ number: '1.1', title: 'Hluti', file: '1-1-hluti.html' }] }]
};

const RESULT: SearchResult = {
	chapterSlug: '01',
	sectionSlug: '1-1-hluti',
	chapterTitle: 'Kafli',
	sectionTitle: 'Eðlismassi',
	sectionNumber: '1.1',
	snippet: 'efni',
	matches: 1,
	score: 0.1
};

/** Messages the worker has been sent and not yet answered. */
const unanswered: Array<{ type: 'build' | 'search'; answer: (reply: WorkerResponse) => void }> = [];

class FakeWorker {
	onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;
	postMessage(message: WorkerMessage) {
		if (message.type === 'clear') return;
		unanswered.push({
			type: message.type,
			answer: (reply) => this.onmessage?.({ data: reply } as MessageEvent<WorkerResponse>)
		});
	}
}

/** Answers every unanswered message of one type with `reply`, then lets the promises settle. */
async function answer(type: 'build' | 'search', reply: WorkerResponse) {
	for (let i = unanswered.length - 1; i >= 0; i--) {
		if (unanswered[i].type !== type) continue;
		const [message] = unanswered.splice(i, 1);
		message.answer(reply);
	}
	await vi.advanceTimersByTimeAsync(0);
	flushSync();
}
const failBuilds = () => answer('build', { type: 'build-error', error: 'Fuse failed' });
const completeBuilds = () => answer('build', { type: 'build-complete', documentCount: 1 });
const answerSearches = (results: SearchResult[]) => answer('search', { type: 'search-results', results });

let SearchModal: typeof import('./SearchModal.svelte').default;
let component: ReturnType<typeof mount> | null = null;

beforeAll(async () => {
	// The search module makes its worker when it is first imported
	vi.stubGlobal('Worker', FakeWorker);
	({ default: SearchModal } = await import('./SearchModal.svelte'));
});

afterAll(() => {
	vi.unstubAllGlobals();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	unanswered.length = 0;
	vi.useRealTimers();
	vi.restoreAllMocks();
});

/**
 * Opens search for `bookSlug`; the build that opening starts fails. Each test takes its own
 * book, since the search module (one per file) skips a build for a book whose index is ready.
 */
async function openSearch(bookSlug: string) {
	vi.useFakeTimers();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) =>
			url.endsWith('/toc.json')
				? { ok: true, json: async () => structuredClone(TOC) }
				: { ok: true, text: async () => '<p>efni</p>' }
		)
	);
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(SearchModal, { target, props: { isOpen: true, bookSlug } });
	flushSync();
	await vi.advanceTimersByTimeAsync(0);
	await failBuilds();
	return target;
}

async function type(target: HTMLElement, text: string) {
	const input = target.querySelector<HTMLInputElement>('#search-input')!;
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
	// past the 200 ms debounce
	await vi.advanceTimersByTimeAsync(250);
	flushSync();
	return input;
}

/** Types `text` and lets its search fail at the index build. */
async function failedSearch(target: HTMLElement, text: string) {
	const input = await type(target, text);
	await failBuilds();
	return input;
}

const spinner = (input: HTMLInputElement) => input.parentElement!.querySelector('svg.animate-spin');
const shown = (target: HTMLElement, text: string) =>
	[...target.querySelectorAll('p')].some((p) => p.textContent?.trim() === text);
const announced = (target: HTMLElement) => target.querySelector('[aria-live="polite"]')?.textContent?.trim();

describe('SearchModal after a failed search', () => {
	it('turns the spinner off when the search rejects', async () => {
		const target = await openSearch('bok-spinner');
		const input = await type(target, 'efni');
		expect(spinner(input)).not.toBeNull(); // control: the search is running

		await failBuilds();

		expect(spinner(input)).toBeNull();
	});

	it(`says '${FAILED}'`, async () => {
		const target = await openSearch('bok-says');
		await failedSearch(target, 'efni');

		expect(shown(target, FAILED)).toBe(true);
	});

	it("does not say 'Engar niðurstöður fundust'", async () => {
		const target = await openSearch('bok-not-none');
		await failedSearch(target, 'efni');

		expect(target.textContent).not.toContain('Engar niðurstöður fundust');
	});

	it('announces the failure to screen readers', async () => {
		const target = await openSearch('bok-announces');
		await failedSearch(target, 'efni');

		expect(announced(target)).toBe(FAILED);
	});

	it('takes the failure message away when a later search succeeds', async () => {
		const target = await openSearch('bok-recovers');
		await failedSearch(target, 'efni');
		expect(shown(target, FAILED)).toBe(true); // control: the failure was shown

		await type(target, 'efnið');
		await completeBuilds();
		await answerSearches([]);

		expect(shown(target, FAILED)).toBe(false);
	});

	it("does not leave an earlier search's results under a search that timed out", async () => {
		const target = await openSearch('bok-timeout');
		await type(target, 'efni');
		await completeBuilds();
		await answerSearches([RESULT]);
		expect(target.textContent).toContain('Eðlismassi'); // control: the result was shown

		await type(target, 'vatn');
		// the worker never answers; the search gives up after 5 s
		await vi.advanceTimersByTimeAsync(5000);
		flushSync();

		expect(target.textContent).not.toContain('Eðlismassi');
	});
});
