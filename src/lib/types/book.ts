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
  status: 'available' | 'in-progress' | 'coming-soon';
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
    id: 'efnafraedi',
    slug: 'efnafraedi',
    title: 'Efnafræði',
    subtitle: 'Þýðing á OpenStax Chemistry 2e',
    description: 'Gagnvirkur veflesari fyrir efnafræðinám á framhaldsskólastigi.',
    subject: 'raunvisindi',
    coverImage: '/covers/efnafraedi.svg',
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
      translatedChapters: 4
    },
    features: {
      glossary: true,
      flashcards: true,
      exercises: true,
      periodicTable: true
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
