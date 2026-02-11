<!--
  Offline Indicator
  Shows a small banner when the user is offline (no network connection)
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let isOnline = true;
  let showBanner = false;
  let dismissTimeout: ReturnType<typeof setTimeout>;

  function handleOnline() {
    isOnline = true;
    // Show "back online" briefly then hide
    showBanner = true;
    clearTimeout(dismissTimeout);
    dismissTimeout = setTimeout(() => {
      showBanner = false;
    }, 3000);
  }

  function handleOffline() {
    isOnline = false;
    showBanner = true;
  }

  onMount(() => {
    if (!browser) return;

    // Check initial state
    isOnline = navigator.onLine;
    showBanner = !isOnline;

    // Listen for changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });

  onDestroy(() => {
    if (!browser) return;
    clearTimeout(dismissTimeout);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  function dismissBanner() {
    showBanner = false;
  }
</script>

{#if showBanner}
  <div
    class="offline-indicator"
    class:offline={!isOnline}
    class:online={isOnline}
    role="status"
    aria-live="polite"
  >
    <div class="indicator-content">
      {#if isOnline}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>Aftur á netinu</span>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span>Án nettengingar - efni lesið úr skyndiminni</span>
      {/if}
      <button
        on:click={dismissBanner}
        class="dismiss-btn"
        aria-label="Loka"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .offline-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .offline-indicator.offline {
    background: #fef3c7;
    border-bottom: 1px solid #fcd34d;
    color: #92400e;
  }

  .offline-indicator.online {
    background: #dcfce7;
    border-bottom: 1px solid #86efac;
    color: #166534;
  }

  :global([data-theme="dark"]) .offline-indicator.offline {
    background: rgba(217, 119, 6, 0.2);
    border-bottom-color: rgba(252, 211, 77, 0.3);
    color: #fcd34d;
  }

  :global([data-theme="dark"]) .offline-indicator.online {
    background: rgba(22, 163, 74, 0.2);
    border-bottom-color: rgba(134, 239, 172, 0.3);
    color: #86efac;
  }

  .indicator-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    max-width: 48rem;
    margin: 0 auto;
  }

  .indicator-content > svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .indicator-content > span {
    font-weight: 500;
  }

  .dismiss-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin-left: auto;
    border: none;
    background: transparent;
    border-radius: 0.25rem;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .dismiss-btn:hover {
    opacity: 1;
  }

  .dismiss-btn svg {
    width: 1rem;
    height: 1rem;
  }

  .offline .dismiss-btn {
    color: #92400e;
  }

  .online .dismiss-btn {
    color: #166534;
  }

  :global([data-theme="dark"]) .offline .dismiss-btn {
    color: #fcd34d;
  }

  :global([data-theme="dark"]) .online .dismiss-btn {
    color: #86efac;
  }
</style>
