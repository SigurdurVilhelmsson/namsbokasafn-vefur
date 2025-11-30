import { useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { useGlossary } from '@/hooks/useGlossary';
import { Link } from 'react-router-dom';

export default function GlossaryPage() {
  const { glossary, loading, searchTerms, getTermsByLetter } = useGlossary();
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Hleður orðasafn...</p>
      </div>
    );
  }

  if (!glossary) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-red-600 dark:text-red-400">Gat ekki hlaðið orðasafni</p>
      </div>
    );
  }

  const filteredTerms = searchQuery ? searchTerms(searchQuery) : null;
  const termsByLetter = !searchQuery ? getTermsByLetter() : null;

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Haus (header) */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-[var(--accent-color)]/10 p-3">
              <BookOpen size={32} className="text-[var(--accent-color)]" />
            </div>
            <div>
              <h1 className="font-sans text-4xl font-bold text-[var(--text-primary)]">
                Orðasafn
              </h1>
              <p className="text-[var(--text-secondary)]">
                {glossary.terms.length} hugtök í efnafræði
              </p>
            </div>
          </div>

          {/* Leitarreitur (search input) */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Leita að hugtaki..."
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] py-3 pl-10 pr-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
            />
          </div>
        </div>

        {/* Niðurstöður leitar (search results) */}
        {searchQuery && filteredTerms && (
          <div className="space-y-4">
            {filteredTerms.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)]">
                Engar niðurstöður fundust fyrir "{searchQuery}"
              </p>
            ) : (
              <>
                <p className="text-sm text-[var(--text-secondary)]">
                  {filteredTerms.length}{' '}
                  {filteredTerms.length === 1 ? 'niðurstaða' : 'niðurstöður'}
                </p>

                <div className="space-y-3">
                  {filteredTerms.map((term, index) => (
                    <TermCard key={`${term.term}-${index}`} term={term} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Stafrófsröð (alphabetical list) */}
        {!searchQuery && termsByLetter && (
          <div className="space-y-8">
            {Object.entries(termsByLetter)
              .sort(([a], [b]) => a.localeCompare(b, 'is'))
              .map(([letter, terms]) => (
                <div key={letter}>
                  <h2 className="mb-4 border-b-2 border-[var(--accent-color)] pb-2 font-sans text-2xl font-bold text-[var(--accent-color)]">
                    {letter}
                  </h2>
                  <div className="space-y-3">
                    {terms.map((term, index) => (
                      <TermCard key={`${term.term}-${index}`} term={term} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Tengill til baka (back link) */}
        <div className="mt-8">
          <Link
            to="/"
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
        </div>
      </div>
    </div>
  );
}

// Kort fyrir einstakt hugtök (card for individual term)
function TermCard({ term }: { term: { term: string; english?: string; definition: string; chapter: string; section: string } }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition-all hover:border-[var(--accent-color)]">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
          {term.term}
        </h3>
        {term.english && (
          <span className="text-sm italic text-[var(--text-secondary)]">
            ({term.english})
          </span>
        )}
      </div>

      <p className="mb-3 text-[var(--text-secondary)]">{term.definition}</p>

      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>📖</span>
        <span>
          Kafli {term.chapter}, hluti {term.section}
        </span>
      </div>
    </div>
  );
}
