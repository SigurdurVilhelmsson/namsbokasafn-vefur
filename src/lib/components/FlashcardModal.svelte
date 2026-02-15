<!--
  FlashcardModal - Modal for creating flashcards from highlighted text
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { flashcardStore } from '$lib/stores/flashcard';
	import type { Flashcard, FlashcardDeck } from '$lib/types/flashcard';

	export let selectedText: string;
	export let source: string = ''; // e.g., "Efnafræði 2e > 1.1 Efnafræði í samhengi"
	export let onSave: () => void;
	export let onClose: () => void;

	let back = '';
	let selectedDeckId = '';
	let newDeckName = '';
	let showNewDeckInput = false;
	let backTextarea: HTMLTextAreaElement;
	let modalContentRef: HTMLDivElement;
	let previouslyFocused: HTMLElement | null = null;

	// Get decks from store
	$: decks = $flashcardStore.decks;

	// Auto-select first deck if available
	$: if (decks.length > 0 && !selectedDeckId && !showNewDeckInput) {
		selectedDeckId = decks[0].id;
	}

	function generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	function handleSave() {
		if (!back.trim()) return;

		let deckId = selectedDeckId;

		// Create new deck if needed
		if (showNewDeckInput && newDeckName.trim()) {
			const newDeck: FlashcardDeck = {
				id: generateId(),
				name: newDeckName.trim(),
				cards: [],
				created: new Date().toISOString()
			};
			flashcardStore.addDeck(newDeck);
			deckId = newDeck.id;
		}

		if (!deckId) return;

		// Create the flashcard
		const card: Flashcard = {
			id: generateId(),
			front: selectedText,
			back: back.trim(),
			source: source || undefined,
			created: new Date().toISOString()
		};

		flashcardStore.addCardToDeck(deckId, card);
		onSave();
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

	function toggleNewDeck() {
		showNewDeckInput = !showNewDeckInput;
		if (!showNewDeckInput) {
			newDeckName = '';
		}
	}

	onMount(() => {
		previouslyFocused = document.activeElement as HTMLElement;
		backTextarea?.focus();
		document.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeyDown);
		previouslyFocused?.focus();
	});

	$: canSave = back.trim() && (selectedDeckId || (showNewDeckInput && newDeckName.trim()));
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	on:click={handleOverlayClick}
	on:keydown={handleKeyDown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="flashcard-modal-title"
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
				id="flashcard-modal-title"
				class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
			>
				<svg class="w-5 h-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
				</svg>
				Búa til minniskort
			</h2>
			<button
				on:click={onClose}
				class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Loka"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="p-6 space-y-4">
			<!-- Front (selected text) -->
			<div>
				<span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Framhlið (spurning)
				</span>
				<blockquote
					class="rounded-lg border-l-4 border-[var(--accent-color)] bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300"
				>
					"{selectedText.length > 300 ? `${selectedText.slice(0, 300)}...` : selectedText}"
				</blockquote>
				{#if source}
					<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
						Heimild: {source}
					</p>
				{/if}
			</div>

			<!-- Back (answer) -->
			<div>
				<label
					for="flashcard-back"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Bakhlið (svar) <span class="text-red-500">*</span>
				</label>
				<textarea
					bind:this={backTextarea}
					bind:value={back}
					id="flashcard-back"
					placeholder="Skrifaðu svarið eða útskýringuna hér..."
					class="min-h-[100px] w-full resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
				></textarea>
				<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
					Ýttu á Ctrl+Enter til að vista
				</p>
			</div>

			<!-- Deck selection -->
			<div>
				<label for="deck-select" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Velja stokkur <span class="text-red-500">*</span>
				</label>

				{#if decks.length === 0 && !showNewDeckInput}
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
						Enginn stokkur til. Búðu til nýjan stokkur til að vista minniskortið.
					</p>
				{/if}

				{#if !showNewDeckInput && decks.length > 0}
					<select
						id="deck-select"
						bind:value={selectedDeckId}
						class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
					>
						{#each decks as deck}
							<option value={deck.id}>{deck.name} ({deck.cards.length} kort)</option>
						{/each}
					</select>
				{/if}

				{#if showNewDeckInput}
					<input
						type="text"
						bind:value={newDeckName}
						placeholder="Nafn á nýjum stokkur..."
						class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
					/>
				{/if}

				<button
					on:click={toggleNewDeck}
					class="mt-2 flex items-center gap-1 text-sm text-[var(--accent-color)] hover:underline"
				>
					{#if showNewDeckInput}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
						</svg>
						Velja fyrirliggjandi stokkur
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Búa til nýjan stokkur
					{/if}
				</button>
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
				Hætta við
			</button>
			<button
				on:click={handleSave}
				disabled={!canSave}
				class="flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Vista minniskort
			</button>
		</div>
	</div>
</div>
