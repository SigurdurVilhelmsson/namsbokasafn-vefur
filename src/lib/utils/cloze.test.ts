/**
 * Tests for cloze-card text construction (reader plan P1.3)
 */

import { describe, it, expect } from 'vitest';
import { buildClozeFront } from './cloze';

describe('buildClozeFront', () => {
	const block =
		'Atóm eru smæstu einingar frumefna. Rafeindir sveima um kjarnann í rafeindaskýi. Kjarninn inniheldur róteindir og nifteindir.';

	it('blanks the selection within its sentence', () => {
		const front = buildClozeFront(block, 'rafeindaskýi');
		expect(front).toBe('Rafeindir sveima um kjarnann í ______.');
	});

	it('keeps the whole sentence when the selection starts it', () => {
		const front = buildClozeFront(block, 'Rafeindir');
		expect(front).toBe('______ sveima um kjarnann í rafeindaskýi.');
	});

	it('normalizes whitespace before matching', () => {
		const front = buildClozeFront('Efnið  hefur\n þrjú  hamskipti.', 'þrjú hamskipti');
		expect(front).toBe('Efnið hefur ______.');
	});

	it('returns null when the selection is not in the block', () => {
		expect(buildClozeFront(block, 'frumeind')).toBeNull();
	});

	it('returns null when no meaningful context remains', () => {
		expect(buildClozeFront('Vatn.', 'Vatn')).toBeNull();
	});

	it('caps very long sentences around the blank', () => {
		const long = 'Orka ' + 'er mikilvæg '.repeat(40) + 'í efnahvörfum alltaf';
		const front = buildClozeFront(long, 'efnahvörfum');
		expect(front).not.toBeNull();
		expect(front!.length).toBeLessThan(280);
		expect(front).toContain('______');
	});
});
