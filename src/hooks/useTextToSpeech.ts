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
  isLoading: boolean; // True when synthesizing
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

  // Check browser support (Web Speech API)
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

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
    };
  }, []);

  // Speak text
  const speak = useCallback(
    async (text: string) => {
      console.log("[useTextToSpeech] speak() called, text length:", text.length);
      console.log("[useTextToSpeech] isSupported:", isSupported);

      if (!isSupported || !text.trim()) {
        console.log("[useTextToSpeech] Aborting: not supported or empty text");
        return;
      }

      // Stop any ongoing speech
      piperTts.stop();

      setCurrentText(text);
      setIsLoading(true);
      setProgress(0);
      setDownloadProgress(null);

      try {
        console.log("[useTextToSpeech] Calling piperTts.speak()...");
        const audio = await piperTts.speak(
          text,
          selectedVoice.id,
          (progress) => {
            console.log("[useTextToSpeech] Progress:", progress);
            setDownloadProgress(progress);
          }
        );

        console.log("[useTextToSpeech] Got audio element, setting up handlers");
        audioRef.current = audio;

        // Set up event handlers for the fake audio element
        audio.addEventListener("play", () => {
          console.log("[useTextToSpeech] play event fired");
          setIsSpeaking(true);
          setIsPaused(false);
          setIsLoading(false);
        });

        audio.addEventListener("pause", () => {
          console.log("[useTextToSpeech] pause event fired");
          setIsPaused(true);
        });

        audio.addEventListener("ended", () => {
          console.log("[useTextToSpeech] ended event fired");
          setIsSpeaking(false);
          setIsPaused(false);
          setProgress(1);
          audioRef.current = null;
        });

        audio.addEventListener("error", () => {
          console.error("[useTextToSpeech] error event fired");
          setIsSpeaking(false);
          setIsPaused(false);
          setIsLoading(false);
          audioRef.current = null;
        });

        // Web Speech API auto-starts, so just set state
        setIsSpeaking(true);
        setIsLoading(false);
      } catch (error) {
        console.error("[useTextToSpeech] TTS Error:", error);
        setIsLoading(false);
        setIsSpeaking(false);
      }
    },
    [isSupported, selectedVoice.id]
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
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentText("");
    setIsLoading(false);
    audioRef.current = null;
  }, []);

  // Set voice
  const setVoice = useCallback((voice: IcelandicVoice) => {
    setSelectedVoice(voice);
  }, []);

  // Set rate (note: Web Speech API rate is set per utterance, not dynamically)
  const setRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2, newRate));
    setRateState(clampedRate);
  }, []);

  // Preload a voice (no-op for Web Speech API)
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
