// =============================================================================
// PRE-GENERATED AUDIO PLAYER SERVICE
// Plays pre-generated MP3 files for textbook sections
// =============================================================================

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number; // 0 to 1
  duration: number; // seconds
  currentTime: number; // seconds
  error: string | null;
}

export type AudioPlayerCallback = (state: AudioPlayerState) => void;

class AudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private callbacks: Set<AudioPlayerCallback> = new Set();
  private state: AudioPlayerState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    progress: 0,
    duration: 0,
    currentTime: 0,
    error: null,
  };

  /**
   * Subscribe to state changes
   */
  subscribe(callback: AudioPlayerCallback): () => void {
    this.callbacks.add(callback);
    callback(this.state);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(updates: Partial<AudioPlayerState>) {
    this.state = { ...this.state, ...updates };
    this.callbacks.forEach((cb) => cb(this.state));
  }

  /**
   * Get the audio file URL for a section
   */
  getAudioUrl(bookSlug: string, chapterSlug: string, sectionSlug: string): string {
    return `/content/${bookSlug}/chapters/${chapterSlug}/${sectionSlug}.mp3`;
  }

  /**
   * Check if pre-generated audio exists for a section
   */
  async hasAudio(bookSlug: string, chapterSlug: string, sectionSlug: string): Promise<boolean> {
    const url = this.getAudioUrl(bookSlug, chapterSlug, sectionSlug);
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Load and play audio for a section
   */
  async play(bookSlug: string, chapterSlug: string, sectionSlug: string): Promise<void> {
    // Stop any current playback
    this.stop();

    const url = this.getAudioUrl(bookSlug, chapterSlug, sectionSlug);

    this.updateState({
      isLoading: true,
      error: null,
    });

    try {
      // Create new audio element
      this.audio = new Audio(url);

      // Set up event listeners
      this.audio.addEventListener("loadedmetadata", () => {
        this.updateState({
          duration: this.audio?.duration || 0,
          isLoading: false,
        });
      });

      this.audio.addEventListener("timeupdate", () => {
        if (this.audio) {
          const progress = this.audio.duration > 0
            ? this.audio.currentTime / this.audio.duration
            : 0;
          this.updateState({
            currentTime: this.audio.currentTime,
            progress,
          });
        }
      });

      this.audio.addEventListener("play", () => {
        this.updateState({
          isPlaying: true,
          isPaused: false,
          isLoading: false,
        });
      });

      this.audio.addEventListener("pause", () => {
        this.updateState({
          isPaused: true,
        });
      });

      this.audio.addEventListener("ended", () => {
        this.updateState({
          isPlaying: false,
          isPaused: false,
          progress: 1,
        });
      });

      this.audio.addEventListener("error", () => {
        const errorMessage = this.audio?.error?.message || "Villa við að hlaða hljóðskrá";
        this.updateState({
          isLoading: false,
          isPlaying: false,
          error: errorMessage,
        });
      });

      // Start playing
      await this.audio.play();
    } catch (error) {
      this.updateState({
        isLoading: false,
        isPlaying: false,
        error: error instanceof Error ? error.message : "Villa við afspilun",
      });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play().catch(console.error);
    }
  }

  /**
   * Stop playback completely
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";
      this.audio = null;
    }
    this.updateState({
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      error: null,
    });
  }

  /**
   * Seek to a specific position (0-1)
   */
  seek(position: number): void {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = position * this.audio.duration;
    }
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.5, Math.min(2, rate));
    }
  }

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return this.audio?.playbackRate || 1;
  }

  /**
   * Get current state
   */
  getState(): AudioPlayerState {
    return this.state;
  }
}

// Export singleton instance
export const audioPlayer = new AudioPlayerService();
