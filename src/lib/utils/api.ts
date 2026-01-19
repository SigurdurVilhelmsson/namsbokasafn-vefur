/**
 * API Utilities
 *
 * Functions for communicating with the editorial server (ritstjorn.namsbokasafn.is).
 * Used for feedback submission and analytics tracking.
 */

import { browser } from '$app/environment';
import { apiUrl, type FeedbackType } from '$lib/config';

/**
 * Feedback submission payload
 */
export interface FeedbackSubmission {
  type: FeedbackType;
  message: string;
  book?: string;
  chapter?: string;
  section?: string;
  userName?: string;
  userEmail?: string;
}

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
 * Submit feedback to the editorial server
 */
export async function submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!browser) {
    return { success: false, error: 'Cannot submit feedback during SSR' };
  }

  try {
    const response = await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, message: data.message };
    } else {
      return { success: false, error: data.message || data.error || 'Submission failed' };
    }
  } catch (error) {
    console.error('[API] Feedback submission error:', error);
    return { success: false, error: 'Network error - please try again' };
  }
}

/**
 * Track an analytics event
 * Fire-and-forget - doesn't wait for response
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!browser) return;

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
