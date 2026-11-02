/**
 * The settings seam's pure core (plan step S6.1, register CODE-05, decision D02).
 *
 * A profile stores only what the reader set, flat, beside two metadata keys:
 *
 *   { "_version": 1, "_born": 1, "theme": "dark" }
 *
 * - `_version`: the settings version that last wrote the profile. A build never lowers it.
 * - `_born`: the profile-age marker, the settings version the profile was created under.
 *   0 means the profile predates the seam (or its marker cannot be trusted), so a later
 *   release can give new profiles a new default and leave existing ones alone (call 3).
 *
 * Values stay flat at the top level because older bundles read them there: the frozen
 * books' 2026-08-19 build and any tab still on an earlier build keep applying a reader's
 * choices. Those bundles also write the old full format back, without the metadata; the
 * next load then reads that profile as pre-seam (born 0, every value chosen), which is what
 * D02 gives every existing reader, so nothing visible changes.
 *
 * Unknown keys, and values that fail validation, are carried through untouched: a tab on
 * this build must not drop a setting a newer build wrote (readers run a cached build until
 * they accept the update prompt).
 */
import type { FieldValidators } from './storeValidation';

/** Raise when a release changes what a stored profile means */
export const SETTINGS_VERSION = 1;

const VERSION_KEY = '_version';
const BORN_KEY = '_born';

export interface SettingsRecord {
	/** The settings version that last wrote it */
	version: number;
	/** The settings version the profile was created under; 0 = predates the seam */
	born: number;
	/** The keys the reader set (and any this build does not know), as stored */
	values: Record<string, unknown>;
}

export interface SettingsSchema<T> {
	defaults: T;
	validators: FieldValidators;
	/** Kept across loads but never a choice (the sidebar's open state) */
	screenKeys: readonly (keyof T)[];
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const isPositiveInteger = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;

/** A profile that has stored nothing yet */
function freshRecord(): SettingsRecord {
	return { version: SETTINGS_VERSION, born: SETTINGS_VERSION, values: {} };
}

/**
 * Read whatever is stored as a settings record. Applies D02 once: a profile with no
 * version predates the seam, so every value it saved is kept as a choice and it is born 0.
 */
export function migrateStored(stored: unknown): SettingsRecord {
	if (!isPlainObject(stored)) return freshRecord();

	const { [VERSION_KEY]: version, [BORN_KEY]: born, ...values } = stored;

	if (!isPositiveInteger(version)) {
		return { version: SETTINGS_VERSION, born: 0, values };
	}

	const bornIsValid = Number.isInteger(born) && (born as number) >= 0 && (born as number) <= version;
	return {
		version: Math.max(version, SETTINGS_VERSION),
		born: bornIsValid ? (born as number) : 0,
		values
	};
}

/** The stored form: the marker first, then the set keys */
export function serializeRecord(record: SettingsRecord): string {
	return JSON.stringify({ [VERSION_KEY]: record.version, [BORN_KEY]: record.born, ...record.values });
}

const isValidSetting = <T>(key: string, value: unknown, schema: SettingsSchema<T>): boolean => {
	const validate = schema.validators[key];
	return validate ? validate(value) : true;
};

/** The settings in effect: each valid set key over the defaults in code */
export function resolveSettings<T>(record: SettingsRecord, schema: SettingsSchema<T>): T {
	const resolved = { ...schema.defaults } as Record<string, unknown>;
	for (const key of Object.keys(resolved)) {
		if (key in record.values && isValidSetting(key, record.values[key], schema)) {
			resolved[key] = record.values[key];
		}
	}
	return resolved as T;
}

/** The settings the reader chose, in the defaults' order: valid, known, and not screen state */
export function chosenKeys<T>(record: SettingsRecord, schema: SettingsSchema<T>): (keyof T)[] {
	return (Object.keys(schema.defaults as object) as (keyof T & string)[]).filter(
		(key) =>
			!schema.screenKeys.includes(key) &&
			key in record.values &&
			isValidSetting(key, record.values[key], schema)
	);
}
