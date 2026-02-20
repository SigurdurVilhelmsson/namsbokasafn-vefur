<!--
  NoteModal - Modal for adding notes to highlights
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import type { HighlightColor } from '$lib/types/annotation';

	export let selectedText: string;
	export let initialNote: string = '';
	export let initialColor: HighlightColor = 'yellow';
	export let onSave: (note: string, color: HighlightColor) => void;
	export let onClose: () => void;

	const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; hex: string }[] = [
		{ color: 'yellow', label: 'Gulur', hex: '#f5e6b8' },
		{ color: 'green', label: 'Gulbrúnn', hex: '#f0d0a0' },
		{ color: 'blue', label: 'Blár', hex: '#c8daf0' },
		{ color: 'pink', label: 'Rósrauður', hex: '#f0c8c8' }
	];

	let note = initialNote;
	let color: HighlightColor = initialColor;
	let textareaElement: HTMLTextAreaElement;
	let modalContentRef: HTMLDivElement;
	let previouslyFocused: HTMLElement | null = null;

	function handleSave() {
		onSave(note.trim(), color);
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Focus trap
		if (event.key === 'Tab' && modalContentRef) {
			const focusable = modalContentRef.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		}
		// Save with Ctrl/Cmd + Enter
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			handleSave();
		}
		// Close on Escape
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	onMount(() => {
		previouslyFocused = document.activeElement as HTMLElement;
		textareaElement?.focus();
		document.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeyDown);
		previouslyFocused?.focus();
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	on:click={handleOverlayClick}
	on:keydown={handleKeyDown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="note-modal-title"
	tabindex="-1"
	transition:fade={{ duration: 150 }}
>
	<div
		bind:this={modalContentRef}
		class="mx-4 w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl"
		transition:scale={{ duration: 200, start: 0.95 }}
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4"
		>
			<h2
				id="note-modal-title"
				class="text-lg font-semibold text-gray-900 dark:text-gray-100"
			>
				Baeta vid athugasemd
			</h2>
			<button
				on:click={onClose}
				class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Loka"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="p-6">
			<!-- Selected text preview -->
			<div class="mb-4">
				<span class="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-300">
					Valinn texti
				</span>
				<blockquote
					class="rounded-lg border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-900 p-3 text-sm italic text-gray-600 dark:text-gray-300"
				>
					"{selectedText.length > 200 ? `${selectedText.slice(0, 200)}...` : selectedText}"
				</blockquote>
			</div>

			<!-- Color selector -->
			<div class="mb-4">
				<span class="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-300">
					Litur yfirstrokunar
				</span>
				<div class="flex gap-2">
					{#each HIGHLIGHT_COLORS as { color: c, label, hex }}
						<button
							on:click={() => (color = c)}
							class="h-8 w-8 rounded-full transition-all {color === c
								? 'ring-2 ring-blue-500 ring-offset-2'
								: 'hover:scale-110'}"
							style="background-color: {hex};"
							aria-label={label}
							aria-pressed={color === c}
							title={label}
						></button>
					{/each}
				</div>
			</div>

			<!-- Note textarea -->
			<div class="mb-4">
				<label
					for="annotation-note"
					class="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-300"
				>
					Athugasemd (valfrjalst)
				</label>
				<textarea
					bind:this={textareaElement}
					bind:value={note}
					id="annotation-note"
					placeholder="Skrifadu athugasemd her..."
					class="min-h-[100px] w-full resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
				></textarea>
				<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
					Yttu a Ctrl+Enter til ad vista
				</p>
			</div>
		</div>

		<!-- Footer -->
		<div
			class="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4"
		>
			<button
				on:click={onClose}
				class="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
			>
				Haetta vid
			</button>
			<button
				on:click={handleSave}
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
					/>
				</svg>
				Vista
			</button>
		</div>
	</div>
</div>
