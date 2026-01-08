<!--
  GlossaryTooltip - Shows a glossary definition in a floating tooltip
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import type { GlossaryTerm } from '$lib/types/content';

	export let term: GlossaryTerm;
	export let position: { x: number; y: number };
	export let bookSlug: string;
	export let onClose: () => void;

	let tooltipElement: HTMLDivElement;

	// Calculate position to keep tooltip in viewport
	$: adjustedPosition = {
		x: Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 320),
		y: Math.max(position.y + 10, 10)
	};

	function handleClickOutside(event: MouseEvent) {
		if (tooltipElement && !tooltipElement.contains(event.target as Node)) {
			onClose();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		const timeoutId = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
		}, 100);

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			clearTimeout(timeoutId);
		};
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleClickOutside);
		document.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div
	bind:this={tooltipElement}
	class="fixed z-50"
	style="left: {adjustedPosition.x}px; top: {adjustedPosition.y}px; transform: translateX(-50%);"
	role="tooltip"
	aria-label="Skilgreining úr orðasafni"
	transition:scale={{ duration: 150, start: 0.95 }}
>
	<div class="w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<span class="text-sm font-medium text-gray-500 dark:text-gray-400">Orðasafn</span>
			</div>
			<button
				on:click={onClose}
				class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Loka"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="p-4">
			<div class="flex items-start justify-between">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
					{term.term}
				</h3>
				{#if term.english}
					<span class="text-sm text-gray-500 dark:text-gray-400 italic">
						{term.english}
					</span>
				{/if}
			</div>
			<p class="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
				{term.definition}
			</p>

			{#if term.relatedTerms && term.relatedTerms.length > 0}
				<div class="mt-3 flex flex-wrap gap-1">
					<span class="text-xs text-gray-500 dark:text-gray-400">Tengd orð:</span>
					{#each term.relatedTerms as related}
						<span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
							{related}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
			<a
				href="/{bookSlug}/ordabok?search={encodeURIComponent(term.term)}"
				class="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
				Opna í orðasafni
			</a>
		</div>
	</div>
</div>
