/**
 * Load the reader's book registry (src/lib/types/book.ts) for Node scripts
 * that cannot import TypeScript.
 *
 * esbuild bundles a small entry that re-exports what the scripts need,
 * resolving the `$lib` alias, and the bundle is imported from a data: URL
 * (the same route scripts/validate-content.js takes for its attribution gate).
 * The data stay in one place: book.ts is the source of truth, and nothing
 * here copies a title.
 */

import { resolve } from 'node:path';
import { build } from 'esbuild';

const ENTRY = `
export { books } from '$lib/types/book';
`;

/**
 * @param {string} projectRoot the repository root
 * @returns {Promise<{ books: Array<Record<string, any>> }>}
 */
export async function loadBookConfig(projectRoot) {
	const libDir = resolve(projectRoot, 'src', 'lib');
	const result = await build({
		stdin: { contents: ENTRY, resolveDir: libDir, loader: 'ts', sourcefile: 'book-config.ts' },
		bundle: true,
		format: 'esm',
		platform: 'node',
		write: false,
		logLevel: 'silent',
		alias: { $lib: libDir }
	});
	const code = result.outputFiles[0].text;
	return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
