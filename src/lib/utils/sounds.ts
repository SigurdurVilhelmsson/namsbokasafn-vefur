/**
 * Sound effects utility for study interactions
 * Uses Web Audio API for lightweight, dependency-free sounds
 */

import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { soundEffects } from '$lib/stores/settings';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (!browser) return null;

	if (!audioContext) {
		try {
			audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
		} catch (e) {
			console.warn('Web Audio API not supported');
			return null;
		}
	}
	return audioContext;
}

/**
 * Play a simple tone
 */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3): void {
	if (!get(soundEffects)) return;

	const ctx = getAudioContext();
	if (!ctx) return;

	// Resume audio context if suspended (required after user interaction)
	if (ctx.state === 'suspended') {
		ctx.resume();
	}

	const oscillator = ctx.createOscillator();
	const gainNode = ctx.createGain();

	oscillator.connect(gainNode);
	gainNode.connect(ctx.destination);

	oscillator.frequency.value = frequency;
	oscillator.type = type;

	// Fade in and out for smooth sound
	const now = ctx.currentTime;
	gainNode.gain.setValueAtTime(0, now);
	gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
	gainNode.gain.linearRampToValueAtTime(0, now + duration);

	oscillator.start(now);
	oscillator.stop(now + duration);
}

/**
 * Play a success sound (for correct answers, completed sections, etc.)
 */
export function playSuccessSound(): void {
	// Two-tone ascending melody
	playTone(523.25, 0.1, 'sine', 0.2); // C5
	setTimeout(() => playTone(659.25, 0.15, 'sine', 0.25), 80); // E5
}

/**
 * Play a completion sound (for finishing a study session, etc.)
 */
export function playCompletionSound(): void {
	// Three-tone fanfare
	playTone(523.25, 0.12, 'sine', 0.2); // C5
	setTimeout(() => playTone(659.25, 0.12, 'sine', 0.22), 100); // E5
	setTimeout(() => playTone(783.99, 0.2, 'sine', 0.25), 200); // G5
}

/**
 * Play a flip sound (for flashcard flips)
 */
export function playFlipSound(): void {
	// Quick soft click
	playTone(800, 0.03, 'triangle', 0.1);
}

/**
 * Play an "again" sound (for incorrect/hard rating)
 */
export function playAgainSound(): void {
	// Descending tone
	playTone(400, 0.15, 'sine', 0.15);
}

/**
 * Play an "easy" sound (for easy rating)
 */
export function playEasySound(): void {
	// Quick ascending arpeggio
	playTone(523.25, 0.08, 'sine', 0.15); // C5
	setTimeout(() => playTone(659.25, 0.08, 'sine', 0.18), 50); // E5
	setTimeout(() => playTone(783.99, 0.12, 'sine', 0.2), 100); // G5
}
