import { Play, Pause, Square, Settings, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  usePreGeneratedAudio,
  formatTime,
  getRateLabel,
} from "@/hooks/usePreGeneratedAudio";
import {
  useTextToSpeech,
  getRateLabel as getWebSpeechRateLabel,
} from "@/hooks/useTextToSpeech";

// =============================================================================
// TYPES
// =============================================================================

interface TTSControlsProps {
  content: string;
  bookSlug?: string;
  chapterSlug?: string;
  sectionSlug?: string;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TTSControls({
  content,
  bookSlug,
  chapterSlug,
  sectionSlug,
  compact = false,
}: TTSControlsProps) {
  // Pre-generated audio (preferred)
  const preGenAudio = usePreGeneratedAudio(bookSlug, chapterSlug, sectionSlug);

  // Web Speech API fallback
  const webSpeech = useTextToSpeech();

  const [showSettings, setShowSettings] = useState(false);

  // Determine which mode to use
  const usePreGenerated = preGenAudio.hasAudio === true;
  const isCheckingAudio = preGenAudio.hasAudio === null;

  // Combined state
  const isLoading = isCheckingAudio || (usePreGenerated ? preGenAudio.isLoading : webSpeech.isLoading);
  const isPlaying = usePreGenerated ? preGenAudio.isPlaying : webSpeech.isSpeaking;
  const isPaused = usePreGenerated ? preGenAudio.isPaused : webSpeech.isPaused;
  const progress = usePreGenerated ? preGenAudio.progress : webSpeech.progress;
  const rate = usePreGenerated ? preGenAudio.rate : webSpeech.rate;

  // Don't render if neither mode is supported
  if (!webSpeech.isSupported && preGenAudio.hasAudio === false) {
    return null;
  }

  const handlePlayPause = async () => {
    if (isPlaying) {
      if (isPaused) {
        usePreGenerated ? preGenAudio.resume() : webSpeech.resume();
      } else {
        usePreGenerated ? preGenAudio.pause() : webSpeech.pause();
      }
    } else {
      if (usePreGenerated) {
        await preGenAudio.play();
      } else {
        await webSpeech.speak(content);
      }
    }
  };

  const handleStop = () => {
    usePreGenerated ? preGenAudio.stop() : webSpeech.stop();
  };

  const handleRateChange = (newRate: number) => {
    if (usePreGenerated) {
      preGenAudio.setRate(newRate);
    } else {
      webSpeech.setRate(newRate);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!usePreGenerated || !preGenAudio.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / rect.width;
    preGenAudio.seek(Math.max(0, Math.min(1, position)));
  };

  const handleDownload = () => {
    if (!bookSlug || !chapterSlug || !sectionSlug) return;

    const url = `/content/${bookSlug}/chapters/${chapterSlug}/${sectionSlug}.mp3`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sectionSlug}.mp3`;
    link.click();
  };

  // Compact mode
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
              : isPlaying
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Lesa upphátt"
          }
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isPlaying && !isPaused ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
          <span className="hidden sm:inline">
            {isLoading
              ? "Hleður..."
              : isPlaying
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Lesa upphátt"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      {/* Audio source indicator */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {usePreGenerated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Íslensk hljóðskrá
            </span>
          ) : isCheckingAudio ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <Loader2 size={10} className="animate-spin" />
              Athuga hljóðskrá...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Talgervi vafra
            </span>
          )}
        </div>

        {/* Download button (only for pre-generated) */}
        {usePreGenerated && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            aria-label="Sækja hljóðskrá"
            title="Sækja hljóðskrá"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Sækja</span>
          </button>
        )}
      </div>

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
              : isPlaying
                ? isPaused
                  ? "Halda áfram"
                  : "Gera hlé"
                : "Spila"
          }
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isPlaying && !isPaused ? (
            <Pause size={24} />
          ) : (
            <Play size={24} className="ml-1" />
          )}
        </button>

        {/* Stop button */}
        {(isPlaying || isLoading) && (
          <button
            onClick={handleStop}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            aria-label="Stoppa"
          >
            <Square size={18} />
          </button>
        )}

        {/* Progress bar */}
        <div className="flex-1">
          <div
            className={`h-2 overflow-hidden rounded-full bg-[var(--bg-primary)] ${
              usePreGenerated && preGenAudio.duration > 0 ? "cursor-pointer" : ""
            }`}
            onClick={handleSeek}
          >
            <div
              className="h-full bg-[var(--accent-color)] transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
            {usePreGenerated && preGenAudio.duration > 0 ? (
              <>
                <span>{formatTime(preGenAudio.currentTime)}</span>
                <span>{formatTime(preGenAudio.duration)}</span>
              </>
            ) : (
              <span>{Math.round(progress * 100)}% lesið</span>
            )}
          </div>
        </div>

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
              Hraði: {usePreGenerated ? getRateLabel(rate) : getWebSpeechRateLabel(rate)} ({rate.toFixed(1)}x)
            </label>
            <input
              id="tts-rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent-color)]"
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>Hægt</span>
              <span>Hratt</span>
            </div>
          </div>

          {/* Audio info */}
          <div className="rounded-lg bg-[var(--bg-primary)] p-3">
            {usePreGenerated ? (
              <>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Forupptökuð hljóðskrá
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Íslensk rödd - Diljá
                </p>
                {preGenAudio.duration > 0 && (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Lengd: {formatTime(preGenAudio.duration)}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {webSpeech.selectedVoice.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {webSpeech.selectedVoice.gender === "male" ? "Karlrödd" : "Kvenrödd"}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Vafrarödd: <strong>{webSpeech.actualVoiceName}</strong>
                </p>
                {!webSpeech.hasIcelandicVoice && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Íslensk talgervirödd er ekki tiltæk í þessum vafra.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
