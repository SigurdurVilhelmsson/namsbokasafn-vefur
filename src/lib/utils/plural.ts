/** Icelandic takes the singular after a number ending in 1, except 11 (1, 21, 101; not 11, 111) */
export const takesSingular = (n: number): boolean => n % 10 === 1 && n % 100 !== 11;

/** A count with its noun in the right number: `countNoun(2, 'spjald', 'spjöld')` is '2 spjöld' */
export function countNoun(n: number, singular: string, plural: string): string {
	return `${n} ${takesSingular(n) ? singular : plural}`;
}
