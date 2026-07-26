/**
 * SSOT des plannings cron — MON-03.
 *
 * DOIT rester synchronisé avec `vercel.json` (autorité d'exécution réelle). Le test
 * de régression `cron-schedules-match-vercel.test.ts` verrouille la cohérence dans
 * les deux sens (toute entrée vercel.json a une entrée ici avec le même crontab, et
 * réciproquement).
 *
 * Consommé par `with-cron-guard` pour brancher le **Sentry Cron Monitoring** : à
 * chaque exécution, le guard envoie un check-in `in_progress` puis `ok`/`error`.
 * Sentry connaît le planning attendu (via ce crontab) et **alerte si un check-in
 * attendu n'arrive pas** (run manqué) — couvre le scénario « Vercel a cessé
 * d'invoquer le cron » (limite de plan, mauvaise config, suspension), indétectable
 * autrement (un cron mort = un cron silencieux).
 *
 * Clé = `jobName` (== segment de path `/api/cron/<jobName>` == slug du monitor Sentry).
 * Valeur = expression crontab, en **UTC** (comme Vercel Cron).
 */
export const CRON_SCHEDULES: Record<string, string> = {
	"retry-post-webhook-tasks": "*/5 * * * *",
	"reopen-store": "*/15 * * * *",
	"retry-webhooks": "*/30 * * * *",
	"sync-async-payments": "0 */4 * * *",
	"reconcile-refunds": "30 */6 * * *",
	"reconcile-invoices": "0 2 * * *",
	"cleanup-pending-orders": "0 3 * * *",
	"process-account-deletions": "0 5 * * *",
	"alert-dispute-deadlines": "0 8 * * *",
	"hard-delete-retention": "0 4 2 * *",
	// Hebdomadaire le mercredi (audit média M2). Le scan ne couvre que
	// MAX_PAGES_PER_RUN × UPLOADTHING_LIST_LIMIT fichiers par exécution et reprend
	// via un curseur persistant (`StoreSettings.orphanMediaScanOffset`) : une
	// cadence mensuelle rendait un cycle complet trop lent à mesure que les
	// archives PDF de facture remplissent la liste UploadThing.
	// Mercredi ≠ le 2 du mois (hard-delete-retention), les deux ne se chevauchent
	// qu'occasionnellement et le curseur rend la reprise idempotente.
	"cleanup-orphan-media": "0 4 * * 3",
};
