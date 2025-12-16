import { Moon, Sun, BookOpen, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { getAllBooks } from '@/config/books';
import BookGrid from './BookGrid';

export default function LandingPage() {
  const { theme, toggleTheme } = useSettingsStore();
  const books = getAllBooks();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[var(--accent-color)]" />
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Námsbókasafn
                </h1>
                <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
                  Opnar kennslubækur á íslensku
                </p>
              </div>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
              aria-label={theme === 'dark' ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-[var(--text-secondary)]" />
              ) : (
                <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-b from-[var(--accent-light)] to-[var(--bg-primary)] py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Opnar kennslubækur á íslensku
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Þýðingar á kennslubókum frá OpenStax, aðgengilegar öllum án endurgjalds.
            Með gagnvirkum æfingum, orðasafni og minniskortum.
          </p>
        </div>
      </section>

      {/* Book catalog */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Bækur
        </h3>
        <BookGrid books={books} />
      </main>

      {/* Footer */}
      <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* About */}
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3">
                Um Námsbókasafn
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Námsbókasafn er safn íslenskra þýðinga á opnum kennslubókum.
                Verkefnið miðar að því að gera hágæða námsefni aðgengilegt
                öllum íslenskum nemendum og kennurum.
              </p>
            </div>

            {/* OpenStax Attribution */}
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3">
                Byggt á OpenStax
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Þýðingarnar byggjast á opnum kennslubókum frá OpenStax,
                gefnar út af Rice University undir CC BY 4.0 leyfi.
              </p>
              <a
                href="https://openstax.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[var(--accent-color)] hover:underline"
              >
                Heimsækja OpenStax
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              Þýðingar og veflesari © {new Date().getFullYear()} Sigurður E. Vilhelmsson.
              Upprunalegt efni © OpenStax, Rice University.
              Allt efni er gefið út undir{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-color)] hover:underline"
              >
                CC BY 4.0
              </a>{' '}
              leyfi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
