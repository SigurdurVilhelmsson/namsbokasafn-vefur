/**
 * API Utilities
 *
 * Functions for communicating with the editorial server (ritstjorn.namsbokasafn.is).
 * Used for analytics tracking.
 */

import { browser } from '$app/environment';
import { API_BASE_URL, apiUrl } from '$lib/config';

/**
 * Analytics event payload
 */
export interface AnalyticsEvent {
  eventType: 'page_view' | 'chapter_view' | 'section_view' | 'error' | 'search' | 'download';
  book?: string;
  chapter?: string;
  section?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track an analytics event
 * Fire-and-forget - doesn't wait for response
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!browser) return;

  // Skip analytics when no API URL is configured
  if (!API_BASE_URL) return;

  // Use sendBeacon for fire-and-forget tracking (works even on page unload)
  const url = apiUrl('/api/analytics/event');
  const data = JSON.stringify(event);

  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } else {
    // Fallback for older browsers
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true, // Allow request to complete even if page unloads
    }).catch(() => {
      // Silently fail - analytics shouldn't break the app
    });
  }
}

/**
 * Track a page view event
 */
export function trackPageView(book?: string, chapter?: string, section?: string): void {
  const eventType = section ? 'section_view' : chapter ? 'chapter_view' : 'page_view';
  trackEvent({ eventType, book, chapter, section });
}

/**
 * Track an error event
 */
export function trackError(errorType: string, errorMessage: string): void {
  trackEvent({
    eventType: 'error',
    metadata: { errorType, errorMessage }
  });
}

/**
 * Track a search event
 */
export function trackSearch(query: string, resultsCount: number): void {
  trackEvent({
    eventType: 'search',
    metadata: { query, resultsCount }
  });
}
