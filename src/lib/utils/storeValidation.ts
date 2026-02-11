/**
 * Store data validation utilities.
 *
 * Validates localStorage data before merging with defaults.
 * Invalid fields fall back to their default values with a console warning.
 */

type Validator = (value: unknown) => boolean;

export type FieldValidators = Record<string, Validator>;

export const isString = (v: unknown): v is string => typeof v === 'string';
export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
export const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
export const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
export const isNullOrString = (v: unknown): boolean => v === null || isString(v);

export function isOneOf<T extends string>(...values: T[]): (v: unknown) => v is T {
	return (v: unknown): v is T => isString(v) && (values as string[]).includes(v);
}

/**
 * Validate stored data against field validators, merging with defaults.
 *
 * For each field in defaults:
 * - If stored has the field AND it passes validation → use stored value
 * - If stored has the field but validation fails → use default, log warning
 * - If stored doesn't have the field → use default
 *
 * Fields not in defaults are ignored (no forward-compat leakage).
 */
 
export function validateStoreData<T>(
	stored: unknown,
	defaults: T,
	validators: FieldValidators
): T {
	if (!isObject(stored)) return defaults;

	const result = { ...defaults } as Record<string, unknown>;
	const defaultsObj = defaults as Record<string, unknown>;

	for (const key of Object.keys(defaultsObj)) {
		if (!(key in stored)) continue;

		const validate = validators[key];
		if (validate) {
			if (validate(stored[key])) {
				result[key] = stored[key];
			} else {
				console.warn(`Invalid stored value for "${key}", using default`);
			}
		} else {
			// No validator defined for this field — accept as-is
			result[key] = stored[key];
		}
	}

	return result as T;
}
