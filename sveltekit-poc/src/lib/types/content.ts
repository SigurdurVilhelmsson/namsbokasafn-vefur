/**
 * Content types for the textbook reader
 */

// Source attribution for CC BY 4.0 compliance
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

// Section within a chapter
export interface Section {
  number: string;
  title: string;
  slug: string;
  file: string;
}

// Chapter in a book
export interface Chapter {
  number: number;
  title: string;
  slug: string;
  sections: Section[];
}

// Table of contents for a book
export interface TableOfContents {
  title: string;
  attribution?: SourceAttribution;
  source?: SourceAttribution;
  chapters: Chapter[];
}

// Difficulty levels for content
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Section content with metadata
export interface SectionContent {
  title: string;
  section: string;
  chapter: number;
  objectives?: string[];
  source?: SourceAttribution;
  content: string;
  readingTime?: number;
  difficulty?: DifficultyLevel;
  keywords?: string[];
  prerequisites?: string[];
}

// Navigation context for section navigation
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

// Glossary term
export interface GlossaryTerm {
  term: string;
  definition: string;
  english?: string;
  chapter?: number;
  section?: string;
  relatedTerms?: string[];
}

// Glossary for a book
export interface Glossary {
  terms: GlossaryTerm[];
}
