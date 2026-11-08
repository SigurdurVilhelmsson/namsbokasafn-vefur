<!--
  RecallPrompt - Free-recall prompt shown when a section is completed.
  Replaces the celebration animation: retrieval practice beats applause
  (reader plan P0.2, Roediger & Karpicke 2006).

  Copied from feature/reader-v1.1 at dde768e (plan step S5.2), changed where main's colour and
  focus rules require it (CLAUDE.md, Accent Color Convention): ink on the amber fill, bronze for
  amber icons and text, no opacity on the disabled button, the input border token, and no focus
  ring of its own.

  Made accessible and bounded in plan step S5.3 (UI-01, CODE-21, PED-18, PED-25):
  - the textarea is named by the heading and described by the instruction;
  - the heading names the section, and the instruction bounds the task;
  - a save is announced through the shared announcer, and the saved message stays until
    'Loka', with no timer;
  - the page moves focus after a save or a close (onsaved, onclose): the form leaves the DOM,
    and focus must not fall to <body>;
  - Escape acts as 'Sleppa' only while the box is empty, so typed recall is never thrown away;
  - on touch screens no autofocus (it opens the keyboard over the text) and no Ctrl+Enter hint.

  Counted in plan step S5.4 (PED-17), as local aggregate counts per book (lib/utils/counters.ts):
  shown on mount, saved, skipped ('Sleppa' or Escape), and abandoned when it unmounts with
  neither (the reader went on to another section). A tab closed with the prompt open counts as
  shown only: unmount never runs.

  Read back in plan step S5.5 (D18 and its 2026-11-01 follow-up): the saved message shows the text
  just saved, with 'Eyða' (RecallEntryCard). A delete closes the prompt, so the page moves focus;
  the save stays counted.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import RecallEntryCard from '$lib/components/RecallEntryCard.svelte';
	import { recallStore } from '$lib/stores/recall';
	import { announce } from '$lib/stores/announcer';
	import { analyticsStore } from '$lib/stores/analytics';
	import { safeSetItem } from '$lib/utils/localStorage';

	interface Props {
		bookSlug: string;
		chapterSlug: string;
		sectionSlug: string;
		/** The section's number from the table of contents, e.g. '1.3' */
		sectionNumber: string;
		/** 'Sleppa', Escape on an empty box, or 'Loka' after a save: the page hides the prompt */
		onclose?: () => void;
		/** A recall was saved; the prompt stays, showing the saved message */
		onsaved?: () => void;
	}

	let { bookSlug, chapterSlug, sectionSlug, sectionNumber, onclose, onsaved }: Props = $props();

	const uid = $props.id();

	// The saved message, announced as shown (S5.3, PED-18).
	const SAVED_MESSAGE = 'Vistað — góð upprifjun festir efnið í minni.';

	/**
	 * The one-time 'why' line (PED-25), as S4.3's on the flashcards: shown on the first prompt a
	 * profile ever sees, until its first save or skip. A per-viewer convenience, so a blocked
	 * storage just never shows it. The key starts with 'namsbokasafn', so 'Eyða öllum gögnum'
	 * removes it too.
	 */
	const WHY_SEEN_KEY = 'namsbokasafn:seen-why-recall';

	let text = $state('');
	let saved = $state(false);
	/** The entry this prompt saved, found in the store, so a delete anywhere removes it here */
	let savedId: string | null = $state(null);
	let savedEntry = $derived(savedId ? $recallStore.entries.find((e) => e.id === savedId) : undefined);
	let showWhy = $state(false);
	/** A fine pointer that can hover: a desktop or laptop, where a keyboard is near */
	let keyboardLikely = $state(false);
	let textareaElement: HTMLTextAreaElement | undefined = $state();

	// Plain variables, not $state: bookkeeping that no markup reads. The book is fixed at mount,
	// since the page updates the props before it closes the prompt on navigation.
	let countedBook = '';
	let settled = false;

	onMount(() => {
		countedBook = bookSlug;
		analyticsStore.countEvent(countedBook, 'recallShown');
		try {
			showWhy = localStorage.getItem(WHY_SEEN_KEY) === null;
		} catch {
			showWhy = false;
		}
		keyboardLikely =
			typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
		// Not on touch screens: focusing the box opens the on-screen keyboard over the text. And
		// only while focus is idle: the prompt opens 1.5 s after the section's end comes into
		// view, which a keyboard user reaches by tabbing, so focus may sit on 'Næsti kafli' or
		// another control by then, and taking it would move them somewhere they did not go.
		// A control the press disabled counts as idle: paged, 'Ljúka kafla' opens the prompt and is
		// disabled in the same update (S9.3), and focus left there would fall to <body>
		const active = document.activeElement;
		const focusIdle = !active || active === document.body || active.matches(':disabled');
		if (keyboardLikely && focusIdle) textareaElement?.focus();

		return () => {
			if (!settled) analyticsStore.countEvent(countedBook, 'recallAbandoned');
		};
	});

	function markWhySeen() {
		if (showWhy) safeSetItem(WHY_SEEN_KEY, '1');
	}

	function handleSave() {
		if (!text.trim()) return;
		savedId = recallStore.addEntry(bookSlug, chapterSlug, sectionSlug, text)?.id ?? null;
		settled = true;
		analyticsStore.countEvent(countedBook, 'recallSaved');
		markWhySeen();
		saved = true;
		announce(SAVED_MESSAGE);
		onsaved?.();
	}

	function handleSkip() {
		settled = true;
		analyticsStore.countEvent(countedBook, 'recallSkipped');
		markWhySeen();
		onclose?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			handleSave();
		} else if (event.key === 'Escape' && !text.trim()) {
			event.preventDefault();
			handleSkip();
		}
	}
</script>

<!-- Every string in this component is new on main (S5.2, ported from v1.1); S5.3 changed the
     heading, the instruction, the placeholder, the hint's place, 'Vista', and added the 'why'
     line and 'Loka'. Checked by [USER] as D20 batch 5 (2026-11-01). -->
<div
	class="recall-prompt mt-8 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-light)] p-5"
	role="region"
	aria-label="Upprifjun"
	transition:fly={{ y: 12, duration: 250 }}
>
	{#snippet closeButton()}
		<button
			onclick={() => onclose?.()}
			class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
		>
			Loka
		</button>
	{/snippet}
	{#if saved}
		<div class="flex items-center gap-2 text-[var(--accent-strong)]">
			<Icon name="check" />
			<span class="font-medium">{SAVED_MESSAGE}</span>
		</div>
		{#if savedEntry}
			<RecallEntryCard entry={savedEntry} ondeleted={() => onclose?.()}>
				{#snippet actions()}
					{@render closeButton()}
				{/snippet}
			</RecallEntryCard>
		{:else}
			<div class="mt-3 flex justify-end">
				{@render closeButton()}
			</div>
		{/if}
	{:else}
		<h3 id="{uid}-heading" class="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
			<Icon name="square-pen" class="text-[var(--accent-strong)]" />
			Rifjaðu upp kafla {sectionNumber}
		</h3>
		<p id="{uid}-instruction" class="mb-3 text-sm text-[var(--text-secondary)]">
			Hver eru 2–3 meginatriði kaflans? Svaraðu með eigin orðum, án þess að fletta til baka.
		</p>
		{#if showWhy}
			<!-- The one-time 'why' line (PED-25): the rationale sentence v1.1 showed every time.
			     It claims only what the evidence supports: retrieval beats rereading. -->
			<p class="mb-3 text-sm text-[var(--text-secondary)]">
				Af hverju? Upprifjun úr minni styrkir námið meira en endurlestur.
			</p>
		{/if}
		<textarea
			bind:this={textareaElement}
			bind:value={text}
			onkeydown={handleKeyDown}
			aria-labelledby="{uid}-heading"
			aria-describedby="{uid}-instruction"
			placeholder="Það sem ég man…"
			rows="4"
			class="w-full resize-y rounded-lg border border-[var(--border-input)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
		></textarea>
		<div class="mt-3 flex items-center justify-between gap-3">
			{#if keyboardLikely}
				<span class="text-xs text-[var(--text-secondary)]">Ctrl+Enter til að vista</span>
			{:else}
				<span></span>
			{/if}
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
					class="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium whitespace-nowrap text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-fill-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-disabled)]"
				>
					Vista
				</button>
			</div>
		</div>
	{/if}
</div>
