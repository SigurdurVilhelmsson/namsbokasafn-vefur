<!--
  RecallPrompt - Free-recall prompt shown when a section is completed.
  Replaces the celebration animation: retrieval practice beats applause
  (reader plan P0.2, Roediger & Karpicke 2006).
-->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import { recallStore } from '$lib/stores/recall';

	interface Props {
		bookSlug: string;
		chapterSlug: string;
		sectionSlug: string;
		onclose?: () => void;
	}

	let { bookSlug, chapterSlug, sectionSlug, onclose }: Props = $props();

	let text = $state('');
	let saved = $state(false);
	let textareaElement: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		textareaElement?.focus();
	});

	function handleSave() {
		if (!text.trim()) return;
		recallStore.addEntry(bookSlug, chapterSlug, sectionSlug, text);
		saved = true;
		// Brief confirmation, then dismiss
		setTimeout(() => onclose?.(), 1200);
	}

	function handleSkip() {
		onclose?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			handleSave();
		}
	}
</script>

<div
	class="recall-prompt mt-8 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-light)] p-5"
	role="region"
	aria-label="Upprifjun"
	transition:fly={{ y: 12, duration: 250 }}
>
	{#if saved}
		<div class="flex items-center gap-2 text-[var(--accent-color)]">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="font-medium">Vistað — góð upprifjun festir efnið í minni.</span>
		</div>
	{:else}
		<h3 class="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
			<svg class="w-5 h-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
			Kafli lesinn — rifjaðu upp
		</h3>
		<p class="mb-3 text-sm text-[var(--text-secondary)]">
			Skrifaðu niður, án þess að fletta til baka, það helsta sem þú manst úr kaflanum.
			Upprifjun úr minni styrkir námið meira en endurlestur.
		</p>
		<textarea
			bind:this={textareaElement}
			bind:value={text}
			onkeydown={handleKeyDown}
			placeholder="Það sem ég man..."
			rows="4"
			class="w-full resize-y rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder-gray-400 focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
		></textarea>
		<div class="mt-3 flex items-center justify-between gap-3">
			<span class="text-xs text-[var(--text-tertiary)]">Ctrl+Enter til að vista</span>
			<div class="flex gap-2">
				<button
					onclick={handleSkip}
					class="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
				>
					Sleppa
				</button>
				<button
					onclick={handleSave}
					disabled={!text.trim()}
					class="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
				>
					Vista upprifjun
				</button>
			</div>
		</div>
	{/if}
</div>
