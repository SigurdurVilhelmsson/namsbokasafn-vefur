<script lang="ts">
	export let bookSlug: string;
	export let onExitFocusMode: () => void;
</script>

<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
	<div
		class="focus-mode-nav"
		style="
			display: flex;
			align-items: center;
			gap: 0.5rem;
			border-radius: var(--radius-full);
			background: var(--bg-secondary);
			box-shadow: var(--shadow-lg);
			border: 1px solid var(--border-color);
			padding: 0.5rem 1rem;
		"
	>
		<a
			href="/{bookSlug}"
			class="focus-mode-btn"
			aria-label="Til baka á heimasíðu"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
		</a>

		<div
			style="
				width: 1px;
				height: 1.5rem;
				background: var(--border-color);
			"
		></div>

		<button
			on:click={onExitFocusMode}
			class="focus-mode-btn"
			style="
				display: flex;
				align-items: center;
				gap: 0.5rem;
				padding: 0.375rem 0.75rem;
				border-radius: var(--radius-full);
				font-size: 0.875rem;
				font-weight: 500;
			"
			aria-label="Loka einbeitingarham"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
			</svg>
			<span>Loka einbeitingu</span>
		</button>
	</div>
</div>

<style>
	.focus-mode-btn {
		padding: 0.5rem;
		border-radius: var(--radius-full);
		color: var(--text-secondary);
		transition: background-color 0.15s, color 0.15s;
	}

	.focus-mode-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
</style>
