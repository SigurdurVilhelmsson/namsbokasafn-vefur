<!--
  MobileBottomNav - Floating Action Button (FAB) for mobile study tools
  Shows a 48px circle in the bottom-right corner that expands to reveal
  study tool links (flashcards, glossary, quizzes, periodic table).
  Hidden on desktop (1024px+ breakpoint).
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';

	export let bookSlug: string = '';
	export let hasPeriodicTable: boolean = false;

	let expanded = false;
	let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

	/** Toggle FAB expanded/collapsed state */
	function toggle() {
		expanded = !expanded;
		resetInactivityTimer();
	}

	/** Close the FAB menu */
	function close() {
		expanded = false;
		clearInactivityTimer();
	}

	/** Reset the 5-second inactivity auto-collapse timer */
	function resetInactivityTimer() {
		clearInactivityTimer();
		if (expanded) {
			inactivityTimer = setTimeout(() => {
				expanded = false;
			}, 5000);
		}
	}

	/** Clear the inactivity timer */
	function clearInactivityTimer() {
		if (inactivityTimer) {
			clearTimeout(inactivityTimer);
			inactivityTimer = null;
		}
	}

	/** Handle scroll — collapse immediately */
	function handleScroll() {
		if (expanded) {
			expanded = false;
			clearInactivityTimer();
		}
	}

	/** Close on route change */
	$: if ($page.url.pathname) {
		close();
	}

	onMount(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
	});

	onDestroy(() => {
		clearInactivityTimer();
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', handleScroll);
		}
	});

	/** Study tool definitions */
	$: tools = [
		...(hasPeriodicTable
			? [
					{
						href: `/${bookSlug}/lotukerfi`,
						label: 'Lotukerfi',
						icon: 'periodic-table' as const
					}
				]
			: []),
		{
			href: `/${bookSlug}/prof`,
			label: 'Próf',
			icon: 'quiz' as const
		},
		{
			href: `/${bookSlug}/ordabok`,
			label: 'Orðasafn',
			icon: 'glossary' as const
		},
		{
			href: `/${bookSlug}/minniskort`,
			label: 'Minniskort',
			icon: 'flashcards' as const
		}
	];
</script>

<!-- FAB container — hidden on desktop -->
<div class="fab-container" class:expanded>
	<!-- Backdrop when expanded -->
	{#if expanded}
		<div
			class="fab-backdrop"
			on:click={close}
			on:keydown={close}
			role="presentation"
		></div>
	{/if}

	<!-- Study tool icons stacked above the FAB -->
	<nav
		class="fab-menu"
		class:fab-menu-open={expanded}
		aria-label="Verkfæravalmynd"
	>
		{#each tools as tool, i (tool.icon)}
			<a
				href={tool.href}
				class="fab-menu-item"
				class:fab-menu-item-visible={expanded}
				style="--delay: {i * 50}ms"
				aria-label={tool.label}
				on:click={close}
			>
				{#if tool.icon === 'flashcards'}
					<!-- Flashcards icon (cards) -->
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="4" width="16" height="14" rx="2" />
						<path d="M6 2h12a2 2 0 012 2v12" />
					</svg>
				{:else if tool.icon === 'glossary'}
					<!-- Glossary icon (book) -->
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
				{:else if tool.icon === 'quiz'}
					<!-- Quiz icon (clipboard check) -->
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
						<rect x="9" y="3" width="6" height="4" rx="1" />
						<path d="M9 14l2 2 4-4" />
					</svg>
				{:else if tool.icon === 'periodic-table'}
					<!-- Periodic table icon (atom) -->
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3" />
						<ellipse cx="12" cy="12" rx="9" ry="4" />
						<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
						<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" />
					</svg>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Main FAB button -->
	<button
		class="fab-button"
		class:fab-button-expanded={expanded}
		on:click={toggle}
		aria-label={expanded ? 'Loka verkfæravalmynd' : 'Opna verkfæravalmynd'}
		aria-expanded={expanded}
		aria-controls="fab-menu"
	>
		<!-- Grid icon (4 squares) that rotates 45deg when expanded -->
		<svg
			class="fab-icon"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="currentColor"
		>
			<rect x="3" y="3" width="8" height="8" rx="1.5" />
			<rect x="13" y="3" width="8" height="8" rx="1.5" />
			<rect x="3" y="13" width="8" height="8" rx="1.5" />
			<rect x="13" y="13" width="8" height="8" rx="1.5" />
		</svg>
	</button>
</div>

<style>
	/* FAB container — only visible on mobile */
	.fab-container {
		display: block;
		position: fixed;
		bottom: 16px;
		right: 16px;
		z-index: 40;
		/* Align items to the right and stack upward */
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
	}

	/* Hide on desktop (1024px+) */
	@media (min-width: 1024px) {
		.fab-container {
			display: none;
		}
	}

	/* Semi-transparent backdrop */
	.fab-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 39;
	}

	/* Menu containing study tool items */
	.fab-menu {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		z-index: 41;
		pointer-events: none;
	}

	.fab-menu-open {
		pointer-events: auto;
	}

	/* Individual menu item */
	.fab-menu-item {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-md);
		color: var(--text-primary);
		text-decoration: none;
		/* Start hidden below */
		opacity: 0;
		transform: translateY(20px) scale(0.8);
		transition:
			opacity 150ms ease-out,
			transform 150ms ease-out;
		pointer-events: none;
	}

	/* Visible state — staggered entry via --delay */
	.fab-menu-item-visible {
		opacity: 1;
		transform: translateY(0) scale(1);
		transition:
			opacity 200ms ease-out var(--delay, 0ms),
			transform 200ms ease-out var(--delay, 0ms);
		pointer-events: auto;
	}

	.fab-menu-item:hover {
		background: var(--bg-tertiary, var(--bg-secondary));
	}

	.fab-menu-item:active {
		transform: scale(0.92);
	}

	/* Main FAB button */
	.fab-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		background: var(--accent-color);
		color: white;
		box-shadow: var(--shadow-lg);
		cursor: pointer;
		z-index: 41;
		transition:
			transform 250ms ease,
			box-shadow 200ms ease;
		/* Safe area for devices with home indicator */
		margin-bottom: env(safe-area-inset-bottom, 0px);
	}

	.fab-button:hover {
		box-shadow: var(--shadow-xl, var(--shadow-lg));
	}

	.fab-button:active {
		transform: scale(0.92);
	}

	/* FAB icon rotation when expanded */
	.fab-icon {
		transition: transform 250ms ease;
	}

	.fab-button-expanded .fab-icon {
		transform: rotate(45deg);
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.fab-menu-item {
			transition: none;
		}

		.fab-menu-item-visible {
			transition: none;
		}

		.fab-icon {
			transition: none;
		}

		.fab-button {
			transition: none;
		}
	}
</style>
