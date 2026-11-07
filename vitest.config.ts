import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	// Svelte's client build, so tests can mount() components in jsdom; the default resolves
	// to its server build, where mount() throws (plan step S4.2, CODE-21)
	resolve: { conditions: ['browser'] },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['src/test/setup.ts', 'src/test/animate-stub.ts'],
		alias: {
			$lib: '/src/lib',
			'$app/environment': '/src/test/mocks/environment.ts',
			'$app/navigation': '/src/test/mocks/navigation.ts',
			'$app/stores': '/src/test/mocks/stores.ts'
		},
		// Increase timeouts for tests that use vi.resetModules() with dynamic imports
		// These can be slow when running the full test suite due to module resolution overhead
		hookTimeout: 60000,
		testTimeout: 60000,
		// No retries: a test that fails once fails the run, so a flaky test shows up
		// instead of passing on its second try (plan step S8.1, register CODE-20). It
		// was 2, for store tests that use vi.resetModules(); the whole suite passed six
		// runs in a row with retry 0 on 2026-11-03. If one of those flakes, fix its
		// timing rather than raise this.
		retry: 0,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary', 'lcov'],
			// .svelte too, so a component no test mounts shows as 0% instead of not at all
			include: ['src/lib/**/*.ts', 'src/lib/**/*.svelte'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/**/*.spec.ts', 'src/lib/types/**']
		}
	}
});
