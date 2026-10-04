/**
 * Pure core of "download for offline": what to fetch, what to delete, and what
 * state a downloaded book is in. No Cache API here, so it is unit-tested directly;
 * src/lib/stores/offline.ts does the I/O.
 */

/** One file of `offline-manifest.json`: URL path, disk bytes, content hash ('' = unknown). */
export interface ManifestFile {
	p: string;
	b: number;
	h: string;
}

export interface OfflineManifest {
	/** Content version; null for a list built in the browser (no build-time manifest). */
	version: string | null;
	bytes: number;
	files: ManifestFile[];
}

/**
 * What a book's offline cache really holds, stored in that cache and written LAST,
 * so an interrupted download never claims to be complete.
 */
export interface HeldState {
	version: string | null;
	complete: boolean;
	/** Number of files the manifest listed when this was written. */
	total: number;
	/** Path → hash of every file stored and verified. */
	files: Record<string, string>;
}

export type OfflineStatus = 'none' | 'legacy' | 'incomplete' | 'outdated' | 'complete';

/** Cache key of the held-state record: no extension, so no service-worker route matches it. */
export const heldStateKey = (bookSlug: string): string => `/content/${bookSlug}/__offline-state`;

/** Files always kept in a book's offline cache whatever the manifest says. */
const isBookkeeping = (path: string, bookSlug: string): boolean =>
	path === heldStateKey(bookSlug) || path === `/content/${bookSlug}/toc.json`;

/**
 * Plan a download, a resume or an update: fetch every file that is not stored with
 * the manifest's hash, delete every stored file the manifest no longer lists.
 *
 * @param cached paths present in the book's offline cache right now
 */
export function planSync(
	bookSlug: string,
	manifest: OfflineManifest,
	held: HeldState | null,
	cached: Set<string>
): { toFetch: ManifestFile[]; toDelete: string[]; bytes: number } {
	const toFetch = manifest.files.filter((f) => !(cached.has(f.p) && held?.files[f.p] === f.h));
	const wanted = new Set(manifest.files.map((f) => f.p));
	const toDelete = [...cached].filter((p) => !wanted.has(p) && !isBookkeeping(p, bookSlug));
	return { toFetch, toDelete, bytes: toFetch.reduce((sum, f) => sum + f.b, 0) };
}

/**
 * The state of a downloaded book.
 *
 * @param tocVersion `toc.offline.version` of the book as served now (null when unknown)
 * @param legacy     the record was written by the pre-2026-10 download, which kept
 *                   only 200 figures while saying "Sótt"
 */
export function deriveStatus(
	tocVersion: string | null,
	held: HeldState | null,
	cached: Set<string>,
	legacy: boolean
): { status: OfflineStatus; missing: number } {
	if (!held) return { status: legacy ? 'legacy' : 'none', missing: 0 };
	const present = Object.keys(held.files).filter((p) => cached.has(p)).length;
	const missing = Math.max(0, held.total - present);
	if (!held.complete || missing > 0) return { status: 'incomplete', missing };
	if (tocVersion && held.version !== tocVersion) return { status: 'outdated', missing: 0 };
	return { status: 'complete', missing: 0 };
}
