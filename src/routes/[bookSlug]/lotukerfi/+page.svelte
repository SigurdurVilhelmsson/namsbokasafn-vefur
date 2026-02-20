<!--
  Periodic Table Page - Interactive periodic table for chemistry
-->
<script lang="ts">
	import type { PageData } from './$types';
	import PeriodicTable from '$lib/components/PeriodicTable.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>Lotukerfið | {data.book?.title ?? 'Efnafræði'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<div class="pt-icon-wrap">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
				</svg>
			</div>
			<h1 class="pt-heading">
				Lotukerfið
			</h1>
		</div>
		<p class="pt-subtext">
			Smelltu á frumefni til að sjá nánari upplýsingar. Notaðu örvatakkana til að flakka á milli frumefna.
		</p>
	</div>

	<!-- Info banner -->
	<div class="pt-info-banner">
		<div class="flex gap-3">
			<svg class="w-5 h-5 flex-shrink-0 mt-0.5" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<div class="text-sm">
				<p class="pt-info-title">Leiðbeiningar</p>
				<ul class="pt-info-list">
					<li>Smelltu á frumefni til að sjá eiginleika þess</li>
					<li>Notaðu leitarreitinn til að finna frumefni</li>
					<li>Smelltu á flokka til að sía eftir tegund</li>
					<li>Örvatakkar: flakka á milli frumefna í glugga</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Periodic Table -->
	<PeriodicTable bookSlug={data.bookSlug} />

	<!-- Footer with category descriptions -->
	<div class="pt-footer">
		<h2 class="pt-footer-heading">
			Flokkar frumefna
		</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="text-sm">
				<h3 class="pt-category-name">Alkalímálmar</h3>
				<p class="pt-category-desc">Mjúkir, hvarfgjarnir málmar í 1. flokki</p>
			</div>
			<div class="text-sm">
				<h3 class="pt-category-name">Jarðalkalímálmar</h3>
				<p class="pt-category-desc">Hvarfgjarnir málmar í 2. flokki</p>
			</div>
			<div class="text-sm">
				<h3 class="pt-category-name">Hliðarmálmar</h3>
				<p class="pt-category-desc">Harðir málmar með margar oxunartölur</p>
			</div>
			<div class="text-sm">
				<h3 class="pt-category-name">Hálfmálmar</h3>
				<p class="pt-category-desc">Hafa eiginleika bæði málma og málmleysinga</p>
			</div>
			<div class="text-sm">
				<h3 class="pt-category-name">Halógenar</h3>
				<p class="pt-category-desc">Hvarfgjarnir málmleysingjar í 17. flokki</p>
			</div>
			<div class="text-sm">
				<h3 class="pt-category-name">Eðalgastegundir</h3>
				<p class="pt-category-desc">Óhvarfgjörn gas í 18. flokki</p>
			</div>
		</div>
	</div>
</div>

<style>
	.pt-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-light);
		color: var(--accent-color);
	}
	.pt-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.pt-subtext {
		color: var(--text-secondary);
	}
	.pt-info-banner {
		margin-bottom: 1.5rem;
		padding: 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-light);
		border: 1px solid var(--border-color);
	}
	.pt-info-title {
		font-weight: 500;
		color: var(--accent-color);
		margin-bottom: 0.25rem;
	}
	.pt-info-list {
		list-style-type: disc;
		list-style-position: inside;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: var(--text-secondary);
	}
	.pt-footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}
	.pt-footer-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 1rem;
	}
	.pt-category-name {
		font-weight: 500;
		color: var(--text-primary);
	}
	.pt-category-desc {
		color: var(--text-secondary);
	}
</style>
