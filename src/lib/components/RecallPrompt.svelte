<!--
  RecallPrompt - Free-recall prompt shown when a section is completed.
  Replaces the celebration animation: retrieval practice beats applause
  (reader plan P0.2, Roediger & Karpicke 2006).

  Copied from feature/reader-v1.1 at dde768e (plan step S5.2), changed only where main's
  colour and focus rules require it (CLAUDE.md, Accent Color Convention): ink on the amber
  fill, bronze for amber icons and text, no opacity on the disabled button, the input border
  token, and no focus ring of its own. Its accessibility work (focus after save or skip, the
  announced 'Vistað', a name for the textarea, no autofocus on touch) is plan step S5.3.
-->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
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

<!-- D20: proposed wording (S5.2, ported from v1.1): every string in this component, new on main. -->
<div
	class="recall-prompt mt-8 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-light)] p-5"
	role="region"
	aria-label="Upprifjun"
	transition:fly={{ y: 12, duration: 250 }}
>
	{#if saved}
		<div class="flex items-center gap-2 text-[var(--accent-strong)]">
			<Icon name="check" />
			<span class="font-medium">Vistað — góð upprifjun festir efnið í minni.</span>
		</div>
	{:else}
		<h3 class="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
			<Icon name="square-pen" class="text-[var(--accent-strong)]" />
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
			class="w-full resize-y rounded-lg border border-[var(--border-input)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
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
					class="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-fill-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-disabled)]"
				>
					Vista upprifjun
				</button>
			</div>
		</div>
	{/if}
</div>
