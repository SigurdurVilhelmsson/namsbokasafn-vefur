/**
 * Tests for the icon registry — the testable core behind Icon.svelte.
 * Per docs/design/icon-guidance-2026-06.md: one canonical Lucide set, three sizes.
 */

import { describe, it, expect } from 'vitest';
import { ICON_NAMES, ICON_NODES, getIconNode, resolveIconSize } from './icons';

describe('icon registry', () => {
	it('exposes every canonical inventory name', () => {
		// The 26 unique Lucide names from icon-guidance §4.
		const expected = [
			'search',
			'settings',
			'sun',
			'moon',
			'menu',
			'x',
			'external-link',
			'chevron-left',
			'chevron-right',
			'chevron-down',
			'info',
			'triangle-alert',
			'lightbulb',
			'circle-check',
			'book-marked',
			'square-pen',
			'book-open',
			'download',
			'credit-card',
			'clipboard-check',
			'grid-2x2',
			'chart-column',
			'timer',
			'circle-help',
			'target',
			'rectangle-ellipsis',
			// Extended set — discretionary additions (icon-handback §8)
			'atom',
			'check',
			'clock',
			'refresh-cw',
			'sparkles',
			'trash-2',
			'funnel',
			'plus',
			'file-text',
			'list',
			'house',
			'minimize',
			'layout-grid',
			'keyboard',
			'arrow-left',
			'arrow-right'
		];
		expect([...ICON_NAMES].sort()).toEqual([...expected].sort());
	});

	it('maps every name to a non-empty icon node', () => {
		for (const name of ICON_NAMES) {
			expect(ICON_NODES[name].length).toBeGreaterThan(0);
		}
	});
});

describe('getIconNode', () => {
	it('returns the node for a known icon', () => {
		expect(getIconNode('search')).toBe(ICON_NODES.search);
	});

	it('returns null for an unknown icon name', () => {
		expect(getIconNode('definitely-not-an-icon')).toBeNull();
	});
});

describe('resolveIconSize', () => {
	it('defaults to md when size is undefined', () => {
		expect(resolveIconSize(undefined)).toBe('md');
	});

	it('passes through a valid size', () => {
		expect(resolveIconSize('lg')).toBe('lg');
	});

	it('falls back to md for an invalid size', () => {
		expect(resolveIconSize('huge')).toBe('md');
	});
});
