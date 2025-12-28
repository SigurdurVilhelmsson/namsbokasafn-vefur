import { useState, useEffect } from "react";
import type { Glossary, GlossaryTerm } from "@/types/glossary";

// Load glossary for a specific book
async function loadGlossary(bookSlug: string): Promise<Glossary> {
  try {
    const response = await fetch(`/content/${bookSlug}/glossary.json`);
    if (!response.ok) {
      throw new Error("Gat ekki hlaðið orðasafni");
    }
    return await response.json();
  } catch (error) {
    console.error("Villa við að hlaða orðasafni:", error);
    return { terms: [] };
  }
}

// Hook to use glossary for a specific book
export function useGlossary(bookSlug: string) {
  const [state, setState] = useState<{
    glossary: Glossary | null;
    loading: boolean;
  }>(() => ({
    glossary: null,
    loading: !!bookSlug,
  }));

  useEffect(() => {
    if (!bookSlug) return;

    let mounted = true;

    loadGlossary(bookSlug).then((data) => {
      if (mounted) {
        setState({ glossary: data, loading: false });
      }
    });

    return () => {
      mounted = false;
    };
  }, [bookSlug]);

  const { glossary, loading } = state;

  // Find terms by search
  const searchTerms = (query: string): GlossaryTerm[] => {
    if (!glossary || !query.trim()) return [];

    const normalizedQuery = query.toLowerCase();

    return glossary.terms.filter(
      (term) =>
        term.term.toLowerCase().includes(normalizedQuery) ||
        term.english?.toLowerCase().includes(normalizedQuery) ||
        term.definition.toLowerCase().includes(normalizedQuery),
    );
  };

  // Find term by name
  const findTerm = (termName: string): GlossaryTerm | undefined => {
    if (!glossary) return undefined;

    return glossary.terms.find(
      (term) => term.term.toLowerCase() === termName.toLowerCase(),
    );
  };

  // Sort terms alphabetically
  const getSortedTerms = (): GlossaryTerm[] => {
    if (!glossary) return [];

    return [...glossary.terms].sort((a, b) =>
      a.term.localeCompare(b.term, "is"),
    );
  };

  // Group by first letter
  const getTermsByLetter = (): Record<string, GlossaryTerm[]> => {
    const sorted = getSortedTerms();
    const grouped: Record<string, GlossaryTerm[]> = {};

    sorted.forEach((term) => {
      const firstLetter = term.term[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(term);
    });

    return grouped;
  };

  return {
    glossary,
    loading,
    searchTerms,
    findTerm,
    getSortedTerms,
    getTermsByLetter,
  };
}
