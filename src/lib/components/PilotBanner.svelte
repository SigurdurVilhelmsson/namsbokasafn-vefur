<!--
  Pilot Status Banner
  Shows translation status (reviewed vs MT) for pilot content
-->
<script lang="ts">
  export let showFeedbackLink: boolean = true;

  // All chapters show as MT-preview while pipeline bugfixes are in progress
  // Restore to `chapterNumber === 1` (or a list) when faithful version is ready
  let isReviewed = false;
  $: statusText = isReviewed ? 'Yfirfarið' : 'Vélþýtt';
  $: statusDescription = isReviewed
    ? 'Þessi kafli hefur verið yfirfarinn af fagaðila.'
    : 'Þessi kafli er vélþýddur og hefur ekki verið yfirfarinn.';
</script>

<div class="pilot-banner" class:reviewed={isReviewed} class:mt={!isReviewed}>
  <div class="banner-content">
    <div class="status-info">
      <span class="status-badge">
        {#if isReviewed}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        {/if}
        {statusText}
      </span>
      <span class="status-desc">{statusDescription}</span>
    </div>
    {#if showFeedbackLink}
      <a href="/feedback" class="feedback-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Fann villu?</span>
      </a>
    {/if}
  </div>
</div>

<style>
  .pilot-banner {
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .pilot-banner.reviewed {
    background: #dcfce7;
    border: 1px solid #86efac;
  }

  .pilot-banner.mt {
    background: #fef3c7;
    border: 1px solid #fcd34d;
  }

  :global(.dark) .pilot-banner.reviewed {
    background: rgba(22, 163, 74, 0.15);
    border-color: rgba(134, 239, 172, 0.3);
  }

  :global(.dark) .pilot-banner.mt {
    background: rgba(217, 119, 6, 0.15);
    border-color: rgba(252, 211, 77, 0.3);
  }

  .banner-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .status-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .reviewed .status-badge {
    color: #166534;
  }

  .mt .status-badge {
    color: #92400e;
  }

  :global(.dark) .reviewed .status-badge {
    color: #86efac;
  }

  :global(.dark) .mt .status-badge {
    color: #fcd34d;
  }

  .status-badge svg {
    width: 1rem;
    height: 1rem;
  }

  .status-desc {
    color: #374151;
  }

  :global(.dark) .status-desc {
    color: #d1d5db;
  }

  .feedback-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    transition: background-color 0.15s;
    white-space: nowrap;
  }

  .reviewed .feedback-link {
    color: #166534;
    background: rgba(22, 163, 74, 0.1);
  }

  .reviewed .feedback-link:hover {
    background: rgba(22, 163, 74, 0.2);
  }

  .mt .feedback-link {
    color: #92400e;
    background: rgba(217, 119, 6, 0.1);
  }

  .mt .feedback-link:hover {
    background: rgba(217, 119, 6, 0.2);
  }

  :global(.dark) .reviewed .feedback-link {
    color: #86efac;
    background: rgba(134, 239, 172, 0.1);
  }

  :global(.dark) .reviewed .feedback-link:hover {
    background: rgba(134, 239, 172, 0.2);
  }

  :global(.dark) .mt .feedback-link {
    color: #fcd34d;
    background: rgba(252, 211, 77, 0.1);
  }

  :global(.dark) .mt .feedback-link:hover {
    background: rgba(252, 211, 77, 0.2);
  }

  .feedback-link svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  @media (max-width: 480px) {
    .banner-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .feedback-link {
      margin-top: 0.25rem;
    }
  }
</style>
