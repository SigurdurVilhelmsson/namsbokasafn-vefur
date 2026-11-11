// @vitest-environment node
/**
 * A direct import of svelte/transition fails lint anywhere but src/lib/utils/transitions.ts
 * (plan step SF.3, register UI-25), so a new component cannot bring the reduced-motion gap
 * back. Runs the project's own ESLint config on small snippets.
 */
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });

async function restricted(code: string, filePath: string): Promise<boolean> {
	const [result] = await eslint.lintText(code, { filePath });
	return result.messages.some((m) => m.ruleId === 'no-restricted-imports');
}

describe('svelte/transition imports', () => {
	it('fail lint in a component', async () => {
		const code = "<script lang=\"ts\">\n\timport { fade } from 'svelte/transition';\n</script>\n\n<div transition:fade>x</div>\n";
		expect(await restricted(code, 'src/lib/components/Example.svelte')).toBe(true);
	});

	it('fail lint in a TypeScript module', async () => {
		expect(await restricted("import { fly } from 'svelte/transition';\nexport const f = fly;\n", 'src/lib/utils/example.ts')).toBe(true);
	});

	it('pass in the one module that wraps them', async () => {
		expect(await restricted("import { fly } from 'svelte/transition';\nexport const f = fly;\n", 'src/lib/utils/transitions.ts')).toBe(false);
	});

	it('the wrapped module is the allowed way in', async () => {
		const code = "<script lang=\"ts\">\n\timport { fade } from '$lib/utils/transitions';\n</script>\n\n<div transition:fade>x</div>\n";
		expect(await restricted(code, 'src/lib/components/Example.svelte')).toBe(false);
	});
});
