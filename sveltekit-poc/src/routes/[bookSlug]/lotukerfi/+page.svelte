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
			<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
				<svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
				Lotukerfið
			</h1>
		</div>
		<p class="text-gray-600 dark:text-gray-300">
			Smelltu á frumefni til að sjá nánari upplýsingar. Notaðu örvatakkana til að flakka á milli frumefna.
		</p>
	</div>

	<!-- Info banner -->
	<div class="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
		<div class="flex gap-3">
			<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<div class="text-sm text-blue-800 dark:text-blue-200">
				<p class="font-medium mb-1">Leiðbeiningar</p>
				<ul class="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
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
	<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
			Flokkar frumefna
		</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="text-sm">
				<h3 class="font-medium text-gray-900 dark:text-gray-100">Alkalímálmar</h3>
				<p class="text-gray-600 dark:text-gray-300">Mjúkir, hvarfgjarnir málmar í 1. flokki</p>
			</div>
			<div class="text-sm">
				<h3 class="font-medium text-gray-900 dark:text-gray-100">Jarðalkalímálmar</h3>
				<p class="text-gray-600 dark:text-gray-300">Hvarfgjarnir málmar í 2. flokki</p>
			</div>
			<div class="text-sm">
				<h3 class="font-medium text-gray-900 dark:text-gray-100">Hliðarmálmar</h3>
				<p class="text-gray-600 dark:text-gray-300">Harðir málmar með margar oxunartölur</p>
			</div>
			<div class="text-sm">
				<h3 class="font-medium text-gray-900 dark:text-gray-100">Hálfmálmar</h3>
				<p class="text-gray-600 dark:text-gray-300">Hafa eiginleika bæði málma og málmleysinga</p>
			</div>
			<div class="text-sm">
				<h3 class="font-medium text-gray-900 dark:text-gray-100">Halógenar</h3>
				<p class="text-gray-600 dark:text-gray-300">Hvarfgjarnir málmleysingjar í 17. flokki</p>
			</div>
			<div class="text-sm">
				<h3 class="font-medium text-gray-900 dark:text-gray-100">Eðalgastegundir</h3>
				<p class="text-gray-600 dark:text-gray-300">Óhvarfgjörn gas í 18. flokki</p>
			</div>
		</div>
	</div>
</div>
