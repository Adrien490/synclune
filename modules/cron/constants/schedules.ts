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
 * ⚠️ COÛT — audit coûts P1-2. Chaque exécution RÉVEILLE la base Neon, dont le
 * scale-to-zero se déclenche après **5 minutes** d'inactivité. Une cadence
 * inférieure à 5 min empêche donc la base de s'endormir : elle tourne 24/7 et
 * consomme ~183 des 191,9 compute-hours du plan Neon Free (95 % de l'allocation)
 * avant même le premier visiteur. Au dépassement, Neon **suspend le compute
 * jusqu'au mois suivant** — boutique hors service, checkout compris.
 *
 * Deux règles à respecter en ajoutant/modifiant un planning :
 * 1. **Jamais de cadence < 30 min** sans bénéfice mesuré.
 * 2. **Faire coïncider les réveils.** Trois crons demi-horaires alignés sur
 *    :00/:30 = 2 réveils/heure ; les mêmes décalés = 6 réveils, même travail.
 *
 * ⛔ **PLAFOND DUR — plan Vercel Hobby : une exécution par jour et par cron.**
 * Un crontab plus fréquent (`*​/30 * * * *`, `0 * * * *`, `0 *​/4 * * *`…) fait
 * REFUSER LE DÉPLOIEMENT ENTIER par l'API Vercel, avant même le build :
 * « Hobby accounts are limited to daily cron jobs ». Ce n'est pas une
 * dégradation silencieuse mais une porte fermée — constaté le 2026-07-27, la
 * production est restée bloquée dessus. Tous les plannings sont donc
 * quotidiens ou moins, et regroupés sur 4 fenêtres horaires (2h, 3h, 5h, 8h
 * UTC) pour ne pas multiplier les réveils Neon : ~4 réveils/jour au lieu des
 * ~48 de la cadence demi-horaire. Repasser à une cadence infra-journalière
 * exige un plan Pro (verrouillé par `cron-hobby-plan-daily-limit.regression.test.ts`).
 */
export const CRON_SCHEDULES: Record<string, string> = {
	// DLQ des emails de confirmation perdus si la lambda meurt entre `after()` et
	// l'envoi — événement rarissime à ~20 commandes/mois. Passé de */30 à
	// quotidien sous la contrainte Hobby : le pire cas devient 24 h de retard sur
	// un email, contre 30 min. Groupé avec `retry-webhooks` et
	// `reconcile-invoices` sur la fenêtre 2h pour mutualiser le réveil.
	"retry-post-webhook-tasks": "0 2 * * *",
	// Filet de sécurité seulement : la réouverture est déjà appliquée à la
	// lecture (`get-store-status.ts` traite un `reopensAt` échu comme ouvert sans
	// attendre le cron). Le cron ne fait que remettre la ligne DB au propre —
	// c'est pourquoi le passage d'horaire à quotidien n'a aucun effet visible.
	// Groupé avec `cleanup-pending-orders` sur la fenêtre 3h.
	"reopen-store": "0 3 * * *",
	// Passé de */30 à quotidien (contrainte Hobby). Backstop seulement : Stripe
	// retente lui-même ses webhooks pendant 3 jours, donc un événement non rejoué
	// pendant 24 h reste rattrapé par la source.
	"retry-webhooks": "0 2 * * *",
	// Passé de 4h à quotidien (contrainte Hobby) : un virement SEPA met de toute
	// façon plusieurs jours à se dénouer côté Stripe.
	"sync-async-payments": "0 5 * * *",
	// Passé de 6h à quotidien (contrainte Hobby). Seul occupant de la fenêtre 8h
	// depuis le retrait d'`alert-dispute-deadlines` (simplification V1 2026-07-30).
	"reconcile-refunds": "0 8 * * *",
	"reconcile-invoices": "0 2 * * *",
	"cleanup-pending-orders": "0 3 * * *",
	"process-account-deletions": "0 5 * * *",
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

/**
 * Jobs pour lesquels un **monitor Sentry Cron** est émis — audit coûts P2-1.
 *
 * Le monitoring cron de Sentry est facturé **par monitor** (le plan Developer
 * n'en inclut qu'**un seul**). Émettre un check-in pour les 11 jobs revenait à
 * demander 11 monitors : au-delà du quota, Sentry rejette les check-ins
 * surnuméraires — et l'alerte « ce cron ne s'exécute plus », seule protection
 * contre un cron devenu silencieux, ne fonctionnait donc sur AUCUN job de façon
 * fiable. Un monitoring qu'on croit actif est pire que pas de monitoring.
 *
 * On ne surveille donc que les jobs dont le silence coûte de l'argent ou
 * enfreint une obligation légale :
 * - `retry-post-webhook-tasks` : emails de confirmation perdus (revenu/confiance)
 * - `retry-webhooks` : événements Stripe non rejoués (commandes fantômes)
 * - `sync-async-payments` : paiements SEPA jamais rapprochés (revenu)
 * - `reconcile-invoices` : DLQ facture — obligation Art. 286/289-I CGI
 * - `process-account-deletions` : obligation RGPD Art. 17 (délai légal)
 *
 * Les jobs non listés restent surveillés en aval : `withCronGuard` capture
 * toujours leurs exceptions dans Sentry et envoie une alerte admin par email.
 * Seule la détection du *run manqué* (absence de check-in) est abandonnée pour
 * eux — leur silence est rattrapable au run suivant, sans perte.
 */
export const SENTRY_MONITORED_CRONS = new Set([
	"retry-post-webhook-tasks",
	"retry-webhooks",
	"sync-async-payments",
	"reconcile-invoices",
	"process-account-deletions",
]);
