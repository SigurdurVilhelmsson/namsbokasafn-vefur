/**
 * Reference Store - Cross-references for equations, figures, tables
 * Ported from React/Zustand referenceStore.ts
 *
 * Supports two modes:
 * 1. Precomputed mode: Uses reference index from toc.json (build-time processing)
 * 2. Runtime mode: Parses content on the fly (fallback for legacy content)
 *
 * Precomputed mode is preferred as it provides deterministic numbering
 * regardless of the order sections are visited.
 *
 * Note: This store is NOT persisted as references are rebuilt from content
 */

import { writable, get } from 'svelte/store';

export type ReferenceType = 'sec' | 'eq' | 'fig' | 'tbl' | 'def';

export interface ReferenceItem {
	type: ReferenceType;
	id: string;
	label: string;
	number?: string;
	title?: string;
	preview?: string;
	chapterSlug: string;
	sectionSlug?: string;
	anchor?: string;
}

// Precomputed reference from toc.json
export interface PrecomputedReference {
	type: ReferenceType;
	id: string;
	number: string;
	label: string;
	title?: string;
	preview?: string;
	chapterSlug: string;
	sectionSlug: string;
	anchor: string;
}

export interface PrecomputedReferenceIndex {
	[key: string]: PrecomputedReference;
}

export interface ReferenceIndex {
	[key: string]: ReferenceItem;
}

interface ReferenceState {
	index: ReferenceIndex;
	precomputedIndex: PrecomputedReferenceIndex | null;
	currentChapter: number;
	currentSection: number;
	equationCounter: number;
	figureCounter: number;
	tableCounter: number;
	definitionCounter: number;
}

const LABELS: Record<ReferenceType, string> = {
	sec: 'Kafli',
	eq: 'Jafna',
	fig: 'Mynd',
	tbl: 'Tafla',
	def: 'Skilgreining'
};

function generateLabel(type: ReferenceType, number: string): string {
	return `${LABELS[type]} ${number}`;
}

const defaultState: ReferenceState = {
	index: {},
	precomputedIndex: null,
	currentChapter: 1,
	currentSection: 1,
	equationCounter: 0,
	figureCounter: 0,
	tableCounter: 0,
	definitionCounter: 0
};

function createReferenceStore() {
	const { subscribe, set, update } = writable<ReferenceState>(defaultState);

	return {
		subscribe,

		/**
		 * Load precomputed reference index from toc.json
		 * This should be called once when the book is loaded
		 */
		loadPrecomputedIndex: (index: PrecomputedReferenceIndex | null | undefined) => {
			update((state) => ({
				...state,
				precomputedIndex: index || null
			}));
		},

		resetCounters: (chapterNumber: number, sectionNumber = 1) => {
			update((state) => ({
				...state,
				currentChapter: chapterNumber,
				currentSection: sectionNumber,
				equationCounter: 0,
				figureCounter: 0,
				tableCounter: 0,
				definitionCounter: 0
			}));
		},

		registerReference: (item: Omit<ReferenceItem, 'label'>): string => {
			const state = get({ subscribe });
			const key = `${item.type}:${item.id}`;

			let label: string;
			let number: string;

			switch (item.type) {
				case 'eq':
					number = `${state.currentChapter}.${state.equationCounter + 1}`;
					label = generateLabel('eq', number);
					update((s) => ({ ...s, equationCounter: s.equationCounter + 1 }));
					break;
				case 'fig':
					number = `${state.currentChapter}.${state.figureCounter + 1}`;
					label = generateLabel('fig', number);
					update((s) => ({ ...s, figureCounter: s.figureCounter + 1 }));
					break;
				case 'tbl':
					number = `${state.currentChapter}.${state.tableCounter + 1}`;
					label = generateLabel('tbl', number);
					update((s) => ({ ...s, tableCounter: s.tableCounter + 1 }));
					break;
				case 'def':
					number = `${state.currentChapter}.${state.definitionCounter + 1}`;
					label = generateLabel('def', number);
					update((s) => ({ ...s, definitionCounter: s.definitionCounter + 1 }));
					break;
				case 'sec':
					label = item.title || generateLabel('sec', item.id);
					break;
				default:
					label = item.id;
			}

			const fullItem: ReferenceItem = { ...item, label };

			update((s) => ({
				...s,
				index: {
					...s.index,
					[key]: fullItem
				}
			}));

			return label;
		},

		getReference: (type: ReferenceType, id: string): ReferenceItem | undefined => {
			const key = `${type}:${id}`;
			const state = get({ subscribe });

			// Check precomputed index first (deterministic numbering)
			if (state.precomputedIndex && state.precomputedIndex[key]) {
				return state.precomputedIndex[key];
			}

			// Fall back to runtime index
			return state.index[key];
		},

		getNextEquationNumber: (): string => {
			const state = get({ subscribe });
			return `${state.currentChapter}.${state.equationCounter + 1}`;
		},

		getNextFigureNumber: (): string => {
			const state = get({ subscribe });
			return `${state.currentChapter}.${state.figureCounter + 1}`;
		},

		getNextTableNumber: (): string => {
			const state = get({ subscribe });
			return `${state.currentChapter}.${state.tableCounter + 1}`;
		},

		getNextDefinitionNumber: (): string => {
			const state = get({ subscribe });
			return `${state.currentChapter}.${state.definitionCounter + 1}`;
		},

		clearIndex: () => {
			update((state) => ({
				...state,
				index: {},
				equationCounter: 0,
				figureCounter: 0,
				tableCounter: 0,
				definitionCounter: 0
			}));
		},

		buildIndexFromContent: (
			chapterSlug: string,
			sectionSlug: string,
			content: string,
			chapterNumber: number
		) => {
			const state = get({ subscribe });

			// Reset counters for new chapter
			if (chapterNumber !== state.currentChapter) {
				update((s) => ({
					...s,
					currentChapter: chapterNumber,
					equationCounter: 0,
					figureCounter: 0,
					tableCounter: 0,
					definitionCounter: 0
				}));
			}

			// Register section (sections aren't in precomputed index, so always check runtime)
			const sectionKey = `sec:${chapterSlug}/${sectionSlug}`;
			if (!state.index[sectionKey]) {
				const titleMatch = content.match(/^#\s+(.+)$/m);
				const title = titleMatch ? titleMatch[1] : sectionSlug;

				const fullItem: ReferenceItem = {
					type: 'sec',
					id: `${chapterSlug}/${sectionSlug}`,
					label: title,
					title,
					chapterSlug,
					sectionSlug
				};

				update((s) => ({
					...s,
					index: {
						...s.index,
						[sectionKey]: fullItem
					}
				}));
			}

			// Find and register labeled equations
			// Skip if already in precomputed index (deterministic numbering takes precedence)
			const equationRegex = /\$\$[\s\S]*?\$\$\s*\{#eq:([^}]+)\}/g;
			let match;
			while ((match = equationRegex.exec(content)) !== null) {
				const eqId = match[1];
				const key = `eq:${eqId}`;
				const currentState = get({ subscribe });

				// Skip if already in precomputed index
				if (currentState.precomputedIndex?.[key]) continue;

				if (!currentState.index[key]) {
					const eqMatch = match[0].match(/\$\$([\s\S]*?)\$\$/);
					const preview = eqMatch ? eqMatch[1].slice(0, 50).trim() + '...' : undefined;

					const number = `${currentState.currentChapter}.${currentState.equationCounter + 1}`;
					const label = generateLabel('eq', number);

					update((s) => ({
						...s,
						equationCounter: s.equationCounter + 1,
						index: {
							...s.index,
							[key]: {
								type: 'eq',
								id: eqId,
								label,
								preview,
								chapterSlug,
								sectionSlug,
								anchor: `eq-${eqId}`
							}
						}
					}));
				}
			}

			// Find and register labeled figures
			const figureRegex = /!\[([^\]]*)\]\([^)]+\)\s*\{#fig:([^}]+)\}/g;
			while ((match = figureRegex.exec(content)) !== null) {
				const alt = match[1];
				const figId = match[2];
				const key = `fig:${figId}`;
				const currentState = get({ subscribe });

				// Skip if already in precomputed index
				if (currentState.precomputedIndex?.[key]) continue;

				if (!currentState.index[key]) {
					const number = `${currentState.currentChapter}.${currentState.figureCounter + 1}`;
					const label = generateLabel('fig', number);

					update((s) => ({
						...s,
						figureCounter: s.figureCounter + 1,
						index: {
							...s.index,
							[key]: {
								type: 'fig',
								id: figId,
								label,
								title: alt,
								preview: alt,
								chapterSlug,
								sectionSlug,
								anchor: `fig-${figId}`
							}
						}
					}));
				}
			}

			// Find and register labeled tables
			const tableRegex = /\|[\s\S]*?\|\n\s*\{#tbl:([^}]+)\}/g;
			while ((match = tableRegex.exec(content)) !== null) {
				const tblId = match[1];
				const key = `tbl:${tblId}`;
				const currentState = get({ subscribe });

				// Skip if already in precomputed index
				if (currentState.precomputedIndex?.[key]) continue;

				if (!currentState.index[key]) {
					const number = `${currentState.currentChapter}.${currentState.tableCounter + 1}`;
					const label = generateLabel('tbl', number);

					update((s) => ({
						...s,
						tableCounter: s.tableCounter + 1,
						index: {
							...s.index,
							[key]: {
								type: 'tbl',
								id: tblId,
								label,
								chapterSlug,
								sectionSlug,
								anchor: `tbl-${tblId}`
							}
						}
					}));
				}
			}
		},

		reset: () => set(defaultState)
	};
}

export const referenceStore = createReferenceStore();

// Helper functions
export function parseReferenceString(refString: string): {
	type: ReferenceType;
	id: string;
} | null {
	const match = refString.match(/^(sec|eq|fig|tbl|def):(.+)$/);
	if (!match) return null;
	return {
		type: match[1] as ReferenceType,
		id: match[2]
	};
}

export function getReferenceUrl(bookSlug: string, ref: ReferenceItem): string {
	const base = `/${bookSlug}/kafli/${ref.chapterSlug}`;

	if (ref.sectionSlug) {
		const path = `${base}/${ref.sectionSlug}`;
		return ref.anchor ? `${path}#${ref.anchor}` : path;
	}

	return base;
}
