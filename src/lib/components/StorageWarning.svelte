<!--
  Storage Warning Banner
  Shows when localStorage is nearly full or quota has been exceeded.
-->
<script lang="ts">
  import { storageWarning, dismissStorageWarning, getStorageUsageBytes } from '$lib/utils/localStorage';

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  $: usageText = $storageWarning.visible ? formatBytes(getStorageUsageBytes()) : '';
</script>

{#if $storageWarning.visible}
  <div
    class="storage-warning"
    role="alert"
    aria-live="assertive"
  >
    <div class="warning-content">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {#if $storageWarning.quotaExceeded}
        <span>Gagnageymsla er full ({usageText}) — breytingar vistast ekki. Eyddu gömlu efni í stillingum.</span>
      {:else}
        <span>Gagnageymsla er næstum full ({usageText}). Íhugaðu að eyða gömlu efni.</span>
      {/if}
      <button
        on:click={dismissStorageWarning}
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
  .storage-warning {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    background: #fef3c7;
    border-bottom: 1px solid #fcd34d;
    color: #92400e;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }

  :global(.dark) .storage-warning {
    background: rgba(217, 119, 6, 0.2);
    border-bottom-color: rgba(252, 211, 77, 0.3);
    color: #fcd34d;
  }

  .warning-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    max-width: 48rem;
    margin: 0 auto;
  }

  .warning-content > svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .warning-content > span {
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
    color: #92400e;
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

  :global(.dark) .dismiss-btn {
    color: #fcd34d;
  }
</style>
