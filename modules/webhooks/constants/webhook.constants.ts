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
 * ORD-STRIPE-003. Resend gère son propre retry interne en plus.
 *
 * WEBHOOK-AUDIT-003 : le commentaire d'origine annonçait « ~30s de backoff cron » —
 * chiffre faux. Il n'y avait AUCUN backoff : la sélection ne portait que sur
 * `status + attempts`, donc à cadence fixe de 5 min les 5 tentatives partaient en
 * ~20 min. Le backoff réel est désormais porté par
 * `POST_WEBHOOK_RETRY_BACKOFF_MS` ci-dessous.
 */
export const MAX_POST_WEBHOOK_RETRY_ATTEMPTS = 5;

/**
 * Délai minimal avant la tentative n° i+1 d'une PostWebhookTask, indexé par le
 * nombre de tentatives DÉJÀ effectuées (`attempts`).
 *
 * WEBHOOK-AUDIT-003 — sans backoff, une indisponibilité Resend de plus de ~20 min
 * suffisait à mettre une confirmation de commande en dead-letter définitif (5
 * tentatives brûlées à la cadence de 5 min du cron `retry-post-webhook-tasks`).
 * Ces paliers portent le budget total à ~3 h, ce qui couvre la très grande
 * majorité des incidents fournisseur, sans allonger le chemin nominal : `attempts:
 * 0` reste immédiatement éligible, et la 1ʳᵉ exécution passe de toute façon par le
 * `after()` de la route, hors de cette sélection.
 *
 * L'index 0 correspond à une task jamais tentée ; la longueur DOIT valoir
 * `MAX_POST_WEBHOOK_RETRY_ATTEMPTS` (au-delà, la task est épuisée et n'est plus
 * sélectionnée du tout).
 */
export const POST_WEBHOOK_RETRY_BACKOFF_MS: readonly number[] = [
	0, // 1ʳᵉ tentative : immédiate
	5 * 60 * 1000, // 2ᵉ : +5 min
	15 * 60 * 1000, // 3ᵉ : +15 min
	45 * 60 * 1000, // 4ᵉ : +45 min
	2 * 60 * 60 * 1000, // 5ᵉ (dernière) : +2 h
];

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
