<script lang="ts">
	import { page } from '$app/stores';
	import { settings, theme } from '$lib/stores';
	import { onMount } from 'svelte';
	import type { TableOfContents } from '$lib/types/content';
	import { loadTableOfContents, findChapterBySlug, findSectionBySlug } from '$lib/utils/contentLoader';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';

	export let bookSlug: string = '';
	export let bookTitle: string = 'Lesari';
	export let onOpenShortcuts: (() => void) | undefined = undefined;

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

	// Find current chapter and section titles (supports both v1 slugs and v2 numbers)
	$: currentChapter = toc && chapterSlug ? findChapterBySlug(toc, chapterSlug) : undefined;
	$: currentSection = toc && chapterSlug && sectionSlug ? findSectionBySlug(toc, chapterSlug, sectionSlug)?.section : undefined;
	$: isDark = $theme === 'dark';

	// Back navigation: section -> chapter, chapter -> book home, book home -> catalog
	$: backHref = sectionSlug && chapterSlug
		? `/${bookSlug}/kafli/${chapterSlug}`
		: chapterSlug
			? `/${bookSlug}`
			: '/';

	$: backLabel = sectionSlug && chapterSlug
		? 'Til baka í kafla'
		: chapterSlug
			? 'Til baka á heim síðu'
			: 'Til baka í bókasafn';

	function toggleTheme() {
		settings.toggleTheme();
	}

	function toggleSidebar() {
		settings.toggleSidebar();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<header class="header">
	<div class="header-inner">
		<!-- Left: Mobile -->
		<div class="left-mobile">
			<button
				on:click={toggleSidebar}
				class="header-btn sidebar-toggle"
				aria-label="Opna/loka valmynd"
			>
				<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>

			<a href={backHref} class="header-btn" aria-label={backLabel} title={backLabel}>
				<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</a>
		</div>

		<!-- Center: Mobile book title -->
		<div class="center-mobile">
			<span class="mobile-title">{bookTitle}</span>
		</div>

		<!-- Left: Desktop breadcrumb -->
		<nav class="left-desktop" aria-label="Brauðmylsna">
			<a href="/" class="brand-link">Námsbókasafn</a>
			<span class="breadcrumb-sep" aria-hidden="true">›</span>
			<a href="/{bookSlug}" class="breadcrumb-item">{bookTitle}</a>
			{#if currentChapter}
				<span class="breadcrumb-sep" aria-hidden="true">›</span>
				<span class="breadcrumb-item current" aria-current="page">
					{currentChapter.number}. {currentChapter.title}
				</span>
			{/if}
		</nav>

		<!-- Right: actions -->
		<div class="right-actions">
			<!-- Search button -->
			<button
				on:click={() => (searchOpen = true)}
				class="header-btn"
				aria-label="Leita"
				title="Leita (Ctrl+K)"
			>
				<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<kbd class="kbd-hint">Ctrl+K</kbd>
			</button>

			<!-- Keyboard shortcuts button -->
			{#if onOpenShortcuts}
				<button
					on:click={onOpenShortcuts}
					class="header-btn shortcuts-btn"
					aria-label="Flýtilyklar"
					title="Flýtilyklar (?)"
				>
					<span class="shortcuts-label">?</span>
				</button>
			{/if}

			<!-- Settings button -->
			<button
				on:click={() => (settingsOpen = true)}
				class="header-btn settings-btn"
				aria-label="Stillingar"
				title="Stillingar"
			>
				<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

			<!-- Theme toggle -->
			<button
				class="theme-toggle"
				on:click={toggleTheme}
				aria-label={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
				title={isDark ? 'Ljóst þema' : 'Dökkt þema'}
			>
				<svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5" />
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
				</svg>
				<svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			</button>
		</div>
	</div>
</header>

<!-- Search Modal -->
<SearchModal isOpen={searchOpen} {bookSlug} on:close={() => (searchOpen = false)} />

<!-- Settings Modal -->
<SettingsModal isOpen={settingsOpen} on:close={() => (settingsOpen = false)} />

<style>
	/* ====================================
	   HEADER BAR
	   ==================================== */
	.header {
		position: sticky;
		top: 0;
		z-index: 40;
		height: 56px;
		background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-color);
	}

	.header-inner {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		gap: 0.5rem;
	}

	/* ====================================
	   ICON & BUTTON BASE
	   ==================================== */
	.icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.header-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border-radius: var(--radius-md);
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		text-decoration: none;
		flex-shrink: 0;
	}

	.header-btn:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	/* ====================================
	   LEFT SIDE — MOBILE
	   ==================================== */
	.left-mobile {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* Hide hamburger on desktop (sidebar always visible) */
	.sidebar-toggle {
		display: inline-flex;
	}

	@media (min-width: 1024px) {
		.sidebar-toggle {
			display: none;
		}
	}

	/* Hide mobile left on desktop */
	@media (min-width: 1024px) {
		.left-mobile {
			display: none;
		}
	}

	/* ====================================
	   CENTER — MOBILE TITLE
	   ==================================== */
	.center-mobile {
		flex: 1;
		min-width: 0;
		text-align: center;
	}

	.mobile-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	@media (min-width: 1024px) {
		.center-mobile {
			display: none;
		}
	}

	/* ====================================
	   LEFT SIDE — DESKTOP BREADCRUMB
	   ==================================== */
	.left-desktop {
		display: none;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	@media (min-width: 1024px) {
		.left-desktop {
			display: flex;
		}
	}

	.brand-link {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.brand-link:hover {
		color: var(--accent-color);
	}

	.breadcrumb-sep {
		color: var(--text-tertiary);
		font-size: 0.875rem;
		flex-shrink: 0;
		user-select: none;
	}

	.breadcrumb-item {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.15s;
	}

	a.breadcrumb-item:hover {
		color: var(--accent-color);
	}

	.breadcrumb-item.current {
		color: var(--text-primary);
	}

	/* ====================================
	   RIGHT SIDE — ACTIONS
	   ==================================== */
	.right-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	/* Ctrl+K keyboard hint badge */
	.kbd-hint {
		display: none;
		margin-left: 0.375rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		font-family: inherit;
		font-weight: 500;
		color: var(--text-tertiary);
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		line-height: 1.2;
	}

	@media (min-width: 1024px) {
		.kbd-hint {
			display: inline;
		}
	}

	/* Keyboard shortcuts (?) button */
	.shortcuts-btn {
		display: none;
	}

	@media (min-width: 1024px) {
		.shortcuts-btn {
			display: inline-flex;
		}
	}

	.shortcuts-label {
		font-size: 0.875rem;
		font-weight: 600;
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	/* Settings button — hidden on mobile to save space */
	.settings-btn {
		display: none;
	}

	@media (min-width: 1024px) {
		.settings-btn {
			display: inline-flex;
		}
	}

	/* ====================================
	   THEME TOGGLE
	   ==================================== */
	.theme-toggle {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.2s, transform 0.2s;
		position: relative;
		flex-shrink: 0;
	}

	.theme-toggle:hover {
		border-color: var(--accent-color);
		transform: rotate(15deg);
	}

	.theme-toggle svg {
		width: 1rem;
		height: 1rem;
		color: var(--text-secondary);
		position: absolute;
		transition: opacity 0.2s, transform 0.3s;
	}

	.sun-icon { opacity: 1; }
	.moon-icon { opacity: 0; transform: rotate(-90deg); }

	:global(.dark) .sun-icon { opacity: 0; transform: rotate(90deg); }
	:global(.dark) .moon-icon { opacity: 1; transform: rotate(0); }
</style>
