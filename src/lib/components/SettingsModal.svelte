<!--
  SettingsModal - User settings for font size and font family
-->
<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import {
		settings,
		fontSize,
		fontFamily,
		lineHeight,
		lineWidth,
		bionicReading,
		type FontSize,
		type FontFamily,
		type LineHeight,
		type LineWidth
	} from '$lib/stores';

	export let isOpen = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	const fontSizes: { value: FontSize; label: string }[] = [
		{ value: 'small', label: 'Lítið' },
		{ value: 'medium', label: 'Miðlungs' },
		{ value: 'large', label: 'Stórt' },
		{ value: 'xlarge', label: 'Mjög stórt' }
	];

	const fontFamilies: { value: FontFamily; label: string; description: string }[] = [
		{ value: 'serif', label: 'Serif', description: 'Klassískt letur fyrir lestur' },
		{ value: 'sans', label: 'Sans-serif', description: 'Nútímalegt letur' },
		{ value: 'opendyslexic', label: 'OpenDyslexic', description: 'Letur hannað fyrir lesblinda' }
	];

	const lineHeights: { value: LineHeight; label: string }[] = [
		{ value: 'normal', label: 'Venjulegt' },
		{ value: 'relaxed', label: 'Rýmra' },
		{ value: 'loose', label: 'Rúmt' }
	];

	const lineWidths: { value: LineWidth; label: string }[] = [
		{ value: 'narrow', label: 'Þröngt' },
		{ value: 'medium', label: 'Miðlungs' },
		{ value: 'wide', label: 'Breitt' }
	];

	let modalRef: HTMLDivElement;
	let previouslyFocused: HTMLElement | null = null;
	let focusTimeout: ReturnType<typeof setTimeout>;

	// Save focus when modal opens
	$: if (isOpen) {
		previouslyFocused = document.activeElement as HTMLElement;
	}

	// Auto-focus first interactive element when modal opens
	$: if (isOpen && modalRef) {
		clearTimeout(focusTimeout);
		focusTimeout = setTimeout(() => {
			const firstFocusable = modalRef?.querySelector<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			firstFocusable?.focus();
		}, 50);
	}

	function close() {
		dispatch('close');
		previouslyFocused?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			close();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	onDestroy(() => {
		clearTimeout(focusTimeout);
	});

	// Focus trap
	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !modalRef) return;

		const focusable = modalRef.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last?.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first?.focus();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
		on:click={handleBackdropClick}
		on:keydown={handleModalKeydown}
		role="presentation"
		transition:fade={{ duration: 150 }}
	>
		<!-- Modal -->
		<div
			bind:this={modalRef}
			class="relative w-full max-w-lg rounded-2xl bg-[var(--bg-primary)] shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-modal-title"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
				<h2 id="settings-modal-title" class="font-sans text-xl font-semibold text-[var(--text-primary)]">
					Stillingar
				</h2>
				<button
					on:click={close}
					class="-mr-2 rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
					aria-label="Loka"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="max-h-[70vh] overflow-y-auto px-6 py-6">
				<div class="space-y-8">
					<!-- Font Size Slider -->
					<div>
						<div class="mb-3 flex items-center justify-between">
							<label for="font-size-slider" class="text-sm font-medium text-[var(--text-primary)]">
								Leturstærð
							</label>
							<span class="text-sm text-[var(--accent-color)] font-medium">
								{fontSizes.find(s => s.value === $fontSize)?.label}
							</span>
						</div>
						<div class="relative">
							<!-- Slider track labels -->
							<div class="flex justify-between mb-2 px-1">
								{#each fontSizes as size, i}
									<button
										on:click={() => settings.setFontSize(size.value)}
										class="text-xs transition-colors {$fontSize === size.value
											? 'text-[var(--accent-color)] font-semibold'
											: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
										style="font-size: {10 + i * 2}px"
										aria-label="Stilla leturstærð á {size.label}"
									>
										Aa
									</button>
								{/each}
							</div>
							<!-- Custom slider -->
							<input
								id="font-size-slider"
								type="range"
								min="0"
								max="3"
								step="1"
								value={fontSizes.findIndex(s => s.value === $fontSize)}
								on:input={(e) => {
									const index = parseInt(e.currentTarget.value);
									settings.setFontSize(fontSizes[index].value);
								}}
								class="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]
									[&::-webkit-slider-thumb]:appearance-none
									[&::-webkit-slider-thumb]:w-5
									[&::-webkit-slider-thumb]:h-5
									[&::-webkit-slider-thumb]:rounded-full
									[&::-webkit-slider-thumb]:bg-[var(--accent-color)]
									[&::-webkit-slider-thumb]:shadow-md
									[&::-webkit-slider-thumb]:cursor-pointer
									[&::-webkit-slider-thumb]:transition-transform
									[&::-webkit-slider-thumb]:hover:scale-110
									[&::-moz-range-thumb]:w-5
									[&::-moz-range-thumb]:h-5
									[&::-moz-range-thumb]:rounded-full
									[&::-moz-range-thumb]:bg-[var(--accent-color)]
									[&::-moz-range-thumb]:border-0
									[&::-moz-range-thumb]:shadow-md
									[&::-moz-range-thumb]:cursor-pointer"
								aria-label="Leturstærð"
								aria-valuemin="0"
								aria-valuemax="3"
								aria-valuenow={fontSizes.findIndex(s => s.value === $fontSize)}
								aria-valuetext={fontSizes.find(s => s.value === $fontSize)?.label}
							/>
							<!-- Tick marks under slider -->
							<div class="flex justify-between mt-1 px-1">
								{#each fontSizes as size}
									<div
										class="w-1 h-1 rounded-full {$fontSize === size.value ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'}"
									></div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Font Family -->
					<div>
						<label class="mb-3 block text-sm font-medium text-[var(--text-primary)]">
							Leturgerð
						</label>
						<div class="space-y-2">
							{#each fontFamilies as family}
								<label
									class="flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all {$fontFamily === family.value
										? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5 ring-2 ring-[var(--accent-color)]/20'
										: 'border-[var(--border-color)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}"
								>
									<input
										type="radio"
										name="font"
										checked={$fontFamily === family.value}
										on:change={() => settings.setFontFamily(family.value)}
										class="h-4 w-4 shrink-0 border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
									/>
									<div>
										<span class="text-[var(--text-primary)] font-medium {family.value === 'serif' ? 'font-serif' : family.value === 'opendyslexic' ? 'font-opendyslexic' : 'font-sans'}">
											{family.label}
										</span>
										<p class="mt-0.5 text-sm text-[var(--text-secondary)]">
											{family.description}
										</p>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<!-- Line Height -->
					<div>
						<label class="mb-3 block text-sm font-medium text-[var(--text-primary)]">
							Línubil
						</label>
						<div class="grid grid-cols-3 gap-2 sm:flex">
							{#each lineHeights as height}
								<button
									on:click={() => settings.setLineHeight(height.value)}
									class="flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {$lineHeight === height.value
										? 'bg-[var(--accent-color)] text-white shadow-sm'
										: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}"
								>
									{height.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Line Width -->
					<div>
						<label class="mb-3 block text-sm font-medium text-[var(--text-primary)]">
							Línubreidd
						</label>
						<div class="grid grid-cols-3 gap-2 sm:flex">
							{#each lineWidths as width}
								<button
									on:click={() => settings.setLineWidth(width.value)}
									class="flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {$lineWidth === width.value
										? 'bg-[var(--accent-color)] text-white shadow-sm'
										: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}"
								>
									{width.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Bionic Reading -->
					<div>
						<div class="flex items-center justify-between">
							<div>
								<label for="bionic-reading-toggle" class="text-sm font-medium text-[var(--text-primary)]">
									Hraðlestur
								</label>
								<p class="text-xs text-[var(--text-secondary)] mt-0.5">
									Feitletrað upphaf hvers orðs til að auðvelda lestur
								</p>
							</div>
							<button
								id="bionic-reading-toggle"
								role="switch"
								aria-checked={$bionicReading}
								aria-label={$bionicReading ? 'Slökkva á hraðlestri' : 'Kveikja á hraðlestri'}
								on:click={() => settings.toggleBionicReading()}
								class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {$bionicReading
									? 'bg-[var(--accent-color)]'
									: 'bg-gray-300 dark:bg-gray-600'}"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {$bionicReading
										? 'translate-x-6'
										: 'translate-x-1'}"
								></span>
							</button>
						</div>
					</div>

					<!-- Preview -->
					<div>
						<label class="mb-3 block text-sm font-medium text-[var(--text-primary)]">
							Forskoðun
						</label>
						<div
							class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 font-size-{$fontSize} {$fontFamily === 'opendyslexic' ? 'font-opendyslexic' : $fontFamily === 'serif' ? 'font-serif' : 'font-sans'}"
							style="max-width: var(--line-width-{$lineWidth})"
						>
							<p
								class="text-[var(--text-primary)]"
								style="font-size: var(--font-size-base); line-height: var(--line-height-{$lineHeight})"
							>
								{#if $bionicReading}
									<b class="bionic-bold">Efn</b>afræði <b class="bionic-bold">er</b> <b class="bionic-bold">vís</b>indin <b class="bionic-bold">um</b> <b class="bionic-bold">efni</b> <b class="bionic-bold">og</b> <b class="bionic-bold">brey</b>tingar <b class="bionic-bold">þes</b>s. <b class="bionic-bold">Hún</b> <b class="bionic-bold">fja</b>llar <b class="bionic-bold">um</b>
									<b class="bionic-bold">upp</b>byggingu, <b class="bionic-bold">eig</b>inleika <b class="bionic-bold">og</b> <b class="bionic-bold">heg</b>ðun <b class="bionic-bold">efn</b>a, <b class="bionic-bold">svo</b> <b class="bionic-bold">og</b> <b class="bionic-bold">ork</b>ubreytingar <b class="bionic-bold">sem</b>
									<b class="bionic-bold">fyl</b>gja <b class="bionic-bold">efn</b>ahvörfum.
								{:else}
									Efnafræði er vísindin um efni og breytingar þess. Hún fjallar um
									uppbyggingu, eiginleika og hegðun efna, svo og orkubreytingar sem
									fylgja efnahvörfum.
								{/if}
							</p>
						</div>
						<p class="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
							<svg class="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
							Stillingar eru vistaðar sjálfkrafa í vafranum þínum
						</p>
					</div>

					<!-- Keyboard shortcuts hint -->
					<div class="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800/50">
								<svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
								</svg>
							</div>
							<div>
								<p class="font-medium text-[var(--text-primary)]">Flýtilyklar</p>
								<p class="text-sm text-[var(--text-secondary)]">
									Ýttu á
									<kbd class="rounded bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-xs shadow-sm border border-[var(--border-color)]">
										?
									</kbd>
									til að sjá og sérsníða flýtilykla
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
