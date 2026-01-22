<!--
  MobileBottomNav - Fixed bottom navigation bar for mobile devices
  Shows quick access to main study tools and sidebar toggle
  Hidden on desktop (lg: breakpoint and above)
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { settings } from '$lib/stores';

	export let bookSlug: string = '';
	export let hasPeriodicTable: boolean = false;

	// Determine active tab based on current route
	$: currentPath = $page.url.pathname;
	$: isBookHome = currentPath === `/${bookSlug}` || currentPath === `/${bookSlug}/`;
	$: isFlashcards = currentPath.includes('/minniskort');
	$: isGlossary = currentPath.includes('/ordabok');
	$: isPeriodicTable = currentPath.includes('/lotukerfi');
	$: isReading = currentPath.includes('/kafli/');

	function toggleSidebar() {
		settings.toggleSidebar();
	}
</script>

<!-- Mobile bottom navigation - hidden on desktop -->
<nav
	class="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-bottom"
	aria-label="Aðalvalmynd"
>
	<div class="flex items-center justify-around h-16">
		<!-- Home / Book -->
		<a
			href="/{bookSlug}"
			class="flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors {isBookHome
				? 'text-[var(--accent-color)]'
				: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
			aria-label="Heim"
			aria-current={isBookHome ? 'page' : undefined}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
			<span class="text-xs mt-1 font-medium">Heim</span>
		</a>

		<!-- Flashcards -->
		<a
			href="/{bookSlug}/minniskort"
			class="flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors {isFlashcards
				? 'text-[var(--accent-color)]'
				: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
			aria-label="Minniskort"
			aria-current={isFlashcards ? 'page' : undefined}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>
			<span class="text-xs mt-1 font-medium">Kort</span>
		</a>

		<!-- Glossary -->
		<a
			href="/{bookSlug}/ordabok"
			class="flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors {isGlossary
				? 'text-[var(--accent-color)]'
				: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
			aria-label="Orðasafn"
			aria-current={isGlossary ? 'page' : undefined}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
			</svg>
			<span class="text-xs mt-1 font-medium">Orðasafn</span>
		</a>

		<!-- Periodic Table (only if book has it) -->
		{#if hasPeriodicTable}
			<a
				href="/{bookSlug}/lotukerfi"
				class="flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors {isPeriodicTable
					? 'text-[var(--accent-color)]'
					: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
				aria-label="Lotukerfi"
				aria-current={isPeriodicTable ? 'page' : undefined}
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="3" stroke-width="2" />
					<ellipse cx="12" cy="12" rx="9" ry="4" stroke-width="2" />
					<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" stroke-width="2" />
					<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" stroke-width="2" />
				</svg>
				<span class="text-xs mt-1 font-medium">Lotukerfi</span>
			</a>
		{/if}

		<!-- Menu / Sidebar toggle -->
		<button
			on:click={toggleSidebar}
			class="flex flex-col items-center justify-center flex-1 h-full min-w-[64px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
			aria-label="Opna valmynd"
			aria-haspopup="menu"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<span class="text-xs mt-1 font-medium">Valmynd</span>
		</button>
	</div>
</nav>

<style>
	/* Safe area padding for devices with home indicator (iPhone X+) */
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
</style>
