<!--
  Quiz Page - Adaptive quiz for practicing problems
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import AdaptiveQuiz from '$lib/components/AdaptiveQuiz.svelte';

	$: bookSlug = $page.params.bookSlug;
	$: chapterSlug = $page.url.searchParams.get('kafli') || undefined;

	function handleComplete() {
		goto(`/${bookSlug}`);
	}
</script>

<svelte:head>
	<title>Adlogunarprof | Namsbokasafn</title>
</svelte:head>

<div class="quiz-page min-h-[80vh] p-6">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-6">
			<a
				href="/{bookSlug}"
				class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Til baka
			</a>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Adlogunarprof</h1>
			<p class="text-gray-500 dark:text-gray-300">
				{#if chapterSlug}
					Aefingadaemi ur kafla: {chapterSlug}
				{:else}
					Adlagad ad thinum framforum - fokus a daemi sem thu tharft ad aefa
				{/if}
			</p>
		</div>

		<!-- Quiz component -->
		<AdaptiveQuiz {chapterSlug} onComplete={handleComplete} maxProblems={5} />

		<!-- Help section -->
		<div class="mt-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
			<h3 class="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				Hvernig virkar adlogunarprof?
			</h3>
			<ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
				<li>Profid velur daemi sem passa vid thar sem thu ert staddur</li>
				<li>Daemi sem thu hefur ekki leyst fa forgang</li>
				<li>Eftir ad thu svarar er naesti spurning adlögud</li>
				<li>Markmidin er ad hjalpa ther ad laera, ekki ad meta thig</li>
			</ul>
		</div>
	</div>
</div>
