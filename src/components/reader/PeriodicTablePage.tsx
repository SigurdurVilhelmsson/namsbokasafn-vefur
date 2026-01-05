import { Atom, Info } from "lucide-react";
import PeriodicTable from "@/components/periodic-table/PeriodicTable";

/**
 * Page component for displaying the interactive periodic table.
 * Accessible from /:bookSlug/lotukerfi route.
 */
export default function PeriodicTablePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-color)]/10">
              <Atom size={24} className="text-[var(--accent-color)]" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[var(--text-primary)]">
                Lotukerfið
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Gagnvirkt lotukerfi frumefna
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="border-b border-[var(--border-color)] bg-blue-50 dark:bg-blue-900/20">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p>
              Smelltu á frumefni til að sjá nánari upplýsingar. Notaðu örvatakkana til að
              flakka á milli frumefna eða leitaðu að frumefni eftir nafni, tákni eða
              sætistölu.
            </p>
          </div>
        </div>
      </div>

      {/* Periodic table */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <PeriodicTable />
      </div>

      {/* Footer info */}
      <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                Málmar
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Alkalímálmar, jarðalkalímálmar, hliðarmálmar, tregir málmar
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                Málmleysingjar
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Hálfmálmar, málmleysingjar, halógenar, eðalgas
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                Sjaldgæfir jarðmálmar
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Lantaníðar og aktíníðar í neðri röðunum
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                Lyklaborð
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Örvar til að flakka, Enter til að velja, Esc til að loka
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
