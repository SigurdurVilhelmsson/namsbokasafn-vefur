import type { PageLoad } from './$types';
import { books } from '$lib/types/book';

export const prerender = true;

export async function entries() {
	return books.map((b) => ({ bookSlug: b.slug }));
}

export const load: PageLoad = async () => {
	// Data comes from +layout.ts — no additional loading needed
	return {};
};
