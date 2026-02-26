<!--
  Book Layout - Wraps all book-related pages with Header and Sidebar
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { settings, fontSize, fontFamily, lineHeight, lineWidth } from '$lib/stores';
	import { referenceStore } from '$lib/stores/reference';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import FocusModeNav from '$lib/components/layout/FocusModeNav.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import PomodoroTimer from '$lib/components/PomodoroTimer.svelte';
	import KeyboardShortcutsModal from '$lib/components/KeyboardShortcutsModal.svelte';
	import { keyboardShortcuts } from '$lib/actions/keyboardShortcuts';
	import { trackPageView } from '$lib/utils/api';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	// Track page views when route changes
	let previousPath = '';
	$: {
		const currentPath = $page.url.pathname;
		if (currentPath !== previousPath) {
			previousPath = currentPath;
			const { bookSlug, chapterSlug, sectionSlug } = $page.params;
			trackPageView(bookSlug, chapterSlug, sectionSlug);
		}
	}

	let focusMode = false;
	let showShortcutsModal = false;
	let headerComponent: Header;

	// Load precomputed references when data changes
	$: if (data.references) {
		referenceStore.loadPrecomputedIndex(data.references);
	}

	function toggleFocusMode() {
		focusMode = !focusMode;
	}

	function openShortcuts() {
		showShortcutsModal = true;
	}

	function closeShortcuts() {
		showShortcutsModal = false;
	}

	function openSearch() {
		headerComponent?.openSearch();
	}

	$: bookSlug = $page.params.bookSlug ?? '';

	// Scroll progress bar
	let scrollProgress = 0;

	function handleScrollProgress() {
		const scrollTop = window.scrollY;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		if (docHeight > 0) {
			scrollProgress = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
		} else {
			scrollProgress = 0;
		}
	}
</script>

<svelte:window on:scroll={handleScrollProgress} />

{#if !focusMode}
	<div class="scroll-progress" style="width: {scrollProgress}%"></div>
{/if}

<div
	class="min-h-screen font-size-{$fontSize} line-height-{$lineHeight} line-width-{$lineWidth} {$fontFamily === 'opendyslexic'
		? 'font-opendyslexic'
		: $fontFamily === 'sans'
			? 'font-sans'
			: 'font-serif'} {focusMode ? 'focus-mode' : ''}"
	use:keyboardShortcuts={{
		bookSlug,
		onToggleFocusMode: toggleFocusMode,
		onOpenSearch: openSearch,
		onOpenShortcuts: openShortcuts,
		onCloseModal: closeShortcuts
	}}
>
	<!-- Skip to main content link for keyboard navigation -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--bg-secondary)] focus:text-[var(--text-primary)] focus:rounded-lg focus:border-2 focus:border-[var(--accent-color)] focus:outline-none"
	>
		Hoppa beint í efni
	</a>

	<!-- Hide header in focus mode -->
	{#if !focusMode}
		<Header
			bind:this={headerComponent}
			{bookSlug}
			bookTitle={data.book?.title ?? 'Lesari'}
			onOpenShortcuts={openShortcuts}
		/>
	{/if}

	<div class="flex">
		<!-- Hide sidebar in focus mode -->
		{#if !focusMode}
			<Sidebar {bookSlug} hasPeriodicTable={data.book?.features?.periodicTable ?? false} />
		{/if}

		<!-- Main content area with max-width for comfortable reading -->
		<main
			id="main-content"
			class="flex-1 overflow-x-hidden {focusMode ? '' : 'lg:ml-[320px]'}"
		>
			<div class="mx-auto max-w-7xl px-4 py-6">
				<slot />
			</div>
		</main>
	</div>

	<!-- Focus mode floating navigation -->
	{#if focusMode}
		<FocusModeNav {bookSlug} onExitFocusMode={toggleFocusMode} />
	{/if}

	<!-- Mobile bottom navigation - hidden in focus mode -->
	{#if !focusMode}
		<MobileBottomNav {bookSlug} hasPeriodicTable={data.book?.features?.periodicTable ?? false} />
	{/if}

	<!-- Pomodoro focus timer -->
	<PomodoroTimer />
</div>

<!-- Keyboard Shortcuts Modal -->
<KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={closeShortcuts} />
