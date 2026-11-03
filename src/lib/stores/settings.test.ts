/**
 * Tests for settings store
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SettingsState } from './settings';

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

		it("an unreadable value from another tab is ignored, so this tab's next change keeps every choice", () => {
			settings.setTheme('dark');
			vi.mocked(localStorage.setItem).mockClear();
			storageEvent('{not json');
			expect(localStorage.setItem).not.toHaveBeenCalled();
			settings.setFontSize('large');
			expect(stored()).toEqual({ _version: 1, _born: 1, theme: 'dark', fontSize: 'large' });
		});

		it("another tab's erase returns this tab to the defaults without writing", () => {
			settings.setTheme('dark');
			vi.mocked(localStorage.setItem).mockClear();
			storageEvent(null);
			expect(get(theme)).toBe('light');
			expect(localStorage.setItem).not.toHaveBeenCalled();
		});

		it("a newer build's keys, version and marker survive this build's next change", async () => {
			const module = await load({ _version: 2, _born: 2, laterSetting: 'x', theme: 'dark' });
			module.settings.setFontSize('large');
			expect(stored()).toEqual({ _version: 2, _born: 2, laterSetting: 'x', theme: 'dark', fontSize: 'large' });
		});

		it('reset() forgets the choices and keeps the marker', async () => {
			const module = await load({ _version: 1, _born: 0, theme: 'dark', readingMode: 'paged', laterSetting: 'x' });
			module.settings.reset();
			expect(stored()).toEqual({ _version: 1, _born: 0, laterSetting: 'x' });
		});

		describe('readingMode (S8.2, PED-01, D06): stored only when picked', () => {
			it('a fresh profile and a profile saved by main have no mode and store none', async () => {
				let module = await load();
				expect([get(module.settings).readingMode, module.settings.profile().chosen]).toEqual([null, []]);
				expect(storedRaw()).toBe('{"_version":1,"_born":1}');
				module = await load(MAIN_FIRST_LOAD);
				expect(get(module.settings).readingMode).toBeNull();
				expect(module.settings.profile().chosen).not.toContain('readingMode');
				expect(stored()).not.toHaveProperty('readingMode');
			});

			it.each(['paged', 'scrolled'])('a stored %s is read and counted as chosen', async (mode) => {
				const module = await load({ _version: 1, _born: 1, readingMode: mode });
				expect(get(module.readingMode)).toBe(mode);
				expect(module.settings.profile().chosen).toEqual(['readingMode']);
			});

			it("a link's value ('sidur') is not a stored mode, and is carried through as stored", async () => {
				const module = await load({ _version: 1, _born: 1, readingMode: 'sidur' });
				expect(get(module.readingMode)).toBeNull();
				module.settings.setTheme('dark');
				expect(stored()).toEqual({ _version: 1, _born: 1, readingMode: 'sidur', theme: 'dark' });
			});

			it('setReadingMode stores only its own key and lists it as chosen', async () => {
				const module = await load();
				module.settings.setReadingMode('scrolled');
				expect(stored()).toEqual({ _version: 1, _born: 1, readingMode: 'scrolled' });
				expect(module.settings.profile().chosen).toEqual(['readingMode']);
			});

			it("another setter leaves a stored mode as it is", async () => {
				const module = await load({ _version: 1, _born: 1, readingMode: 'paged' });
				module.settings.toggleTheme();
				expect(stored()).toEqual({ _version: 1, _born: 1, readingMode: 'paged', theme: 'dark' });
			});
		});
	});

	describe('every default and validator is pinned (S6.2, register CODE-20)', () => {
		const KEY = 'namsbokasafn:settings';

		async function load(seed?: unknown) {
			if (seed !== undefined) localStorage.setItem(KEY, JSON.stringify(seed));
			vi.resetModules();
			return import('./settings');
		}

		// No setting on main is an open call (those are the paged reader's), so each default is
		// pinned literally: changing one must change this table on purpose. A default that becomes
		// an open call is compared with defaultSettings instead, never with a literal.
		it('pins every default', async () => {
			const { defaultSettings } = await load();
			expect(defaultSettings).toEqual({
				theme: 'light',
				fontSize: 'medium',
				fontFamily: 'serif',
				lineHeight: 'normal',
				lineWidth: 'medium',
				// "Not chosen", not call 3's answer: the unchosen mode is readerPolicy's (D06)
				readingMode: null,
				sidebarOpen: false,
				shortcutPreferences: {},
				bionicReading: false,
				glossaryHighlighting: true,
				showTermEnglish: true
			});
		});

		it('pins every default shortcut', async () => {
			const module = await load();
			expect(module.DEFAULT_SHORTCUTS).toEqual({
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
			});
		});

		it('a fresh profile has every default in effect', async () => {
			const module = await load();
			expect(get(module.settings)).toEqual(module.defaultSettings);
		});

		/** Every value each validator must accept */
		const VALID: { [K in keyof SettingsState]: SettingsState[K][] } = {
			theme: ['light', 'dark'],
			fontSize: ['small', 'medium', 'large', 'xlarge'],
			fontFamily: ['serif', 'sans', 'opendyslexic'],
			lineHeight: ['normal', 'relaxed', 'loose'],
			lineWidth: ['narrow', 'medium', 'wide'],
			readingMode: ['paged', 'scrolled'],
			sidebarOpen: [true, false],
			shortcutPreferences: [{}, { prevSection: 'h' }],
			bionicReading: [true, false],
			glossaryHighlighting: [true, false],
			showTermEnglish: [true, false]
		};

		/** Values each validator must refuse: wrong type, wrong case, another setting's value, a later release's value */
		const INVALID: Record<keyof SettingsState, unknown[]> = {
			theme: ['system', 'Dark', 1, null],
			fontSize: ['narrow', 'huge', 16, null],
			fontFamily: ['atkinson', 'Serif', null],
			lineHeight: ['medium', 'tight', 1.5, null],
			lineWidth: ['small', 'full', 52, null],
			readingMode: ['sidur', 'skrun', 'auto', 'Paged', 1, null],
			sidebarOpen: ['true', 1, null],
			shortcutPreferences: [[], 'h', null],
			bionicReading: ['true', 1, null],
			glossaryHighlighting: ['false', 0, null],
			showTermEnglish: ['false', 0, null]
		};

		const cases = (table: Record<string, readonly unknown[]>) =>
			Object.entries(table).flatMap(([key, values]) =>
				values.map((value) => [key as keyof SettingsState, value] as const)
			);

		it.each(cases(VALID))('a stored %s of %j survives the load', async (key, value) => {
			const module = await load({ _version: 1, _born: 1, [key]: value });
			expect(get(module.settings)[key]).toEqual(value);
		});

		it.each(cases(INVALID))('a stored %s of %j loads as the default', async (key, value) => {
			const module = await load({ _version: 1, _born: 1, [key]: value });
			expect(get(module.settings)[key]).toEqual(module.defaultSettings[key]);
		});

		it.each(cases(INVALID))('a stored %s of %j is not counted as a choice', async (key, value) => {
			const module = await load({ _version: 1, _born: 1, [key]: value });
			expect(module.settings.profile().chosen).not.toContain(key);
		});

		it("an invalid stored value is kept as stored through this build's next change", async () => {
			const module = await load({ fontSize: 'huge' });
			module.settings.setTheme('dark');
			expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
				_version: 1,
				_born: 0,
				fontSize: 'huge',
				theme: 'dark'
			});
		});
	});

	describe('the pre-paint script in app.html agrees with the store (S6.2, register UI-22)', () => {
		const KEY = 'namsbokasafn:settings';
		const html = document.documentElement;

		/** The first inline script before %sveltekit.head%, as app.html ships it */
		const PREPAINT = (() => {
			const file = readFileSync(join(process.cwd(), 'src', 'app.html'), 'utf8');
			const head = file.slice(0, file.indexOf('%sveltekit.head%'));
			return head.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
		})();

		const clearHtml = () => {
			html.classList.remove('dark');
			html.removeAttribute('data-line-width');
		};

		/** Run the script on a clean <html> over the given stored value, and report what it set */
		function prepaint(raw: string | null) {
			clearHtml();
			localStorage.clear();
			if (raw !== null) localStorage.setItem(KEY, raw);
			new Function(PREPAINT)();
			return { dark: html.classList.contains('dark'), lineWidth: html.getAttribute('data-line-width') };
		}

		/** What the store makes of the same stored value: dark or not, and a valid stored width */
		async function store(raw: string | null) {
			clearHtml();
			localStorage.clear();
			if (raw !== null) localStorage.setItem(KEY, raw);
			vi.resetModules();
			const module = await import('./settings');
			const state = get(module.settings);
			return {
				dark: state.theme === 'dark',
				lineWidth: module.settings.profile().chosen.includes('lineWidth') ? state.lineWidth : null
			};
		}

		afterEach(() => {
			clearHtml();
			history.replaceState(null, '', '/');
		});

		it('app.html has an inline script before %sveltekit.head%', () => {
			expect(PREPAINT.trim()).not.toBe('');
		});

		const PRE_SEAM_DARK = {
			theme: 'dark',
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

		it.each([
			['nothing stored', null],
			['a fresh profile', '{"_version":1,"_born":1}'],
			["a chosen 'dark'", '{"_version":1,"_born":1,"theme":"dark"}'],
			["a chosen 'light'", '{"_version":1,"_born":1,"theme":"light"}'],
			["a pre-seam profile on 'dark'", JSON.stringify(PRE_SEAM_DARK)],
			["a newer build's profile on 'dark'", '{"_version":2,"_born":2,"theme":"dark","readingMode":"paged"}'],
			// 'system' is not a theme yet; S12's P1.4 port extends the script to it (plan line 1252)
			["a stored 'system'", '{"_version":1,"_born":1,"theme":"system"}'],
			["a stored 'Dark'", '{"_version":1,"_born":1,"theme":"Dark"}'],
			["a stored 'narrow'", '{"_version":1,"_born":1,"lineWidth":"narrow"}'],
			["a stored 'medium'", '{"_version":1,"_born":1,"lineWidth":"medium"}'],
			["a stored 'wide'", '{"_version":1,"_born":1,"lineWidth":"wide"}'],
			["a stored 'small' width", '{"_version":1,"_born":1,"lineWidth":"small"}'],
			['a stored width of 52', '{"_version":1,"_born":1,"lineWidth":52}'],
			["'dark' and 'narrow' together", '{"_version":1,"_born":1,"theme":"dark","lineWidth":"narrow"}'],
			['a value that does not parse', '{not json'],
			['an array', '["dark"]'],
			['a string', '"dark"'],
			['null', 'null']
		])('%s: the script sets what the store will', async (_label, raw) => {
			const before = prepaint(raw);
			expect(before).toEqual(await store(raw));
		});

		it("a stored 'dark' turns the page dark before the app runs", () => {
			expect(prepaint('{"_version":1,"_born":1,"theme":"dark"}').dark).toBe(true);
		});

		it("a stored 'narrow' sets data-line-width before the app runs", () => {
			expect(prepaint('{"_version":1,"_born":1,"lineWidth":"narrow"}').lineWidth).toBe('narrow');
		});

		it('a localStorage that throws leaves the page light and raises nothing', () => {
			clearHtml();
			vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
				throw new DOMException('denied', 'SecurityError');
			});
			expect(() => new Function(PREPAINT)()).not.toThrow();
			expect(html.classList.contains('dark')).toBe(false);
		});

		it("the print pages stay light: the script leaves /print/ alone, as the print layout's light theme expects", () => {
			history.replaceState(null, '', '/print/efnafraedi-2e/bok/');
			expect(prepaint('{"_version":1,"_born":1,"theme":"dark","lineWidth":"narrow"}')).toEqual({
				dark: false,
				lineWidth: null
			});
		});

		it("the store keeps data-line-width in step with a reader's change, so a stored width never sticks", async () => {
			prepaint('{"_version":1,"_born":1,"lineWidth":"narrow"}');
			vi.resetModules();
			const module = await import('./settings');
			module.settings.setLineWidth('wide');
			expect(html.getAttribute('data-line-width')).toBe('wide');
		});

		it('the store sets data-line-width to the width in effect on a fresh profile', async () => {
			clearHtml();
			vi.resetModules();
			const module = await import('./settings');
			expect(html.getAttribute('data-line-width')).toBe(get(module.settings).lineWidth);
		});

		it("another tab's erase returns data-line-width to the default", async () => {
			prepaint('{"_version":1,"_born":1,"lineWidth":"narrow"}');
			vi.resetModules();
			const module = await import('./settings');
			window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));
			expect(html.getAttribute('data-line-width')).toBe(module.defaultSettings.lineWidth);
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
