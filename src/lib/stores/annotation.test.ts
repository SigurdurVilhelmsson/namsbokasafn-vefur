/**
 * Tests for annotation store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { TextRange } from '$lib/types/annotation';

// Need to reset module between tests to get fresh store instances
let annotationStore: typeof import('./annotation').annotationStore;
let totalAnnotations: typeof import('./annotation').totalAnnotations;
let annotationsWithNotes: typeof import('./annotation').annotationsWithNotes;

// Helper to create a v2 TextRange
function makeRange(overrides: Partial<TextRange> = {}): TextRange {
	return {
		version: 2,
		exact: 'selected text',
		prefix: 'before ',
		suffix: ' after',
		anchorId: 'heading-1',
		offsetFromAnchor: 42,
		...overrides
	};
}

describe('annotation store', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./annotation');
		annotationStore = module.annotationStore;
		totalAnnotations = module.totalAnnotations;
		annotationsWithNotes = module.annotationsWithNotes;
	});

	describe('default values', () => {
		it('should start with empty annotations', () => {
			expect(get(annotationStore).annotations).toEqual([]);
		});

		it('should have zero total annotations', () => {
			expect(get(totalAnnotations)).toBe(0);
		});
	});

	describe('addAnnotation', () => {
		it('should add a new annotation and return its id', () => {
			const id = annotationStore.addAnnotation(
				'efnafraedi', '01', '1-1', 'highlighted text', makeRange(), 'yellow'
			);
			expect(id).toBeDefined();
			expect(typeof id).toBe('string');
			expect(get(totalAnnotations)).toBe(1);
		});

		it('should store all annotation fields', () => {
			annotationStore.addAnnotation(
				'efnafraedi', '01', '1-1', 'text', makeRange(), 'green', 'a note'
			);
			const ann = get(annotationStore).annotations[0];
			expect(ann.bookSlug).toBe('efnafraedi');
			expect(ann.chapterSlug).toBe('01');
			expect(ann.sectionSlug).toBe('1-1');
			expect(ann.selectedText).toBe('text');
			expect(ann.color).toBe('green');
			expect(ann.note).toBe('a note');
			expect(ann.createdAt).toBeDefined();
			expect(ann.updatedAt).toBeDefined();
		});

		it('should add multiple annotations', () => {
			annotationStore.addAnnotation('b', 'c1', 's1', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', 'c1', 's2', 'b', makeRange(), 'blue');
			annotationStore.addAnnotation('b', 'c2', 's1', 'c', makeRange(), 'pink');
			expect(get(totalAnnotations)).toBe(3);
		});
	});

	describe('updateAnnotation', () => {
		it('should update annotation color', () => {
			const id = annotationStore.addAnnotation(
				'b', 'c', 's', 'text', makeRange(), 'yellow'
			);
			annotationStore.updateAnnotation(id, { color: 'blue' });
			const ann = annotationStore.getAnnotationById(id);
			expect(ann?.color).toBe('blue');
		});

		it('should update annotation note', () => {
			const id = annotationStore.addAnnotation(
				'b', 'c', 's', 'text', makeRange(), 'yellow'
			);
			annotationStore.updateAnnotation(id, { note: 'new note' });
			const ann = annotationStore.getAnnotationById(id);
			expect(ann?.note).toBe('new note');
		});

		it('should update updatedAt timestamp', () => {
			const id = annotationStore.addAnnotation(
				'b', 'c', 's', 'text', makeRange(), 'yellow'
			);
			const before = annotationStore.getAnnotationById(id)?.updatedAt;
			// Small delay to ensure different timestamp
			annotationStore.updateAnnotation(id, { color: 'green' });
			const after = annotationStore.getAnnotationById(id)?.updatedAt;
			expect(after).toBeDefined();
			// Timestamps should be valid ISO strings
			expect(new Date(after!).getTime()).toBeGreaterThanOrEqual(new Date(before!).getTime());
		});
	});

	describe('upgradeAnnotationRange', () => {
		it('should replace the range with a new v2 range', () => {
			const oldRange = makeRange({ exact: 'old', anchorId: null });
			const id = annotationStore.addAnnotation(
				'b', 'c', 's', 'text', oldRange, 'yellow'
			);

			const newRange = makeRange({ exact: 'text', anchorId: 'heading-2', offsetFromAnchor: 100 });
			annotationStore.upgradeAnnotationRange(id, newRange);

			const ann = annotationStore.getAnnotationById(id);
			expect(ann?.range.anchorId).toBe('heading-2');
			expect(ann?.range.offsetFromAnchor).toBe(100);
		});
	});

	describe('removeAnnotation', () => {
		it('should remove an annotation by id', () => {
			const id = annotationStore.addAnnotation(
				'b', 'c', 's', 'text', makeRange(), 'yellow'
			);
			expect(get(totalAnnotations)).toBe(1);
			annotationStore.removeAnnotation(id);
			expect(get(totalAnnotations)).toBe(0);
		});

		it('should not affect other annotations', () => {
			const id1 = annotationStore.addAnnotation('b', 'c', 's', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', 'c', 's', 'b', makeRange(), 'blue');
			annotationStore.removeAnnotation(id1);
			expect(get(totalAnnotations)).toBe(1);
			expect(get(annotationStore).annotations[0].color).toBe('blue');
		});
	});

	describe('filtering', () => {
		beforeEach(() => {
			annotationStore.addAnnotation('book-a', '01', '1-1', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('book-a', '01', '1-2', 'b', makeRange(), 'blue');
			annotationStore.addAnnotation('book-a', '02', '2-1', 'c', makeRange(), 'green');
			annotationStore.addAnnotation('book-b', '01', '1-1', 'd', makeRange(), 'pink');
		});

		it('should get annotations for a section', () => {
			const anns = annotationStore.getAnnotationsForSection('book-a', '01', '1-1');
			expect(anns).toHaveLength(1);
			expect(anns[0].selectedText).toBe('a');
		});

		it('should get annotations for a chapter', () => {
			const anns = annotationStore.getAnnotationsForChapter('book-a', '01');
			expect(anns).toHaveLength(2);
		});

		it('should get annotations for a book', () => {
			const anns = annotationStore.getAnnotationsForBook('book-a');
			expect(anns).toHaveLength(3);
		});

		it('should return empty array for non-existent filters', () => {
			expect(annotationStore.getAnnotationsForSection('x', 'y', 'z')).toHaveLength(0);
			expect(annotationStore.getAnnotationsForBook('nonexistent')).toHaveLength(0);
		});
	});

	describe('getAnnotationById', () => {
		it('should find annotation by id', () => {
			const id = annotationStore.addAnnotation(
				'b', 'c', 's', 'text', makeRange(), 'yellow'
			);
			expect(annotationStore.getAnnotationById(id)?.selectedText).toBe('text');
		});

		it('should return undefined for non-existent id', () => {
			expect(annotationStore.getAnnotationById('nonexistent')).toBeUndefined();
		});
	});

	describe('getStats', () => {
		it('should return empty stats when no annotations', () => {
			const stats = annotationStore.getStats();
			expect(stats.total).toBe(0);
			expect(stats.withNotes).toBe(0);
		});

		it('should count by color', () => {
			annotationStore.addAnnotation('b', 'c', 's', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', 'c', 's', 'b', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', 'c', 's', 'c', makeRange(), 'blue');
			const stats = annotationStore.getStats();
			expect(stats.byColor.yellow).toBe(2);
			expect(stats.byColor.blue).toBe(1);
			expect(stats.byColor.green).toBe(0);
		});

		it('should count by chapter', () => {
			annotationStore.addAnnotation('b', '01', 's', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', '01', 's', 'b', makeRange(), 'blue');
			annotationStore.addAnnotation('b', '02', 's', 'c', makeRange(), 'green');
			const stats = annotationStore.getStats();
			expect(stats.byChapter['01']).toBe(2);
			expect(stats.byChapter['02']).toBe(1);
		});

		it('should count notes', () => {
			annotationStore.addAnnotation('b', 'c', 's', 'a', makeRange(), 'yellow', 'has note');
			annotationStore.addAnnotation('b', 'c', 's', 'b', makeRange(), 'blue');
			const stats = annotationStore.getStats();
			expect(stats.withNotes).toBe(1);
		});

		it('should filter by book slug', () => {
			annotationStore.addAnnotation('book-a', 'c', 's', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('book-b', 'c', 's', 'b', makeRange(), 'blue');
			const stats = annotationStore.getStats('book-a');
			expect(stats.total).toBe(1);
		});
	});

	describe('clearAnnotationsForSection', () => {
		it('should clear only annotations for the given section', () => {
			annotationStore.addAnnotation('b', '01', '1-1', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', '01', '1-2', 'b', makeRange(), 'blue');
			annotationStore.clearAnnotationsForSection('01', '1-1');
			expect(get(totalAnnotations)).toBe(1);
			expect(get(annotationStore).annotations[0].sectionSlug).toBe('1-2');
		});
	});

	describe('clearAllAnnotations', () => {
		it('should remove all annotations', () => {
			annotationStore.addAnnotation('b', 'c', 's', 'a', makeRange(), 'yellow');
			annotationStore.addAnnotation('b', 'c', 's', 'b', makeRange(), 'blue');
			annotationStore.clearAllAnnotations();
			expect(get(totalAnnotations)).toBe(0);
		});
	});

	describe('derived stores', () => {
		it('should track annotationsWithNotes', () => {
			annotationStore.addAnnotation('b', 'c', 's', 'a', makeRange(), 'yellow', 'note');
			annotationStore.addAnnotation('b', 'c', 's', 'b', makeRange(), 'blue');
			expect(get(annotationsWithNotes)).toHaveLength(1);
			expect(get(annotationsWithNotes)[0].note).toBe('note');
		});
	});

	describe('exportAnnotations', () => {
		it('should return placeholder for empty book', () => {
			const md = annotationStore.exportAnnotations('empty-book');
			expect(md).toContain('Engar athugasemdir');
		});

		it('should export annotations as markdown', () => {
			annotationStore.addAnnotation('b', '01', '1-1', 'highlight', makeRange(), 'yellow', 'my note');
			const md = annotationStore.exportAnnotations('b');
			expect(md).toContain('Athugasemdir og yfirstrikun');
			expect(md).toContain('"highlight"');
			expect(md).toContain('my note');
		});
	});

	describe('persistence', () => {
		it('should persist to localStorage', () => {
			annotationStore.addAnnotation('b', 'c', 's', 'text', makeRange(), 'yellow');
			expect(localStorage.setItem).toHaveBeenCalled();
		});

		it('should load from localStorage', async () => {
			localStorage.setItem(
				'namsbokasafn:annotations',
				JSON.stringify({
					annotations: [
						{
							id: 'test-id',
							bookSlug: 'b',
							chapterSlug: 'c',
							sectionSlug: 's',
							selectedText: 'saved text',
							range: makeRange(),
							color: 'green',
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString()
						}
					]
				})
			);

			vi.resetModules();
			const module = await import('./annotation');
			const store = module.annotationStore;
			expect(get(store).annotations).toHaveLength(1);
			expect(get(store).annotations[0].selectedText).toBe('saved text');
		});
	});

	describe('reset', () => {
		it('should reset to default state', () => {
			annotationStore.addAnnotation('b', 'c', 's', 'text', makeRange(), 'yellow');
			annotationStore.reset();
			expect(get(totalAnnotations)).toBe(0);
		});
	});
});
