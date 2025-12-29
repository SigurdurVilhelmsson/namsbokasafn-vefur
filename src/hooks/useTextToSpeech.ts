import { useState, useEffect, useCallback, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface TTSOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  lang?: string; // BCP 47 language tag, default "is-IS"
}

export interface TTSState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  currentText: string;
  progress: number; // 0 to 1
}

interface UseTextToSpeechReturn extends TTSState {
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  rate: number;
  pitch: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: TTSOptions = {
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: "is-IS",
};

// =============================================================================
// HOOK
// =============================================================================

export function useTextToSpeech(
  options: TTSOptions = {},
): UseTextToSpeechReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check browser support
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [currentText, setCurrentText] = useState("");
  const [progress, setProgress] = useState(0);
  const [rate, setRateState] = useState(opts.rate!);
  const [pitch, setPitchState] = useState(opts.pitch!);

  // Refs
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Try to find an Icelandic voice, or fallback to first available
      const icelandicVoice = availableVoices.find(
        (v) => v.lang.startsWith("is") || v.lang === "is-IS",
      );
      const englishVoice = availableVoices.find(
        (v) => v.lang.startsWith("en"),
      );
      const defaultVoice = icelandicVoice || englishVoice || availableVoices[0];

      if (defaultVoice && !selectedVoice) {
        setSelectedVoice(defaultVoice);
      }
    };

    // Load voices immediately and on change
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, selectedVoice]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  // Speak text
  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Clean text: remove markdown, extra whitespace
      const cleanedText = cleanTextForSpeech(text);
      setCurrentText(cleanedText);

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = opts.volume!;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = opts.lang!;
      }

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setProgress(0);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setProgress(1);
      };

      utterance.onerror = (event) => {
        console.error("TTS Error:", event.error);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      // Track progress using boundary events
      utterance.onboundary = (event) => {
        if (event.charIndex !== undefined && cleanedText.length > 0) {
          setProgress(event.charIndex / cleanedText.length);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, rate, pitch, opts.volume, opts.lang, selectedVoice],
  );

  // Pause speech
  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  // Resume speech
  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  // Stop speech
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentText("");
  }, [isSupported]);

  // Set voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
  }, []);

  // Set rate
  const setRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.1, Math.min(10, newRate));
    setRateState(clampedRate);
  }, []);

  // Set pitch
  const setPitch = useCallback((newPitch: number) => {
    const clampedPitch = Math.max(0, Math.min(2, newPitch));
    setPitchState(clampedPitch);
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    currentText,
    progress,
    rate,
    pitch,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
    setPitch,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Clean text for speech synthesis
 * Removes markdown, equations, and other non-readable content
 */
function cleanTextForSpeech(text: string): string {
  return (
    text
      // Remove LaTeX/KaTeX equations
      .replace(/\$\$[\s\S]*?\$\$/g, " jafna ")
      .replace(/\$[^$]+\$/g, " jafna ")
      // Remove markdown headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove markdown bold/italic
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove markdown images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "mynd: $1")
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, " kóði ")
      .replace(/`[^`]+`/g, " kóði ")
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Remove directive markers
      .replace(/:::[a-z-]+/g, "")
      .replace(/:::/g, "")
      // Collapse multiple whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Get voice display name
 */
export function getVoiceDisplayName(voice: SpeechSynthesisVoice): string {
  // Remove technical prefixes like "Microsoft" or "Google"
  const name = voice.name
    .replace(/^(Microsoft|Google|Apple)\s+/i, "")
    .replace(/\s+Online.*$/i, "");

  const langNames: Record<string, string> = {
    "is-IS": "Íslenska",
    "en-US": "Enska (US)",
    "en-GB": "Enska (UK)",
    "da-DK": "Danska",
    "sv-SE": "Sænska",
    "no-NO": "Norska",
    "de-DE": "Þýska",
    "fr-FR": "Franska",
    "es-ES": "Spænska",
  };

  const langDisplay = langNames[voice.lang] || voice.lang;
  return `${name} (${langDisplay})`;
}

/**
 * Get rate display label
 */
export function getRateLabel(rate: number): string {
  if (rate <= 0.5) return "Mjög hægt";
  if (rate <= 0.75) return "Hægt";
  if (rate <= 1.25) return "Venjulegt";
  if (rate <= 1.75) return "Hratt";
  return "Mjög hratt";
}
