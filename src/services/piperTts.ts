// =============================================================================
// PIPER TTS SERVICE
// Icelandic text-to-speech using Piper TTS models via WebAssembly
// =============================================================================

import * as tts from "@mintplex-labs/piper-tts-web";

// Configure ONNX Runtime to use jsDelivr CDN for WASM files
// This fixes the 404 error from cdnjs which doesn't have the right files
// Access ort through window since it's a global from the bundled library
declare global {
  interface Window {
    ort?: {
      env: {
        wasm: {
          wasmPaths: string | Record<string, string>;
          numThreads: number;
        };
      };
    };
  }
}

// Configure WASM paths before any TTS operations
function configureOnnxRuntime() {
  // onnxruntime-web exposes 'ort' as a global or we can import it
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ort = require("onnxruntime-web");

  if (ort?.env?.wasm) {
    // Use jsDelivr CDN which has all the WASM files
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
    // Disable multi-threading to avoid SharedArrayBuffer issues
    ort.env.wasm.numThreads = 1;
    console.log("[PiperTTS] Configured ONNX Runtime WASM paths");
  }
}

// Run configuration immediately
try {
  configureOnnxRuntime();
} catch (e) {
  console.warn("[PiperTTS] Could not configure ONNX Runtime:", e);
}

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
      const stored = await tts.stored();
      this.downloadedVoices = new Set(stored);
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize Piper TTS:", error);
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
      const audioBlob = await tts.predict(
        {
          text: cleanedText,
          voiceId: voiceId as tts.VoiceId,
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
    await tts.remove(voiceId);
    this.downloadedVoices.delete(voiceId);
  }

  /**
   * Remove all cached voice models
   */
  async clearCache(): Promise<void> {
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
