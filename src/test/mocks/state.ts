/**
 * Mock for $app/state (kit 3 removed $app/stores), so tests can mount components
 * that import it. $app/state exports plain reactive objects, read without `$`.
 */
export const page = {
	url: new URL('http://localhost/'),
	params: {} as Record<string, string>,
	route: { id: null as string | null },
	status: 200,
	error: null,
	data: {} as Record<string, unknown>,
	form: null,
	state: {}
};
export const navigating = { from: null, to: null, type: null, willUnload: null, delta: null, complete: null };
export const updated = { current: false, check: async () => false };
