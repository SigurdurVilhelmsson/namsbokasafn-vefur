<!--
  TextHighlighter - Wrapper that enables text highlighting and annotation

  Features:
  - Text selection → highlight popup
  - Persistent highlights restored on navigation
  - Text-based anchoring for stable restoration
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
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

	interface Props {
		bookSlug: string;
		chapterSlug: string;
		sectionSlug: string;
		children?: Snippet;
	}
	let { bookSlug, chapterSlug, sectionSlug, children }: Props = $props();

	let containerElement: HTMLDivElement;
	let selection: TextSelection | null = $state(null);
	// How the popup opens for this selection (S7.1): focus moves in only for a keyboard
	// selection, and a touch selection puts it below, clear of the phone's own selection menu
	let popupTakesFocus = $state(false);
	let popupSide: 'above' | 'below' = $state('above');
	let showNoteModal = $state(false);
	let showFlashcardModal = $state(false);
	let showGlossaryTooltip = $state(false);
	let glossaryTerm: GlossaryTerm | null = $state(null);
	let glossaryPosition: { x: number; y: number } = $state({ x: 0, y: 0 });
	let pendingHighlight: {
		text: string;
		range: TextRange;
		color: HighlightColor;
	} | null = $state(null);
	let pendingFlashcard: {
		text: string;
	} | null = $state(null);

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

	/*
	 * Opening the popup (reader plan S7.1, register UI-13). It used to open only from a mouseup
	 * on the article, so a touch selection (no mouse event) or a keyboard selection never reached
	 * it. Now any selection change opens it, after a short pause, and a mouse selection is still
	 * read when the button comes up, so a mouse user who pauses mid-drag sees no popup yet.
	 */
	const SELECTION_SETTLE_MS = 200;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	let lastInput: 'keyboard' | 'mouse' | 'touch' | 'pen' | null = null;
	let mouseDown = false;
	let mouseDownInside = false;

	const focusInPopup = () => !!(document.activeElement as HTMLElement | null)?.closest('[data-selection-popup]');

	/** Read the current selection into the popup's state */
	function readSelection() {
		clearTimeout(settleTimer);
		if (mouseDown) return; // a mouse drag is read when the button comes up

		const windowSelection = window.getSelection();
		if (!windowSelection || windowSelection.isCollapsed || windowSelection.rangeCount === 0) {
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

		// Viewport coordinates, since SelectionPopup and GlossaryTooltip render with
		// position: fixed (no scrollY offset)
		const rect = range.getBoundingClientRect();
		popupTakesFocus = lastInput === 'keyboard';
		popupSide = lastInput === 'touch' ? 'below' : 'above';
		selection = {
			text: selectedText,
			range,
			anchor: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
		};
	}

	function handleSelectionChange() {
		clearTimeout(settleTimer);
		settleTimer = setTimeout(readSelection, SELECTION_SETTLE_MS);
	}

	function handlePointerDown(event: PointerEvent) {
		lastInput = event.pointerType === 'mouse' || event.pointerType === 'touch' || event.pointerType === 'pen'
			? event.pointerType
			: 'mouse';
		if (event.pointerType === 'mouse') {
			mouseDown = true;
			mouseDownInside = !!containerElement?.contains(event.target as Node);
		}
	}

	function handlePointerUp(event: PointerEvent) {
		// Only a mouse is gated: a long-press hands the gesture to the browser, so a finger's
		// pointerup may never come
		if (event.pointerType !== 'mouse') return;
		mouseDown = false;
		if (mouseDownInside) readSelection();
	}

	function handlePointerCancel(event: PointerEvent) {
		if (event.pointerType === 'mouse') mouseDown = false;
	}

	function handleKeyDown() {
		lastInput = 'keyboard';
	}

	/**
	 * Shift with an arrow, Home or End in the toolbar: focus came in while the reader was still
	 * selecting from the keyboard, so extend the selection as the key would have, and leave
	 * focus in the toolbar. The change is read at once, not after the pause, so a colour pressed
	 * straight after it applies to the extended text. Selection.modify is not standard, but
	 * every engine we serve has it; without it the key does nothing.
	 */
	function handleExtendSelection(event: KeyboardEvent) {
		const windowSelection = window.getSelection() as (Selection & { modify?: (alter: string, direction: string, granularity: string) => void }) | null;
		if (!windowSelection?.modify || windowSelection.rangeCount === 0) return;
		const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'Home';
		const granularity =
			event.key === 'ArrowUp' || event.key === 'ArrowDown'
				? 'line'
				: event.key === 'Home' || event.key === 'End'
					? 'lineboundary'
					: event.ctrlKey || event.altKey
						? 'word'
						: 'character';
		windowSelection.modify('extend', backward ? 'backward' : 'forward', granularity);
		readSelection();
	}

	/**
	 * Put focus back in the article after the toolbar had it, so it never drops to <body>. The
	 * article takes focus only for this moment (a standing tabindex would make every click in
	 * the text move the Tab order back to its top).
	 */
	function focusArticle() {
		if (!containerElement) return;
		containerElement.setAttribute('tabindex', '-1');
		containerElement.addEventListener('blur', () => containerElement?.removeAttribute('tabindex'), { once: true });
		containerElement.focus({ preventScroll: true });
	}

	/** Close the popup from the toolbar: focus back to the article, the selection collapsed in place */
	function returnToArticle() {
		const range = selection?.range;
		selection = null;
		focusArticle();
		const windowSelection = window.getSelection();
		if (range && windowSelection) {
			const caret = range.cloneRange();
			caret.collapse(false);
			windowSelection.removeAllRanges();
			windowSelection.addRange(caret);
		}
	}

	onMount(() => {
		document.addEventListener('selectionchange', handleSelectionChange);
		document.addEventListener('pointerdown', handlePointerDown, true);
		document.addEventListener('pointerup', handlePointerUp, true);
		document.addEventListener('pointercancel', handlePointerCancel, true);
		document.addEventListener('keydown', handleKeyDown, true);
		// This component remounts on every section change ({#key} in the section page)
		return () => {
			clearTimeout(settleTimer);
			document.removeEventListener('selectionchange', handleSelectionChange);
			document.removeEventListener('pointerdown', handlePointerDown, true);
			document.removeEventListener('pointerup', handlePointerUp, true);
			document.removeEventListener('pointercancel', handlePointerCancel, true);
			document.removeEventListener('keydown', handleKeyDown, true);
		};
	});

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

		// Chosen from the keyboard: focus back to the article, with the caret after the highlight
		if (focusInPopup()) {
			returnToArticle();
			return;
		}
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
	 * Close popup. From inside the toolbar (Escape or 'Loka' from the keyboard), focus goes back
	 * to the article and the selection collapses in place, so a caret-browsing reader keeps their
	 * place; otherwise the selection is cleared, as before.
	 */
	function handleClosePopup({ hadFocus }: { hadFocus: boolean }) {
		if (hadFocus) {
			returnToArticle();
			return;
		}
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
				x: (selection.anchor.left + selection.anchor.right) / 2,
				y: selection.anchor.top + 40 // Position below the selection
			};
			showGlossaryTooltip = true;
		} else {
			// No match found - could show a "not found" message or navigate to glossary search
			goto(`/${bookSlug}/ordabok?search=${encodeURIComponent(selection.text)}`);
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

<div bind:this={containerElement} class="text-highlighter">
	{@render children?.()}
</div>

<!-- Selection popup -->
{#if selection}
	<SelectionPopup
		anchor={selection.anchor}
		prefer={popupSide}
		focusOnOpen={popupTakesFocus}
		onExtendSelection={handleExtendSelection}
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
		background-color: #f5e6b8;
		padding: 0.125rem 0;
	}
	.text-highlighter :global(.highlight-green) {
		background-color: #f0d0a0;
		padding: 0.125rem 0;
	}
	.text-highlighter :global(.highlight-blue) {
		background-color: #c8daf0;
		padding: 0.125rem 0;
	}
	.text-highlighter :global(.highlight-pink) {
		background-color: #f0c8c8;
		padding: 0.125rem 0;
	}

	/* Dark mode colors — slightly more saturated for dark backgrounds */
	:global(.dark) .text-highlighter :global(.highlight-yellow) {
		background-color: rgba(196, 160, 60, 0.35);
	}
	:global(.dark) .text-highlighter :global(.highlight-green) {
		background-color: rgba(192, 140, 60, 0.35);
	}
	:global(.dark) .text-highlighter :global(.highlight-blue) {
		background-color: rgba(80, 120, 200, 0.35);
	}
	:global(.dark) .text-highlighter :global(.highlight-pink) {
		background-color: rgba(200, 100, 100, 0.35);
	}
</style>
