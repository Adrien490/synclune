# Cron jobs Synclune

19 cron jobs Vercel pilotés par `vercel.json` (SSOT). Tous les schedules sont en **UTC** (Vercel n'accepte pas d'autre TZ). Cette table donne les équivalents France pour faciliter la lecture humaine.

Les jobs e-invoicing (4 jobs marqués `e-invoicing` ci-dessous, scope **e-reporting B2C** uniquement — Synclune est en franchise de TVA, vente B2C : pas de transmission de facture B2B/B2G sur une PDP) sont également détaillés côté flux dans [`INVOICING.md`](./INVOICING.md). Runbook opérationnel : [`RUNBOOK-INVOICING.md`](./RUNBOOK-INVOICING.md).

## Schedules

| Job                         | Schedule (UTC) | Heure France (CET / CEST) | Fréquence         | Catégorie   | Service                                                      |
| --------------------------- | -------------- | ------------------------- | ----------------- | ----------- | ------------------------------------------------------------ |
| `retry-post-webhook-tasks`  | `*/5 * * * *`  | toutes les 5 min          | toutes les 5 min  | revenue     | `modules/cron/services/retry-post-webhook-tasks.service.ts`  |
| `reopen-store`              | `*/15 * * * *` | toutes les 15 min         | toutes les 15 min | ops         | `modules/store-settings/services/auto-reopen.service.ts`     |
| `retry-webhooks`            | `*/30 * * * *` | toutes les 30 min         | toutes les 30 min | revenue     | `modules/cron/services/retry-webhooks.service.ts`            |
| `transmit-ereporting-batch` | `*/30 * * * *` | toutes les 30 min         | toutes les 30 min | e-invoicing | `modules/cron/services/transmit-ereporting-batch.service.ts` |
| `sync-async-payments`       | `0 */4 * * *`  | toutes les 4h, H:00       | toutes les 4h     | revenue     | `modules/cron/services/sync-async-payments.service.ts`       |
| `reconcile-refunds`         | `30 */6 * * *` | toutes les 6h, H+30       | toutes les 6h     | revenue     | `modules/cron/services/reconcile-refunds.service.ts`         |
| `build-ereporting-batch`    | `0 1 * * *`    | 02:00 / 03:00             | quotidien         | e-invoicing | `modules/cron/services/build-ereporting-batch.service.ts`    |
| `reconcile-invoices`        | `0 2 * * *`    | 03:00 / 04:00             | quotidien         | e-invoicing | `modules/cron/services/reconcile-invoices.service.ts`        |
| `cleanup-wishlists`         | `30 2 * * *`   | 03:30 / 04:30             | quotidien         | retention   | `modules/cron/services/cleanup-wishlists.service.ts`         |
| `cleanup-sessions`          | `0 3 * * *`    | 04:00 / 05:00             | quotidien         | retention   | `modules/cron/services/cleanup-sessions.service.ts`          |
| `cleanup-carts`             | `30 3 * * *`   | 04:30 / 05:30             | quotidien         | retention   | `modules/cron/services/cleanup-carts.service.ts`             |
| `cleanup-pending-orders`    | `30 4 * * *`   | 05:30 / 06:30             | quotidien         | revenue     | `modules/cron/services/cleanup-pending-orders.service.ts`    |
| `process-account-deletions` | `0 5 * * *`    | 06:00 / 07:00             | quotidien         | RGPD        | `modules/cron/services/process-account-deletions.service.ts` |
| `reconcile-voided-invoices` | `0 7 * * *`    | 08:00 / 09:00             | quotidien         | e-invoicing | `modules/cron/services/reconcile-voided-invoices.service.ts` |
| `alert-dispute-deadlines`   | `0 8 * * *`    | 09:00 / 10:00             | quotidien         | monitoring  | `modules/cron/services/alert-dispute-deadlines.service.ts`   |
| `send-review-requests`      | `0 10 * * *`   | 11:00 / 12:00             | quotidien         | engagement  | `modules/cron/services/send-review-requests.service.ts`      |
| `alert-stuck-orders`        | `0 9 * * 1`    | 10:00 / 11:00 lundi       | hebdo (lundi)     | monitoring  | `modules/cron/services/alert-stuck-orders.service.ts`        |
| `cleanup-webhook-events`    | `0 3 1 * *`    | 04:00 / 05:00 le 1er      | mensuel (1er)     | retention   | `modules/cron/services/cleanup-webhook-events.service.ts`    |
| `hard-delete-retention`     | `0 4 2 * *`    | 05:00 / 06:00 le 2        | mensuel (2)       | RGPD        | `modules/cron/services/hard-delete-retention.service.ts`     |
| `cleanup-orphan-media`      | `0 5 3 * *`    | 06:00 / 07:00 le 3        | mensuel (3)       | retention   | `modules/cron/services/cleanup-orphan-media.service.ts`      |

## Conventions

- **TZ Vercel** : toujours UTC. Le format `JJ HH UTC` correspond à `JJ (HH+1) CET` ou `JJ (HH+2) CEST` selon la saison France.
- **Mensuels étalés** : les 3 crons "1er du mois" historiques (`cleanup-webhook-events` / `hard-delete-retention` / `cleanup-orphan-media`) ont été déplacés sur 3 jours différents (1er / 2 / 3) pour éviter la lock contention sur `webhook_event` et les pics simultanés UploadThing + DB.
- **`reconcile-refunds`** : déclenché à H+30 (pas H:00) pour ne jamais chevaucher `sync-async-payments` qui démarre à H:00 — évite le burst Stripe inter-cron.
- **`transmit-ereporting-batch` (toutes les 30 min)** : transmet les batches e-reporting B2C à la PA. No-op tant que `INVOICE_ENABLE_EREPORTING=OFF` ou `INVOICE_PROVIDER=local`.
- **`maxDuration`** : toutes les routes exposent `export const maxDuration = 60` (Vercel Pro). `BATCH_DEADLINE_MS = 45_000` laisse 15s de marge pour finir proprement.

## Sécurité

- **CRON_SECRET** : 32+ chars, vérifié `timing-safe` côté `modules/cron/lib/verify-cron.ts`. Dev local skip la vérif (`NODE_ENV=development`). Vercel envoie automatiquement `Authorization: Bearer <CRON_SECRET>` sur les routes déclarées dans `vercel.json`.

## Observabilité

- **Sentry spans** : `cron.<jobName>` avec attributes `processed_count`, `errored_count`, `skipped_count`, `duration_ms`, `result` (`success` / `partial` / `failed` / `skipped` / `deadline-exceeded`). Sample rate forcé à 1.0 en prod (vs 0.1 défaut) — voir `sentry.server.config.ts`.
- **Sentry fingerprint** : `["cron", jobName]` au niveau guard + `[CRON_JOB, eventType]` pour `retry-webhooks` (granularité par type de webhook) + `["cron", CRON_JOB, step]` pour les crons multi-phase (cleanup-webhook-events).
- **Emails admin** : déclenchés par `withCronGuard` si `result.errored > 0` ou si une exception non-`CronDeadlineExceededError` remonte. PAS d'email pour `reason: "STRIPE_KEY_MISSING"` (config issue, pas une vraie failure). Templates admin utilisent `admin-alert-email` avec `type: "cron"` ou `type` spécialisé (`ereporting-stuck`, `stuck-orders`, etc.).
- **Statuts HTTP** :
  - `200 success` : `errored === 0`
  - `200 skipped` : `result.reason` set (misconfig)
  - `200 deadline-exceeded` : la cron a atteint son deadline (`hasMore: true`), reprise au prochain run
  - `207 partial` : `errored > 0 && processed > 0`
  - `500 failed` : `errored > 0 && processed === 0`, ou exception non gérée

## Ajouter un cron

1. **Service** dans `modules/cron/services/<job>.service.ts` (ou domaine si transactionnel partagé — cf CLAUDE.md § "Exception: Services transactionnels partagés") qui retourne `Promise<CronResult>`.
2. **Route** dans `app/api/cron/<job>/route.ts` avec `export const maxDuration = 60` + `withCronGuard({ jobName: "<job>" }, () => myService())`.
3. **Entry** dans `vercel.json` `crons` array (SSOT).
4. **Tests** : `<job>.service.test.ts` à côté du service. Route test sous `__tests__/route.test.ts` uniquement si la route a une logique propre (rare).
5. **Incrémenter** `expect(routeFiles).toHaveLength(N)` dans `app/api/cron/__tests__/max-duration.test.ts`.
6. **Documenter** : ajouter une ligne à la table de schedules ci-dessus + à la table CRON dans `CLAUDE.md § "Cron Jobs"`. Si le cron est e-invoicing, ajouter aussi à `INVOICING.md § Crons`.
