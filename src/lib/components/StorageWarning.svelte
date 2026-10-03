<!--
  Storage Warning Banner
  Shows when localStorage is nearly full or quota has been exceeded.
-->
<script lang="ts">
  import { storageWarning, dismissStorageWarning, getStorageUsageBytes } from '$lib/utils/localStorage';
  import Icon from '$lib/components/Icon.svelte';

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  let usageText = $derived($storageWarning.visible ? formatBytes(getStorageUsageBytes()) : '');
</script>

{#if $storageWarning.visible}
  <div
    class="storage-warning"
    role="alert"
    aria-live="assertive"
  >
    <div class="warning-content">
      <Icon name="triangle-alert" size="sm" />
      {#if $storageWarning.quotaExceeded}
        <span>Gagnageymsla er full ({usageText}) — breytingar vistast ekki. Eyddu gömlu efni í stillingum.</span>
      {:else}
        <span>Gagnageymsla er næstum full ({usageText}). Íhugaðu að eyða gömlu efni.</span>
      {/if}
      <button
        onclick={dismissStorageWarning}
        class="dismiss-btn"
        aria-label="Loka"
      >
        <Icon name="x" size="sm" />
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


  :global(.dark) .dismiss-btn {
    color: #fcd34d;
  }
</style>
