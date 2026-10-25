/**
 * Run `task` over `items` with at most `limit` at a time.
 *
 * `min(limit, items.length)` lanes each take the next item until none are left, so items
 * start in order but may finish out of order. A task that rejects rejects the pool (the
 * other lanes keep running); a caller that must not stop on one failure catches inside
 * its task. Used by the offline download and the search index.
 */
export async function pool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) await task(items[next++]);
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
