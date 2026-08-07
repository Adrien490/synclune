/**
 * Maximum retry attempts for webhook events before admin alert.
 *
 * Seul consommateur depuis l'audit V2 (Lot 3, 2026-08-05) : le handler de la route
 * Stripe. `attempts` compte les REDÉLIVRANCES DE STRIPE (la route renvoie 500 en
 * échec, Stripe retente 3 jours) — la tâche `retry-webhooks`, qui s'en servait
 * aussi comme seuil d'abandon, a été retirée : c'était un troisième système de
 * reprise par-dessus deux qui sont durables par construction.
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
 *     le retry légitime de Stripe).
 *
 * ⚠️ C'est le SEUL consommateur depuis le retrait de `retry-webhooks` (audit V2,
 * Lot 3) — la reprise d'un PROCESSING périmé dépend donc entièrement d'une
 * redélivrance de Stripe. Passé sa fenêtre de 3 jours, la ligne reste figée en
 * PROCESSING.
 */
export const STALE_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000;
