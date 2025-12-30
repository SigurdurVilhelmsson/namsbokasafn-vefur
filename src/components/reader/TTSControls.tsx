import { Play, Pause, Square, Volume2, Settings, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  useTextToSpeech,
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
    isLoading,
    isSpeaking,
    isPaused,
    selectedVoice,
    progress,
    hasIcelandicVoice,
    actualVoiceName,
    rate,
    speak,
    pause,
    resume,
    stop,
    setRate,
  } = useTextToSpeech();

  const [showSettings, setShowSettings] = useState(false);

  // Don't render if TTS is not supported
  if (!isSupported) {
    return null;
  }

  const handlePlayPause = async () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      await speak(content);
    }
  };

  const handleStop = () => {
    stop();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-50"
          aria-label={
            isLoading
              ? "Hleður..."
              : isSpeaking
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Lesa upphátt"
          }
          title={
            isLoading
              ? "Hleður röddinni..."
              : isSpeaking
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Lesa upphátt"
          }
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isSpeaking && !isPaused ? (
            <Pause size={16} />
          ) : (
            <Volume2 size={16} />
          )}
          <span className="hidden sm:inline">
            {isLoading
              ? "Hleður..."
              : isSpeaking
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Lesa upphátt"}
          </span>
        </button>
        {!hasIcelandicVoice && (
          <span title="Engin íslensk rödd fannst - notar enska rödd" className="text-amber-500">
            <AlertTriangle size={16} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      {/* Warning banner if no Icelandic voice */}
      {!hasIcelandicVoice && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Engin íslensk rödd fannst</p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Vafrinn þinn er ekki með íslenska rödd. Textinn verður lesinn á ensku.
                Til að fá íslenska rödd, farðu í Windows stillingar → Tími og tungumál → Tungumál og svæði → Bæta við tungumáli → Íslenska.
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Núverandi rödd: <strong>{actualVoiceName}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-color)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-50"
          aria-label={
            isLoading
              ? "Hleður..."
              : isSpeaking
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Spila"
          }
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isSpeaking && !isPaused ? (
            <Pause size={24} />
          ) : (
            <Play size={24} className="ml-1" />
          )}
        </button>

        {/* Stop button */}
        {(isSpeaking || isLoading) && (
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

        {/* Voice indicator when not playing */}
        {!isSpeaking && !isLoading && (
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)]">
              Rödd: <span className="font-medium">{actualVoiceName}</span>
              {hasIcelandicVoice && (
                <span className="ml-1 text-xs text-green-600 dark:text-green-400">(íslenska)</span>
              )}
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

          {/* Voice info */}
          <div className="rounded-lg bg-[var(--bg-primary)] p-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {selectedVoice.name}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedVoice.gender === "male" ? "Karlrödd" : "Kvenrödd"}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Vafrarödd: <strong>{actualVoiceName}</strong>
            </p>
            {!hasIcelandicVoice && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Settu upp íslenskt tungumál í Windows til að fá íslenska rödd.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
