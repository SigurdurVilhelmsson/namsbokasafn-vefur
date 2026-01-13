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

// Pre-parsed section metadata (from build-time processing)
export interface SectionMetadata {
  title: string;
  section: string;
  chapter: number;
  readingTime?: number;
  difficulty?: DifficultyLevel;
  objectives?: string[];
  keywords?: string[];
  prerequisites?: string[];
  source?: SourceAttribution;
}

// Section within a chapter
export interface Section {
  number: string;
  title: string;
  slug?: string;  // Optional in v2 - derived from number if not present
  file: string;
  type?: string;
  metadata?: SectionMetadata;
}

// Chapter in a book
export interface Chapter {
  number: number;
  title: string;
  slug?: string;  // Optional in v2 - derived from number if not present
  sections: Section[];
}

// Precomputed reference for deterministic numbering
export interface PrecomputedReference {
  type: 'sec' | 'eq' | 'fig' | 'tbl' | 'def';
  id: string;
  number: string;
  label: string;
  title?: string;
  preview?: string;
  chapterSlug: string;
  sectionSlug: string;
  anchor: string;
}

// Table of contents for a book
export interface TableOfContents {
  title: string;
  attribution?: SourceAttribution;
  source?: SourceAttribution;
  chapters: Chapter[];
  // Precomputed cross-reference index (from build-time processing)
  references?: { [key: string]: PrecomputedReference };
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
