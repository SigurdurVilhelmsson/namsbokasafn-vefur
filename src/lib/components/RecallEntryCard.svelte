<!--
  RecallEntryCard - one saved recall, as text, with 'Eyða' (plan step S5.5; D18 and its
  2026-11-01 follow-up; CODE-24). Used by the prompt's saved message and by the read-back on a
  return visit.

  The text is a text node, never markup. 'Eyða' asks first, as /greining's erases do, then
  removes the entry, says so through the shared announcer and calls `ondeleted`, so the owner
  closes and the page moves focus: the button leaves the DOM with focus on it.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { recallStore, type RecallEntry } from '$lib/stores/recall';
	import { announce } from '$lib/stores/announcer';

	interface Props {
		entry: RecallEntry;
		/** The entry was deleted: close, so the page moves focus */
		ondeleted?: () => void;
		/** Buttons shown after 'Eyða', e.g. 'Loka' */
		actions?: Snippet;
	}

	let { entry, ondeleted, actions }: Props = $props();

	// The confirm and the announcement of a deleted recall (S5.5).
	const CONFIRM_DELETE = 'Eyða þessari upprifjun? Þetta er ekki hægt að afturkalla.';
	const DELETED_MESSAGE = 'Upprifjuninni var eytt.';

	function handleDelete() {
		if (!confirm(CONFIRM_DELETE)) return;
		recallStore.removeEntry(entry.id);
		announce(DELETED_MESSAGE);
		ondeleted?.();
	}
</script>

<blockquote
	class="mt-3 rounded-lg border-l-4 border-[var(--accent-color)] bg-[var(--bg-primary)] px-4 py-3 whitespace-pre-line text-[var(--text-primary)]"
>
	{entry.text}
</blockquote>
<div class="mt-3 flex justify-end gap-2">
	<button
		onclick={handleDelete}
		class="rounded-lg px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
	>
		Eyða
	</button>
	{@render actions?.()}
</div>
