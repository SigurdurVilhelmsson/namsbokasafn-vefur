<!--
  Flashcard Study Component - SvelteKit PoC

  Compare to React version (FlashcardStudySession.tsx):
  - React: ~400 lines with useState, useCallback, useEffect, memoization
  - Svelte: ~200 lines with reactive stores, built-in transitions

  Key benefits:
  1. Store subscription is automatic ($store syntax)
  2. Built-in flip animation with CSS transitions
  3. No need for useCallback - functions are just functions
  4. Derived stores for computed values (currentCard, progress)
-->
<script lang="ts">
  import { flashcardStore, currentCard, studyProgress } from '$lib/stores/flashcard';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { DifficultyRating } from '$lib/types/flashcard';
  import { playFlipSound, playSuccessSound, playEasySound, playAgainSound, playCompletionSound } from '$lib/utils/sounds';

  export let deckId: string = 'sample';

  let isFlipped = false;

  onMount(() => {
    flashcardStore.startStudySession(deckId);
  });

  function handleFlip() {
    isFlipped = !isFlipped;
    playFlipSound();
  }

  function handleRate(rating: DifficultyRating) {
    if ($currentCard) {
      // Play appropriate sound based on rating
      if (rating === 'again') {
        playAgainSound();
      } else if (rating === 'easy') {
        playEasySound();
      } else {
        playSuccessSound();
      }

      flashcardStore.rateCard($currentCard.id, rating);
      isFlipped = false;

      // Check if this completes the session
      setTimeout(() => {
        if ($studyProgress.isComplete) {
          playCompletionSound();
        }
      }, 100);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleFlip();
    }
    if (isFlipped) {
      if (event.key === '1') handleRate('again');
      if (event.key === '2') handleRate('hard');
      if (event.key === '3') handleRate('good');
      if (event.key === '4') handleRate('easy');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flashcard-study">
  <div class="study-header">
    <h2>Minniskort</h2>
    <div class="progress-indicator">
      <span class="progress-text">
        {$studyProgress.current} / {$studyProgress.total}
      </span>
      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width: {($studyProgress.current / Math.max($studyProgress.total, 1)) * 100}%"
        ></div>
      </div>
    </div>
  </div>

  {#if $studyProgress.isComplete}
    <div class="complete-message" in:fade>
      <div class="complete-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3>Vel gert!</h3>
      <p>Þú hefur lokið öllum kortum fyrir daginn.</p>
      <button class="btn btn-primary" on:click={() => flashcardStore.startStudySession(deckId)}>
        Æfa aftur
      </button>
    </div>
  {:else if $currentCard}
    <div
      class="flashcard"
      class:flipped={isFlipped}
      on:click={handleFlip}
      on:keydown={handleKeydown}
      role="button"
      tabindex="0"
      aria-label={isFlipped ? 'Svar' : 'Spurning'}
    >
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <p>{$currentCard.front}</p>
          <span class="hint">Smelltu til að snúa</span>
        </div>
        <div class="flashcard-back">
          <p>{$currentCard.back}</p>
        </div>
      </div>
    </div>

    {#if isFlipped}
      <div class="rating-buttons" in:fade={{ duration: 200 }}>
        <button class="btn btn-again" on:click={() => handleRate('again')}>
          <span class="key">1</span>
          Aftur
        </button>
        <button class="btn btn-hard" on:click={() => handleRate('hard')}>
          <span class="key">2</span>
          Erfitt
        </button>
        <button class="btn btn-good" on:click={() => handleRate('good')}>
          <span class="key">3</span>
          Gott
        </button>
        <button class="btn btn-easy" on:click={() => handleRate('easy')}>
          <span class="key">4</span>
          Auðvelt
        </button>
      </div>
    {/if}
  {:else}
    <div class="no-cards">
      <p>Engin kort til að æfa.</p>
    </div>
  {/if}

  <div class="keyboard-hint">
    <p>
      <kbd>Space</kbd> snúa korti •
      <kbd>1-4</kbd> gefa einkunn
    </p>
  </div>
</div>

<style>
  .flashcard-study {
    max-width: 32rem;
    margin: 0 auto;
  }

  .study-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .study-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .progress-indicator {
    text-align: right;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .progress-bar {
    width: 8rem;
    height: 0.5rem;
    background-color: #e5e7eb;
    border-radius: 9999px;
    overflow: hidden;
    margin-top: 0.25rem;
  }

  :global(.dark) .progress-bar {
    background-color: #374151;
  }

  .progress-fill {
    height: 100%;
    background-color: var(--accent-color);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }

  /* Flashcard */
  .flashcard {
    perspective: 1000px;
    cursor: pointer;
    height: 16rem;
    margin-bottom: 1.5rem;
  }

  .flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s;
    transform-style: preserve-3d;
  }

  .flashcard.flipped .flashcard-inner {
    transform: rotateY(180deg);
  }

  .flashcard-front,
  .flashcard-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    border-radius: 0.75rem;
    text-align: center;
  }

  .flashcard-front {
    background: linear-gradient(135deg, #e8f5f1, #d1fae5);
    border: 1px solid #a7f3d0;
  }

  :global(.dark) .flashcard-front {
    background: linear-gradient(135deg, #1e3a32, #14532d);
    border-color: #166534;
  }

  .flashcard-back {
    background: linear-gradient(135deg, #dbeafe, #e0e7ff);
    border: 1px solid #bfdbfe;
    transform: rotateY(180deg);
  }

  :global(.dark) .flashcard-back {
    background: linear-gradient(135deg, #1e3a5f, #312e81);
    border-color: #3b82f6;
  }

  .flashcard-front p,
  .flashcard-back p {
    font-size: 1.25rem;
    color: var(--text-primary);
    line-height: 1.5;
    margin: 0;
  }

  .hint {
    position: absolute;
    bottom: 1rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  /* Rating buttons */
  .rating-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .key {
    font-size: 0.625rem;
    opacity: 0.7;
    font-family: monospace;
  }

  .btn-again {
    background: #fee2e2;
    color: #991b1b;
  }

  .btn-again:hover {
    background: #fecaca;
  }

  .btn-hard {
    background: #fef3c7;
    color: #92400e;
  }

  .btn-hard:hover {
    background: #fde68a;
  }

  .btn-good {
    background: #d1fae5;
    color: #065f46;
  }

  .btn-good:hover {
    background: #a7f3d0;
  }

  .btn-easy {
    background: #dbeafe;
    color: #1e40af;
  }

  .btn-easy:hover {
    background: #bfdbfe;
  }

  /* Complete message */
  .complete-message {
    text-align: center;
    padding: 3rem 2rem;
    background: var(--bg-secondary);
    border-radius: 0.75rem;
    border: 1px solid var(--border-color);
  }

  .complete-icon {
    width: 4rem;
    height: 4rem;
    margin: 0 auto 1rem;
    color: #10b981;
  }

  .complete-message h3 {
    font-size: 1.5rem;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .complete-message p {
    color: var(--text-secondary);
    margin: 0 0 1.5rem;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
    padding: 0.75rem 1.5rem;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  /* Keyboard hint */
  .keyboard-hint {
    margin-top: 1.5rem;
    text-align: center;
  }

  .keyboard-hint p {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .keyboard-hint kbd {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    font-family: monospace;
    font-size: 0.6875rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
  }

  .no-cards {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }
</style>
