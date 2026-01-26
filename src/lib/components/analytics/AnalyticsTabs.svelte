<!--
  AnalyticsTabs - Tab navigation for analytics dashboard
-->
<script lang="ts" context="module">
	export type TabId = 'yfirlit' | 'lestur' | 'minniskort' | 'markmiđ';
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let activeTab: TabId = 'yfirlit';

	const dispatch = createEventDispatcher<{ change: TabId }>();

	const tabs: { id: TabId; label: string; icon: string }[] = [
		{ id: 'yfirlit', label: 'Yfirlit', icon: 'chart' },
		{ id: 'lestur', label: 'Lestur', icon: 'book' },
		{ id: 'minniskort', label: 'Minniskort', icon: 'cards' },
		{ id: 'markmiđ', label: 'Markmið', icon: 'target' }
	];

	function selectTab(id: TabId) {
		activeTab = id;
		dispatch('change', id);
	}
</script>

<div class="mb-6">
	<div class="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1" role="tablist" aria-label="Námsgreining flipar">
		{#each tabs as tab}
			<button
				role="tab"
				aria-selected={activeTab === tab.id}
				aria-controls="tabpanel-{tab.id}"
				id="tab-{tab.id}"
				on:click={() => selectTab(tab.id)}
				class="flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all
					{activeTab === tab.id
						? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
						: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}"
			>
				{#if tab.icon === 'chart'}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				{:else if tab.icon === 'book'}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
				{:else if tab.icon === 'cards'}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				{:else if tab.icon === 'target'}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				{/if}
				<span class="hidden sm:inline">{tab.label}</span>
			</button>
		{/each}
	</div>
</div>
