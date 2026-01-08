<script lang="ts">
	import { page } from '$app/stores';
	import { settings, theme } from '$lib/stores';
	import { onMount, onDestroy } from 'svelte';
	import type { TableOfContents } from '$lib/types/content';
	import { loadTableOfContents } from '$lib/utils/contentLoader';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';

	export let bookSlug: string = '';
	export let bookTitle: string = 'Lesari';
	export let onOpenShortcuts: (() => void) | undefined = undefined;
	export let onOpenSearch: (() => void) | undefined = undefined;

	let toc: TableOfContents | null = null;
	let settingsOpen = false;
	let searchOpen = false;

	// Allow parent to open search
	export function openSearch() {
		searchOpen = true;
	}

	// Get current route params
	$: chapterSlug = $page.params.chapterSlug;
	$: sectionSlug = $page.params.sectionSlug;

	// Load table of contents
	onMount(async () => {
		if (bookSlug) {
			try {
				toc = await loadTableOfContents(bookSlug);
			} catch (error) {
				console.error('Gat ekki hlaðið efnisyfirliti:', error);
			}
		}
	});

	// Keyboard shortcut for search (Ctrl/Cmd + K)
	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			searchOpen = true;
		}
	}

	// Find current chapter and section titles
	$: currentChapter = toc?.chapters.find((c) => c.slug === chapterSlug);
	$: currentSection = currentChapter?.sections.find((s) => s.slug === sectionSlug);
	$: isDark = $theme === 'dark';

	function toggleTheme() {
		settings.toggleTheme();
	}

	function toggleSidebar() {
		settings.toggleSidebar();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<header
	class="sticky top-0 z-40 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
>
	<!-- Top bar with logo and controls -->
	<div class="flex h-14 items-center justify-between px-4">
		<!-- Left side: Hamburger menu for mobile and title -->
		<div class="flex items-center gap-3">
			<button
				on:click={toggleSidebar}
				class="-ml-2 rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white lg:hidden"
				aria-label="Opna/loka valmynd"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>

			<!-- Link to catalog -->
			<a
				href="/"
				class="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
				aria-label="Til baka í bókasafn"
				title="Til baka í bókasafn"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
			</a>

			<a
				href="/{bookSlug}"
				class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 no-underline transition-opacity hover:opacity-80"
			>
				{bookTitle}
			</a>
		</div>

		<!-- Right side: Search button, theme button, settings button -->
		<div class="flex items-center gap-1">
			<button
				on:click={() => (searchOpen = true)}
				class="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
				aria-label="Leita"
				title="Leita (Ctrl+K)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</button>

			{#if onOpenShortcuts}
				<button
					on:click={onOpenShortcuts}
					class="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					aria-label="Flýtilyklar"
					title="Flýtilyklar (?)"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
						/>
					</svg>
				</button>
			{/if}

			<button
				on:click={toggleTheme}
				class="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
				aria-label={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
				title={isDark ? 'Ljóst þema' : 'Dökkt þema'}
			>
				{#if isDark}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
						/>
					</svg>
				{/if}
			</button>

			<button
				on:click={() => (settingsOpen = true)}
				class="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
				aria-label="Stillingar"
				title="Stillingar"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Colored banner with current section (only show when viewing a section) -->
	{#if currentChapter && currentSection}
		<div class="bg-[var(--header-banner)] text-[var(--header-banner-text)] px-4 py-3">
			<div class="max-w-7xl mx-auto flex items-center gap-3">
				<a
					href="/{bookSlug}"
					class="text-[var(--header-banner-text)] hover:opacity-80 transition-opacity no-underline"
					aria-label="Til baka á heim síðu"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</a>
				<div>
					<div class="text-sm opacity-90 font-sans">
						{currentChapter.number}. {currentChapter.title}
					</div>
					<div class="text-lg font-bold font-sans">
						{currentSection.number}
						{currentSection.title}
					</div>
				</div>
			</div>
		</div>
	{/if}
</header>

<!-- Search Modal -->
<SearchModal isOpen={searchOpen} {bookSlug} on:close={() => (searchOpen = false)} />

<!-- Settings Modal -->
<SettingsModal isOpen={settingsOpen} on:close={() => (settingsOpen = false)} />
