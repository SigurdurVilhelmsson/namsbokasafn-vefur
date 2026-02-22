/**
 * Cross-Reference Hover Preview Action
 *
 * Adds hover tooltips to cross-reference links showing previews of
 * equations, figures, tables, and other referenced content.
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { referenceStore, type ReferenceType, type ReferenceItem, getReferenceUrl } from '$lib/stores/reference';

export interface CrossReferenceOptions {
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
	chapterNumber: number;
	content: string;
}

// Labels for each reference type (Icelandic)
const TYPE_LABELS: Record<ReferenceType, string> = {
	sec: 'Kafli',
	eq: 'Jafna',
	fig: 'Mynd',
	tbl: 'Tafla',
	def: 'Skilgreining'
};

// Icons for each reference type
const TYPE_ICONS: Record<ReferenceType, string> = {
	sec: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
	eq: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>`,
	fig: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
	tbl: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`,
	def: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`
};

// Intentional singleton: a single tooltip element is shared across all crossReferences
// action instances for performance (avoids re-creation on every action mount).
let tooltipElement: HTMLDivElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let currentLink: HTMLElement | null = null;

/**
 * Create or get the tooltip element
 */
function getOrCreateTooltip(): HTMLDivElement {
	if (tooltipElement) return tooltipElement;

	tooltipElement = document.createElement('div');
	tooltipElement.className = 'cross-ref-tooltip';
	tooltipElement.style.cssText = `
		position: fixed;
		z-index: 50;
		max-width: 320px;
		padding: 0;
		border-radius: 8px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s ease, visibility 0.15s ease;
		pointer-events: none;
		font-size: 14px;
	`;
	document.body.appendChild(tooltipElement);

	return tooltipElement;
}

/**
 * Show tooltip for a reference
 */
function showTooltip(link: HTMLElement, ref: ReferenceItem, bookSlug: string) {
	const tooltip = getOrCreateTooltip();
	currentLink = link;

	// Clear any pending hide
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}

	const icon = TYPE_ICONS[ref.type];
	const typeLabel = TYPE_LABELS[ref.type];
	const url = getReferenceUrl(bookSlug, ref);

	// Build tooltip content
	let previewHtml = '';
	if (ref.preview) {
		if (ref.type === 'eq') {
			// For equations, show the preview as code-like text
			previewHtml = `<div style="font-family: 'Fira Code', monospace; font-size: 12px; color: var(--text-secondary); padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(ref.preview)}</div>`;
		} else {
			previewHtml = `<p style="margin-top: 8px; color: var(--text-secondary); font-size: 13px; line-height: 1.4;">${escapeHtml(ref.preview)}</p>`;
		}
	}

	const isDark = document.documentElement.classList.contains('dark');
	const bgColor = isDark ? '#1e293b' : '#ffffff';
	const borderColor = isDark ? '#334155' : '#e2e8f0';
	const textColor = isDark ? '#e2e8f0' : '#1e293b';
	const labelColor = isDark ? '#94a3b8' : '#64748b';
	const accentColor = isDark ? '#6ee7b7' : '#1a7d5c';

	tooltip.innerHTML = `
		<div style="padding: 12px 14px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px;">
			<div style="display: flex; align-items: center; gap: 8px; color: ${accentColor};">
				${icon}
				<span style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">${typeLabel}</span>
			</div>
			<div style="margin-top: 8px; font-weight: 600; color: ${textColor};">${escapeHtml(ref.label)}</div>
			${ref.title && ref.title !== ref.label ? `<div style="margin-top: 4px; color: ${labelColor}; font-size: 13px;">${escapeHtml(ref.title)}</div>` : ''}
			${previewHtml}
			<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${borderColor}; display: flex; align-items: center; gap: 6px; color: ${accentColor}; font-size: 12px;">
				<svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
				</svg>
				<span>Smelltu til að fara í</span>
			</div>
		</div>
	`;

	// Position tooltip
	const rect = link.getBoundingClientRect();
	const tooltipRect = tooltip.getBoundingClientRect();

	let left = rect.left + rect.width / 2;
	let top = rect.bottom + 8;

	// Ensure tooltip stays in viewport
	const padding = 16;
	const maxLeft = window.innerWidth - 320 - padding;
	left = Math.max(padding, Math.min(left - 160, maxLeft));

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
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
	if (!tooltipElement) return;

	hideTimeout = setTimeout(() => {
		if (tooltipElement) {
			tooltipElement.style.opacity = '0';
			tooltipElement.style.visibility = 'hidden';
		}
		currentLink = null;
	}, 100);
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Svelte action for cross-reference hover previews
 */
export function crossReferences(node: HTMLElement, options: CrossReferenceOptions) {
	if (!browser) {
		return { destroy: () => {} };
	}

	const { bookSlug, chapterSlug, sectionSlug, chapterNumber, content } = options;

	// Build reference index from content
	referenceStore.buildIndexFromContent(chapterSlug, sectionSlug, content, chapterNumber);

	let links = node.querySelectorAll<HTMLAnchorElement>('a.cross-reference');

	function handleMouseEnter(event: MouseEvent) {
		const link = event.currentTarget as HTMLAnchorElement;
		const refType = link.dataset.refType as ReferenceType;
		const refId = link.dataset.refId;

		if (!refType || !refId) return;

		const ref = referenceStore.getReference(refType, refId);
		if (ref) {
			showTooltip(link, ref, bookSlug);
		}
	}

	function handleMouseLeave() {
		hideTooltip();
	}

	function handleClick(event: MouseEvent) {
		const link = event.currentTarget as HTMLAnchorElement;
		const refType = link.dataset.refType as ReferenceType;
		const refId = link.dataset.refId;

		if (!refType || !refId) return;

		const ref = referenceStore.getReference(refType, refId);
		if (ref) {
			event.preventDefault();
			const url = getReferenceUrl(bookSlug, ref);
			// Use SvelteKit's goto for client-side navigation
			goto(url);
		}
	}

	function removeListeners(linkList: NodeListOf<HTMLAnchorElement>) {
		linkList.forEach((link) => {
			link.removeEventListener('mouseenter', handleMouseEnter);
			link.removeEventListener('mouseleave', handleMouseLeave);
			link.removeEventListener('click', handleClick);
		});
	}

	function addListeners(linkList: NodeListOf<HTMLAnchorElement>) {
		linkList.forEach((link) => {
			link.addEventListener('mouseenter', handleMouseEnter);
			link.addEventListener('mouseleave', handleMouseLeave);
			link.addEventListener('click', handleClick);

			// Update link text with reference label
			const refType = link.dataset.refType as ReferenceType;
			const refId = link.dataset.refId;
			if (refType && refId) {
				const ref = referenceStore.getReference(refType, refId);
				if (ref) {
					link.textContent = ref.label;
				}
			}
		});
	}

	// Add event listeners
	addListeners(links);

	return {
		update(newOptions: CrossReferenceOptions) {
			// Rebuild index if content changes
			if (newOptions.content !== options.content) {
				referenceStore.buildIndexFromContent(
					newOptions.chapterSlug,
					newOptions.sectionSlug,
					newOptions.content,
					newOptions.chapterNumber
				);
			}

			// Remove listeners from old links, re-query, and attach to new ones
			removeListeners(links);
			links = node.querySelectorAll<HTMLAnchorElement>('a.cross-reference');
			addListeners(links);
		},
		destroy() {
			// Remove event listeners
			removeListeners(links);

			// Clean up tooltip unconditionally (link may already be removed from DOM)
			hideTooltip();
		}
	};
}
