import { describe, expect, it } from 'vitest';
import { countNoun, takesSingular } from './plural';

describe('takesSingular', () => {
	it.each([1, 21, 31, 101, 1001])('%i takes the singular', (n) => {
		expect(takesSingular(n)).toBe(true);
	});

	it.each([0, 2, 5, 10, 11, 12, 111, 1011])('%i takes the plural', (n) => {
		expect(takesSingular(n)).toBe(false);
	});
});

describe('countNoun', () => {
	it.each([
		[0, '0 spjöld'],
		[1, '1 spjald'],
		[2, '2 spjöld'],
		[11, '11 spjöld'],
		[21, '21 spjald']
	])('%i gives "%s"', (n, expected) => {
		expect(countNoun(n, 'spjald', 'spjöld')).toBe(expected);
	});
});
