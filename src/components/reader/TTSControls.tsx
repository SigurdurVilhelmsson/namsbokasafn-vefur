import { Play, Pause, Square, Volume2, Settings } from "lucide-react";
import { useState } from "react";
import {
  useTextToSpeech,
  getVoiceDisplayName,
  getRateLabel,
} from "@/hooks/useTextToSpeech";

// =============================================================================
// TYPES
// =============================================================================

interface TTSControlsProps {
  content: string;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TTSControls({
  content,
  compact = false,
}: TTSControlsProps) {
  const {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    progress,
    rate,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
  } = useTextToSpeech();

  const [showSettings, setShowSettings] = useState(false);

  // Don't render if TTS is not supported
  if (!isSupported) {
    return null;
  }

  const handlePlayPause = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      speak(content);
    }
  };

  const handleStop = () => {
    stop();
  };

  if (compact) {
    return (
      <button
        onClick={handlePlayPause}
        className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
        aria-label={isSpeaking ? (isPaused ? "Halda áfram" : "Gera hlé") : "Lesa upphátt"}
        title={isSpeaking ? (isPaused ? "Halda áfram" : "Gera hlé") : "Lesa upphátt"}
      >
        {isSpeaking && !isPaused ? (
          <Pause size={16} />
        ) : (
          <Volume2 size={16} />
        )}
        <span className="hidden sm:inline">
          {isSpeaking ? (isPaused ? "Halda áfram" : "Gera hlé") : "Lesa upphátt"}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-color)] text-white transition-colors hover:bg-[var(--accent-hover)]"
          aria-label={isSpeaking ? (isPaused ? "Halda áfram" : "Gera hlé") : "Spila"}
        >
          {isSpeaking && !isPaused ? (
            <Pause size={24} />
          ) : (
            <Play size={24} className="ml-1" />
          )}
        </button>

        {/* Stop button */}
        {isSpeaking && (
          <button
            onClick={handleStop}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            aria-label="Stoppa"
          >
            <Square size={18} />
          </button>
        )}

        {/* Progress bar */}
        {isSpeaking && (
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
              <div
                className="h-full bg-[var(--accent-color)] transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {Math.round(progress * 100)}% lesið
            </p>
          </div>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
            showSettings
              ? "border-[var(--accent-color)] bg-[var(--accent-light)] text-[var(--accent-color)]"
              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
          }`}
          aria-label="Stillingar"
          aria-expanded={showSettings}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-4 space-y-4 border-t border-[var(--border-color)] pt-4">
          {/* Voice selector */}
          <div>
            <label
              htmlFor="tts-voice"
              className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
            >
              Rödd
            </label>
            <select
              id="tts-voice"
              value={selectedVoice?.name || ""}
              onChange={(e) => {
                const voice = voices.find((v) => v.name === e.target.value);
                if (voice) setVoice(voice);
              }}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {getVoiceDisplayName(voice)}
                </option>
              ))}
            </select>
          </div>

          {/* Speed slider */}
          <div>
            <label
              htmlFor="tts-rate"
              className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
            >
              Hraði: {getRateLabel(rate)} ({rate.toFixed(1)}x)
            </label>
            <input
              id="tts-rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent-color)]"
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>Hægt</span>
              <span>Hratt</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
