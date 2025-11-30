// Gerð fyrir orðasafnshugtök (glossary term)
export interface GlossaryTerm {
  term: string;
  english?: string;
  definition: string;
  chapter: string;
  section: string;
}

// Gerð fyrir orðasafn (glossary)
export interface Glossary {
  terms: GlossaryTerm[];
}

// Gerð fyrir leit í orðasafni
export interface GlossarySearchResult {
  term: GlossaryTerm;
  score: number;
}
