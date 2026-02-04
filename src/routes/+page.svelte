<!--
  Landing Page - Námsbókasafn
  Nordic Scientific Editorial Design
-->
<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { getAllBooks } from '$lib/types/book';
  import { onMount } from 'svelte';

  const books = getAllBooks();
  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  const subjectIcons: Record<string, string> = {
    'efnafraedi': 'chemistry',
    'liffraedi': 'biology'
  };

  const subjectColors: Record<string, { from: string; to: string; accent: string }> = {
    'chemistry': { from: '#1e3a5f', to: '#0c4a6e', accent: '#38bdf8' },
    'biology': { from: '#14532d', to: '#166534', accent: '#4ade80' }
  };
</script>

<svelte:head>
  <title>Námsbókasafn - Opnar kennslubækur á íslensku</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&display=swap" rel="stylesheet">
</svelte:head>

<div class="landing" class:mounted>
  <!-- Floating molecular decorations -->
  <div class="decorations" aria-hidden="true">
    <svg class="molecule molecule-1" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="30" r="8" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="30" cy="60" r="6" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="70" cy="70" r="7" stroke="currentColor" stroke-width="1.5"/>
      <line x1="50" y1="38" x2="35" y2="55" stroke="currentColor" stroke-width="1.5"/>
      <line x1="50" y1="38" x2="65" y2="63" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <svg class="molecule molecule-2" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="20" r="5" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="20" cy="50" r="5" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="60" cy="50" r="5" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="40" cy="65" r="4" stroke="currentColor" stroke-width="1.5"/>
      <line x1="40" y1="25" x2="25" y2="45" stroke="currentColor" stroke-width="1.5"/>
      <line x1="40" y1="25" x2="55" y2="45" stroke="currentColor" stroke-width="1.5"/>
      <line x1="25" y1="55" x2="36" y2="62" stroke="currentColor" stroke-width="1.5"/>
      <line x1="55" y1="55" x2="44" y2="62" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <svg class="molecule molecule-3" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="12" stroke="currentColor" stroke-width="1"/>
      <circle cx="30" cy="30" r="6" stroke="currentColor" stroke-width="1"/>
      <circle cx="30" cy="10" r="3" fill="currentColor" opacity="0.3"/>
      <circle cx="30" cy="50" r="3" fill="currentColor" opacity="0.3"/>
      <circle cx="10" cy="30" r="3" fill="currentColor" opacity="0.3"/>
      <circle cx="50" cy="30" r="3" fill="currentColor" opacity="0.3"/>
    </svg>
  </div>

  <!-- Header -->
  <header class="header">
    <div class="header-inner">
      <a href="/" class="brand" aria-label="Námsbókasafn forsíða">
        <div class="brand-mark">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 26V8a4 4 0 0 1 4-4h14v24H10a4 4 0 0 1 0-8h14" />
          </svg>
        </div>
        <span class="brand-text">Námsbókasafn</span>
      </a>

      <button
        class="theme-toggle"
        on:click={() => settings.toggleTheme()}
        aria-label="Skipta um þema"
      >
        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <p class="hero-eyebrow">Opið námsefni</p>
      <h1 class="hero-title">
        Námsbækur<br/>
        <span class="hero-title-accent">á íslensku</span>
      </h1>
      <p class="hero-description">
        Íslenskar þýðingar á alþjóðlega viðurkenndum námsbókum frá OpenStax —
        aðgengilegar öllum nemendum og kennurum, án endurgjalds.
      </p>

      <div class="hero-features">
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <span>Minniskort</span>
        </div>
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h8M8 11h6" />
          </svg>
          <span>Orðasafn</span>
        </div>
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>Framvinda</span>
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <div class="orbital-rings">
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
        <div class="nucleus"></div>
      </div>
    </div>
  </section>

  <!-- Book Catalog -->
  <main class="catalog">
    <div class="catalog-header">
      <h2 class="catalog-title">Kennslubækur</h2>
      <p class="catalog-subtitle">Veldu bók til að hefja lestur</p>
    </div>

    <div class="book-grid">
      {#each books as book, index (book.id)}
        {@const isClickable = book.status === 'available' || book.status === 'in-progress'}
        {@const percentage = book.stats ? Math.round((book.stats.translatedChapters / book.stats.totalChapters) * 100) : 0}
        {@const statusLabels = { 'available': 'Í boði', 'in-progress': 'Í vinnslu', 'coming-soon': 'Væntanlegt' }}
        {@const subject = subjectIcons[book.slug] || 'book'}
        {@const colors = subjectColors[subject] || { from: '#374151', to: '#1f2937', accent: '#9ca3af' }}

        <article
          class="book-card"
          class:clickable={isClickable}
          style="--card-delay: {index * 100}ms; --accent: {colors.accent}; --from: {colors.from}; --to: {colors.to}"
        >
          {#if isClickable}
            <a href="/{book.slug}" class="book-link">
              <div class="book-cover">
                <div class="book-cover-bg"></div>
                <div class="book-cover-icon">
                  {#if subject === 'chemistry'}
                    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M18 6h12v12l8 22H10l8-22V6z" />
                      <path d="M18 6h12" stroke-width="2"/>
                      <circle cx="20" cy="32" r="2.5" fill="currentColor" opacity="0.6"/>
                      <circle cx="28" cy="30" r="2" fill="currentColor" opacity="0.6"/>
                      <circle cx="24" cy="35" r="2" fill="currentColor" opacity="0.6"/>
                      <circle cx="16" cy="34" r="1.5" fill="currentColor" opacity="0.4"/>
                    </svg>
                  {:else if subject === 'biology'}
                    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                      <ellipse cx="24" cy="24" rx="10" ry="18"/>
                      <ellipse cx="24" cy="24" rx="10" ry="18" transform="rotate(60 24 24)"/>
                      <ellipse cx="24" cy="24" rx="10" ry="18" transform="rotate(120 24 24)"/>
                      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3"/>
                    </svg>
                  {:else}
                    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M10 40V12a6 6 0 0 1 6-6h18v36H16a6 6 0 0 1 0-12h18" />
                    </svg>
                  {/if}
                </div>
                <span class="book-status status-{book.status}">{statusLabels[book.status]}</span>
              </div>

              <div class="book-info">
                <div class="book-header">
                  <h3 class="book-title">{book.title}</h3>
                  <p class="book-subtitle">{book.subtitle}</p>
                </div>

                <p class="book-description">{book.description}</p>

                {#if book.stats}
                  <div class="book-progress">
                    <div class="progress-track">
                      <div class="progress-fill" style="width: {percentage}%"></div>
                    </div>
                    <span class="progress-label">
                      {book.stats.translatedChapters} / {book.stats.totalChapters} kaflar þýddir
                    </span>
                  </div>
                {/if}

                <div class="book-meta">
                  <span class="meta-source">Byggt á {book.source.title}</span>
                  <span class="meta-license">{book.source.license}</span>
                </div>
              </div>

              <div class="book-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          {:else}
            <div class="book-link disabled">
              <div class="book-cover">
                <div class="book-cover-bg"></div>
                <div class="book-cover-icon">
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M10 40V12a6 6 0 0 1 6-6h18v36H16a6 6 0 0 1 0-12h18" />
                  </svg>
                </div>
                <span class="book-status status-{book.status}">{statusLabels[book.status]}</span>
              </div>
              <div class="book-info">
                <h3 class="book-title">{book.title}</h3>
                <p class="book-subtitle">{book.subtitle}</p>
                <p class="book-description">{book.description}</p>
              </div>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  </main>

  <!-- About Section -->
  <section class="about">
    <div class="about-grid">
      <div class="about-card">
        <div class="about-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <h3>Um verkefnið</h3>
        <p>
          Námsbókasafn er safn íslenskra þýðinga á opnum kennslubókum.
          Verkefnið miðar að því að gera hágæða námsefni aðgengilegt
          öllum íslenskum nemendum og kennurum.
        </p>
      </div>

      <div class="about-card">
        <div class="about-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M12 6v7l4-2"/>
          </svg>
        </div>
        <h3>OpenStax</h3>
        <p>
          Þýðingarnar byggjast á opnum kennslubókum frá OpenStax,
          gefnar út af Rice University undir CC BY 4.0 leyfi.
        </p>
        <a href="https://openstax.org" target="_blank" rel="noopener noreferrer" class="about-link">
          Heimsækja OpenStax
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-content">
      <p>
        Þýðingar og veflesari © {new Date().getFullYear()} Sigurður E. Vilhelmsson.
        Upprunalegt efni © OpenStax, Rice University.
      </p>
      <p>
        Allt efni er gefið út undir
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
          CC BY 4.0
        </a>
        leyfi.
      </p>
    </div>
  </footer>
</div>

<style>
  /* ====================================
     CSS CUSTOM PROPERTIES
     ==================================== */
  .landing {
    --font-display: 'Fraunces', Georgia, serif;
    --landing-accent: var(--accent-color);
    --landing-accent-soft: var(--accent-light);

    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
  }

  /* ====================================
     ANIMATIONS
     ==================================== */
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }

  @keyframes float-reverse {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(20px) rotate(-5deg); }
  }

  @keyframes orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* ====================================
     MOLECULAR DECORATIONS
     ==================================== */
  .decorations {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .molecule {
    position: absolute;
    color: var(--landing-accent);
    opacity: 0.12;
  }

  .dark .molecule {
    opacity: 0.08;
  }

  .molecule-1 {
    width: 200px;
    height: 200px;
    top: 15%;
    right: 5%;
    animation: float 12s ease-in-out infinite;
  }

  .molecule-2 {
    width: 150px;
    height: 150px;
    bottom: 20%;
    left: 3%;
    animation: float-reverse 15s ease-in-out infinite;
  }

  .molecule-3 {
    width: 100px;
    height: 100px;
    top: 60%;
    right: 15%;
    animation: float 10s ease-in-out infinite 2s;
  }

  /* ====================================
     HEADER
     ==================================== */
  .header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(250, 248, 245, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
  }

  .dark .header {
    background: rgba(26, 26, 46, 0.85);
  }

  .header-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: 0 1.5rem;
    height: 4.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
  }

  .brand-mark {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--landing-accent);
  }

  .brand-mark svg {
    width: 100%;
    height: 100%;
  }

  .brand-text {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .theme-toggle {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
  }

  .theme-toggle:hover {
    border-color: var(--landing-accent);
    transform: rotate(15deg);
  }

  .theme-toggle svg {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--text-secondary);
    position: absolute;
    transition: opacity 0.2s, transform 0.3s;
  }

  .sun-icon {
    opacity: 1;
  }

  .moon-icon {
    opacity: 0;
    transform: rotate(-90deg);
  }

  .dark .sun-icon {
    opacity: 0;
    transform: rotate(90deg);
  }

  .dark .moon-icon {
    opacity: 1;
    transform: rotate(0);
  }

  /* ====================================
     HERO SECTION
     ==================================== */
  .hero {
    position: relative;
    z-index: 1;
    padding: 4rem 1.5rem 6rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    max-width: 80rem;
    margin: 0 auto;
    align-items: center;
  }

  @media (min-width: 768px) {
    .hero {
      grid-template-columns: 1fr auto;
      padding: 6rem 2rem 8rem;
      gap: 4rem;
    }
  }

  .hero-content {
    opacity: 0;
    animation: slide-up 0.8s ease forwards;
    animation-delay: 0.1s;
  }

  .mounted .hero-content {
    animation-play-state: running;
  }

  .hero-eyebrow {
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--landing-accent);
    margin: 0 0 1rem;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin: 0 0 1.5rem;
  }

  .hero-title-accent {
    color: var(--landing-accent);
    font-style: italic;
  }

  .hero-description {
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--text-secondary);
    max-width: 32rem;
    margin: 0 0 2.5rem;
  }

  .hero-features {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .hero-feature {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9375rem;
    color: var(--text-secondary);
    opacity: 0;
    animation: slide-up 0.6s ease forwards;
  }

  .hero-feature:nth-child(1) { animation-delay: 0.4s; }
  .hero-feature:nth-child(2) { animation-delay: 0.5s; }
  .hero-feature:nth-child(3) { animation-delay: 0.6s; }

  .hero-feature svg {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--landing-accent);
  }

  /* Hero Visual - Atomic Orbital */
  .hero-visual {
    display: none;
  }

  @media (min-width: 768px) {
    .hero-visual {
      display: block;
      width: 280px;
      height: 280px;
      position: relative;
      opacity: 0;
      animation: fade-in 1s ease forwards;
      animation-delay: 0.6s;
    }
  }

  @media (min-width: 1024px) {
    .hero-visual {
      width: 340px;
      height: 340px;
    }
  }

  .orbital-rings {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ring {
    position: absolute;
    border: 1.5px solid var(--landing-accent);
    border-radius: 50%;
    opacity: 0.3;
  }

  .ring-1 {
    width: 100%;
    height: 100%;
    animation: orbit 20s linear infinite;
    border-style: dashed;
  }

  .ring-2 {
    width: 70%;
    height: 70%;
    animation: orbit 15s linear infinite reverse;
    transform: rotateX(60deg);
  }

  .ring-3 {
    width: 85%;
    height: 85%;
    animation: orbit 25s linear infinite;
    transform: rotateY(60deg);
    border-style: dotted;
  }

  .nucleus {
    width: 24px;
    height: 24px;
    background: var(--landing-accent);
    border-radius: 50%;
    animation: pulse 3s ease-in-out infinite;
    box-shadow: 0 0 40px var(--landing-accent);
  }

  /* ====================================
     BOOK CATALOG
     ==================================== */
  .catalog {
    position: relative;
    z-index: 1;
    padding: 4rem 1.5rem 6rem;
    background: var(--bg-secondary);
    flex: 1;
  }

  @media (min-width: 768px) {
    .catalog {
      padding: 5rem 2rem 7rem;
    }
  }

  .catalog-header {
    max-width: 80rem;
    margin: 0 auto 3rem;
    text-align: center;
    opacity: 0;
    animation: slide-up 0.6s ease forwards;
    animation-delay: 0.3s;
  }

  .catalog-title {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .catalog-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .book-grid {
    max-width: 56rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ====================================
     BOOK CARDS
     ==================================== */
  .book-card {
    opacity: 0;
    animation: slide-up 0.6s ease forwards;
    animation-delay: calc(0.4s + var(--card-delay));
  }

  .book-link {
    display: grid;
    grid-template-columns: 1fr;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
  }

  @media (min-width: 640px) {
    .book-link {
      grid-template-columns: 140px 1fr auto;
    }
  }

  .book-card.clickable .book-link:hover {
    border-color: var(--accent);
    box-shadow: 0 8px 30px -10px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  .dark .book-card.clickable .book-link:hover {
    box-shadow: 0 8px 30px -10px rgba(0, 0, 0, 0.4);
  }

  .book-link.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Book Cover */
  .book-cover {
    position: relative;
    aspect-ratio: 3/4;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  @media (min-width: 640px) {
    .book-cover {
      aspect-ratio: auto;
      min-height: 180px;
    }
  }

  .book-cover-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, var(--from), var(--to));
    transition: transform 0.4s ease;
  }

  .book-card.clickable .book-link:hover .book-cover-bg {
    transform: scale(1.05);
  }

  .book-cover-icon {
    position: relative;
    width: 64px;
    height: 64px;
    color: rgba(255, 255, 255, 0.85);
    transition: transform 0.3s ease;
  }

  .book-card.clickable .book-link:hover .book-cover-icon {
    transform: scale(1.1);
  }

  .book-cover-icon svg {
    width: 100%;
    height: 100%;
  }

  .book-status {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.95);
  }

  .status-available {
    color: #166534;
  }

  .status-in-progress {
    color: #92400e;
  }

  .status-coming-soon {
    color: #6b7280;
  }

  /* Book Info */
  .book-info {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .book-header {
    margin-bottom: 0.25rem;
  }

  .book-title {
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    transition: color 0.2s;
  }

  .book-card.clickable .book-link:hover .book-title {
    color: var(--accent);
  }

  .book-subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0;
  }

  .book-description {
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Progress Bar */
  .book-progress {
    margin-top: auto;
  }

  .progress-track {
    height: 6px;
    background: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .progress-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.375rem;
  }

  /* Book Meta */
  .book-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-color);
  }

  .meta-license {
    padding: 0.125rem 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    font-weight: 500;
  }

  /* Book Arrow */
  .book-arrow {
    display: none;
    align-items: center;
    padding: 0 1.5rem;
    color: var(--text-secondary);
    transition: all 0.2s;
  }

  @media (min-width: 640px) {
    .book-arrow {
      display: flex;
    }
  }

  .book-arrow svg {
    width: 1.5rem;
    height: 1.5rem;
    transition: transform 0.2s;
  }

  .book-card.clickable .book-link:hover .book-arrow {
    color: var(--accent);
  }

  .book-card.clickable .book-link:hover .book-arrow svg {
    transform: translateX(4px);
  }

  /* ====================================
     ABOUT SECTION
     ==================================== */
  .about {
    position: relative;
    z-index: 1;
    padding: 5rem 1.5rem;
    background: var(--bg-primary);
  }

  @media (min-width: 768px) {
    .about {
      padding: 6rem 2rem;
    }
  }

  .about-grid {
    max-width: 56rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  @media (min-width: 640px) {
    .about-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .about-card {
    padding: 2rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 1rem;
  }

  .about-icon {
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.25rem;
    color: var(--landing-accent);
  }

  .about-icon svg {
    width: 100%;
    height: 100%;
  }

  .about-card h3 {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem;
  }

  .about-card p {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  .about-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--landing-accent);
    text-decoration: none;
    transition: gap 0.2s;
  }

  .about-link:hover {
    gap: 0.625rem;
  }

  .about-link svg {
    width: 1rem;
    height: 1rem;
  }

  /* ====================================
     FOOTER
     ==================================== */
  .footer {
    position: relative;
    z-index: 1;
    padding: 2.5rem 1.5rem;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    text-align: center;
  }

  .footer-content {
    max-width: 56rem;
    margin: 0 auto;
  }

  .footer-content p {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0 0 0.375rem;
    line-height: 1.6;
  }

  .footer-content a {
    color: var(--landing-accent);
    text-decoration: none;
  }

  .footer-content a:hover {
    text-decoration: underline;
  }

  /* ====================================
     RESPONSIVE REFINEMENTS
     ==================================== */
  @media (max-width: 639px) {
    .hero-title {
      font-size: 2.25rem;
    }

    .hero-description {
      font-size: 1.0625rem;
    }

    .hero-features {
      gap: 1rem;
    }

    .book-info {
      padding: 1.25rem;
    }

    .book-title {
      font-size: 1.25rem;
    }

    .molecule-1 {
      width: 120px;
      height: 120px;
      top: 10%;
      right: -20px;
    }

    .molecule-2 {
      width: 100px;
      height: 100px;
      bottom: auto;
      top: 50%;
      left: -30px;
    }

    .molecule-3 {
      display: none;
    }
  }

  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .molecule,
    .ring,
    .nucleus,
    .hero-content,
    .hero-feature,
    .hero-visual,
    .catalog-header,
    .book-card {
      animation: none;
      opacity: 1;
    }

    .book-link,
    .book-cover-bg,
    .book-cover-icon,
    .book-arrow svg {
      transition: none;
    }
  }
</style>
