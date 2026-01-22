<!--
  FigureViewer - Image figure with caption and lightbox support
-->
<script lang="ts">
	import ImageLightbox from './ImageLightbox.svelte';
	import type { FigureData } from '$lib/types/figure';

	export let src: string;
	export let alt: string;
	export let caption: string | undefined = undefined;
	export let figureNumber: number | undefined = undefined;
	export let chapterNumber: number | undefined = undefined;
	export let bookTitle: string | undefined = undefined;

	let isLightboxOpen = false;
	let imageLoaded = false;
	let imageError = false;
	let citationCopied = false;
	let citationTimeout: ReturnType<typeof setTimeout>;

	function handleOpenLightbox() {
		isLightboxOpen = true;
	}

	function handleCloseLightbox() {
		isLightboxOpen = false;
	}

	async function handleCopyCitation() {
		const label = figureLabel || 'Mynd';
		const source = bookTitle ? ` - ${bookTitle}` : '';
		const chapterInfo = chapterNumber ? `, ${chapterNumber}. kafli` : '';
		const citation = `${label}${source}${chapterInfo}`;

		try {
			await navigator.clipboard.writeText(citation);
			citationCopied = true;
			clearTimeout(citationTimeout);
			citationTimeout = setTimeout(() => {
				citationCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Could not copy citation:', err);
		}
	}

	$: figureLabel = figureNumber
		? chapterNumber
			? `Mynd ${chapterNumber}.${figureNumber}`
			: `Mynd ${figureNumber}`
		: null;

	$: figureData = {
		src,
		alt,
		caption,
		figureNumber,
		chapterNumber
	} as FigureData;
</script>

<figure class="group relative my-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
	<!-- Image container -->
	<div class="relative">
		<!-- Loading state -->
		{#if !imageLoaded && !imageError}
			<div class="flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
			</div>
		{/if}

		<!-- Error state -->
		{#if imageError}
			<div class="flex h-48 flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-300">
				<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span class="text-sm">Ekki tokst ad hladda mynd</span>
			</div>
		{/if}

		<!-- Image -->
		<img
			{src}
			{alt}
			on:load={() => (imageLoaded = true)}
			on:error={() => (imageError = true)}
			class="w-full cursor-zoom-in object-contain transition-opacity duration-300 {imageLoaded
				? 'opacity-100'
				: 'opacity-0'} {imageError ? 'hidden' : ''}"
			on:click={handleOpenLightbox}
			on:keydown={(e) => e.key === 'Enter' && handleOpenLightbox()}
			role="button"
			tabindex="0"
			aria-label="Opna mynd i fullri staerd"
		/>

		<!-- Action buttons overlay -->
		{#if imageLoaded && !imageError}
			<div class="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
				<!-- Copy citation button -->
				{#if figureLabel}
					<button
						on:click={handleCopyCitation}
						class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white transition-colors {citationCopied
							? 'bg-green-600'
							: 'bg-black/60 hover:bg-black/80'}"
						aria-label={citationCopied ? 'Tilvísun afrituð' : 'Afrita tilvísun'}
						title={citationCopied ? 'Tilvísun afrituð!' : 'Afrita tilvísun'}
					>
						{#if citationCopied}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						{/if}
						<span class="hidden sm:inline">{citationCopied ? 'Afritað' : 'Tilvísun'}</span>
					</button>
				{/if}
				<!-- Zoom button -->
				<button
					on:click={handleOpenLightbox}
					class="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white hover:bg-black/80 transition-colors"
					aria-label="Opna i fullri staerd"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
					</svg>
					<span class="hidden sm:inline">Staekka</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Caption -->
	{#if figureLabel || caption}
		<figcaption class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
			{#if figureLabel}
				<span class="mr-2 font-semibold text-blue-600 dark:text-blue-400">
					{figureLabel}:
				</span>
			{/if}
			<span class="text-sm text-gray-600 dark:text-gray-300">
				{caption || alt}
			</span>
		</figcaption>
	{/if}
</figure>

<!-- Lightbox -->
{#if isLightboxOpen}
	<ImageLightbox figure={figureData} onClose={handleCloseLightbox} />
{/if}
