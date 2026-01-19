<!--
  Teacher Guide - Námsbókasafn
  Information page for teachers using the textbooks in the pilot
-->
<script lang="ts">
  import { settings } from '$lib/stores/settings';
</script>

<svelte:head>
  <title>Leiðbeiningar fyrir kennara - Námsbókasafn</title>
  <meta name="description" content="Handbók um notkun íslenskra kennslubóka frá Námsbókasafni fyrir kennara og nemendur." />
</svelte:head>

<div class="guide-page">
  <!-- Header -->
  <header class="guide-header">
    <div class="container">
      <a href="/" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Til baka
      </a>
      <h1>Leiðbeiningar fyrir kennara</h1>
      <p class="subtitle">Handbók um notkun íslenskra kennslubóka frá Námsbókasafni</p>
    </div>
  </header>

  <main class="guide-content">
    <div class="container">
      <!-- Table of Contents -->
      <nav class="toc">
        <h2>Efnisyfirlit</h2>
        <ul>
          <li><a href="#access">Aðgangur að efni</a></li>
          <li><a href="#content-status">Staða efnis</a></li>
          <li><a href="#quality">Gæði þýðinga</a></li>
          <li><a href="#feedback">Tilkynna villur</a></li>
          <li><a href="#support">Stuðningur</a></li>
        </ul>
      </nav>

      <!-- Section: Access -->
      <section class="section" id="access">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          Aðgangur að efni
        </h2>

        <p>Námsbókasafn býður upp á opnar kennslubækur á íslensku. Efnið er aðgengilegt öllum án innskráningar.</p>

        <a href="/efnafraedi" class="book-link">
          <div class="book-icon chemistry">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 3h6v6l3 9H6l3-9V3z" />
              <path d="M9 3h6" />
            </svg>
          </div>
          <div class="book-info">
            <strong>Efnafræði</strong>
            <span>Kaflar 1-4 tiltækir</span>
          </div>
          <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </a>

        <div class="highlight-box">
          <p><strong>Fyrir nemendur:</strong> Þeir geta opnað efnið beint í vafra sínum. Engin innskráning eða niðurhal nauðsynleg.</p>
          <p><strong>Offline aðgangur:</strong> Síðan virkar sem PWA (Progressive Web App) og hægt er að bæta henni við heimaskjá síma.</p>
        </div>

        <h3>Beintenglar á kafla</h3>
        <p>Þú getur deilt beintengla á sérstaka kafla með nemendum:</p>
        <ul class="link-list">
          <li><code>/efnafraedi/kafli/1</code> - Kafli 1: Grunnhugtök</li>
          <li><code>/efnafraedi/kafli/2</code> - Kafli 2: Atóm, sameindir og jónir</li>
          <li><code>/efnafraedi/kafli/3</code> - Kafli 3: Efnatengi og sameindagerð</li>
          <li><code>/efnafraedi/kafli/4</code> - Kafli 4: Efnaformúlur</li>
        </ul>
      </section>

      <!-- Section: Content Status -->
      <section class="section" id="content-status">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Staða efnis
        </h2>

        <p>Efnið er á mismunandi stigum yfirferðar. Hér er yfirlit yfir núverandi stöðu:</p>

        <table class="status-table">
          <thead>
            <tr>
              <th>Kafli</th>
              <th>Titill</th>
              <th>Staða</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Grunnhugtök efnafræðinnar</td>
              <td><span class="status-badge reviewed">Yfirfarið</span></td>
            </tr>
            <tr>
              <td>2</td>
              <td>Atóm, sameindir og jónir</td>
              <td><span class="status-badge mt">Vélþýtt</span></td>
            </tr>
            <tr>
              <td>3</td>
              <td>Efnatengi og sameindagerð</td>
              <td><span class="status-badge mt">Vélþýtt</span></td>
            </tr>
            <tr>
              <td>4</td>
              <td>Efnaformúlur og mólmassi</td>
              <td><span class="status-badge mt">Vélþýtt</span></td>
            </tr>
          </tbody>
        </table>

        <div class="highlight-box warning">
          <p><strong>Athugið:</strong> Kaflar merktir sem "Vélþýtt" hafa ekki verið yfirfarnir af mönnum. Þeir geta innihaldið þýðingarvillur. Vinsamlegast tilkynna villur gegnum endurgjafar eyðublaðið.</p>
        </div>
      </section>

      <!-- Section: Quality -->
      <section class="section" id="quality">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Gæði þýðinga
        </h2>

        <h3>Yfirfarið efni</h3>
        <p>Kaflar merktir sem "Yfirfarið" hafa verið:</p>
        <ul>
          <li>Þýddir af vélþýðingakerfi</li>
          <li>Yfirfarnir af íslenskum fagaðila</li>
          <li>Staðfestir fyrir íslenskan fræðaheimild</li>
        </ul>

        <h3>Vélþýtt efni</h3>
        <p>Kaflar merktir sem "Vélþýtt" nota háþróaða vélþýðingu en hafa ekki verið yfirfarnir af mönnum. Þetta þýðir:</p>
        <ul>
          <li>Efnið er lesanlegt og nothæft til náms</li>
          <li>Hugsanlegar villur í fagheitum eða orðalagi</li>
          <li>Sumar setningar geta verið óljósar</li>
          <li>Mælt er með því að nota enska útgáfu sem viðmið ef vafi leikur á</li>
        </ul>

        <div class="highlight-box">
          <p><strong>Enska upprunaútgáfan</strong> er alltaf tiltæk á <a href="https://openstax.org/details/books/chemistry-2e" target="_blank" rel="noopener noreferrer">OpenStax.org</a> ef þörf er á að staðfesta efni.</p>
        </div>
      </section>

      <!-- Section: Feedback -->
      <section class="section" id="feedback">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Tilkynna villur
        </h2>

        <p>Ef þú finnur villu í þýðingu eða tæknilegt vandamál, vinsamlegast láttu okkur vita:</p>

        <a href="/feedback" class="feedback-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Senda endurgjöf
        </a>

        <h3>Hvað á að tilkynna</h3>
        <ul>
          <li><strong>Þýðingarvillur:</strong> Rangur texti, óljóst orðalag, röng fagheiti</li>
          <li><strong>Tæknilegar villur:</strong> Síða hleðst ekki, myndir birtast ekki, tenglar virka ekki</li>
          <li><strong>Tillögur:</strong> Hugmyndir að bætingum á efni eða framsetningu</li>
        </ul>

        <p>Þegar þú tilkynnir villu, vinsamlegast tilgreindu:</p>
        <ol>
          <li>Hvaða kafla/hluta vandamálið er í</li>
          <li>Hvað er rangt (t.d. "orðið X ætti að vera Y")</li>
          <li>Netfang ef þú vilt fá svar (valfrjálst)</li>
        </ol>
      </section>

      <!-- Section: Support -->
      <section class="section" id="support">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Stuðningur
        </h2>

        <p>Við erum til staðar til að hjálpa meðan á tilraunaverkefninu stendur.</p>

        <div class="contact-grid">
          <div class="contact-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <h4>Tölvupóstur</h4>
            <a href="mailto:namsbokasafn@gmail.com">namsbokasafn@gmail.com</a>
          </div>
          <div class="contact-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <h4>Endurgjöf</h4>
            <a href="/feedback">Opna eyðublað</a>
          </div>
        </div>

        <h3>Svartími</h3>
        <ul>
          <li><strong>Alvarlegar villur</strong> (síða virkar ekki): Innan 4 klukkustunda á virkum dögum</li>
          <li><strong>Þýðingarvillur:</strong> Staðfesting innan 24 klukkustunda, lagfæring innan viku</li>
          <li><strong>Tillögur:</strong> Skoðað og bætt við verkefnalista</li>
        </ul>

        <div class="highlight-box">
          <p><strong>Um verkefnið:</strong> Námsbókasafn er samstarfsverkefni til að þýða opnar kennslubækur á íslensku. Upprunalegt efni kemur frá OpenStax, sem býður upp á ókeypis ritrýndar háskólabækur undir Creative Commons leyfi.</p>
        </div>
      </section>
    </div>
  </main>

  <!-- Footer -->
  <footer class="guide-footer">
    <div class="container">
      <p>Námsbókasafn - Opnar kennslubækur á íslensku</p>
      <p>Upprunalegt efni frá <a href="https://openstax.org" target="_blank" rel="noopener noreferrer">OpenStax</a> - CC BY 4.0</p>
    </div>
  </footer>
</div>

<style>
  .guide-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
  }

  .container {
    max-width: 48rem;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Header */
  .guide-header {
    background: var(--accent-color);
    color: white;
    padding: 2rem 0;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .back-link:hover {
    color: white;
  }

  .back-link svg {
    width: 1rem;
    height: 1rem;
  }

  .guide-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .subtitle {
    font-size: 1rem;
    opacity: 0.9;
    margin: 0;
  }

  /* Content */
  .guide-content {
    flex: 1;
    padding: 2rem 0;
  }

  /* TOC */
  .toc {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1.25rem;
    margin-bottom: 2rem;
  }

  .toc h2 {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.75rem;
  }

  .toc ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .toc a {
    color: var(--accent-color);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .toc a:hover {
    text-decoration: underline;
  }

  /* Sections */
  .section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .section h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem;
  }

  .section h2 svg {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--accent-color);
  }

  .section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 1.5rem 0 0.5rem;
  }

  .section p {
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0 0 1rem;
  }

  .section ul, .section ol {
    margin: 0 0 1rem;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .section li {
    margin-bottom: 0.5rem;
  }

  .section a {
    color: var(--accent-color);
  }

  /* Book link */
  .book-link {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
    margin-bottom: 1rem;
  }

  .book-link:hover {
    border-color: var(--accent-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .book-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .book-icon.chemistry {
    background: linear-gradient(135deg, #dbeafe, #3b82f6);
  }

  .book-icon svg {
    width: 1.5rem;
    height: 1.5rem;
    color: white;
  }

  .book-info {
    flex: 1;
  }

  .book-info strong {
    display: block;
    color: var(--text-primary);
  }

  .book-info span {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .book-link .arrow {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--text-secondary);
  }

  .book-link:hover .arrow {
    color: var(--accent-color);
  }

  /* Highlight boxes */
  .highlight-box {
    background: var(--accent-light, rgba(37, 99, 235, 0.1));
    border-left: 4px solid var(--accent-color);
    padding: 1rem 1.25rem;
    border-radius: 0 0.375rem 0.375rem 0;
    margin: 1rem 0;
  }

  .highlight-box.warning {
    background: #fef3c7;
    border-left-color: #d97706;
  }

  :global([data-theme="dark"]) .highlight-box.warning {
    background: rgba(217, 119, 6, 0.15);
  }

  .highlight-box p {
    margin: 0;
    color: var(--text-primary);
  }

  .highlight-box p + p {
    margin-top: 0.5rem;
  }

  /* Link list */
  .link-list {
    list-style: none;
    padding: 0;
  }

  .link-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .link-list li:last-child {
    border-bottom: none;
  }

  .link-list code {
    background: var(--bg-primary);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: var(--accent-color);
  }

  /* Status table */
  .status-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    margin: 1rem 0;
  }

  .status-table th,
  .status-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .status-table th {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .status-table td {
    color: var(--text-primary);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.reviewed {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.mt {
    background: #fef3c7;
    color: #92400e;
  }

  :global([data-theme="dark"]) .status-badge.reviewed {
    background: rgba(22, 163, 74, 0.2);
    color: #86efac;
  }

  :global([data-theme="dark"]) .status-badge.mt {
    background: rgba(217, 119, 6, 0.2);
    color: #fcd34d;
  }

  /* Feedback link */
  .feedback-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--accent-color);
    color: white;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
    margin: 1rem 0;
  }

  .feedback-link:hover {
    background: var(--accent-dark, #1d4ed8);
  }

  .feedback-link svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Contact grid */
  .contact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .contact-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
  }

  .contact-card svg {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--accent-color);
    margin-bottom: 0.5rem;
  }

  .contact-card h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.25rem;
  }

  .contact-card a {
    font-size: 0.875rem;
    color: var(--accent-color);
    text-decoration: none;
  }

  .contact-card a:hover {
    text-decoration: underline;
  }

  /* Footer */
  .guide-footer {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    padding: 1.5rem 0;
    text-align: center;
  }

  .guide-footer p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0 0 0.25rem;
  }

  .guide-footer a {
    color: var(--accent-color);
    text-decoration: none;
  }

  .guide-footer a:hover {
    text-decoration: underline;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .guide-header h1 {
      font-size: 1.5rem;
    }

    .section {
      padding: 1rem;
    }

    .toc ul {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
