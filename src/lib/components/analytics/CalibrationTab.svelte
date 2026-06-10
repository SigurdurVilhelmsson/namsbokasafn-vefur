<!--
  CalibrationTab - Confidence vs. actual performance (reader plan P1.1)

  Closes the metacognitive loop: predictions made before flashcard reveals
  (P0.3) and self-rated objective confidence are compared against measured
  outcomes, so over-confident self-monitoring — a core driver of the
  screen-inferiority effect — becomes visible to the learner.
-->
<script lang="ts">
	import { flashcardStore } from '$lib/stores/flashcard';
	import { objectivesStore } from '$lib/stores/objectives';
	import { quizStore } from '$lib/stores/quiz';

	interface Props {
		bookSlug: string;
		/** Resolves a section title for display; falls back to the slug */
		getSectionTitle?: (chapterSlug: string, sectionSlug: string) => string;
	}

	let { bookSlug, getSectionTitle }: Props = $props();

	// ── Flashcard calibration: pre-reveal prediction vs. outcome ──
	let predictions = $derived(
		$flashcardStore.reviewHistory.filter((r) => r.predictedKnown !== undefined)
	);

	let matrix = $derived.by(() => {
		let knewIt = 0; // predicted known, was correct
		let overconfident = 0; // predicted known, was wrong
		let underconfident = 0; // predicted unknown, was correct
		let knewGap = 0; // predicted unknown, was wrong (accurate self-assessment)
		for (const r of predictions) {
			if (r.predictedKnown && r.wasCorrect) knewIt++;
			else if (r.predictedKnown && !r.wasCorrect) overconfident++;
			else if (!r.predictedKnown && r.wasCorrect) underconfident++;
			else knewGap++;
		}
		return { knewIt, overconfident, underconfident, knewGap };
	});

	let calibrationPct = $derived(
		predictions.length > 0
			? Math.round(((matrix.knewIt + matrix.knewGap) / predictions.length) * 100)
			: 0
	);
	let overconfidencePct = $derived.by(() => {
		const predictedKnown = matrix.knewIt + matrix.overconfident;
		return predictedKnown > 0 ? Math.round((matrix.overconfident / predictedKnown) * 100) : 0;
	});

	// ── Objective confidence vs. practice performance, per section ──
	interface SectionCalibration {
		chapterSlug: string;
		sectionSlug: string;
		title: string;
		confidencePct: number; // average self-rated confidence, scaled to %
		successPct: number; // practice-problem success rate
		verdict: 'ofmat' | 'vanmat' | 'jafnvaegi';
	}

	let sectionRows = $derived.by(() => {
		// Average confidence per section (record keys are book-prefixed)
		const confidence = new Map<string, { sum: number; n: number; chapter: string; section: string }>();
		for (const [key, obj] of Object.entries($objectivesStore.completedObjectives)) {
			if (!key.startsWith(`${bookSlug}/`) || obj.confidence === undefined) continue;
			const k = `${obj.chapterSlug}/${obj.sectionSlug}`;
			const entry = confidence.get(k) ?? { sum: 0, n: 0, chapter: obj.chapterSlug, section: obj.sectionSlug };
			entry.sum += obj.confidence;
			entry.n++;
			confidence.set(k, entry);
		}

		// Practice success per section
		const practice = new Map<string, { success: number; attempts: number }>();
		for (const p of Object.values($quizStore.practiceProblemProgress)) {
			if (p.bookSlug !== bookSlug || p.attempts === 0) continue;
			const k = `${p.chapterSlug}/${p.sectionSlug}`;
			const entry = practice.get(k) ?? { success: 0, attempts: 0 };
			entry.success += p.successfulAttempts;
			entry.attempts += p.attempts;
			practice.set(k, entry);
		}

		const rows: SectionCalibration[] = [];
		for (const [k, conf] of confidence) {
			const perf = practice.get(k);
			if (!perf) continue; // need both signals to compare
			// Confidence 1-5 → 0-100%: (avg - 1) / 4
			const confidencePct = Math.round(((conf.sum / conf.n - 1) / 4) * 100);
			const successPct = Math.round((perf.success / perf.attempts) * 100);
			const delta = confidencePct - successPct;
			rows.push({
				chapterSlug: conf.chapter,
				sectionSlug: conf.section,
				title: getSectionTitle?.(conf.chapter, conf.section) ?? k,
				confidencePct,
				successPct,
				verdict: delta > 20 ? 'ofmat' : delta < -20 ? 'vanmat' : 'jafnvaegi'
			});
		}
		// Most overconfident first — that's where review pays off
		return rows.sort((a, b) => b.confidencePct - b.successPct - (a.confidencePct - a.successPct)).reverse();
	});
</script>

<div class="space-y-6">
	<!-- Flashcard prediction calibration -->
	<div>
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Kvörðun sjálfsmats</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Hversu vel spáir þú fyrir um eigin kunnáttu? Borið saman: spá þín áður en svar birtist og
			hvernig þér gekk í raun.
		</p>

		{#if predictions.length === 0}
			<div class="p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Engar spár enn. Þegar þú æfir minniskort svarar þú fyrst „Man það“ eða „Man það ekki“ —
					þau svör safnast hér saman og sýna hvort sjálfsmat þitt er raunsætt.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-4 mb-4">
				<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<div class="text-2xl font-bold text-[var(--accent-color)]">{calibrationPct}%</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Raunsætt sjálfsmat ({predictions.length} spár)
					</div>
				</div>
				<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<div class="text-2xl font-bold {overconfidencePct > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}">
						{overconfidencePct}%
					</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Ofmat — „man það“ en svarið var rangt
					</div>
				</div>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
				<div class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
					<div class="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{matrix.knewIt}</div>
					<div class="text-xs text-emerald-800 dark:text-emerald-300">Kunni — og vissi það</div>
				</div>
				<div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
					<div class="text-lg font-semibold text-amber-700 dark:text-amber-400">{matrix.overconfident}</div>
					<div class="text-xs text-amber-800 dark:text-amber-300">Hélt sig kunna — rangt</div>
				</div>
				<div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
					<div class="text-lg font-semibold text-blue-700 dark:text-blue-400">{matrix.underconfident}</div>
					<div class="text-xs text-blue-800 dark:text-blue-300">Vanmat — kunni samt</div>
				</div>
				<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<div class="text-lg font-semibold text-gray-700 dark:text-gray-300">{matrix.knewGap}</div>
					<div class="text-xs text-gray-600 dark:text-gray-400">Vissi af eyðunni</div>
				</div>
			</div>

			{#if overconfidencePct > 30 && matrix.knewIt + matrix.overconfident >= 5}
				<p class="mt-3 text-sm text-amber-700 dark:text-amber-400">
					Þú ofmetur kunnáttu þína í um {overconfidencePct}% tilvika — það er algengt við skjálestur.
					Upprifjun úr minni og fleiri æfingar laga þetta hraðar en endurlestur.
				</p>
			{/if}
		{/if}
	</div>

	<!-- Per-section: self-rated confidence vs. practice results -->
	<div>
		<h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
			Sjálfsöryggi og árangur eftir köflum
		</h3>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Sjálfsmat á markmiðum borið saman við árangur í æfingadæmum sömu kafla.
		</p>

		{#if sectionRows.length === 0}
			<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Til að birta samanburð þarf bæði sjálfsmat á markmiðum og leyst æfingadæmi í sama kafla.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each sectionRows as row (`${row.chapterSlug}/${row.sectionSlug}`)}
					<a
						href="/{bookSlug}/kafli/{row.chapterSlug}/{row.sectionSlug}"
						class="block p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[var(--accent-color)] transition-colors"
					>
						<div class="flex items-center justify-between gap-3">
							<span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
								{row.title}
							</span>
							<span
								class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
									{row.verdict === 'ofmat'
									? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
									: row.verdict === 'vanmat'
										? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
										: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}"
							>
								{row.verdict === 'ofmat' ? 'Ofmat' : row.verdict === 'vanmat' ? 'Vanmat' : 'Í jafnvægi'}
							</span>
						</div>
						<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Sjálfsöryggi {row.confidencePct}% · Árangur í dæmum {row.successPct}%
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
