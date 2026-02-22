/**
 * Application Configuration
 *
 * Central configuration for API endpoints and other settings.
 * Uses Vite environment variables (VITE_ prefix required for client-side access).
 */

import { browser } from '$app/environment';

/**
 * API base URL for the editorial server (ritstjorn.namsbokasafn.is)
 * In development, defaults to localhost:3000
 */
export const API_BASE_URL = browser
  ? (import.meta.env.VITE_API_URL as string) || ''
  : '';

/**
 * Build the full API URL for an endpoint
 */
export function apiUrl(endpoint: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Feedback types available for submission
 */
export const FEEDBACK_TYPES = [
  { value: 'translation_error', label: 'Villa í þýðingu', labelEn: 'Translation error' },
  { value: 'technical_issue', label: 'Tæknilegt vandamál', labelEn: 'Technical issue' },
  { value: 'improvement', label: 'Tillaga að bætingu', labelEn: 'Improvement suggestion' },
  { value: 'other', label: 'Annað', labelEn: 'Other' }
] as const;

export type FeedbackType = typeof FEEDBACK_TYPES[number]['value'];
