import { getAllBooks } from '$lib/types/book';
import type { TableOfContents } from '$lib/types/content';
import type { BookConfig } from '$lib/types/book';

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
	const allBooks = getAllBooks();

	// Only show books that are available or in-progress
	const visibleBooks = allBooks.filter(
		(b) => b.status === 'available' || b.status === 'in-progress'
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

	return { books };
}
