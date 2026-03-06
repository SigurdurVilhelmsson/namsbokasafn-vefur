/**
 * Glossary Term Highlight Action
 *
 * Scans rendered content for <dfn class="term"> elements (placed by the
 * CNXML pipeline) and attaches hover/tap tooltips showing definitions.
 * Only semantic <dfn> tags are processed — no text-matching is performed
 * to avoid false-positive highlights on common Icelandic words.
 *
 * Term matching uses three tiers:
 * 1. data-term attribute (from pipeline, highest confidence)
 * 2. Icelandic text exact match (current behavior)
 * 3. English fallback from "(e. ...)" suffix
 */

import { browser } from '$app/environment';
import { glossaryStore } from '$lib/stores/glossary';
import { glossaryHighlighting } from '$lib/stores/settings';
import { get } from 'svelte/store';
import type { GlossaryTerm } from '$lib/types/content';
import { escapeHtml } from '$lib/utils/html';

export interface GlossaryTermsOptions {
	bookSlug: string;
}

// Intentional singleton: a single tooltip element is shared across all glossaryTerms
// action instances for performance (avoids re-creation on every action mount).
let tooltipElement: HTMLDivElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let currentSpan: HTMLElement | null = null;
let tooltipHoverSetUp = false;

// Minimum term length to mark (avoids matching noise from very short terms)
const MIN_TERM_LENGTH = 3;

/**
 * Create or get the singleton tooltip element
 */
function getOrCreateTooltip(): HTMLDivElement {
	if (tooltipElement) return tooltipElement;

	tooltipElement = document.createElement('div');
	tooltipElement.className = 'glossary-tooltip';
	tooltipElement.style.cssText = `
		position: fixed;
		z-index: 50;
		max-width: 340px;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s ease, visibility 0.15s ease;
		pointer-events: none;
	`;
	document.body.appendChild(tooltipElement);

	return tooltipElement;
}

/**
 * Position and show the tooltip near a glossary term element
 */
function showTooltip(element: HTMLElement, term: GlossaryTerm, bookSlug: string) {
	const tooltip = getOrCreateTooltip();
	currentSpan = element;

	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}

	// Read CSS custom properties from :root for theme-aware colors
	const styles = getComputedStyle(document.documentElement);
	const bgColor = styles.getPropertyValue('--bg-secondary').trim();
	const borderColor = styles.getPropertyValue('--border-color').trim();
	const textColor = styles.getPropertyValue('--text-primary').trim();
	const secondaryColor = styles.getPropertyValue('--text-secondary').trim();
	const accentColor = styles.getPropertyValue('--accent-color').trim();

	// Build English translation line
	const englishHtml = term.english
		? `<span style="font-size: 12px; color: ${secondaryColor}; font-style: italic;">${escapeHtml(term.english)}</span>`
		: '';

	// Build related terms
	let relatedHtml = '';
	if (term.relatedTerms && term.relatedTerms.length > 0) {
		const tags = term.relatedTerms
			.map(
				(r) =>
					`<span style="display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 4px; background: ${styles.getPropertyValue('--bg-tertiary').trim() || borderColor}; color: ${secondaryColor};">${escapeHtml(r)}</span>`
			)
			.join(' ');
		relatedHtml = `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;"><span style="font-size: 11px; color: ${secondaryColor};">Tengd:</span> ${tags}</div>`;
	}

	tooltip.innerHTML = `
		<div style="padding: 12px 14px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);">
			<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
				<svg style="width: 14px; height: 14px; color: ${accentColor}; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
				</svg>
				<span style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: ${accentColor};">Orðasafn</span>
			</div>
			<div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
				<span style="font-weight: 600; color: ${textColor};">${escapeHtml(term.term)}</span>
				${englishHtml}
			</div>
			<p style="margin-top: 6px; font-size: 13px; line-height: 1.5; color: ${secondaryColor};">${escapeHtml(term.definition)}</p>
			${relatedHtml}
			<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${borderColor};">
				<a href="/${bookSlug}/ordabok?search=${encodeURIComponent(term.term)}" style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: ${accentColor}; text-decoration: none;">
					<svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
					</svg>
					Opna í orðasafni
				</a>
			</div>
		</div>
	`;

	// Position tooltip below the term
	const rect = element.getBoundingClientRect();
	const padding = 16;

	let left = rect.left + rect.width / 2 - 170; // center the 340px tooltip
	let top = rect.bottom + 8;

	// Keep within viewport horizontally
	const maxLeft = window.innerWidth - 340 - padding;
	left = Math.max(padding, Math.min(left, maxLeft));

	// If tooltip would go below viewport, show above
	if (top + 200 > window.innerHeight) {
		top = rect.top - 8;
		tooltip.style.transform = 'translateY(-100%)';
	} else {
		tooltip.style.transform = 'translateY(0)';
	}

	tooltip.style.left = `${left}px`;
	tooltip.style.top = `${top}px`;
	tooltip.style.opacity = '1';
	tooltip.style.visibility = 'visible';
	tooltip.style.pointerEvents = 'auto';
}

/**
 * Hide the tooltip with a brief delay (allows mouse to reach it)
 */
function hideTooltip() {
	if (!tooltipElement) return;

	hideTimeout = setTimeout(() => {
		if (tooltipElement) {
			tooltipElement.style.opacity = '0';
			tooltipElement.style.visibility = 'hidden';
			tooltipElement.style.pointerEvents = 'none';
		}
		currentSpan = null;
	}, 150);
}

/**
 * Immediately hide the tooltip (used for click-to-dismiss)
 */
function hideTooltipImmediate() {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
	if (tooltipElement) {
		tooltipElement.style.opacity = '0';
		tooltipElement.style.visibility = 'hidden';
		tooltipElement.style.pointerEvents = 'none';
	}
	currentSpan = null;
}

/**
 * Extract English term from text containing "(e. ...)" suffix.
 * Returns null if no English suffix found.
 */
function extractEnglish(text: string): string | null {
	const marker = ' (e. ';
	const idx = text.lastIndexOf(marker);
	if (idx === -1) return null;
	// Strip trailing ")" from the English portion
	const english = text.substring(idx + marker.length).replace(/\)\s*$/, '').trim();
	return english || null;
}

/**
 * Split a composite term like "SI-einingar (Alþjóðlega einingakerfið)" into sub-parts.
 */
function splitCompositeParts(text: string): string[] {
	const parts: string[] = [];
	const parenMatch = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (parenMatch) {
		parts.push(parenMatch[1].trim());
		parts.push(parenMatch[2].trim());
	}
	return parts;
}

/**
 * Singularize a common English plural form.
 */
function singularize(word: string): string[] {
	if (word.length <= 3) return [];
	const candidates: string[] = [];
	if (/[^aeiou]ies$/i.test(word)) {
		candidates.push(word.slice(0, -3) + 'y');
	}
	if (/(?:s|x|z|ch|sh)es$/i.test(word)) {
		candidates.push(word.slice(0, -2));
		candidates.push(word.slice(0, -1));
	}
	if (candidates.length === 0 && /[^s]s$/i.test(word)) {
		candidates.push(word.slice(0, -1));
	}
	return candidates;
}

/**
 * Strip inner parentheticals from English text.
 * e.g., "alpha particles (α particles)" → "alpha particles"
 */
function stripInnerParenthetical(text: string): string {
	return text.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

/**
 * Strip the "(e. ...)" English suffix to get the Icelandic term text.
 */
function stripEnglishSuffix(text: string): string {
	const marker = ' (e. ';
	const idx = text.lastIndexOf(marker);
	return idx !== -1 ? text.substring(0, idx).trim() : text;
}

/**
 * Svelte action: scans content for <dfn class="term"> elements and adds tooltips
 */
export function glossaryTerms(node: HTMLElement, options: GlossaryTermsOptions) {
	if (!browser) {
		return { destroy: () => {} };
	}

	const { bookSlug } = options;
	let destroyed = false;
	let isProcessed = false;
	let initPending = false;

	// Track event listeners for cleanup
	let cleanupListeners: Array<() => void> = [];

	// Track processed dfn elements for toggle-off cleanup
	let processedDfnElements: HTMLElement[] = [];

	async function init() {
		if (initPending) return;
		initPending = true;

		try {
			// Load glossary (cached if already loaded for this book)
			await glossaryStore.load(bookSlug);
			if (destroyed) return;

			const state = get(glossaryStore);
			if (!state.terms.length) return;

			// Filter to terms long enough to mark, sort longest-first for lookup priority
			const validTerms = state.terms.filter((t) => t.term.length >= MIN_TERM_LENGTH);
			const sortedTerms = validTerms.sort((a, b) => b.term.length - a.term.length);

			if (!sortedTerms.length) return;

			// Build normalized Icelandic lookup map (with composite part indexing)
			const termMap = new Map<string, GlossaryTerm>();
			for (const term of sortedTerms) {
				const key = term.term.toLowerCase();
				if (!termMap.has(key)) {
					termMap.set(key, term);
				}
				for (const part of splitCompositeParts(term.term)) {
					const partKey = part.toLowerCase();
					if (!termMap.has(partKey)) {
						termMap.set(partKey, term);
					}
				}
			}

			// Build English lookup map for fallback matching (with composite part indexing)
			const englishMap = new Map<string, GlossaryTerm>();
			for (const term of sortedTerms) {
				if (term.english) {
					const key = term.english.toLowerCase();
					if (!englishMap.has(key)) {
						englishMap.set(key, term);
					}
					for (const part of splitCompositeParts(term.english)) {
						const partKey = part.toLowerCase();
						if (!englishMap.has(partKey)) {
							englishMap.set(partKey, term);
						}
					}
				}
				if (term.alternateEnglish) {
					for (const alt of term.alternateEnglish) {
						const altKey = alt.toLowerCase();
						if (!englishMap.has(altKey)) {
							englishMap.set(altKey, term);
						}
					}
				}
			}

			// Process <dfn class="term"> elements — authoritative term markers from the CNXML pipeline
			const dfnElements = node.querySelectorAll('dfn.term');
			for (const dfn of dfnElements) {
				if (destroyed) return;
				const dfnEl = dfn as HTMLElement;
				const fullText = (dfnEl.textContent || '').trim();

				// Three-tier matching:
				// 1. data-term attribute (highest confidence, from pipeline)
				// 2. Icelandic text exact match
				// 3. English fallback from "(e. ...)" suffix
				let glossaryTerm: GlossaryTerm | undefined;

				// Tier 1: data-term attribute
				const dataTerm = dfnEl.getAttribute('data-term');
				if (dataTerm) {
					glossaryTerm = termMap.get(dataTerm.toLowerCase());
				}

				// Tier 2: Icelandic text match
				if (!glossaryTerm) {
					const icelandicText = stripEnglishSuffix(fullText);
					const normalized = icelandicText.toLowerCase();
					glossaryTerm = termMap.get(normalized);
				}

				// Tier 3: English fallback (with singularization and parenthetical stripping)
				if (!glossaryTerm) {
					const english = extractEnglish(fullText);
					if (english) {
						const enLower = english.toLowerCase();
						glossaryTerm = englishMap.get(enLower);

						// Try stripping inner parentheticals
						if (!glossaryTerm) {
							const stripped = stripInnerParenthetical(enLower);
							if (stripped !== enLower) {
								glossaryTerm = englishMap.get(stripped);
								if (!glossaryTerm) {
									for (const sg of singularize(stripped)) {
										glossaryTerm = englishMap.get(sg.toLowerCase());
										if (glossaryTerm) break;
									}
								}
							}
						}

						// Try singularizing
						if (!glossaryTerm) {
							for (const sg of singularize(enLower)) {
								glossaryTerm = englishMap.get(sg.toLowerCase());
								if (glossaryTerm) break;
							}
						}
					}
				}

				if (!glossaryTerm) continue;

				dfnEl.classList.add('glossary-term');
				dfnEl.dataset.glossaryMatch = glossaryTerm.term;
				dfnEl.setAttribute('role', 'button');
				dfnEl.setAttribute('tabindex', '0');
				dfnEl.setAttribute(
					'aria-label',
					`Skilgreining: ${glossaryTerm.term}` +
						(glossaryTerm.english ? ` (${glossaryTerm.english})` : '')
				);

				processedDfnElements.push(dfnEl);

				// Desktop: hover to show
				const onEnter = () => showTooltip(dfnEl, glossaryTerm!, bookSlug);
				const onLeave = () => hideTooltip();
				const onFocus = () => showTooltip(dfnEl, glossaryTerm!, bookSlug);
				const onBlur = () => hideTooltip();

				dfnEl.addEventListener('mouseenter', onEnter);
				dfnEl.addEventListener('mouseleave', onLeave);
				dfnEl.addEventListener('focus', onFocus);
				dfnEl.addEventListener('blur', onBlur);

				// Mobile: tap to toggle tooltip
				const onClick = (e: Event) => {
					e.preventDefault();
					e.stopPropagation();
					if (currentSpan === dfnEl) {
						hideTooltipImmediate();
					} else {
						showTooltip(dfnEl, glossaryTerm!, bookSlug);
					}
				};
				dfnEl.addEventListener('click', onClick);

				cleanupListeners.push(() => {
					dfnEl.removeEventListener('mouseenter', onEnter);
					dfnEl.removeEventListener('mouseleave', onLeave);
					dfnEl.removeEventListener('focus', onFocus);
					dfnEl.removeEventListener('blur', onBlur);
					dfnEl.removeEventListener('click', onClick);
				});
			}

			isProcessed = true;
		} finally {
			initPending = false;
		}
	}

	/**
	 * Remove glossary styling and event listeners from all processed elements
	 */
	function teardown() {
		// Remove event listeners
		for (const cleanup of cleanupListeners) {
			cleanup();
		}
		cleanupListeners = [];

		// Remove glossary styling/attributes from processed dfn elements
		for (const dfnEl of processedDfnElements) {
			dfnEl.classList.remove('glossary-term');
			dfnEl.removeAttribute('data-glossary-match');
			dfnEl.removeAttribute('role');
			dfnEl.removeAttribute('tabindex');
			dfnEl.removeAttribute('aria-label');
		}
		processedDfnElements = [];

		// Hide tooltip if showing
		if (tooltipElement && currentSpan && node.contains(currentSpan)) {
			hideTooltipImmediate();
		}

		isProcessed = false;
	}

	// Keep tooltip visible when mouse enters it, and set up tap-outside-to-dismiss
	function setupTooltipHover() {
		if (tooltipHoverSetUp) return;
		const tooltip = getOrCreateTooltip();
		tooltip.addEventListener('mouseenter', () => {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}
		});
		tooltip.addEventListener('mouseleave', () => {
			hideTooltip();
		});

		// Dismiss tooltip when clicking outside (mobile tap-away)
		document.addEventListener('click', (e: MouseEvent) => {
			if (!tooltipElement || tooltipElement.style.visibility === 'hidden') return;
			const target = e.target as HTMLElement;
			// Don't dismiss if clicking inside tooltip or on a glossary term (term handles its own toggle)
			if (tooltipElement.contains(target) || target.closest('.glossary-term')) return;
			hideTooltipImmediate();
		});

		tooltipHoverSetUp = true;
	}

	setupTooltipHover();

	// Re-process glossary terms when content changes (client-side navigation
	// replaces innerHTML but doesn't remount the action)
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	const observer = new MutationObserver(() => {
		if (destroyed || !get(glossaryHighlighting)) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			if (destroyed || !get(glossaryHighlighting)) return;
			teardown();
			init();
		}, 50);
	});
	observer.observe(node, { childList: true });

	// Subscribe to glossaryHighlighting store for reactive toggle
	const unsubscribe = glossaryHighlighting.subscribe((enabled) => {
		if (enabled && !isProcessed) {
			init();
		} else if (!enabled && isProcessed) {
			teardown();
		}
	});

	return {
		destroy() {
			destroyed = true;
			if (debounceTimer) clearTimeout(debounceTimer);
			observer.disconnect();
			unsubscribe();
			teardown();
		}
	};
}
