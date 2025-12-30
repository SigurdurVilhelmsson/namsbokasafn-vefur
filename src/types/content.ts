// Gerð fyrir upprunalega heimild og leyfi (CC BY 4.0 attribution)
export interface SourceAttribution {
  original: string;
  authors: string;
  license: string;
  licenseUrl: string;
  originalUrl: string;
  translator: string;
  translationYear: number;
  modifications: string;
}

// Gerð fyrir kaflahluta (section)
export interface Section {
  number: string;
  title: string;
  slug: string;
  file: string;
}

// Gerð fyrir kafla (chapter)
export interface Chapter {
  number: number;
  title: string;
  slug: string;
  sections: Section[];
}

// Gerð fyrir efnisyfirlit (table of contents)
export interface TableOfContents {
  title: string;
  attribution?: SourceAttribution;
  chapters: Chapter[];
}

// Gerð fyrir markmið kafla
export interface ChapterObjectives {
  objectives: string[];
}

// Erfiðleikastig efnis (difficulty levels)
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// Gerð fyrir efni kaflahlutar með metadata
export interface SectionContent {
  title: string;
  section: string;
  chapter: number;
  objectives?: string[];
  source?: SourceAttribution;
  content: string;
  // Enhanced frontmatter (Phase 3.5)
  readingTime?: number; // Estimated reading time in minutes
  difficulty?: DifficultyLevel;
  keywords?: string[];
  prerequisites?: string[];
}

// Gerð fyrir leiðsögn (navigation) á milli kaflahhluta
export interface NavigationContext {
  current: {
    chapter: Chapter;
    section: Section;
  };
  previous?: {
    chapter: Chapter;
    section: Section;
  };
  next?: {
    chapter: Chapter;
    section: Section;
  };
}
