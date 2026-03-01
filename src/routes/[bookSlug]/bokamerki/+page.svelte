<!--
  Bookmarks Page - Displays and manages user bookmarks
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents, Chapter, Section } from '$lib/types/content';
	import { reader, bookmarks } from '$lib/stores/reader';
	import { loadTableOfContents, findSectionBySlug } from '$lib/utils/contentLoader';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let data: PageData;

	let toc: TableOfContents | null = null;
	let loading = true;
	let error: string | null = null;

	interface BookmarkInfo {
		id: string;
		chapterSlug: string;
		sectionSlug: string;
		chapter: Chapter;
		section: Section;
	}

	onMount(async () => {
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			error = 'Gat ekki hlaðið efnisyfirliti';
			console.error(e);
		} finally {
			loading = false;
		}
	});

	// Parse bookmark ID into chapter and section slugs
	function parseBookmarkId(bookmarkId: string): { chapterSlug: string; sectionSlug: string } | null {
		const parts = bookmarkId.split('/');
		if (parts.length !== 2) return null;
		return { chapterSlug: parts[0], sectionSlug: parts[1] };
	}

	// Find chapter and section info from TOC (supports both v1 slugs and v2 numbers)
	function findSectionInfo(
		tocData: TableOfContents,
		chapterSlug: string,
		sectionSlug: string
	): { chapter: Chapter; section: Section } | null {
		return findSectionBySlug(tocData, chapterSlug, sectionSlug);
	}

	// Resolve bookmarks to full info with titles
	$: resolvedBookmarks = (() => {
		if (!toc) return [];

		const resolved: BookmarkInfo[] = [];
		for (const bookmarkId of $bookmarks) {
			const parsed = parseBookmarkId(bookmarkId);
			if (!parsed) continue;

			const info = findSectionInfo(toc, parsed.chapterSlug, parsed.sectionSlug);
			if (!info) continue;

			resolved.push({
				id: bookmarkId,
				chapterSlug: parsed.chapterSlug,
				sectionSlug: parsed.sectionSlug,
				chapter: info.chapter,
				section: info.section
			});
		}

		// Sort by chapter number, then section number
		return resolved.sort((a, b) => {
			if (a.chapter.number !== b.chapter.number) {
				return a.chapter.number - b.chapter.number;
			}
			return a.section.number.localeCompare(b.section.number, 'is', { numeric: true });
		});
	})();

	// Group bookmarks by chapter
	$: bookmarksByChapter = (() => {
		const grouped = new Map<number, BookmarkInfo[]>();
		for (const bookmark of resolvedBookmarks) {
			const chapterNum = bookmark.chapter.number;
			if (!grouped.has(chapterNum)) {
				grouped.set(chapterNum, []);
			}
			grouped.get(chapterNum)!.push(bookmark);
		}
		return grouped;
	})();

	function removeBookmark(chapterSlug: string, sectionSlug: string) {
		reader.removeBookmark(chapterSlug, sectionSlug);
	}

	function clearAllBookmarks() {
		if (confirm('Ertu viss um að þú viljir eyða öllum bókamerkjum?')) {
			for (const bookmark of resolvedBookmarks) {
				reader.removeBookmark(bookmark.chapterSlug, bookmark.sectionSlug);
			}
		}
	}
</script>

<svelte:head>
	<title>Bókamerki | {data.book?.title ?? 'Bók'}</title>
	<meta property="og:title" content="Bókamerki | {data.book?.title ?? 'Bók'}" />
	<meta property="og:description" content="Vistuð bókamerki í {data.book?.title ?? 'kennslubók'}" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/bokamerki" />
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Bókamerki
		</h1>
		{#if resolvedBookmarks.length > 0}
			<button
				on:click={clearAllBookmarks}
				class="text-sm px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
			>
				Eyða öllum
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="space-y-6">
			<!-- Skeleton for chapter groups -->
			{#each Array(2) as _}
				<div>
					<!-- Chapter header skeleton -->
					<div class="flex items-center gap-2 mb-3">
						<Skeleton variant="text" className="w-6 h-6 rounded" />
						<Skeleton variant="text" className="w-32 h-4" />
					</div>
					<!-- Bookmark items skeleton -->
					<div class="space-y-2">
						{#each Array(3) as _}
							<div class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
								<Skeleton variant="text" className="w-5 h-5 flex-shrink-0" />
								<div class="flex-1 space-y-2">
									<Skeleton variant="text" className="w-48 h-5" />
									<Skeleton variant="text" className="w-32 h-4" />
								</div>
								<div class="flex gap-2">
									<Skeleton variant="text" className="w-9 h-9 rounded-lg" />
									<Skeleton variant="text" className="w-9 h-9 rounded-lg" />
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
			<p class="text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if resolvedBookmarks.length === 0}
		<!-- Empty state -->
		<div class="text-center py-16">
			<svg
				class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
				/>
			</svg>
			<h2 class="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
				Engin bókamerki
			</h2>
			<p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
				Þú hefur ekki bætt við neinum bókamerkjum enn. Smelltu á bókamerkjatáknið í efri hægri horninu meðan þú lest kafla til að bæta við bókamerki.
			</p>
			<a
				href="/{data.bookSlug}"
				class="btn-accent mt-6"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				Fara í efnisyfirlit
			</a>
		</div>
	{:else}
		<!-- Bookmark count -->
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
			{resolvedBookmarks.length} {resolvedBookmarks.length === 1 ? 'bókamerki' : 'bókamerki'}
		</p>

		<!-- Bookmarks grouped by chapter -->
		<div class="space-y-8">
			{#each [...bookmarksByChapter.entries()] as [chapterNum, chapterBookmarks] (chapterNum)}
				{@const chapter = chapterBookmarks[0].chapter}
				<div>
					<!-- Chapter header -->
					<h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
						<span class="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs">
							{chapter.number}
						</span>
						{chapter.title}
					</h2>

					<!-- Section bookmarks -->
					<div class="space-y-2">
						{#each chapterBookmarks as bookmark (bookmark.id)}
							<div
								class="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[var(--accent-subtle)] transition-colors"
							>
								<!-- Bookmark icon -->
								<div class="flex-shrink-0">
									<svg
										class="w-5 h-5 text-amber-500"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
									</svg>
								</div>

								<!-- Content -->
								<a
									href="/{data.bookSlug}/kafli/{bookmark.chapterSlug}/{bookmark.sectionSlug}"
									class="flex-1 min-w-0"
								>
									<h3 class="font-medium text-gray-900 dark:text-gray-100 group-hover:text-[var(--accent-color)] transition-colors">
										{bookmark.section.number} {bookmark.section.title}
									</h3>
									<p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
										{chapter.number}. kafli: {chapter.title}
									</p>
								</a>

								<!-- Actions -->
								<div class="flex items-center gap-2">
									<!-- Go to section -->
									<a
										href="/{data.bookSlug}/kafli/{bookmark.chapterSlug}/{bookmark.sectionSlug}"
										class="p-2 rounded-lg text-gray-400 hover:text-[var(--accent-color)] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
										aria-label="Fara í kafla"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
										</svg>
									</a>

									<!-- Remove bookmark -->
									<button
										on:click={() => removeBookmark(bookmark.chapterSlug, bookmark.sectionSlug)}
										class="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
										aria-label="Eyða bókamerki"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
