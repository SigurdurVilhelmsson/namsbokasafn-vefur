<!--
  Interactive Periodic Table - SvelteKit version
  Migrated from React PeriodicTable.tsx
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import {
		ELEMENTS,
		CATEGORY_LABELS,
		CATEGORY_COLORS,
		getElementPhase,
		type Element,
		type ElementCategory
	} from '$lib/data/elements';

	// Props
	export let highlightElements: number[] = [];
	export let bookSlug: string = '';

	const dispatch = createEventDispatcher<{ select: Element }>();

	// State
	let selectedElement: Element | null = null;
	let filterCategory: ElementCategory | null = null;
	let searchQuery = '';
	let focusedIndex: number | null = null;

	// Grid positions for standard periodic table layout
	const ELEMENT_POSITIONS: Record<number, { row: number; col: number }> = {
		// Period 1
		1: { row: 0, col: 0 }, 2: { row: 0, col: 17 },
		// Period 2
		3: { row: 1, col: 0 }, 4: { row: 1, col: 1 },
		5: { row: 1, col: 12 }, 6: { row: 1, col: 13 }, 7: { row: 1, col: 14 },
		8: { row: 1, col: 15 }, 9: { row: 1, col: 16 }, 10: { row: 1, col: 17 },
		// Period 3
		11: { row: 2, col: 0 }, 12: { row: 2, col: 1 },
		13: { row: 2, col: 12 }, 14: { row: 2, col: 13 }, 15: { row: 2, col: 14 },
		16: { row: 2, col: 15 }, 17: { row: 2, col: 16 }, 18: { row: 2, col: 17 },
		// Period 4
		19: { row: 3, col: 0 }, 20: { row: 3, col: 1 }, 21: { row: 3, col: 2 },
		22: { row: 3, col: 3 }, 23: { row: 3, col: 4 }, 24: { row: 3, col: 5 },
		25: { row: 3, col: 6 }, 26: { row: 3, col: 7 }, 27: { row: 3, col: 8 },
		28: { row: 3, col: 9 }, 29: { row: 3, col: 10 }, 30: { row: 3, col: 11 },
		31: { row: 3, col: 12 }, 32: { row: 3, col: 13 }, 33: { row: 3, col: 14 },
		34: { row: 3, col: 15 }, 35: { row: 3, col: 16 }, 36: { row: 3, col: 17 },
		// Period 5
		37: { row: 4, col: 0 }, 38: { row: 4, col: 1 }, 39: { row: 4, col: 2 },
		40: { row: 4, col: 3 }, 41: { row: 4, col: 4 }, 42: { row: 4, col: 5 },
		43: { row: 4, col: 6 }, 44: { row: 4, col: 7 }, 45: { row: 4, col: 8 },
		46: { row: 4, col: 9 }, 47: { row: 4, col: 10 }, 48: { row: 4, col: 11 },
		49: { row: 4, col: 12 }, 50: { row: 4, col: 13 }, 51: { row: 4, col: 14 },
		52: { row: 4, col: 15 }, 53: { row: 4, col: 16 }, 54: { row: 4, col: 17 },
		// Period 6
		55: { row: 5, col: 0 }, 56: { row: 5, col: 1 },
		72: { row: 5, col: 3 }, 73: { row: 5, col: 4 }, 74: { row: 5, col: 5 },
		75: { row: 5, col: 6 }, 76: { row: 5, col: 7 }, 77: { row: 5, col: 8 },
		78: { row: 5, col: 9 }, 79: { row: 5, col: 10 }, 80: { row: 5, col: 11 },
		81: { row: 5, col: 12 }, 82: { row: 5, col: 13 }, 83: { row: 5, col: 14 },
		84: { row: 5, col: 15 }, 85: { row: 5, col: 16 }, 86: { row: 5, col: 17 },
		// Period 7
		87: { row: 6, col: 0 }, 88: { row: 6, col: 1 },
		104: { row: 6, col: 3 }, 105: { row: 6, col: 4 }, 106: { row: 6, col: 5 },
		107: { row: 6, col: 6 }, 108: { row: 6, col: 7 }, 109: { row: 6, col: 8 },
		110: { row: 6, col: 9 }, 111: { row: 6, col: 10 }, 112: { row: 6, col: 11 },
		113: { row: 6, col: 12 }, 114: { row: 6, col: 13 }, 115: { row: 6, col: 14 },
		116: { row: 6, col: 15 }, 117: { row: 6, col: 16 }, 118: { row: 6, col: 17 },
		// Lanthanides (row 8)
		57: { row: 8, col: 3 }, 58: { row: 8, col: 4 }, 59: { row: 8, col: 5 },
		60: { row: 8, col: 6 }, 61: { row: 8, col: 7 }, 62: { row: 8, col: 8 },
		63: { row: 8, col: 9 }, 64: { row: 8, col: 10 }, 65: { row: 8, col: 11 },
		66: { row: 8, col: 12 }, 67: { row: 8, col: 13 }, 68: { row: 8, col: 14 },
		69: { row: 8, col: 15 }, 70: { row: 8, col: 16 }, 71: { row: 8, col: 17 },
		// Actinides (row 9)
		89: { row: 9, col: 3 }, 90: { row: 9, col: 4 }, 91: { row: 9, col: 5 },
		92: { row: 9, col: 6 }, 93: { row: 9, col: 7 }, 94: { row: 9, col: 8 },
		95: { row: 9, col: 9 }, 96: { row: 9, col: 10 }, 97: { row: 9, col: 11 },
		98: { row: 9, col: 12 }, 99: { row: 9, col: 13 }, 100: { row: 9, col: 14 },
		101: { row: 9, col: 15 }, 102: { row: 9, col: 16 }, 103: { row: 9, col: 17 }
	};

	// Reactive: filtered elements based on search
	$: filteredElements = ELEMENTS.filter((el) => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return (
			el.name.toLowerCase().includes(q) ||
			el.nameIs.toLowerCase().includes(q) ||
			el.symbol.toLowerCase().includes(q) ||
			el.atomicNumber.toString() === searchQuery
		);
	});

	$: searchMatchIds = new Set(filteredElements.map((el) => el.atomicNumber));

	// Categories for legend
	const categories = Object.entries(CATEGORY_LABELS) as [ElementCategory, string][];

	function handleElementClick(element: Element) {
		selectedElement = element;
		dispatch('select', element);
	}

	function closeModal() {
		selectedElement = null;
	}

	function navigateElement(direction: 'prev' | 'next') {
		if (!selectedElement) return;
		const currentIndex = ELEMENTS.findIndex((el) => el.atomicNumber === selectedElement!.atomicNumber);
		const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
		if (newIndex >= 0 && newIndex < ELEMENTS.length) {
			selectedElement = ELEMENTS[newIndex];
		}
	}

	function handleKeyDown(e: KeyboardEvent, element: Element) {
		const pos = ELEMENT_POSITIONS[element.atomicNumber];
		if (!pos) return;

		let targetRow = pos.row;
		let targetCol = pos.col;

		switch (e.key) {
			case 'ArrowUp': targetRow = pos.row - 1; break;
			case 'ArrowDown': targetRow = pos.row + 1; break;
			case 'ArrowLeft': targetCol = pos.col - 1; break;
			case 'ArrowRight': targetCol = pos.col + 1; break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				handleElementClick(element);
				return;
			default:
				return;
		}

		e.preventDefault();
		const targetElement = ELEMENTS.find((el) => {
			const elPos = ELEMENT_POSITIONS[el.atomicNumber];
			return elPos && elPos.row === targetRow && elPos.col === targetCol;
		});

		if (targetElement) {
			focusedIndex = targetElement.atomicNumber;
			const button = document.querySelector(`[data-atomic-number="${targetElement.atomicNumber}"]`) as HTMLButtonElement;
			button?.focus();
		}
	}

	function handleModalKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
		else if (e.key === 'ArrowLeft' && selectedElement && selectedElement.atomicNumber > 1) navigateElement('prev');
		else if (e.key === 'ArrowRight' && selectedElement && selectedElement.atomicNumber < 118) navigateElement('next');
	}

	function getPhaseLabel(element: Element): string {
		const phase = getElementPhase(element);
		if (phase === 'solid') return 'Fast';
		if (phase === 'liquid') return 'Fljótandi';
		return 'Gas';
	}
</script>

<svelte:window on:keydown={selectedElement ? handleModalKeyDown : undefined} />

<div class="space-y-4">
	<!-- Search and filters -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="relative">
			<svg class="pte-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Leita að frumefni..."
				class="pte-search-input"
				aria-label="Leita að frumefni"
			/>
		</div>

		<div class="flex items-center gap-2 text-sm" style="color: var(--text-tertiary);">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
			</svg>
			<span>{searchQuery ? `${filteredElements.length} fundust` : '118 frumefni'}</span>
		</div>
	</div>

	<!-- Legend -->
	<div class="flex flex-wrap justify-center gap-2">
		<button
			on:click={() => (filterCategory = null)}
			class="pte-filter-btn"
			class:pte-filter-btn--active={filterCategory === null}
		>
			Allt
		</button>
		{#each categories as [category, label]}
			{@const colors = CATEGORY_COLORS[category]}
			<button
				on:click={() => (filterCategory = category)}
				class="rounded-full px-3 py-1 text-xs font-medium transition-all {filterCategory === category
					? 'pte-filter-category--active'
					: 'opacity-80 hover:opacity-100'}"
				style="background-color: {colors.bg}; color: {colors.text}; {filterCategory === category ? `outline: 2px solid var(--accent-color); outline-offset: 1px;` : ''}"
			>
				{label}
			</button>
		{/each}
	</div>

	<!-- Periodic table grid -->
	<div class="overflow-x-auto" role="grid" aria-label="Lotukerfið">
		<div
			class="grid min-w-[900px] gap-0.5"
			style="grid-template-columns: repeat(18, minmax(48px, 1fr)); grid-template-rows: repeat(10, minmax(52px, 64px));"
		>
			{#each ELEMENTS as element (element.atomicNumber)}
				{@const pos = ELEMENT_POSITIONS[element.atomicNumber]}
				{@const colors = CATEGORY_COLORS[element.category]}
				{@const isHighlighted = highlightElements.includes(element.atomicNumber)}
				{@const isFiltered = (filterCategory !== null && element.category !== filterCategory) || (searchQuery !== '' && !searchMatchIds.has(element.atomicNumber))}
				{@const isFocused = focusedIndex === element.atomicNumber}
				{#if pos}
					<div style="grid-row: {pos.row + 1}; grid-column: {pos.col + 1};">
						<button
							on:click={() => handleElementClick(element)}
							on:keydown={(e) => handleKeyDown(e, element)}
							data-atomic-number={element.atomicNumber}
							class="group relative flex h-full w-full flex-col items-center justify-center rounded border p-0.5 text-center transition-all duration-200 focus:outline-none
								{isFiltered ? 'opacity-25' : ''}"
							style="background-color: {colors.bg}; border-color: {colors.border}; color: {colors.text};
								{isHighlighted || isFocused ? `outline: 2px solid var(--accent-color); outline-offset: 1px;` : ''}"
							aria-label="{element.nameIs} ({element.symbol}), sætistala {element.atomicNumber}"
						>
							<span class="absolute left-0.5 top-0 text-[clamp(0.4rem,0.7vw,0.6rem)] opacity-70">{element.atomicNumber}</span>
							<span class="text-[clamp(0.75rem,1.2vw,1.125rem)] font-bold leading-tight">{element.symbol}</span>
							<span class="hidden text-[clamp(0.4rem,0.65vw,0.75rem)] leading-tight opacity-80 sm:block overflow-hidden text-ellipsis whitespace-nowrap max-w-full px-0.5">{element.nameIs}</span>
							<span class="hidden text-[clamp(0.4rem,0.6vw,0.6rem)] opacity-60 md:block">{element.atomicMass.toFixed(2)}</span>
						</button>
					</div>
				{/if}
			{/each}

			<!-- Lanthanide/Actinide labels -->
			<div style="grid-row: 6; grid-column: 3;" class="pte-series-label">57-71</div>
			<div style="grid-row: 7; grid-column: 3;" class="pte-series-label">89-103</div>
		</div>
	</div>
</div>

<!-- Element detail modal -->
{#if selectedElement}
	{@const colors = CATEGORY_COLORS[selectedElement.category]}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
		on:click={closeModal}
		on:keydown={handleModalKeyDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="element-modal-title"
		tabindex="-1"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="pte-modal"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="presentation"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="sticky top-0 flex items-center justify-between p-4" style="background-color: {colors.bg};">
				<div class="flex items-center gap-4">
					<div class="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 bg-white/20" style="border-color: {colors.border};">
						<span class="text-xs opacity-70">{selectedElement.atomicNumber}</span>
						<span class="text-3xl font-bold" style="color: {colors.text};">{selectedElement.symbol}</span>
						<span class="text-xs opacity-70">{selectedElement.atomicMass.toFixed(4)}</span>
					</div>
					<div>
						<h2 id="element-modal-title" class="text-2xl font-bold" style="color: {colors.text}; font-family: 'Bricolage Grotesque', system-ui, sans-serif;">
							{selectedElement.nameIs}
						</h2>
						<p class="text-sm opacity-80" style="color: {colors.text};">{selectedElement.name}</p>
						<span class="mt-1 inline-block rounded-full px-2 py-0.5 text-xs" style="background-color: {colors.border}; color: {colors.text};">
							{CATEGORY_LABELS[selectedElement.category]}
						</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						on:click={() => navigateElement('prev')}
						disabled={selectedElement.atomicNumber <= 1}
						class="rounded-full p-2 transition-colors hover:bg-black/10 disabled:opacity-30"
						aria-label="Fyrra frumefni"
					>
						<svg class="w-5 h-5" style="color: {colors.text};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<button
						on:click={() => navigateElement('next')}
						disabled={selectedElement.atomicNumber >= 118}
						class="rounded-full p-2 transition-colors hover:bg-black/10 disabled:opacity-30"
						aria-label="Næsta frumefni"
					>
						<svg class="w-5 h-5" style="color: {colors.text};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
					<button
						on:click={closeModal}
						class="rounded-full p-2 transition-colors hover:bg-black/10"
						aria-label="Loka"
					>
						<svg class="w-5 h-5" style="color: {colors.text};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6">
				{#if selectedElement.description}
					<p class="pte-description">{selectedElement.description}</p>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<!-- Atomic properties -->
					<div class="pte-detail-card">
						<h3 class="pte-detail-title">
							<svg class="w-4 h-4" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="10" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							Eiginleikar
						</h3>
						<dl class="pte-detail-list">
							<div class="pte-detail-row">
								<dt>Sætistala</dt>
								<dd>{selectedElement.atomicNumber}</dd>
							</div>
							<div class="pte-detail-row">
								<dt>Atómmassi</dt>
								<dd>{selectedElement.atomicMass} u</dd>
							</div>
							<div class="pte-detail-row">
								<dt>Lota</dt>
								<dd>{selectedElement.period}</dd>
							</div>
							<div class="pte-detail-row">
								<dt>Flokkur</dt>
								<dd>{selectedElement.group ?? '—'}</dd>
							</div>
							<div class="pte-detail-row">
								<dt>Blokk</dt>
								<dd>{selectedElement.block}</dd>
							</div>
						</dl>
					</div>

					<!-- Electronic properties -->
					<div class="pte-detail-card">
						<h3 class="pte-detail-title">
							<svg class="w-4 h-4" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							Rafeindir
						</h3>
						<dl class="pte-detail-list">
							<div class="pte-detail-row">
								<dt>Rafeindaskipan</dt>
								<dd class="font-mono text-xs">{selectedElement.electronConfiguration}</dd>
							</div>
							<div class="pte-detail-row">
								<dt>Oxunartölur</dt>
								<dd>{selectedElement.oxidationStates.join(', ')}</dd>
							</div>
							{#if selectedElement.electronegativity}
								<div class="pte-detail-row">
									<dt>Rafneikvæðni</dt>
									<dd>{selectedElement.electronegativity}</dd>
								</div>
							{/if}
						</dl>
					</div>

					<!-- Physical properties -->
					<div class="pte-detail-card">
						<h3 class="pte-detail-title">
							<svg class="w-4 h-4" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							Eðliseiginleikar
						</h3>
						<dl class="pte-detail-list">
							{#if selectedElement.meltingPoint}
								<div class="pte-detail-row">
									<dt>Bræðslumark</dt>
									<dd>{selectedElement.meltingPoint} K</dd>
								</div>
							{/if}
							{#if selectedElement.boilingPoint}
								<div class="pte-detail-row">
									<dt>Suðumark</dt>
									<dd>{selectedElement.boilingPoint} K</dd>
								</div>
							{/if}
							{#if selectedElement.density}
								<div class="pte-detail-row">
									<dt>Eðlismassi</dt>
									<dd>{selectedElement.density} g/cm³</dd>
								</div>
							{/if}
						</dl>
					</div>

					<!-- Classification -->
					<div class="pte-detail-card">
						<h3 class="pte-detail-title">
							<svg class="w-4 h-4" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
							Flokkun
						</h3>
						<dl class="pte-detail-list">
							<div class="pte-detail-row">
								<dt>Tegund</dt>
								<dd>{CATEGORY_LABELS[selectedElement.category]}</dd>
							</div>
							<div class="pte-detail-row">
								<dt>Ástand við 25°C</dt>
								<dd>{getPhaseLabel(selectedElement)}</dd>
							</div>
						</dl>
					</div>
				</div>

				<!-- Link to glossary -->
				<div class="mt-6 flex justify-center">
					<a
						href="/{bookSlug}/ordabok?search={encodeURIComponent(selectedElement.nameIs)}"
						class="pte-glossary-link"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						Leita í orðabók
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Search */
	.pte-search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--text-tertiary);
	}
	.pte-search-input {
		width: 100%;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 0.5rem 1rem 0.5rem 2.25rem;
		font-size: 0.875rem;
		color: var(--text-primary);
	}
	.pte-search-input::placeholder {
		color: var(--text-tertiary);
	}
	.pte-search-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 20%, transparent);
	}
	@media (min-width: 640px) {
		.pte-search-input { width: 16rem; }
	}

	/* Filter buttons */
	.pte-filter-btn {
		border-radius: 9999px;
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 0.15s;
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
	}
	.pte-filter-btn--active {
		background-color: var(--accent-color);
		color: white;
	}

	/* Series labels */
	.pte-series-label {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* Modal */
	.pte-modal {
		position: relative;
		max-height: 90vh;
		width: 100%;
		max-width: 42rem;
		overflow-y: auto;
		border-radius: var(--radius-xl);
		background-color: var(--bg-secondary);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}
	.pte-description {
		margin-bottom: 1.5rem;
		color: var(--text-secondary);
	}

	/* Detail cards */
	.pte-detail-card {
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--bg-tertiary);
		padding: 1rem;
	}
	.pte-detail-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.75rem;
	}
	.pte-detail-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	.pte-detail-row {
		display: flex;
		justify-content: space-between;
	}
	.pte-detail-row dt {
		color: var(--text-tertiary);
	}
	.pte-detail-row dd {
		font-weight: 500;
		color: var(--text-primary);
	}

	/* Glossary link */
	.pte-glossary-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		transition: background-color 0.15s;
	}
	.pte-glossary-link:hover {
		background-color: var(--bg-tertiary);
	}
</style>
