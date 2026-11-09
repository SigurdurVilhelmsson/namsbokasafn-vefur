/**
 * Settings Store - Full SvelteKit implementation
 * Ported from React/Zustand settingsStore.ts
 *
 * Stores only what the reader set, with a version and a profile-age marker (plan step S6.1,
 * register CODE-05, decision D02); the format and its rules are in settingsMigration.ts.
 * The store's value is still every setting in effect: the set keys over the defaults.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/env';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { isOneOf, isBoolean, isObject } from '$lib/utils/storeValidation';
import {
	chosenKeys,
	migrateStored,
	resolveSettings,
	serializeRecord,
	type SettingsRecord,
	type SettingsSchema
} from '$lib/utils/settingsMigration';

// Types
export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamily = 'serif' | 'sans' | 'opendyslexic';
export type LineHeight = 'normal' | 'relaxed' | 'loose';
export type LineWidth = 'narrow' | 'medium' | 'wide';
export type ReadingMode = 'paged' | 'scrolled';

export type ShortcutAction = 
	'prevSection' |
	'nextSection' |
	'goHome' |
	'goFlashcards' |
	'goGlossary' |
	'toggleSidebar' |
	'toggleFocusMode' |
	'toggleTheme' |
	'openSearch' |
	'showShortcuts' |
	'closeModal';

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
	prevSection: 'ArrowLeft',
	nextSection: 'ArrowRight',
	goHome: 'g h',
	goFlashcards: 'g f',
	goGlossary: 'g o',
	toggleSidebar: 's',
	toggleFocusMode: 'f',
	toggleTheme: 't',
	openSearch: '/',
	showShortcuts: '?',
	closeModal: 'Escape'
};

export type ShortcutPreferences = Partial<Record<ShortcutAction, string>>;

export interface SettingsState {
	theme: Theme;
	fontSize: FontSize;
	fontFamily: FontFamily;
	lineHeight: LineHeight;
	lineWidth: LineWidth;
	readingMode: ReadingMode | null;
	sidebarOpen: boolean;
	shortcutPreferences: ShortcutPreferences;
	bionicReading: boolean;
	glossaryHighlighting: boolean;
	showTermEnglish: boolean;
}

const STORAGE_KEY = 'namsbokasafn:settings';

export const defaultSettings: SettingsState = {
	theme: 'light',
	fontSize: 'medium',
	fontFamily: 'serif',
	lineHeight: 'normal',
	lineWidth: 'medium',
	// null: not chosen. What an unchosen reader sees is readerPolicy's UNCHOSEN_READING_MODE
	// (scrolled until call 3 is ruled, D06); the evidence for paging is hypothesis-level
	// (review R1, register PED-26), so nothing here picks a default.
	readingMode: null,
	sidebarOpen: false,
	shortcutPreferences: {},
	bionicReading: false,
	glossaryHighlighting: true,
	showTermEnglish: true
};

const settingsValidators = {
	theme: isOneOf('light', 'dark'),
	fontSize: isOneOf('small', 'medium', 'large', 'xlarge'),
	fontFamily: isOneOf('serif', 'sans', 'opendyslexic'),
	lineHeight: isOneOf('normal', 'relaxed', 'loose'),
	lineWidth: isOneOf('narrow', 'medium', 'wide'),
	readingMode: isOneOf('paged', 'scrolled'),
	sidebarOpen: isBoolean,
	shortcutPreferences: isObject,
	bionicReading: isBoolean,
	glossaryHighlighting: isBoolean,
	showTermEnglish: isBoolean
};

const settingsSchema: SettingsSchema<SettingsState> = {
	defaults: defaultSettings,
	validators: settingsValidators,
	// Screen state, kept across loads but never counted as a choice
	screenKeys: ['sidebarOpen']
};

/** Parse a stored value into a record; anything unreadable is a fresh profile */
function readRecord(raw: string | null): SettingsRecord {
	try {
		return migrateStored(raw === null ? null : JSON.parse(raw));
	} catch (e) {
		console.warn('Failed to load settings:', e);
		return migrateStored(null);
	}
}

function loadRecord(): SettingsRecord {
	if (!browser) return migrateStored(null);
	try {
		return readRecord(localStorage.getItem(STORAGE_KEY));
	} catch (e) {
		console.warn('Failed to load settings:', e);
		return migrateStored(null);
	}
}

/** What the reader has set on this device, for later defaults. Not reactive: read it when needed. */
export interface SettingsProfile {
	/** The settings version the profile was created under; 0 = it predates the seam */
	born: number;
	/** The settings the reader chose (the sidebar's open state is never one) */
	chosen: (keyof SettingsState)[];
}

function createSettingsStore() {
	let record = loadRecord();
	const { subscribe, set } = writable<SettingsState>(resolveSettings(record, settingsSchema));

	const persist = () => {
		if (browser) safeSetItem(STORAGE_KEY, serializeRecord(record));
	};

	/** Record what the reader set and apply it. Every setter, toggle and reset goes through here. */
	const choose = (patch: Partial<SettingsState>) => {
		record = { ...record, values: { ...record.values, ...patch } };
		set(resolveSettings(record, settingsSchema));
		persist();
	};

	const current = () => get({ subscribe });

	if (browser) {
		// The first load writes the version and the marker, even when nothing is chosen
		persist();

		// Update dark class on html element (always, even for cross-tab updates)
		subscribe((state) => {
			if (state.theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			// app.css's width rules read this attribute. app.html's pre-paint script sets it
			// from storage before the app runs; from here on the store keeps it in step (S6.2).
			document.documentElement.setAttribute('data-line-width', state.lineWidth);
		});

		// Cross-tab synchronization: take the other tab's record whole, and write nothing.
		// A removal arrives as 'null' and reads as a fresh profile. A value that does not
		// parse is ignored, so this tab's next change cannot write its choices away.
		onStorageChange(STORAGE_KEY, (newValue) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(newValue);
			} catch {
				return;
			}
			record = migrateStored(parsed);
			set(resolveSettings(record, settingsSchema));
		});
	}

	return {
		subscribe,

		// Theme methods
		setTheme: (theme: Theme) => choose({ theme }),

		toggleTheme: () => choose({ theme: current().theme === 'light' ? 'dark' : 'light' }),

		// Font size methods
		setFontSize: (fontSize: FontSize) => choose({ fontSize }),

		// Font family methods
		setFontFamily: (fontFamily: FontFamily) => choose({ fontFamily }),

		// Line height methods
		setLineHeight: (lineHeight: LineHeight) => choose({ lineHeight }),

		// Line width methods
		setLineWidth: (lineWidth: LineWidth) => choose({ lineWidth }),

		// Reading mode: stored only when the reader picks one (D06, PED-01). Nothing calls it
		// until a picker is rendered (S9.3's in-view switch, S11.5's reading-mode setting).
		setReadingMode: (readingMode: ReadingMode) => choose({ readingMode }),

		// Sidebar methods
		setSidebarOpen: (sidebarOpen: boolean) => choose({ sidebarOpen }),

		toggleSidebar: () => choose({ sidebarOpen: !current().sidebarOpen }),

		// Keyboard shortcut methods
		setShortcut: (action: ShortcutAction, key: string) =>
			choose({ shortcutPreferences: { ...current().shortcutPreferences, [action]: key } }),

		resetShortcut: (action: ShortcutAction) => {
			const newPrefs = { ...current().shortcutPreferences };
			delete newPrefs[action];
			choose({ shortcutPreferences: newPrefs });
		},

		resetAllShortcuts: () => choose({ shortcutPreferences: {} }),

		// Bionic reading methods
		setBionicReading: (enabled: boolean) => choose({ bionicReading: enabled }),
		toggleBionicReading: () => choose({ bionicReading: !current().bionicReading }),

		// Glossary highlighting methods
		setGlossaryHighlighting: (enabled: boolean) => choose({ glossaryHighlighting: enabled }),
		toggleGlossaryHighlighting: () => choose({ glossaryHighlighting: !current().glossaryHighlighting }),
		setShowTermEnglish: (enabled: boolean) => choose({ showTermEnglish: enabled }),
		toggleShowTermEnglish: () => choose({ showTermEnglish: !current().showTermEnglish }),

		getShortcut: (action: ShortcutAction): string => {
			return current().shortcutPreferences[action] || DEFAULT_SHORTCUTS[action];
		},

		/** The profile-age marker and the keys the reader chose (not reactive) */
		profile: (): SettingsProfile => ({ born: record.born, chosen: chosenKeys(record, settingsSchema) }),

		/** Forget every choice; keep the marker and any key a newer build wrote. Only tests call it. */
		reset: () => {
			const kept = Object.fromEntries(
				Object.entries(record.values).filter(([key]) => !(key in defaultSettings))
			);
			record = { ...record, values: kept };
			persist();
			set(resolveSettings(record, settingsSchema));
		}
	};
}

export const settings = createSettingsStore();

// Derived stores for convenience
export const theme = derived(settings, ($settings) => $settings.theme);
export const fontSize = derived(settings, ($settings) => $settings.fontSize);
export const fontFamily = derived(settings, ($settings) => $settings.fontFamily);
export const lineHeight = derived(settings, ($settings) => $settings.lineHeight);
export const lineWidth = derived(settings, ($settings) => $settings.lineWidth);
export const readingMode = derived(settings, ($settings) => $settings.readingMode);
export const sidebarOpen = derived(settings, ($settings) => $settings.sidebarOpen);
export const bionicReading = derived(settings, ($settings) => $settings.bionicReading);
export const glossaryHighlighting = derived(settings, ($settings) => $settings.glossaryHighlighting);
export const showTermEnglish = derived(settings, ($settings) => $settings.showTermEnglish);
