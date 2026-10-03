<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		bookSlug: string;
		onExitFocusMode: () => void;
	}
	let { bookSlug, onExitFocusMode }: Props = $props();
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
			<Icon name="house" />
		</a>

		<div
			style="
				width: 1px;
				height: 1.5rem;
				background: var(--border-color);
			"
		></div>

		<button
			onclick={onExitFocusMode}
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
			<Icon name="minimize" size="sm" />
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
