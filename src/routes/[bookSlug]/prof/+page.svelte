<!--
  Quiz Page - Adaptive quiz for practicing problems
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import AdaptiveQuiz from '$lib/components/AdaptiveQuiz.svelte';

	// Param is always present on this route; fallback satisfies the type
	let bookSlug = $derived($page.params.bookSlug ?? '');
	let chapterSlug = $derived($page.url.searchParams.get('kafli') || undefined);

	function handleComplete() {
		goto(`/${bookSlug}`);
	}
</script>

<svelte:head>
	<title>Aðlögunarpróf | Námsbókasafn</title>
	<meta property="og:title" content="Aðlögunarpróf | Námsbókasafn" />
	<meta property="og:description" content="Próf og æfingar til að meta skilning á námsefni" />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://namsbokasafn.is/{bookSlug}/prof" />
	<meta property="og:url" content="https://namsbokasafn.is/{bookSlug}/prof" />
</svelte:head>

<div class="quiz-page min-h-[80vh] p-6">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-6">
			<a href="/{bookSlug}" class="quiz-back-link">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Til baka
			</a>
			<h1 class="quiz-heading">Aðlögunarpróf</h1>
			<p class="quiz-subtext">
				{#if chapterSlug}
					Æfingadæmi úr kafla: {chapterSlug}
				{:else}
					Aðlagað að þínum framförum – áhersla á dæmi sem þú þarft að æfa
				{/if}
			</p>
		</div>

		<!-- Quiz component -->
		<AdaptiveQuiz {bookSlug} {chapterSlug} onComplete={handleComplete} maxProblems={5} />

		<!-- Help section -->
		<div class="quiz-help">
			<h3 class="quiz-help-title">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				Hvernig virkar aðlögunarpróf?
			</h3>
			<ul class="quiz-help-list">
				<li>Prófið velur dæmi sem passa við það sem þú ert að læra</li>
				<li>Dæmi sem þú hefur ekki leyst fá forgang</li>
				<li>Eftir að þú svarar er næsta spurning aðlöguð</li>
				<li>Markmiðið er að hjálpa þér að læra, ekki að meta þig</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.quiz-back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		transition: color 0.15s;
		margin-bottom: 1rem;
	}
	.quiz-back-link:hover {
		color: var(--accent-color);
	}
	.quiz-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.quiz-subtext {
		color: var(--text-secondary);
	}
	.quiz-help {
		margin-top: 2rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-light);
		border: 1px solid var(--border-color);
		padding: 1rem;
	}
	.quiz-help-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--accent-color);
		margin-bottom: 0.5rem;
	}
	.quiz-help-list {
		font-size: 0.875rem;
		color: var(--text-secondary);
		list-style-type: disc;
		list-style-position: inside;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
</style>
