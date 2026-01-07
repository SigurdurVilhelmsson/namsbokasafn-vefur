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
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
		Minniskort
	</h1>

	{#if !$currentDeck}
		<!-- Start screen -->
		<div class="text-center py-12">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-6">
				<svg class="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
			</div>

			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
				Tilbúinn að læra?
			</h2>
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Endurtakning með bilum (spaced repetition) hjálpar þér að muna efnið betur.
			</p>

			<!-- Stats -->
			<div class="grid grid-cols-3 gap-4 mb-8">
				<div class="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
					<div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{deckStats.new}</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">Ný kort</div>
				</div>
				<div class="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
					<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{deckStats.due}</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">Til endurtekningar</div>
				</div>
				<div class="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
					<div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{deckStats.total}</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">Alls</div>
				</div>
			</div>

			<!-- Study streak -->
			{#if $studyStats.studyStreak > 0}
				<div class="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
					<div class="flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2c-4.42 0-8 3.58-8 8 0 4.42 5.33 9.67 7.05 11.13.38.32.91.32 1.29 0 1.72-1.46 7.05-6.71 7.05-11.13 0-4.42-3.58-8-7.39-8z" />
						</svg>
						<span class="font-medium">{$studyStats.studyStreak} daga námsruna!</span>
					</div>
				</div>
			{/if}

			<button
				on:click={startStudy}
				class="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6">
				<svg class="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
				Vel gert!
			</h2>
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Þú hefur lokið öllum kortum fyrir í dag.
			</p>

			<div class="flex justify-center gap-4">
				<button
					on:click={() => flashcardStore.resetSession()}
					class="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
				>
					Til baka
				</button>
				<button
					on:click={startStudy}
					class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
				<div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
					<span>Kort {$studyProgress.current + 1} af {$studyProgress.total}</span>
					<span>{Math.round((($studyProgress.current) / $studyProgress.total) * 100)}%</span>
				</div>
				<div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
					<div
						class="h-full rounded-full bg-blue-600 transition-all duration-300"
						style="width: {($studyProgress.current / $studyProgress.total) * 100}%"
					></div>
				</div>
			</div>

			<!-- Card -->
			<button
				on:click={flip}
				class="w-full min-h-[300px] p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-transform hover:scale-[1.01] text-left"
			>
				<div class="text-center">
					<span class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 block">
						{isFlipped ? 'Svar' : 'Spurning'}
					</span>
					<p class="text-xl text-gray-900 dark:text-gray-100">
						{isFlipped ? $currentCard.back : $currentCard.front}
					</p>
				</div>
			</button>

			<!-- Flip hint or rating buttons -->
			{#if !isFlipped}
				<p class="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
					Smelltu á kortið til að sjá svarið
				</p>
			{:else}
				<div class="mt-6">
					<p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
						Hversu auðvelt var þetta?
					</p>
					<div class="grid grid-cols-4 gap-2">
						<button
							on:click={() => rate('again')}
							class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
						>
							<div class="font-medium">Aftur</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.again}</div>
							{/if}
						</button>
						<button
							on:click={() => rate('hard')}
							class="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
						>
							<div class="font-medium">Erfitt</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.hard}</div>
							{/if}
						</button>
						<button
							on:click={() => rate('good')}
							class="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
						>
							<div class="font-medium">Gott</div>
							{#if previewIntervals}
								<div class="text-xs opacity-75">{previewIntervals.good}</div>
							{/if}
						</button>
						<button
							on:click={() => rate('easy')}
							class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
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
