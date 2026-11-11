import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import {
	pagesByModule,
	compareTrees,
	parseRedirectRows,
	staleRows,
	rowsToWrite,
	formatRow
} from './check-content-renames.js';

const ROWS = `
export interface SectionRedirect { bookSlug: string; fromSlug: string; }
export const SECTION_REDIRECTS = [
	{
		bookSlug: 'bok',
		fromChapter: '01',
		fromSlug: '1-1-gamalt',
		toChapter: '01',
		toSlug: '1-1-nytt',
		moduleId: 'm1'
	}
];`;

function page(root, chapter, slug, moduleId) {
	mkdirSync(join(root, 'chapters', chapter), { recursive: true });
	writeFileSync(
		join(root, 'chapters', chapter, `${slug}.html`),
		`<article class="cnx-module" data-module-id="${moduleId}"></article>`
	);
}

const cli = (args) =>
	spawnSync(process.execPath, ['scripts/check-content-renames.js', ...args], { encoding: 'utf8' });

// A redirects file with no rows, so a CLI test never reads the real table.
function noRows(dir) {
	const file = join(dir, 'no-rows.ts');
	writeFileSync(file, 'export const SECTION_REDIRECTS = [];\n');
	return file;
}

describe('check-content-renames', () => {
	let dir, before, after;
	const run = (rows = parseRedirectRows(ROWS), book = 'bok') => {
		const b = pagesByModule(before);
		const a = pagesByModule(after);
		const { renames, deletions } = compareTrees(b, a, rows, book);
		const stale = staleRows(rows, a, book);
		return { renames, deletions, stale, plan: rowsToWrite(book, renames, stale) };
	};
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'renames-'));
		before = join(dir, 'before');
		after = join(dir, 'bok');
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('reads the redirect rows, with their module id, and skips the interface', () => {
		expect(parseRedirectRows(ROWS)).toEqual([
			{
				bookSlug: 'bok',
				fromChapter: '01',
				fromSlug: '1-1-gamalt',
				toChapter: '01',
				toSlug: '1-1-nytt',
				moduleId: 'm1'
			}
		]);
	});

	it('passes a rename with its row and an unchanged page', () => {
		page(before, '01', '1-1-gamalt', 'm1');
		page(before, '01', '1-2-sama', 'm2');
		page(after, '01', '1-1-nytt', 'm1');
		page(after, '01', '1-2-sama', 'm2');
		const r = run();
		expect(r.deletions).toEqual([]);
		expect(r.renames.map((x) => x.status)).toEqual(['covered']);
		expect(r.stale).toEqual([]);
		expect(r.plan).toEqual({ add: [], change: [] });
	});

	it('flags a rename with no row, a row for another book, and a deleted module', () => {
		page(before, '01', '1-3-gamalt', 'm3');
		page(before, '01', '1-4-farid', 'm4');
		page(after, '01', '1-3-nytt', 'm3');
		const r = run();
		expect(r.renames.map((x) => x.status)).toEqual(['missing']);
		expect(r.deletions).toEqual([{ moduleId: 'm4', chapter: '01', slug: '1-4-farid' }]);

		page(before, '01', '1-1-gamalt', 'm1');
		page(after, '01', '1-1-nytt', 'm1');
		const other = run(parseRedirectRows(ROWS), 'annad');
		expect(other.renames.find((x) => x.moduleId === 'm1').status).toBe('missing');
	});

	it('writes the missing row, in sectionRedirects.ts layout', () => {
		page(before, '02', '2-1-gamalt', 'm5');
		page(after, '02', '2-1-nytt', 'm5');
		const { plan } = run();
		expect(plan.add).toEqual([
			{ bookSlug: 'bok', fromChapter: '02', fromSlug: '2-1-gamalt', toChapter: '02', toSlug: '2-1-nytt', moduleId: 'm5' }
		]);
		expect(formatRow(plan.add[0])).toBe(
			"\t{\n\t\tbookSlug: 'bok',\n\t\tfromChapter: '02',\n\t\tfromSlug: '2-1-gamalt',\n\t\ttoChapter: '02',\n\t\ttoSlug: '2-1-nytt',\n\t\tmoduleId: 'm5'\n\t},"
		);
	});

	it('orders the rows by chapter and section number', () => {
		for (const [ch, n, m] of [['10', '10', 'm10'], ['02', '9', 'm9'], ['10', '2', 'm2']]) {
			page(before, ch, `${Number(ch)}-${n}-gamalt`, m);
			page(after, ch, `${Number(ch)}-${n}-nytt`, m);
		}
		expect(run().plan.add.map((r) => r.fromSlug)).toEqual(['2-9-gamalt', '10-2-gamalt', '10-10-gamalt']);
	});

	it('replaces a row that points elsewhere, since the route reads only the first', () => {
		// The row's target is still published, but as another module's page,
		// so the row is not stale: only the rename shows it points elsewhere.
		page(before, '01', '1-1-gamalt', 'm1');
		page(after, '01', '1-1-annad', 'm1');
		page(after, '01', '1-1-nytt', 'm9');
		const r = run();
		expect(r.renames.map((x) => x.status)).toEqual(['wrong-target']);
		expect(r.stale).toEqual([]);
		expect(r.plan.add).toEqual([]);
		expect(r.plan.change.map((c) => [c.row.toSlug, c.replaces.toSlug])).toEqual([['1-1-annad', '1-1-nytt']]);
	});

	it('flags a stale row and re-points it at its module page in the new tree', () => {
		// Live: 1-1-nytt (the row's target). New tree: m1 renamed again.
		page(before, '01', '1-1-nytt', 'm1');
		page(after, '01', '1-1-thridja', 'm1');
		const r = run();
		expect(r.stale.map((s) => s.status)).toEqual(['stale']);
		// Both old addresses go to the new page: a new row and the re-pointed one.
		expect(r.plan.add.map((x) => `${x.fromSlug}>${x.toSlug}`)).toEqual(['1-1-nytt>1-1-thridja']);
		expect(r.plan.change.map((c) => `${c.row.fromSlug}>${c.row.toSlug}`)).toEqual(['1-1-gamalt>1-1-thridja']);
	});

	it('flags a stale row whose module is gone, with nothing to suggest', () => {
		page(before, '01', '1-2-sama', 'm2');
		page(after, '01', '1-2-sama', 'm2');
		const r = run();
		expect(r.stale.map((s) => s.status)).toEqual(['stale-gone']);
		expect(r.plan.change).toEqual([]);
	});

	it('flags a stale row with no target to suggest: two pages, or no moduleId', () => {
		page(before, '01', '1-2-sama', 'm2');
		page(after, '01', '1-2-sama', 'm2');
		page(after, '01', '1-1-a', 'm1');
		page(after, '01', '1-1-b', 'm1');
		expect(run().stale.map((s) => [s.status, s.ok])).toEqual([['stale-ambiguous', false]]);

		const noId = parseRedirectRows(ROWS.replace("\t\tmoduleId: 'm1'\n", ''));
		expect(noId[0].moduleId).toBeNull();
		const r = run(noId);
		expect(r.stale.map((s) => s.status)).toEqual(['stale-gone']);
		expect(r.plan.change).toEqual([]);
	});

	it('notes, without a stop, a row whose old page is published', () => {
		page(before, '01', '1-1-gamalt', 'm1');
		page(after, '01', '1-1-gamalt', 'm1');
		const r = run();
		expect(r.stale.map((s) => [s.status, s.ok])).toEqual([['inert', true]]);
		expect(r.plan).toEqual({ add: [], change: [] });
	});

	it('refuses to choose a target when one module has two pages', () => {
		page(before, '01', '1-3-gamalt', 'm3');
		page(after, '01', '1-3-nytt', 'm3');
		page(after, '01', '1-3-annad', 'm3');
		const r = run();
		expect(r.renames.map((x) => [x.status, x.ok])).toEqual([['ambiguous', false]]);
		expect(r.plan.add).toEqual([]);
	});

	it('needs no row for an appendix that keeps its letter, and stops on one that changes it', () => {
		page(before, 'appendices', 'appendices-3-gamalt', 'm7');
		page(after, 'appendices', 'appendices-3-nytt', 'm7');
		page(before, 'appendices', 'appendices-4-gamalt', 'm8');
		page(after, 'appendices', 'appendices-5-nytt', 'm8');
		const r = run();
		const byId = Object.fromEntries(r.renames.map((x) => [x.moduleId, [x.status, x.ok]]));
		expect(byId).toEqual({ m7: ['appendix', true], m8: ['appendix-moved', false] });
		expect(r.plan.add).toEqual([]);
	});

	it('stops on a page that moves in or out of the appendices, and writes no row', () => {
		page(before, 'appendices', 'appendices-2-gamalt', 'm9');
		page(after, '05', '5-9-nytt', 'm9');
		const r = run();
		expect(r.renames.map((x) => [x.status, x.ok])).toEqual([['appendix-moved', false]]);
		expect(r.plan.add).toEqual([]);
	});

	it('round trip: the rows it prints, pasted in, leave no stop', () => {
		page(before, '01', '1-1-nytt', 'm1'); // stale target after this release
		page(before, '03', '3-2-gamalt', 'm6');
		page(after, '01', '1-1-thridja', 'm1');
		page(after, '03', '3-2-nytt', 'm6');
		const existing = parseRedirectRows(ROWS);
		const first = run(existing);
		expect(first.plan.add).toHaveLength(2);
		expect(first.plan.change).toHaveLength(1);
		const pasted = [...first.plan.add, ...first.plan.change.map((c) => c.row)].map(formatRow).join('\n');
		const kept = existing.filter((r) => !first.plan.change.some((c) => c.replaces === r));
		const rows = [...kept, ...parseRedirectRows(`[\n${pasted}\n]`)];
		const second = run(rows);
		expect(second.renames.every((x) => x.ok)).toBe(true);
		expect(second.stale.filter((s) => !s.ok)).toEqual([]);
		expect(second.plan).toEqual({ add: [], change: [] });
	});

	it('the CLI exits 1 on a STOP and 2 without arguments', () => {
		page(before, '01', '1-4-farid', 'm4');
		page(after, '01', '1-5-annad', 'm5');
		const stop = cli(['--book', 'orverufraedi', '--redirects', noRows(dir), before, after]);
		expect(stop.status).toBe(1);
		expect(stop.stdout).toContain('STOP deleted m4: 01/1-4-farid');
		expect(cli([]).status).toBe(2);
	});

	it('the CLI refuses a folder not named after a known book unless --book names one', () => {
		const efniTree = join(dir, 'mt-preview');
		page(before, '01', '1-1-sama', 'm1');
		page(efniTree, '01', '1-1-sama', 'm1');
		const bare = cli(['--redirects', noRows(dir), before, efniTree]);
		expect(bare.status).toBe(2);
		expect(bare.stderr).toContain('pass --book');
		const named = cli(['--book', 'orverufraedi', '--redirects', noRows(dir), before, efniTree]);
		expect(named.status).toBe(0);
		expect(named.stdout).toContain('every removed page has its redirect');
	});

	it('the CLI prints the rows to add and to replace, from the --redirects file', () => {
		// The fixture row's target, live, is renamed again in the new tree.
		const rowsFile = join(dir, 'redirects.ts');
		writeFileSync(rowsFile, ROWS.replace("bookSlug: 'bok'", "bookSlug: 'orverufraedi'"));
		page(before, '01', '1-1-nytt', 'm1');
		page(after, '01', '1-1-thridja', 'm1');
		const out = cli(['--book', 'orverufraedi', '--redirects', rowsFile, before, after]);
		expect(out.status).toBe(1);
		expect(out.stdout).toContain('STOP stale row 01/1-1-gamalt -> 01/1-1-nytt');
		expect(out.stdout).toContain('Rows to add to src/lib/data/sectionRedirects.ts (1):');
		expect(out.stdout).toContain("\t\tfromSlug: '1-1-nytt',\n\t\ttoChapter: '01',\n\t\ttoSlug: '1-1-thridja',");
		expect(out.stdout).toContain('\t// was -> 01/1-1-nytt');
		expect(out.stdout).toContain("\t\tfromSlug: '1-1-gamalt',\n\t\ttoChapter: '01',\n\t\ttoSlug: '1-1-thridja',");
		expect(cli(['--book', 'orverufraedi', '--redirects', join(dir, 'none.ts'), before, after]).status).toBe(2);
	});

	it('reads the real redirect file', () => {
		const rows = parseRedirectRows(readFileSync('src/lib/data/sectionRedirects.ts', 'utf8'));
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.every((r) => r.fromSlug && r.toSlug && r.bookSlug && r.moduleId)).toBe(true);
	});
});
