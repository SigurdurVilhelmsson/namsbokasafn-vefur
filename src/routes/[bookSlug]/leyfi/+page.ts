import type { PageLoad } from './$types';
import { books } from '$lib/types/book';

export const prerender = true;

export function entries() {
	return books.map((b) => ({ bookSlug: b.slug }));
}

export const load: PageLoad = async () => {
	// Attribution data comes from +layout.ts (book config) — nothing extra to load.
	return {};
};
