import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createSectionKey,
  getCurrentTimestamp,
  getTodayDateString,
} from "@/utils/storeHelpers";

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "namsbokasafn-analytics";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Reading session for a specific section
 */
export interface ReadingSession {
  sectionKey: string;
  startTime: string; // ISO timestamp
  endTime: string | null; // ISO timestamp, null if still active
  durationSeconds: number;
  bookSlug: string;
  chapterSlug: string;
  sectionSlug: string;
}

/**
 * Aggregated reading time for a section
 */
export interface SectionReadingTime {
  totalSeconds: number;
  sessionCount: number;
  lastRead: string; // ISO timestamp
  averageSessionSeconds: number;
}

/**
 * Daily study statistics
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalReadingSeconds: number;
  sectionsVisited: number;
  flashcardsReviewed: number;
  quizzesTaken: number;
  objectivesCompleted: number;
}

/**
 * Weekly summary statistics
 */
export interface WeeklySummary {
  weekStart: string; // YYYY-MM-DD (Monday)
  totalReadingSeconds: number;
  averageReadingSeconds: number;
  sectionsVisited: number;
  daysActive: number;
}

/**
 * Activity type for tracking various learning activities
 */
export type ActivityType =
  | "reading"
  | "flashcard"
  | "quiz"
  | "objective"
  | "annotation";

/**
 * Activity log entry
 */
export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: string;
  details: {
    bookSlug?: string;
    chapterSlug?: string;
    sectionSlug?: string;
    action?: string;
    count?: number;
  };
}

interface AnalyticsState {
  // Reading sessions
  sessions: ReadingSession[];
  currentSession: ReadingSession | null;

  // Aggregated reading time per section
  sectionReadingTimes: Record<string, SectionReadingTime>;

  // Daily statistics
  dailyStats: Record<string, DailyStats>;

  // Activity log (limited to recent 500 entries)
  activityLog: ActivityEntry[];

  // Study streak
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;

  // Session management
  startReadingSession: (
    bookSlug: string,
    chapterSlug: string,
    sectionSlug: string,
  ) => void;
  endReadingSession: () => void;
  updateCurrentSession: () => void;

  // Activity logging
  logActivity: (
    type: ActivityType,
    details: ActivityEntry["details"],
  ) => void;

  // Statistics getters
  getTotalReadingTime: () => number;
  getSectionReadingTime: (
    chapterSlug: string,
    sectionSlug: string,
  ) => SectionReadingTime | null;
  getChapterReadingTime: (chapterSlug: string) => number;
  getDailyStats: (date?: string) => DailyStats;
  getWeeklyStats: () => WeeklySummary;
  getMonthlyReadingTime: () => number;
  getRecentActivity: (limit?: number) => ActivityEntry[];

  // Streak management
  updateStreak: () => void;
  getStreakInfo: () => {
    current: number;
    longest: number;
    lastActive: string | null;
  };

  // Export
  exportAnalytics: () => string;
  clearAllData: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function generateActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyDailyStats(date: string): DailyStats {
  return {
    date,
    totalReadingSeconds: 0,
    sectionsVisited: 0,
    flashcardsReviewed: 0,
    quizzesTaken: 0,
    objectivesCompleted: 0,
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Default values
      sessions: [],
      currentSession: null,
      sectionReadingTimes: {},
      dailyStats: {},
      activityLog: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,

      // Start a new reading session
      startReadingSession: (bookSlug, chapterSlug, sectionSlug) => {
        const { currentSession, endReadingSession } = get();

        // End any existing session first
        if (currentSession) {
          endReadingSession();
        }

        const sectionKey = createSectionKey(chapterSlug, sectionSlug);
        const newSession: ReadingSession = {
          sectionKey,
          startTime: getCurrentTimestamp(),
          endTime: null,
          durationSeconds: 0,
          bookSlug,
          chapterSlug,
          sectionSlug,
        };

        set({ currentSession: newSession });

        // Log activity
        get().logActivity("reading", {
          bookSlug,
          chapterSlug,
          sectionSlug,
          action: "started",
        });

        // Update streak
        get().updateStreak();
      },

      // End the current reading session
      endReadingSession: () => {
        const { currentSession, sessions, sectionReadingTimes, dailyStats } =
          get();

        if (!currentSession) return;

        const endTime = getCurrentTimestamp();
        const startDate = new Date(currentSession.startTime);
        const endDate = new Date(endTime);
        const durationSeconds = Math.round(
          (endDate.getTime() - startDate.getTime()) / 1000,
        );

        // Skip very short sessions (less than 5 seconds)
        if (durationSeconds < 5) {
          set({ currentSession: null });
          return;
        }

        const completedSession: ReadingSession = {
          ...currentSession,
          endTime,
          durationSeconds,
        };

        // Update section reading time
        const sectionKey = currentSession.sectionKey;
        const existingTime = sectionReadingTimes[sectionKey] || {
          totalSeconds: 0,
          sessionCount: 0,
          lastRead: "",
          averageSessionSeconds: 0,
        };

        const newTotalSeconds = existingTime.totalSeconds + durationSeconds;
        const newSessionCount = existingTime.sessionCount + 1;

        const updatedSectionTime: SectionReadingTime = {
          totalSeconds: newTotalSeconds,
          sessionCount: newSessionCount,
          lastRead: endTime,
          averageSessionSeconds: Math.round(newTotalSeconds / newSessionCount),
        };

        // Update daily stats
        const today = getTodayDateString();
        const todayStats = dailyStats[today] || createEmptyDailyStats(today);

        // Check if this is a new section visit today
        const visitedToday = sessions.some(
          (s) =>
            s.sectionKey === sectionKey &&
            s.startTime.startsWith(today),
        );

        const updatedDailyStats: DailyStats = {
          ...todayStats,
          totalReadingSeconds: todayStats.totalReadingSeconds + durationSeconds,
          sectionsVisited: visitedToday
            ? todayStats.sectionsVisited
            : todayStats.sectionsVisited + 1,
        };

        // Keep only last 1000 sessions
        const updatedSessions = [...sessions, completedSession].slice(-1000);

        set({
          currentSession: null,
          sessions: updatedSessions,
          sectionReadingTimes: {
            ...sectionReadingTimes,
            [sectionKey]: updatedSectionTime,
          },
          dailyStats: {
            ...dailyStats,
            [today]: updatedDailyStats,
          },
        });
      },

      // Update current session duration (called periodically)
      updateCurrentSession: () => {
        const { currentSession } = get();
        if (!currentSession) return;

        const now = new Date();
        const start = new Date(currentSession.startTime);
        const durationSeconds = Math.round(
          (now.getTime() - start.getTime()) / 1000,
        );

        set({
          currentSession: {
            ...currentSession,
            durationSeconds,
          },
        });
      },

      // Log an activity
      logActivity: (type, details) => {
        const { activityLog } = get();

        const entry: ActivityEntry = {
          id: generateActivityId(),
          type,
          timestamp: getCurrentTimestamp(),
          details,
        };

        // Keep only last 500 entries
        const updatedLog = [...activityLog, entry].slice(-500);

        set({ activityLog: updatedLog });

        // Update daily stats for non-reading activities
        const today = getTodayDateString();
        const { dailyStats } = get();
        const todayStats = dailyStats[today] || createEmptyDailyStats(today);

        let updatedDailyStats = { ...todayStats };

        switch (type) {
          case "flashcard":
            updatedDailyStats.flashcardsReviewed += details.count || 1;
            break;
          case "quiz":
            updatedDailyStats.quizzesTaken += 1;
            break;
          case "objective":
            if (details.action === "completed") {
              updatedDailyStats.objectivesCompleted += 1;
            }
            break;
        }

        if (type !== "reading") {
          set({
            dailyStats: {
              ...dailyStats,
              [today]: updatedDailyStats,
            },
          });
        }
      },

      // Get total reading time across all sections
      getTotalReadingTime: () => {
        const { sectionReadingTimes } = get();
        return Object.values(sectionReadingTimes).reduce(
          (total, section) => total + section.totalSeconds,
          0,
        );
      },

      // Get reading time for a specific section
      getSectionReadingTime: (chapterSlug, sectionSlug) => {
        const sectionKey = createSectionKey(chapterSlug, sectionSlug);
        return get().sectionReadingTimes[sectionKey] || null;
      },

      // Get total reading time for a chapter
      getChapterReadingTime: (chapterSlug) => {
        const { sectionReadingTimes } = get();
        const prefix = `${chapterSlug}/`;

        return Object.entries(sectionReadingTimes)
          .filter(([key]) => key.startsWith(prefix))
          .reduce((total, [, section]) => total + section.totalSeconds, 0);
      },

      // Get daily stats for a specific date (default: today)
      getDailyStats: (date) => {
        const targetDate = date || getTodayDateString();
        return (
          get().dailyStats[targetDate] || createEmptyDailyStats(targetDate)
        );
      },

      // Get weekly summary
      getWeeklyStats: () => {
        const { dailyStats } = get();
        const weekStart = getWeekStart(new Date());

        let totalReadingSeconds = 0;
        let sectionsVisited = 0;
        let daysActive = 0;

        // Get all dates in the current week
        const weekDates: string[] = [];
        const startDate = new Date(weekStart);
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          weekDates.push(d.toISOString().split("T")[0]);
        }

        weekDates.forEach((date) => {
          const stats = dailyStats[date];
          if (stats) {
            totalReadingSeconds += stats.totalReadingSeconds;
            sectionsVisited += stats.sectionsVisited;
            if (stats.totalReadingSeconds > 0) {
              daysActive++;
            }
          }
        });

        return {
          weekStart,
          totalReadingSeconds,
          averageReadingSeconds:
            daysActive > 0 ? Math.round(totalReadingSeconds / daysActive) : 0,
          sectionsVisited,
          daysActive,
        };
      },

      // Get monthly reading time
      getMonthlyReadingTime: () => {
        const { dailyStats } = get();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];

        return Object.entries(dailyStats)
          .filter(([date]) => date >= monthStart)
          .reduce((total, [, stats]) => total + stats.totalReadingSeconds, 0);
      },

      // Get recent activity
      getRecentActivity: (limit = 20) => {
        const { activityLog } = get();
        return activityLog.slice(-limit).reverse();
      },

      // Update study streak
      updateStreak: () => {
        const { lastActiveDate, currentStreak, longestStreak } = get();
        const today = getTodayDateString();

        if (lastActiveDate === today) {
          // Already active today, no update needed
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = currentStreak;

        if (lastActiveDate === yesterdayStr) {
          // Continuing streak
          newStreak = currentStreak + 1;
        } else if (lastActiveDate !== today) {
          // Streak broken, start new
          newStreak = 1;
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
          lastActiveDate: today,
        });
      },

      // Get streak information
      getStreakInfo: () => {
        const { currentStreak, longestStreak, lastActiveDate } = get();
        return {
          current: currentStreak,
          longest: longestStreak,
          lastActive: lastActiveDate,
        };
      },

      // Export all analytics data as JSON
      exportAnalytics: () => {
        const state = get();
        const exportData = {
          exportDate: getCurrentTimestamp(),
          summary: {
            totalReadingTime: state.getTotalReadingTime(),
            totalSessions: state.sessions.length,
            currentStreak: state.currentStreak,
            longestStreak: state.longestStreak,
          },
          sectionReadingTimes: state.sectionReadingTimes,
          dailyStats: state.dailyStats,
          recentActivity: state.activityLog.slice(-100),
        };

        return JSON.stringify(exportData, null, 2);
      },

      // Clear all analytics data
      clearAllData: () => {
        set({
          sessions: [],
          currentSession: null,
          sectionReadingTimes: {},
          dailyStats: {},
          activityLog: [],
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
