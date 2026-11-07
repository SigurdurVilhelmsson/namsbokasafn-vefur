/**
 * Mock for $app/stores, so tests can mount components that import it
 */
import { readable } from 'svelte/store';

export const page = readable({
	url: new URL('http://localhost/'),
	params: {} as Record<string, string>,
	route: { id: null as string | null },
	status: 200,
	error: null,
	data: {} as Record<string, unknown>,
	form: null,
	state: {}
});
export const navigating = readable(null);
export const updated = { subscribe: readable(false).subscribe, check: async () => false };
