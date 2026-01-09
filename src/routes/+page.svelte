<!--
  Landing Page - Námsbókasafn
-->
<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { getAllBooks } from '$lib/types/book';

  const books = getAllBooks();

  const features = [
    {
      icon: 'offline',
      title: 'Virkar án nettengingar',
      description: 'Hlaðið niður bókum og lesið hvar sem er'
    },
    {
      icon: 'flashcards',
      title: 'Minniskort',
      description: 'Læra hugtök með endurtekningarkerfi'
    },
    {
      icon: 'glossary',
      title: 'Orðasafn',
      description: 'Fljótleg uppfletting á faghugtökum'
    },
    {
      icon: 'progress',
      title: 'Framvindumerking',
      description: 'Fylgstu með lestrarframvindu þinni'
    }
  ];

  // Subject icons for books
  const subjectIcons: Record<string, string> = {
    'efnafraedi': 'chemistry',
    'liffraedi': 'biology'
  };
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
      <div class="hero-content">
        <h2 class="hero-title">Opnar kennslubækur á íslensku</h2>
        <p class="hero-text">
          Þýðingar á kennslubókum frá OpenStax, aðgengilegar öllum án endurgjalds.
          Með gagnvirkum æfingum, orðasafni og minniskortum.
        </p>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-number">2</span>
            <span class="stat-label">Bækur</span>
          </div>
          <div class="stat">
            <span class="stat-number">50+</span>
            <span class="stat-label">Kaflar</span>
          </div>
          <div class="stat">
            <span class="stat-number">100%</span>
            <span class="stat-label">Ókeypis</span>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-icon-grid">
          <div class="hero-icon-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <div class="hero-icon-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div class="hero-icon-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="features">
    <div class="container">
      <div class="features-grid">
        {#each features as feature}
          <div class="feature-card">
            <div class="feature-icon">
              {#if feature.icon === 'offline'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
              {:else if feature.icon === 'flashcards'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              {:else if feature.icon === 'glossary'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  <path d="M8 7h8M8 11h6" />
                </svg>
              {:else if feature.icon === 'progress'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              {/if}
            </div>
            <h3 class="feature-title">{feature.title}</h3>
            <p class="feature-description">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Book Catalog -->
  <main class="catalog">
    <div class="container">
      <h3 class="catalog-title">Kennslubækur</h3>
      <div class="book-list">
        {#each books as book (book.id)}
          {@const isClickable = book.status === 'available' || book.status === 'in-progress'}
          {@const percentage = book.stats ? Math.round((book.stats.translatedChapters / book.stats.totalChapters) * 100) : 0}
          {@const statusLabels = { 'available': 'Í boði', 'in-progress': 'Í vinnslu', 'coming-soon': 'Væntanlegt' }}

          <article class="book-card-horizontal" class:clickable={isClickable}>
            {#if isClickable}
              <a href="/{book.slug}" class="book-link">
                <div class="book-cover" class:chemistry={subjectIcons[book.slug] === 'chemistry'} class:biology={subjectIcons[book.slug] === 'biology'}>
                  {#if subjectIcons[book.slug] === 'chemistry'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M9 3h6v6l3 9H6l3-9V3z" />
                      <path d="M9 3h6" />
                      <circle cx="10" cy="15" r="1" fill="currentColor" />
                      <circle cx="14" cy="14" r="1" fill="currentColor" />
                      <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                  {:else if subjectIcons[book.slug] === 'biology'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M12 2C12 2 8 6 8 12s4 10 4 10 4-4 4-10S12 2 12 2z" />
                      <path d="M12 2c0 0-4 4-4 10s4 10 4 10" />
                      <path d="M8 8h8M8 12h8M8 16h8" />
                    </svg>
                  {:else}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  {/if}
                  <span class="book-badge badge-{book.status}">{statusLabels[book.status]}</span>
                </div>
                <div class="book-info">
                  <div class="book-header">
                    <h4 class="book-title">{book.title}</h4>
                    <p class="book-subtitle">{book.subtitle}</p>
                  </div>
                  <p class="book-description">{book.description}</p>
                  {#if book.stats}
                    <div class="book-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: {percentage}%"></div>
                      </div>
                      <span class="progress-text">{book.stats.translatedChapters} af {book.stats.totalChapters} köflum ({percentage}%)</span>
                    </div>
                  {/if}
                  <div class="book-meta">
                    <span>Byggt á: {book.source.title}</span>
                    <span>{book.source.license}</span>
                  </div>
                </div>
                <div class="book-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </a>
            {:else}
              <div class="book-link disabled">
                <div class="book-cover">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  <span class="book-badge badge-{book.status}">{statusLabels[book.status]}</span>
                </div>
                <div class="book-info">
                  <h4 class="book-title">{book.title}</h4>
                  <p class="book-subtitle">{book.subtitle}</p>
                  <p class="book-description">{book.description}</p>
                </div>
              </div>
            {/if}
          </article>
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
</div>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .container {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0 1rem;
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
    background: linear-gradient(135deg, var(--accent-light) 0%, var(--bg-primary) 100%);
    padding: 3rem 0;
  }

  .hero .container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    align-items: center;
  }

  @media (min-width: 768px) {
    .hero .container {
      grid-template-columns: 1fr auto;
    }
  }

  .hero-content {
    text-align: center;
  }

  @media (min-width: 768px) {
    .hero-content {
      text-align: left;
    }
  }

  .hero-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1rem;
    line-height: 1.2;
  }

  @media (min-width: 640px) {
    .hero-title {
      font-size: 2.25rem;
    }
  }

  .hero-text {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0 0 1.5rem;
    line-height: 1.6;
    max-width: 32rem;
  }

  @media (min-width: 768px) {
    .hero-text {
      margin-left: 0;
    }
  }

  .hero-stats {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .hero-stats {
      justify-content: flex-start;
    }
  }

  .stat {
    text-align: center;
  }

  .stat-number {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-color);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hero-visual {
    display: none;
  }

  @media (min-width: 768px) {
    .hero-visual {
      display: block;
    }
  }

  .hero-icon-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 1rem;
  }

  .hero-icon-item {
    width: 4rem;
    height: 4rem;
    background: var(--bg-secondary);
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .hero-icon-item:nth-child(2) {
    transform: translateY(1rem);
  }

  .hero-icon-item:nth-child(3) {
    grid-column: span 2;
    justify-self: center;
  }

  .hero-icon-item svg {
    width: 2rem;
    height: 2rem;
    color: var(--accent-color);
  }

  /* Features */
  .features {
    padding: 3rem 0;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .features-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .feature-card {
    text-align: center;
    padding: 1rem;
  }

  .feature-icon {
    width: 3rem;
    height: 3rem;
    margin: 0 auto 0.75rem;
    background: var(--accent-light);
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .feature-icon svg {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--accent-color);
  }

  .feature-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.25rem;
  }

  .feature-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  /* Catalog */
  .catalog {
    padding: 3rem 0;
    flex: 1;
  }

  .catalog-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1.5rem;
  }

  .book-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Horizontal Book Card */
  .book-card-horizontal {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .book-card-horizontal.clickable:hover {
    border-color: var(--accent-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .book-link {
    display: flex;
    align-items: stretch;
    text-decoration: none;
    color: inherit;
  }

  .book-link.disabled {
    opacity: 0.6;
  }

  .book-cover {
    width: 5rem;
    min-height: 6rem;
    background: linear-gradient(135deg, var(--accent-light), var(--accent-color));
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
  }

  .book-cover.chemistry {
    background: linear-gradient(135deg, #dbeafe, #3b82f6);
  }

  .book-cover.biology {
    background: linear-gradient(135deg, #dcfce7, #22c55e);
  }

  @media (min-width: 640px) {
    .book-cover {
      width: 7rem;
      min-height: 8rem;
    }
  }

  .book-cover svg {
    width: 2.5rem;
    height: 2.5rem;
    color: rgba(255, 255, 255, 0.8);
  }

  @media (min-width: 640px) {
    .book-cover svg {
      width: 3rem;
      height: 3rem;
    }
  }

  .book-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    font-weight: 500;
  }

  .badge-available {
    background-color: rgba(255, 255, 255, 0.9);
    color: #166534;
  }

  .badge-in-progress {
    background-color: rgba(255, 255, 255, 0.9);
    color: #92400e;
  }

  .badge-coming-soon {
    background-color: rgba(255, 255, 255, 0.9);
    color: #6b7280;
  }

  .book-info {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .book-header {
    margin-bottom: 0.5rem;
  }

  .book-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    transition: color 0.2s;
  }

  .clickable:hover .book-title {
    color: var(--accent-color);
  }

  .book-subtitle {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0.125rem 0 0;
  }

  .book-description {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-progress {
    margin-top: auto;
    padding-top: 0.75rem;
  }

  .progress-bar {
    height: 0.375rem;
    background: var(--border-color);
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-color);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.6875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
    display: block;
  }

  .book-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.6875rem;
    color: var(--text-secondary);
  }

  .book-arrow {
    display: none;
    align-items: center;
    padding: 0 1rem;
    color: var(--text-secondary);
    transition: color 0.2s;
  }

  @media (min-width: 640px) {
    .book-arrow {
      display: flex;
    }
  }

  .clickable:hover .book-arrow {
    color: var(--accent-color);
  }

  .book-arrow svg {
    width: 1.5rem;
    height: 1.5rem;
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
</style>
