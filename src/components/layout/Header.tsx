import { Moon, Sun, Menu, Search, Settings } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTheme } from '@/hooks/useTheme';
import { Link } from 'react-router-dom';

export default function Header() {
  const { toggleTheme, isDark } = useTheme();
  const { toggleSidebar } = useSettingsStore();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Vinstri hluti: Hamburger valmynd fyrir farsíma og titill */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 hover:bg-[var(--bg-primary)] lg:hidden"
            aria-label="Opna/loka valmynd"
          >
            <Menu size={24} />
          </button>

          <Link to="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">
              Efnafræðilesari
            </h1>
          </Link>
        </div>

        {/* Hægri hluti: Leitartakki, þematakki, stillingartakki */}
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg p-2 hover:bg-[var(--bg-primary)] transition-colors"
            aria-label="Leita"
            title="Leita"
          >
            <Search size={20} />
          </button>

          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 hover:bg-[var(--bg-primary)] transition-colors"
            aria-label={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
            title={isDark ? 'Ljóst þema' : 'Dökkt þema'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            className="rounded-lg p-2 hover:bg-[var(--bg-primary)] transition-colors"
            aria-label="Stillingar"
            title="Stillingar"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
