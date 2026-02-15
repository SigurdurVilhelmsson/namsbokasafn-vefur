<!--
  Structured Study Session - Guided learning flow
  Route: /:bookSlug/nam
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { PageData } from './$types';
	import type { TableOfContents } from '$lib/types/content';
	import type { SessionPlan, PhaseId } from '$lib/utils/studySession';
	import {
		buildSessionPlan,
		findUnreadSections,
		findWeakObjectives
	} from '$lib/utils/studySession';
	import { loadTableOfContents } from '$lib/utils/contentLoader';
	import { flashcardStore, reader, quizStore, objectivesStore } from '$lib/stores';
	import { getDueCards } from '$lib/utils/srs';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import SessionPlanner from '$lib/components/study/SessionPlanner.svelte';
	import SessionRunner from '$lib/components/study/SessionRunner.svelte';
	import SessionComplete from '$lib/components/study/SessionComplete.svelte';

	export let data: PageData;

	type Screen = 'planner' | 'active' | 'complete';

	let screen: Screen = 'planner';
	let toc: TableOfContents | null = null;
	let plan: SessionPlan | null = null;
	let loading = true;
	let chapterFilter: number | undefined = undefined;
	let sessionStartTime = 0;
	let completedCounts: Record<PhaseId, number> = {
		review: 0,
		reading: 0,
		practice: 0,
		reflect: 0
	};
	let enabledPhases: PhaseId[] = [];

	function computePlan() {
		if (!toc) return;

		const flashState = get(flashcardStore);
		const readerState = get(reader);
		const quizState = get(quizStore);
		const objState = get(objectivesStore);

		// Extract due flashcards from all decks
		const dueFlashcards = flashState.decks.flatMap((deck) => {
			const cardIds = deck.cards.map((c) => c.id);
			const dueIds = getDueCards(cardIds, flashState.studyRecords);
			return dueIds.map((cardId) => {
				const card = deck.cards.find((c) => c.id === cardId)!;
				return {
					deckId: deck.id,
					deckName: deck.name,
					cardId: card.id,
					front: card.front,
					back: card.back
				};
			});
		});

		// Get review problems from quiz store
		const reviewProblems = quizStore.getProblemsForReview(5);

		// Find unread sections from TOC
		const chapterSlug = chapterFilter
			? String(chapterFilter).padStart(2, '0')
			: undefined;
		const unreadSections = findUnreadSections(
			toc,
			readerState.progress,
			readerState.currentChapter,
			chapterFilter
		);

		// Get adaptive problems
		const adaptiveProblems = quizStore.getAdaptiveProblems(chapterSlug, 5);

		// Find weak objectives
		const weakObjectives = findWeakObjectives(
			objState.completedObjectives,
			chapterSlug
		);

		plan = buildSessionPlan({
			dueFlashcards,
			reviewProblems,
			unreadSections,
			adaptiveProblems,
			weakObjectives
		});
	}

	onMount(async () => {
		try {
			toc = await loadTableOfContents(data.bookSlug);
			computePlan();
		} catch (e) {
			console.error('Failed to load TOC:', e);
		} finally {
			loading = false;
		}
	});

	function handleChapterFilterChange(chapter: number | undefined) {
		chapterFilter = chapter;
		computePlan();
	}

	function handleStart(selectedPhases: PhaseId[]) {
		enabledPhases = selectedPhases;
		sessionStartTime = Date.now();
		completedCounts = { review: 0, reading: 0, practice: 0, reflect: 0 };
		screen = 'active';
	}

	function handleSessionComplete(counts: Record<PhaseId, number>) {
		completedCounts = counts;
		screen = 'complete';
	}

	function handleReset() {
		computePlan();
		screen = 'planner';
	}
</script>

<svelte:head>
	<title>Námslota | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	{#if loading}
		<Skeleton lines={8} />
	{:else if !plan}
		<div class="text-center py-12">
			<p class="text-gray-500 dark:text-gray-300">
				Gat ekki hlaðið námsáætlun.
			</p>
		</div>
	{:else if screen === 'planner'}
		<SessionPlanner
			{plan}
			chapters={toc?.chapters ?? []}
			{chapterFilter}
			bookSlug={data.bookSlug}
			on:start={(e: CustomEvent<PhaseId[]>) => handleStart(e.detail)}
			on:filterChange={(e: CustomEvent<number | undefined>) => handleChapterFilterChange(e.detail)}
		/>
	{:else if screen === 'active' && plan}
		<SessionRunner
			{plan}
			{enabledPhases}
			bookSlug={data.bookSlug}
			on:complete={(e: CustomEvent<Record<PhaseId, number>>) => handleSessionComplete(e.detail)}
		/>
	{:else if screen === 'complete'}
		<SessionComplete
			{completedCounts}
			{enabledPhases}
			startTime={sessionStartTime}
			on:reset={handleReset}
		/>
	{/if}
</div>
