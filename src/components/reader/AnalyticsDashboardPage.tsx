import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Calendar,
  Flame,
  TrendingUp,
  BookOpen,
  Download,
  Trash2,
  Activity,
  Target,
  Brain,
  CheckCircle,
} from "lucide-react";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useBook } from "@/hooks/useBook";
import { formatReadingTime } from "@/hooks/useReadingSession";

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen size={14} />,
  flashcard: <Brain size={14} />,
  quiz: <Target size={14} />,
  objective: <CheckCircle size={14} />,
  annotation: <Activity size={14} />,
};

const ACTIVITY_LABELS: Record<string, string> = {
  reading: "Lestur",
  flashcard: "Minniskort",
  quiz: "Próf",
  objective: "Markmið",
  annotation: "Athugasemd",
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function AnalyticsDashboardPage() {
  const { bookSlug } = useBook();
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    getTotalReadingTime,
    getDailyStats,
    getWeeklyStats,
    getMonthlyReadingTime,
    getStreakInfo,
    getRecentActivity,
    sectionReadingTimes,
    dailyStats,
    exportAnalytics,
    clearAllData,
  } = useAnalyticsStore();

  const totalReadingTime = getTotalReadingTime();
  const todayStats = getDailyStats();
  const weeklyStats = getWeeklyStats();
  const monthlyReadingTime = getMonthlyReadingTime();
  const streakInfo = getStreakInfo();
  const recentActivity = getRecentActivity(15);

  // Get top sections by reading time
  const topSections = useMemo(() => {
    return Object.entries(sectionReadingTimes)
      .sort(([, a], [, b]) => b.totalSeconds - a.totalSeconds)
      .slice(0, 5)
      .map(([key, data]) => {
        const [chapterSlug, sectionSlug] = key.split("/");
        return {
          key,
          chapterSlug,
          sectionSlug,
          ...data,
        };
      });
  }, [sectionReadingTimes]);

  // Get daily reading times for the last 7 days
  const weeklyChart = useMemo(() => {
    const days: { date: string; seconds: number; label: string }[] = [];
    const dayLabels = ["Sun", "Mán", "Þri", "Mið", "Fim", "Fös", "Lau"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const stats = dailyStats[dateStr];

      days.push({
        date: dateStr,
        seconds: stats?.totalReadingSeconds || 0,
        label: dayLabels[d.getDay()],
      });
    }

    return days;
  }, [dailyStats]);

  // Max seconds for chart scaling
  const maxSeconds = Math.max(...weeklyChart.map((d) => d.seconds), 1);

  // Handle export
  const handleExport = () => {
    const data = exportAnalytics();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `namsbokasafn-analytics-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportConfirm(false);
  };

  // Handle clear
  const handleClear = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-500/10 p-3">
              <BarChart3 size={32} className="text-blue-500" />
            </div>
            <div>
              <h1 className="font-sans text-4xl font-bold text-[var(--text-primary)]">
                Námsgreining
              </h1>
              <p className="text-[var(--text-secondary)]">
                Fylgstu með námstíma og framvindu
              </p>
            </div>
          </div>
        </div>

        {/* Overview stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total reading time */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <Clock size={16} />
              <span className="text-sm font-medium">Heildartími</span>
            </div>
            <div className="font-sans text-2xl font-bold text-blue-500">
              {formatReadingTime(totalReadingTime)}
            </div>
          </div>

          {/* Today's reading */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <Calendar size={16} />
              <span className="text-sm font-medium">Í dag</span>
            </div>
            <div className="font-sans text-2xl font-bold text-emerald-500">
              {formatReadingTime(todayStats.totalReadingSeconds)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              {todayStats.sectionsVisited} kaflar skoðaðir
            </div>
          </div>

          {/* Weekly average */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <TrendingUp size={16} />
              <span className="text-sm font-medium">Vikulegt meðaltal</span>
            </div>
            <div className="font-sans text-2xl font-bold text-purple-500">
              {formatReadingTime(weeklyStats.averageReadingSeconds)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              {weeklyStats.daysActive}/7 dagar virkir
            </div>
          </div>

          {/* Study streak */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <Flame size={16} />
              <span className="text-sm font-medium">Námsröð</span>
            </div>
            <div className="font-sans text-2xl font-bold text-orange-500">
              {streakInfo.current} dagar
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              Lengsta röð: {streakInfo.longest} dagar
            </div>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <h2 className="mb-4 font-sans text-lg font-semibold">
            Námstími síðustu 7 daga
          </h2>
          <div className="flex h-40 items-end justify-between gap-2">
            {weeklyChart.map((day) => {
              const height = day.seconds > 0 ? (day.seconds / maxSeconds) * 100 : 4;
              const isToday = day.date === new Date().toISOString().split("T")[0];

              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-32 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-12 rounded-t-md transition-all ${
                        isToday
                          ? "bg-blue-500"
                          : day.seconds > 0
                            ? "bg-blue-300 dark:bg-blue-700"
                            : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      style={{ height: `${height}%`, minHeight: "4px" }}
                      title={`${day.date}: ${formatReadingTime(day.seconds)}`}
                    />
                  </div>
                  <span
                    className={`text-xs ${
                      isToday
                        ? "font-bold text-blue-500"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            Heildartími vikunnar:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {formatReadingTime(weeklyStats.totalReadingSeconds)}
            </span>
          </div>
        </div>

        {/* Two column layout */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Top sections */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <h2 className="mb-4 font-sans text-lg font-semibold">
              Mest lesið
            </h2>
            {topSections.length === 0 ? (
              <p className="text-[var(--text-secondary)]">
                Enginn lestími skráður enn.
              </p>
            ) : (
              <div className="space-y-3">
                {topSections.map((section, i) => (
                  <div
                    key={section.key}
                    className="flex items-center justify-between rounded-lg bg-[var(--bg-primary)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                        {i + 1}
                      </span>
                      <Link
                        to={`/${bookSlug}/kafli/${section.chapterSlug}/${section.sectionSlug}`}
                        className="text-sm hover:text-[var(--accent-color)]"
                      >
                        {section.sectionSlug.replace(/-/g, " ")}
                      </Link>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatReadingTime(section.totalSeconds)}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {section.sessionCount} skipti
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <h2 className="mb-4 font-sans text-lg font-semibold">
              Nýleg virkni
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-[var(--text-secondary)]">
                Engin virkni skráð enn.
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 rounded-lg bg-[var(--bg-primary)] p-2 text-sm"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {ACTIVITY_ICONS[activity.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {ACTIVITY_LABELS[activity.type]}
                      </span>
                      {activity.details.sectionSlug && (
                        <span className="ml-1 text-[var(--text-secondary)]">
                          - {activity.details.sectionSlug.replace(/-/g, " ")}
                        </span>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-[var(--text-secondary)]">
                      {new Date(activity.timestamp).toLocaleTimeString("is-IS", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly summary */}
        <div className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <h2 className="mb-4 font-sans text-lg font-semibold">
            Þennan mánuð
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="font-sans text-3xl font-bold text-[var(--accent-color)]">
                {formatReadingTime(monthlyReadingTime)}
              </div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                Heildarnámstími
              </div>
            </div>
            <div className="text-center">
              <div className="font-sans text-3xl font-bold text-purple-500">
                {Object.keys(sectionReadingTimes).length}
              </div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                Kaflar skoðaðir
              </div>
            </div>
            <div className="text-center">
              <div className="font-sans text-3xl font-bold text-emerald-500">
                {todayStats.flashcardsReviewed +
                  Object.values(dailyStats).reduce(
                    (sum, d) => sum + (d.flashcardsReviewed || 0),
                    0
                  )}
              </div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                Minniskort yfirfarin
              </div>
            </div>
          </div>
        </div>

        {/* Export/Clear actions */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <h2 className="mb-4 font-sans text-lg font-semibold">
            Gagnastjórnun
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowExportConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 font-medium transition-colors hover:bg-[var(--bg-primary)]"
            >
              <Download size={16} />
              Flytja út gögn
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={16} />
              Hreinsa öll gögn
            </button>
          </div>
        </div>

        {/* Export confirm modal */}
        {showExportConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-[var(--bg-secondary)] p-6">
              <h3 className="mb-4 font-sans text-lg font-semibold">
                Flytja út gögn?
              </h3>
              <p className="mb-6 text-[var(--text-secondary)]">
                Þetta mun hlaða niður JSON skrá með öllum námsgreiningargögnum þínum.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExportConfirm(false)}
                  className="rounded-lg px-4 py-2 font-medium transition-colors hover:bg-[var(--bg-primary)]"
                >
                  Hætta við
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
                >
                  <Download size={16} />
                  Flytja út
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear confirm modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-[var(--bg-secondary)] p-6">
              <h3 className="mb-4 font-sans text-lg font-semibold text-red-600">
                Hreinsa öll gögn?
              </h3>
              <p className="mb-6 text-[var(--text-secondary)]">
                Þetta mun eyða öllum námsgreiningargögnum þínum. Þessi aðgerð er
                óafturkræf.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg px-4 py-2 font-medium transition-colors hover:bg-[var(--bg-primary)]"
                >
                  Hætta við
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
                >
                  <Trash2 size={16} />
                  Hreinsa gögn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to={`/${bookSlug}`}
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
          <Link
            to={`/${bookSlug}/markmid`}
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            Sjá námsmarkmið →
          </Link>
        </div>
      </div>
    </div>
  );
}
