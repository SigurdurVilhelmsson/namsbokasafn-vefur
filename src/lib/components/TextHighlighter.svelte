<!--
  TextHighlighter - Wrapper that enables text highlighting and annotation

  Features:
  - Text selection → highlight popup
  - Persistent highlights restored on navigation
  - Text-based anchoring for stable restoration
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { annotationStore } from '$lib/stores/annotation';
	import { glossaryStore } from '$lib/stores/glossary';
	import SelectionPopup from './SelectionPopup.svelte';
	import NoteModal from './NoteModal.svelte';
	import FlashcardModal from './FlashcardModal.svelte';
	import GlossaryTooltip from './GlossaryTooltip.svelte';
	import type { HighlightColor, TextRange, TextSelection, Annotation } from '$lib/types/annotation';
	import { isLegacyTextRange } from '$lib/types/annotation';
	import type { GlossaryTerm } from '$lib/types/content';
	import { serializeRange, deserializeRange, upgradeToV2 } from '$lib/utils/textAnchor';

	export let bookSlug: string;
	export let chapterSlug: string;
	export let sectionSlug: string;

	let containerElement: HTMLDivElement;
	let selection: TextSelection | null = null;
	let showNoteModal = false;
	let showFlashcardModal = false;
	let showGlossaryTooltip = false;
	let glossaryTerm: GlossaryTerm | null = null;
	let glossaryPosition: { x: number; y: number } = { x: 0, y: 0 };
	let pendingHighlight: {
		text: string;
		range: TextRange;
		color: HighlightColor;
	} | null = null;
	let pendingFlashcard: {
		text: string;
	} | null = null;

	// Track restored highlights by annotation ID for click handling
	let restoredHighlights: Map<string, HTMLElement[]> = new Map();

	// Load glossary and restore highlights on mount
	onMount(async () => {
		glossaryStore.load(bookSlug);

		// Wait for content to render
		await tick();

		// Small delay to ensure markdown is fully processed
		setTimeout(() => {
			restoreHighlights();
		}, 100);
	});

	/**
	 * Restore saved highlights for this section
	 */
	function restoreHighlights() {
		if (!containerElement) return;

		const annotations = annotationStore.getAnnotationsForSection(bookSlug, chapterSlug, sectionSlug);

		for (const annotation of annotations) {
			restoreSingleHighlight(annotation);
		}
	}

	/**
	 * Restore a single highlight from stored annotation
	 */
	function restoreSingleHighlight(annotation: Annotation): boolean {
		if (!containerElement) return false;

		let range: Range | null = null;

		// Check if this is a legacy v1 range
		if (isLegacyTextRange(annotation.range)) {
			// For legacy ranges, try to find the text using selectedText
			const legacyRange: TextRange = {
				...annotation.range,
				version: 2,
				exact: annotation.selectedText,
				prefix: '',
				suffix: '',
				anchorId: null,
				offsetFromAnchor: 0
			};
			range = deserializeRange(legacyRange, containerElement);

			// If found, upgrade to v2 format
			if (range) {
				const v2Range = upgradeToV2(
					{ selectedText: annotation.selectedText, range: annotation.range },
					range,
					containerElement
				);
				annotationStore.upgradeAnnotationRange(annotation.id, v2Range);
			}
		} else {
			// v2 range - use text-based restoration
			range = deserializeRange(annotation.range, containerElement);
		}

		if (!range) {
			console.debug(`Could not restore highlight for annotation ${annotation.id}`);
			return false;
		}

		// Apply visual highlight
		const elements = applyHighlightToRange(range, annotation.color, annotation.id);
		if (elements.length > 0) {
			restoredHighlights.set(annotation.id, elements);
			return true;
		}

		return false;
	}

	/**
	 * Create a text range object from a DOM Range using text-based anchoring
	 */
	function createTextRange(range: Range): TextRange {
		if (!containerElement) {
			// Fallback if container not available (shouldn't happen)
			return {
				version: 2,
				exact: range.toString(),
				prefix: '',
				suffix: '',
				anchorId: null,
				offsetFromAnchor: 0
			};
		}
		return serializeRange(range, containerElement);
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
	 * Apply visual highlight to a range, handling cross-element boundaries.
	 * Returns array of created mark elements for tracking.
	 */
	function applyHighlightToRange(range: Range, color: HighlightColor, annotationId?: string): HTMLElement[] {
		const elements: HTMLElement[] = [];
		const colorClass = getHighlightClass(color);

		try {
			// Try simple surroundContents first (works for single-element ranges)
			const mark = document.createElement('mark');
			mark.className = `${colorClass} cursor-pointer`;
			if (annotationId) {
				mark.dataset.annotationId = annotationId;
			}
			range.surroundContents(mark);
			elements.push(mark);
		} catch {
			// Range crosses element boundaries - use more complex approach
			const textNodes = getTextNodesInRange(range);

			for (const { node, startOffset, endOffset } of textNodes) {
				// Create a range for just this text node segment
				const nodeRange = document.createRange();
				nodeRange.setStart(node, startOffset);
				nodeRange.setEnd(node, endOffset);

				try {
					const mark = document.createElement('mark');
					mark.className = `${colorClass} cursor-pointer`;
					if (annotationId) {
						mark.dataset.annotationId = annotationId;
					}
					nodeRange.surroundContents(mark);
					elements.push(mark);
				} catch (e) {
					console.debug('Could not wrap text segment:', e);
				}
			}
		}

		return elements;
	}

	/**
	 * Get all text nodes within a range with their offsets.
	 * Used for cross-element highlight wrapping.
	 */
	function getTextNodesInRange(range: Range): Array<{ node: Text; startOffset: number; endOffset: number }> {
		const result: Array<{ node: Text; startOffset: number; endOffset: number }> = [];
		const walker = document.createTreeWalker(
			range.commonAncestorContainer,
			NodeFilter.SHOW_TEXT
		);

		let foundStart = false;
		let node: Text | null;

		while ((node = walker.nextNode() as Text | null)) {
			// Check if we've reached the start
			if (!foundStart) {
				if (node === range.startContainer || node.contains?.(range.startContainer as Node)) {
					foundStart = true;
				} else if (range.startContainer.contains(node)) {
					foundStart = true;
				} else {
					continue;
				}
			}

			// Calculate the offsets for this node
			let startOffset = 0;
			let endOffset = node.length;

			if (node === range.startContainer) {
				startOffset = range.startOffset;
			}
			if (node === range.endContainer) {
				endOffset = range.endOffset;
			}

			// Only add if there's actual content to highlight
			if (endOffset > startOffset && node.textContent?.slice(startOffset, endOffset).trim()) {
				result.push({ node, startOffset, endOffset });
			}

			// Check if we've passed the end
			if (node === range.endContainer) {
				break;
			}
		}

		return result;
	}

	/**
	 * Simple apply highlight (for new selections)
	 */
	function applyHighlight(range: Range, color: HighlightColor): void {
		applyHighlightToRange(range, color);
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
	 */
	function handleCreateFlashcard() {
		if (!selection) return;

		pendingFlashcard = {
			text: selection.text
		};

		showFlashcardModal = true;
	}

	/**
	 * Handle flashcard save
	 */
	function handleSaveFlashcard() {
		pendingFlashcard = null;
		showFlashcardModal = false;
		window.getSelection()?.removeAllRanges();
		selection = null;
	}

	/**
	 * Close flashcard modal
	 */
	function handleCloseFlashcardModal() {
		showFlashcardModal = false;
		pendingFlashcard = null;
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

<!-- Flashcard modal -->
{#if showFlashcardModal && pendingFlashcard}
	<FlashcardModal
		selectedText={pendingFlashcard.text}
		source="{bookSlug} > {chapterSlug} > {sectionSlug}"
		onSave={handleSaveFlashcard}
		onClose={handleCloseFlashcardModal}
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
