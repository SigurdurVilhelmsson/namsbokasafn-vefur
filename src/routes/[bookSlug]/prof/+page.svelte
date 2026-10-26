<!--
  Quiz page (/prof): practice review of problems the reader has opened in the book (AdaptiveQuiz).
-->
<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
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
	<!-- D20: proposed wording (S3.2, PED-29: no adaptive claim; 'Próf' as in the nav), checked in the batch before the train that ships it. -->
	<title>Próf | Námsbókasafn</title>
	<meta property="og:title" content="Próf | Námsbókasafn" />
	<meta name="description" content="Æfðu aftur dæmi úr köflunum — þau sem þú hefur ekki enn náð tökum á koma fyrst." />
	<meta property="og:description" content="Æfðu aftur dæmi úr köflunum — þau sem þú hefur ekki enn náð tökum á koma fyrst." />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://namsbokasafn.is/{bookSlug}/prof/" />
	<meta property="og:url" content="https://namsbokasafn.is/{bookSlug}/prof/" />
</svelte:head>

<div class="quiz-page min-h-[80vh] p-6">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-6">
			<a href="/{bookSlug}" class="quiz-back-link">
				<Icon name="chevron-left" size="sm" />
				Til baka
			</a>
			<!-- D20: proposed wording (S3.2, PED-29: the heading and subtitle), checked in the batch before the train that ships it. -->
			<h1 class="quiz-heading">Próf</h1>
			<p class="quiz-subtext">
				{#if chapterSlug}
					Æfingadæmi úr kafla: {chapterSlug}
				{:else}
					Dæmi sem þú hefur opnað í köflunum — þau sem þú hefur ekki enn náð tökum á koma fyrst.
				{/if}
			</p>
		</div>

		<!-- Quiz component -->
		<AdaptiveQuiz {bookSlug} {chapterSlug} onComplete={handleComplete} maxProblems={5} />

		<!-- Help section -->
		<div class="quiz-help">
			<h3 class="quiz-help-title">
				<Icon name="info" size="sm" />
				<!-- D20: proposed wording (S3.2, PED-29: the help says where the problems come from; the next question does not adapt), checked in the batch before the train that ships it. -->
				Hvaðan koma dæmin?
			</h3>
			<ul class="quiz-help-list">
				<li>Hér birtast dæmi sem þú hefur opnað í köflunum.</li>
				<li>Dæmi sem þú hefur ekki enn reynt koma fyrst, svo þau sem þú hefur ekki enn náð tökum á.</li>
				<li>Markmiðið er að hjálpa þér að læra, ekki að meta þig.</li>
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
		color: var(--accent-strong);
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
		color: var(--accent-strong);
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
