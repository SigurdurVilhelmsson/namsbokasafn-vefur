<script lang="ts">
	export let bookSlug: string;
	export let onExitFocusMode: () => void;
</script>

<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
	<div class="flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
		<a
			href="/{bookSlug}"
			class="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			aria-label="Til baka á heimasíðu"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
		</a>

		<div class="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>

		<button
			on:click={onExitFocusMode}
			class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			aria-label="Loka einbeitingarham"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
			</svg>
			<span>Loka einbeitingu</span>
		</button>
	</div>
</div>
