<script lang="ts">
	import { page } from '$app/stores';
	import { settings, sidebarOpen, reader } from '$lib/stores';
	import { isSectionRead, calcChapterProgress, scrollProgress } from '$lib/stores/reader';
	import { onMount } from 'svelte';
	import type { TableOfContents, Chapter, Appendix } from '$lib/types/content';
	import { loadTableOfContents, getChapterPath, getSectionPath, findChapterBySlug } from '$lib/utils/contentLoader';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let bookSlug: string = '';
	export let hasPeriodicTable: boolean = false;

	let toc: TableOfContents | null = null;
	let manuallyToggledChapters: Set<number> = new Set();
	let appendicesExpanded = false;
	let answerKeyExpanded = false;

	// Get current route params
	$: chapterParam = $page.params.chapterSlug;
	$: sectionParam = $page.params.sectionSlug;

	// Subscribe to reader progress for reactivity
	$: progress = $reader.progress;

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
	$: expandedChapters = (() => {
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
	})();

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

	// Reactive helpers using subscribed progress (use chapter/section paths)
	function isRead(chapterPath: string, sectionPath: string): boolean {
		return isSectionRead(progress, chapterPath, sectionPath);
	}

	function getChapterProgressPercent(chapter: Chapter): number {
		return calcChapterProgress(progress, getChapterPath(chapter), chapter.sections.length);
	}
</script>

<!-- Overlay (backdrop) -->
<div
	class="sidebar-overlay {$sidebarOpen ? 'sidebar-overlay--visible' : ''}"
	on:click={closeSidebar}
	on:keydown={(e) => e.key === 'Escape' && closeSidebar()}
	role="button"
	tabindex="-1"
	aria-hidden="true"
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
				on:click={closeSidebar}
				class="sidebar-close"
				aria-label="Loka valmynd"
			>
				<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
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
								on:click={() => toggleChapter(chapter.number)}
								aria-expanded={expanded}
								aria-controls="chapter-{chapter.number}-sections"
								class="chapter-btn"
							>
								<span class="flex items-center gap-2">
									<span class="chapter-number">{chapter.number}</span>
									<span class="chapter-title">{chapter.title}</span>
								</span>
								<span class="flex items-center gap-2">
									{#if progressPercent > 0}
										<span class="chapter-progress-badge">{progressPercent}%</span>
									{/if}
									<svg
										class="chapter-chevron {expanded ? 'chapter-chevron--open' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</span>
							</button>

							<!-- Sections -->
							{#if expanded}
								<ul id="chapter-{chapter.number}-sections" class="section-list">
									{#each chapter.sections as section (section.file)}
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
								</ul>
							{/if}
						</li>
					{/each}
				</ul>

				<!-- Appendices section -->
				{#if toc.appendices && toc.appendices.length > 0}
					<div class="sidebar-section">
						<button
							on:click={() => appendicesExpanded = !appendicesExpanded}
							aria-expanded={appendicesExpanded}
							aria-controls="appendices-list"
							class="chapter-btn"
						>
							<span class="flex items-center gap-2">
								{#if appendicesExpanded}
									<svg class="sidebar-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{:else}
									<svg class="sidebar-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
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
							on:click={() => answerKeyExpanded = !answerKeyExpanded}
							aria-expanded={answerKeyExpanded}
							aria-controls="answer-key-list"
							class="chapter-btn"
						>
							<span class="flex items-center gap-2">
								{#if answerKeyExpanded}
									<svg class="sidebar-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{:else}
									<svg class="sidebar-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
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

				<!-- Study tools section -->
				<div class="study-tools">
					<h3 class="study-tools-heading">Námsverkfæri</h3>

					<a href="/{bookSlug}/minniskort" class="study-tool-link">
						<svg class="study-tool-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
						<span>Minniskort</span>
					</a>

					<a href="/{bookSlug}/ordabok" class="study-tool-link">
						<svg class="study-tool-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
						<span>Orðasafn</span>
					</a>

					<a href="/{bookSlug}/prof" class="study-tool-link">
						<svg class="study-tool-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
						</svg>
						<span>Próf</span>
					</a>

					{#if hasPeriodicTable}
						<a href="/{bookSlug}/lotukerfi" class="study-tool-link">
							<svg class="study-tool-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="3" stroke-width="2" />
								<ellipse cx="12" cy="12" rx="9" ry="4" stroke-width="2" />
								<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" stroke-width="2" />
								<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" stroke-width="2" />
							</svg>
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
		width: 280px;
		background: var(--bg-secondary);
		overflow-y: auto;
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
	   ICONS
	   ==================================== */
	.sidebar-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.sidebar-icon-sm {
		width: 1rem;
		height: 1rem;
	}

	/* ====================================
	   SIDEBAR NAV
	   ==================================== */
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	/* ====================================
	   CHAPTER CHEVRON
	   ==================================== */
	.chapter-chevron {
		width: 0.875rem;
		height: 0.875rem;
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
	   SECTION TEXT
	   ==================================== */
	.section-title {
		font-size: 0.8125rem;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.study-tool-icon {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}
</style>
