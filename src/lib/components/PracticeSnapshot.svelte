<!--
  PracticeSnapshot - a stored practice problem's question or answer in /prof and /nam (plan step S3.1).

  Shows the record's trimmed HTML snapshot when it has one (utils/practiceSnapshot.ts): filtered
  again on the way in, because localStorage can be edited, and appended as nodes rather than
  through {@html}. A record stored before S3.1 has only text, shown as text until the reader
  reveals that answer again in the book, which refreshes the record.
-->
<script lang="ts">
	import { snapshotFragment } from '$lib/utils/practiceSnapshot';

	interface Props {
		html?: string;
		text: string;
	}

	let { html, text }: Props = $props();

	/** Fill the (otherwise empty) element with the filtered snapshot, and refill it when the problem changes. */
	function snapshot(node: HTMLElement, value: string) {
		node.replaceChildren(snapshotFragment(value));
		return {
			update(next: string) {
				node.replaceChildren(snapshotFragment(next));
			}
		};
	}
</script>

{#if html}
	<div class="practice-snapshot" use:snapshot={html}></div>
{:else}
	<div class="practice-snapshot">{text}</div>
{/if}
