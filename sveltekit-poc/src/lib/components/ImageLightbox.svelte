<!--
  ImageLightbox - Full-screen image viewer with zoom, pan, and navigation
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export interface FigureData {
		src: string;
		alt: string;
		caption?: string;
		figureNumber?: number;
		chapterNumber?: number;
	}

	export let figure: FigureData;
	export let figures: FigureData[] = [];
	export let currentIndex: number = 0;
	export let onClose: () => void;
	export let onNavigate: ((index: number) => void) | undefined = undefined;

	let zoom = 1;
	let pan = { x: 0, y: 0 };
	let isDragging = false;
	let dragStart = { x: 0, y: 0 };
	let showInfo = true;

	$: hasPrev = figures.length > 0 && currentIndex > 0;
	$: hasNext = figures.length > 0 && currentIndex < figures.length - 1;

	function handleZoomIn() {
		zoom = Math.min(zoom + 0.25, 4);
	}

	function handleZoomOut() {
		zoom = Math.max(zoom - 0.25, 0.5);
		if (zoom === 1) {
			pan = { x: 0, y: 0 };
		}
	}

	function handleResetZoom() {
		zoom = 1;
		pan = { x: 0, y: 0 };
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		const newZoom = Math.max(0.5, Math.min(4, zoom + delta));
		if (newZoom === 1) {
			pan = { x: 0, y: 0 };
		}
		zoom = newZoom;
	}

	function handleMouseDown(e: MouseEvent) {
		if (zoom > 1) {
			isDragging = true;
			dragStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			pan = {
				x: e.clientX - dragStart.x,
				y: e.clientY - dragStart.y
			};
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleDownload() {
		const link = document.createElement('a');
		link.href = figure.src;
		link.download = figure.alt || 'figure';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function handleKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case 'Escape':
				onClose();
				break;
			case 'ArrowLeft':
				if (hasPrev && onNavigate) {
					onNavigate(currentIndex - 1);
				}
				break;
			case 'ArrowRight':
				if (hasNext && onNavigate) {
					onNavigate(currentIndex + 1);
				}
				break;
			case '+':
			case '=':
				handleZoomIn();
				break;
			case '-':
				handleZoomOut();
				break;
			case '0':
				handleResetZoom();
				break;
			case 'i':
			case 'I':
				showInfo = !showInfo;
				break;
		}
	}

	onMount(() => {
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		document.body.style.overflow = '';
		window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div
	class="fixed inset-0 z-50 flex flex-col bg-black/95"
	role="dialog"
	aria-modal="true"
	aria-label="Mynd: {figure.alt}"
	transition:fade={{ duration: 150 }}
>
	<!-- Toolbar -->
	<div class="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-2">
		<div class="flex items-center gap-2">
			{#if figure.figureNumber}
				<span class="rounded bg-white/10 px-2 py-1 text-sm font-medium text-white">
					{figure.chapterNumber
						? `Mynd ${figure.chapterNumber}.${figure.figureNumber}`
						: `Mynd ${figure.figureNumber}`}
				</span>
			{/if}
		</div>

		<!-- Controls -->
		<div class="flex items-center gap-1">
			<!-- Zoom controls -->
			<button
				on:click={handleZoomOut}
				class="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Minnka"
				title="Minnka (-)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
				</svg>
			</button>
			<span class="min-w-[60px] text-center text-sm text-white/70">
				{Math.round(zoom * 100)}%
			</span>
			<button
				on:click={handleZoomIn}
				class="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Staekka"
				title="Staekka (+)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
				</svg>
			</button>
			<button
				on:click={handleResetZoom}
				class="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Endurstilla"
				title="Endurstilla (0)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>

			<div class="mx-2 h-6 w-px bg-white/20"></div>

			<!-- Info toggle -->
			<button
				on:click={() => (showInfo = !showInfo)}
				class="rounded p-2 transition-colors {showInfo
					? 'bg-white/20 text-white'
					: 'text-white/70 hover:bg-white/10 hover:text-white'}"
				aria-label="Syna upplysingar"
				title="Upplysingar (I)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</button>

			<!-- Download -->
			<button
				on:click={handleDownload}
				class="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Saekja mynd"
				title="Saekja"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>

			<div class="mx-2 h-6 w-px bg-white/20"></div>

			<!-- Close -->
			<button
				on:click={onClose}
				class="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Loka"
				title="Loka (Esc)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Image container -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative flex flex-1 items-center justify-center overflow-hidden"
		on:wheel|preventDefault={handleWheel}
		on:mousedown={handleMouseDown}
		on:mousemove={handleMouseMove}
		on:mouseup={handleMouseUp}
		on:mouseleave={handleMouseUp}
		style="cursor: {zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'}"
	>
		<!-- Navigation buttons -->
		{#if hasPrev}
			<button
				on:click={() => onNavigate?.(currentIndex - 1)}
				class="absolute left-4 z-10 rounded-full bg-black/50 p-3 text-white/70 transition-colors hover:bg-black/70 hover:text-white"
				aria-label="Fyrri mynd"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
		{/if}
		{#if hasNext}
			<button
				on:click={() => onNavigate?.(currentIndex + 1)}
				class="absolute right-4 z-10 rounded-full bg-black/50 p-3 text-white/70 transition-colors hover:bg-black/70 hover:text-white"
				aria-label="Naesta mynd"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		{/if}

		<!-- Image -->
		<img
			src={figure.src}
			alt={figure.alt}
			class="max-h-full max-w-full object-contain transition-transform duration-200"
			style="transform: scale({zoom}) translate({pan.x / zoom}px, {pan.y / zoom}px)"
			draggable="false"
		/>
	</div>

	<!-- Caption/info bar -->
	{#if showInfo && (figure.caption || figure.alt)}
		<div class="border-t border-white/10 bg-black/50 px-4 py-3" transition:fade={{ duration: 100 }}>
			<p class="text-center text-sm text-white/90">
				{figure.caption || figure.alt}
			</p>
		</div>
	{/if}

	<!-- Image counter for galleries -->
	{#if figures.length > 1}
		<div class="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white/70">
			{currentIndex + 1} / {figures.length}
		</div>
	{/if}
</div>
