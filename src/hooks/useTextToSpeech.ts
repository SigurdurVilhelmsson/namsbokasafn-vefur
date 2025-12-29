import { useState, useEffect, useCallback, useRef } from "react";
import {
  piperTts,
  ICELANDIC_VOICES,
  DEFAULT_VOICE,
  type IcelandicVoice,
  type TTSProgress,
} from "@/services/piperTts";

// =============================================================================
// TYPES
// =============================================================================

export interface TTSOptions {
  rate?: number; // 0.5 to 2, default 1 (playback rate)
  voiceId?: string; // Icelandic voice ID
}

export interface TTSState {
  isSupported: boolean;
  isLoading: boolean; // True when downloading model or synthesizing
  isSpeaking: boolean;
  isPaused: boolean;
  voices: IcelandicVoice[];
  selectedVoice: IcelandicVoice;
  currentText: string;
  progress: number; // 0 to 1 (playback progress)
  downloadProgress: TTSProgress | null;
}

interface UseTextToSpeechReturn extends TTSState {
  speak: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voice: IcelandicVoice) => void;
  setRate: (rate: number) => void;
  preloadVoice: (voiceId: string) => Promise<void>;
  rate: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: TTSOptions = {
  rate: 1,
  voiceId: DEFAULT_VOICE.id,
};

const STORAGE_KEY = "tts-settings";

// =============================================================================
// HOOK
// =============================================================================

export function useTextToSpeech(
  options: TTSOptions = {}
): UseTextToSpeechReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check browser support (requires modern browser with WASM support)
  const isSupported =
    typeof window !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    "AudioContext" in window;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<IcelandicVoice>(() => {
    // Try to restore saved voice preference
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const settings = JSON.parse(saved);
          const voice = ICELANDIC_VOICES.find((v) => v.id === settings.voiceId);
          if (voice) return voice;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return (
      ICELANDIC_VOICES.find((v) => v.id === opts.voiceId) || DEFAULT_VOICE
    );
  });
  const [currentText, setCurrentText] = useState("");
  const [progress, setProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<TTSProgress | null>(
    null
  );
  const [rate, setRateState] = useState(() => {
    // Try to restore saved rate preference
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const settings = JSON.parse(saved);
          if (typeof settings.rate === "number") return settings.rate;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return opts.rate!;
  });

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Initialize service
  useEffect(() => {
    if (isSupported) {
      piperTts.initialize().catch(console.error);
    }
  }, [isSupported]);

  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            voiceId: selectedVoice.id,
            rate,
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [selectedVoice, rate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      piperTts.stop();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Track playback progress
  const startProgressTracking = useCallback((audio: HTMLAudioElement) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = window.setInterval(() => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    }, 100);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Speak text
  const speak = useCallback(
    async (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Stop any ongoing speech
      piperTts.stop();
      stopProgressTracking();

      setCurrentText(text);
      setIsLoading(true);
      setProgress(0);
      setDownloadProgress(null);

      try {
        const audio = await piperTts.speak(
          text,
          selectedVoice.id,
          (progress) => {
            setDownloadProgress(progress);
          }
        );

        audioRef.current = audio;
        audio.playbackRate = rate;

        // Set up event handlers
        audio.onplay = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setIsLoading(false);
          startProgressTracking(audio);
        };

        audio.onpause = () => {
          setIsPaused(true);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          setProgress(1);
          stopProgressTracking();
          audioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          setIsLoading(false);
          stopProgressTracking();
          audioRef.current = null;
        };
      } catch (error) {
        console.error("TTS Error:", error);
        setIsLoading(false);
        setIsSpeaking(false);
      }
    },
    [isSupported, rate, selectedVoice.id, startProgressTracking, stopProgressTracking]
  );

  // Pause speech
  const pause = useCallback(() => {
    piperTts.pause();
    setIsPaused(true);
  }, []);

  // Resume speech
  const resume = useCallback(() => {
    piperTts.resume();
    setIsPaused(false);
  }, []);

  // Stop speech
  const stop = useCallback(() => {
    piperTts.stop();
    stopProgressTracking();
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentText("");
    setIsLoading(false);
    audioRef.current = null;
  }, [stopProgressTracking]);

  // Set voice
  const setVoice = useCallback((voice: IcelandicVoice) => {
    setSelectedVoice(voice);
  }, []);

  // Set rate
  const setRate = useCallback(
    (newRate: number) => {
      const clampedRate = Math.max(0.5, Math.min(2, newRate));
      setRateState(clampedRate);

      // Update current audio if playing
      if (audioRef.current) {
        audioRef.current.playbackRate = clampedRate;
      }
    },
    []
  );

  // Preload a voice for faster playback later
  const preloadVoice = useCallback(
    async (voiceId: string) => {
      if (!isSupported) return;

      setDownloadProgress(null);
      await piperTts.downloadVoice(voiceId, (progress) => {
        setDownloadProgress(progress);
      });
      setDownloadProgress(null);
    },
    [isSupported]
  );

  return {
    isSupported,
    isLoading,
    isSpeaking,
    isPaused,
    voices: ICELANDIC_VOICES,
    selectedVoice,
    currentText,
    progress,
    downloadProgress,
    rate,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
    preloadVoice,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get voice display name in Icelandic
 */
export function getVoiceDisplayName(voice: IcelandicVoice): string {
  return voice.description;
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

// Re-export types for convenience
export type { IcelandicVoice, TTSProgress };
