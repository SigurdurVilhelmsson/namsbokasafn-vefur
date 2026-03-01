<!--
  SelectionPopup - Shows highlight options when text is selected
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import type { HighlightColor, SelectionPosition } from '$lib/types/annotation';

	export let position: SelectionPosition;
	export let onHighlight: (color: HighlightColor) => void;
	export let onAddNote: () => void;
	export let onCreateFlashcard: () => void;
	export let onGlossaryLookup: (() => void) | undefined = undefined;
	export let onClose: () => void;

	const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; hex: string }[] = [
		{ color: 'yellow', label: 'Gulur', hex: '#f5e6b8' },
		{ color: 'green', label: 'Gulbrúnn', hex: '#f0d0a0' },
		{ color: 'blue', label: 'Blár', hex: '#c8daf0' },
		{ color: 'pink', label: 'Rósrauður', hex: '#f0c8c8' }
	];

	let popupElement: HTMLDivElement;

	// Calculate position to keep popup in viewport
	$: adjustedPosition = {
		x: Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200),
		y: Math.max(position.y - 50, 10)
	};

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
			<svg
				class="w-4 h-4 mr-1 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
				/>
			</svg>
			{#each HIGHLIGHT_COLORS as { color, label, hex }}
				<button
					on:click={() => onHighlight(color)}
					class="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2"
					style="background-color: {hex};"
					aria-label="Yfirstrika með {label.toLowerCase()}"
					title={label}
				></button>
			{/each}
		</div>

		<!-- Add note button -->
		<button
			on:click={onAddNote}
			class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
			aria-label="Bæta við athugasemd"
			title="Bæta við athugasemd"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
				/>
			</svg>
			<span class="hidden sm:inline">Athugasemd</span>
		</button>

		<!-- Create flashcard button -->
		<button
			on:click={onCreateFlashcard}
			class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
			aria-label="Búa til minniskort"
			title="Búa til minniskort"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
				/>
			</svg>
			<span class="hidden sm:inline">Minniskort</span>
		</button>

		<!-- Glossary lookup button -->
		{#if onGlossaryLookup}
			<button
				on:click={onGlossaryLookup}
				class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
				aria-label="Fletta upp í orðasafni"
				title="Fletta upp í orðasafni"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				<span class="hidden sm:inline">Orðasafn</span>
			</button>
		{/if}

		<!-- Close button -->
		<button
			on:click={onClose}
			class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
			aria-label="Loka"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
</div>
