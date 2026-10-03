<!--
  GlossaryTooltip - Shows a glossary definition in a floating tooltip
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import type { GlossaryTerm } from '$lib/types/content';

	interface Props {
		term: GlossaryTerm;
		position: { x: number; y: number };
		bookSlug: string;
		onClose: () => void;
	}

	let { term, position, bookSlug, onClose }: Props = $props();

	let tooltipElement: HTMLDivElement;

	// Calculate position to keep tooltip in viewport
	let adjustedPosition = $derived({
		x: Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 320),
		y: Math.max(position.y + 10, 10)
	});

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
				<Icon name="book-open" size="sm" class="text-[var(--accent-color)]" />
				<span class="text-sm font-medium text-gray-500 dark:text-gray-300">Orðasafn</span>
			</div>
			<button
				onclick={onClose}
				class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Loka"
			>
				<Icon name="x" size="sm" />
			</button>
		</div>

		<!-- Content -->
		<div class="p-4">
			<div class="flex items-start justify-between">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
					{term.term}
				</h3>
				{#if term.english}
					<span class="text-sm text-gray-500 dark:text-gray-300 italic">
						{term.english}
					</span>
				{/if}
			</div>
			<p class="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
				{term.definition}
			</p>

			{#if term.relatedTerms && term.relatedTerms.length > 0}
				<div class="mt-3 flex flex-wrap gap-1">
					<span class="text-xs text-gray-500 dark:text-gray-300">Tengd orð:</span>
					{#each term.relatedTerms as related (related)}
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
				class="flex items-center justify-center gap-2 text-sm text-[var(--accent-color)] hover:underline"
			>
				<Icon name="external-link" size="sm" />
				Opna í orðasafni
			</a>
		</div>
	</div>
</div>
