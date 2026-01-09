import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	// Increase timeouts for slower environments (WSL, CI)
	timeout: 60000, // 60s per test
	expect: {
		timeout: 10000 // 10s for expect assertions
	},
	use: {
		baseURL: 'http://localhost:4173',
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
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 180000, // 3 minutes for build + server start
		stdout: 'pipe',
		stderr: 'pipe'
	}
});
