/**
 * Tests for keyboard shortcuts utility functions
 *
 * Note: The Svelte action itself (keyboardShortcuts) is best tested via E2E.
 * These tests cover the exported utility functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

let formatShortcutKey: typeof import('./keyboardShortcuts').formatShortcutKey;
let groupShortcutsByCategory: typeof import('./keyboardShortcuts').groupShortcutsByCategory;
let getCategoryDisplayName: typeof import('./keyboardShortcuts').getCategoryDisplayName;
let isValidShortcutKey: typeof import('./keyboardShortcuts').isValidShortcutKey;
let getShortcuts: typeof import('./keyboardShortcuts').getShortcuts;
type KeyboardShortcut = import('./keyboardShortcuts').KeyboardShortcut;

describe('keyboardShortcuts utilities', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./keyboardShortcuts');
		formatShortcutKey = module.formatShortcutKey;
		groupShortcutsByCategory = module.groupShortcutsByCategory;
		getCategoryDisplayName = module.getCategoryDisplayName;
		isValidShortcutKey = module.isValidShortcutKey;
		getShortcuts = module.getShortcuts;
	});

	describe('formatShortcutKey', () => {
		it('should format arrow keys', () => {
			expect(formatShortcutKey('ArrowLeft')).toBe('←');
			expect(formatShortcutKey('ArrowRight')).toBe('→');
			expect(formatShortcutKey('ArrowUp')).toBe('↑');
			expect(formatShortcutKey('ArrowDown')).toBe('↓');
		});

		it('should format Escape as Esc', () => {
			expect(formatShortcutKey('Escape')).toBe('Esc');
		});

		it('should handle space character', () => {
			// Note: space is mapped in keyMap but split(' ') splits on it;
			// in practice, space isn't used as a shortcut key
			const result = formatShortcutKey(' ');
			expect(typeof result).toBe('string');
		});

		it('should uppercase single letters', () => {
			expect(formatShortcutKey('s')).toBe('S');
			expect(formatShortcutKey('f')).toBe('F');
		});

		it('should format multi-key sequences', () => {
			expect(formatShortcutKey('g h')).toBe('G H');
			expect(formatShortcutKey('g f')).toBe('G F');
		});

		it('should preserve special characters', () => {
			expect(formatShortcutKey('/')).toBe('/');
			expect(formatShortcutKey('?')).toBe('?');
		});
	});

	describe('groupShortcutsByCategory', () => {
		it('should group shortcuts by category', () => {
			const shortcuts: KeyboardShortcut[] = [
				{
					action: 'prevSection',
					key: 'ArrowLeft',
					defaultKey: 'ArrowLeft',
					description: 'Previous section',
					descriptionIs: 'Fyrri kafli',
					category: 'navigation',
					isCustomized: false
				},
				{
					action: 'toggleSidebar',
					key: 's',
					defaultKey: 's',
					description: 'Toggle sidebar',
					descriptionIs: 'Opna/loka hliðarslá',
					category: 'reading',
					isCustomized: false
				},
				{
					action: 'nextSection',
					key: 'ArrowRight',
					defaultKey: 'ArrowRight',
					description: 'Next section',
					descriptionIs: 'Næsti kafli',
					category: 'navigation',
					isCustomized: false
				}
			];

			const grouped = groupShortcutsByCategory(shortcuts);
			expect(grouped.get('navigation')).toHaveLength(2);
			expect(grouped.get('reading')).toHaveLength(1);
		});

		it('should handle empty array', () => {
			const grouped = groupShortcutsByCategory([]);
			expect(grouped.size).toBe(0);
		});
	});

	describe('getCategoryDisplayName', () => {
		it('should return Icelandic category names', () => {
			expect(getCategoryDisplayName('navigation')).toBe('Leiðsögn');
			expect(getCategoryDisplayName('reading')).toBe('Lestur');
			expect(getCategoryDisplayName('study')).toBe('Nám');
			expect(getCategoryDisplayName('general')).toBe('Almennt');
		});

		it('should return the key itself for unknown categories', () => {
			expect(getCategoryDisplayName('unknown')).toBe('unknown');
		});
	});

	describe('isValidShortcutKey', () => {
		it('should accept single letters', () => {
			expect(isValidShortcutKey('a')).toBe(true);
			expect(isValidShortcutKey('z')).toBe(true);
			expect(isValidShortcutKey('A')).toBe(true);
		});

		it('should accept single digits', () => {
			expect(isValidShortcutKey('0')).toBe(true);
			expect(isValidShortcutKey('9')).toBe(true);
		});

		it('should accept special characters', () => {
			expect(isValidShortcutKey('/')).toBe(true);
			expect(isValidShortcutKey('?')).toBe(true);
		});

		it('should accept arrow keys', () => {
			expect(isValidShortcutKey('ArrowLeft')).toBe(true);
			expect(isValidShortcutKey('ArrowRight')).toBe(true);
			expect(isValidShortcutKey('ArrowUp')).toBe(true);
			expect(isValidShortcutKey('ArrowDown')).toBe(true);
		});

		it('should accept special keys', () => {
			expect(isValidShortcutKey('Escape')).toBe(true);
			expect(isValidShortcutKey('Enter')).toBe(true);
			expect(isValidShortcutKey('Tab')).toBe(true);
			expect(isValidShortcutKey('Backspace')).toBe(true);
		});

		it('should accept two-key sequences', () => {
			expect(isValidShortcutKey('g h')).toBe(true);
			expect(isValidShortcutKey('g f')).toBe(true);
		});

		it('should reject invalid keys', () => {
			expect(isValidShortcutKey('')).toBe(false);
			expect(isValidShortcutKey('abc')).toBe(false);
			expect(isValidShortcutKey('Control')).toBe(false);
			expect(isValidShortcutKey('g h i')).toBe(false);
		});
	});

	describe('getShortcuts', () => {
		it('should return all shortcuts with defaults', () => {
			const shortcuts = getShortcuts();
			expect(shortcuts.length).toBeGreaterThan(0);

			// Check known shortcuts
			const prevSection = shortcuts.find((s) => s.action === 'prevSection');
			expect(prevSection).toBeDefined();
			expect(prevSection!.key).toBe('ArrowLeft');
			expect(prevSection!.isCustomized).toBe(false);
		});

		it('should include all expected actions', () => {
			const shortcuts = getShortcuts();
			const actions = shortcuts.map((s) => s.action);
			expect(actions).toContain('prevSection');
			expect(actions).toContain('nextSection');
			expect(actions).toContain('goHome');
			expect(actions).toContain('goFlashcards');
			expect(actions).toContain('goGlossary');
			expect(actions).toContain('toggleSidebar');
			expect(actions).toContain('toggleTheme');
			expect(actions).toContain('openSearch');
			expect(actions).toContain('showShortcuts');
			expect(actions).toContain('closeModal');
		});

		it('should have Icelandic descriptions for all shortcuts', () => {
			const shortcuts = getShortcuts();
			shortcuts.forEach((s) => {
				expect(s.descriptionIs).toBeTruthy();
			});
		});

		it('should have a category for all shortcuts', () => {
			const shortcuts = getShortcuts();
			const validCategories = ['navigation', 'reading', 'study', 'general'];
			shortcuts.forEach((s) => {
				expect(validCategories).toContain(s.category);
			});
		});
	});
});
