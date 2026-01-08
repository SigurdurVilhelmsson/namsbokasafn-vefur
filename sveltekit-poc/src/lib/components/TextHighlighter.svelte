<!--
  TextHighlighter - Wrapper that enables text highlighting and annotation
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { annotationStore } from '$lib/stores/annotation';
	import { glossaryStore } from '$lib/stores/glossary';
	import SelectionPopup from './SelectionPopup.svelte';
	import NoteModal from './NoteModal.svelte';
	import GlossaryTooltip from './GlossaryTooltip.svelte';
	import type { HighlightColor, TextRange, TextSelection } from '$lib/types/annotation';
	import type { GlossaryTerm } from '$lib/types/content';

	export let bookSlug: string;
	export let chapterSlug: string;
	export let sectionSlug: string;

	let containerElement: HTMLDivElement;
	let selection: TextSelection | null = null;
	let showNoteModal = false;
	let showGlossaryTooltip = false;
	let glossaryTerm: GlossaryTerm | null = null;
	let glossaryPosition: { x: number; y: number } = { x: 0, y: 0 };
	let pendingHighlight: {
		text: string;
		range: TextRange;
		color: HighlightColor;
	} | null = null;

	// Load glossary on mount
	onMount(() => {
		glossaryStore.load(bookSlug);
	});

	/**
	 * Get a CSS selector path to a DOM node for serialization
	 */
	function getNodePath(node: Node): string {
		const parts: string[] = [];
		let current: Node | null = node;

		while (current && current !== document.body) {
			if (current.nodeType === Node.ELEMENT_NODE) {
				const element = current as Element;
				let selector = element.tagName.toLowerCase();

				if (element.id) {
					selector += `#${element.id}`;
					parts.unshift(selector);
					break; // ID is unique, stop here
				}

				// Add class names (filter out highlight classes)
				if (element.className && typeof element.className === 'string') {
					const classes = element.className
						.split(' ')
						.filter((c) => c && !c.startsWith('highlight-'))
						.slice(0, 2)
						.join('.');
					if (classes) {
						selector += `.${classes}`;
					}
				}

				// Add position among siblings
				const siblings = element.parentElement?.children;
				if (siblings && siblings.length > 1) {
					const index = Array.from(siblings).indexOf(element);
					selector += `:nth-child(${index + 1})`;
				}

				parts.unshift(selector);
			}
			current = current.parentNode;
		}

		return parts.join(' > ');
	}

	/**
	 * Create a text range object from a DOM Range
	 */
	function createTextRange(range: Range): TextRange {
		return {
			startOffset: range.startOffset,
			endOffset: range.endOffset,
			startContainerPath: getNodePath(range.startContainer),
			endContainerPath: getNodePath(range.endContainer)
		};
	}

	/**
	 * Get highlight color class
	 */
	function getHighlightClass(color: HighlightColor): string {
		const classes: Record<HighlightColor, string> = {
			yellow: 'highlight-yellow',
			green: 'highlight-green',
			blue: 'highlight-blue',
			pink: 'highlight-pink'
		};
		return classes[color];
	}

	/**
	 * Apply visual highlight to a range
	 */
	function applyHighlight(range: Range, color: HighlightColor): void {
		try {
			const mark = document.createElement('mark');
			mark.className = `${getHighlightClass(color)} cursor-pointer`;
			range.surroundContents(mark);
		} catch {
			// If surroundContents fails (crosses element boundaries),
			// we can't apply the visual highlight, but the annotation is still saved
			console.warn('Could not apply visual highlight across element boundaries');
		}
	}

	/**
	 * Handle text selection
	 */
	function handleMouseUp() {
		const windowSelection = window.getSelection();
		if (!windowSelection || windowSelection.isCollapsed) {
			selection = null;
			return;
		}

		const selectedText = windowSelection.toString().trim();
		if (!selectedText || selectedText.length < 3) {
			selection = null;
			return;
		}

		// Check if selection is within our container
		const range = windowSelection.getRangeAt(0);
		if (!containerElement?.contains(range.commonAncestorContainer)) {
			selection = null;
			return;
		}

		// Get position for popup
		const rect = range.getBoundingClientRect();
		const position = {
			x: rect.left + rect.width / 2,
			y: rect.top + window.scrollY
		};

		selection = {
			text: selectedText,
			range,
			position
		};
	}

	/**
	 * Handle highlight action
	 */
	function handleHighlight(color: HighlightColor) {
		if (!selection) return;

		const textRange = createTextRange(selection.range);

		// Add annotation to store
		annotationStore.addAnnotation(
			bookSlug,
			chapterSlug,
			sectionSlug,
			selection.text,
			textRange,
			color
		);

		// Apply visual highlight
		applyHighlight(selection.range, color);

		// Clear selection
		window.getSelection()?.removeAllRanges();
		selection = null;
	}

	/**
	 * Handle add note action
	 */
	function handleAddNote() {
		if (!selection) return;

		pendingHighlight = {
			text: selection.text,
			range: createTextRange(selection.range),
			color: 'yellow' // Default color for notes
		};

		showNoteModal = true;
	}

	/**
	 * Handle note save
	 */
	function handleSaveNote(note: string, color: HighlightColor) {
		if (!pendingHighlight) return;

		// Add annotation with note
		annotationStore.addAnnotation(
			bookSlug,
			chapterSlug,
			sectionSlug,
			pendingHighlight.text,
			pendingHighlight.range,
			color,
			note
		);

		// Clear state
		pendingHighlight = null;
		showNoteModal = false;
		window.getSelection()?.removeAllRanges();
		selection = null;
	}

	/**
	 * Close popup
	 */
	function handleClosePopup() {
		selection = null;
		window.getSelection()?.removeAllRanges();
	}

	/**
	 * Close note modal
	 */
	function handleCloseNoteModal() {
		showNoteModal = false;
		pendingHighlight = null;
		selection = null;
		window.getSelection()?.removeAllRanges();
	}

	/**
	 * Handle create flashcard action
	 * For now, this just creates a highlight - flashcard modal can be added later
	 */
	function handleCreateFlashcard() {
		if (!selection) return;

		// For now, just close the popup
		// TODO: Integrate with flashcard modal when implemented
		selection = null;
		window.getSelection()?.removeAllRanges();
	}

	/**
	 * Handle glossary lookup action
	 */
	function handleGlossaryLookup() {
		if (!selection) return;

		const term = glossaryStore.lookup(selection.text);
		if (term) {
			glossaryTerm = term;
			glossaryPosition = {
				x: selection.position.x,
				y: selection.position.y + 40 // Position below the selection
			};
			showGlossaryTooltip = true;
		} else {
			// No match found - could show a "not found" message or navigate to glossary search
			window.location.href = `/${bookSlug}/ordabok?search=${encodeURIComponent(selection.text)}`;
		}

		// Clear selection popup but keep text selected for context
		selection = null;
	}

	/**
	 * Close glossary tooltip
	 */
	function handleCloseGlossaryTooltip() {
		showGlossaryTooltip = false;
		glossaryTerm = null;
		window.getSelection()?.removeAllRanges();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={containerElement} on:mouseup={handleMouseUp} class="text-highlighter">
	<slot />
</div>

<!-- Selection popup -->
{#if selection}
	<SelectionPopup
		position={selection.position}
		onHighlight={handleHighlight}
		onAddNote={handleAddNote}
		onCreateFlashcard={handleCreateFlashcard}
		onGlossaryLookup={handleGlossaryLookup}
		onClose={handleClosePopup}
	/>
{/if}

<!-- Glossary tooltip -->
{#if showGlossaryTooltip && glossaryTerm}
	<GlossaryTooltip
		term={glossaryTerm}
		position={glossaryPosition}
		{bookSlug}
		onClose={handleCloseGlossaryTooltip}
	/>
{/if}

<!-- Note modal -->
{#if showNoteModal && pendingHighlight}
	<NoteModal
		selectedText={pendingHighlight.text}
		onSave={handleSaveNote}
		onClose={handleCloseNoteModal}
	/>
{/if}

<style>
	.text-highlighter :global(.highlight-yellow) {
		background-color: rgb(254 249 195);
		padding: 0.125rem 0;
	}
	.text-highlighter :global(.highlight-green) {
		background-color: rgb(187 247 208);
		padding: 0.125rem 0;
	}
	.text-highlighter :global(.highlight-blue) {
		background-color: rgb(191 219 254);
		padding: 0.125rem 0;
	}
	.text-highlighter :global(.highlight-pink) {
		background-color: rgb(251 207 232);
		padding: 0.125rem 0;
	}

	/* Dark mode colors */
	:global(.dark) .text-highlighter :global(.highlight-yellow) {
		background-color: rgb(133 77 14 / 0.4);
	}
	:global(.dark) .text-highlighter :global(.highlight-green) {
		background-color: rgb(22 101 52 / 0.4);
	}
	:global(.dark) .text-highlighter :global(.highlight-blue) {
		background-color: rgb(30 64 175 / 0.4);
	}
	:global(.dark) .text-highlighter :global(.highlight-pink) {
		background-color: rgb(157 23 77 / 0.4);
	}
</style>
