<!--
  Feedback Form - Námsbókasafn
  Public feedback submission for teachers and students
-->
<script lang="ts">
  import { FEEDBACK_TYPES, type FeedbackType } from '$lib/config';
  import { submitFeedback } from '$lib/utils/api';

  // Form state
  let selectedType: FeedbackType | '' = '';
  let message = '';
  let book = '';
  let chapter = '';
  let section = '';
  let userName = '';
  let userEmail = '';

  // UI state
  let isSubmitting = false;
  let submitSuccess = false;
  let submitError = '';

  async function handleSubmit() {
    // Validate
    if (!selectedType) {
      submitError = 'Vinsamlegast veldu tegund athugasemdar';
      return;
    }

    if (message.trim().length < 10) {
      submitError = 'Lýsingin verður að vera að minnsta kosti 10 stafir';
      return;
    }

    submitError = '';
    isSubmitting = true;

    const result = await submitFeedback({
      type: selectedType,
      message: message.trim(),
      book: book || undefined,
      chapter: chapter || undefined,
      section: section || undefined,
      userName: userName || undefined,
      userEmail: userEmail || undefined,
    });

    isSubmitting = false;

    if (result.success) {
      submitSuccess = true;
      // Reset form
      selectedType = '';
      message = '';
      book = '';
      chapter = '';
      section = '';
      userName = '';
      userEmail = '';
    } else {
      submitError = result.error || 'Gat ekki sent endurgjöf. Vinsamlegast reyndu aftur.';
    }
  }

  function resetForm() {
    submitSuccess = false;
    submitError = '';
  }
</script>

<svelte:head>
  <title>Endurgjöf - Námsbókasafn</title>
  <meta name="description" content="Sendu okkur endurgjöf um Námsbókasafn - villur, tillögur eða athugasemdir." />
</svelte:head>

<div class="feedback-page">
  <!-- Header -->
  <header class="feedback-header">
    <div class="container">
      <a href="/" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Til baka
      </a>
    </div>
  </header>

  <main class="feedback-content">
    <div class="container">
      {#if submitSuccess}
        <!-- Success Message -->
        <div class="success-card" on:click={resetForm} on:keypress={resetForm} role="button" tabindex="0">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Takk fyrir!</h2>
          <p>Endurgjöfin þín hefur verið móttekin. Við munum skoða hana eins fljótt og auðið er.</p>
          <button class="btn-secondary">Senda aðra endurgjöf</button>
        </div>
      {:else}
        <!-- Feedback Form -->
        <div class="form-card">
          <div class="form-header">
            <h1>Endurgjöf</h1>
            <p>Við þökkum endurgjöf frá notendum. Vinsamlegast láttu okkur vita ef þú finnur villur eða hefur tillögur að bætingum.</p>
          </div>

          <form on:submit|preventDefault={handleSubmit}>
            <!-- Error message -->
            {#if submitError}
              <div class="error-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {submitError}
              </div>
            {/if}

            <!-- Feedback Type -->
            <div class="form-group">
              <label class="form-label required">Tegund athugasemdar</label>
              <div class="type-grid">
                {#each FEEDBACK_TYPES as feedbackType}
                  <label class="type-option" class:selected={selectedType === feedbackType.value}>
                    <input
                      type="radio"
                      name="type"
                      value={feedbackType.value}
                      bind:group={selectedType}
                    />
                    <span class="type-icon">
                      {#if feedbackType.value === 'translation_error'}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
                        </svg>
                      {:else if feedbackType.value === 'technical_issue'}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      {:else if feedbackType.value === 'improvement'}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      {:else}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      {/if}
                    </span>
                    <span class="type-label">{feedbackType.label}</span>
                    <span class="type-sublabel">{feedbackType.labelEn}</span>
                  </label>
                {/each}
              </div>
            </div>

            <!-- Location (optional) -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="book">Bók (valfrjálst)</label>
                <select id="book" bind:value={book} class="form-select">
                  <option value="">-- Veldu bók --</option>
                  <option value="efnafraedi">Efnafræði</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="chapter">Kafli</label>
                <input type="text" id="chapter" bind:value={chapter} class="form-input" placeholder="t.d. 1 eða 1.2" />
              </div>
              <div class="form-group">
                <label class="form-label" for="section">Hluti</label>
                <input type="text" id="section" bind:value={section} class="form-input" placeholder="t.d. 1-1" />
              </div>
            </div>

            <!-- Message -->
            <div class="form-group">
              <label class="form-label required" for="message">Lýsing</label>
              <textarea
                id="message"
                bind:value={message}
                class="form-textarea"
                rows="5"
                placeholder="Lýstu vandamálinu eða tillögunni. Ef þetta er villa í þýðingu, vinsamlegast tilgreindu hvaða texti er rangur og hvað ætti að standa í staðinn."
                required
                minlength="10"
              ></textarea>
              <span class="form-hint">Lágmark 10 stafir</span>
            </div>

            <!-- Contact (optional) -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="userName">Nafn (valfrjálst)</label>
                <input type="text" id="userName" bind:value={userName} class="form-input" placeholder="Nafnið þitt" />
              </div>
              <div class="form-group">
                <label class="form-label" for="userEmail">Netfang (valfrjálst)</label>
                <input type="email" id="userEmail" bind:value={userEmail} class="form-input" placeholder="netfang@domain.is" />
                <span class="form-hint">Ef þú vilt fá svar</span>
              </div>
            </div>

            <!-- Submit -->
            <div class="form-actions">
              <button type="submit" class="btn-primary" disabled={isSubmitting}>
                {#if isSubmitting}
                  <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" />
                  </svg>
                  Sendir...
                {:else}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Senda endurgjöf
                {/if}
              </button>
            </div>
          </form>
        </div>

        <!-- Help Link -->
        <div class="help-link">
          <a href="/for-teachers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Leiðbeiningar fyrir kennara
          </a>
        </div>
      {/if}
    </div>
  </main>

  <!-- Footer -->
  <footer class="feedback-footer">
    <div class="container">
      <p>Námsbókasafn - Opnar kennslubækur á íslensku</p>
    </div>
  </footer>
</div>

<style>
  .feedback-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
  }

  .container {
    max-width: 42rem;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Header */
  .feedback-header {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 0;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .back-link:hover {
    color: var(--text-primary);
  }

  .back-link svg {
    width: 1rem;
    height: 1rem;
  }

  /* Content */
  .feedback-content {
    flex: 1;
    padding: 2rem 0;
  }

  /* Success Card */
  .success-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
  }

  .success-card:hover {
    border-color: var(--accent-color);
  }

  .success-icon {
    width: 4rem;
    height: 4rem;
    background: #dcfce7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
  }

  :global([data-theme="dark"]) .success-icon {
    background: rgba(22, 163, 74, 0.2);
  }

  .success-icon svg {
    width: 2rem;
    height: 2rem;
    color: #16a34a;
  }

  .success-card h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .success-card p {
    color: var(--text-secondary);
    margin: 0 0 1.5rem;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .btn-secondary:hover {
    border-color: var(--accent-color);
  }

  /* Form Card */
  .form-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1.5rem 2rem;
  }

  .form-header {
    margin-bottom: 1.5rem;
  }

  .form-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .form-header p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
  }

  /* Error message */
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  :global([data-theme="dark"]) .error-message {
    background: rgba(185, 28, 28, 0.2);
    color: #fca5a5;
  }

  .error-message svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  /* Form groups */
  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.375rem;
  }

  .form-label.required::after {
    content: ' *';
    color: #dc2626;
  }

  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 0.9rem;
    color: var(--text-primary);
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-light, rgba(37, 99, 235, 0.1));
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-hint {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  /* Type selector */
  .type-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .type-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: var(--bg-primary);
    border: 2px solid var(--border-color);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
    text-align: center;
  }

  .type-option:hover {
    border-color: var(--text-secondary);
    background: var(--bg-secondary);
  }

  .type-option.selected {
    border-color: var(--accent-color);
    background: var(--accent-light, rgba(37, 99, 235, 0.05));
  }

  .type-option input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .type-icon {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  .type-option.selected .type-icon {
    color: var(--accent-color);
  }

  .type-icon svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .type-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .type-option.selected .type-label {
    color: var(--accent-color);
  }

  .type-sublabel {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: 0.125rem;
  }

  /* Submit */
  .form-actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 2rem;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-dark, #1d4ed8);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Help link */
  .help-link {
    margin-top: 1.5rem;
    text-align: center;
  }

  .help-link a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .help-link a:hover {
    color: var(--accent-color);
  }

  .help-link svg {
    width: 1rem;
    height: 1rem;
  }

  /* Footer */
  .feedback-footer {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    padding: 1rem 0;
    text-align: center;
  }

  .feedback-footer p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .form-card {
      padding: 1rem;
    }

    .type-grid {
      grid-template-columns: 1fr;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
