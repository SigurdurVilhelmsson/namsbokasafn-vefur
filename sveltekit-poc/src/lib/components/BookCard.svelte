<!--
  BookCard Component - SvelteKit PoC

  Compare to React version (BookCard.tsx):
  - React: ~125 lines with sub-components, conditional rendering
  - Svelte: ~100 lines, cleaner template syntax, scoped styles

  Key differences:
  1. No need for className string concatenation - use class: directive
  2. Scoped CSS by default - no CSS-in-JS or module imports
  3. Cleaner conditional rendering with {#if}
-->
<script lang="ts">
  import type { BookConfig } from '$lib/types/book';

  export let book: BookConfig;

  $: isClickable = book.status === 'available' || book.status === 'in-progress';
  $: percentage = book.stats
    ? Math.round((book.stats.translatedChapters / book.stats.totalChapters) * 100)
    : 0;

  const statusLabels = {
    'available': 'Í boði',
    'in-progress': 'Í vinnslu',
    'coming-soon': 'Væntanlegt'
  };
</script>

<article class="book-card" class:clickable={isClickable}>
  {#if isClickable}
    <a href="/{book.slug}" class="book-card-link">
      <div class="cover">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
        <span class="badge badge-{book.status}">{statusLabels[book.status]}</span>
      </div>

      <div class="content">
        <h3 class="title">{book.title}</h3>
        <p class="subtitle">{book.subtitle}</p>
        <p class="description">{book.description}</p>

        {#if book.stats}
          <div class="progress">
            <div class="progress-info">
              <span>{book.stats.translatedChapters} af {book.stats.totalChapters} köflum</span>
              <span>{percentage}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {percentage}%"></div>
            </div>
          </div>
        {/if}

        <div class="source">
          <p>Byggt á: {book.source.title}</p>
          <p>{book.source.publisher} • {book.source.license}</p>
        </div>
      </div>
    </a>
  {:else}
    <div class="book-card-wrapper">
      <div class="cover">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
        <span class="badge badge-{book.status}">{statusLabels[book.status]}</span>
      </div>
      <div class="content">
        <h3 class="title">{book.title}</h3>
        <p class="subtitle">{book.subtitle}</p>
        <p class="description">{book.description}</p>
      </div>
    </div>
  {/if}
</article>

<style>
  .book-card {
    background-color: var(--bg-secondary);
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color);
    overflow: hidden;
    transition: all 0.2s ease;
    height: 100%;
  }

  .book-card.clickable:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-color: var(--accent-color);
  }

  .book-card-link,
  .book-card-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    text-decoration: none;
    color: inherit;
  }

  .cover {
    position: relative;
    aspect-ratio: 3 / 4;
    background: linear-gradient(135deg, var(--accent-light), var(--accent-color));
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon {
    width: 4rem;
    height: 4rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .cover .badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
  }

  .badge-available {
    background-color: #dcfce7;
    color: #166534;
  }

  :global(.dark) .badge-available {
    background-color: #14532d;
    color: #86efac;
  }

  .badge-in-progress {
    background-color: #fef3c7;
    color: #92400e;
  }

  .badge-coming-soon {
    background-color: #f3f4f6;
    color: #6b7280;
  }

  .content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: 1rem;
  }

  .title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.2s ease;
    margin: 0;
  }

  .clickable:hover .title {
    color: var(--accent-color);
  }

  .subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0;
  }

  .description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0.5rem 0 0;
    flex-grow: 1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .progress {
    margin-top: 0.75rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .progress-bar {
    height: 0.5rem;
    background-color: #e5e7eb;
    border-radius: 9999px;
    overflow: hidden;
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

  .source {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .source p {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }
</style>
