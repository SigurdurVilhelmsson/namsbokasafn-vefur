import type { PageLoad } from './$types';

export const prerender = true;

export async function entries() {
	const fs = await import('node:fs');
	const books = fs
		.readdirSync('static/content', { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
	return books.map((slug) => ({ bookSlug: slug }));
}

export const load: PageLoad = async () => {
	// Data comes from +layout.ts — no additional loading needed
	return {};
};
