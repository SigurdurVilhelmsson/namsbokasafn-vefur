<!--
  Flashcard Study Page
-->
<script lang="ts">
	import type { PageData } from './$types';
	import {
		flashcardStore,
		currentDeck,
		currentCard,
		studyProgress,
		studyStats
	} from '$lib/stores';
	import type { DifficultyRating } from '$lib/types/flashcard';

	export let data: PageData;

	let isFlipped = false;

	$: if ($studyProgress.current !== undefined) {
		isFlipped = false;
	}

	// All user decks from the store
	$: allDecks = $flashcardStore.decks;

	function flip() {
		isFlipped = !isFlipped;
	}

	function rate(rating: DifficultyRating) {
		if ($currentCard) {
			flashcardStore.rateCard($currentCard.id, rating);
		}
	}

	function startStudy(deckId: string) {
		flashcardStore.startStudySession(deckId);
	}

	$: activeDeckStats = $currentDeck
		? flashcardStore.getDeckStats($currentDeck.id)
		: null;
	$: previewIntervals = $currentCard ? flashcardStore.getPreviewIntervals($currentCard.id) : null;
</script>

<svelte:head>
	<title>Minniskort | {data.book?.title ?? 'Bók'}</title>
	<meta property="og:title" content="Minniskort | {data.book?.title ?? 'Bók'}" />
	<meta property="og:description" content="Minniskort og endurtekningarkerfi fyrir {data.book?.title ?? 'kennslubók'}" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/minniskort" />
</svelte:head>

<div class="max-w-2xl mx-auto">
	<h1 class="flashcard-heading">
		Minniskort
	</h1>

	{#if !$currentDeck}
		<!-- Deck selection / empty state -->
		{#if allDecks.length === 0}
			<!-- No decks yet -->
			<div class="text-center py-12">
				<div class="flashcard-icon-circle">
					<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
				</div>

				<h2 class="flashcard-subheading">
					Engin minniskort enn
				</h2>
				<p class="flashcard-description">
					Til að búa til minniskort, veldu texta í kafla og smelltu á „Minniskort" í valmyndinni sem birtist.
				</p>

				<a
					href="/{data.bookSlug}"
					class="flashcard-start-btn"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
					Fara í efnisyfirlit
				</a>
			</div>
		{:else}
			<!-- Deck list -->
			<div class="deck-list">
				<!-- Study streak -->
				{#if $studyStats.studyStreak > 0}
					<div class="flashcard-streak">
						<div class="flashcard-streak-inner">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2c-4.42 0-8 3.58-8 8 0 4.42 5.33 9.67 7.05 11.13.38.32.91.32 1.29 0 1.72-1.46 7.05-6.71 7.05-11.13 0-4.42-3.58-8-7.39-8z" />
							</svg>
							<span class="font-medium">{$studyStats.studyStreak} daga námsruna!</span>
						</div>
					</div>
				{/if}

				<p class="flashcard-description">Veldu stokkinn sem þú vilt æfa:</p>

				{#each allDecks as deck (deck.id)}
					{@const stats = flashcardStore.getDeckStats(deck.id)}
					<div class="deck-card">
						<div class="deck-card-info">
							<h3 class="deck-card-name">{deck.name}</h3>
							{#if deck.description}
								<p class="deck-card-desc">{deck.description}</p>
							{/if}
							<div class="deck-card-stats">
								<span>{stats.total} kort</span>
								{#if stats.due > 0}
									<span class="deck-card-stats-due">{stats.due} til endurtekningar</span>
								{/if}
								{#if stats.new > 0}
									<span>{stats.new} ný</span>
								{/if}
							</div>
						</div>
						<button
							on:click={() => startStudy(deck.id)}
							class="deck-card-btn"
							disabled={deck.cards.length === 0}
						>
							Æfa
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else if $studyProgress.isComplete}
		<!-- Completion screen -->
		<div class="text-center py-12">
			<div class="flashcard-icon-circle flashcard-icon-circle--success">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<h2 class="flashcard-subheading">
				Vel gert!
			</h2>
			<p class="flashcard-description">
				Þú hefur lokið öllum kortum fyrir í dag.
			</p>

			<div class="flex justify-center gap-4">
				<button
					on:click={() => flashcardStore.resetSession()}
					class="flashcard-secondary-btn"
				>
					Til baka
				</button>
				<button
					on:click={() => { if ($currentDeck) startStudy($currentDeck.id); }}
					class="flashcard-primary-btn"
				>
					Æfa aftur
				</button>
			</div>
		</div>
	{:else if $currentCard}
		<!-- Active study -->
		<div>
			<!-- Progress bar -->
			<div class="mb-6">
				<div class="flashcard-progress-text">
					<span>Kort {$studyProgress.current + 1} af {$studyProgress.total}</span>
					<span>{$studyProgress.total > 0 ? Math.round(($studyProgress.current / $studyProgress.total) * 100) : 0}%</span>
				</div>
				<div
					class="flashcard-progress-track"
					role="progressbar"
					aria-valuenow={$studyProgress.current}
					aria-valuemin={0}
					aria-valuemax={$studyProgress.total}
					aria-label="Framvinda náms"
				>
					<div
						class="flashcard-progress-fill"
						style="width: {$studyProgress.total > 0 ? ($studyProgress.current / $studyProgress.total) * 100 : 0}%"
					></div>
				</div>
			</div>

			<!-- Card -->
			<button
				on:click={flip}
				class="flashcard-card"
			>
				<div class="text-center">
					<span class="flashcard-card-label">
						{isFlipped ? 'Svar' : 'Spurning'}
					</span>
					<p class="flashcard-card-text">
						{isFlipped ? $currentCard.back : $currentCard.front}
					</p>
				</div>
			</button>

			<!-- Flip hint or rating buttons -->
			{#if !isFlipped}
				<p class="flashcard-hint">
					Smelltu á kortið til að sjá svarið
				</p>
			{:else}
				<div class="mt-6">
					<p class="flashcard-hint" style="margin-bottom: 1rem;">
						Hversu auðvelt var þetta?
					</p>
					<div class="grid grid-cols-4 gap-2">
						<button
							on:click={() => rate('again')}
							class="flashcard-rating flashcard-rating--again"
						>
							<div class="font-medium">Aftur</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.again}</div>
							{/if}
						</button>
						<button
							on:click={() => rate('hard')}
							class="flashcard-rating flashcard-rating--hard"
						>
							<div class="font-medium">Erfitt</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.hard}</div>
							{/if}
						</button>
						<button
							on:click={() => rate('good')}
							class="flashcard-rating flashcard-rating--good"
						>
							<div class="font-medium">Gott</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.good}</div>
							{/if}
						</button>
						<button
							on:click={() => rate('easy')}
							class="flashcard-rating flashcard-rating--easy"
						>
							<div class="font-medium">Auðvelt</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.easy}</div>
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Headings */
	.flashcard-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}
	.flashcard-subheading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.flashcard-description {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	/* Icon circle */
	.flashcard-icon-circle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		border-radius: 9999px;
		background-color: var(--accent-light);
		color: var(--accent-color);
		margin-bottom: 1.5rem;
	}
	.flashcard-icon-circle--success {
		background-color: #ecfdf5;
		color: #059669;
	}
	:global(.dark) .flashcard-icon-circle--success {
		background-color: rgba(6, 78, 59, 0.3);
		color: #34d399;
	}

	/* Deck list */
	.deck-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.deck-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-lg);
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
	}

	.deck-card-info {
		flex: 1;
		min-width: 0;
	}

	.deck-card-name {
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.125rem;
	}

	.deck-card-desc {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.deck-card-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.8125rem;
		color: var(--text-tertiary);
	}

	.deck-card-stats-due {
		color: var(--accent-color);
		font-weight: 500;
	}

	.deck-card-btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-color);
		color: white;
		font-weight: 500;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}
	.deck-card-btn:hover {
		opacity: 0.9;
	}
	.deck-card-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Buttons */
	.flashcard-start-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.125rem;
		font-weight: 500;
		border-radius: var(--radius-xl);
		background-color: var(--accent-color);
		color: white;
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.flashcard-start-btn:hover {
		opacity: 0.9;
	}
	.flashcard-primary-btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-color);
		color: white;
		transition: opacity 0.15s;
	}
	.flashcard-primary-btn:hover {
		opacity: 0.9;
	}
	.flashcard-secondary-btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		transition: background-color 0.15s;
	}
	.flashcard-secondary-btn:hover {
		background-color: var(--bg-tertiary);
	}

	/* Study streak */
	.flashcard-streak {
		margin-bottom: 1.5rem;
		padding: 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-light);
		border: 1px solid var(--border-color);
	}
	.flashcard-streak-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--accent-color);
	}

	/* Progress bar */
	.flashcard-progress-text {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 0.5rem;
	}
	.flashcard-progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background-color: var(--bg-tertiary);
	}
	.flashcard-progress-fill {
		height: 100%;
		border-radius: 9999px;
		background-color: var(--accent-color);
		transition: width 0.3s;
	}

	/* Card */
	.flashcard-card {
		width: 100%;
		min-height: 300px;
		padding: 2rem;
		border-radius: var(--radius-xl);
		background-color: var(--bg-secondary);
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border-color);
		cursor: pointer;
		transition: transform 0.15s;
		text-align: left;
	}
	.flashcard-card:hover {
		transform: scale(1.01);
	}
	.flashcard-card-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		margin-bottom: 1rem;
	}
	.flashcard-card-text {
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	/* Hint text */
	.flashcard-hint {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-top: 1rem;
	}

	/* Rating buttons */
	.flashcard-rating {
		padding: 0.75rem;
		border-radius: var(--radius-lg);
		transition: background-color 0.15s, opacity 0.15s;
	}
	.flashcard-rating:hover {
		opacity: 0.85;
	}
	/* Again - red */
	.flashcard-rating--again {
		background-color: #fef2f2;
		color: #b91c1c;
	}
	:global(.dark) .flashcard-rating--again {
		background-color: rgba(127, 29, 29, 0.3);
		color: #fca5a5;
	}
	/* Hard - amber */
	.flashcard-rating--hard {
		background-color: #fff7ed;
		color: #c2410c;
	}
	:global(.dark) .flashcard-rating--hard {
		background-color: rgba(124, 45, 18, 0.3);
		color: #fdba74;
	}
	/* Good - accent */
	.flashcard-rating--good {
		background-color: var(--accent-light);
		color: var(--accent-color);
	}
	/* Easy - green */
	.flashcard-rating--easy {
		background-color: #ecfdf5;
		color: #047857;
	}
	:global(.dark) .flashcard-rating--easy {
		background-color: rgba(6, 78, 59, 0.3);
		color: #6ee7b7;
	}
</style>
