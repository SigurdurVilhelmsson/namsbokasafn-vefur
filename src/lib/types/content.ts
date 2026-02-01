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
  number: string;  // Empty string "" for unnumbered sections (intro, EOC pages)
  title: string;
  slug?: string;  // Optional in v2 - derived from number if not present
  file: string;
  type?: SectionType;  // Special section type for rendering/navigation
  metadata?: SectionMetadata;
}

// Chapter in a book
export interface Chapter {
  number: number;
  title: string;
  slug?: string;  // Optional in v2 - derived from number if not present
  sections: Section[];
}

// Appendix entry (A-M for Chemistry 2e)
export interface Appendix {
  letter: string;  // A, B, C, ... M
  title: string;
  file: string;    // e.g., "A-periodic-table.md"
  isInteractive?: boolean;  // True for appendices rendered as interactive components
  componentPath?: string;   // Path to component if isInteractive (e.g., "/lotukerfi")
}

// Answer key entry (per-chapter, separate from chapter sections)
export interface AnswerKeyEntry {
  chapter: number;
  title: string;   // e.g., "Kafli 1" or chapter title
  file: string;    // e.g., "answer-key/1.md" or "01/1-answer-key.md"
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
  // Appendices (A-M for Chemistry 2e)
  appendices?: Appendix[];
  // Answer key entries (per-chapter, OpenStax style)
  answerKey?: AnswerKeyEntry[];
  // Precomputed cross-reference index (from build-time processing)
  references?: { [key: string]: PrecomputedReference };
}

// Difficulty levels for content
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Section types for special end-of-chapter pages and other content types
export type SectionType =
  | 'introduction'   // Chapter introduction (unnumbered)
  | 'glossary'       // Key terms / Lykilhugtök
  | 'equations'      // Key equations / Lykilformúlur
  | 'summary'        // Chapter summary / Samantekt
  | 'exercises'      // Practice exercises / Æfingar
  | 'answer-key';    // Answer key / Svarlykill (separate from exercises)

// Section content with metadata
export interface SectionContent {
  title: string;
  section: string;
  chapter: number;
  type?: SectionType;
  objectives?: string[];
  source?: SourceAttribution;
  content: string;
  readingTime?: number;
  difficulty?: DifficultyLevel;
  keywords?: string[];
  prerequisites?: string[];
  isHtml?: boolean;  // True if content is pre-rendered HTML (from CNXML pipeline)
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
