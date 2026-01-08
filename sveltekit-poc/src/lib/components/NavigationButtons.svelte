<!--
  NavigationButtons - Previous/Next section navigation
-->
<script lang="ts">
	import type { NavigationContext } from '$lib/types/content';

	export let navigation: NavigationContext;
	export let bookSlug: string;

	$: ({ previous, next, current } = navigation);
</script>

<div class="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 sm:p-6">
	<div class="mx-auto max-w-3xl">
		<!-- Breadcrumb -->
		<div class="mb-4 sm:mb-6 text-sm text-[var(--text-secondary)] truncate">
			Kafli {current.chapter.number} › {current.section.number}
			{current.section.title}
		</div>

		<!-- Navigation buttons -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			{#if previous}
				<a
					href="/{bookSlug}/kafli/{previous.chapter.slug}/{previous.section.slug}"
					class="group flex items-center gap-3 rounded-lg border border-[var(--border-color)] px-4 py-3 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5 sm:max-w-[48%]"
				>
					<svg
						class="w-5 h-5 flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<div class="text-left min-w-0">
						<div class="text-xs text-[var(--text-secondary)]">Fyrri kafli</div>
						<div class="font-sans text-sm font-medium text-[var(--text-primary)] truncate">
							{previous.section.number} {previous.section.title}
						</div>
					</div>
				</a>
			{:else}
				<div class="hidden sm:block"></div>
			{/if}

			{#if next}
				<a
					href="/{bookSlug}/kafli/{next.chapter.slug}/{next.section.slug}"
					class="group flex items-center gap-3 rounded-lg border border-[var(--border-color)] px-4 py-3 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5 sm:max-w-[48%] {!previous ? 'sm:ml-auto' : ''}"
				>
					<div class="text-left sm:text-right min-w-0 flex-1">
						<div class="text-xs text-[var(--text-secondary)]">Næsti kafli</div>
						<div class="font-sans text-sm font-medium text-[var(--text-primary)] truncate">
							{next.section.number} {next.section.title}
						</div>
					</div>
					<svg
						class="w-5 h-5 flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{:else}
				<div class="hidden sm:block"></div>
			{/if}
		</div>
	</div>
</div>
