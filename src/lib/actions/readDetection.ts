/**
 * Read Detection Action - Uses IntersectionObserver to detect when user reaches end of section
 *
 * This action attaches to an element (typically at the end of content) and fires a callback
 * when the element becomes visible, indicating the user has scrolled to the end.
 */

import { browser } from '$app/environment';

export interface ReadDetectionOptions {
	/** Callback when section end is detected */
	onRead: () => void;
	/** Minimum visibility threshold (0-1) to trigger read. Default: 0.5 */
	threshold?: number;
	/** Minimum time element must be visible in ms. Default: 1000 (1 second) */
	minVisibleTime?: number;
	/** Whether detection is enabled. Default: true */
	enabled?: boolean;
}

/**
 * Svelte action for detecting when a user has read to the end of a section.
 *
 * Usage:
 * ```svelte
 * <div use:readDetection={{ onRead: markAsRead, enabled: !isRead }}>
 *   End of section marker
 * </div>
 * ```
 */
export function readDetection(node: HTMLElement, options: ReadDetectionOptions) {
	if (!browser) {
		return { destroy: () => {} };
	}

	let observer: IntersectionObserver | null = null;
	let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
	let hasTriggered = false;

	// Kept current via update() so setup/intersection always read the latest
	// options rather than the ones captured at mount
	let currentOptions = options;

	function handleIntersection(entries: IntersectionObserverEntry[]) {
		const entry = entries[0];

		if (entry.isIntersecting && !hasTriggered) {
			// Element is visible - start timer
			if (!visibilityTimer) {
				visibilityTimer = setTimeout(() => {
					hasTriggered = true;
					currentOptions.onRead();
				}, currentOptions.minVisibleTime ?? 1000);
			}
		} else {
			// Element left viewport - cancel timer
			if (visibilityTimer) {
				clearTimeout(visibilityTimer);
				visibilityTimer = null;
			}
		}
	}

	function setup() {
		if (!(currentOptions.enabled ?? true) || hasTriggered) return;

		observer = new IntersectionObserver(handleIntersection, {
			threshold: currentOptions.threshold ?? 0.5,
			// Slightly reduce the root margin to ensure user has actually scrolled down
			rootMargin: '-50px 0px 0px 0px'
		});

		observer.observe(node);
	}

	function teardown() {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
		if (visibilityTimer) {
			clearTimeout(visibilityTimer);
			visibilityTimer = null;
		}
	}

	setup();

	return {
		update(newOptions: ReadDetectionOptions) {
			currentOptions = newOptions;
			const newEnabled = newOptions.enabled ?? true;

			// If disabled or already triggered, teardown
			if (!newEnabled || hasTriggered) {
				teardown();
				return;
			}

			// If becoming enabled, setup
			if (!observer) {
				setup();
			}
		},
		destroy() {
			teardown();
		}
	};
}
