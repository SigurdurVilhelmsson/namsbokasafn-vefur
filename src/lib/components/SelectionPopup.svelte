<!--
  SelectionPopup - Shows highlight options when text is selected
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import type { HighlightColor, SelectionPosition } from '$lib/types/annotation';

	interface Props {
		position: SelectionPosition;
		onHighlight: (color: HighlightColor) => void;
		onAddNote: () => void;
		onCreateFlashcard: () => void;
		onGlossaryLookup?: () => void;
		onClose: () => void;
	}

	let { position, onHighlight, onAddNote, onCreateFlashcard, onGlossaryLookup, onClose }: Props = $props();

	const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; hex: string }[] = [
		{ color: 'yellow', label: 'Gulur', hex: '#f5e6b8' },
		{ color: 'green', label: 'Gulbrúnn', hex: '#f0d0a0' },
		{ color: 'blue', label: 'Blár', hex: '#c8daf0' },
		{ color: 'pink', label: 'Rósrauður', hex: '#f0c8c8' }
	];

	let popupElement: HTMLDivElement;

	// Calculate position to keep popup in viewport
	let adjustedPosition = $derived({
		x: Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200),
		y: Math.max(position.y - 50, 10)
	});

	function handleClickOutside(event: MouseEvent) {
		if (popupElement && !popupElement.contains(event.target as Node)) {
			onClose();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		// Delay to avoid immediate close from selection click
		const timeoutId = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
		}, 100);

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			clearTimeout(timeoutId);
		};
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleClickOutside);
		document.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div
	bind:this={popupElement}
	class="fixed z-50"
	style="left: {adjustedPosition.x}px; top: {adjustedPosition.y}px; transform: translateX(-50%);"
	role="dialog"
	aria-label="Valmoguleikar yfirstrokunar"
	transition:scale={{ duration: 150, start: 0.95 }}
>
	<div
		class="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
	>
		<!-- Highlight color buttons -->
		<div class="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
			<Icon name="highlighter" size="sm" class="mr-1 text-gray-400" />
			{#each HIGHLIGHT_COLORS as { color, label, hex } (color)}
				<button
					onclick={() => onHighlight(color)}
					class="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2"
					style="background-color: {hex};"
					aria-label="Yfirstrika með {label.toLowerCase()}"
					title={label}
				></button>
			{/each}
		</div>

		<!-- Add note button -->
		<button
			onclick={onAddNote}
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
			class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
			aria-label="Búa til minniskort"
			title="Búa til minniskort"
		>
			<Icon name="sparkles" size="sm" />
			<span class="hidden sm:inline">Minniskort</span>
		</button>

		<!-- Glossary lookup button -->
		{#if onGlossaryLookup}
			<button
				onclick={onGlossaryLookup}
				class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
				aria-label="Fletta upp í orðasafni"
				title="Fletta upp í orðasafni"
			>
				<Icon name="book-open" size="sm" />
				<span class="hidden sm:inline">Orðasafn</span>
			</button>
		{/if}

		<!-- Close button -->
		<button
			onclick={onClose}
			class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
			aria-label="Loka"
		>
			<Icon name="x" size="sm" />
		</button>
	</div>
</div>
