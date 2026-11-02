/**
 * The settings seam's pure core (plan step S6.1, register CODE-05, decision D02).
 *
 * A stored profile keeps only what the reader set, beside a format version and a
 * profile-age marker ('born': the settings version the profile was created under, 0 for a
 * profile that predates the seam). D02 ruled that every value a pre-seam profile saved
 * counts as chosen, so new defaults reach new profiles only.
 */
import { describe, it, expect } from 'vitest';
import { isBoolean, isObject, isOneOf } from './storeValidation';
import {
	chosenKeys,
	migrateStored,
	resolveSettings,
	serializeRecord,
	type SettingsSchema
} from './settingsMigration';

interface TestSettings {
	theme: string;
	fontSize: string;
	fontFamily: string;
	lineHeight: string;
	lineWidth: string;
	sidebarOpen: boolean;
	shortcutPreferences: Record<string, string>;
	bionicReading: boolean;
	glossaryHighlighting: boolean;
	showTermEnglish: boolean;
}

const SCHEMA: SettingsSchema<TestSettings> = {
	defaults: {
		theme: 'light',
		fontSize: 'medium',
		fontFamily: 'serif',
		lineHeight: 'normal',
		lineWidth: 'medium',
		sidebarOpen: false,
		shortcutPreferences: {},
		bionicReading: false,
		glossaryHighlighting: true,
		showTermEnglish: true
	},
	validators: {
		theme: isOneOf('light', 'dark'),
		fontSize: isOneOf('small', 'medium', 'large', 'xlarge'),
		fontFamily: isOneOf('serif', 'sans', 'opendyslexic'),
		lineHeight: isOneOf('normal', 'relaxed', 'loose'),
		lineWidth: isOneOf('narrow', 'medium', 'wide'),
		sidebarOpen: isBoolean,
		shortcutPreferences: isObject,
		bionicReading: isBoolean,
		glossaryHighlighting: isBoolean,
		showTermEnglish: isBoolean
	},
	screenKeys: ['sidebarOpen']
};

/** Byte for byte what main's store saves on a first load, before any choice */
const MAIN_FIRST_LOAD = {
	theme: 'light',
	fontSize: 'medium',
	fontFamily: 'serif',
	lineHeight: 'normal',
	lineWidth: 'medium',
	sidebarOpen: false,
	shortcutPreferences: {},
	bionicReading: false,
	glossaryHighlighting: true,
	showTermEnglish: true
};

describe('migrateStored', () => {
	it('keeps every value of a pre-seam profile and marks it born 0 (D02: count as chosen)', () => {
		expect(migrateStored(MAIN_FIRST_LOAD)).toEqual({ version: 1, born: 0, values: MAIN_FIRST_LOAD });
	});

	it.each([null, undefined, 'light', 42, [], [{ theme: 'dark' }]])('starts a fresh profile from %j', (stored) => {
		expect(migrateStored(stored)).toEqual({ version: 1, born: 1, values: {} });
	});

	it('reads a current profile as stored', () => {
		expect(migrateStored({ _version: 1, _born: 1, theme: 'dark' })).toEqual({
			version: 1,
			born: 1,
			values: { theme: 'dark' }
		});
	});

	it('never lowers the version or changes born of a profile a newer build wrote', () => {
		expect(migrateStored({ _version: 2, _born: 2, readingMode: 'paged', theme: 'dark' })).toEqual({
			version: 2,
			born: 2,
			values: { readingMode: 'paged', theme: 'dark' }
		});
	});

	it.each([
		['missing', { _version: 1, theme: 'dark' }],
		['not a number', { _version: 1, _born: 'x', theme: 'dark' }],
		['negative', { _version: 1, _born: -1, theme: 'dark' }],
		['fractional', { _version: 1, _born: 0.5, theme: 'dark' }],
		['newer than the version that wrote it', { _version: 1, _born: 2, theme: 'dark' }]
	])('reads born as 0 (an existing profile) when it is %s', (_label, stored) => {
		expect(migrateStored(stored)).toEqual({ version: 1, born: 0, values: { theme: 'dark' } });
	});

	it.each([
		['a string', '1'],
		['zero', 0],
		['fractional', 1.5]
	])('reads a profile whose version is %s as pre-seam, without the bad metadata', (_label, version) => {
		expect(migrateStored({ _version: version, _born: 1, theme: 'dark' })).toEqual({
			version: 1,
			born: 0,
			values: { theme: 'dark' }
		});
	});

	it('carries keys it does not know, and values it cannot validate, through untouched', () => {
		expect(migrateStored({ _version: 1, _born: 1, readingMode: 'paged', theme: 'system' }).values).toEqual({
			readingMode: 'paged',
			theme: 'system'
		});
	});

	it('changes nothing when a migrated profile is stored and loaded again', () => {
		const once = migrateStored(MAIN_FIRST_LOAD);
		const twice = migrateStored(JSON.parse(serializeRecord(once)));
		expect(twice).toEqual(once);
	});
});

describe('serializeRecord', () => {
	it('stores only the marker for a profile with nothing set', () => {
		expect(serializeRecord({ version: 1, born: 1, values: {} })).toBe('{"_version":1,"_born":1}');
	});

	it('stores the marker first, then the set keys', () => {
		expect(serializeRecord({ version: 1, born: 0, values: { theme: 'dark', sidebarOpen: true } })).toBe(
			'{"_version":1,"_born":0,"theme":"dark","sidebarOpen":true}'
		);
	});
});

describe('resolveSettings', () => {
	it('lays the set keys over the defaults', () => {
		expect(resolveSettings({ version: 1, born: 1, values: { theme: 'dark', lineWidth: 'wide' } }, SCHEMA)).toEqual({
			...SCHEMA.defaults,
			theme: 'dark',
			lineWidth: 'wide'
		});
	});

	it('uses the default for a stored value that fails validation', () => {
		expect(resolveSettings({ version: 1, born: 1, values: { fontSize: 'huge' } }, SCHEMA).fontSize).toBe('medium');
	});

	it('leaves keys it does not know out of the settings', () => {
		const resolved = resolveSettings({ version: 2, born: 2, values: { readingMode: 'paged' } }, SCHEMA);
		expect(Object.keys(resolved)).not.toContain('readingMode');
	});

	describe('under a changed default (a test migration)', () => {
		const narrow = { ...SCHEMA, defaults: { ...SCHEMA.defaults, lineWidth: 'narrow' } };

		it('moves a key the reader never set', () => {
			expect(resolveSettings({ version: 1, born: 1, values: {} }, narrow).lineWidth).toBe('narrow');
		});

		it('keeps a key the reader set, even to the old default', () => {
			expect(resolveSettings({ version: 1, born: 1, values: { lineWidth: 'medium' } }, narrow).lineWidth).toBe(
				'medium'
			);
		});

		it("keeps a pre-seam profile's saved 'medium' (D02)", () => {
			expect(resolveSettings(migrateStored(MAIN_FIRST_LOAD), narrow).lineWidth).toBe('medium');
		});
	});
});

describe('chosenKeys', () => {
	it('lists the valid settings the reader set, but not screen state, unknown keys or invalid values', () => {
		const record = {
			version: 1,
			born: 1,
			values: { theme: 'light', sidebarOpen: true, readingMode: 'paged', fontSize: 'huge' }
		};
		expect(chosenKeys(record, SCHEMA)).toEqual(['theme']);
	});

	it("lists all nine choices of a pre-seam profile, and not 'sidebarOpen'", () => {
		expect(chosenKeys(migrateStored(MAIN_FIRST_LOAD), SCHEMA)).toEqual([
			'theme',
			'fontSize',
			'fontFamily',
			'lineHeight',
			'lineWidth',
			'shortcutPreferences',
			'bionicReading',
			'glossaryHighlighting',
			'showTermEnglish'
		]);
	});
});
