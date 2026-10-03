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
</script>

<div class="mb-6">
	<div class="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1" role="tablist" aria-label="Námsgreining flipar">
		{#each tabs as tab (tab.id)}
			<button
				role="tab"
				aria-selected={activeTab === tab.id}
				aria-controls="tabpanel-{tab.id}"
				id="tab-{tab.id}"
				onclick={() => selectTab(tab.id)}
				class="flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all
					{activeTab === tab.id
						? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
						: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}"
			>
				<Icon name={tab.icon} size="sm" />
				<span class="hidden sm:inline">{tab.label}</span>
			</button>
		{/each}
	</div>
</div>
