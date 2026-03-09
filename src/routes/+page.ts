import { getAllBooks } from '$lib/types/book';
import { getTier1Entries, getTier2Entries, getSubjectGroups } from '$lib/data/openstax-catalogue';
import type { TableOfContents } from '$lib/types/content';
import type { BookConfig } from '$lib/types/book';

export const prerender = true;

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
	const allBooks = getAllBooks();
	const tier1Entries = getTier1Entries();

	// Visible books: Tier 1 catalogue entries cross-referenced with BookConfig
	const tier1Slugs = tier1Entries
		.filter((e) => e.bookSlug)
		.map((e) => e.bookSlug!);

	const visibleBooks = allBooks.filter(
		(b) =>
			tier1Slugs.includes(b.slug) ||
			b.status === 'available' ||
			b.status === 'in-progress' ||
			b.status === 'preview'
	);

	// Fetch actual chapter counts from toc.json for each visible book
	const books: BookConfig[] = await Promise.all(
		visibleBooks.map(async (book) => {
			try {
				const res = await fetch(`/content/${book.slug}/toc.json`);
				if (!res.ok) return book;

				const toc: TableOfContents = await res.json();
				const translatedChapters = toc.chapters.length;

				return {
					...book,
					stats: {
						totalChapters: book.stats?.totalChapters ?? translatedChapters,
						translatedChapters
					}
				};
			} catch {
				return book;
			}
		})
	);

	const translationBooks = books.filter(
		(b) => b.status === 'available' || b.status === 'in-progress'
	);
	const sampleBooks = books.filter((b) => b.status === 'preview');

	return {
		books,
		translationBooks,
		sampleBooks,
		tier2Groups: getTier2Entries(),
		subjectGroups: getSubjectGroups()
	};
}
