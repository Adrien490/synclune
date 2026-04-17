/**
 * Anti-replay window en secondes (5 minutes)
 * Stripe recommande une fenêtre de 5 minutes maximum
 */
export const ANTI_REPLAY_WINDOW_SECONDS = 300;

/**
 * Reserved UUID for system-generated OrderNotes (webhooks, cron)
 * Uses UUID v4 nil-like format to avoid collision with real user IDs
 */
export const SYSTEM_AUTHOR_ID = "00000000-0000-0000-0000-000000000000";
