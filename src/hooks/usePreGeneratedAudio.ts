import { useState, useEffect, useCallback, useRef } from "react";
import { audioPlayer, type AudioPlayerState } from "@/services/audioPlayer";

// =============================================================================
// TYPES
// =============================================================================

export interface UsePreGeneratedAudioReturn {
  // State
  hasAudio: boolean | null; // null = checking, true = has audio, false = no audio
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  error: string | null;
  rate: number;

  // Actions
  play: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (position: number) => void;
  setRate: (rate: number) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePreGeneratedAudio(
  bookSlug?: string,
  chapterSlug?: string,
  sectionSlug?: string
): UsePreGeneratedAudioReturn {
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [state, setState] = useState<AudioPlayerState>(() => audioPlayer.getState());
  const [rate, setRateState] = useState(1);
  const rateRef = useRef(rate);

  // Update rate ref when rate changes
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  // Subscribe to audio player state changes
  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe(setState);
    return unsubscribe;
  }, []);

  // Check if pre-generated audio exists
  useEffect(() => {
    if (!bookSlug || !chapterSlug || !sectionSlug) {
      setHasAudio(false);
      return;
    }

    setHasAudio(null); // Loading state

    audioPlayer.hasAudio(bookSlug, chapterSlug, sectionSlug).then((exists) => {
      setHasAudio(exists);
    });
  }, [bookSlug, chapterSlug, sectionSlug]);

  // Play audio
  const play = useCallback(async () => {
    if (!bookSlug || !chapterSlug || !sectionSlug) return;

    await audioPlayer.play(bookSlug, chapterSlug, sectionSlug);
    audioPlayer.setPlaybackRate(rateRef.current);
  }, [bookSlug, chapterSlug, sectionSlug]);

  // Pause audio
  const pause = useCallback(() => {
    audioPlayer.pause();
  }, []);

  // Resume audio
  const resume = useCallback(() => {
    audioPlayer.resume();
  }, []);

  // Stop audio
  const stop = useCallback(() => {
    audioPlayer.stop();
  }, []);

  // Seek to position
  const seek = useCallback((position: number) => {
    audioPlayer.seek(position);
  }, []);

  // Set playback rate
  const setRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2, newRate));
    setRateState(clampedRate);
    audioPlayer.setPlaybackRate(clampedRate);
  }, []);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      audioPlayer.stop();
    };
  }, []);

  return {
    hasAudio,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    isLoading: state.isLoading,
    progress: state.progress,
    duration: state.duration,
    currentTime: state.currentTime,
    error: state.error,
    rate,
    play,
    pause,
    resume,
    stop,
    seek,
    setRate,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get rate display label in Icelandic
 */
export function getRateLabel(rate: number): string {
  if (rate <= 0.6) return "Mjög hægt";
  if (rate <= 0.8) return "Hægt";
  if (rate <= 1.2) return "Venjulegt";
  if (rate <= 1.5) return "Hratt";
  return "Mjög hratt";
}
