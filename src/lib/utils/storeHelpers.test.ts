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
	generateId
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
	it('should join chapter and section with /', () => {
		expect(createSectionKey('ch-1', 'sec-1')).toBe('ch-1/sec-1');
	});
});

describe('createStatsKey', () => {
	it('should return section key when both provided', () => {
		expect(createStatsKey('ch-1', 'sec-1')).toBe('ch-1/sec-1');
	});

	it('should return chapter slug when only chapter provided', () => {
		expect(createStatsKey('ch-1')).toBe('ch-1');
	});

	it('should return global when neither provided', () => {
		expect(createStatsKey()).toBe('global');
	});
});

describe('createObjectiveKey', () => {
	it('should include chapter, section, and index', () => {
		expect(createObjectiveKey('ch-1', 'sec-1', 0)).toBe('ch-1/sec-1/0');
	});
});

describe('createChapterPrefix', () => {
	it('should append /', () => {
		expect(createChapterPrefix('ch-1')).toBe('ch-1/');
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
