<!--
  RecallReadBack - a section's saved recall, shown on a return visit (plan step S5.5; D18 and
  its 2026-11-01 follow-up; CODE-24).

  The prompt shows once per section (call 2, as built in S5.2), so a section already recalled
  shows its latest entry at the section end instead, with 'Eyða' and 'Loka'. It follows the
  store, so a delete here or in another tab removes it. It never takes focus on its own
  (KEEP-01); after 'Eyða' or 'Loka' the page moves focus, as it does for the prompt.
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import RecallEntryCard from '$lib/components/RecallEntryCard.svelte';
	import { entriesForSection, recallStore } from '$lib/stores/recall';

	interface Props {
		bookSlug: string;
		chapterSlug: string;
		sectionSlug: string;
		/** The section's number from the table of contents, e.g. '1.3' */
		sectionNumber: string;
		/** 'Eyða' or 'Loka': the page hides the read-back and moves focus */
		onclose?: () => void;
	}

	let { bookSlug, chapterSlug, sectionSlug, sectionNumber, onclose }: Props = $props();

	let entry = $derived(entriesForSection($recallStore, { bookSlug, chapterSlug, sectionSlug }).at(-1));
</script>

{#if entry}
	<div
		class="recall-readback mt-8 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-light)] p-5"
		role="region"
		aria-label="Upprifjun þín"
	>
		<h3 class="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
			<Icon name="square-pen" class="text-[var(--accent-strong)]" />
			Upprifjun þín úr kafla {sectionNumber}
		</h3>
		<RecallEntryCard {entry} ondeleted={() => onclose?.()}>
			{#snippet actions()}
				<button
					onclick={() => onclose?.()}
					class="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
				>
					Loka
				</button>
			{/snippet}
		</RecallEntryCard>
	</div>
{/if}
