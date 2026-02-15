<!--
  NavigationButtons - Previous/Next section navigation with breadcrumb dropdown
-->
<script lang="ts">
	import type { NavigationContext } from '$lib/types/content';
	import { getChapterPath, getSectionPath } from '$lib/utils/contentLoader';

	export let navigation: NavigationContext;
	export let bookSlug: string;

	$: ({ previous, next, current } = navigation);
	$: currentChapterPath = getChapterPath(current.chapter);
	$: currentSectionPath = getSectionPath(current.section);

	let dropdownOpen = false;
	let dropdownRef: HTMLDivElement;

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeDropdown();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			closeDropdown();
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 sm:p-6">
	<div class="mx-auto max-w-3xl">
		<!-- Breadcrumb with dropdown -->
		<div class="mb-4 sm:mb-6 relative" bind:this={dropdownRef}>
			<button
				on:click|stopPropagation={toggleDropdown}
				on:keydown={handleKeydown}
				class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md px-2 py-1 -ml-2 hover:bg-[var(--bg-tertiary)]"
				aria-expanded={dropdownOpen}
				aria-haspopup="listbox"
				aria-label="Velja undirkafla"
			>
				<span class="truncate">
					Kafli {current.chapter.number} › {current.section.number}
					{current.section.title}
				</span>
				<svg
					class="w-4 h-4 flex-shrink-0 transition-transform {dropdownOpen ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<!-- Dropdown list -->
			{#if dropdownOpen}
				<div
					class="absolute left-0 top-full z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg"
					role="listbox"
					aria-label="Undirkaflar"
				>
					{#each current.chapter.sections as section}
						{@const sectionPath = getSectionPath(section)}
						{@const isCurrent = sectionPath === currentSectionPath}
						<a
							href="/{bookSlug}/kafli/{currentChapterPath}/{sectionPath}"
							role="option"
							aria-selected={isCurrent}
							on:click={closeDropdown}
							class="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors {isCurrent
								? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-medium'
								: 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}"
						>
							{#if isCurrent}
								<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{:else}
								<span class="w-4"></span>
							{/if}
							<span class="truncate">{section.number} {section.title}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Navigation buttons -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			{#if previous}
				<a
					href="/{bookSlug}/kafli/{getChapterPath(previous.chapter)}/{getSectionPath(previous.section)}"
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
					href="/{bookSlug}/kafli/{getChapterPath(next.chapter)}/{getSectionPath(next.section)}"
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
