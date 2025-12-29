// =============================================================================
// PIPER TTS SERVICE
// Icelandic text-to-speech using Piper TTS models via WebAssembly
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface IcelandicVoice {
  id: string;
  name: string;
  gender: "male" | "female";
  description: string;
}

export interface TTSProgress {
  stage: "downloading" | "synthesizing" | "ready";
  loaded: number;
  total: number;
  percent: number;
}

export type TTSProgressCallback = (progress: TTSProgress) => void;

// Type for the piper-tts-web module
interface PiperTTS {
  predict: (
    options: { text: string; voiceId: string },
    onProgress?: (progress: { loaded: number; total: number }) => void
  ) => Promise<Blob>;
  download: (
    voiceId: string,
    onProgress?: (progress: { loaded: number; total: number }) => void
  ) => Promise<void>;
  stored: () => Promise<string[]>;
  remove: (voiceId: string) => Promise<void>;
  flush: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Available Icelandic voices from Piper TTS
 * These are trained on the Talrómur dataset from Reykjavík University
 */
export const ICELANDIC_VOICES: IcelandicVoice[] = [
  {
    id: "is_IS-steinn-medium",
    name: "Steinn",
    gender: "male",
    description: "Karlrödd - Steinn",
  },
  {
    id: "is_IS-bui-medium",
    name: "Búi",
    gender: "male",
    description: "Karlrödd - Búi",
  },
  {
    id: "is_IS-salka-medium",
    name: "Salka",
    gender: "female",
    description: "Kvenrödd - Salka",
  },
  {
    id: "is_IS-ugla-medium",
    name: "Ugla",
    gender: "female",
    description: "Kvenrödd - Ugla",
  },
];

export const DEFAULT_VOICE = ICELANDIC_VOICES[0]; // Steinn

// =============================================================================
// LAZY MODULE LOADING
// =============================================================================

let ttsModule: PiperTTS | null = null;
let moduleLoadPromise: Promise<PiperTTS> | null = null;

/**
 * Configure ONNX Runtime and load piper-tts-web
 * Uses dynamic import to ensure ort is configured before piper loads
 */
async function loadTtsModule(): Promise<PiperTTS> {
  if (ttsModule) return ttsModule;
  if (moduleLoadPromise) return moduleLoadPromise;

  moduleLoadPromise = (async () => {
    console.log("[PiperTTS] Loading ONNX Runtime...");

    // First, configure ONNX Runtime
    // @ts-expect-error - onnxruntime-web types don't resolve with package.json exports
    const ort = await import("onnxruntime-web");

    // Use jsDelivr CDN which has all the WASM files (cdnjs returns 404)
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
    // Disable multi-threading to avoid SharedArrayBuffer/COOP/COEP issues
    ort.env.wasm.numThreads = 1;
    console.log("[PiperTTS] ONNX Runtime configured with jsDelivr CDN");

    // Now load piper-tts-web
    console.log("[PiperTTS] Loading piper-tts-web...");
    const tts = await import("@mintplex-labs/piper-tts-web");
    console.log("[PiperTTS] piper-tts-web loaded");

    ttsModule = tts as unknown as PiperTTS;
    return ttsModule;
  })();

  return moduleLoadPromise;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

class PiperTtsService {
  private downloadedVoices: Set<string> = new Set();
  private currentAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  /**
   * Initialize the service by checking which voices are already cached
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const tts = await loadTtsModule();
      const stored = await tts.stored();
      this.downloadedVoices = new Set(stored);
      this.isInitialized = true;
      console.log("[PiperTTS] Initialized, cached voices:", stored);
    } catch (error) {
      console.error("[PiperTTS] Failed to initialize:", error);
      // Continue anyway - voices will be downloaded on demand
      this.isInitialized = true;
    }
  }

  /**
   * Check if a voice is already downloaded and cached
   */
  isVoiceDownloaded(voiceId: string): boolean {
    return this.downloadedVoices.has(voiceId);
  }

  /**
   * Get list of cached voices
   */
  async getCachedVoices(): Promise<string[]> {
    try {
      const tts = await loadTtsModule();
      return await tts.stored();
    } catch {
      return [];
    }
  }

  /**
   * Download a voice model for offline use
   */
  async downloadVoice(
    voiceId: string,
    onProgress?: TTSProgressCallback
  ): Promise<void> {
    if (this.downloadedVoices.has(voiceId)) {
      onProgress?.({
        stage: "ready",
        loaded: 100,
        total: 100,
        percent: 100,
      });
      return;
    }

    const tts = await loadTtsModule();
    await tts.download(voiceId, (progress) => {
      onProgress?.({
        stage: "downloading",
        loaded: progress.loaded,
        total: progress.total,
        percent: Math.round((progress.loaded / progress.total) * 100),
      });
    });

    this.downloadedVoices.add(voiceId);
    onProgress?.({
      stage: "ready",
      loaded: 100,
      total: 100,
      percent: 100,
    });
  }

  /**
   * Synthesize speech from text
   * Returns an audio blob that can be played
   */
  async synthesize(
    text: string,
    voiceId: string = DEFAULT_VOICE.id,
    onProgress?: TTSProgressCallback
  ): Promise<Blob> {
    // Clean the text for speech
    const cleanedText = this.cleanTextForSpeech(text);

    console.log("[PiperTTS] Original text length:", text.length);
    console.log("[PiperTTS] Cleaned text:", cleanedText.slice(0, 200) + "...");
    console.log("[PiperTTS] Using voice:", voiceId);

    if (!cleanedText.trim()) {
      throw new Error("No text to synthesize after cleaning");
    }

    onProgress?.({
      stage: "synthesizing",
      loaded: 0,
      total: 100,
      percent: 0,
    });

    try {
      console.log("[PiperTTS] Starting synthesis...");
      const tts = await loadTtsModule();

      const audioBlob = await tts.predict(
        {
          text: cleanedText,
          voiceId: voiceId,
        },
        (progress) => {
          console.log("[PiperTTS] Download progress:", progress);
          // This callback is for download progress if model isn't cached
          if (!this.downloadedVoices.has(voiceId)) {
            onProgress?.({
              stage: "downloading",
              loaded: progress.loaded,
              total: progress.total,
              percent: Math.round((progress.loaded / progress.total) * 100),
            });
          }
        }
      );

      console.log("[PiperTTS] Synthesis complete, blob size:", audioBlob.size);
      console.log("[PiperTTS] Blob type:", audioBlob.type);

      if (audioBlob.size === 0) {
        throw new Error("Synthesized audio blob is empty");
      }

      // Mark voice as downloaded after successful synthesis
      this.downloadedVoices.add(voiceId);

      onProgress?.({
        stage: "ready",
        loaded: 100,
        total: 100,
        percent: 100,
      });

      return audioBlob;
    } catch (error) {
      console.error("[PiperTTS] Synthesis error:", error);
      throw error;
    }
  }

  /**
   * Synthesize text and return audio element (does NOT auto-play)
   * Caller should set up event handlers before calling play()
   */
  async speak(
    text: string,
    voiceId: string = DEFAULT_VOICE.id,
    onProgress?: TTSProgressCallback
  ): Promise<HTMLAudioElement> {
    console.log("[PiperTTS] speak() called");

    // Stop any currently playing audio
    this.stop();

    const audioBlob = await this.synthesize(text, voiceId, onProgress);

    // Ensure blob has correct MIME type for WAV audio
    const wavBlob = audioBlob.type === "audio/wav"
      ? audioBlob
      : new Blob([audioBlob], { type: "audio/wav" });

    const audioUrl = URL.createObjectURL(wavBlob);
    console.log("[PiperTTS] Created audio URL:", audioUrl);
    console.log("[PiperTTS] Blob MIME type:", wavBlob.type);

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = audioUrl;
    this.currentAudio = audio;

    // Log audio element state
    console.log("[PiperTTS] Audio element created, readyState:", audio.readyState);
    console.log("[PiperTTS] Audio src set to:", audio.src);

    // Store URL for cleanup
    const cleanup = () => {
      console.log("[PiperTTS] Cleanup called");
      URL.revokeObjectURL(audioUrl);
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    };

    // Add cleanup listeners (caller can override these)
    audio.addEventListener("ended", () => {
      console.log("[PiperTTS] Audio ended event");
      cleanup();
    });
    audio.addEventListener("error", (e) => {
      console.error("[PiperTTS] Audio error event:", e);
      cleanup();
    });

    // Add additional debug listeners
    audio.addEventListener("canplay", () => {
      console.log("[PiperTTS] Audio canplay event, duration:", audio.duration);
    });
    audio.addEventListener("loadedmetadata", () => {
      console.log("[PiperTTS] Audio loadedmetadata, duration:", audio.duration);
    });

    // Return audio element - caller must call play() after setting up handlers
    return audio;
  }

  /**
   * Stop current playback
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Pause current playback
   */
  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  /**
   * Resume current playback
   */
  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    }
  }

  /**
   * Get current audio element (for external control)
   */
  getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  /**
   * Remove a cached voice model
   */
  async removeVoice(voiceId: string): Promise<void> {
    const tts = await loadTtsModule();
    await tts.remove(voiceId);
    this.downloadedVoices.delete(voiceId);
  }

  /**
   * Remove all cached voice models
   */
  async clearCache(): Promise<void> {
    const tts = await loadTtsModule();
    await tts.flush();
    this.downloadedVoices.clear();
  }

  /**
   * Clean text for speech synthesis
   * Removes markdown, equations, and other non-readable content
   */
  private cleanTextForSpeech(text: string): string {
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
}

// Export singleton instance
export const piperTts = new PiperTtsService();

// Also export the class for testing
export { PiperTtsService };
