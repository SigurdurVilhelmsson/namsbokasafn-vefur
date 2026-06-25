<!--
  Landing Page - Námsbókasafn
  Nordic Clarity Design
-->
<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import BookCover from '$lib/components/BookCover.svelte';
  import LicenceBadge from '$lib/components/LicenceBadge.svelte';
  import type { PageData } from './$types';
  import type { CatalogueEntry, SubjectGroup } from '$lib/data/openstax-catalogue';
  import { faqItems } from '$lib/data/faq';
  import { roster, rosterNote } from '$lib/data/about';

  let { data }: { data: PageData } = $props();
  let translationBooks = $derived(data.translationBooks);
  let sampleBooks = $derived(data.sampleBooks);
  let tier2Groups = $derived(data.tier2Groups as Record<string, CatalogueEntry[]>);
  let subjectGroups = $derived(data.subjectGroups as SubjectGroup[]);
  let mounted = $state(false);

  const subjectIcons: Record<string, string> = {
    'efnafraedi-2e': 'chemistry',
    'liffraedi-2e': 'biology',
    'orverufraedi': 'biology',
    'lifraen-efnafraedi': 'chemistry',
    'edlisfraedi-2e': 'physics'
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
  <link rel="canonical" href="https://namsbokasafn.is/" />
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
        <span class="sun-icon"><Icon name="sun" size="sm" /></span>
        <span class="moon-icon"><Icon name="moon" size="sm" /></span>
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
      <!-- Alternative tagline the editor may swap in later:
           "Þýtt með íslenskri vélþýðingu (Erlendur) og ritstýrt af kennurum með fagþekkingu." -->
      <p class="hero-credit anim-item" style="--anim-delay: 250ms">
        Vélþýtt og yfirlesið af starfandi raungreinakennurum.
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
      {#each translationBooks as book, index (book.id)}
        {@const percentage = book.stats ? Math.round((book.stats.translatedChapters / book.stats.totalChapters) * 100) : 0}
        {@const subject = subjectIcons[book.slug] || 'book'}

        <article
          class="book-card clickable"
          style="--subject-color: var(--subject-{subject}, #6b7280); --card-delay: {index * 100}ms"
        >
          <a href="/{book.slug}" class="book-link">
            <BookCover {book} {subject} />
            <div class="book-caption">
              <h3 class="book-name">{book.title}</h3>
              {#if book.stats}
                <div class="progress-track">
                  <div class="progress-fill" style="width: {percentage}%"></div>
                </div>
              {/if}
              <div class="caption-row">
                <span class="caption-meta">
                  {#if book.stats}{book.stats.translatedChapters}/{book.stats.totalChapters} kaflar{/if}
                </span>
                <span
                  class="book-status"
                  class:status-available={book.status === 'available'}
                  class:status-in-progress={book.status === 'in-progress'}
                >
                  {book.status === 'available' ? 'Í boði' : 'Í vinnslu'}
                </span>
              </div>
              <div class="caption-row caption-licence">
                <LicenceBadge code={book.attribution.derivativeLicence} />
              </div>
            </div>
          </a>
        </article>
      {/each}
    </div>

    {#if sampleBooks.length > 0}
      <div class="section-header samples-header">
        <h2>Sýnishorn</h2>
        <p>Vélþýddir kaflar til kynningar</p>
      </div>

      <div class="book-grid">
        {#each sampleBooks as book, index (book.id)}
          {@const subject = subjectIcons[book.slug] || 'book'}

          <article
            class="book-card clickable"
            style="--subject-color: var(--subject-{subject}, #6b7280); --card-delay: {index * 100}ms"
          >
            <a href="/{book.slug}" class="book-link">
              <BookCover {book} {subject} />
              <div class="book-caption">
                <h3 class="book-name">{book.title}</h3>
                <div class="caption-row">
                  <span class="caption-meta">{book.stats?.translatedChapters ?? 1} kafli í forskoðun</span>
                  <span class="book-status status-preview">Forskoðun</span>
                </div>
                <div class="caption-row caption-licence">
                  <LicenceBadge code={book.attribution.derivativeLicence} />
                </div>
              </div>
            </a>
          </article>
        {/each}
      </div>
    {/if}

    <!-- Intro paragraph between tiers -->
    <div class="catalogue-intro">
      <p>
        Þýðingarnar okkar byggjast á opnum kennslubókum frá
        <a href="https://openstax.org" target="_blank" rel="noopener noreferrer">OpenStax</a>,
        gefnar út af Rice University undir Creative Commons leyfum. Leyfið er mismunandi eftir
        bók — sjá leyfismerki hverrar bókar hér að ofan og leyfissíðu hennar. Hér fyrir neðan eru
        allar námsbækur OpenStax.
        Hafðu samband á
        <a href="mailto:sigurdur@namsbokasafn.is">sigurdur@namsbokasafn.is</a>
        ef þú vilt leggja verkefninu lið.
      </p>
    </div>

    <!-- Tier 2: OpenStax library -->
    <div class="tier2-section">
      <div class="section-header">
        <h2>OpenStax safnið</h2>
        <p>Allar námsbækur frá OpenStax</p>
      </div>

      {#each activeTier2Groups as group (group.key)}
        {@const entries = tier2Groups[group.key]}

        <details class="subject-accordion" style="--group-color: var(--subject-{group.key}, #6b7280)">
          <summary class="subject-accordion-header">
            <span class="subject-accordion-title">{group.label}</span>
            <span class="subject-accordion-count">{entries.length} {entries.length === 1 ? 'bók' : 'bækur'}</span>
            <span class="subject-accordion-chevron"><Icon name="chevron-down" size="md" /></span>
          </summary>

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
                    <Icon name="external-link" size="sm" class="compact-external-icon" />
                  </a>
                </div>
              </article>
            {/each}
          </div>
        </details>
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
          <Icon name="credit-card" size="md" style="color: var(--accent-color)" />
        </div>
        <h3>Minniskort</h3>
        <p>Endurtekningarkerfi sem aðlagar sig að þér</p>
      </div>

      <!-- Orðasafn -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--accent-color) 12%, transparent)">
          <Icon name="book-open" size="md" style="color: var(--accent-color)" />
        </div>
        <h3>Orðasafn</h3>
        <p>Smelltu á hugtök til að sjá skilgreiningar</p>
      </div>

      <!-- Próf -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--subject-math) 12%, transparent)">
          <Icon name="clipboard-check" size="md" style="color: var(--subject-math)" />
        </div>
        <h3>Próf</h3>
        <p>Aðlöguð verkefni til að prófa þekkingu</p>
      </div>

      <!-- Framvinda -->
      <div class="tool-card">
        <div class="tool-card-icon" style="background-color: color-mix(in srgb, var(--subject-biology) 12%, transparent)">
          <Icon name="chart-column" size="md" style="color: var(--subject-biology)" />
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
        <h3>Um verkefnið</h3>
        <p>
          Námsbókasafn er sjálfstætt verkefni unnið af starfandi
          framhaldsskólakennurum. Markmiðið er að gera hágæða raungreinaefni
          aðgengilegt öllum íslenskum nemendum, gjaldfrjálst og á móðurmálinu.
        </p>
        <p>
          Efnið er þýtt með aðstoð gervigreindar og yfirlesið af kennurum með
          sérþekkingu á viðkomandi grein. Verkefnið hófst í efnafræði og nær nú
          einnig til líffræði og fleiri raungreina.
        </p>
      </div>
      <div class="about-card">
        <h3>OpenStax og Rice University</h3>
        <p>
          Þýðingarnar byggjast á opnum kennslubókum frá OpenStax,
          gefnar út af Rice University undir Creative Commons leyfum. Leyfið er mismunandi eftir
          bók (CC BY 4.0 eða CC BY-NC-SA 4.0) — sjá leyfissíðu hverrar bókar. Námsbókasafn er
          sjálfstætt verkefni og ekki tengt OpenStax.
        </p>
        <a href="https://openstax.org" target="_blank" rel="noopener noreferrer" class="about-link">
          Heimsækja OpenStax
          <Icon name="external-link" size="sm" />
        </a>
      </div>
    </div>

    <!-- Project roster -->
    <div class="roster-card">
      <h3>Aðstandendur</h3>
      <ul class="roster-list">
        {#each roster as member (member.name)}
          <li class="roster-item">
            <span class="roster-name">{member.name}</span>
            <span class="roster-detail">{member.detail}</span>
            <a class="roster-email" href="mailto:{member.email}">{member.email}</a>
          </li>
        {/each}
      </ul>
      <p class="roster-note">{rosterNote}</p>
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
            <span class="faq-chevron"><Icon name="chevron-down" size="md" /></span>
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

  .theme-toggle .sun-icon,
  .theme-toggle .moon-icon {
    position: absolute;
    display: inline-flex;
    color: var(--text-secondary);
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

  .hero-credit {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--accent-color);
    margin: -1.25rem 0 2rem;
    max-width: 36rem;
  }

  @media (max-width: 1023px) {
    .hero-credit { margin-left: auto; margin-right: auto; }
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

  .samples-header {
    margin-top: 3rem;
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
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.75rem 1.4rem;
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
    gap: 0.7rem;
    text-decoration: none;
    color: inherit;
  }

  .book-card.clickable .book-link:hover :global(.book-cover) {
    transform: translateY(-3px);
    box-shadow: var(--shadow-xl);
  }

  .book-card :global(.book-cover) {
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .book-caption {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .book-name {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .caption-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .caption-licence {
    margin-top: 0.4rem;
    justify-content: flex-start;
  }

  .caption-meta {
    font-size: 0.72rem;
    color: var(--text-secondary);
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

  .subject-accordion {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    margin-bottom: 0.75rem;
    transition: border-color 0.2s;
  }

  .subject-accordion[open] {
    border-color: color-mix(in srgb, var(--group-color) 40%, var(--border-color));
  }

  .subject-accordion-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    cursor: pointer;
    list-style: none;
    transition: color 0.15s;
  }

  .subject-accordion-header::-webkit-details-marker {
    display: none;
  }

  .subject-accordion-header:hover {
    color: var(--group-color);
  }

  .subject-accordion-title {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--group-color);
  }

  .subject-accordion-count {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-tertiary);
    background: color-mix(in srgb, var(--group-color) 10%, transparent);
    padding: 0.125rem 0.625rem;
    border-radius: 999px;
    margin-left: auto;
  }

  .subject-accordion-chevron {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--text-tertiary);
    transition: transform 0.2s, color 0.2s;
  }

  .subject-accordion[open] .subject-accordion-chevron {
    transform: rotate(180deg);
    color: var(--group-color);
  }

  .compact-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 0 1.25rem 1.25rem;
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

  .about-card p + p {
    margin-top: 0.75rem;
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

  /* ====================================
     PROJECT ROSTER
     ==================================== */
  .roster-card {
    max-width: 56rem;
    margin: 1.5rem auto 0;
    padding: 2rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
  }

  .roster-card h3 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem;
  }

  .roster-list {
    list-style: none;
    margin: 0 0 1.25rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .roster-item {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .roster-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .roster-name::after {
    content: " — ";
    color: var(--text-tertiary);
  }

  .roster-email {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.875rem;
    color: var(--accent-color);
    text-decoration: none;
  }

  .roster-email:hover {
    text-decoration: underline;
  }

  .roster-note {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
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
    display: inline-flex;
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

    .book-card :global(.book-cover),
    .btn-primary,
    .tool-card-icon,
    .theme-toggle,
    .compact-card,
    .subject-accordion,
    .subject-accordion-chevron,
    .faq-chevron,
    .faq-item {
      transition: none !important;
    }
  }
</style>
