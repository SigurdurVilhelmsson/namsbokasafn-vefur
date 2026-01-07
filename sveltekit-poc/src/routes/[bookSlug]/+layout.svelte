<!--
  Book Layout - Wraps all book-related pages with Header and Sidebar
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { settings, fontSize, fontFamily } from '$lib/stores';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import FocusModeNav from '$lib/components/layout/FocusModeNav.svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	let focusMode = false;
	let showShortcutsModal = false;

	function toggleFocusMode() {
		focusMode = !focusMode;
	}

	function openShortcuts() {
		showShortcutsModal = true;
	}

	$: bookSlug = $page.params.bookSlug ?? '';
</script>

<div
	class="min-h-screen font-size-{$fontSize} {$fontFamily === 'sans'
		? 'font-sans'
		: 'font-serif'} {focusMode ? 'focus-mode' : ''}"
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
			class="flex-1 overflow-x-hidden {focusMode ? '' : 'lg:ml-80'}"
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
</div>
