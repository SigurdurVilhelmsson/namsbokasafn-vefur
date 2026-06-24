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
 * Feedback types available for submission. `icon` is a registry glyph name
 * (see Icon.svelte / icons.ts), rendered in the type picker.
 */
export const FEEDBACK_TYPES = [
  { value: 'translation_error', label: 'Villa í þýðingu', labelEn: 'Translation error', icon: 'languages' },
  { value: 'technical_issue', label: 'Tæknilegt vandamál', labelEn: 'Technical issue', icon: 'triangle-alert' },
  { value: 'improvement', label: 'Tillaga að bætingu', labelEn: 'Improvement suggestion', icon: 'lightbulb' },
  { value: 'other', label: 'Annað', labelEn: 'Other', icon: 'message-square' }
] as const;

export type FeedbackType = typeof FEEDBACK_TYPES[number]['value'];
