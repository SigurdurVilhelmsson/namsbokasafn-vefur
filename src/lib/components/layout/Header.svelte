<script lang="ts">
	import { page } from '$app/stores';
	import { settings, theme } from '$lib/stores';
	import { onMount } from 'svelte';
	import type { TableOfContents } from '$lib/types/content';
	import { loadTableOfContents, findChapterBySlug, findSectionBySlug } from '$lib/utils/contentLoader';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		bookSlug?: string;
		bookTitle?: string;
		onOpenShortcuts?: () => void;
	}
	let { bookSlug = '', bookTitle = 'Lesari', onOpenShortcuts }: Props = $props();

	let toc: TableOfContents | null = $state(null);
	let settingsOpen = $state(false);
	let searchOpen = $state(false);

	// Allow parent to open search
	export function openSearch() {
		searchOpen = true;
	}

	// Get current route params
	let chapterSlug = $derived($page.params.chapterSlug);
	let sectionSlug = $derived($page.params.sectionSlug);

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
	let currentChapter = $derived(toc && chapterSlug ? findChapterBySlug(toc, chapterSlug) : undefined);
	let currentSection = $derived(toc && chapterSlug && sectionSlug ? findSectionBySlug(toc, chapterSlug, sectionSlug)?.section : undefined);
	let isDark = $derived($theme === 'dark');

	// Back navigation: section -> chapter, chapter -> book home, book home -> catalog
	let backHref = $derived(sectionSlug && chapterSlug
		? `/${bookSlug}/kafli/${chapterSlug}`
		: chapterSlug
			? `/${bookSlug}`
			: '/');

	let backLabel = $derived(sectionSlug && chapterSlug
		? 'Til baka í kafla'
		: chapterSlug
			? 'Til baka á heim síðu'
			: 'Til baka í bókasafn');

	function toggleTheme() {
		settings.toggleTheme();
	}

	function toggleSidebar() {
		settings.toggleSidebar();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="header">
	<div class="header-inner">
		<!-- Left: Mobile -->
		<div class="left-mobile">
			<button
				onclick={toggleSidebar}
				class="header-btn sidebar-toggle"
				aria-label="Opna/loka valmynd"
			>
				<Icon name="menu" />
			</button>

			<a href={backHref} class="header-btn" aria-label={backLabel} title={backLabel}>
				<Icon name="chevron-left" />
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
				onclick={() => (searchOpen = true)}
				class="header-btn"
				aria-label="Leita"
				title="Leita (Ctrl+K)"
			>
				<Icon name="search" />
				<kbd class="kbd-hint">Ctrl+K</kbd>
			</button>

			<!-- Keyboard shortcuts button -->
			{#if onOpenShortcuts}
				<button
					onclick={onOpenShortcuts}
					class="header-btn shortcuts-btn"
					aria-label="Flýtilyklar"
					title="Flýtilyklar (?)"
				>
					<span class="shortcuts-label">?</span>
				</button>
			{/if}

			<!-- Settings button -->
			<button
				onclick={() => (settingsOpen = true)}
				class="header-btn settings-btn"
				aria-label="Stillingar"
				title="Stillingar"
			>
				<Icon name="settings" />
			</button>

			<!-- Theme toggle -->
			<button
				class="theme-toggle"
				onclick={toggleTheme}
				aria-label={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
				title={isDark ? 'Ljóst þema' : 'Dökkt þema'}
			>
				<span class="sun-icon"><Icon name="sun" size="sm" /></span>
				<span class="moon-icon"><Icon name="moon" size="sm" /></span>
			</button>
		</div>
	</div>
</header>

<!-- Search Modal -->
<SearchModal isOpen={searchOpen} {bookSlug} onClose={() => (searchOpen = false)} />

<!-- Settings Modal -->
<SettingsModal isOpen={settingsOpen} onClose={() => (settingsOpen = false)} />

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
	   BUTTON BASE
	   ==================================== */
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
		align-items: baseline;
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

	.theme-toggle .sun-icon,
	.theme-toggle .moon-icon {
		position: absolute;
		display: inline-flex;
		color: var(--text-secondary);
		transition: opacity 0.2s, transform 0.3s;
	}

	.sun-icon { opacity: 1; }
	.moon-icon { opacity: 0; transform: rotate(-90deg); }

	:global(.dark) .sun-icon { opacity: 0; transform: rotate(90deg); }
	:global(.dark) .moon-icon { opacity: 1; transform: rotate(0); }
</style>
