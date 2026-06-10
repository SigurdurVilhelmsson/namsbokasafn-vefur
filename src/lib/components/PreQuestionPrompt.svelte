<!--
  PreQuestionPrompt - Pre-question before reading a section (reader plan P1.2)

  Testing-effect literature: attempting retrieval BEFORE reading — even
  covertly, without writing anything — improves learning from the text that
  follows. One of the section's learning objectives is posed as a prompt to
  think about before the learner starts reading.
-->
<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Props {
		objectives: string[];
		/** Stable per-section key; picks which objective is posed */
		sectionKey: string;
		onclose?: () => void;
	}

	let { objectives, sectionKey, onclose }: Props = $props();

	// Deterministic pick so the same section poses the same pre-question
	let objective = $derived.by(() => {
		if (objectives.length === 0) return null;
		let hash = 0;
		for (let i = 0; i < sectionKey.length; i++) {
			hash = (hash * 31 + sectionKey.charCodeAt(i)) | 0;
		}
		return objectives[Math.abs(hash) % objectives.length];
	});
</script>

{#if objective}
	<div
		class="mb-6 rounded-xl border border-[var(--accent-subtle)] bg-[var(--accent-light)] p-5"
		role="region"
		aria-label="Forspurning"
		transition:fly={{ y: -12, duration: 250 }}
	>
		<h3 class="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
			<svg class="w-5 h-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			Áður en þú byrjar
		</h3>
		<p class="mb-2 text-sm text-[var(--text-secondary)]">
			Hugleiddu í smástund hvað þú veist nú þegar um eftirfarandi — það bætir námið þótt þú vitir
			lítið enn:
		</p>
		<p class="mb-4 text-[var(--text-primary)] font-medium">
			{objective}
		</p>
		<button
			onclick={() => onclose?.()}
			class="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
		>
			Ég hugleiddi þetta — byrja að lesa
		</button>
	</div>
{/if}
