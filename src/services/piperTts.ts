// =============================================================================
// WEB SPEECH TTS SERVICE
// Icelandic text-to-speech using browser's Web Speech API
// Falls back gracefully if no Icelandic voices are available
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

/**
 * Preferred Icelandic voices (will match against available browser voices)
 */
export const ICELANDIC_VOICES: IcelandicVoice[] = [
  {
    id: "is-IS-GudrunNeural",
    name: "Guðrún",
    gender: "female",
    description: "Kvenrödd - Guðrún",
  },
  {
    id: "is-IS-GunnarNeural",
    name: "Gunnar",
    gender: "male",
    description: "Karlrödd - Gunnar",
  },
  {
    id: "is-IS",
    name: "Íslenska",
    gender: "female",
    description: "Sjálfgefin íslensk rödd",
  },
];

export const DEFAULT_VOICE = ICELANDIC_VOICES[0];

// =============================================================================
// SERVICE CLASS
// =============================================================================

class WebSpeechTtsService {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  /**
   * Initialize the service and load available voices
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("[WebSpeechTTS] Speech synthesis not supported");
      this.isInitialized = true;
      return;
    }

    this.synthesis = window.speechSynthesis;

    // Load voices (may be async in some browsers)
    await this.loadVoices();
    this.isInitialized = true;

    console.log("[WebSpeechTTS] Initialized with voices:", this.availableVoices.length);
  }

  /**
   * Load available voices from the browser
   */
  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      const loadVoiceList = () => {
        this.availableVoices = this.synthesis!.getVoices();

        // Find best Icelandic voice
        const icelandicVoice = this.availableVoices.find(
          (v) => v.lang.startsWith("is") || v.lang === "is-IS"
        );

        if (icelandicVoice) {
          this.selectedVoice = icelandicVoice;
          console.log("[WebSpeechTTS] Found Icelandic voice:", icelandicVoice.name);
        } else {
          // Fall back to first available voice
          this.selectedVoice = this.availableVoices[0] || null;
          console.log("[WebSpeechTTS] No Icelandic voice, using:", this.selectedVoice?.name);
        }
      };

      // Voices may load asynchronously
      if (this.synthesis.getVoices().length > 0) {
        loadVoiceList();
        resolve();
      } else {
        this.synthesis.addEventListener("voiceschanged", () => {
          loadVoiceList();
          resolve();
        }, { once: true });

        // Timeout fallback
        setTimeout(() => {
          loadVoiceList();
          resolve();
        }, 1000);
      }
    });
  }

  /**
   * Check if a voice is available
   */
  isVoiceDownloaded(_voiceId: string): boolean {
    return this.availableVoices.length > 0;
  }

  /**
   * Get list of available voices
   */
  async getCachedVoices(): Promise<string[]> {
    return this.availableVoices
      .filter((v) => v.lang.startsWith("is"))
      .map((v) => v.name);
  }

  /**
   * Download a voice (no-op for Web Speech API)
   */
  async downloadVoice(
    _voiceId: string,
    onProgress?: TTSProgressCallback
  ): Promise<void> {
    onProgress?.({
      stage: "ready",
      loaded: 100,
      total: 100,
      percent: 100,
    });
  }

  /**
   * Synthesize speech - Web Speech API doesn't return blobs
   * This is kept for interface compatibility but throws
   */
  async synthesize(
    _text: string,
    _voiceId: string = DEFAULT_VOICE.id,
    _onProgress?: TTSProgressCallback
  ): Promise<Blob> {
    throw new Error("Web Speech API does not support blob synthesis. Use speak() instead.");
  }

  /**
   * Speak text using Web Speech API
   * Returns a fake audio element for interface compatibility
   */
  async speak(
    text: string,
    _voiceId: string = DEFAULT_VOICE.id,
    onProgress?: TTSProgressCallback
  ): Promise<HTMLAudioElement> {
    console.log("[WebSpeechTTS] speak() called");

    if (!this.synthesis) {
      throw new Error("Speech synthesis not available");
    }

    // Stop any current speech
    this.stop();

    // Clean the text
    const cleanedText = this.cleanTextForSpeech(text);
    console.log("[WebSpeechTTS] Cleaned text length:", cleanedText.length);

    if (!cleanedText.trim()) {
      throw new Error("No text to synthesize after cleaning");
    }

    onProgress?.({
      stage: "synthesizing",
      loaded: 50,
      total: 100,
      percent: 50,
    });

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.lang = "is-IS";
    utterance.rate = 1;
    utterance.pitch = 1;

    this.currentUtterance = utterance;

    // Create a fake audio element to maintain interface compatibility
    const fakeAudio = document.createElement("audio");

    // Set up utterance events
    utterance.onstart = () => {
      console.log("[WebSpeechTTS] Speech started");
      fakeAudio.dispatchEvent(new Event("play"));
    };

    utterance.onend = () => {
      console.log("[WebSpeechTTS] Speech ended");
      fakeAudio.dispatchEvent(new Event("ended"));
      this.currentUtterance = null;
    };

    utterance.onerror = (event) => {
      console.error("[WebSpeechTTS] Speech error:", event.error);
      fakeAudio.dispatchEvent(new Event("error"));
      this.currentUtterance = null;
    };

    utterance.onpause = () => {
      fakeAudio.dispatchEvent(new Event("pause"));
    };

    utterance.onresume = () => {
      fakeAudio.dispatchEvent(new Event("play"));
    };

    // Override audio element methods
    fakeAudio.play = async () => {
      if (this.synthesis && this.currentUtterance) {
        this.synthesis.speak(this.currentUtterance);
      }
    };

    fakeAudio.pause = () => {
      this.pause();
    };

    onProgress?.({
      stage: "ready",
      loaded: 100,
      total: 100,
      percent: 100,
    });

    // Auto-start speaking
    this.synthesis.speak(utterance);

    return fakeAudio;
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume current speech
   */
  resume(): void {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  /**
   * Get current audio element (not applicable for Web Speech)
   */
  getCurrentAudio(): HTMLAudioElement | null {
    return null;
  }

  /**
   * Remove a cached voice (no-op)
   */
  async removeVoice(_voiceId: string): Promise<void> {
    // No-op
  }

  /**
   * Clear cache (no-op)
   */
  async clearCache(): Promise<void> {
    // No-op
  }

  /**
   * Clean text for speech synthesis
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
export const piperTts = new WebSpeechTtsService();

// Also export the class for testing
export { WebSpeechTtsService as PiperTtsService };
