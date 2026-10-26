import { afterEach, describe, expect, it } from 'vitest';
import { onStorageChange } from './localStorage';

/** A 'storage' event as another tab's change would fire it here. */
const fire = (key: string | null, newValue: string | null) =>
	window.dispatchEvent(new StorageEvent('storage', { key, newValue }));

describe('onStorageChange (another tab changed localStorage)', () => {
	let stop: () => void = () => {};
	afterEach(() => stop());

	it('passes on a new value of its key, and ignores other keys', () => {
		const seen: string[] = [];
		stop = onStorageChange('namsbokasafn:reader', (v) => seen.push(v));
		fire('namsbokasafn:reader', '{"a":1}');
		fire('namsbokasafn:quiz', '{"b":2}');
		expect(seen).toEqual(['{"a":1}']);
	});

	it("passes on a removal as 'null', so the store resets to its defaults (another tab's erase, S3.2)", () => {
		const seen: string[] = [];
		stop = onStorageChange('namsbokasafn:reader', (v) => seen.push(v));
		fire('namsbokasafn:reader', null);
		expect(seen).toEqual(['null']);
	});

	it("passes on localStorage.clear() (key null) as 'null'", () => {
		const seen: string[] = [];
		stop = onStorageChange('namsbokasafn:reader', (v) => seen.push(v));
		fire(null, null);
		expect(seen).toEqual(['null']);
	});
});
