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

<div class="section-nav-wrapper">
	<div class="section-nav-inner">
		<!-- Breadcrumb with dropdown -->
		<div class="section-nav-breadcrumb" bind:this={dropdownRef}>
			<button
				on:click|stopPropagation={toggleDropdown}
				on:keydown={handleKeydown}
				class="breadcrumb-btn"
				aria-expanded={dropdownOpen}
				aria-haspopup="listbox"
				aria-label="Velja undirkafla"
			>
				<span class="truncate">
					Kafli {current.chapter.number} › {current.section.number}
					{current.section.title}
				</span>
				<svg
					class="breadcrumb-chevron {dropdownOpen ? 'open' : ''}"
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
					class="breadcrumb-dropdown"
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
							class="breadcrumb-option {isCurrent ? 'current' : ''}"
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
		<div class="nav-buttons">
			<!-- Mobile: next on top (primary), previous below (secondary) -->
			<!-- Desktop: previous left, next right -->
			{#if next}
				<a
					href="/{bookSlug}/kafli/{getChapterPath(next.chapter)}/{getSectionPath(next.section)}"
					data-sveltekit-preload-data="hover"
					class="nav-btn nav-btn-next"
				>
					<div class="nav-btn-text">
						<span class="nav-btn-label">Næsti kafli</span>
						<span class="nav-btn-title">
							{next.section.number} {next.section.title}
						</span>
					</div>
					<svg
						class="nav-btn-arrow"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{/if}

			{#if previous}
				<a
					href="/{bookSlug}/kafli/{getChapterPath(previous.chapter)}/{getSectionPath(previous.section)}"
					data-sveltekit-preload-data="hover"
					class="nav-btn nav-btn-prev"
				>
					<svg
						class="nav-btn-arrow"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<div class="nav-btn-text">
						<span class="nav-btn-label">Fyrri kafli</span>
						<span class="nav-btn-title">
							{previous.section.number} {previous.section.title}
						</span>
					</div>
				</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.section-nav-wrapper {
		border-top: 1px solid var(--border-color);
		background: var(--bg-secondary);
		padding: 1rem;
	}

	@media (min-width: 640px) {
		.section-nav-wrapper {
			padding: 1.5rem;
		}
	}

	.section-nav-inner {
		max-width: 48rem;
		margin: 0 auto;
	}

	/* Breadcrumb */
	.section-nav-breadcrumb {
		position: relative;
		margin-bottom: 1rem;
	}

	@media (min-width: 640px) {
		.section-nav-breadcrumb {
			margin-bottom: 1.5rem;
		}
	}

	.breadcrumb-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		transition: color 0.15s, background-color 0.15s;
		border-radius: var(--radius-md);
		padding: 0.25rem 0.5rem;
		margin-left: -0.5rem;
	}

	.breadcrumb-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.breadcrumb-chevron {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		transition: transform 0.2s;
	}

	.breadcrumb-chevron.open {
		transform: rotate(180deg);
	}

	.breadcrumb-dropdown {
		position: absolute;
		left: 0;
		top: 100%;
		z-index: 20;
		margin-top: 0.25rem;
		width: 100%;
		max-height: 16rem;
		overflow-y: auto;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background: var(--bg-primary);
		box-shadow: var(--shadow-lg);
	}

	.breadcrumb-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		transition: background-color 0.15s;
		color: var(--text-primary);
	}

	.breadcrumb-option:hover {
		background: var(--bg-secondary);
	}

	.breadcrumb-option.current {
		background: color-mix(in srgb, var(--accent-color) 10%, transparent);
		color: var(--accent-color);
		font-weight: 500;
	}

	/* Navigation buttons */
	.nav-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.nav-buttons {
			flex-direction: row-reverse;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
		}
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-radius: var(--radius-lg);
		padding: 0.75rem 1rem;
		transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
	}

	@media (min-width: 640px) {
		.nav-btn {
			max-width: 48%;
		}

		.nav-btn:hover {
			transform: translateY(-1px);
			box-shadow: var(--shadow-md);
		}
	}

	/* Next button: primary on mobile, outlined on desktop */
	.nav-btn-next {
		background: var(--accent-color);
		color: #ffffff;
		height: 56px;
		justify-content: space-between;
	}

	.nav-btn-next .nav-btn-label {
		color: rgba(255, 255, 255, 0.8);
	}

	.nav-btn-next .nav-btn-arrow {
		color: rgba(255, 255, 255, 0.8);
	}

	@media (min-width: 640px) {
		.nav-btn-next {
			background: transparent;
			color: var(--text-primary);
			border: 1px solid var(--border-color);
			height: auto;
			margin-left: auto;
		}

		.nav-btn-next .nav-btn-label {
			color: var(--text-secondary);
		}

		.nav-btn-next .nav-btn-arrow {
			color: var(--text-secondary);
		}

		.nav-btn-next:hover {
			border-color: var(--accent-color);
			background: color-mix(in srgb, var(--accent-color) 5%, transparent);
		}

		.nav-btn-next:hover .nav-btn-arrow {
			color: var(--accent-color);
		}

		.nav-btn-next .nav-btn-text {
			text-align: right;
		}
	}

	/* Previous button: secondary on mobile, outlined on desktop */
	.nav-btn-prev {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		height: 56px;
	}

	.nav-btn-prev .nav-btn-label {
		color: var(--text-secondary);
	}

	.nav-btn-prev .nav-btn-arrow {
		color: var(--text-secondary);
	}

	@media (min-width: 640px) {
		.nav-btn-prev {
			height: auto;
		}

		.nav-btn-prev:hover {
			border-color: var(--accent-color);
			background: color-mix(in srgb, var(--accent-color) 5%, transparent);
		}

		.nav-btn-prev:hover .nav-btn-arrow {
			color: var(--accent-color);
		}
	}

	/* Shared button internals */
	.nav-btn-text {
		min-width: 0;
		flex: 1;
		text-align: left;
	}

	.nav-btn-label {
		display: block;
		font-size: 0.75rem;
	}

	.nav-btn-title {
		display: block;
		font-family: sans-serif;
		font-size: 0.875rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav-btn-arrow {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		transition: color 0.15s;
	}
</style>
