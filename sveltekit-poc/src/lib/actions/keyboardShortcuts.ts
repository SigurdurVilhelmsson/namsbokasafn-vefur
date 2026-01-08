/**
 * Keyboard Shortcuts Svelte Action
 * Handles multi-key sequences (like "g h") and single-key shortcuts
 */

import { goto } from '$app/navigation';
import { settings, DEFAULT_SHORTCUTS, type ShortcutAction } from '$lib/stores/settings';
import { get } from 'svelte/store';

// =============================================================================
// TYPES
// =============================================================================

export interface KeyboardShortcut {
	action: ShortcutAction;
	key: string;
	defaultKey: string;
	description: string;
	descriptionIs: string;
	category: 'navigation' | 'reading' | 'study' | 'general';
	isCustomized: boolean;
}

export interface KeyboardShortcutsOptions {
	enabled?: boolean;
	bookSlug?: string;
	onToggleFocusMode?: () => void;
	onOpenSearch?: () => void;
	onOpenShortcuts?: () => void;
	onCloseModal?: () => void;
}

// =============================================================================
// SHORTCUT METADATA
// =============================================================================

const SHORTCUT_METADATA: Record<
	ShortcutAction,
	{
		description: string;
		descriptionIs: string;
		category: 'navigation' | 'reading' | 'study' | 'general';
	}
> = {
	prevSection: {
		description: 'Previous section',
		descriptionIs: 'Fyrri kafli',
		category: 'navigation'
	},
	nextSection: {
		description: 'Next section',
		descriptionIs: 'Næsti kafli',
		category: 'navigation'
	},
	goHome: {
		description: 'Go home (book overview)',
		descriptionIs: 'Fara á forsíðu bókar',
		category: 'navigation'
	},
	goFlashcards: {
		description: 'Go to flashcards',
		descriptionIs: 'Fara í minniskort',
		category: 'navigation'
	},
	goGlossary: {
		description: 'Go to glossary',
		descriptionIs: 'Fara í orðabók',
		category: 'navigation'
	},
	toggleSidebar: {
		description: 'Toggle sidebar',
		descriptionIs: 'Opna/loka hliðarslá',
		category: 'reading'
	},
	toggleFocusMode: {
		description: 'Toggle focus mode',
		descriptionIs: 'Einbeitingarhamur',
		category: 'reading'
	},
	toggleTheme: {
		description: 'Toggle theme (light/dark)',
		descriptionIs: 'Skipta um þema',
		category: 'reading'
	},
	openSearch: {
		description: 'Open search',
		descriptionIs: 'Opna leit',
		category: 'general'
	},
	showShortcuts: {
		description: 'Show keyboard shortcuts',
		descriptionIs: 'Sýna flýtilykla',
		category: 'general'
	},
	closeModal: {
		description: 'Close modal/menu',
		descriptionIs: 'Loka glugga',
		category: 'general'
	}
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if user is typing in an input field
 */
function isTyping(): boolean {
	const activeElement = document.activeElement;
	if (!activeElement) return false;

	const tagName = activeElement.tagName.toLowerCase();
	const isEditable = activeElement.getAttribute('contenteditable') === 'true';

	return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable;
}

/**
 * Navigate to previous/next section by clicking nav buttons
 */
function navigatePrevNext(direction: 'prev' | 'next'): void {
	const selector =
		direction === 'prev'
			? 'a[aria-label="Fyrri kafli"], button[aria-label="Fyrri kafli"]'
			: 'a[aria-label="Næsti kafli"], button[aria-label="Næsti kafli"]';

	const button = document.querySelector(selector) as HTMLElement;
	if (button && !button.hasAttribute('disabled')) {
		button.click();
	}
}

/**
 * Format a shortcut key for display
 */
export function formatShortcutKey(key: string): string {
	const keyMap: Record<string, string> = {
		ArrowLeft: '←',
		ArrowRight: '→',
		ArrowUp: '↑',
		ArrowDown: '↓',
		Escape: 'Esc',
		' ': 'Space'
	};

	return key
		.split(' ')
		.map((k) => keyMap[k] || k.toUpperCase())
		.join(' ');
}

/**
 * Group shortcuts by category
 */
export function groupShortcutsByCategory(
	shortcuts: KeyboardShortcut[]
): Map<string, KeyboardShortcut[]> {
	const grouped = new Map<string, KeyboardShortcut[]>();

	shortcuts.forEach((shortcut) => {
		const existing = grouped.get(shortcut.category) || [];
		existing.push(shortcut);
		grouped.set(shortcut.category, existing);
	});

	return grouped;
}

/**
 * Get category display name in Icelandic
 */
export function getCategoryDisplayName(category: string): string {
	const names: Record<string, string> = {
		navigation: 'Leiðsögn',
		reading: 'Lestur',
		study: 'Nám',
		general: 'Almennt'
	};
	return names[category] || category;
}

/**
 * Check if a key string is valid for shortcuts
 */
export function isValidShortcutKey(key: string): boolean {
	const validPatterns = [
		/^[a-zA-Z0-9/?=[\]\\;',./`-]$/,
		/^Arrow(Left|Right|Up|Down)$/,
		/^(Escape|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown)$/,
		/^[a-zA-Z] [a-zA-Z]$/
	];

	return validPatterns.some((pattern) => pattern.test(key));
}

/**
 * Get all shortcuts with current bindings
 */
export function getShortcuts(): KeyboardShortcut[] {
	const actions: ShortcutAction[] = [
		'prevSection',
		'nextSection',
		'goHome',
		'goFlashcards',
		'goGlossary',
		'toggleSidebar',
		'toggleFocusMode',
		'toggleTheme',
		'openSearch',
		'showShortcuts',
		'closeModal'
	];

	return actions.map((action) => {
		const currentKey = settings.getShortcut(action);
		const defaultKey = DEFAULT_SHORTCUTS[action];
		const metadata = SHORTCUT_METADATA[action];

		return {
			action,
			key: currentKey,
			defaultKey,
			description: metadata.description,
			descriptionIs: metadata.descriptionIs,
			category: metadata.category,
			isCustomized: currentKey !== defaultKey
		};
	});
}

// =============================================================================
// SVELTE ACTION
// =============================================================================

/**
 * Svelte action for keyboard shortcuts
 * Usage: <div use:keyboardShortcuts={{ bookSlug, onOpenSearch, ... }}>
 */
export function keyboardShortcuts(node: HTMLElement, options: KeyboardShortcutsOptions = {}) {
	let keySequence: string[] = [];
	let sequenceTimeout: ReturnType<typeof setTimeout> | null = null;
	let currentOptions = options;

	function getHandlers(): Record<ShortcutAction, () => void> {
		const { bookSlug, onToggleFocusMode, onOpenSearch, onOpenShortcuts, onCloseModal } =
			currentOptions;

		return {
			prevSection: () => navigatePrevNext('prev'),
			nextSection: () => navigatePrevNext('next'),
			goHome: () => {
				if (bookSlug) goto(`/${bookSlug}`);
			},
			goFlashcards: () => {
				if (bookSlug) goto(`/${bookSlug}/minniskort`);
			},
			goGlossary: () => {
				if (bookSlug) goto(`/${bookSlug}/ordabok`);
			},
			toggleSidebar: () => settings.toggleSidebar(),
			toggleFocusMode: () => onToggleFocusMode?.(),
			toggleTheme: () => settings.toggleTheme(),
			openSearch: () => onOpenSearch?.(),
			showShortcuts: () => onOpenShortcuts?.(),
			closeModal: () => {
				onCloseModal?.();
				// Also try to close any open modals by clicking overlay
				const overlay = document.querySelector('[data-modal-overlay="true"]');
				if (overlay instanceof HTMLElement) {
					overlay.click();
				}
			}
		};
	}

	function handleKeyDown(event: KeyboardEvent): void {
		// Skip if disabled
		if (currentOptions.enabled === false) return;

		// Don't handle shortcuts when typing
		if (isTyping()) return;

		// Don't handle if modifier keys are pressed (except Shift for ?)
		if (event.ctrlKey || event.altKey || event.metaKey) return;

		const key = event.key;

		// Handle Shift+/ for ?
		const effectiveKey = event.shiftKey && key === '/' ? '?' : key;

		// Get current shortcuts and handlers
		const shortcuts = getShortcuts();
		const handlers = getHandlers();

		// Update key sequence
		const newSequence = [...keySequence, effectiveKey];

		// Check for multi-key shortcuts
		const sequenceStr = newSequence.join(' ');
		const matchingShortcut = shortcuts.find((s) => s.key === sequenceStr);

		if (matchingShortcut) {
			event.preventDefault();
			handlers[matchingShortcut.action]();
			keySequence = [];
			if (sequenceTimeout) clearTimeout(sequenceTimeout);
			return;
		}

		// Check for single-key shortcuts (but not if we're in a sequence)
		const singleKeyShortcut = shortcuts.find((s) => s.key === effectiveKey);
		if (singleKeyShortcut && !newSequence.some((k) => k === 'g')) {
			event.preventDefault();
			handlers[singleKeyShortcut.action]();
			keySequence = [];
			if (sequenceTimeout) clearTimeout(sequenceTimeout);
			return;
		}

		// If this could be the start of a sequence, track it
		if (effectiveKey === 'g') {
			keySequence = [effectiveKey];
			// Clear after timeout
			if (sequenceTimeout) clearTimeout(sequenceTimeout);
			sequenceTimeout = setTimeout(() => {
				keySequence = [];
			}, 1000);
			return;
		}

		// Clear sequence if no match
		keySequence = [];
	}

	// Add event listener
	window.addEventListener('keydown', handleKeyDown);

	return {
		update(newOptions: KeyboardShortcutsOptions) {
			currentOptions = newOptions;
		},
		destroy() {
			window.removeEventListener('keydown', handleKeyDown);
			if (sequenceTimeout) clearTimeout(sequenceTimeout);
		}
	};
}
