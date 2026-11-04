import { defineConfig, devices } from '@playwright/test';
import { SETTINGS_VERSION } from './src/lib/utils/settingsMigration';
import { SETTINGS_KEY } from './e2e/helpers/seedSettings';

const BASE_URL = 'http://localhost:4173';

/**
 * E2E_READING_MODE=paged (or scrolled) starts every browser context with that reading mode
 * chosen (plan step S8.4; M8's exit criterion: one full run with 'paged' seeded for every
 * spec).
 * use.storageState writes the settings seam's format once per context, before any page
 * script, and reaches a context a test makes with browser.newContext() too. A spec's own
 * seed merges over it (seedSettings and the theme seeds keep what is stored), so
 * section-shortcuts and phone-layout stay scrolled; a spec that replaces or clears the key
 * reads a fresh profile, as a reader who erased their data would. Unset or empty, nothing
 * changes; any other value fails the run.
 */
const seededMode = process.env.E2E_READING_MODE || undefined;
if (seededMode !== undefined && seededMode !== 'paged' && seededMode !== 'scrolled') {
	throw new Error(`E2E_READING_MODE must be 'paged' or 'scrolled', not '${seededMode}'`);
}
const seededSettings = seededMode
	? {
			cookies: [],
			origins: [
				{
					origin: BASE_URL,
					localStorage: [
						{
							name: SETTINGS_KEY,
							value: JSON.stringify({ _version: SETTINGS_VERSION, _born: SETTINGS_VERSION, readingMode: seededMode })
						}
					]
				}
			]
		}
	: undefined;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	// CI also prints every test, so a skipped one is named in the job log: a
	// skip count alone hid that the flashcard and glossary tests never ran.
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
	// Increase timeouts for slower environments (WSL, CI)
	timeout: 60000, // 60s per test
	expect: {
		timeout: 10000 // 10s for expect assertions
	},
	use: {
		baseURL: BASE_URL,
		...(seededSettings && { storageState: seededSettings }),
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		// Increase action timeouts
		actionTimeout: 15000, // 15s for clicks, fills, etc.
		navigationTimeout: 30000 // 30s for page navigations
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		// Use Vite preview for accurate SPA behavior
		command: 'npm run build && npm run preview -- --port 4173',
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 180000, // 3 minutes for build + server start
		stdout: 'pipe',
		stderr: 'pipe'
	}
});
