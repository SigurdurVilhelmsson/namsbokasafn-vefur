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
  chapters: Chapter[];
}

// Gerð fyrir markmið kafla
export interface ChapterObjectives {
  objectives: string[];
}

// Gerð fyrir efni kaflahlutar með metadata
export interface SectionContent {
  title: string;
  section: string;
  chapter: number;
  objectives?: string[];
  content: string;
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
