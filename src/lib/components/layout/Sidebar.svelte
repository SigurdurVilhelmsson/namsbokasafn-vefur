<script lang="ts">
	import { page } from '$app/stores';
	import { settings, sidebarOpen, reader } from '$lib/stores';
	import { isSectionRead, calcChapterProgress, scrollProgress } from '$lib/stores/reader';
	import { onMount } from 'svelte';
	import type { TableOfContents, Chapter, Appendix } from '$lib/types/content';
	import { loadTableOfContents, getChapterPath, getSectionPath, findChapterBySlug } from '$lib/utils/contentLoader';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		bookSlug?: string;
		hasPeriodicTable?: boolean;
	}
	let { bookSlug = '', hasPeriodicTable = false }: Props = $props();

	let toc: TableOfContents | null = $state(null);
	let manuallyToggledChapters: Set<number> = $state(new Set());
	let appendicesExpanded = $state(false);
	let answerKeyExpanded = $state(false);

	// Get current route params
	let chapterParam = $derived($page.params.chapterSlug);
	let sectionParam = $derived($page.params.sectionSlug);

	// Subscribe to reader progress for reactivity
	let progress = $derived($reader.progress);

	// Load table of contents
	onMount(async () => {
		if (bookSlug) {
			try {
				toc = await loadTableOfContents(bookSlug);
			} catch (error) {
				console.error('Gat ekki hlaðið efnisyfirliti:', error);
			}
		}
	});

	// Calculate which chapters should be expanded
	let expandedChapters = $derived((() => {
		const expanded = new Set<number>();
		if (!toc) return expanded;

		const currentChapter = chapterParam ? findChapterBySlug(toc, chapterParam) : null;
		const currentChapterNumber = currentChapter?.number;
		const autoExpandChapter = currentChapterNumber ?? 1;

		if (!manuallyToggledChapters.has(autoExpandChapter)) {
			expanded.add(autoExpandChapter);
		}

		manuallyToggledChapters.forEach((chapterNumber) => {
			if (chapterNumber !== autoExpandChapter) {
				expanded.add(chapterNumber);
			}
		});

		return expanded;
	})());

	function toggleChapter(chapterNumber: number) {
		const newSet = new Set(manuallyToggledChapters);
		if (newSet.has(chapterNumber)) {
			newSet.delete(chapterNumber);
		} else {
			newSet.add(chapterNumber);
		}
		manuallyToggledChapters = newSet;
	}

	function closeSidebar() {
		settings.setSidebarOpen(false);
	}

	// Track which chapters have their review sections expanded
	let reviewExpandedChapters: Set<number> = $state(new Set());

	function toggleReview(chapterNumber: number) {
		const newSet = new Set(reviewExpandedChapters);
		if (newSet.has(chapterNumber)) {
			newSet.delete(chapterNumber);
		} else {
			newSet.add(chapterNumber);
		}
		reviewExpandedChapters = newSet;
	}

	// End-of-chapter section types that go into the "Upprifjun" foldout
	// Summary, glossary, and equations stay in the main list (like OpenStax)
	const reviewTypes = new Set(['exercises']);

	// Reactive helpers using subscribed progress (use chapter/section paths)
	function isRead(chapterPath: string, sectionPath: string): boolean {
		return isSectionRead(progress, bookSlug, chapterPath, sectionPath);
	}

	function getChapterProgressPercent(chapter: Chapter): number {
		return calcChapterProgress(progress, bookSlug, getChapterPath(chapter), chapter.sections.length);
	}
</script>

<!-- Overlay (backdrop) -->
<div
	class="sidebar-overlay {$sidebarOpen ? 'sidebar-overlay--visible' : ''}"
	onclick={closeSidebar}
	onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
	role="presentation"
	tabindex="-1"
></div>

<!-- Sidebar -->
<aside
	aria-hidden={!$sidebarOpen ? 'true' : undefined}
	class="sidebar {$sidebarOpen ? 'sidebar--open' : ''}"
>
	<div class="flex h-full flex-col">
		<!-- Sidebar header -->
		<div class="sidebar-header">
			<h2 class="sidebar-title">Efnisyfirlit</h2>
			<button
				onclick={closeSidebar}
				class="sidebar-close"
				aria-label="Loka valmynd"
			>
				<Icon name="x" />
			</button>
		</div>

		<!-- Sidebar content -->
		<nav class="sidebar-nav" aria-label="Efnisyfirlit">
			{#if !toc}
				<Skeleton variant="sidebar" />
			{:else}
				<ul class="sidebar-list">
					{#each toc.chapters as chapter (chapter.number)}
						{@const chapterPath = getChapterPath(chapter)}
						{@const progressPercent = getChapterProgressPercent(chapter)}
						{@const expanded = expandedChapters.has(chapter.number)}
						{@const isCurrentChapter = chapterParam === chapterPath || chapterParam === chapter.slug}
						<li>
							<button
								onclick={() => toggleChapter(chapter.number)}
								aria-expanded={expanded}
								aria-controls="chapter-{chapter.number}-sections"
								class="chapter-btn"
							>
								<span class="flex min-w-0 flex-1 items-center gap-2">
									<span class="chapter-number">{chapter.number}</span>
									<span class="chapter-title">{chapter.title}</span>
								</span>
								<span class="flex shrink-0 items-center gap-2">
									{#if progressPercent > 0}
										<span class="chapter-progress-badge">{progressPercent}%</span>
									{/if}
									<span class="chapter-chevron {expanded ? 'chapter-chevron--open' : ''}"><Icon name="chevron-right" size="sm" /></span>
								</span>
							</button>

							<!-- Sections -->
							{#if expanded}
								{@const bodySections = chapter.sections.filter(s => !s.type || !reviewTypes.has(s.type))}
								{@const reviewSections = chapter.sections.filter(s => s.type && reviewTypes.has(s.type))}
								{@const reviewExpanded = reviewExpandedChapters.has(chapter.number)}
								<ul id="chapter-{chapter.number}-sections" class="section-list">
									{#each bodySections as section (section.file)}
										{@const sectionPath = getSectionPath(section)}
										{@const isCurrent = isCurrentChapter && (sectionParam === sectionPath || sectionParam === section.slug)}
										{@const isReadSection = isRead(chapterPath, sectionPath)}
										{@const readingTime = section.metadata?.readingTime}
										<li>
											<a
												href="/{bookSlug}/kafli/{chapterPath}/{sectionPath}"
												class="section-link {isCurrent ? 'section-link--current' : ''}"
											>
												<span class="section-dot-wrap">
													{#if isReadSection}
														<span class="section-dot section-dot--read"></span>
													{:else if isCurrent}
														<!-- Scroll progress ring for current section -->
														<span class="section-progress-ring">
															<svg class="section-ring-svg" viewBox="0 0 20 20">
																<circle
																	cx="10" cy="10" r="8"
																	fill="none"
																	stroke="var(--border-color)"
																	stroke-width="2"
																/>
																<circle
																	cx="10" cy="10" r="8"
																	fill="none"
																	stroke="var(--accent-color)"
																	stroke-width="2"
																	stroke-dasharray="50.27"
																	stroke-dashoffset={50.27 - (50.27 * $scrollProgress / 100)}
																	stroke-linecap="round"
																	class="section-ring-progress"
																/>
															</svg>
															<span class="section-dot section-dot--current"></span>
														</span>
													{:else}
														<span class="section-dot section-dot--unread"></span>
													{/if}
												</span>
												<div class="flex-1 min-w-0">
													<span class="section-title">{section.number} {section.title}</span>
													{#if readingTime && !isReadSection}
														<span class="section-meta">
															<svg class="section-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
															</svg>
															{readingTime} min
														</span>
													{/if}
												</div>
											</a>
										</li>
									{/each}

									<!-- Review sections: foldout if 2+ exercise types, otherwise inline -->
									{#if reviewSections.length > 1}
										<li class="review-foldout">
											<button
												onclick={() => toggleReview(chapter.number)}
												aria-expanded={reviewExpanded}
												aria-controls="chapter-{chapter.number}-review"
												class="review-toggle"
											>
												<span class="review-toggle-label">Upprifjun</span>
												<span class="review-chevron {reviewExpanded ? 'review-chevron--open' : ''}"><Icon name="chevron-right" size="sm" /></span>
											</button>

											{#if reviewExpanded}
												<ul id="chapter-{chapter.number}-review" class="section-list review-list">
													{#each reviewSections as section (section.file)}
														{@const sectionPath = getSectionPath(section)}
														{@const isCurrent = isCurrentChapter && (sectionParam === sectionPath || sectionParam === section.slug)}
														{@const isReadSection = isRead(chapterPath, sectionPath)}
														{@const readingTime = section.metadata?.readingTime}
														<li>
															<a
																href="/{bookSlug}/kafli/{chapterPath}/{sectionPath}"
																class="section-link {isCurrent ? 'section-link--current' : ''}"
															>
																<span class="section-dot-wrap">
																	{#if isReadSection}
																		<span class="section-dot section-dot--read"></span>
																	{:else if isCurrent}
																		<span class="section-progress-ring">
																			<svg class="section-ring-svg" viewBox="0 0 20 20">
																				<circle cx="10" cy="10" r="8" fill="none" stroke="var(--border-color)" stroke-width="2" />
																				<circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent-color)" stroke-width="2" stroke-dasharray="50.27" stroke-dashoffset={50.27 - (50.27 * $scrollProgress / 100)} stroke-linecap="round" class="section-ring-progress" />
																			</svg>
																			<span class="section-dot section-dot--current"></span>
																		</span>
																	{:else}
																		<span class="section-dot section-dot--unread"></span>
																	{/if}
																</span>
																<div class="flex-1 min-w-0">
																	<span class="section-title">{section.title}</span>
																	{#if readingTime && !isReadSection}
																		<span class="section-meta">
																			<svg class="section-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
																			</svg>
																			{readingTime} min
																		</span>
																	{/if}
																</div>
															</a>
														</li>
													{/each}
												</ul>
											{/if}
										</li>
									{:else}
										{#each reviewSections as section (section.file)}
											{@const sectionPath = getSectionPath(section)}
											{@const isCurrent = isCurrentChapter && (sectionParam === sectionPath || sectionParam === section.slug)}
											{@const isReadSection = isRead(chapterPath, sectionPath)}
											{@const readingTime = section.metadata?.readingTime}
											<li>
												<a
													href="/{bookSlug}/kafli/{chapterPath}/{sectionPath}"
													class="section-link {isCurrent ? 'section-link--current' : ''}"
												>
													<span class="section-dot-wrap">
														{#if isReadSection}
															<span class="section-dot section-dot--read"></span>
														{:else if isCurrent}
															<span class="section-progress-ring">
																<svg class="section-ring-svg" viewBox="0 0 20 20">
																	<circle cx="10" cy="10" r="8" fill="none" stroke="var(--border-color)" stroke-width="2" />
																	<circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent-color)" stroke-width="2" stroke-dasharray="50.27" stroke-dashoffset={50.27 - (50.27 * $scrollProgress / 100)} stroke-linecap="round" class="section-ring-progress" />
																</svg>
																<span class="section-dot section-dot--current"></span>
															</span>
														{:else}
															<span class="section-dot section-dot--unread"></span>
														{/if}
													</span>
													<div class="flex-1 min-w-0">
														<span class="section-title">{section.title}</span>
														{#if readingTime && !isReadSection}
															<span class="section-meta">
																<svg class="section-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
																</svg>
																{readingTime} min
															</span>
														{/if}
													</div>
												</a>
											</li>
										{/each}
									{/if}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>

				<!-- Appendices section -->
				{#if toc.appendices && toc.appendices.length > 0}
					<div class="sidebar-section">
						<button
							onclick={() => appendicesExpanded = !appendicesExpanded}
							aria-expanded={appendicesExpanded}
							aria-controls="appendices-list"
							class="chapter-btn"
						>
							<span class="flex items-center gap-2">
								{#if appendicesExpanded}
									<Icon name="chevron-down" size="sm" />
								{:else}
									<Icon name="chevron-right" size="sm" />
								{/if}
								<span>Viðaukar</span>
							</span>
						</button>

						{#if appendicesExpanded}
							<ul id="appendices-list" class="section-list">
								{#each toc.appendices as appendix (appendix.letter)}
									{@const href = appendix.isInteractive && appendix.componentPath
										? `/${bookSlug}${appendix.componentPath}`
										: `/${bookSlug}/vidauki/${appendix.letter}`}
									<li>
										<a {href} class="section-link">
											<span class="appendix-letter">{appendix.letter}</span>
											<span class="section-title">{appendix.title}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}

				<!-- Answer Key section -->
				{#if toc.answerKey && toc.answerKey.length > 0}
					<div class="sidebar-section">
						<button
							onclick={() => answerKeyExpanded = !answerKeyExpanded}
							aria-expanded={answerKeyExpanded}
							aria-controls="answer-key-list"
							class="chapter-btn"
						>
							<span class="flex items-center gap-2">
								{#if answerKeyExpanded}
									<Icon name="chevron-down" size="sm" />
								{:else}
									<Icon name="chevron-right" size="sm" />
								{/if}
								<span>Svarlykill</span>
							</span>
						</button>

						{#if answerKeyExpanded}
							<ul id="answer-key-list" class="section-list">
								{#each toc.answerKey as entry (entry.chapter)}
									<li>
										<a
											href="/{bookSlug}/svarlykill/{entry.chapter}"
											class="section-link"
										>
											<span class="appendix-letter">{entry.chapter}</span>
											<span class="section-title">{entry.title}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}

				<!-- Index (Atriðisorðaskrá) -->
				<div class="sidebar-section index-link-section">
					<a href="/{bookSlug}/atridiordasskra" class="study-tool-link">
						<Icon name="list" />
						<span>Atriðisorðaskrá</span>
					</a>
				</div>

				<!-- Study tools section -->
				<div class="study-tools">
					<h3 class="study-tools-heading">Námsverkfæri</h3>

					<a href="/{bookSlug}/minniskort" class="study-tool-link">
						<Icon name="credit-card" />
						<span>Minniskort</span>
					</a>

					<a href="/{bookSlug}/ordabok" class="study-tool-link">
						<Icon name="book-open" />
						<span>Orðasafn</span>
					</a>

					<a href="/{bookSlug}/prof" class="study-tool-link">
						<Icon name="clipboard-check" />
						<span>Próf</span>
					</a>

					{#if hasPeriodicTable}
						<a href="/{bookSlug}/lotukerfi" class="study-tool-link">
							<Icon name="atom" />
							<span>Lotukerfi</span>
						</a>
					{/if}
				</div>
			{/if}
		</nav>
	</div>
</aside>

<style>
	/* ====================================
	   SIDEBAR OVERLAY (mobile backdrop)
	   ==================================== */
	.sidebar-overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(0, 0, 0, 0.2);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.3s;
	}

	.sidebar-overlay--visible {
		opacity: 1;
		pointer-events: auto;
	}

	@media (min-width: 1024px) {
		.sidebar-overlay {
			display: none;
		}
	}

	/* ====================================
	   SIDEBAR PANEL
	   ==================================== */
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 50;
		width: 320px;
		background: var(--bg-secondary);
		overflow-y: auto;
		overflow-x: hidden;
		transform: translateX(-100%);
		transition: transform 0.3s ease-out;
	}

	.sidebar--open {
		transform: translateX(0);
		box-shadow: var(--shadow-xl);
	}

	@media (min-width: 1024px) {
		.sidebar {
			top: 56px;
			z-index: 30;
			height: calc(100vh - 56px);
			transform: translateX(0);
			box-shadow: none;
			border-right: 1px solid var(--border-color);
		}

		.sidebar--open {
			box-shadow: none;
		}
	}

	/* ====================================
	   SIDEBAR HEADER
	   ==================================== */
	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
		padding: 0 1rem;
		border-bottom: 1px solid var(--border-color);
		flex-shrink: 0;
	}

	.sidebar-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.sidebar-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		margin-right: -0.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.sidebar-close:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	@media (min-width: 1024px) {
		.sidebar-close {
			display: none;
		}
	}

	/* ====================================
	   SIDEBAR NAV
	   ==================================== */
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.75rem 0;
	}

	.sidebar-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.sidebar-section {
		margin-top: 0.5rem;
		padding: 0 0.5rem;
	}

	/* ====================================
	   CHAPTER BUTTON
	   ==================================== */
	.chapter-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		margin: 0 0.5rem;
		width: calc(100% - 1rem);
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-primary);
		font-size: 0.875rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.chapter-btn:hover {
		background: var(--bg-tertiary);
	}

	/* ====================================
	   CHAPTER NUMBER CIRCLE
	   ==================================== */
	.chapter-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-full);
		background: var(--accent-color);
		color: #fff;
		font-size: 0.6875rem;
		font-weight: 700;
		flex-shrink: 0;
		line-height: 1;
	}

	.chapter-title {
		overflow-wrap: anywhere;
		min-width: 0;
	}

	/* ====================================
	   CHAPTER PROGRESS BADGE
	   ==================================== */
	.chapter-progress-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #16a34a;
		flex-shrink: 0;
	}

	:global(.dark) .chapter-progress-badge {
		color: #4ade80;
	}

	/* ====================================
	   CHAPTER CHEVRON
	   ==================================== */
	.chapter-chevron {
		display: inline-flex;
		flex-shrink: 0;
		color: var(--text-tertiary);
		transition: transform 0.2s;
	}

	.chapter-chevron--open {
		transform: rotate(90deg);
	}

	/* ====================================
	   SECTION LIST
	   ==================================== */
	.section-list {
		list-style: none;
		padding: 0.25rem 0 0.25rem 0;
		margin: 0;
	}

	/* ====================================
	   SECTION LINK
	   ==================================== */
	.section-link {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.4375rem 0.75rem 0.4375rem 0.75rem;
		margin: 0 0.5rem;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		text-decoration: none;
		transition: background 0.15s, color 0.15s;
		border-left: 2px solid transparent;
	}

	.section-link:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.section-link--current {
		background: var(--accent-light);
		color: var(--accent-color);
		border-left-color: var(--accent-color);
		font-weight: 500;
	}

	.section-link--current:hover {
		background: var(--accent-light);
		color: var(--accent-color);
	}

	/* ====================================
	   SECTION DOT INDICATORS
	   ==================================== */
	.section-dot-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.section-dot {
		border-radius: var(--radius-full);
	}

	.section-dot--read {
		width: 0.5rem;
		height: 0.5rem;
		background: #16a34a;
	}

	:global(.dark) .section-dot--read {
		background: #4ade80;
	}

	.section-dot--unread {
		width: 0.4375rem;
		height: 0.4375rem;
		border: 1.5px solid var(--text-tertiary);
		background: transparent;
	}

	.section-dot--current {
		width: 0.375rem;
		height: 0.375rem;
		background: var(--accent-color);
		position: absolute;
	}

	/* ====================================
	   SECTION PROGRESS RING (current)
	   ==================================== */
	.section-progress-ring {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
	}

	.section-ring-svg {
		position: absolute;
		width: 1.25rem;
		height: 1.25rem;
		transform: rotate(-90deg);
	}

	.section-ring-progress {
		transition: stroke-dashoffset 0.15s;
	}

	/* ====================================
	   REVIEW FOLDOUT (end-of-chapter sections)
	   ==================================== */
	.review-foldout {
		margin-top: 0.25rem;
	}

	.review-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: calc(100% - 1rem);
		padding: 0.375rem 0.75rem;
		margin: 0 0.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-tertiary);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.review-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.review-toggle-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.review-chevron {
		display: inline-flex;
		flex-shrink: 0;
		transition: transform 0.2s;
	}

	.review-chevron--open {
		transform: rotate(90deg);
	}

	.review-list {
		padding-left: 0;
	}

	/* ====================================
	   SECTION TEXT
	   ==================================== */
	.section-title {
		font-size: 0.8125rem;
		display: block;
		overflow-wrap: anywhere;
		min-width: 0;
	}

	.section-meta {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.125rem;
		font-size: 0.6875rem;
		color: var(--text-tertiary);
	}

	.section-meta-icon {
		width: 0.75rem;
		height: 0.75rem;
	}

	/* ====================================
	   APPENDIX LETTER CIRCLE
	   ==================================== */
	.appendix-letter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		font-size: 0.6875rem;
		font-weight: 600;
		flex-shrink: 0;
		line-height: 1;
	}

	/* ====================================
	   INDEX LINK SECTION
	   ==================================== */
	.index-link-section {
		padding-top: 0.25rem;
		padding-bottom: 0.25rem;
	}

	/* ====================================
	   STUDY TOOLS
	   ==================================== */
	.study-tools {
		margin-top: 1rem;
		padding: 0.75rem 0.5rem 1rem;
		border-top: 1px solid var(--border-color);
	}

	.study-tools-heading {
		padding: 0 0.75rem 0.375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.study-tool-link {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.4375rem 0.75rem;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.8125rem;
		transition: background 0.15s, color 0.15s;
	}

	.study-tool-link:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

</style>
