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
 * Délai au-delà duquel un WebhookEvent figé en PROCESSING est considéré comme
 * « périmé » (lambda crashée/timeout en plein dispatch), donc reprenable.
 *
 * WEBHOOK-AUDIT-001 (2026-05-29) : la route `maxDuration` est de 60s — une
 * invocation live ne peut donc pas rester légitimement en PROCESSING plus
 * longtemps. On prend une marge confortable (15 min) pour absorber l'horloge
 * et d'éventuels retards de persistance, tout en récupérant bien plus vite que
 * l'ancien seuil de 24h. Utilisé par :
 *   - le pré-check d'idempotence de la route (un PROCESSING périmé n'est PAS
 *     court-circuité en 200 → on laisse l'event se reprendre au lieu d'avaler
 *     le retry légitime de Stripe) ;
 *   - le cron `retry-webhooks` (reset des PROCESSING périmés → FAILED).
 */
export const STALE_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000;
