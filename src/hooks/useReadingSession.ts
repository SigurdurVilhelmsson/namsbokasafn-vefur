import { useEffect, useRef, useCallback } from "react";
import { useAnalyticsStore } from "@/stores/analyticsStore";

/**
 * Hook for tracking reading time on a section
 *
 * Automatically starts a session when the component mounts and ends it
 * when the component unmounts or the section changes.
 *
 * Also handles:
 * - Pausing when the tab is hidden
 * - Periodic session updates (every 30 seconds)
 * - Cleanup on unmount
 */
export function useReadingSession(
  bookSlug: string,
  chapterSlug: string,
  sectionSlug: string,
) {
  const startSession = useAnalyticsStore((s) => s.startReadingSession);
  const endSession = useAnalyticsStore((s) => s.endReadingSession);
  const updateSession = useAnalyticsStore((s) => s.updateCurrentSession);
  const currentSession = useAnalyticsStore((s) => s.currentSession);

  // Track if session is active
  const sessionActiveRef = useRef(false);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Start session
  const handleStartSession = useCallback(() => {
    if (!sessionActiveRef.current) {
      startSession(bookSlug, chapterSlug, sectionSlug);
      sessionActiveRef.current = true;
    }
  }, [bookSlug, chapterSlug, sectionSlug, startSession]);

  // End session
  const handleEndSession = useCallback(() => {
    if (sessionActiveRef.current) {
      endSession();
      sessionActiveRef.current = false;
    }
  }, [endSession]);

  // Handle visibility change (pause when tab hidden)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      handleEndSession();
    } else {
      handleStartSession();
    }
  }, [handleEndSession, handleStartSession]);

  // Effect: Start/end session when section changes
  useEffect(() => {
    // Start new session
    handleStartSession();

    // Set up periodic updates (every 30 seconds)
    updateIntervalRef.current = setInterval(() => {
      if (sessionActiveRef.current) {
        updateSession();
      }
    }, 30000);

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      handleEndSession();

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    bookSlug,
    chapterSlug,
    sectionSlug,
    handleStartSession,
    handleEndSession,
    handleVisibilityChange,
    updateSession,
  ]);

  // Effect: Handle beforeunload to save session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionActiveRef.current) {
        endSession();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [endSession]);

  return {
    isTracking: sessionActiveRef.current,
    currentDuration: currentSession?.durationSeconds || 0,
  };
}

/**
 * Format seconds into a human-readable string
 * Examples: "2 mín", "1 klst 30 mín", "45 sek"
 */
export function formatReadingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sek`;
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    if (remainingMinutes > 0) {
      return `${hours} klst ${remainingMinutes} mín`;
    }
    return `${hours} klst`;
  }

  return `${minutes} mín`;
}

/**
 * Format seconds into a short format for dashboard
 * Examples: "2m", "1h 30m", "45s"
 */
export function formatReadingTimeShort(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${hours}h`;
  }

  return `${minutes}m`;
}
