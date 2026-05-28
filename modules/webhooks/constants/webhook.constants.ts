/**
 * Reserved UUID for system-generated OrderNotes (webhooks, cron)
 * Uses UUID v4 nil-like format to avoid collision with real user IDs
 */
export const SYSTEM_AUTHOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Maximum retry attempts for webhook events before admin alert.
 * Used by the Stripe webhook handler (alert) and the retry-webhooks cron (skip threshold).
 */
export const MAX_WEBHOOK_RETRY_ATTEMPTS = 3;

/**
 * Maximum retry attempts for PostWebhookTask before marking FAILED + admin alert.
 * ORD-STRIPE-003 — 5 tentatives cumulent ~30s de backoff cron (5min cadence) avant
 * d'abandonner. Resend gère son propre retry interne en plus.
 */
export const MAX_POST_WEBHOOK_RETRY_ATTEMPTS = 5;
