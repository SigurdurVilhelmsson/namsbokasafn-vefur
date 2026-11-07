/**
 * SearchModal: a search whose index build fails turns its spinner off (worklist
 * bl-search-modal-spinner, found in the 2026-11-04 backlog run's round 3).
 *
 * The search module is real; only the browser's edges are stand-ins: the worker, which
 * answers each index build with 'build-error' when the test says so, and fetch.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { WorkerMessage, WorkerResponse } from '$lib/workers/search.types';

const TOC = {
	title: 'bok',
	chapters: [{ number: 1, title: 'Kafli', sections: [{ number: '1.1', title: 'Hluti', file: '1-1-hluti.html' }] }]
};

/** Index builds the worker has been sent and not yet answered. */
const unansweredBuilds: Array<() => void> = [];

class FailingWorker {
	onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;
	postMessage(message: WorkerMessage) {
		if (message.type !== 'build') return;
		unansweredBuilds.push(() =>
			this.onmessage?.({ data: { type: 'build-error', error: 'Fuse failed' } } as MessageEvent<WorkerResponse>)
		);
	}
}

/** Answers every build sent so far with 'build-error', then lets the promises settle. */
async function failBuilds() {
	for (const answer of unansweredBuilds.splice(0)) answer();
	await vi.advanceTimersByTimeAsync(0);
	flushSync();
}

let SearchModal: typeof import('./SearchModal.svelte').default;
let component: ReturnType<typeof mount> | null = null;

beforeAll(async () => {
	// The search module makes its worker when it is first imported
	vi.stubGlobal('Worker', FailingWorker);
	({ default: SearchModal } = await import('./SearchModal.svelte'));
});

afterAll(() => {
	vi.unstubAllGlobals();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	unansweredBuilds.length = 0;
	vi.useRealTimers();
	vi.restoreAllMocks();
});

async function openSearch() {
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
	component = mount(SearchModal, { target, props: { isOpen: true, bookSlug: 'bok' } });
	flushSync();
	// Opening search builds the index; that build fails too
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

const spinner = (input: HTMLInputElement) => input.parentElement!.querySelector('svg.animate-spin');

describe('SearchModal after a failed search', () => {
	it('turns the spinner off when the search rejects', async () => {
		const target = await openSearch();
		const input = await type(target, 'efni');
		expect(spinner(input)).not.toBeNull(); // control: the search is running

		await failBuilds();

		expect(spinner(input)).toBeNull();
	});
});
