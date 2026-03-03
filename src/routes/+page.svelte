<!--
  Landing Page - Námsbókasafn
  Nordic Clarity Design
-->
<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import type { CatalogueEntry, SubjectGroup } from '$lib/data/openstax-catalogue';
  import { faqItems } from '$lib/data/faq';

  let { data }: { data: PageData } = $props();
  let books = $derived(data.books);
  let tier2Groups = $derived(data.tier2Groups as Record<string, CatalogueEntry[]>);
  let subjectGroups = $derived(data.subjectGroups as SubjectGroup[]);
  let mounted = $state(false);

  const subjectIcons: Record<string, string> = {
    'efnafraedi-2e': 'chemistry'
  };


  /** Subject groups that actually have Tier 2 entries */
  let activeTier2Groups = $derived(
    subjectGroups.filter((g) => tier2Groups[g.key]?.length > 0)
  );

  // Knowledge graph nodes - organic spread pattern
  const graphNodes = [
    { x: 8, y: 12, r: 3, highlight: false },
    { x: 22, y: 8, r: 2.5, highlight: true },
    { x: 35, y: 18, r: 2, highlight: false },
    { x: 50, y: 6, r: 3, highlight: false },
    { x: 65, y: 14, r: 2.5, highlight: true },
    { x: 78, y: 9, r: 2, highlight: false },
    { x: 92, y: 16, r: 3, highlight: false },
    { x: 15, y: 35, r: 2, highlight: false },
    { x: 30, y: 40, r: 2.5, highlight: true },
    { x: 45, y: 32, r: 2, highlight: false },
    { x: 60, y: 38, r: 3, highlight: false },
    { x: 75, y: 30, r: 2, highlight: false },
    { x: 88, y: 42, r: 2.5, highlight: false },
    { x: 10, y: 58, r: 2.5, highlight: false },
    { x: 25, y: 62, r: 2, highlight: true },
    { x: 42, y: 55, r: 3, highlight: false },
    { x: 55, y: 65, r: 2, highlight: false },
    { x: 70, y: 58, r: 2.5, highlight: false },
    { x: 85, y: 68, r: 2, highlight: false },
    { x: 18, y: 82, r: 3, highlight: false },
    { x: 38, y: 78, r: 2, highlight: false },
    { x: 55, y: 85, r: 2.5, highlight: true },
    { x: 72, y: 80, r: 2, highlight: false },
    { x: 90, y: 88, r: 3, highlight: false }
  ];

  // Connections between nearby nodes
  const graphEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
    [0, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
    [7, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18],
    [13, 19], [19, 20], [20, 21], [21, 22], [22, 23],
    [1, 8], [3, 9], [4, 10], [8, 14], [10, 16], [11, 17],
    [14, 20], [16, 21], [18, 23], [2, 9], [9, 15], [15, 21]
  ];

  // Intersection observer for knowledge graph performance
  let graphEl: SVGSVGElement;
  let graphVisible = $state(true);
  let observer: IntersectionObserver | undefined;

  onMount(() => {
    mounted = true;

    if (typeof IntersectionObserver !== 'undefined' && graphEl) {
      observer = new IntersectionObserver(
        ([entry]) => { graphVisible = entry.isIntersecting; },
        { threshold: 0 }
      );
      observer.observe(graphEl);
    }
  });

  onDestroy(() => {
    if (observer) observer.disconnect();
  });

  /** Smooth scroll to anchor */
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title>Námsbókasafn – Opnar kennslubækur á íslensku</title>
  <meta property="og:title" content="Námsbókasafn – Opnar kennslubækur á íslensku" />
  <meta property="og:description" content="Gagnvirkt námsefni með íslenskum þýðingum á OpenStax kennslubókum. Orðasafn, minniskort og æfingar." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://namsbokasafn.is/" />
</svelte:head>

<div class="landing" class:mounted>
  <!-- Knowledge graph background -->
  <svg
    class="knowledge-graph"
    class:paused={!graphVisible}
    bind:this={graphEl}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {#each graphEdges as [from, to], i (i)}
      <line
        class="graph-edge"
        x1={graphNodes[from].x}
        y1={graphNodes[from].y}
        x2={graphNodes[to].x}
        y2={graphNodes[to].y}
      />
    {/each}
    {#each graphNodes as node, i (i)}
      <circle
        class="graph-node"
        class:highlight={node.highlight}
        cx={node.x}
        cy={node.y}
        r={node.r}
        style="animation-delay: {i * 0.3}s"
      />
    {/each}
  </svg>

  <!-- Header -->
  <header class="header">
    <div class="header-inner">
      <a href="/" class="brand" aria-label="Námsbókasafn forsíða">
        <span class="brand-text">Námsbókasafn</span>
      </a>

      <nav class="header-nav" aria-label="Aðalvalmynd">
        <a href="#kennslubaekur" onclick={(e: MouseEvent) => { e.preventDefault(); scrollTo('kennslubaekur'); }}>Kennslubækur</a>
        <a href="#verkfaeri" onclick={(e: MouseEvent) => { e.preventDefault(); scrollTo('verkfaeri'); }}>Verkfæri</a>
        <a href="#um" onclick={(e: MouseEvent) => { e.preventDefault(); scrollTo('um'); }}>Um verkefnið</a>
        <a href="#spurt-og-svarad" onclick={(e: MouseEvent) => { e.preventDefault(); scrollTo('spurt-og-svarad'); }}>Spurt og svarað</a>
      </nav>

      <button
        class="theme-toggle"
        onclick={() => settings.toggleTheme()}
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
      <p class="hero-eyebrow anim-item" style="--anim-delay: 0ms">OPIN NÁMSGÖGN Á ÍSLENSKU</p>
      <h1 class="hero-title anim-item" style="--anim-delay: 100ms">
        Þýddar námsbækur í opnum aðgangi
      </h1>
      <p class="hero-sub anim-item" style="--anim-delay: 200ms">
        Þýddar OpenStax námsbækur með innbyggðum námsverkfærum — gjaldfrjálst og opið öllum.
      </p>
      <div class="hero-actions anim-item" style="--anim-delay: 300ms">
        <a href="#kennslubaekur" class="btn-primary" onclick={(e: MouseEvent) => { e.preventDefault(); scrollTo('kennslubaekur'); }}>
          Skoða bækur
        </a>
        <a href="#um" class="btn-text" onclick={(e: MouseEvent) => { e.preventDefault(); scrollTo('um'); }}>
          Meira um verkefnið
        </a>
      </div>
    </div>
  </section>

  <!-- Book Catalog -->
  <section id="kennslubaekur" class="catalog">
    <!-- Tier 1: Our translations -->
    <div class="section-header">
      <h2>Þýðingar</h2>
      <p>Þýðingar okkar á OpenStax námsbókum</p>
    </div>

    <div class="book-grid">
      {#each books as book, index (book.id)}
        {@const isClickable = book.status === 'available' || book.status === 'in-progress' || book.status === 'preview'}
        {@const percentage = book.stats ? Math.round((book.stats.translatedChapters / book.stats.totalChapters) * 100) : 0}
        {@const subject = subjectIcons[book.slug] || 'book'}

        <article
          class="book-card"
          class:clickable={isClickable}
          style="--subject-color: var(--subject-{subject}, #6b7280); --card-delay: {index * 100}ms"
        >
          {#if isClickable}
            <a href="/{book.slug}" class="book-link">
              <div class="book-card-top">
                <span
                  class="book-status"
                  class:status-available={book.status === 'available'}
                  class:status-in-progress={book.status === 'in-progress'}
                  class:status-preview={book.status === 'preview'}
                >
                  {book.status === 'available' ? 'Í boði' : book.status === 'in-progress' ? 'Í vinnslu' : book.status === 'preview' ? 'Forskoðun' : 'Væntanlegt'}
                </span>
              </div>
              <h3 class="book-title">{book.title}</h3>
              <p class="book-source">
                Byggt á {book.source.title}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="external-icon">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </p>

              {#if book.status === 'preview'}
                <div class="book-preview-info">
                  <span class="preview-label">1 kafli í forskoðun</span>
                  <span class="preview-note">Vélþýðing — leitum að ritstjóra</span>
                </div>
              {:else if book.stats}
                <div class="book-progress">
                  <div class="progress-track">
                    <div class="progress-fill" style="width: {percentage}%"></div>
                  </div>
                  <span class="progress-label">
                    {book.stats.translatedChapters} / {book.stats.totalChapters} kaflar — {percentage}%
                  </span>
                </div>
              {/if}

              {#if book.features && book.status !== 'preview'}
                <div class="book-tools">
                  {#if book.features.flashcards}
                    <span class="tool-icon" title="Minniskort">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    </span>
                  {/if}
                  {#if book.features.glossary}
                    <span class="tool-icon" title="Orðasafn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        <path d="M8 7h8M8 11h6" />
                      </svg>
                    </span>
                  {/if}
                  {#if book.features.exercises}
                    <span class="tool-icon" title="Æfingarverkefni">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </span>
                  {/if}
                  {#if book.features.periodicTable}
                    <span class="tool-icon" title="Lotukerfið">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </span>
                  {/if}
                </div>
              {/if}

              <div class="book-cta">
                <span>Opna bók →</span>
              </div>
            </a>
          {:else}
            <div class="book-link disabled">
              <div class="book-card-top">
                <span class="book-status status-coming-soon">Væntanlegt</span>
              </div>
              <h3 class="book-title">{book.title}</h3>
              <p class="book-source">Byggt á {book.source.title}</p>
            </div>
          {/if}
        </article>
      {/each}
    </div>

    <!-- Intro paragraph between tiers -->
    <div class="catalogue-intro">
      <p>
        Þýðingarnar okkar byggjast á opnum kennslubókum frá
        <a href="https://openstax.org" target="_blank" rel="noopener noreferrer">OpenStax</a>,
        gefnar út af Rice University undir
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        leyfi. Hér fyrir neðan eru allar náttúruvísinda- og stærðfræðibækur OpenStax.
        Hafðu samband á
        <a href="mailto:sigurdur@namsbokasafn.is">sigurdur@namsbokasafn.is</a>
        ef þú vilt leggja verkefninu lið.
      </p>
    </div>

    <!-- Tier 2: OpenStax library -->
    <div class="tier2-section">
      <div class="section-header">
        <h2>OpenStax safnið</h2>
        <p>Allar náttúruvísinda- og stærðfræðibækur frá OpenStax</p>
      </div>

      {#each activeTier2Groups as group (group.key)}
        {@const entries = tier2Groups[group.key]}

        <div class="subject-group">
          <h3 class="subject-group-title" style="--group-color: var(--subject-{group.key}, #6b7280)">
            {group.label}
          </h3>

          <div class="compact-grid">
            {#each entries as entry (entry.slug)}
              <article class="compact-card">
                <h4 class="compact-title">{entry.title}</h4>
                <p class="compact-desc">{entry.description}</p>
                <div class="compact-footer">
                  <span class="compact-chapters">{entry.chapterCount} kaflar</span>
                  <a
                    href={entry.openstaxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="compact-link"
                  >
                    OpenStax
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="compact-external-icon">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              </article>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Study Tools -->
  <section id="verkfaeri" class="tools-section">
    <div class="section-header">
      <h2>Hjálpartæki fyrir nemendur</h2>
      <p>Innbyggð verkfæri sem hjálpa þér að læra betur</p>
    </div>

    <div class="tools-grid">
      <!-- Minniskort -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--accent-color) 12%, transparent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <rect x="5" y="7" width="14" height="10" rx="1" opacity="0.4" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </div>
        <h3>Minniskort</h3>
        <p>Endurtekningarkerfi sem aðlagar sig að þér</p>
      </div>

      <!-- Orðasafn -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--accent-color) 12%, transparent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h8M8 11h6" />
          </svg>
        </div>
        <h3>Orðasafn</h3>
        <p>Smelltu á hugtök til að sjá skilgreiningar</p>
      </div>

      <!-- Próf -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--subject-math) 12%, transparent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--subject-math)" stroke-width="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <h3>Próf</h3>
        <p>Aðlöguð verkefni til að prófa þekkingu</p>
      </div>

      <!-- Framvinda -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--subject-biology) 12%, transparent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--subject-biology)" stroke-width="2">
            <rect x="3" y="12" width="4" height="9" rx="1" />
            <rect x="10" y="8" width="4" height="13" rx="1" />
            <rect x="17" y="4" width="4" height="17" rx="1" />
          </svg>
        </div>
        <h3>Framvinda</h3>
        <p>Fylgstu með hvar þú ert í bókinni</p>
      </div>
    </div>
  </section>

  <!-- About / Attribution -->
  <section id="um" class="about-section">
    <div class="about-grid">
      <div class="about-card">
        <h3>Um Námsbókasafn</h3>
        <p>
          Námsbókasafn er safn íslenskra þýðinga á opnum námsbókum.
          Verkefnið miðar að því að gera hágæða námsefni aðgengilegt
          öllum íslenskum nemendum og kennurum, gjaldfrjálst og á móðurmálinu.
        </p>
      </div>
      <div class="about-card">
        <h3>OpenStax og Rice University</h3>
        <p>
          Þýðingarnar byggjast á opnum kennslubókum frá OpenStax,
          gefnar út af Rice University undir
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          leyfi. Námsbókasafn er sjálfstætt verkefni og ekki tengt OpenStax.
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

  <!-- FAQ -->
  <section id="spurt-og-svarad" class="faq-section">
    <div class="section-header">
      <h2>Algengar spurningar</h2>
      <p>Svör við algengum spurningum um verkefnið</p>
    </div>
    <div class="faq-list">
      {#each faqItems as item (item.id)}
        <details class="faq-item">
          <summary class="faq-question">
            <span>{item.question}</span>
            <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="faq-answer">
            {@html item.answer}
          </div>
        </details>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>
      © {new Date().getFullYear()} Námsbókasafn ·
      Efni byggt á
      <a href="https://openstax.org" target="_blank" rel="noopener noreferrer">OpenStax</a>
      ·
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
    </p>
  </footer>
</div>

<style>
  /* ====================================
     BASE LAYOUT
     ==================================== */
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
  }

  /* ====================================
     KNOWLEDGE GRAPH BACKGROUND
     ==================================== */
  @keyframes node-drift {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(0.4px, -0.3px); }
    66% { transform: translate(-0.3px, 0.4px); }
  }

  @keyframes edge-pulse {
    0%, 100% { opacity: 0.08; }
    50% { opacity: 0.14; }
  }

  @keyframes highlight-pulse {
    0%, 100% { opacity: 0.12; }
    50% { opacity: 0.2; }
  }

  .knowledge-graph {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    will-change: transform;
  }

  .knowledge-graph.paused .graph-node,
  .knowledge-graph.paused .graph-edge {
    animation-play-state: paused;
  }

  .graph-edge {
    stroke: var(--border-color);
    stroke-width: 0.15;
    opacity: 0.08;
    animation: edge-pulse 8s ease-in-out infinite;
  }

  .graph-node {
    fill: var(--border-color);
    opacity: 0.1;
    animation: node-drift 12s ease-in-out infinite;
  }

  .graph-node.highlight {
    fill: var(--accent-color);
    opacity: 0.12;
    animation: highlight-pulse 6s ease-in-out infinite;
  }

  @media (max-width: 639px) {
    .graph-edge { opacity: 0.04; }
    .graph-node { opacity: 0.05; }
    .graph-node.highlight { opacity: 0.06; }
  }

  /* ====================================
     ANIMATIONS
     ==================================== */
  @keyframes slide-up-fade {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .anim-item {
    opacity: 0;
  }

  .mounted .anim-item {
    animation: slide-up-fade 300ms ease forwards;
    animation-delay: var(--anim-delay, 0ms);
  }

  /* ====================================
     HEADER
     ==================================== */
  .header {
    position: sticky;
    top: 0;
    z-index: 40;
    height: 56px;
    background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
  }

  .header-inner {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0 1.5rem;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .brand {
    text-decoration: none;
    color: inherit;
  }

  .brand-text {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .header-nav {
    display: none;
    align-items: center;
    gap: 2rem;
  }

  @media (min-width: 640px) {
    .header-nav {
      display: flex;
    }
  }

  .header-nav a {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s;
  }

  .header-nav a:hover {
    color: var(--accent-color);
  }

  .theme-toggle {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s, transform 0.2s;
    position: relative;
    flex-shrink: 0;
  }

  .theme-toggle:hover {
    border-color: var(--accent-color);
    transform: rotate(15deg);
  }

  .theme-toggle svg {
    width: 1.125rem;
    height: 1.125rem;
    color: var(--text-secondary);
    position: absolute;
    transition: opacity 0.2s, transform 0.3s;
  }

  .sun-icon { opacity: 1; }
  .moon-icon { opacity: 0; transform: rotate(-90deg); }

  :global(.dark) .sun-icon { opacity: 0; transform: rotate(90deg); }
  :global(.dark) .moon-icon { opacity: 1; transform: rotate(0); }

  /* ====================================
     HERO
     ==================================== */
  .hero {
    position: relative;
    z-index: 1;
    padding: 6rem 1.5rem 4rem;
    max-width: 72rem;
    margin: 0 auto;
    width: 100%;
  }

  .hero-content {
    text-align: center;
  }

  @media (min-width: 1024px) {
    .hero-content {
      text-align: left;
      max-width: 60%;
    }
  }

  .hero-eyebrow {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--text-secondary);
    margin: 0 0 1rem;
  }

  .hero-title {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 1.25rem;
  }

  @media (min-width: 640px) {
    .hero-title { font-size: 3rem; }
  }

  @media (min-width: 1024px) {
    .hero-title { font-size: 3.5rem; }
  }

  .hero-sub {
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0 0 2rem;
    max-width: 36rem;
  }

  @media (max-width: 1023px) {
    .hero-sub { margin-left: auto; margin-right: auto; }
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  @media (max-width: 1023px) {
    .hero-actions { justify-content: center; }
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: var(--accent-color);
    color: #fff;
    font-weight: 600;
    font-size: 0.9375rem;
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: background 0.15s, transform 0.15s;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .btn-text {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s;
  }

  .btn-text:hover {
    color: var(--accent-color);
  }

  /* ====================================
     SECTION HEADERS
     ==================================== */
  .section-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .section-header h2 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .section-header p {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* ====================================
     BOOK CATALOG
     ==================================== */
  .catalog {
    position: relative;
    z-index: 1;
    padding: 4rem 1.5rem 5rem;
    background: var(--bg-secondary);
  }

  @media (min-width: 1024px) {
    .catalog { padding: 5rem 2rem 6rem; }
  }

  .book-grid {
    max-width: 72rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .book-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ====================================
     BOOK CARDS
     ==================================== */
  .book-card {
    opacity: 0;
    animation: slide-up-fade 400ms ease forwards;
    animation-delay: calc(0.3s + var(--card-delay, 0ms));
  }

  .book-link {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--subject-color);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    height: 100%;
  }

  .book-card.clickable .book-link:hover {
    border-color: var(--subject-color);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .book-link.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .book-card-top {
    display: flex;
    justify-content: flex-end;
  }

  .book-status {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.625rem;
    border-radius: var(--radius-full);
  }

  .status-available {
    background: #dcfce7;
    color: #166534;
  }

  :global(.dark) .status-available {
    background: rgba(22, 101, 52, 0.3);
    color: #86efac;
  }

  .status-in-progress {
    background: var(--accent-light);
    color: var(--accent-color);
  }

  .status-preview {
    background: #dbeafe;
    color: #1e40af;
  }

  :global(.dark) .status-preview {
    background: rgba(59, 130, 246, 0.3);
    color: #93c5fd;
  }

  .status-coming-soon {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
  }

  .book-title {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .book-source {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .external-icon {
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
  }

  .book-progress {
    margin-top: 0.25rem;
  }

  .progress-track {
    height: 5px;
    background: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--subject-color);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .progress-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.375rem;
  }

  .book-tools {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tool-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tool-icon svg {
    width: 100%;
    height: 100%;
  }

  .book-cta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--subject-color);
    margin-top: auto;
    padding-top: 0.5rem;
  }

  /* ====================================
     PREVIEW INFO
     ==================================== */
  .book-preview-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  .preview-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #1e40af;
  }

  :global(.dark) .preview-label {
    color: #93c5fd;
  }

  .preview-note {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* ====================================
     CATALOGUE INTRO
     ==================================== */
  .catalogue-intro {
    max-width: 48rem;
    margin: 3rem auto;
    padding: 0 1.5rem;
    text-align: center;
  }

  .catalogue-intro p {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--text-secondary);
    margin: 0;
  }

  .catalogue-intro a {
    color: var(--accent-color);
    text-decoration: none;
    font-weight: 500;
  }

  .catalogue-intro a:hover {
    text-decoration: underline;
  }

  /* ====================================
     TIER 2: OPENSTAX LIBRARY
     ==================================== */
  .tier2-section {
    max-width: 72rem;
    margin: 0 auto;
    padding-top: 1rem;
  }

  .subject-group {
    margin-bottom: 2rem;
  }

  .subject-group-title {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--group-color);
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid color-mix(in srgb, var(--group-color) 20%, transparent);
  }

  .compact-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (min-width: 640px) {
    .compact-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 1024px) {
    .compact-grid { grid-template-columns: repeat(3, 1fr); }
  }

  .compact-card {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 1rem 1.25rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    transition: border-color 0.15s;
  }

  .compact-card:hover {
    border-color: var(--text-tertiary);
  }

  .compact-title {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .compact-desc {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }

  .compact-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 0.375rem;
  }

  .compact-chapters {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .compact-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s;
  }

  .compact-link:hover {
    color: var(--accent-color);
  }

  .compact-external-icon {
    width: 0.6875rem;
    height: 0.6875rem;
    flex-shrink: 0;
  }

  /* ====================================
     STUDY TOOLS SECTION
     ==================================== */
  .tools-section {
    position: relative;
    z-index: 1;
    padding: 4rem 1.5rem 5rem;
  }

  @media (min-width: 1024px) {
    .tools-section { padding: 5rem 2rem 6rem; }
  }

  .tools-grid {
    max-width: 72rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @media (min-width: 1024px) {
    .tools-grid { grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
  }

  .tool-card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    text-align: center;
  }

  .tool-card-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    transition: transform 0.2s;
  }

  .tool-card-icon svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  @media (min-width: 1024px) {
    .tool-card:hover .tool-card-icon {
      transform: scale(1.1);
    }
  }

  .tool-card h3 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.375rem;
  }

  .tool-card p {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }

  /* ====================================
     ABOUT SECTION
     ==================================== */
  .about-section {
    position: relative;
    z-index: 1;
    padding: 4rem 1.5rem 5rem;
    background: var(--bg-secondary);
  }

  @media (min-width: 1024px) {
    .about-section { padding: 5rem 2rem 6rem; }
  }

  .about-grid {
    max-width: 56rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .about-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .about-card {
    padding: 2rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
  }

  .about-card h3 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.125rem;
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

  .about-card a {
    color: var(--accent-color);
    text-decoration: none;
  }

  .about-card a:hover {
    text-decoration: underline;
  }

  .about-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--accent-color);
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
     FAQ SECTION
     ==================================== */
  .faq-section {
    position: relative;
    z-index: 1;
    padding: 4rem 1.5rem 5rem;
  }

  @media (min-width: 1024px) {
    .faq-section { padding: 5rem 2rem 6rem; }
  }

  .faq-list {
    max-width: 48rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .faq-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    transition: border-color 0.2s;
  }

  .faq-item[open] {
    border-color: color-mix(in srgb, var(--accent-color) 40%, var(--border-color));
  }

  .faq-question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    cursor: pointer;
    list-style: none;
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.15s;
  }

  .faq-question::-webkit-details-marker {
    display: none;
  }

  .faq-question:hover {
    color: var(--accent-color);
  }

  .faq-chevron {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    color: var(--text-tertiary);
    transition: transform 0.2s, color 0.2s;
  }

  .faq-item[open] .faq-chevron {
    transform: rotate(180deg);
    color: var(--accent-color);
  }

  .faq-answer {
    padding: 0 1.5rem 1.25rem;
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  .faq-answer :global(a) {
    color: var(--accent-color);
    text-decoration: none;
    font-weight: 500;
  }

  .faq-answer :global(a:hover) {
    text-decoration: underline;
  }

  /* ====================================
     FOOTER
     ==================================== */
  .footer {
    position: relative;
    z-index: 1;
    padding: 2rem 1.5rem;
    text-align: center;
    border-top: 1px solid var(--border-color);
  }

  .footer p {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    margin: 0;
    line-height: 1.6;
  }

  .footer a {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .footer a:hover {
    text-decoration: underline;
    color: var(--accent-color);
  }

  /* ====================================
     REDUCED MOTION
     ==================================== */
  @media (prefers-reduced-motion: reduce) {
    .graph-node,
    .graph-edge,
    .anim-item,
    .book-card {
      animation: none !important;
      opacity: 1 !important;
    }

    .book-link,
    .btn-primary,
    .tool-card-icon,
    .theme-toggle,
    .compact-card,
    .faq-chevron,
    .faq-item {
      transition: none !important;
    }
  }
</style>
