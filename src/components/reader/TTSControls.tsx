import { Play, Pause, Square, Volume2, Settings, Download, Loader2 } from "lucide-react";
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
    voices,
    selectedVoice,
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
  } = useTextToSpeech();

  const [showSettings, setShowSettings] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

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

  const handlePreloadVoice = async (voiceId: string) => {
    setIsPreloading(true);
    try {
      await preloadVoice(voiceId);
    } finally {
      setIsPreloading(false);
    }
  };

  // Show download progress
  const showDownloadProgress =
    downloadProgress && downloadProgress.stage === "downloading";

  if (compact) {
    return (
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
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      {/* Download progress banner */}
      {showDownloadProgress && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <div className="mb-2 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Download size={16} className="animate-pulse" />
            <span>Sæki raddlíkan ({selectedVoice.name})...</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {downloadProgress.percent}% - Þetta þarf aðeins að gerast einu sinni
          </p>
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading && !showDownloadProgress}
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
        {isSpeaking && !showDownloadProgress && (
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
              Rödd: <span className="font-medium">{selectedVoice.name}</span>
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
            <div className="grid grid-cols-2 gap-2">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setVoice(voice)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                    selectedVoice.id === voice.id
                      ? "border-[var(--accent-color)] bg-[var(--accent-light)]"
                      : "border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                  }`}
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {voice.name}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {voice.gender === "male" ? "Karlrödd" : "Kvenrödd"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preload button */}
          <div>
            <button
              onClick={() => handlePreloadVoice(selectedVoice.id)}
              disabled={isPreloading}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] disabled:cursor-wait disabled:opacity-50"
            >
              {isPreloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sæki rödd...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Sækja rödd fyrirfram</span>
                </>
              )}
            </button>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Sækir raddlíkan (~56 MB) til að hraða upplestur
            </p>
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

          {/* Info about first-time download */}
          <div className="rounded-lg bg-[var(--bg-primary)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">
              <strong>Athugið:</strong> Við fyrstu notkun þarf að sækja raddlíkan
              (~56 MB). Eftir það er rödd geymd í vafra og virkar án nettengingar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
