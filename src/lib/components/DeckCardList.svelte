<!--
  DeckCardList - a deck's cards on /minniskort, each with 'Eyða' (plan step S7.2, register
  UI-14: before this, a card once made could be removed only by clearing the site's data).
  Collapsed under the deck row as <details>, so the deck list reads as before.

  'Eyða' asks first, as RecallEntryCard and /greining's erases do, then deletes the card and its
  study record, says so through the shared announcer and moves focus, since the button leaves
  the DOM with focus on it: to the next card's 'Eyða', else the previous one's, else the summary.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { flashcardStore } from '$lib/stores/flashcard';
	import { announce } from '$lib/stores/announcer';

	let { deckId }: { deckId: string } = $props();

	let cards = $derived($flashcardStore.decks.find((d) => d.id === deckId)?.cards ?? []);

	// The confirm and the announcement (S7.2), worded as the recall delete's
	const CONFIRM_DELETE = 'Eyða þessu spjaldi? Þetta er ekki hægt að afturkalla.';
	const DELETED_MESSAGE = 'Spjaldinu var eytt.';

	let summaryEl: HTMLElement | undefined = $state();
	let listEl: HTMLElement | undefined = $state();

	async function handleDelete(cardId: string, index: number) {
		if (!confirm(CONFIRM_DELETE)) return;
		flashcardStore.deleteCard(deckId, cardId);
		announce(DELETED_MESSAGE);
		await tick();
		const buttons = listEl?.querySelectorAll<HTMLButtonElement>('button') ?? [];
		(buttons[Math.min(index, buttons.length - 1)] ?? summaryEl)?.focus();
	}
</script>

<details class="deck-cards">
	<summary bind:this={summaryEl} class="deck-cards-summary">Spjöldin í stokknum</summary>
	{#if cards.length > 0}
		<ul bind:this={listEl} class="deck-cards-list">
			{#each cards as card, i (card.id)}
				<li class="deck-cards-item">
					<div class="deck-cards-text">
						<p class="deck-cards-front">{card.front}</p>
						<p class="deck-cards-back">{card.back}</p>
					</div>
					<button
						onclick={() => handleDelete(card.id, i)}
						aria-label="Eyða spjaldi: {card.front}"
						class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
					>
						Eyða
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="deck-cards-empty">Stokkurinn er tómur.</p>
	{/if}
</details>

<style>
	.deck-cards {
		margin: -0.25rem 0 0 1.25rem;
	}

	/* The summary keeps its list-item display, and with it the disclosure triangle */
	.deck-cards-summary {
		width: fit-content;
		padding: 0.25rem 0;
		font-size: 0.875rem;
		color: var(--accent-strong);
		cursor: pointer;
	}

	.deck-cards-summary:hover {
		text-decoration: underline;
	}

	.deck-cards-list {
		margin-top: 0.5rem;
		border-top: 1px solid var(--border-color);
	}

	.deck-cards-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border-color);
	}

	.deck-cards-text {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.deck-cards-front {
		color: var(--text-primary);
	}

	.deck-cards-back,
	.deck-cards-empty {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.deck-cards-empty {
		padding: 0.5rem 0;
	}
</style>
