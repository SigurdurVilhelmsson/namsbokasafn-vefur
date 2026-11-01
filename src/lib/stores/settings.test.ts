/**
 * Tests for settings store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Need to reset module between tests to get fresh store instances
let settings: typeof import('./settings').settings;
let theme: typeof import('./settings').theme;
let fontSize: typeof import('./settings').fontSize;
let fontFamily: typeof import('./settings').fontFamily;
let sidebarOpen: typeof import('./settings').sidebarOpen;
let DEFAULT_SHORTCUTS: typeof import('./settings').DEFAULT_SHORTCUTS;

describe('settings store', () => {
	beforeEach(async () => {
		// Clear localStorage
		localStorage.clear();

		// Reset module to get fresh store
		vi.resetModules();
		const module = await import('./settings');
		settings = module.settings;
		theme = module.theme;
		fontSize = module.fontSize;
		fontFamily = module.fontFamily;
		sidebarOpen = module.sidebarOpen;
		DEFAULT_SHORTCUTS = module.DEFAULT_SHORTCUTS;
	});

	describe('default values', () => {
		it('should have correct default theme', () => {
			expect(get(theme)).toBe('light');
		});

		it('should have correct default font size', () => {
			expect(get(fontSize)).toBe('medium');
		});

		it('should have correct default font family', () => {
			expect(get(fontFamily)).toBe('serif');
		});

		it('should have sidebar closed by default', () => {
			expect(get(sidebarOpen)).toBe(false);
		});
	});

	describe('theme', () => {
		it('should set theme to dark', () => {
			settings.setTheme('dark');
			expect(get(theme)).toBe('dark');
		});

		it('should toggle theme from light to dark', () => {
			expect(get(theme)).toBe('light');
			settings.toggleTheme();
			expect(get(theme)).toBe('dark');
		});

		it('should toggle theme from dark to light', () => {
			settings.setTheme('dark');
			settings.toggleTheme();
			expect(get(theme)).toBe('light');
		});
	});

	describe('font size', () => {
		it('should set font size to small', () => {
			settings.setFontSize('small');
			expect(get(fontSize)).toBe('small');
		});

		it('should set font size to large', () => {
			settings.setFontSize('large');
			expect(get(fontSize)).toBe('large');
		});

		it('should set font size to xlarge', () => {
			settings.setFontSize('xlarge');
			expect(get(fontSize)).toBe('xlarge');
		});
	});

	describe('font family', () => {
		it('should set font family to sans', () => {
			settings.setFontFamily('sans');
			expect(get(fontFamily)).toBe('sans');
		});

		it('should set font family back to serif', () => {
			settings.setFontFamily('sans');
			settings.setFontFamily('serif');
			expect(get(fontFamily)).toBe('serif');
		});
	});

	describe('sidebar', () => {
		it('should open sidebar', () => {
			settings.setSidebarOpen(true);
			expect(get(sidebarOpen)).toBe(true);
		});

		it('should close sidebar', () => {
			settings.setSidebarOpen(true);
			settings.setSidebarOpen(false);
			expect(get(sidebarOpen)).toBe(false);
		});

		it('should toggle sidebar', () => {
			expect(get(sidebarOpen)).toBe(false);
			settings.toggleSidebar();
			expect(get(sidebarOpen)).toBe(true);
			settings.toggleSidebar();
			expect(get(sidebarOpen)).toBe(false);
		});
	});

	describe('keyboard shortcuts', () => {
		it('should have default shortcuts defined', () => {
			expect(DEFAULT_SHORTCUTS.prevSection).toBe('ArrowLeft');
			expect(DEFAULT_SHORTCUTS.nextSection).toBe('ArrowRight');
			expect(DEFAULT_SHORTCUTS.goHome).toBe('g h');
			expect(DEFAULT_SHORTCUTS.toggleTheme).toBe('t');
			expect(DEFAULT_SHORTCUTS.openSearch).toBe('/');
		});

		it('should get default shortcut when no preference set', () => {
			const shortcut = settings.getShortcut('prevSection');
			expect(shortcut).toBe('ArrowLeft');
		});

		it('should set custom shortcut', () => {
			settings.setShortcut('prevSection', 'h');
			const shortcut = settings.getShortcut('prevSection');
			expect(shortcut).toBe('h');
		});

		it('should reset single shortcut to default', () => {
			settings.setShortcut('prevSection', 'h');
			settings.resetShortcut('prevSection');
			const shortcut = settings.getShortcut('prevSection');
			expect(shortcut).toBe('ArrowLeft');
		});

		it('should reset all shortcuts', () => {
			settings.setShortcut('prevSection', 'h');
			settings.setShortcut('nextSection', 'l');
			settings.resetAllShortcuts();

			expect(settings.getShortcut('prevSection')).toBe('ArrowLeft');
			expect(settings.getShortcut('nextSection')).toBe('ArrowRight');
		});
	});

	describe('persistence', () => {
		it('should persist settings to localStorage', () => {
			settings.setTheme('dark');
			settings.setFontSize('large');

			expect(localStorage.setItem).toHaveBeenCalled();

			const stored = localStorage.getItem('namsbokasafn:settings');
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.theme).toBe('dark');
			expect(parsed.fontSize).toBe('large');
		});

		it('should load settings from localStorage', async () => {
			// Set up localStorage with saved settings
			localStorage.setItem(
				'namsbokasafn:settings',
				JSON.stringify({
					theme: 'dark',
					fontSize: 'small',
					fontFamily: 'sans',
					sidebarOpen: true,
					shortcutPreferences: { prevSection: 'h' }
				})
			);

			// Reset module to reload from localStorage
			vi.resetModules();
			const module = await import('./settings');

			expect(get(module.theme)).toBe('dark');
			expect(get(module.fontSize)).toBe('small');
			expect(get(module.fontFamily)).toBe('sans');
			expect(get(module.sidebarOpen)).toBe(true);
			expect(module.settings.getShortcut('prevSection')).toBe('h');
		});
	});

	describe('the settings seam: only choices are stored (S6.1, D02)', () => {
		const KEY = 'namsbokasafn:settings';
		/** Byte for byte what main's store saved on a first load, before any choice */
		const MAIN_FIRST_LOAD = {
			theme: 'light',
			fontSize: 'medium',
			fontFamily: 'serif',
			lineHeight: 'normal',
			lineWidth: 'medium',
			sidebarOpen: false,
			shortcutPreferences: {},
			bionicReading: false,
			glossaryHighlighting: true,
			showTermEnglish: true
		};

		const storedRaw = () => localStorage.getItem(KEY);
		const stored = () => JSON.parse(storedRaw() ?? 'null');

		/** Load a fresh store module over whatever is stored now */
		async function load(seed?: unknown) {
			if (seed !== undefined) localStorage.setItem(KEY, JSON.stringify(seed));
			vi.resetModules();
			return import('./settings');
		}

		const storageEvent = (newValue: string | null) =>
			window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue }));

		it('a fresh profile stores only the marker', async () => {
			localStorage.clear();
			await load();
			expect(storedRaw()).toBe('{"_version":1,"_born":1}');
		});

		it('a profile saved by main keeps every value and is marked born 0', async () => {
			await load(MAIN_FIRST_LOAD);
			expect(stored()).toEqual({ _version: 1, _born: 0, ...MAIN_FIRST_LOAD });
		});

		it('a profile saved by main is stored unchanged by a second load', async () => {
			await load(MAIN_FIRST_LOAD);
			const first = storedRaw();
			await load();
			expect(storedRaw()).toBe(first);
		});

		it("a stored 'wide' line width still loads as 'wide'", async () => {
			const module = await load({ lineWidth: 'wide' });
			expect(get(module.lineWidth)).toBe('wide');
		});

		it("choosing the default ('light') still stores it as a choice", () => {
			settings.setTheme('light');
			expect(stored()).toEqual({ _version: 1, _born: 1, theme: 'light' });
		});

		it.each([
			['toggleTheme', { theme: 'dark' }],
			['toggleBionicReading', { bionicReading: true }],
			['toggleGlossaryHighlighting', { glossaryHighlighting: false }],
			['toggleShowTermEnglish', { showTermEnglish: false }]
		] as const)('%s stores only its own key', (method, expected) => {
			settings[method]();
			expect(stored()).toEqual({ _version: 1, _born: 1, ...expected });
		});

		it("the sidebar's open state is kept, but is not a choice", () => {
			settings.toggleSidebar();
			expect(stored()).toEqual({ _version: 1, _born: 1, sidebarOpen: true });
			expect(settings.profile().chosen).toEqual([]);
		});

		it('a setter lists its key among the choices', () => {
			settings.setLineWidth('narrow');
			expect(settings.profile().chosen).toEqual(['lineWidth']);
		});

		it('profile() reports the marker of a fresh profile and of a pre-seam one', async () => {
			expect(settings.profile().born).toBe(1);
			const module = await load(MAIN_FIRST_LOAD);
			expect(module.settings.profile().born).toBe(0);
		});

		it("another tab's choices survive this tab's next change, and nothing else is added", () => {
			storageEvent('{"_version":1,"_born":1,"theme":"dark"}');
			settings.setFontSize('large');
			expect(stored()).toEqual({ _version: 1, _born: 1, theme: 'dark', fontSize: 'large' });
			expect(get(theme)).toBe('dark');
		});

		it("another tab's erase returns this tab to the defaults without writing", () => {
			settings.setTheme('dark');
			vi.mocked(localStorage.setItem).mockClear();
			storageEvent(null);
			expect(get(theme)).toBe('light');
			expect(localStorage.setItem).not.toHaveBeenCalled();
		});

		it("a newer build's keys, version and marker survive this build's next change", async () => {
			const module = await load({ _version: 2, _born: 2, readingMode: 'paged', theme: 'dark' });
			module.settings.setFontSize('large');
			expect(stored()).toEqual({ _version: 2, _born: 2, readingMode: 'paged', theme: 'dark', fontSize: 'large' });
		});

		it('reset() forgets the choices and keeps the marker', async () => {
			const module = await load({ _version: 1, _born: 0, theme: 'dark', readingMode: 'paged' });
			module.settings.reset();
			expect(stored()).toEqual({ _version: 1, _born: 0, readingMode: 'paged' });
		});
	});

	describe('reset', () => {
		it('should reset all settings to defaults', () => {
			settings.setTheme('dark');
			settings.setFontSize('xlarge');
			settings.setFontFamily('sans');
			settings.setSidebarOpen(true);
			settings.setShortcut('prevSection', 'h');

			settings.reset();

			expect(get(theme)).toBe('light');
			expect(get(fontSize)).toBe('medium');
			expect(get(fontFamily)).toBe('serif');
			expect(get(sidebarOpen)).toBe(false);
			expect(settings.getShortcut('prevSection')).toBe('ArrowLeft');
		});
	});
});
