export interface BookConfig {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  subject: 'raunvisindi' | 'staerdfraedi' | 'felagsvisindi' | 'annað';
  coverImage: string;
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
}

export const books: BookConfig[] = [
  {
    id: 'efnafraedi-2e',
    slug: 'efnafraedi-2e',
    title: 'Efnafræði',
    subtitle: 'Þýðing á OpenStax Chemistry 2e',
    description: 'Gagnvirkur veflesari fyrir efnafræðinám á framhaldsskólastigi.',
    subject: 'raunvisindi',
    coverImage: '/covers/efnafraedi-2e.svg',
    translator: 'Sigurður E. Vilhelmsson',
    status: 'available',
    source: {
      title: 'Chemistry 2e',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/chemistry-2e',
      authors: ['Paul Flowers', 'Klaus Theopold', 'Richard Langley', 'William R. Robinson'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
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
    }
  },
  {
    id: 'liffraedi-2e',
    slug: 'liffraedi-2e',
    title: 'Líffræði',
    subtitle: 'Þýðing á OpenStax Biology 2e',
    description: 'Gagnvirkur veflesari fyrir líffræðinám á framhaldsskólastigi.',
    subject: 'raunvisindi',
    coverImage: '/covers/liffraedi-2e.svg',
    translator: 'Þórhallur Halldórsson',
    status: 'in-progress',
    source: {
      title: 'Biology 2e',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/biology-2e',
      authors: ['Mary Ann Clark', 'Matthew Douglas', 'Jung Choi'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
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
    coverImage: '/covers/orverufraedi.svg',
    translator: 'Sigurður E. Vilhelmsson',
    status: 'preview',
    source: {
      title: 'Microbiology',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/microbiology',
      authors: ['Nina Parker', 'Mark Schneegurt', 'Anh-Hue Thi Tu', 'Philip Lister', 'Brian M. Forster'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
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
    coverImage: '/covers/lifraen-efnafraedi.svg',
    translator: 'Sigurður E. Vilhelmsson',
    status: 'preview',
    source: {
      title: 'Organic Chemistry',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/organic-chemistry',
      authors: ['David Klein'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
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
    coverImage: '/covers/edlisfraedi-2e.svg',
    translator: 'Sigurður E. Vilhelmsson',
    status: 'preview',
    source: {
      title: 'College Physics 2e',
      publisher: 'OpenStax',
      url: 'https://openstax.org/details/books/college-physics-2e',
      authors: ['Paul Peter Urone', 'Roger Hinrichs'],
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
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
