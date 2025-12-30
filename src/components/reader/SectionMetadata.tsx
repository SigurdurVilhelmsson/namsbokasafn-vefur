import { Clock, BarChart2 } from "lucide-react";
import type { DifficultyLevel } from "@/types/content";

interface SectionMetadataProps {
  readingTime?: number;
  difficulty?: DifficultyLevel;
  keywords?: string[];
}

// Difficulty configuration with Icelandic labels
const DIFFICULTY_CONFIG: Record<
  DifficultyLevel,
  { label: string; color: string; bgColor: string; bars: number }
> = {
  beginner: {
    label: "Byrjandi",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    bars: 1,
  },
  intermediate: {
    label: "Miðstig",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    bars: 2,
  },
  advanced: {
    label: "Framhald",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    bars: 3,
  },
};

function DifficultyBars({ level }: { level: DifficultyLevel }) {
  const config = DIFFICULTY_CONFIG[level];
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((bar) => (
        <div
          key={bar}
          className={`h-3 w-1 rounded-sm transition-colors ${
            bar <= config.bars
              ? level === "beginner"
                ? "bg-green-500"
                : level === "intermediate"
                  ? "bg-amber-500"
                  : "bg-red-500"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function SectionMetadata({
  readingTime,
  difficulty,
  keywords,
}: SectionMetadataProps) {
  // Don't render if no metadata is available
  if (!readingTime && !difficulty && (!keywords || keywords.length === 0)) {
    return null;
  }

  const difficultyConfig = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Reading time */}
      {readingTime && (
        <div
          className="flex items-center gap-1.5 rounded-full bg-[var(--bg-primary)] px-3 py-1 text-sm text-[var(--text-secondary)]"
          title={`Áætlaður lestími: ${readingTime} mínútur`}
        >
          <Clock size={14} aria-hidden="true" />
          <span>
            {readingTime} {readingTime === 1 ? "mínúta" : "mínútur"}
          </span>
        </div>
      )}

      {/* Difficulty indicator */}
      {difficulty && difficultyConfig && (
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${difficultyConfig.bgColor} ${difficultyConfig.color}`}
          title={`Erfiðleikastig: ${difficultyConfig.label}`}
        >
          <BarChart2 size={14} aria-hidden="true" />
          <DifficultyBars level={difficulty} />
          <span>{difficultyConfig.label}</span>
        </div>
      )}

      {/* Keywords (collapsed, shown on hover/focus) */}
      {keywords && keywords.length > 0 && (
        <div className="group relative">
          <button
            className="flex items-center gap-1.5 rounded-full bg-[var(--bg-primary)] px-3 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            aria-label={`Lykilorð: ${keywords.join(", ")}`}
          >
            <span className="font-medium">{keywords.length}</span>
            <span>lykilorð</span>
          </button>
          {/* Tooltip with keywords */}
          <div className="absolute left-0 top-full z-10 mt-1 hidden max-w-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 shadow-lg group-hover:block group-focus-within:block">
            <div className="flex flex-wrap gap-1">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs text-[var(--accent-color)]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
