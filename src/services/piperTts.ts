// =============================================================================
// TIRO TTS SERVICE
// Icelandic text-to-speech using Tiro.is TTS API
// https://tts.tiro.is - Icelandic Language Technology Programme
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

// =============================================================================
// CONSTANTS
// =============================================================================

// TTS API endpoint - use proxy in production to avoid CORS issues
// Set VITE_TTS_PROXY_URL to your Cloudflare Worker URL
const TTS_API_URL =
  import.meta.env.VITE_TTS_PROXY_URL || "https://tts.tiro.is/v0/speech";

/**
 * Available Icelandic voices from Tiro TTS
 * Developed by Reykjavík University Language and Voice Lab
 */
export const ICELANDIC_VOICES: IcelandicVoice[] = [
  {
    id: "Alfur",
    name: "Álfur",
    gender: "male",
    description: "Karlrödd - Álfur",
  },
  {
    id: "Dilja",
    name: "Diljá",
    gender: "female",
    description: "Kvenrödd - Diljá",
  },
  {
    id: "Bjartur",
    name: "Bjartur",
    gender: "male",
    description: "Karlrödd - Bjartur",
  },
  {
    id: "Rosa",
    name: "Rósa",
    gender: "female",
    description: "Kvenrödd - Rósa",
  },
];

export const DEFAULT_VOICE = ICELANDIC_VOICES[0]; // Álfur

// =============================================================================
// SERVICE CLASS
// =============================================================================

class TiroTtsService {
  private currentAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  /**
   * Initialize the service (no-op for Tiro API, kept for interface compatibility)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log("[TiroTTS] Initialized - using Tiro.is API");
  }

  /**
   * Check if a voice is available (all voices are always available with API)
   */
  isVoiceDownloaded(_voiceId: string): boolean {
    return true; // API-based, no local download needed
  }

  /**
   * Get list of available voices
   */
  async getCachedVoices(): Promise<string[]> {
    return ICELANDIC_VOICES.map((v) => v.id);
  }

  /**
   * Download a voice model (no-op for API-based TTS)
   */
  async downloadVoice(
    _voiceId: string,
    onProgress?: TTSProgressCallback
  ): Promise<void> {
    // API-based, no download needed
    onProgress?.({
      stage: "ready",
      loaded: 100,
      total: 100,
      percent: 100,
    });
  }

  /**
   * Synthesize speech from text using Tiro.is API
   * Returns an audio blob that can be played
   */
  async synthesize(
    text: string,
    voiceId: string = DEFAULT_VOICE.id,
    onProgress?: TTSProgressCallback
  ): Promise<Blob> {
    // Clean the text for speech
    const cleanedText = this.cleanTextForSpeech(text);

    console.log("[TiroTTS] Original text length:", text.length);
    console.log("[TiroTTS] Cleaned text:", cleanedText.slice(0, 200) + "...");
    console.log("[TiroTTS] Using voice:", voiceId);

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
      console.log("[TiroTTS] Calling TTS API:", TTS_API_URL);

      const response = await fetch(TTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg", // Request MP3 format
        },
        body: JSON.stringify({
          Engine: "standard",
          LanguageCode: "is-IS",
          OutputFormat: "mp3",
          SampleRate: "22050",
          Text: cleanedText,
          TextType: "text",
          VoiceId: voiceId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[TiroTTS] API error:", response.status, errorText);
        throw new Error(`Tiro TTS API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log("[TiroTTS] Synthesis complete, blob size:", audioBlob.size);
      console.log("[TiroTTS] Blob type:", audioBlob.type);

      if (audioBlob.size === 0) {
        throw new Error("Synthesized audio blob is empty");
      }

      onProgress?.({
        stage: "ready",
        loaded: 100,
        total: 100,
        percent: 100,
      });

      return audioBlob;
    } catch (error) {
      console.error("[TiroTTS] Synthesis error:", error);
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
    console.log("[TiroTTS] speak() called");

    // Stop any currently playing audio
    this.stop();

    const audioBlob = await this.synthesize(text, voiceId, onProgress);

    // Create audio element with the blob
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log("[TiroTTS] Created audio URL:", audioUrl);
    console.log("[TiroTTS] Blob MIME type:", audioBlob.type);

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = audioUrl;
    this.currentAudio = audio;

    // Log audio element state
    console.log("[TiroTTS] Audio element created, readyState:", audio.readyState);

    // Store URL for cleanup
    const cleanup = () => {
      console.log("[TiroTTS] Cleanup called");
      URL.revokeObjectURL(audioUrl);
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    };

    // Add cleanup listeners (caller can override these)
    audio.addEventListener("ended", () => {
      console.log("[TiroTTS] Audio ended event");
      cleanup();
    });
    audio.addEventListener("error", (e) => {
      console.error("[TiroTTS] Audio error event:", e);
      cleanup();
    });

    // Add additional debug listeners
    audio.addEventListener("canplay", () => {
      console.log("[TiroTTS] Audio canplay event, duration:", audio.duration);
    });
    audio.addEventListener("loadedmetadata", () => {
      console.log("[TiroTTS] Audio loadedmetadata, duration:", audio.duration);
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
   * Remove a cached voice model (no-op for API-based TTS)
   */
  async removeVoice(_voiceId: string): Promise<void> {
    // No-op for API-based TTS
  }

  /**
   * Remove all cached voice models (no-op for API-based TTS)
   */
  async clearCache(): Promise<void> {
    // No-op for API-based TTS
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

// Export singleton instance (keeping name for backward compatibility)
export const piperTts = new TiroTtsService();

// Also export the class for testing
export { TiroTtsService as PiperTtsService };
