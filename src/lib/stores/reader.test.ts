/**
 * Tests for reader store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Need to reset module between tests to get fresh store instances
let reader: typeof import('./reader').reader;
let currentLocation: typeof import('./reader').currentLocation;
let bookmarks: typeof import('./reader').bookmarks;
let readingProgress: typeof import('./reader').readingProgress;
let isSectionRead: typeof import('./reader').isSectionRead;
let calcChapterProgress: typeof import('./reader').calcChapterProgress;
let isSectionBookmarked: typeof import('./reader').isSectionBookmarked;

describe('reader store', () => {
	beforeEach(async () => {
		// Clear localStorage
		localStorage.clear();

		// Reset module to get fresh store
		vi.resetModules();
		const module = await import('./reader');
		reader = module.reader;
		currentLocation = module.currentLocation;
		bookmarks = module.bookmarks;
		readingProgress = module.readingProgress;
		isSectionRead = module.isSectionRead;
		calcChapterProgress = module.calcChapterProgress;
		isSectionBookmarked = module.isSectionBookmarked;
	});

	describe('default values', () => {
		it('should have no reading progress initially', () => {
			expect(get(readingProgress)).toEqual({});
		});

		it('should have no current location', () => {
			const loc = get(currentLocation);
			expect(loc.chapter).toBeNull();
			expect(loc.section).toBeNull();
		});

		it('should have no bookmarks', () => {
			expect(get(bookmarks)).toEqual([]);
		});
	});

	describe('reading progress', () => {
		it('should mark section as read', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isRead('efnafraedi', '01-inngangur', '1.1')).toBe(true);
		});

		it('should return false for unread section', () => {
			expect(reader.isRead('efnafraedi', '01-inngangur', '1.1')).toBe(false);
		});

		it('should track multiple sections', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.markAsRead('efnafraedi', '01-inngangur', '1.2');
			reader.markAsRead('efnafraedi', '02-efni', '2.1');

			expect(reader.isRead('efnafraedi', '01-inngangur', '1.1')).toBe(true);
			expect(reader.isRead('efnafraedi', '01-inngangur', '1.2')).toBe(true);
			expect(reader.isRead('efnafraedi', '02-efni', '2.1')).toBe(true);
			expect(reader.isRead('efnafraedi', '02-efni', '2.2')).toBe(false);
		});

		it('should store lastVisited timestamp', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			const progress = get(readingProgress);
			expect(progress['efnafraedi/01-inngangur/1.1'].lastVisited).toBeDefined();
			expect(progress['efnafraedi/01-inngangur/1.1'].lastVisited).toMatch(/^\d{4}-\d{2}-\d{2}/);
		});
	});

	describe('chapter progress', () => {
		it('should return 0% for chapter with no read sections', () => {
			expect(reader.getChapterProgress('efnafraedi', '01-inngangur', 5)).toBe(0);
		});

		it('should calculate correct percentage', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.markAsRead('efnafraedi', '01-inngangur', '1.2');
			expect(reader.getChapterProgress('efnafraedi', '01-inngangur', 5)).toBe(40);
		});

		it('should return 100% when all sections read', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.markAsRead('efnafraedi', '01-inngangur', '1.2');
			reader.markAsRead('efnafraedi', '01-inngangur', '1.3');
			expect(reader.getChapterProgress('efnafraedi', '01-inngangur', 3)).toBe(100);
		});

		it('should return 0 for zero total sections', () => {
			expect(reader.getChapterProgress('efnafraedi', '01-inngangur', 0)).toBe(0);
		});

		it('should not count other chapters', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.markAsRead('efnafraedi', '02-efni', '2.1');
			expect(reader.getChapterProgress('efnafraedi', '01-inngangur', 2)).toBe(50);
		});
	});

	describe('current location', () => {
		it('should set current location', () => {
			reader.setCurrentLocation('efnafraedi', '01-inngangur', '1.1');
			const loc = get(currentLocation);
			expect(loc.chapter).toBe('01-inngangur');
			expect(loc.section).toBe('1.1');
		});

		it('should update location without marking as read', () => {
			reader.setCurrentLocation('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isRead('efnafraedi', '01-inngangur', '1.1')).toBe(false);
		});

		it('should preserve read status when setting location', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.setCurrentLocation('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isRead('efnafraedi', '01-inngangur', '1.1')).toBe(true);
		});

		it('should update lastVisited when setting location', () => {
			reader.setCurrentLocation('efnafraedi', '01-inngangur', '1.1');
			const progress = get(readingProgress);
			expect(progress['efnafraedi/01-inngangur/1.1'].lastVisited).toBeDefined();
		});
	});

	describe('bookmarks', () => {
		it('should add bookmark', () => {
			reader.addBookmark('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isBookmarked('efnafraedi', '01-inngangur', '1.1')).toBe(true);
		});

		it('should remove bookmark', () => {
			reader.addBookmark('efnafraedi', '01-inngangur', '1.1');
			reader.removeBookmark('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isBookmarked('efnafraedi', '01-inngangur', '1.1')).toBe(false);
		});

		it('should return false for non-bookmarked section', () => {
			expect(reader.isBookmarked('efnafraedi', '01-inngangur', '1.1')).toBe(false);
		});

		it('should toggle bookmark on', () => {
			reader.toggleBookmark('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isBookmarked('efnafraedi', '01-inngangur', '1.1')).toBe(true);
		});

		it('should toggle bookmark off', () => {
			reader.addBookmark('efnafraedi', '01-inngangur', '1.1');
			reader.toggleBookmark('efnafraedi', '01-inngangur', '1.1');
			expect(reader.isBookmarked('efnafraedi', '01-inngangur', '1.1')).toBe(false);
		});

		it('should track multiple bookmarks', () => {
			reader.addBookmark('efnafraedi', '01-inngangur', '1.1');
			reader.addBookmark('efnafraedi', '02-efni', '2.1');

			const bm = get(bookmarks);
			expect(bm).toContain('efnafraedi/01-inngangur/1.1');
			expect(bm).toContain('efnafraedi/02-efni/2.1');
		});
	});

	describe('pure functions', () => {
		it('isSectionRead should check progress object', () => {
			const progress = {
				'efnafraedi/01-inngangur/1.1': { read: true, lastVisited: '2025-01-01' }
			};
			expect(isSectionRead(progress, 'efnafraedi', '01-inngangur', '1.1')).toBe(true);
			expect(isSectionRead(progress, 'efnafraedi', '01-inngangur', '1.2')).toBe(false);
		});

		it('calcChapterProgress should calculate from progress object', () => {
			const progress = {
				'efnafraedi/01-inngangur/1.1': { read: true, lastVisited: '2025-01-01' },
				'efnafraedi/01-inngangur/1.2': { read: true, lastVisited: '2025-01-01' },
				'efnafraedi/02-efni/2.1': { read: true, lastVisited: '2025-01-01' }
			};
			expect(calcChapterProgress(progress, 'efnafraedi', '01-inngangur', 4)).toBe(50);
		});

		it('isSectionBookmarked should check bookmarks array', () => {
			const bm = ['efnafraedi/01-inngangur/1.1', 'efnafraedi/02-efni/2.1'];
			expect(isSectionBookmarked(bm, 'efnafraedi', '01-inngangur', '1.1')).toBe(true);
			expect(isSectionBookmarked(bm, 'efnafraedi', '01-inngangur', '1.2')).toBe(false);
		});
	});

	describe('persistence', () => {
		it('should persist to localStorage', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.addBookmark('efnafraedi', '02-efni', '2.1');

			expect(localStorage.setItem).toHaveBeenCalled();

			const stored = localStorage.getItem('namsbokasafn:reader');
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.progress['efnafraedi/01-inngangur/1.1'].read).toBe(true);
			expect(parsed.bookmarks).toContain('efnafraedi/02-efni/2.1');
		});

		it('should load from localStorage', async () => {
			localStorage.setItem(
				'namsbokasafn:reader',
				JSON.stringify({
					progress: {
						'efnafraedi/01-inngangur/1.1': { read: true, lastVisited: '2025-01-01' }
					},
					currentChapter: '01-inngangur',
					currentSection: '1.1',
					bookmarks: ['efnafraedi/02-efni/2.1']
				})
			);

			vi.resetModules();
			const module = await import('./reader');

			expect(module.reader.isRead('efnafraedi', '01-inngangur', '1.1')).toBe(true);
			expect(module.reader.isBookmarked('efnafraedi', '02-efni', '2.1')).toBe(true);

			const loc = get(module.currentLocation);
			expect(loc.chapter).toBe('01-inngangur');
			expect(loc.section).toBe('1.1');
		});
	});

	describe('reset', () => {
		it('should reset all state to defaults', () => {
			reader.markAsRead('efnafraedi', '01-inngangur', '1.1');
			reader.setCurrentLocation('efnafraedi', '01-inngangur', '1.1');
			reader.addBookmark('efnafraedi', '02-efni', '2.1');

			reader.reset();

			expect(get(readingProgress)).toEqual({});
			expect(get(currentLocation).chapter).toBeNull();
			expect(get(currentLocation).section).toBeNull();
			expect(get(bookmarks)).toEqual([]);
		});
	});
});
