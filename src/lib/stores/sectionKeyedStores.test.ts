// @vitest-environment node
/**
 * Every store that keeps reader state by section must follow a renamed section (#258). A
 * store left out of migrateRenamedSections() keeps its data under the old slug, and the
 * renamed page shows none of it, with no error. This guard lists the store files that use a
 * section key and fails on one that is neither migrated nor exempted below with a reason
 * (plan step S5.1, CODE-02). CLAUDE.md: "A new store keyed by section must get a
 * renameSections() and a line in migrateRenamedSections()".
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STORES_DIR = fileURLToPath(new URL('.', import.meta.url));
const SECTION_KEY = /\b(sectionSlug|sectionKey|createSectionKey)\b/;

/** Store file, and its row's name in migrateRenamedSections() */
const MIGRATED: Record<string, string> = {
	'reader.ts': 'reader',
	'annotation.ts': 'annotations',
	'analytics.ts': 'analytics',
	'objectives.ts': 'objectives',
	'quiz.ts': 'quiz',
	'recall.ts': 'recall'
};

/** Store files that use a section key but keep nothing a rename should move, each with why */
const EXEMPT: Record<string, string> = {};

const NOT_STORES = new Set(['index.ts', 'sectionRenameMigration.ts']);
const storeFiles = readdirSync(STORES_DIR).filter(
	(f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !NOT_STORES.has(f)
);
const sectionKeyed = storeFiles.filter((f) => SECTION_KEY.test(readFileSync(join(STORES_DIR, f), 'utf8'))).sort();
const migration = readFileSync(join(STORES_DIR, 'sectionRenameMigration.ts'), 'utf8');

describe('section-keyed stores', () => {
	it('finds the stores it guards (the control)', () => {
		expect(sectionKeyed).toContain('reader.ts');
	});

	it('every store that uses a section key is migrated or exempted', () => {
		expect(sectionKeyed.filter((f) => !(f in MIGRATED) && !(f in EXEMPT))).toEqual([]);
	});

	it.each(Object.entries(MIGRATED))('%s has its row in migrateRenamedSections()', (file, row) => {
		expect(migration).toContain(`from './${file.replace(/\.ts$/, '')}'`);
		expect(migration).toMatch(new RegExp(`\\['${row}',\\s*\\w+\\]`));
	});

	it('lists no file that no longer uses a section key', () => {
		expect(Object.keys({ ...MIGRATED, ...EXEMPT }).filter((f) => !sectionKeyed.includes(f))).toEqual([]);
	});
});
