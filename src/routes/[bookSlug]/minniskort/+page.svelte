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

	function flip() {
		isFlipped = !isFlipped;
	}

	function rate(rating: DifficultyRating) {
		if ($currentCard) {
			flashcardStore.rateCard($currentCard.id, rating);
		}
	}

	function startStudy() {
		// For now, use the first available deck or create a sample one
		const decks = flashcardStore.getDeck('sample');
		if (!decks) {
			// Add a sample deck if none exists
			flashcardStore.addDeck({
				id: 'sample',
				name: 'Efnafræði Minniskort',
				description: 'Grunnhugtök í efnafræði',
				cards: [
					{
						id: '1',
						front: 'Hvað er efnafræði?',
						back: 'Efnafræði er fræðigreinin um samsetningu, eiginleika og víxlverkun efnis.',
						created: new Date().toISOString()
					},
					{
						id: '2',
						front: 'Hvaða þrjú svið rannsaka efnafræðingar?',
						back: 'Stórsæja sviðið, smásæja sviðið og táknræna sviðið.',
						created: new Date().toISOString()
					},
					{
						id: '3',
						front: 'Hvað er vísindalega aðferðin?',
						back: 'Kerfisbundin aðferð til að rannsaka náttúruna með athugunum, tilgátum og tilraunum.',
						created: new Date().toISOString()
					},
					{
						id: '4',
						front: 'Hver er efnaformúla vatns?',
						back: 'H₂O - tvö vetnisatóm og eitt súrefnisatóm.',
						created: new Date().toISOString()
					}
				],
				created: new Date().toISOString()
			});
		}
		flashcardStore.startStudySession('sample');
	}

	$: deckStats = flashcardStore.getDeckStats('sample');
	$: previewIntervals = $currentCard ? flashcardStore.getPreviewIntervals($currentCard.id) : null;
</script>

<svelte:head>
	<title>Minniskort | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<h1 class="flashcard-heading">
		Minniskort
	</h1>

	{#if !$currentDeck}
		<!-- Start screen -->
		<div class="text-center py-12">
			<div class="flashcard-icon-circle">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
			</div>

			<h2 class="flashcard-subheading">
				Tilbúinn að læra?
			</h2>
			<p class="flashcard-description">
				Endurtakning með bilum (spaced repetition) hjálpar þér að muna efnið betur.
			</p>

			<!-- Stats -->
			<div class="grid grid-cols-3 gap-4 mb-8">
				<div class="flashcard-stat-card">
					<div class="flashcard-stat-value">{deckStats.new}</div>
					<div class="flashcard-stat-label">Ný kort</div>
				</div>
				<div class="flashcard-stat-card">
					<div class="flashcard-stat-value" style="color: var(--accent-color);">{deckStats.due}</div>
					<div class="flashcard-stat-label">Til endurtekningar</div>
				</div>
				<div class="flashcard-stat-card">
					<div class="flashcard-stat-value flashcard-stat-value--success">{deckStats.total}</div>
					<div class="flashcard-stat-label">Alls</div>
				</div>
			</div>

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

			<button
				on:click={startStudy}
				class="flashcard-start-btn"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Byrja námsæfingu
			</button>
		</div>
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
					on:click={startStudy}
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
					<span>{Math.round((($studyProgress.current) / $studyProgress.total) * 100)}%</span>
				</div>
				<div class="flashcard-progress-track">
					<div
						class="flashcard-progress-fill"
						style="width: {($studyProgress.current / $studyProgress.total) * 100}%"
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

	/* Stat cards */
	.flashcard-stat-card {
		padding: 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
	}
	.flashcard-stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.flashcard-stat-value--success {
		color: #059669;
	}
	:global(.dark) .flashcard-stat-value--success {
		color: #34d399;
	}
	.flashcard-stat-label {
		font-size: 0.875rem;
		color: var(--text-tertiary);
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
