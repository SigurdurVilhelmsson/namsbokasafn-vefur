<!--
  PomodoroTimer - Floating focus timer widget for reading sessions
  25 min work / 5 min break / 15 min long break after 4 pomodoros
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { analyticsStore } from '$lib/stores/analytics';

	type Phase = 'idle' | 'work' | 'break';

	const WORK_SECONDS = 25 * 60;
	const BREAK_SECONDS = 5 * 60;
	const LONG_BREAK_SECONDS = 15 * 60;

	let phase: Phase = 'idle';
	let secondsLeft = WORK_SECONDS;
	let pomodorosCompleted = 0;
	let expanded = false;
	let paused = false;
	let pulsing = false;

	let interval: ReturnType<typeof setInterval> | null = null;

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function startTimer() {
		phase = 'work';
		secondsLeft = WORK_SECONDS;
		paused = false;
		pulsing = false;
		startInterval();
	}

	function startInterval() {
		stopInterval();
		interval = setInterval(() => {
			if (paused) return;
			secondsLeft--;
			if (secondsLeft <= 0) {
				onPhaseEnd();
			}
		}, 1000);
	}

	function stopInterval() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function onPhaseEnd() {
		pulsing = true;
		if (phase === 'work') {
			pomodorosCompleted++;
			analyticsStore.logActivity('reading', { action: 'pomodoro_completed', count: pomodorosCompleted });
			const isLongBreak = pomodorosCompleted % 4 === 0;
			phase = 'break';
			secondsLeft = isLongBreak ? LONG_BREAK_SECONDS : BREAK_SECONDS;
		} else {
			phase = 'work';
			secondsLeft = WORK_SECONDS;
		}
	}

	function togglePause() {
		paused = !paused;
		pulsing = false;
	}

	function skip() {
		pulsing = false;
		if (phase === 'work') {
			pomodorosCompleted++;
			analyticsStore.logActivity('reading', { action: 'pomodoro_completed', count: pomodorosCompleted });
			const isLongBreak = pomodorosCompleted % 4 === 0;
			phase = 'break';
			secondsLeft = isLongBreak ? LONG_BREAK_SECONDS : BREAK_SECONDS;
		} else {
			phase = 'work';
			secondsLeft = WORK_SECONDS;
		}
		paused = false;
	}

	function reset() {
		stopInterval();
		phase = 'idle';
		secondsLeft = WORK_SECONDS;
		paused = false;
		pulsing = false;
	}

	function toggleExpanded() {
		expanded = !expanded;
	}

	function dismissPulse() {
		pulsing = false;
	}

	onDestroy(() => {
		stopInterval();
	});

	$: phaseLabel = phase === 'break' ? 'Hlé' : phase === 'work' ? 'Vinna' : '';
	$: phasePrompt = phase === 'break' ? 'Tími til hléss!' : 'Aftur í lestur!';
	$: isLongBreak = phase === 'break' && secondsLeft > BREAK_SECONDS;
</script>

<div class="fixed bottom-6 right-6 z-40" role="region" aria-label="Einbeitingartímamælir">
	{#if !expanded}
		<!-- Collapsed pill -->
		<button
			on:click={toggleExpanded}
			class="pill {pulsing ? 'pulse' : ''}"
			aria-label="Opna tímamæli"
			transition:fade={{ duration: 150 }}
		>
			<span class="pill-icon" aria-hidden="true">&#9201;</span>
			<span class="pill-time">{formatTime(secondsLeft)}</span>
			{#if phase !== 'idle'}
				<span class="pill-phase">{phaseLabel}</span>
			{/if}
		</button>
	{:else}
		<!-- Expanded card -->
		<div class="card" transition:scale={{ duration: 200, start: 0.9 }}>
			<div class="card-header">
				<span class="card-title">Einbeitingartímamælir</span>
				<button
					on:click={toggleExpanded}
					class="close-btn"
					aria-label="Minnka tímamæli"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			</div>

			{#if pulsing}
				<div class="prompt-banner" on:click={dismissPulse} on:keydown={dismissPulse} role="button" tabindex="0">
					{phasePrompt}
				</div>
			{/if}

			<div class="timer-display" class:break-phase={phase === 'break'}>
				<span class="time">{formatTime(secondsLeft)}</span>
				{#if phase !== 'idle'}
					<span class="phase-label">
						{phaseLabel}{isLongBreak ? ' (langt)' : ''}
					</span>
				{/if}
			</div>

			<div class="controls">
				{#if phase === 'idle'}
					<button on:click={startTimer} class="btn btn-primary">Byrja</button>
				{:else}
					<button on:click={togglePause} class="btn btn-secondary">
						{paused ? 'Halda áfram' : 'Hlé'}
					</button>
					<button on:click={skip} class="btn btn-secondary">Sleppa</button>
					<button on:click={reset} class="btn btn-danger">Endurstilla</button>
				{/if}
			</div>

			{#if pomodorosCompleted > 0}
				<div class="pomodoro-count">
					{#each Array(pomodorosCompleted) as _, i}
						<span class="tomato" aria-hidden="true" title="Kláruð lota {i + 1}">&#127813;</span>
					{/each}
					<span class="sr-only">{pomodorosCompleted} {pomodorosCompleted === 1 ? 'lota kláruð' : 'lotur kláraðar'}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.pill {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		border-radius: 9999px;
		background: var(--bg-secondary, #f3f4f6);
		border: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-primary, #1f2937);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
		transition: box-shadow 0.2s, transform 0.2s;
	}

	.pill:hover {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
		transform: translateY(-1px);
	}

	.pill.pulse {
		animation: pulse-ring 1.5s ease-in-out infinite;
	}

	.pill-icon {
		font-size: 1rem;
	}

	.pill-time {
		font-variant-numeric: tabular-nums;
	}

	.pill-phase {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.card {
		width: 16rem;
		background: var(--bg-secondary, #f3f4f6);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.75rem;
		box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.card-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		border-radius: 0.375rem;
		color: var(--text-secondary, #6b7280);
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.close-btn:hover {
		background: var(--bg-tertiary, #e5e7eb);
	}

	.prompt-banner {
		padding: 0.5rem 0.75rem;
		background: var(--accent-color, #c78c20);
		color: white;
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: center;
		cursor: pointer;
		animation: pulse-bg 1.5s ease-in-out infinite;
	}

	.timer-display {
		padding: 1rem 0.75rem;
		text-align: center;
	}

	.time {
		display: block;
		font-size: 2rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary, #1f2937);
		line-height: 1;
	}

	.break-phase .time {
		color: var(--accent-color, #c78c20);
	}

	.phase-label {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.controls {
		display: flex;
		gap: 0.375rem;
		padding: 0 0.75rem 0.75rem;
		justify-content: center;
	}

	.btn {
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: background-color 0.15s, opacity 0.15s;
	}

	.btn-primary {
		background: var(--accent-color, #c78c20);
		color: white;
		width: 100%;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		background: var(--bg-tertiary, #e5e7eb);
		color: var(--text-primary, #1f2937);
		border-color: var(--border-color, #e5e7eb);
	}

	.btn-secondary:hover {
		opacity: 0.8;
	}

	.btn-danger {
		background: none;
		color: var(--text-secondary, #6b7280);
		font-size: 0.75rem;
	}

	.btn-danger:hover {
		color: #ef4444;
	}

	.pomodoro-count {
		display: flex;
		gap: 0.25rem;
		padding: 0 0.75rem 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.tomato {
		font-size: 1rem;
	}

	@keyframes pulse-ring {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
		}
	}

	@keyframes pulse-bg {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}
</style>
