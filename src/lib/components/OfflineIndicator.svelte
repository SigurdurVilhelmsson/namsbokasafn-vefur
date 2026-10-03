<!--
  Offline Indicator
  Shows a small banner when the user is offline (no network connection)
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { browser } from '$app/environment';

  let isOnline = $state(true);
  let showBanner = $state(false);
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
        <Icon name="circle-check" size="sm" />
        <span>Aftur á netinu</span>
      {:else}
        <Icon name="wifi-off" size="sm" />
        <span>Án nettengingar - efni lesið úr skyndiminni</span>
      {/if}
      <button
        onclick={dismissBanner}
        class="dismiss-btn"
        aria-label="Loka"
      >
        <Icon name="x" size="sm" />
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

  :global(.dark) .offline-indicator.offline {
    background: rgba(217, 119, 6, 0.2);
    border-bottom-color: rgba(252, 211, 77, 0.3);
    color: #fcd34d;
  }

  :global(.dark) .offline-indicator.online {
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


  .offline .dismiss-btn {
    color: #92400e;
  }

  .online .dismiss-btn {
    color: #166534;
  }

  :global(.dark) .offline .dismiss-btn {
    color: #fcd34d;
  }

  :global(.dark) .online .dismiss-btn {
    color: #86efac;
  }
</style>
