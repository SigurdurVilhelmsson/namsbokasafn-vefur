<!--
  NavigationButtons - Previous/Next section navigation
-->
<script lang="ts">
	import type { NavigationContext } from '$lib/types/content';

	export let navigation: NavigationContext;
	export let bookSlug: string;

	$: ({ previous, next, current } = navigation);
</script>

<div class="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
	<div class="mx-auto max-w-3xl">
		<!-- Breadcrumb -->
		<div class="mb-6 text-sm text-[var(--text-secondary)]">
			Kafli {current.chapter.number} › {current.section.number}
			{current.section.title}
		</div>

		<!-- Navigation buttons -->
		<div class="flex items-center justify-between gap-4">
			{#if previous}
				<a
					href="/{bookSlug}/kafli/{previous.chapter.slug}/{previous.section.slug}"
					class="group flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-3 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
				>
					<svg
						class="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<div class="text-left">
						<div class="text-xs text-[var(--text-secondary)]">Fyrri kafli</div>
						<div class="font-sans text-sm font-medium text-[var(--text-primary)]">
							{previous.section.number} {previous.section.title}
						</div>
					</div>
				</a>
			{:else}
				<div></div>
			{/if}

			{#if next}
				<a
					href="/{bookSlug}/kafli/{next.chapter.slug}/{next.section.slug}"
					class="group flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-3 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
				>
					<div class="text-right">
						<div class="text-xs text-[var(--text-secondary)]">Næsti kafli</div>
						<div class="font-sans text-sm font-medium text-[var(--text-primary)]">
							{next.section.number} {next.section.title}
						</div>
					</div>
					<svg
						class="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{:else}
				<div></div>
			{/if}
		</div>
	</div>
</div>
