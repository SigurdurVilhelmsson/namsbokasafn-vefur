/**
 * Glossary Term Highlight Action
 *
 * Scans rendered content for glossary terms and wraps them in
 * hoverable spans that show definition tooltips. Only marks the
 * first occurrence of each term per section to avoid clutter.
 */

import { browser } from '$app/environment';
import { glossaryStore } from '$lib/stores/glossary';
import { settings } from '$lib/stores/settings';
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
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

	const isDark = document.documentElement.classList.contains('dark');
	const bgColor = isDark ? '#1e293b' : '#ffffff';
	const borderColor = isDark ? '#334155' : '#e2e8f0';
	const textColor = isDark ? '#e2e8f0' : '#1e293b';
	const secondaryColor = isDark ? '#94a3b8' : '#64748b';
	const accentColor = isDark ? '#6ee7b7' : '#1a7d5c';

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
					`<span style="display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 4px; background: ${isDark ? '#334155' : '#f1f5f9'}; color: ${secondaryColor};">${escapeHtml(r)}</span>`
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
 * Check if a node should be skipped during text scanning
 */
function shouldSkipParent(el: Element): boolean {
	const tag = el.tagName.toLowerCase();
	const skipTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'script', 'style', 'code', 'pre'];
	if (skipTags.includes(tag)) return true;
	if (el.classList.contains('glossary-term')) return true;
	if (el.closest('.equation-wrapper, .equation-content, figcaption, .figure-caption, mjx-container, .content-block-title, .content-block-icon')) return true;
	return false;
}

/**
 * Svelte action: scans content for glossary terms and adds hover tooltips
 */
export function glossaryTerms(node: HTMLElement, options: GlossaryTermsOptions) {
	if (!browser) {
		return { destroy: () => {} };
	}

	const { bookSlug } = options;
	let destroyed = false;

	async function init() {
		// Check if glossary highlighting is enabled
		const settingsState = get(settings);
		if (!settingsState.glossaryHighlighting) return;

		// Load glossary (cached if already loaded for this book)
		await glossaryStore.load(bookSlug);
		if (destroyed) return;

		const state = get(glossaryStore);
		if (!state.terms.length) return;

		// Filter to terms long enough to mark, sort longest-first for regex priority
		const validTerms = state.terms.filter((t) => t.term.length >= MIN_TERM_LENGTH);
		const sortedTerms = validTerms.sort((a, b) => b.term.length - a.term.length);

		if (!sortedTerms.length) return;

		// Build normalized lookup map
		const termMap = new Map<string, GlossaryTerm>();
		for (const term of sortedTerms) {
			const key = term.term.toLowerCase();
			if (!termMap.has(key)) {
				termMap.set(key, term);
			}
		}

		// Build a single regex with all terms, using Unicode-aware word boundaries
		const escaped = sortedTerms.map((t) => escapeRegex(t.term));
		let pattern: RegExp;
		try {
			pattern = new RegExp(`(?<!\\p{L})(${escaped.join('|')})(?!\\p{L})`, 'giu');
		} catch {
			// Fallback for environments without Unicode lookbehind
			pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
		}

		// Track first occurrence only
		const markedTerms = new Set<string>();

		// Collect text nodes using TreeWalker
		const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
			acceptNode(textNode: Text) {
				const parent = textNode.parentElement;
				if (!parent) return NodeFilter.FILTER_REJECT;
				if (shouldSkipParent(parent)) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			}
		});

		const textNodes: Text[] = [];
		let current: Text | null;
		while ((current = walker.nextNode() as Text | null)) {
			textNodes.push(current);
		}

		// Process each text node
		for (const textNode of textNodes) {
			if (destroyed) return;

			const text = textNode.textContent || '';
			if (!text.trim()) continue;

			pattern.lastIndex = 0;
			const matches: { index: number; length: number; term: GlossaryTerm }[] = [];
			let match: RegExpExecArray | null;

			while ((match = pattern.exec(text)) !== null) {
				const matchedText = match[1];
				const normalized = matchedText.toLowerCase();

				if (markedTerms.has(normalized)) continue;

				const glossaryTerm = termMap.get(normalized);
				if (!glossaryTerm) continue;

				matches.push({
					index: match.index,
					length: matchedText.length,
					term: glossaryTerm
				});
				markedTerms.add(normalized);
			}

			if (matches.length === 0) continue;

			// Build a document fragment replacing the text node
			const fragment = document.createDocumentFragment();
			let lastIndex = 0;

			for (const m of matches) {
				// Text before this match
				if (m.index > lastIndex) {
					fragment.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
				}

				// Wrapped glossary term
				const span = document.createElement('span');
				span.className = 'glossary-term';
				span.textContent = text.slice(m.index, m.index + m.length);
				span.dataset.term = m.term.term;
				span.setAttribute('role', 'button');
				span.setAttribute('tabindex', '0');
				span.setAttribute(
					'aria-label',
					`Skilgreining: ${m.term.term}` + (m.term.english ? ` (${m.term.english})` : '')
				);

				span.addEventListener('mouseenter', () => showTooltip(span, m.term, bookSlug));
				span.addEventListener('mouseleave', () => hideTooltip());
				span.addEventListener('focus', () => showTooltip(span, m.term, bookSlug));
				span.addEventListener('blur', () => hideTooltip());

				fragment.appendChild(span);
				lastIndex = m.index + m.length;
			}

			// Remaining text after last match
			if (lastIndex < text.length) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
			}

			textNode.parentNode?.replaceChild(fragment, textNode);
		}
	}

	// Keep tooltip visible when mouse enters it
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
		tooltipHoverSetUp = true;
	}

	setupTooltipHover();
	init();

	return {
		destroy() {
			destroyed = true;

			// Hide tooltip if it's showing for a term in this node
			if (tooltipElement && currentSpan && node.contains(currentSpan)) {
				hideTooltip();
			}
		}
	};
}
