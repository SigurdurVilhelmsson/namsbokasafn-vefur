// @vitest-environment node
/**
 * The chapter and section pages' meta descriptions name the book's own subject
 * (June code review M18). They said 'Efnafræði kennslubók á íslensku' for every
 * book, so biology's or physics' pages described themselves as chemistry.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { books, getBook, retiredBooks } from '$lib/types/book';
import { textbookPhrase } from './metaDescription';

const FALLBACK = 'Kennslubók á íslensku';

describe('textbookPhrase', () => {
	it("keeps chemistry's phrase byte for byte (the one book deployed)", () => {
		expect(textbookPhrase(getBook('efnafraedi-2e'))).toBe('Efnafræði kennslubók á íslensku');
	});

	it("names each book's own subject, published and retired", () => {
		const all = [...books, ...retiredBooks];
		expect(all.length).toBeGreaterThanOrEqual(5);
		for (const book of all) {
			expect(textbookPhrase(book)).toBe(`${book.title} kennslubók á íslensku`);
		}
		expect(textbookPhrase(getBook('liffraedi-2e'))).toBe('Líffræði kennslubók á íslensku');
		expect(textbookPhrase(getBook('edlisfraedi-2e'))).toBe('Eðlisfræði kennslubók á íslensku');
		// No two books share a phrase, so none borrows another's subject
		expect(new Set(all.map((b) => textbookPhrase(b))).size).toBe(all.length);
	});

	it("names no subject without a title, never another book's", () => {
		for (const book of [undefined, null, {}, { title: '' }, { title: '   ' }, { title: null }]) {
			expect(textbookPhrase(book)).toBe(FALLBACK);
		}
		for (const book of [...books, ...retiredBooks]) {
			expect(FALLBACK.toLowerCase()).not.toContain(book.title.toLowerCase());
		}
	});
});

describe('the chapter and section pages', () => {
	const ROUTES = fileURLToPath(new URL('../../routes', import.meta.url));
	const CHAPTER = join(ROUTES, '[bookSlug]', 'kafli', '[chapterSlug]', '+page.svelte');
	const SECTION = join(ROUTES, '[bookSlug]', 'kafli', '[chapterSlug]', '[sectionSlug]', '+page.svelte');

	function svelteFiles(dir: string): string[] {
		return readdirSync(dir).flatMap((name) => {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) return svelteFiles(path);
			return name.endsWith('.svelte') ? [path] : [];
		});
	}

	/** The description and og:description tags of a page's source */
	function descriptionTags(file: string): string[] {
		return readFileSync(file, 'utf8').match(/<meta (?:name="description"|property="og:description")[^>]*>/g) ?? [];
	}

	it('end their descriptions with the book phrase', () => {
		const chapter = descriptionTags(CHAPTER);
		const section = descriptionTags(SECTION);
		// The control: the tags are found (chapter: description and og:description)
		expect(chapter).toHaveLength(2);
		expect(section).toHaveLength(2);
		expect(chapter.filter((tag) => tag.includes('{textbookPhrase(data.book)}'))).toHaveLength(1);
		expect(section.filter((tag) => tag.includes('{textbookPhrase(data.book)}'))).toHaveLength(2);
	});

	it("no route writes a book's subject into the phrase", () => {
		const files = svelteFiles(ROUTES);
		expect(files).toContain(CHAPTER);
		expect(files).toContain(SECTION);
		const hardcoded = files.filter((f) => /kennslubók á íslensku/i.test(readFileSync(f, 'utf8')));
		expect(hardcoded).toEqual([]);
	});
});
