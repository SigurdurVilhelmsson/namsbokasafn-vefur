import { describe, it, expect } from 'vitest';
import { pool } from './pool';

/** Run `pool` over `n` items whose tasks each wait 5 ms, and record what happened. */
async function measure(n: number, limit: number) {
	let active = 0;
	let maxActive = 0;
	const ran: number[] = [];
	await pool(
		Array.from({ length: n }, (_, i) => i),
		limit,
		async (i) => {
			active++;
			maxActive = Math.max(maxActive, active);
			await new Promise((resolve) => setTimeout(resolve, 5));
			ran.push(i);
			active--;
		}
	);
	return { maxActive, ran };
}

describe('pool', () => {
	// Exactly the limit: a sequential pool (1) and an unbounded one (20) both fail this.
	it('runs exactly `limit` tasks at once when there are more items', async () => {
		expect((await measure(20, 6)).maxActive).toBe(6);
	});

	it('runs one task at a time with a limit of 1', async () => {
		expect((await measure(5, 1)).maxActive).toBe(1);
	});

	it('starts no more tasks than there are items', async () => {
		expect((await measure(3, 6)).maxActive).toBe(3);
	});

	it('runs every item exactly once', async () => {
		const { ran } = await measure(20, 6);
		expect([...ran].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
	});

	it('resolves without running a task when there are no items', async () => {
		let calls = 0;
		await pool([], 4, async () => {
			calls++;
		});
		expect(calls).toBe(0);
	});

	// Callers that must not stop on one failure catch inside the task (searchIndex.ts does).
	it('rejects when a task rejects', async () => {
		await expect(
			pool([1, 2, 3], 2, async (i) => {
				if (i === 2) throw new Error('boom');
			})
		).rejects.toThrow('boom');
	});
});
