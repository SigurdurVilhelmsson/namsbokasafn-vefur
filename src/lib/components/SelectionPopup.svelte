<!--
  SelectionPopup - the toolbar of actions for a text selection (highlight, note, card, glossary)

  A toolbar with one Tab stop (reader plan S7.1, register UI-13): the arrow keys, Home and End
  move along it, and Escape closes it. Focus moves in only when the owner asks (a selection made
  from the keyboard), never while a finger drags the selection handles. Its place is clamped to
  the screen on both sides (popupPosition.ts, UI-28). Pressing a button keeps the selection, so
  a click or tap reaches the button before anything reads the selection as changed.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { scale } from 'svelte/transition';
	import type { HighlightColor, SelectionAnchor } from '$lib/types/annotation';
	import { placePopup, type PopupSide } from '$lib/utils/popupPosition';

	interface Props {
		/** The selection's box, in viewport pixels */
		anchor: SelectionAnchor;
		/** The side of the selection to try first (below for touch, clear of the phone's own menu) */
		prefer?: PopupSide;
		/** Move focus to the first button (a selection made from the keyboard) */
		focusOnOpen?: boolean;
		onHighlight: (color: HighlightColor) => void;
		onAddNote: () => void;
		onCreateFlashcard: () => void;
		onGlossaryLookup?: () => void;
		/** hadFocus: focus was inside the toolbar, so the owner should put it back in the article */
		onClose: (info: { hadFocus: boolean }) => void;
		/** Shift with an arrow, Home or End while in the toolbar: the reader is still selecting */
		onExtendSelection?: (event: KeyboardEvent) => void;
	}

	let {
		anchor,
		prefer = 'above',
		focusOnOpen = false,
		onHighlight,
		onAddNote,
		onCreateFlashcard,
		onGlossaryLookup,
		onClose,
		onExtendSelection
	}: Props = $props();

	// The name says the colour in the dative, as 'með' requires
	const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; dative: string; hex: string }[] = [
		{ color: 'yellow', label: 'Gulur', dative: 'gulum', hex: '#f5e6b8' },
		{ color: 'green', label: 'Gulbrúnn', dative: 'gulbrúnum', hex: '#f0d0a0' },
		{ color: 'blue', label: 'Blár', dative: 'bláum', hex: '#c8daf0' },
		{ color: 'pink', label: 'Rósrauður', dative: 'rósrauðum', hex: '#f0c8c8' }
	];
	// Toolbar order: the four colours, note, card, glossary (when offered), close
	const NOTE = 4;
	const CARD = 5;
	const GLOSSARY = 6;
	const CLOSE = $derived(onGlossaryLookup ? 7 : 6);

	let popupElement: HTMLDivElement;
	let size = $state({ width: 0, height: 0 });
	let viewport = $state({ width: 0, height: 0 });
	let activeIndex = $state(0);

	let placement = $derived(placePopup(anchor, size, viewport, prefer));

	const buttons = (): HTMLButtonElement[] => (popupElement ? [...popupElement.querySelectorAll('button')] : []);
	const hasFocus = () => !!popupElement?.contains(document.activeElement);
	const tab = (i: number) => (i === activeIndex ? 0 : -1);

	function close() {
		onClose({ hadFocus: hasFocus() });
	}

	function focusButton(i: number) {
		const all = buttons();
		if (!all.length) return;
		activeIndex = ((i % all.length) + all.length) % all.length;
		all[activeIndex].focus();
	}

	const MOVE_KEYS = new Set(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']);

	function handleToolbarKeyDown(event: KeyboardEvent) {
		if (!MOVE_KEYS.has(event.key)) return;
		// These keys are the toolbar's: kept from the page's shortcuts too, which act on keydown
		// at the window (ArrowRight would turn to the next page)
		event.preventDefault();
		event.stopPropagation();
		// Focus came in while the reader was still extending the selection with Shift
		if (event.shiftKey) {
			onExtendSelection?.(event);
			return;
		}
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') focusButton(activeIndex + 1);
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') focusButton(activeIndex - 1);
		else if (event.key === 'Home') focusButton(0);
		else focusButton(buttons().length - 1);
	}

	function handleFocusIn(event: FocusEvent) {
		const i = buttons().indexOf(event.target as HTMLButtonElement);
		if (i >= 0) activeIndex = i;
	}

	function handleClickOutside(event: MouseEvent) {
		if (popupElement && !popupElement.contains(event.target as Node)) close();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}

	/** A press inside keeps the selection and focus where they are; the click still fires */
	function keepSelection(event: MouseEvent) {
		event.preventDefault();
	}

	function measure() {
		size = { width: popupElement.offsetWidth, height: popupElement.offsetHeight };
		viewport = {
			width: document.documentElement.clientWidth || window.innerWidth,
			height: window.innerHeight
		};
	}

	// Asked to take focus (on opening, or when the selection came from the keyboard later)
	$effect(() => {
		if (focusOnOpen) untrack(() => !hasFocus() && focusButton(0));
	});

	onMount(() => {
		measure();
		// Delay to avoid an immediate close from the press that made the selection
		const timeoutId = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100);
		document.addEventListener('keydown', handleKeyDown);
		window.addEventListener('resize', measure);
		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('resize', measure);
		};
	});
</script>

<div
	bind:this={popupElement}
	class="fixed z-50 w-max"
	style="left: {placement.left}px; top: {placement.top}px;"
	role="toolbar"
	tabindex="-1"
	aria-label="Valmöguleikar yfirstrikunar"
	data-selection-popup
	onkeydown={handleToolbarKeyDown}
	onfocusin={handleFocusIn}
	onmousedown={keepSelection}
	transition:scale={{ duration: 150, start: 0.95 }}
>
	<div
		class="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
	>
		<!-- Highlight color buttons -->
		<div class="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
			<Icon name="highlighter" size="sm" class="mr-1 text-gray-400" />
			{#each HIGHLIGHT_COLORS as { color, label, dative, hex }, i (color)}
				<button
					onclick={() => onHighlight(color)}
					tabindex={tab(i)}
					class="h-6 w-6 rounded-full transition-transform hover:scale-110"
					style="background-color: {hex};"
					aria-label="Yfirstrika með {dative} lit"
					title={label}
				></button>
			{/each}
		</div>

		<!-- Add note button -->
		<button
			onclick={onAddNote}
			tabindex={tab(NOTE)}
			class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
			aria-label="Bæta við athugasemd"
			title="Bæta við athugasemd"
		>
			<Icon name="message-square-text" size="sm" />
			<span class="hidden sm:inline">Athugasemd</span>
		</button>

		<!-- Create flashcard button -->
		<button
			onclick={onCreateFlashcard}
			tabindex={tab(CARD)}
			class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
			aria-label="Búa til minnisspjald"
			title="Búa til minnisspjald"
		>
			<Icon name="sparkles" size="sm" />
			<span class="hidden sm:inline">Minnisspjald</span>
		</button>

		<!-- Glossary lookup button. Named by its word 'Orðasafn' at every width (screen-reader only
		     below 640 px): an aria-label 'Fletta upp í orðasafni' did not contain the visible word,
		     which WCAG 2.5.3 (Label in Name) requires; the longer phrase stays as its tooltip. -->
		{#if onGlossaryLookup}
			<button
				onclick={onGlossaryLookup}
				tabindex={tab(GLOSSARY)}
				class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
				title="Fletta upp í orðasafni"
			>
				<Icon name="book-open" size="sm" />
				<span class="sr-only sm:not-sr-only">Orðasafn</span>
			</button>
		{/if}

		<!-- Close button -->
		<button
			onclick={close}
			tabindex={tab(CLOSE)}
			class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
			aria-label="Loka"
		>
			<Icon name="x" size="sm" />
		</button>
	</div>
</div>
