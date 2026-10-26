/**
 * Application Configuration
 *
 * Shared settings. There is no API base URL: the reader sends nothing to the
 * editorial server (decision D03, plan step S3.3).
 */

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
