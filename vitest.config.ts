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
			'$app/navigation': '/src/test/mocks/navigation.ts'
		},
		// Increase timeouts for tests that use vi.resetModules() with dynamic imports
		// These can be slow when running the full test suite due to module resolution overhead
		hookTimeout: 60000,
		testTimeout: 60000,
		// Retry flaky tests up to 2 times
		// Some store tests use vi.resetModules() which can occasionally cause timing issues
		retry: 2,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary', 'lcov'],
			// .svelte too, so a component no test mounts shows as 0% instead of not at all
			include: ['src/lib/**/*.ts', 'src/lib/**/*.svelte'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/**/*.spec.ts', 'src/lib/types/**']
		}
	}
});
