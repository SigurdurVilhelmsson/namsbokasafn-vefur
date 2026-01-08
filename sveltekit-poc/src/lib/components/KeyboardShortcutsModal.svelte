<!--
  KeyboardShortcutsModal - Shows all keyboard shortcuts with editing capability
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { settings, type ShortcutAction } from '$lib/stores/settings';
	import {
		getShortcuts,
		formatShortcutKey,
		groupShortcutsByCategory,
		getCategoryDisplayName,
		type KeyboardShortcut
	} from '$lib/actions/keyboardShortcuts';

	export let isOpen = false;
	export let onClose: () => void;

	let editingAction: ShortcutAction | null = null;
	let pendingKey: string | null = null;
	let keySequence: string[] = [];

	$: shortcuts = getShortcuts();
	$: groupedShortcuts = groupShortcutsByCategory(shortcuts);
	$: hasCustomizations = Object.keys($settings.shortcutPreferences).length > 0;

	// Convert keyboard event to key string
	function keyEventToString(event: KeyboardEvent): string {
		if (event.shiftKey && event.key === '/') {
			return '?';
		}
		return event.key;
	}

	// Handle Escape key (when not editing)
	function handleGlobalKeyDown(event: KeyboardEvent): void {
		if (!isOpen) return;
		if (event.key === 'Escape' && !editingAction) {
			onClose();
		}
	}

	// Handle key capture when editing
	function handleEditKeyDown(event: KeyboardEvent): void {
		if (!editingAction) return;

		event.preventDefault();
		event.stopPropagation();

		// Ignore modifier-only keys
		if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
			return;
		}

		const key = keyEventToString(event);

		// Handle multi-key sequences starting with 'g'
		if (key === 'g' && keySequence.length === 0) {
			keySequence = ['g'];
			pendingKey = 'g ...';
			return;
		}

		// Complete a two-key sequence
		if (keySequence.length === 1 && keySequence[0] === 'g') {
			const fullSequence = `g ${key}`;
			pendingKey = fullSequence;
			keySequence = [];

			// Save after a brief delay to show the key
			setTimeout(() => {
				if (editingAction) {
					settings.setShortcut(editingAction, fullSequence);
				}
				editingAction = null;
				pendingKey = null;
			}, 300);
			return;
		}

		// Single key shortcut
		pendingKey = key;
		keySequence = [];

		// Save after a brief delay to show the key
		setTimeout(() => {
			if (editingAction) {
				settings.setShortcut(editingAction, key);
			}
			editingAction = null;
			pendingKey = null;
		}, 300);
	}

	function handleCancelEdit(): void {
		editingAction = null;
		pendingKey = null;
		keySequence = [];
	}

	function handleStartEdit(action: ShortcutAction): void {
		editingAction = action;
		pendingKey = null;
		keySequence = [];
	}

	function handleResetShortcut(action: ShortcutAction): void {
		settings.resetShortcut(action);
	}

	function handleResetAll(): void {
		settings.resetAllShortcuts();
	}

	function handleOverlayClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			if (editingAction) {
				handleCancelEdit();
			} else {
				onClose();
			}
		}
	}

	// Prevent body scroll when modal is open
	$: if (isOpen) {
		document.body.style.overflow = 'hidden';
	} else {
		document.body.style.overflow = '';
	}

	onMount(() => {
		window.addEventListener('keydown', handleGlobalKeyDown);
		window.addEventListener('keydown', handleEditKeyDown, true);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleGlobalKeyDown);
		window.removeEventListener('keydown', handleEditKeyDown, true);
		document.body.style.overflow = '';
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		data-modal-overlay="true"
		on:click={handleOverlayClick}
		on:keydown={(e) => e.key === 'Escape' && !editingAction && onClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-modal-title"
		tabindex="-1"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="mx-4 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4"
			>
				<div class="flex items-center gap-3">
					<svg
						class="h-6 w-6 text-[var(--accent-color)]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<rect x="2" y="4" width="20" height="16" rx="2" stroke-width="2" />
						<path
							d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					<h2
						id="shortcuts-modal-title"
						class="font-sans text-lg font-semibold text-[var(--text-primary)]"
					>
						Flýtilyklar
					</h2>
				</div>
				<div class="flex items-center gap-2">
					{#if hasCustomizations}
						<button
							on:click={handleResetAll}
							class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
							title="Endurstilla allt"
						>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							<span class="hidden sm:inline">Endurstilla</span>
						</button>
					{/if}
					<button
						on:click={onClose}
						class="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
						aria-label="Loka"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="max-h-[60vh] overflow-y-auto p-6">
				<div class="space-y-6">
					{#each [...groupedShortcuts.entries()] as [category, categoryShortcuts]}
						<div>
							<h3
								class="mb-3 font-sans text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
							>
								{getCategoryDisplayName(category)}
							</h3>
							<div class="space-y-2">
								{#each categoryShortcuts as shortcut}
									{@const isEditing = editingAction === shortcut.action}
									{@const displayKey = isEditing ? pendingKey || '...' : shortcut.key}
									<div
										class="flex items-center justify-between rounded-lg p-2 transition-colors {isEditing
											? 'bg-[var(--accent-color)]/10 ring-2 ring-[var(--accent-color)]'
											: 'hover:bg-[var(--bg-primary)]'}"
									>
										<span class="text-[var(--text-primary)]">
											{shortcut.descriptionIs}
										</span>
										<div class="flex items-center gap-2">
											<!-- Reset button if customized -->
											{#if shortcut.isCustomized && !isEditing}
												<button
													on:click={() => handleResetShortcut(shortcut.action)}
													class="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-color)]"
													title="Endurstilla ({formatShortcutKey(shortcut.defaultKey)})"
												>
													<svg
														class="h-3.5 w-3.5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
														/>
													</svg>
												</button>
											{/if}

											<!-- Key display / edit button -->
											<button
												on:click={() => {
													if (isEditing) {
														handleCancelEdit();
													} else {
														handleStartEdit(shortcut.action);
													}
												}}
												class="inline-flex min-w-[3rem] items-center justify-center gap-1.5 rounded px-2 py-1 font-mono text-sm transition-colors {isEditing
													? 'bg-[var(--accent-color)] text-white'
													: shortcut.isCustomized
														? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
														: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm hover:bg-[var(--border-color)]'}"
												title={isEditing ? 'Hætta við' : 'Smelltu til að breyta'}
											>
												<span>{formatShortcutKey(displayKey)}</span>
												{#if isEditing && pendingKey}
													<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 13l4 4L19 7"
														/>
													</svg>
												{/if}
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-[var(--border-color)] px-6 py-4">
				<div class="text-center text-sm text-[var(--text-secondary)]">
					{#if editingAction}
						<span class="text-[var(--accent-color)]">
							Ýttu á nýjan lykil til að skipta um flýtilykil
						</span>
					{:else}
						<span>
							Smelltu á flýtilykil til að breyta honum. Ýttu á
							<kbd class="rounded bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-xs">?</kbd>
							hvar sem er til að opna þessa hjálp.
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
