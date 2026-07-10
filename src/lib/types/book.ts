import type { BookAttribution } from '$lib/data/licences';
import { validateAttribution } from '$lib/data/licences';
import { MACHINE_TRANSLATION_CREDIT } from '$lib/data/bookCredits';

export interface BookConfig {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  subject: 'raunvisindi' | 'staerdfraedi' | 'felagsvisindi' | 'annað';
  /** Decorative cover motif key (see bookCover.ts COVER_MOTIFS). Defaults to 'book'. */
  coverMotif?: string;
  translator: string;
  translatorContact?: string;
  status: 'available' | 'in-progress' | 'coming-soon' | 'preview';
  source: {
    title: string;
    publisher: string;
    url: string;
    authors: string[];
    license: string;
    licenseUrl: string;
  };
  /**
   * Multi-source attribution metadata. Drives every per-page licence/credit render
   * (footers, colophon, catalogue badge). Licence verdicts derive from the provenance
   * audit in namsbokasafn-efni `docs/provenance/`. Required on every book — missing or
   * inconsistent attribution fails the build (see scripts/validate-content.js) and
   * renders a visible placeholder at runtime.
   */
  attribution: BookAttribution;
  stats?: {
    totalChapters: number;
    translatedChapters: number;
  };
  features?: {
    glossary: boolean;
    flashcards: boolean;
    exercises: boolean;
    periodicTable?: boolean;
  };
  /**
   * Appendices that should resolve to a bespoke interactive component instead of
   * their prose landing page. efni emits the semantic `/vidauki/{letter}` route and
   * (by separation of concerns) does NOT hardcode the reader's component routes, so
   * this letter→route mapping is a vefur-side decision. The appendix route redirects
   * to `componentPath`, making the interactive view reachable in one click.
   */
  interactiveAppendices?: { letter: string; componentPath: string }[];
}

export const books: BookConfig[] = [
  {
    id: 'efnafraedi-2e',
    slug: 'efnafraedi-2e',
    title: 'Efnafræði',
    subtitle: 'Þýðing á OpenStax Chemistry 2e',
    description: 'Gagnvirkur veflesari fyrir efnafræðinám á framhaldsskólastigi.',
    subject: 'raunvisindi',
    coverMotif: 'atom',
    translator: 'Erlendur (Miðeind)',
    status: 'available',
    source: {
      title: 'Chemistry 2e',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/chemistry-2e',
      authors: ['Paul Flowers', 'Klaus Theopold', 'Richard Langley', 'William R. Robinson'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
    },
    attribution: {
      bookKey: 'efnafraedi-2e',
      originalTitle: 'Chemistry 2e',
      originalAuthors: ['Paul Flowers', 'Klaus Theopold', 'Richard Langley', 'William R. Robinson'],
      publisher: 'OpenStax, Rice University',
      sourceUrl: 'https://openstax.org/details/books/chemistry-2e',
      translators: MACHINE_TRANSLATION_CREDIT,
      modifications:
        'Þýtt á íslensku og staðfært úr Chemistry 2e. Breytingarnar fela í sér þýðingu á texta, hugtökum, dæmum og myndatextum yfir á íslensku.',
      derivativeLicence: 'CC-BY-4.0',
      derivativeLicenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      provenanceRef: '/provenance/provenance.md',
      sources: [
        {
          format: 'docx',
          obtained: '2025-09-01',
          licenceAtObtaining: 'CC-BY-4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
          chaptersCovered: 'Frumþýðingargrunnur (Word-útgáfa)'
        },
        {
          format: 'cnxml',
          obtained: '2026-01-19',
          licenceAtObtaining: 'CC-BY-4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
          upstreamRepo: 'osbooks-chemistry-bundle',
          collection: 'chemistry-2e',
          upstreamChangeCommit: 'd91a52cb (2026-04-23, eftir sókn — afritið helst CC BY)',
          chaptersCovered: 'Yfirlesnir kaflar'
        }
      ]
    },
    stats: {
      totalChapters: 21,
      translatedChapters: 21
    },
    features: {
      glossary: true,
      flashcards: true,
      exercises: true,
      periodicTable: true
    },
    // Appendix A (Lotukerfið) is the interactive periodic table at /lotukerfi
    interactiveAppendices: [{ letter: 'A', componentPath: '/lotukerfi' }]
  },
  {
    id: 'liffraedi-2e',
    slug: 'liffraedi-2e',
    title: 'Líffræði',
    subtitle: 'Þýðing á OpenStax Biology 2e',
    description: 'Gagnvirkur veflesari fyrir líffræðinám á framhaldsskólastigi.',
    subject: 'raunvisindi',
    coverMotif: 'leaf',
    translator: 'Þórhallur Halldórsson',
    // Only 2/47 chapters are human-translated; the rest ship as MT previews with the
    // MT banner, so the book is a preview until faithful biology exists — this keeps the
    // credit machine-accurate (compactCreditPair keys on status) and stops crediting a
    // named human on raw MT pages (R6-2). Flip back to 'in-progress' when faithful
    // biology lands (and restore the human credit then).
    status: 'preview',
    source: {
      title: 'Biology 2e',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/biology-2e',
      authors: ['Mary Ann Clark', 'Matthew Douglas', 'Jung Choi'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
    },
    attribution: {
      bookKey: 'liffraedi-2e',
      originalTitle: 'Biology 2e',
      originalAuthors: ['Mary Ann Clark', 'Matthew Douglas', 'Jung Choi'],
      publisher: 'OpenStax, Rice University',
      sourceUrl: 'https://openstax.org/details/books/biology-2e',
      translators: 'Þórhallur Halldórsson',
      modifications:
        'Þýtt á íslensku og staðfært úr Biology 2e. Breytingarnar fela í sér þýðingu á texta, hugtökum, dæmum og myndatextum yfir á íslensku.',
      derivativeLicence: 'CC-BY-4.0',
      derivativeLicenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      provenanceRef: '/provenance/provenance.md',
      sources: [
        {
          format: 'cnxml',
          obtained: '2026-03-11',
          licenceAtObtaining: 'CC-BY-4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
          upstreamRepo: 'osbooks-biology-bundle',
          collection: 'biology-2e',
          upstreamChangeCommit: 'db5f4a56 (2026-04-23, eftir sókn — afritið helst CC BY)'
        }
      ]
    },
    stats: {
      totalChapters: 47,
      translatedChapters: 2
    },
    features: {
      glossary: true,
      flashcards: false,
      exercises: true
    }
  },
  {
    id: 'orverufraedi',
    slug: 'orverufraedi',
    title: 'Örverufræði',
    subtitle: 'Sýnishorn úr OpenStax Microbiology',
    description: 'Vélþýddur sýniskafli úr Microbiology.',
    subject: 'raunvisindi',
    coverMotif: 'microbe',
    translator: 'Erlendur (Miðeind)',
    status: 'preview',
    source: {
      title: 'Microbiology',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/microbiology',
      authors: ['Nina Parker', 'Mark Schneegurt', 'Anh-Hue Thi Tu', 'Philip Lister', 'Brian M. Forster'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
    },
    attribution: {
      bookKey: 'orverufraedi',
      originalTitle: 'Microbiology',
      originalAuthors: ['Nina Parker', 'Mark Schneegurt', 'Anh-Hue Thi Tu', 'Philip Lister', 'Brian M. Forster'],
      publisher: 'OpenStax, Rice University',
      sourceUrl: 'https://openstax.org/details/books/microbiology',
      translators: MACHINE_TRANSLATION_CREDIT,
      modifications:
        'Vélþýddur sýniskafli úr Microbiology, þýtt á íslensku. Breytingarnar fela í sér þýðingu á texta, hugtökum og myndatextum yfir á íslensku.',
      derivativeLicence: 'CC-BY-4.0',
      derivativeLicenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      provenanceRef: '/provenance/provenance.md',
      sources: [
        {
          format: 'cnxml',
          obtained: '2026-03-09',
          licenceAtObtaining: 'CC-BY-4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
          upstreamRepo: 'osbooks-microbiology',
          collection: 'microbiology',
          upstreamChangeCommit: '4eeff16d (2026-04-23, eftir sókn — afritið helst CC BY)'
        }
      ]
    },
    stats: {
      totalChapters: 26,
      translatedChapters: 1
    },
    features: {
      glossary: true,
      flashcards: false,
      exercises: false
    }
  },
  {
    id: 'lifraen-efnafraedi',
    slug: 'lifraen-efnafraedi',
    title: 'Lífræn efnafræði',
    subtitle: 'Sýnishorn úr OpenStax Organic Chemistry',
    description: 'Vélþýddur sýniskafli úr Organic Chemistry.',
    subject: 'raunvisindi',
    coverMotif: 'benzene',
    translator: 'Erlendur (Miðeind)',
    status: 'preview',
    source: {
      title: 'Organic Chemistry',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/organic-chemistry',
      authors: ['David Klein'],
      license: 'CC BY-NC-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
    },
    attribution: {
      bookKey: 'lifraen-efnafraedi',
      originalTitle: 'Organic Chemistry',
      originalAuthors: ['David Klein'],
      publisher: 'OpenStax, Rice University',
      sourceUrl: 'https://openstax.org/details/books/organic-chemistry',
      translators: MACHINE_TRANSLATION_CREDIT,
      modifications:
        'Vélþýddur sýniskafli úr Organic Chemistry, þýtt á íslensku. Breytingarnar fela í sér þýðingu á texta, hugtökum og dæmum yfir á íslensku.',
      derivativeLicence: 'CC-BY-NC-SA-4.0',
      derivativeLicenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      provenanceRef: '/provenance/provenance.md',
      sources: [
        {
          format: 'cnxml',
          obtained: '2026-03-23',
          licenceAtObtaining: 'CC-BY-NC-SA-4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
          upstreamRepo: 'osbooks-organic-chemistry',
          collection: 'organic-chemistry',
          upstreamChangeCommit: '51e417ff (frá fyrsta riti 2022-06-09 — ávallt CC BY-NC-SA)'
        }
      ]
    },
    stats: {
      totalChapters: 30,
      translatedChapters: 1
    },
    features: {
      glossary: true,
      flashcards: false,
      exercises: true
    }
  },
  {
    id: 'edlisfraedi-2e',
    slug: 'edlisfraedi-2e',
    title: 'Eðlisfræði',
    subtitle: 'Sýnishorn úr OpenStax College Physics 2e',
    description: 'Vélþýddur sýniskafli úr College Physics 2e.',
    subject: 'raunvisindi',
    coverMotif: 'orbit',
    translator: 'Erlendur (Miðeind)',
    status: 'preview',
    source: {
      title: 'College Physics 2e',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/college-physics-2e',
      authors: ['Paul Peter Urone', 'Roger Hinrichs'],
      license: 'CC BY-NC-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
    },
    attribution: {
      bookKey: 'edlisfraedi-2e',
      originalTitle: 'College Physics 2e',
      originalAuthors: ['Paul Peter Urone', 'Roger Hinrichs'],
      publisher: 'OpenStax, Rice University',
      sourceUrl: 'https://openstax.org/details/books/college-physics-2e',
      translators: MACHINE_TRANSLATION_CREDIT,
      modifications:
        'Vélþýddur sýniskafli úr College Physics 2e, þýtt á íslensku. Breytingarnar fela í sér þýðingu á texta, hugtökum og dæmum yfir á íslensku.',
      derivativeLicence: 'CC-BY-NC-SA-4.0',
      derivativeLicenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      provenanceRef: '/provenance/provenance.md',
      sources: [
        {
          format: 'cnxml',
          obtained: '2026-03-23',
          licenceAtObtaining: 'CC-BY-NC-SA-4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
          upstreamRepo: 'osbooks-college-physics-bundle',
          collection: 'college-physics-2e',
          upstreamChangeCommit: '5182c46e (LICENSE 2026-03-19, fyrir sókn — meðhöndlað sem CC BY-NC-SA)'
        }
      ]
    },
    stats: {
      totalChapters: 34,
      translatedChapters: 1
    },
    features: {
      glossary: true,
      flashcards: false,
      exercises: true
    }
  }
];

export function getBook(slug: string): BookConfig | undefined {
  return books.find(b => b.slug === slug);
}

export function getAvailableBooks(): BookConfig[] {
  return books.filter(b => b.status === 'available');
}

export function getAllBooks(): BookConfig[] {
  return books;
}

/** Attribution metadata for a book, or undefined if the slug is unknown. */
export function getBookAttribution(slug: string): BookAttribution | undefined {
  return getBook(slug)?.attribution;
}

/**
 * Validate every book's attribution. Returns a map of bookSlug → error list,
 * including only books that have problems. Consumed by the build gate
 * (scripts/validate-content.js) to fail loudly on missing/inconsistent metadata.
 */
export function validateAllBookAttributions(): Record<string, string[]> {
  const problems: Record<string, string[]> = {};
  for (const book of books) {
    const errors = validateAttribution(book.attribution);
    if (errors.length > 0) {
      problems[book.slug] = errors;
    }
  }
  return problems;
}
