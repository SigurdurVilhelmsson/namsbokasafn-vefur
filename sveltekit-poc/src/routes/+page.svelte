<!--
  Landing Page - SvelteKit PoC

  Compare to React version (LandingPage.tsx):
  - React: ~125 lines, hooks for state/theme
  - Svelte: ~180 lines (including all styles), cleaner template

  Key benefits:
  1. No need for useCallback, useMemo, or dependency arrays
  2. Reactive statements ($:) replace useEffect
  3. Built-in transitions for animations
  4. Scoped styles - no Tailwind class strings
-->
<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { getAllBooks } from '$lib/types/book';
  import BookCard from '$lib/components/BookCard.svelte';

  const books = getAllBooks();
</script>

<svelte:head>
  <title>Námsbókasafn - Opnar kennslubækur á íslensku</title>
</svelte:head>

<div class="landing">
  <!-- Header -->
  <header class="header">
    <div class="container">
      <div class="header-inner">
        <div class="brand">
          <svg class="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          <div>
            <h1 class="brand-title">Námsbókasafn</h1>
            <p class="brand-subtitle">Opnar kennslubækur á íslensku</p>
          </div>
        </div>

        <button
          class="theme-toggle"
          on:click={() => settings.toggleTheme()}
          aria-label="Skipta um þema"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section class="hero">
    <div class="container">
      <h2 class="hero-title">Opnar kennslubækur á íslensku</h2>
      <p class="hero-text">
        Þýðingar á kennslubókum frá OpenStax, aðgengilegar öllum án endurgjalds.
        Með gagnvirkum æfingum, orðasafni og minniskortum.
      </p>
    </div>
  </section>

  <!-- Book Catalog -->
  <main class="catalog">
    <div class="container">
      <h3 class="catalog-title">Bækur</h3>
      <div class="book-grid">
        {#each books as book (book.id)}
          <BookCard {book} />
        {/each}
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4 class="footer-heading">Um Námsbókasafn</h4>
          <p class="footer-text">
            Námsbókasafn er safn íslenskra þýðinga á opnum kennslubókum.
            Verkefnið miðar að því að gera hágæða námsefni aðgengilegt
            öllum íslenskum nemendum og kennurum.
          </p>
        </div>

        <div>
          <h4 class="footer-heading">Byggt á OpenStax</h4>
          <p class="footer-text">
            Þýðingarnar byggjast á opnum kennslubókum frá OpenStax,
            gefnar út af Rice University undir CC BY 4.0 leyfi.
          </p>
          <a href="https://openstax.org" target="_blank" rel="noopener noreferrer" class="footer-link">
            Heimsækja OpenStax
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      <div class="footer-copyright">
        <p>
          Þýðingar og veflesari © {new Date().getFullYear()} Sigurður E. Vilhelmsson.
          Upprunalegt efni © OpenStax, Rice University.
          Allt efni er gefið út undir
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </a>
          leyfi.
        </p>
      </div>
    </div>
  </footer>

  <!-- PoC Banner -->
  <div class="poc-banner poc-banner-svelte">
    <div class="container">
      <p>
        <strong>SvelteKit PoC:</strong> Þessi síða er rendered með SvelteKit.
        Minni bundle, einfaldari kóði, og innbyggð reactivity.
      </p>
    </div>
  </div>
</div>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .header {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 40;
  }

  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 4rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .brand-icon {
    width: 2rem;
    height: 2rem;
    color: var(--accent-color);
  }

  .brand-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .brand-subtitle {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
    display: none;
  }

  @media (min-width: 640px) {
    .brand-subtitle {
      display: block;
    }
  }

  .theme-toggle {
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    transition: background-color 0.2s ease;
  }

  .theme-toggle:hover {
    background-color: var(--bg-primary);
  }

  .theme-toggle svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Hero */
  .hero {
    background: linear-gradient(to bottom, var(--accent-light), var(--bg-primary));
    padding: 3rem 0 4rem;
    text-align: center;
  }

  .hero-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1rem;
  }

  @media (min-width: 640px) {
    .hero-title {
      font-size: 2.25rem;
    }
  }

  .hero-text {
    font-size: 1.125rem;
    color: var(--text-secondary);
    max-width: 42rem;
    margin: 0 auto;
    line-height: 1.75;
  }

  /* Catalog */
  .catalog {
    padding: 3rem 0;
    flex: 1;
  }

  .catalog-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1.5rem;
  }

  .book-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .book-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .book-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 1280px) {
    .book-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  /* Footer */
  .footer {
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    padding: 2rem 0;
    margin-top: auto;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  @media (min-width: 768px) {
    .footer-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .footer-heading {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem;
  }

  .footer-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 1rem;
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: var(--accent-color);
    text-decoration: none;
  }

  .footer-link:hover {
    text-decoration: underline;
  }

  .footer-link svg {
    width: 0.75rem;
    height: 0.75rem;
  }

  .footer-copyright {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    text-align: center;
  }

  .footer-copyright p {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .footer-copyright a {
    color: var(--accent-color);
    text-decoration: none;
  }

  .footer-copyright a:hover {
    text-decoration: underline;
  }

  /* PoC Banner - Svelte variant */
  .poc-banner-svelte {
    background-color: #fef3c7;
    border-top: 2px solid #f59e0b;
  }

  :global(.dark) .poc-banner-svelte {
    background-color: #78350f;
    border-top-color: #fbbf24;
  }

  .poc-banner-svelte p {
    color: #92400e;
  }

  :global(.dark) .poc-banner-svelte p {
    color: #fef3c7;
  }
</style>
