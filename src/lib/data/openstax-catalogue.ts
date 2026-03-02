/**
 * OpenStax STEM catalogue — all science and math books available from OpenStax.
 *
 * Books with a `bookSlug` link to a BookConfig in book.ts and appear in Tier 1
 * (our translations). All others appear in Tier 2 (the OpenStax library).
 */

export interface CatalogueEntry {
	slug: string;
	title: string;
	description: string;
	chapterCount: number;
	subject: 'chemistry' | 'biology' | 'physics' | 'astronomy' | 'mathematics' | 'statistics';
	openstaxUrl: string;
	status: 'available' | 'in-progress' | 'preview' | 'not-started';
	bookSlug?: string;
}

export interface SubjectGroup {
	key: string;
	label: string;
}

const subjectGroups: SubjectGroup[] = [
	{ key: 'chemistry', label: 'Efnafræði / Chemistry' },
	{ key: 'biology', label: 'Líffræði / Biology' },
	{ key: 'physics', label: 'Eðlisfræði / Physics' },
	{ key: 'astronomy', label: 'Stjarnvísindi / Astronomy' },
	{ key: 'mathematics', label: 'Stærðfræði / Mathematics' },
	{ key: 'statistics', label: 'Tölfræði / Statistics' }
];

const catalogue: CatalogueEntry[] = [
	// ── Chemistry ──────────────────────────────────────────────
	{
		slug: 'chemistry-2e',
		title: 'Chemistry 2e',
		description: 'General chemistry for science majors — atoms, bonding, reactions, thermodynamics.',
		chapterCount: 21,
		subject: 'chemistry',
		openstaxUrl: 'https://openstax.org/details/books/chemistry-2e',
		status: 'available',
		bookSlug: 'efnafraedi-2e'
	},
	{
		slug: 'chemistry-atoms-first-2e',
		title: 'Chemistry: Atoms First 2e',
		description: 'Atoms-first approach to general chemistry — atomic structure before stoichiometry.',
		chapterCount: 21,
		subject: 'chemistry',
		openstaxUrl: 'https://openstax.org/details/books/chemistry-atoms-first-2e',
		status: 'not-started'
	},

	// ── Biology ────────────────────────────────────────────────
	{
		slug: 'biology-2e',
		title: 'Biology 2e',
		description: 'Comprehensive biology — cells, genetics, evolution, ecology.',
		chapterCount: 47,
		subject: 'biology',
		openstaxUrl: 'https://openstax.org/details/books/biology-2e',
		status: 'not-started'
	},
	{
		slug: 'concepts-biology',
		title: 'Concepts of Biology',
		description: 'Non-majors biology — core concepts in a concise format.',
		chapterCount: 21,
		subject: 'biology',
		openstaxUrl: 'https://openstax.org/details/books/concepts-biology',
		status: 'not-started'
	},
	{
		slug: 'microbiology',
		title: 'Microbiology',
		description: 'Microbial life — bacteria, viruses, fungi, and disease.',
		chapterCount: 26,
		subject: 'biology',
		openstaxUrl: 'https://openstax.org/details/books/microbiology',
		status: 'not-started'
	},
	{
		slug: 'anatomy-and-physiology-2e',
		title: 'Anatomy and Physiology 2e',
		description: 'Human body systems — structure and function for health science.',
		chapterCount: 28,
		subject: 'biology',
		openstaxUrl: 'https://openstax.org/details/books/anatomy-and-physiology-2e',
		status: 'not-started'
	},

	// ── Physics ────────────────────────────────────────────────
	{
		slug: 'university-physics-volume-1',
		title: 'University Physics Volume 1',
		description: 'Calculus-based mechanics — motion, forces, energy, waves.',
		chapterCount: 17,
		subject: 'physics',
		openstaxUrl: 'https://openstax.org/details/books/university-physics-volume-1',
		status: 'not-started'
	},
	{
		slug: 'university-physics-volume-2',
		title: 'University Physics Volume 2',
		description: 'Thermodynamics, electricity, and magnetism.',
		chapterCount: 16,
		subject: 'physics',
		openstaxUrl: 'https://openstax.org/details/books/university-physics-volume-2',
		status: 'not-started'
	},
	{
		slug: 'university-physics-volume-3',
		title: 'University Physics Volume 3',
		description: 'Optics, modern physics, and quantum mechanics.',
		chapterCount: 11,
		subject: 'physics',
		openstaxUrl: 'https://openstax.org/details/books/university-physics-volume-3',
		status: 'not-started'
	},
	{
		slug: 'college-physics-2e',
		title: 'College Physics 2e',
		description: 'Algebra-based physics — mechanics through modern physics.',
		chapterCount: 34,
		subject: 'physics',
		openstaxUrl: 'https://openstax.org/details/books/college-physics-2e',
		status: 'not-started'
	},
	{
		slug: 'college-physics-ap-courses-2e',
		title: 'College Physics for AP Courses 2e',
		description: 'AP-aligned algebra-based physics with exam preparation.',
		chapterCount: 34,
		subject: 'physics',
		openstaxUrl: 'https://openstax.org/details/books/college-physics-ap-courses-2e',
		status: 'not-started'
	},

	// ── Astronomy ──────────────────────────────────────────────
	{
		slug: 'astronomy-2e',
		title: 'Astronomy 2e',
		description: 'Stars, galaxies, and the universe — introductory astronomy.',
		chapterCount: 30,
		subject: 'astronomy',
		openstaxUrl: 'https://openstax.org/details/books/astronomy-2e',
		status: 'not-started'
	},

	// ── Mathematics ────────────────────────────────────────────
	{
		slug: 'prealgebra-2e',
		title: 'Prealgebra 2e',
		description: 'Foundations — integers, fractions, decimals, and basic equations.',
		chapterCount: 12,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/prealgebra-2e',
		status: 'not-started'
	},
	{
		slug: 'elementary-algebra-2e',
		title: 'Elementary Algebra 2e',
		description: 'Core algebra — expressions, equations, graphing, and polynomials.',
		chapterCount: 12,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/elementary-algebra-2e',
		status: 'not-started'
	},
	{
		slug: 'intermediate-algebra-2e',
		title: 'Intermediate Algebra 2e',
		description: 'Advanced algebra — functions, radicals, quadratics, and conics.',
		chapterCount: 12,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/intermediate-algebra-2e',
		status: 'not-started'
	},
	{
		slug: 'college-algebra-2e',
		title: 'College Algebra 2e',
		description: 'Functions, polynomials, exponentials, and logarithms.',
		chapterCount: 9,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/college-algebra-2e',
		status: 'not-started'
	},
	{
		slug: 'college-algebra-corequisite-support-2e',
		title: 'College Algebra with Corequisite Support 2e',
		description: 'College algebra paired with foundational skills review.',
		chapterCount: 9,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/college-algebra-corequisite-support-2e',
		status: 'not-started'
	},
	{
		slug: 'algebra-and-trigonometry-2e',
		title: 'Algebra and Trigonometry 2e',
		description: 'Algebraic and trigonometric functions for STEM preparation.',
		chapterCount: 13,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/algebra-and-trigonometry-2e',
		status: 'not-started'
	},
	{
		slug: 'precalculus-2e',
		title: 'Precalculus 2e',
		description: 'Functions, trigonometry, and analytic geometry — calculus preparation.',
		chapterCount: 12,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/precalculus-2e',
		status: 'not-started'
	},
	{
		slug: 'calculus-volume-1',
		title: 'Calculus Volume 1',
		description: 'Limits, derivatives, and integrals — single-variable calculus.',
		chapterCount: 6,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/calculus-volume-1',
		status: 'not-started'
	},
	{
		slug: 'calculus-volume-2',
		title: 'Calculus Volume 2',
		description: 'Integration techniques, differential equations, and sequences.',
		chapterCount: 7,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/calculus-volume-2',
		status: 'not-started'
	},
	{
		slug: 'calculus-volume-3',
		title: 'Calculus Volume 3',
		description: 'Multivariable calculus — vectors, partial derivatives, and multiple integrals.',
		chapterCount: 7,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/calculus-volume-3',
		status: 'not-started'
	},
	{
		slug: 'contemporary-mathematics',
		title: 'Contemporary Mathematics',
		description: 'Real-world math — voting, finance, statistics, and graph theory.',
		chapterCount: 13,
		subject: 'mathematics',
		openstaxUrl: 'https://openstax.org/details/books/contemporary-mathematics',
		status: 'not-started'
	},

	// ── Statistics ─────────────────────────────────────────────
	{
		slug: 'introductory-statistics',
		title: 'Introductory Statistics',
		description: 'Descriptive statistics, probability, and hypothesis testing.',
		chapterCount: 13,
		subject: 'statistics',
		openstaxUrl: 'https://openstax.org/details/books/introductory-statistics',
		status: 'not-started'
	},
	{
		slug: 'introductory-business-statistics',
		title: 'Introductory Business Statistics',
		description: 'Statistics for business — data analysis, regression, and forecasting.',
		chapterCount: 13,
		subject: 'statistics',
		openstaxUrl: 'https://openstax.org/details/books/introductory-business-statistics',
		status: 'not-started'
	}
];

/** Tier 1 — books we are translating or have translated (status is not 'not-started') */
export function getTier1Entries(): CatalogueEntry[] {
	return catalogue.filter((e) => e.status !== 'not-started');
}

/** Tier 2 — the rest of the OpenStax library, grouped by subject */
export function getTier2Entries(): Record<string, CatalogueEntry[]> {
	const tier2 = catalogue.filter((e) => e.status === 'not-started');
	const grouped: Record<string, CatalogueEntry[]> = {};
	for (const entry of tier2) {
		if (!grouped[entry.subject]) {
			grouped[entry.subject] = [];
		}
		grouped[entry.subject].push(entry);
	}
	return grouped;
}

/** Subject group metadata for rendering Tier 2 headings */
export function getSubjectGroups(): SubjectGroup[] {
	return subjectGroups;
}
