/**
 * Settings Store - Full SvelteKit implementation
 * Ported from React/Zustand settingsStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Types
export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamily = 'serif' | 'sans' | 'opendyslexic';
export type LineHeight = 'normal' | 'relaxed' | 'loose';
export type LineWidth = 'narrow' | 'medium' | 'wide';

export type ShortcutAction =
	| 'prevSection'
	| 'nextSection'
	| 'goHome'
	| 'goFlashcards'
	| 'goGlossary'
	| 'toggleSidebar'
	| 'toggleFocusMode'
	| 'toggleTheme'
	| 'openSearch'
	| 'showShortcuts'
	| 'closeModal';

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

interface SettingsState {
	theme: Theme;
	fontSize: FontSize;
	fontFamily: FontFamily;
	lineHeight: LineHeight;
	lineWidth: LineWidth;
	sidebarOpen: boolean;
	shortcutPreferences: ShortcutPreferences;
}

const STORAGE_KEY = 'namsbokasafn:settings';

const defaultSettings: SettingsState = {
	theme: 'light',
	fontSize: 'medium',
	fontFamily: 'serif',
	lineHeight: 'normal',
	lineWidth: 'medium',
	sidebarOpen: false,
	shortcutPreferences: {}
};

function loadSettings(): SettingsState {
	if (!browser) return defaultSettings;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return { ...defaultSettings, ...JSON.parse(stored) };
		}
	} catch (e) {
		console.warn('Failed to load settings:', e);
	}
	return defaultSettings;
}

function createSettingsStore() {
	const { subscribe, set, update } = writable<SettingsState>(loadSettings());

	// Persist to localStorage on every change
	if (browser) {
		subscribe((state) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			// Update dark class on html element
			if (state.theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		});
	}

	return {
		subscribe,

		// Theme methods
		setTheme: (theme: Theme) => update((s) => ({ ...s, theme })),

		toggleTheme: () =>
			update((s) => ({
				...s,
				theme: s.theme === 'light' ? 'dark' : 'light'
			})),

		// Font size methods
		setFontSize: (fontSize: FontSize) => update((s) => ({ ...s, fontSize })),

		// Font family methods
		setFontFamily: (fontFamily: FontFamily) => update((s) => ({ ...s, fontFamily })),

		// Line height methods
		setLineHeight: (lineHeight: LineHeight) => update((s) => ({ ...s, lineHeight })),

		// Line width methods
		setLineWidth: (lineWidth: LineWidth) => update((s) => ({ ...s, lineWidth })),

		// Sidebar methods
		setSidebarOpen: (sidebarOpen: boolean) => update((s) => ({ ...s, sidebarOpen })),

		toggleSidebar: () => update((s) => ({ ...s, sidebarOpen: !s.sidebarOpen })),

		// Keyboard shortcut methods
		setShortcut: (action: ShortcutAction, key: string) =>
			update((s) => ({
				...s,
				shortcutPreferences: {
					...s.shortcutPreferences,
					[action]: key
				}
			})),

		resetShortcut: (action: ShortcutAction) =>
			update((s) => {
				const newPrefs = { ...s.shortcutPreferences };
				delete newPrefs[action];
				return { ...s, shortcutPreferences: newPrefs };
			}),

		resetAllShortcuts: () => update((s) => ({ ...s, shortcutPreferences: {} })),

		getShortcut: (action: ShortcutAction): string => {
			const state = get({ subscribe });
			return state.shortcutPreferences[action] || DEFAULT_SHORTCUTS[action];
		},

		reset: () => set(defaultSettings)
	};
}

export const settings = createSettingsStore();

// Derived stores for convenience
export const theme = derived(settings, ($settings) => $settings.theme);
export const fontSize = derived(settings, ($settings) => $settings.fontSize);
export const fontFamily = derived(settings, ($settings) => $settings.fontFamily);
export const lineHeight = derived(settings, ($settings) => $settings.lineHeight);
export const lineWidth = derived(settings, ($settings) => $settings.lineWidth);
export const sidebarOpen = derived(settings, ($settings) => $settings.sidebarOpen);
