/**
 * Annotation Store - Highlights and notes
 *
 * Supports both v1 (legacy DOM-based) and v2 (text-based) annotations.
 * Legacy annotations are automatically upgraded to v2 on successful restoration.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isArray } from '$lib/utils/storeValidation';
import type { Annotation, HighlightColor, TextRange, AnnotationStats } from '$lib/types/annotation';
import { generateId, getCurrentTimestamp } from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:annotations';

interface AnnotationState {
	annotations: Annotation[];
}

const defaultState: AnnotationState = {
	annotations: []
};

const annotationValidators = {
	annotations: isArray
};

function loadState(): AnnotationState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return validateStoreData(JSON.parse(stored), defaultState, annotationValidators);
		}
	} catch (e) {
		console.warn('Failed to load annotation state:', e);
	}
	return defaultState;
}

function createAnnotationStore() {
	const { subscribe, set, update } = writable<AnnotationState>(loadState());

	// Annotation index for O(1) lookups (lazily rebuilt on access after mutations)
	let _sectionIndex: Map<string, Annotation[]> | null = null;
	let _chapterIndex: Map<string, Annotation[]> | null = null;
	let _bookIndex: Map<string, Annotation[]> | null = null;
	let _idIndex: Map<string, Annotation> | null = null;

	function invalidateIndex() {
		_sectionIndex = null;
		_chapterIndex = null;
		_bookIndex = null;
		_idIndex = null;
	}

	function ensureIndex() {
		if (_sectionIndex) return;
		const { annotations } = get({ subscribe });
		_sectionIndex = new Map();
		_chapterIndex = new Map();
		_bookIndex = new Map();
		_idIndex = new Map();

		for (const ann of annotations) {
			const sKey = `${ann.bookSlug}:${ann.chapterSlug}:${ann.sectionSlug}`;
			const cKey = `${ann.bookSlug}:${ann.chapterSlug}`;
			const bKey = ann.bookSlug;

			if (!_sectionIndex.has(sKey)) _sectionIndex.set(sKey, []);
			_sectionIndex.get(sKey)!.push(ann);

			if (!_chapterIndex.has(cKey)) _chapterIndex.set(cKey, []);
			_chapterIndex.get(cKey)!.push(ann);

			if (!_bookIndex.has(bKey)) _bookIndex.set(bKey, []);
			_bookIndex.get(bKey)!.push(ann);

			_idIndex.set(ann.id, ann);
		}
	}

	// Persist to localStorage and invalidate index on changes
	let _externalUpdate = false;
	if (browser) {
		subscribe((state) => {
			if (!_externalUpdate) {
				safeSetItem(STORAGE_KEY, JSON.stringify(state));
			}
			invalidateIndex();
		});

		// Cross-tab synchronization
		onStorageChange(STORAGE_KEY, (newValue) => {
			try {
				_externalUpdate = true;
				set(validateStoreData(JSON.parse(newValue), defaultState, annotationValidators));
			} catch { /* ignore */ }
			finally { _externalUpdate = false; }
		});
	}

	return {
		subscribe,

		// Add a new annotation
		addAnnotation: (
			bookSlug: string,
			chapterSlug: string,
			sectionSlug: string,
			selectedText: string,
			range: TextRange,
			color: HighlightColor,
			note?: string
		): string => {
			const id = generateId();
			const timestamp = getCurrentTimestamp();

			const newAnnotation: Annotation = {
				id,
				bookSlug,
				chapterSlug,
				sectionSlug,
				selectedText,
				range,
				color,
				note,
				createdAt: timestamp,
				updatedAt: timestamp
			};

			update((state) => ({
				annotations: [...state.annotations, newAnnotation]
			}));

			return id;
		},

		// Update an existing annotation (color, note)
		updateAnnotation: (id: string, updates: Partial<Pick<Annotation, 'color' | 'note'>>) => {
			update((state) => ({
				annotations: state.annotations.map((ann) =>
					ann.id === id ? { ...ann, ...updates, updatedAt: getCurrentTimestamp() } : ann
				)
			}));
		},

		// Upgrade annotation range from v1 to v2 format
		upgradeAnnotationRange: (id: string, newRange: TextRange) => {
			update((state) => ({
				annotations: state.annotations.map((ann) =>
					ann.id === id
						? { ...ann, range: newRange, updatedAt: getCurrentTimestamp() }
						: ann
				)
			}));
		},

		// Remove an annotation
		removeAnnotation: (id: string) => {
			update((state) => ({
				annotations: state.annotations.filter((ann) => ann.id !== id)
			}));
		},

		// Get annotations for a specific section (O(1) indexed lookup)
		getAnnotationsForSection: (bookSlug: string, chapterSlug: string, sectionSlug: string): Annotation[] => {
			ensureIndex();
			return _sectionIndex!.get(`${bookSlug}:${chapterSlug}:${sectionSlug}`) || [];
		},

		// Get annotations for a specific chapter (O(1) indexed lookup)
		getAnnotationsForChapter: (bookSlug: string, chapterSlug: string): Annotation[] => {
			ensureIndex();
			return _chapterIndex!.get(`${bookSlug}:${chapterSlug}`) || [];
		},

		// Get annotations for a specific book (O(1) indexed lookup)
		getAnnotationsForBook: (bookSlug: string): Annotation[] => {
			ensureIndex();
			return _bookIndex!.get(bookSlug) || [];
		},

		// Get annotation by ID (O(1) indexed lookup)
		getAnnotationById: (id: string): Annotation | undefined => {
			ensureIndex();
			return _idIndex!.get(id);
		},

		// Get statistics
		getStats: (bookSlug?: string): AnnotationStats => {
			const { annotations } = get({ subscribe });
			const filtered = bookSlug
				? annotations.filter((ann) => ann.bookSlug === bookSlug)
				: annotations;

			const byColor: Record<HighlightColor, number> = {
				yellow: 0,
				green: 0,
				blue: 0,
				pink: 0
			};

			const byChapter: Record<string, number> = {};
			let withNotes = 0;

			filtered.forEach((ann) => {
				byColor[ann.color]++;
				byChapter[ann.chapterSlug] = (byChapter[ann.chapterSlug] || 0) + 1;
				if (ann.note) withNotes++;
			});

			return {
				total: filtered.length,
				byColor,
				byChapter,
				withNotes
			};
		},

		// Clear annotations for a section
		clearAnnotationsForSection: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			update((state) => ({
				annotations: state.annotations.filter(
					(ann) => !(ann.bookSlug === bookSlug && ann.chapterSlug === chapterSlug && ann.sectionSlug === sectionSlug)
				)
			}));
		},

		// Clear all annotations
		clearAllAnnotations: () => {
			set({ annotations: [] });
		},

		// Export annotations as markdown
		exportAnnotations: (bookSlug: string): string => {
			const { annotations } = get({ subscribe });
			const bookAnnotations = annotations
				.filter((ann) => ann.bookSlug === bookSlug)
				.sort((a, b) => {
					if (a.chapterSlug !== b.chapterSlug) {
						return a.chapterSlug.localeCompare(b.chapterSlug);
					}
					if (a.sectionSlug !== b.sectionSlug) {
						return a.sectionSlug.localeCompare(b.sectionSlug);
					}
					// Use offsetFromAnchor for v2, startOffset for v1
					const aOffset = a.range.version === 2 ? a.range.offsetFromAnchor : (a.range.startOffset ?? 0);
					const bOffset = b.range.version === 2 ? b.range.offsetFromAnchor : (b.range.startOffset ?? 0);
					return aOffset - bOffset;
				});

			if (bookAnnotations.length === 0) {
				return '# Engar athugasemdir\n\nÞú hefur ekki bætt við neinum athugasemdum ennþá.';
			}

			const lines: string[] = [
				'# Athugasemdir og yfirstrikun',
				'',
				`Útflutningsdagur: ${new Date().toLocaleDateString('is-IS')}`,
				'',
				`Fjöldi athugasemda: ${bookAnnotations.length}`,
				'',
				'---',
				''
			];

			// Group by chapter
			const byChapter = new Map<string, Annotation[]>();
			bookAnnotations.forEach((ann) => {
				const existing = byChapter.get(ann.chapterSlug) || [];
				existing.push(ann);
				byChapter.set(ann.chapterSlug, existing);
			});

			byChapter.forEach((chapterAnnotations, chapterSlug) => {
				lines.push(`## ${chapterSlug}`);
				lines.push('');

				chapterAnnotations.forEach((ann) => {
					const colorEmoji = {
						yellow: '🟡',
						green: '🟢',
						blue: '🔵',
						pink: '🟣'
					}[ann.color];

					lines.push(`### ${colorEmoji} ${ann.sectionSlug}`);
					lines.push('');
					lines.push(`> "${ann.selectedText}"`);
					lines.push('');

					if (ann.note) {
						lines.push(`**Athugasemd:** ${ann.note}`);
						lines.push('');
					}

					lines.push(`*${new Date(ann.createdAt).toLocaleDateString('is-IS')}*`);
					lines.push('');
				});
			});

			return lines.join('\n');
		},

		reset: () => set(defaultState)
	};
}

export const annotationStore = createAnnotationStore();

// Derived stores
export const totalAnnotations = derived(
	annotationStore,
	($store) => $store.annotations.length
);

export const annotationsWithNotes = derived(annotationStore, ($store) =>
	$store.annotations.filter((ann) => ann.note)
);
