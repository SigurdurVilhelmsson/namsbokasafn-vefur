/**
 * Vitest setup file
 * Runs before all tests
 */

import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
		// Helper for tests to inspect storage
		__getStore: () => store,
		__setStore: (newStore: Record<string, string>) => {
			store = newStore;
		}
	};
})();

Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// Reset localStorage before each test
beforeEach(() => {
	localStorageMock.clear();
	vi.clearAllMocks();
});

// Export for use in tests
export { localStorageMock };
