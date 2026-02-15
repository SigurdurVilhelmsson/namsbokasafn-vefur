import { describe, it, expect, vi } from 'vitest';
import {
	validateStoreData,
	isString,
	isBoolean,
	isNumber,
	isArray,
	isObject,
	isNullOrString,
	isOneOf
} from './storeValidation';

describe('type validators', () => {
	it('isString should validate strings', () => {
		expect(isString('hello')).toBe(true);
		expect(isString('')).toBe(true);
		expect(isString(123)).toBe(false);
		expect(isString(null)).toBe(false);
		expect(isString(undefined)).toBe(false);
	});

	it('isBoolean should validate booleans', () => {
		expect(isBoolean(true)).toBe(true);
		expect(isBoolean(false)).toBe(true);
		expect(isBoolean(0)).toBe(false);
		expect(isBoolean('true')).toBe(false);
	});

	it('isNumber should validate numbers and reject NaN', () => {
		expect(isNumber(42)).toBe(true);
		expect(isNumber(0)).toBe(true);
		expect(isNumber(-1.5)).toBe(true);
		expect(isNumber(NaN)).toBe(false);
		expect(isNumber('42')).toBe(false);
	});

	it('isArray should validate arrays', () => {
		expect(isArray([])).toBe(true);
		expect(isArray([1, 2, 3])).toBe(true);
		expect(isArray({})).toBe(false);
		expect(isArray('[]')).toBe(false);
	});

	it('isObject should validate plain objects', () => {
		expect(isObject({})).toBe(true);
		expect(isObject({ a: 1 })).toBe(true);
		expect(isObject([])).toBe(false);
		expect(isObject(null)).toBe(false);
		expect(isObject('object')).toBe(false);
	});

	it('isNullOrString should validate null and strings', () => {
		expect(isNullOrString(null)).toBe(true);
		expect(isNullOrString('hello')).toBe(true);
		expect(isNullOrString(undefined)).toBe(false);
		expect(isNullOrString(42)).toBe(false);
	});

	it('isOneOf should validate against allowed values', () => {
		const isColor = isOneOf('red', 'green', 'blue');
		expect(isColor('red')).toBe(true);
		expect(isColor('green')).toBe(true);
		expect(isColor('yellow')).toBe(false);
		expect(isColor(42)).toBe(false);
	});
});

describe('validateStoreData', () => {
	const defaults = {
		theme: 'light' as string,
		fontSize: 16,
		darkMode: false,
		items: [] as string[]
	};

	const validators = {
		theme: isString,
		fontSize: isNumber,
		darkMode: isBoolean,
		items: isArray
	};

	it('should return defaults when stored data is not an object', () => {
		expect(validateStoreData(null, defaults, validators)).toEqual(defaults);
		expect(validateStoreData('string', defaults, validators)).toEqual(defaults);
		expect(validateStoreData(42, defaults, validators)).toEqual(defaults);
		expect(validateStoreData(undefined, defaults, validators)).toEqual(defaults);
	});

	it('should accept valid stored data', () => {
		const stored = { theme: 'dark', fontSize: 20, darkMode: true, items: ['a', 'b'] };
		const result = validateStoreData(stored, defaults, validators);
		expect(result).toEqual(stored);
	});

	it('should reject invalid fields and use defaults', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const stored = { theme: 123, fontSize: 'big', darkMode: 'yes', items: 'not-array' };
		const result = validateStoreData(stored, defaults, validators);

		expect(result).toEqual(defaults);
		expect(warnSpy).toHaveBeenCalledTimes(4);

		warnSpy.mockRestore();
	});

	it('should handle partial stored data', () => {
		const stored = { theme: 'dark' };
		const result = validateStoreData(stored, defaults, validators);

		expect(result.theme).toBe('dark');
		expect(result.fontSize).toBe(16); // default
		expect(result.darkMode).toBe(false); // default
		expect(result.items).toEqual([]); // default
	});

	it('should accept fields without validators', () => {
		const partialValidators = { theme: isString };
		const stored = { theme: 'dark', fontSize: 20, darkMode: true, items: ['a'] };
		const result = validateStoreData(stored, defaults, partialValidators);

		// theme validated, others accepted as-is
		expect(result.theme).toBe('dark');
		expect(result.fontSize).toBe(20);
		expect(result.darkMode).toBe(true);
	});

	it('should ignore extra fields not in defaults', () => {
		const stored = { theme: 'dark', unknownField: 'value' };
		const result = validateStoreData(stored, defaults, validators);

		expect(result.theme).toBe('dark');
		expect((result as Record<string, unknown>)['unknownField']).toBeUndefined();
	});

	it('should work with isOneOf validator', () => {
		const themeDefaults = { theme: 'light' as string };
		const themeValidators = { theme: isOneOf('light', 'dark') };

		expect(validateStoreData({ theme: 'dark' }, themeDefaults, themeValidators).theme).toBe('dark');

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(validateStoreData({ theme: 'purple' }, themeDefaults, themeValidators).theme).toBe('light');
		warnSpy.mockRestore();
	});
});
