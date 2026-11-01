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
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import { recallStore } from '$lib/stores/recall';
	import { announce } from '$lib/stores/announcer';
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

	// D20: proposed wording (S5.3, PED-18): the saved message, announced as shown.
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
	let showWhy = $state(false);
	/** A fine pointer that can hover: a desktop or laptop, where a keyboard is near */
	let keyboardLikely = $state(false);
	let textareaElement: HTMLTextAreaElement | undefined = $state();

	onMount(() => {
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
		const active = document.activeElement;
		const focusIdle = !active || active === document.body;
		if (keyboardLikely && focusIdle) textareaElement?.focus();
	});

	function markWhySeen() {
		if (showWhy) safeSetItem(WHY_SEEN_KEY, '1');
	}

	function handleSave() {
		if (!text.trim()) return;
		recallStore.addEntry(bookSlug, chapterSlug, sectionSlug, text);
		markWhySeen();
		saved = true;
		announce(SAVED_MESSAGE);
		onsaved?.();
	}

	function handleSkip() {
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

<!-- D20: proposed wording (S5.2, ported from v1.1): every string in this component, new on main;
     S5.3 changed the heading, the instruction, the placeholder, the hint's place, 'Vista', and
     added the 'why' line and 'Loka'. -->
<div
	class="recall-prompt mt-8 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-light)] p-5"
	role="region"
	aria-label="Upprifjun"
	transition:fly={{ y: 12, duration: 250 }}
>
	{#if saved}
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-2 text-[var(--accent-strong)]">
				<Icon name="check" />
				<span class="font-medium">{SAVED_MESSAGE}</span>
			</div>
			<button
				onclick={() => onclose?.()}
				class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
			>
				Loka
			</button>
		</div>
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
