import { describe, it, expect, vi } from 'vitest';
import {
	formatLocalDate,
	getTodayDateString,
	getYesterdayDateString,
	createSectionKey,
	createStatsKey,
	createObjectiveKey,
	createChapterPrefix,
	calculateProgress,
	calculateProgressFromCounts,
	generateId,
	migrateRecordKeys,
	migrateBookmarkKeys
} from './storeHelpers';

describe('formatLocalDate', () => {
	it('should format date as YYYY-MM-DD in local timezone', () => {
		// Use a known date
		const date = new Date(2025, 0, 15); // Jan 15, 2025 in LOCAL timezone
		expect(formatLocalDate(date)).toBe('2025-01-15');
	});

	it('should zero-pad month and day', () => {
		const date = new Date(2025, 2, 5); // Mar 5, 2025
		expect(formatLocalDate(date)).toBe('2025-03-05');
	});

	it('should handle December correctly', () => {
		const date = new Date(2025, 11, 31); // Dec 31, 2025
		expect(formatLocalDate(date)).toBe('2025-12-31');
	});

	it('should use local timezone, not UTC', () => {
		// Create a date at midnight local time
		const date = new Date(2025, 5, 15, 0, 0, 0);
		const result = formatLocalDate(date);
		// Regardless of UTC offset, local date should be June 15
		expect(result).toBe('2025-06-15');
	});
});

describe('getTodayDateString', () => {
	it('should return today in YYYY-MM-DD format', () => {
		const result = getTodayDateString();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		// Should match the local date
		const now = new Date();
		const expected = formatLocalDate(now);
		expect(result).toBe(expected);
	});
});

describe('getYesterdayDateString', () => {
	it('should return yesterday in YYYY-MM-DD format', () => {
		const result = getYesterdayDateString();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const expected = formatLocalDate(yesterday);
		expect(result).toBe(expected);
	});

	it('should handle month boundaries', () => {
		// Mock Date to be March 1
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 2, 1, 12, 0, 0)); // Mar 1, 2025 noon

		const result = getYesterdayDateString();
		expect(result).toBe('2025-02-28');

		vi.useRealTimers();
	});

	it('should handle year boundaries', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0)); // Jan 1, 2025 noon

		const result = getYesterdayDateString();
		expect(result).toBe('2024-12-31');

		vi.useRealTimers();
	});
});

describe('createSectionKey', () => {
	it('should join book, chapter and section with /', () => {
		expect(createSectionKey('efnafraedi-2e', 'ch-1', 'sec-1')).toBe('efnafraedi-2e/ch-1/sec-1');
	});
});

describe('createStatsKey', () => {
	it('should return section key when both provided', () => {
		expect(createStatsKey('efnafraedi-2e', 'ch-1', 'sec-1')).toBe('efnafraedi-2e/ch-1/sec-1');
	});

	it('should return book/chapter key when only chapter provided', () => {
		expect(createStatsKey('efnafraedi-2e', 'ch-1')).toBe('efnafraedi-2e/ch-1');
	});

	it('should return book/global when neither chapter nor section provided', () => {
		expect(createStatsKey('efnafraedi-2e')).toBe('efnafraedi-2e/global');
	});
});

describe('createObjectiveKey', () => {
	it('should include book, chapter, section, and index', () => {
		expect(createObjectiveKey('efnafraedi-2e', 'ch-1', 'sec-1', 0)).toBe('efnafraedi-2e/ch-1/sec-1/0');
	});
});

describe('createChapterPrefix', () => {
	it('should return book/chapter/', () => {
		expect(createChapterPrefix('efnafraedi-2e', 'ch-1')).toBe('efnafraedi-2e/ch-1/');
	});
});

describe('calculateProgress', () => {
	it('should calculate correct percentage', () => {
		const items = [{ isCompleted: true }, { isCompleted: false }, { isCompleted: true }];
		const result = calculateProgress(items);
		expect(result).toEqual({ total: 3, completed: 2, percentage: 67 });
	});

	it('should handle empty array', () => {
		expect(calculateProgress([])).toEqual({ total: 0, completed: 0, percentage: 0 });
	});
});

describe('calculateProgressFromCounts', () => {
	it('should calculate percentage from counts', () => {
		expect(calculateProgressFromCounts(3, 10)).toEqual({ total: 10, completed: 3, percentage: 30 });
	});
});

describe('generateId', () => {
	it('should return a string', () => {
		expect(typeof generateId()).toBe('string');
	});

	it('should generate unique IDs', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});
});

describe('migrateRecordKeys', () => {
	it('should prefix legacy keys with efnafraedi-2e/', () => {
		const legacy = {
			'ch-1/sec-1': { read: true },
			'ch-2/sec-3': { read: false }
		};
		const result = migrateRecordKeys(legacy);
		expect(result).toEqual({
			'efnafraedi-2e/ch-1/sec-1': { read: true },
			'efnafraedi-2e/ch-2/sec-3': { read: false }
		});
	});

	it('should rename old efnafraedi/ keys to efnafraedi-2e/', () => {
		const old = {
			'efnafraedi/ch-1/sec-1': { read: true },
			'efnafraedi/ch-2/sec-3': { read: false }
		};
		const result = migrateRecordKeys(old);
		expect(result).toEqual({
			'efnafraedi-2e/ch-1/sec-1': { read: true },
			'efnafraedi-2e/ch-2/sec-3': { read: false }
		});
	});

	it('should leave current-slug keys untouched', () => {
		const modern = {
			'efnafraedi-2e/ch-1/sec-1': { read: true }
		};
		const result = migrateRecordKeys(modern);
		expect(result).toBe(modern); // same reference — no migration needed
	});

	it('should handle mixed legacy, old-slug, and current-slug keys', () => {
		const mixed = {
			'ch-1/sec-1': { read: true },
			'efnafraedi/ch-2/sec-3': { read: false },
			'efnafraedi-2e/ch-3/sec-1': { read: true }
		};
		const result = migrateRecordKeys(mixed);
		expect(result).toEqual({
			'efnafraedi-2e/ch-1/sec-1': { read: true },
			'efnafraedi-2e/ch-2/sec-3': { read: false },
			'efnafraedi-2e/ch-3/sec-1': { read: true }
		});
	});

	it('should handle chapter-only keys (e.g. stats keys)', () => {
		const legacy = { 'ch-1': { totalAttempts: 5 } };
		const result = migrateRecordKeys(legacy);
		expect(result).toEqual({ 'efnafraedi-2e/ch-1': { totalAttempts: 5 } });
	});

	it('should handle global key', () => {
		const legacy = { 'global': { totalAttempts: 10 } };
		const result = migrateRecordKeys(legacy);
		expect(result).toEqual({ 'efnafraedi-2e/global': { totalAttempts: 10 } });
	});

	it('should return original object when no migration needed', () => {
		const modern = { 'efnafraedi-2e/ch-1/sec-1': { read: true } };
		expect(migrateRecordKeys(modern)).toBe(modern);
	});

	it('should handle empty record', () => {
		const empty = {};
		expect(migrateRecordKeys(empty)).toBe(empty);
	});
});

describe('migrateBookmarkKeys', () => {
	it('should prefix legacy bookmark keys', () => {
		const legacy = ['ch-1/sec-1', 'ch-2/sec-3'];
		const result = migrateBookmarkKeys(legacy);
		expect(result).toEqual(['efnafraedi-2e/ch-1/sec-1', 'efnafraedi-2e/ch-2/sec-3']);
	});

	it('should rename old efnafraedi/ bookmark keys', () => {
		const old = ['efnafraedi/ch-1/sec-1', 'efnafraedi/ch-2/sec-3'];
		const result = migrateBookmarkKeys(old);
		expect(result).toEqual(['efnafraedi-2e/ch-1/sec-1', 'efnafraedi-2e/ch-2/sec-3']);
	});

	it('should leave current-slug keys untouched', () => {
		const modern = ['efnafraedi-2e/ch-1/sec-1'];
		const result = migrateBookmarkKeys(modern);
		expect(result).toBe(modern);
	});

	it('should handle empty array', () => {
		const empty: string[] = [];
		expect(migrateBookmarkKeys(empty)).toBe(empty);
	});
});
