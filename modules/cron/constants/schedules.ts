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
 *
 * ## Lot 1 SIMPLIFICATION.md (2026-08-03) — 9 crons → 3
 *
 * Seul le noyau légal/RGPD reste automatique — les jobs où un oubli humain coûte
 * cher sur la durée. Tout le reste (rejeu webhooks, réconciliation refunds, sync
 * paiements asynchrones, rejeu post-webhook, purge médias orphelins) est devenu
 * un **bouton** sur `/admin/configuration/maintenance`
 * (`modules/cron/actions/run-maintenance-task.ts`), lancé par Léane de temps en
 * temps. `reopen-store` a été supprimé sans remplacement : la lecture
 * (`get-store-status.ts`) traite déjà un `reopensAt` échu comme boutique ouverte.
 *
 * ⚠️ COÛT — audit coûts P1-2. Chaque exécution RÉVEILLE la base Neon, dont le
 * scale-to-zero se déclenche après **5 minutes** d'inactivité. Deux règles à
 * respecter en ajoutant/modifiant un planning :
 * 1. **Jamais de cadence < 30 min** sans bénéfice mesuré.
 * 2. **Faire coïncider les réveils** (deux crons alignés = un seul réveil).
 *
 * ⛔ **PLAFOND DUR — plan Vercel Hobby : une exécution par jour et par cron.**
 * Un crontab plus fréquent (`*​/30 * * * *`, `0 * * * *`, `0 *​/4 * * *`…) fait
 * REFUSER LE DÉPLOIEMENT ENTIER par l'API Vercel, avant même le build :
 * « Hobby accounts are limited to daily cron jobs ». Constaté le 2026-07-27, la
 * production est restée bloquée dessus. Verrouillé par
 * `cron-hobby-plan-daily-limit.regression.test.ts` — repasser à une cadence
 * infra-journalière exige un plan Pro, et alors ce test doit être supprimé.
 */
export const CRON_SCHEDULES: Record<string, string> = {
	// DLQ factures/avoirs (numérotation, PDF, archivage) — obligations Art.
	// 286/289-I CGI. Le seul job dont le silence est une non-conformité légale.
	"reconcile-invoices": "0 2 * * *",
	// Quatre passes d'hygiène quotidiennes : commandes PENDING abandonnées,
	// paniers guest expirés, wishlists guest inactives (RGPD art. 5.1.e),
	// sessions Better Auth expirées (Lot 0 S3.7).
	"cleanup-pending-orders": "0 3 * * *",
	// Purge PII à `paidAt + 10 ans` (RGPD art. 5.1.e) — mensuel, le 2 à 4h UTC.
	// Personne ne se souviendra d'un bouton à horizon 10 ans : reste automatique.
	"hard-delete-retention": "0 4 2 * *",
};

/**
 * Jobs pour lesquels un **monitor Sentry Cron** est émis — audit coûts P2-1.
 *
 * Le monitoring cron de Sentry est facturé **par monitor** (le plan Developer
 * n'en inclut qu'**un seul**). Depuis le Lot 1, un seul job est monitoré — et
 * c'est précisément celui que le plan couvre, plus aucun check-in n'est rejeté :
 * - `reconcile-invoices` : DLQ facture — obligation Art. 286/289-I CGI. Un cron
 *   légal devenu silencieux est le seul scénario qu'on ne peut pas se permettre
 *   de découvrir des semaines plus tard.
 *
 * Les deux autres jobs restent surveillés en aval : `withCronGuard` capture
 * leurs exceptions dans Sentry et envoie une alerte admin par email. Seule la
 * détection du *run manqué* (absence de check-in) est abandonnée pour eux —
 * leur silence est rattrapable au run suivant, sans perte (hygiène quotidienne,
 * purge mensuelle à horizon 10 ans).
 */
export const SENTRY_MONITORED_CRONS = new Set(["reconcile-invoices"]);
