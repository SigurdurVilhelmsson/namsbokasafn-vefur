/**
 * Seed a reader's saved settings for one e2e test (plan step S8.3, register CODE-19).
 *
 * It writes the settings seam's stored format (src/lib/utils/settingsMigration.ts):
 * the version and the profile-age marker of a profile created under this build, what
 * was already stored, then `patch` on top. So `{ readingMode: 'paged' }` is what a
 * reader who picked paged stores, and a second call adds to the first instead of
 * replacing it.
 *
 * Each call writes once per tab, before the first page loads: a sessionStorage guard
 * keeps it from running again on a reload or a later goto. An unguarded seed wrote
 * 'paged' back over a test's own 'scrolled' on reload (S8.3's first run of v1.1's spec
 * on main: 18 of 19). A context seed writes once in each new page of that context.
 */
import type { BrowserContext, Page } from '@playwright/test';
import { SETTINGS_VERSION } from '../../src/lib/utils/settingsMigration';

/** The settings store's localStorage key (settings.ts keeps it private) */
export const SETTINGS_KEY = 'namsbokasafn:settings';

let calls = 0;

export async function seedSettings(
	target: Page | BrowserContext,
	patch: Record<string, unknown>
): Promise<void> {
	const guard = `e2e-seed-settings-${++calls}`;
	await target.addInitScript(
		([key, version, json, guardKey]) => {
			try {
				if (sessionStorage.getItem(guardKey)) return;
				sessionStorage.setItem(guardKey, '1');
				let stored: Record<string, unknown> = {};
				try {
					stored = JSON.parse(localStorage.getItem(key) || '{}') ?? {};
				} catch {
					// Unreadable: the app reads it as a fresh profile too
				}
				localStorage.setItem(
					key,
					JSON.stringify({ _version: version, _born: version, ...stored, ...JSON.parse(json) })
				);
			} catch {
				// Storage blocked: nothing to seed
			}
		},
		[SETTINGS_KEY, SETTINGS_VERSION, JSON.stringify(patch), guard] as const
	);
}
