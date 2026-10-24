<!--
  AnalyticsTabs - Tab navigation for analytics dashboard
-->
<script lang="ts" module>
	export type TabId = 'yfirlit' | 'lestur' | 'minniskort' | 'markmiđ';
</script>

<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/components/icons';
	let { activeTab = $bindable('yfirlit'), onchange }: { activeTab?: TabId; onchange?: (id: TabId) => void } = $props();

	const tabs: { id: TabId; label: string; icon: IconName }[] = [
		{ id: 'yfirlit', label: 'Yfirlit', icon: 'chart-column' },
		{ id: 'lestur', label: 'Lestur', icon: 'book-open' },
		{ id: 'minniskort', label: 'Minniskort', icon: 'credit-card' },
		{ id: 'markmiđ', label: 'Markmið', icon: 'shield-check' }
	];

	function selectTab(id: TabId) {
		activeTab = id;
		onchange?.(id);
	}

	// The APG tabs pattern: ← and → move and select (wrapping), Home and End go to the
	// ends, and only the selected tab is in the Tab order.
	function handleKeydown(event: KeyboardEvent) {
		// Leave modified keys to the browser: Alt/Cmd+← → are Back and Forward.
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const current = tabs.findIndex((t) => t.id === activeTab);
		const last = tabs.length - 1;
		const next =
			event.key === 'ArrowRight'
				? (current + 1) % tabs.length
				: event.key === 'ArrowLeft'
					? (current - 1 + tabs.length) % tabs.length
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? last
							: -1;
		if (next < 0) return;
		event.preventDefault();
		selectTab(tabs[next].id);
		document.getElementById(`tab-${tabs[next].id}`)?.focus();
	}
</script>

<div class="mb-6">
	<div class="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1" role="tablist" aria-label="Námsgreining flipar">
		{#each tabs as tab (tab.id)}
			<button
				role="tab"
				aria-selected={activeTab === tab.id}
				aria-controls="tabpanel-{tab.id}"
				id="tab-{tab.id}"
				tabindex={activeTab === tab.id ? 0 : -1}
				onclick={() => selectTab(tab.id)}
				onkeydown={handleKeydown}
				class="flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all
					{activeTab === tab.id
						? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
						: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}"
			>
				<Icon name={tab.icon} size="sm" />
				<!-- Hidden on phones, but still read aloud: the tab's only name. -->
				<span class="sr-only sm:not-sr-only">{tab.label}</span>
			</button>
		{/each}
	</div>
</div>
