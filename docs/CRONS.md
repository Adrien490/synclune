# Cron jobs Synclune

11 cron jobs Vercel pilotés par `vercel.json` (SSOT). Tous les schedules sont en **UTC** (Vercel n'accepte pas d'autre TZ). Cette table donne les équivalents France pour faciliter la lecture humaine.

> **Périmètre réduit (2026-05-30)** : la liste a été ramenée de 21 → 10 crons pour ne conserver que le **cœur critique** (revenu + RGPD légal), le **monitoring** et l'**ops** (`reopen-store`). Les jobs retirés (e-reporting, cleanup/rétention, `send-review-requests`, `cleanup-pending-orders`) ont vu leur **route `app/api/cron/<job>/` supprimée** mais **leurs services `modules/` conservés** (réactivables en recréant la route + l'entrée `vercel.json`). Détail en bas de page.
>
> **Correctif 2026-05-30 (10 → 11)** : `reconcile-invoices` a été **réintégré**. C'est le DLQ de facturation (Passes 0-3 : numéro de facture, snapshot, PDF, avoir) — une obligation **LIVE** (Art. 286 / 289-I CGI) qui avait été retirée à tort avec le lot e-reporting. Sans lui, un échec du chemin eager `ensureInvoiceNumberPersisted` (best-effort, renvoie 200 → Stripe ne rejoue pas) laissait une commande PAID sans facture jusqu'à l'alerte hebdo `alert-stuck-orders` (7 j) + action admin manuelle. Ses Passes e-reporting (SALES / 5 / 6) restent **no-op fail-safe** tant que `INVOICE_ENABLE_EREPORTING=false`.

## Schedules

| Job                         | Schedule (UTC) | Heure France (CET / CEST) | Fréquence         | Catégorie  | Service                                                      |
| --------------------------- | -------------- | ------------------------- | ----------------- | ---------- | ------------------------------------------------------------ |
| `retry-post-webhook-tasks`  | `*/5 * * * *`  | toutes les 5 min          | toutes les 5 min  | revenue    | `modules/cron/services/retry-post-webhook-tasks.service.ts`  |
| `retry-webhooks`            | `*/30 * * * *` | toutes les 30 min         | toutes les 30 min | revenue    | `modules/cron/services/retry-webhooks.service.ts`            |
| `reopen-store`              | `*/15 * * * *` | toutes les 15 min         | toutes les 15 min | ops        | `modules/store-settings/services/auto-reopen.service.ts`     |
| `sync-async-payments`       | `0 */4 * * *`  | toutes les 4h, H:00       | toutes les 4h     | revenue    | `modules/cron/services/sync-async-payments.service.ts`       |
| `reconcile-refunds`         | `30 */6 * * *` | toutes les 6h, H+30       | toutes les 6h     | revenue    | `modules/cron/services/reconcile-refunds.service.ts`         |
| `reconcile-invoices`        | `0 2 * * *`    | 03:00 / 04:00             | quotidien         | revenue    | `modules/cron/services/reconcile-invoices.service.ts`        |
| `process-account-deletions` | `0 5 * * *`    | 06:00 / 07:00             | quotidien         | RGPD       | `modules/cron/services/process-account-deletions.service.ts` |
| `alert-dispute-deadlines`   | `0 8 * * *`    | 09:00 / 10:00             | quotidien         | monitoring | `modules/cron/services/alert-dispute-deadlines.service.ts`   |
| `alert-overbilled-orders`   | `30 8 * * *`   | 09:30 / 10:30             | quotidien         | monitoring | `modules/cron/services/alert-overbilled-orders.service.ts`   |
| `alert-stuck-orders`        | `0 9 * * 1`    | 10:00 / 11:00 lundi       | hebdo (lundi)     | monitoring | `modules/cron/services/alert-stuck-orders.service.ts`        |
| `hard-delete-retention`     | `0 4 2 * *`    | 05:00 / 06:00 le 2        | mensuel (2)       | RGPD       | `modules/cron/services/hard-delete-retention.service.ts`     |

## Conventions

- **TZ Vercel** : toujours UTC. Le format `JJ HH UTC` correspond à `JJ (HH+1) CET` ou `JJ (HH+2) CEST` selon la saison France.
- **`reconcile-refunds`** : déclenché à H+30 (pas H:00) pour ne jamais chevaucher `sync-async-payments` qui démarre à H:00 — évite le burst Stripe inter-cron.
- **`sync-async-payments` (toutes les 4h)** : propriétaire de la réconciliation des commandes PENDING avec PaymentIntent (succeeded raté, 3DS abandonné → cancel PI + FAILED + email client).
- **`reopen-store` (toutes les 15 min)** : rouvre automatiquement la boutique à l'échéance d'une fermeture programmée (`storeSettings.closedUntil`). Idempotent.
- **`maxDuration`** : toutes les routes exposent `export const maxDuration = 60` (Vercel Pro). `BATCH_DEADLINE_MS = 45_000` laisse 15s de marge pour finir proprement.

## Sécurité

- **CRON_SECRET** : 32+ chars, vérifié `timing-safe` côté `modules/cron/lib/verify-cron.ts`. Dev local skip la vérif (`NODE_ENV=development`). Vercel envoie automatiquement `Authorization: Bearer <CRON_SECRET>` sur les routes déclarées dans `vercel.json`.

## Observabilité

- **Sentry spans** : `cron.<jobName>` avec attributes `processed_count`, `errored_count`, `skipped_count`, `duration_ms`, `result` (`success` / `partial` / `failed` / `skipped` / `deadline-exceeded`). Sample rate forcé à 1.0 en prod (vs 0.1 défaut) — voir `sentry.server.config.ts`.
- **Sentry fingerprint** : `["cron", jobName]` au niveau guard + `[CRON_JOB, eventType]` pour `retry-webhooks` (granularité par type de webhook).
- **Emails admin** : déclenchés par `withCronGuard` si `result.errored > 0` ou si une exception non-`CronDeadlineExceededError` remonte. PAS d'email pour `reason: "STRIPE_KEY_MISSING"` (config issue, pas une vraie failure). Templates admin utilisent `admin-alert-email` avec `type: "cron"` ou `type` spécialisé (`stuck-orders`, etc.).
- **Statuts HTTP** :
  - `200 success` : `errored === 0`
  - `200 skipped` : `result.reason` set (misconfig)
  - `200 deadline-exceeded` : la cron a atteint son deadline (`hasMore: true`), reprise au prochain run
  - `207 partial` : `errored > 0 && processed > 0`
  - `500 failed` : `errored > 0 && processed === 0`, ou exception non gérée

## Crons retirés (2026-05-30)

Routes `app/api/cron/<job>/` supprimées, **services `modules/` conservés**. Pour réactiver : recréer `app/api/cron/<job>/route.ts` (`export const maxDuration = 60` + `withCronGuard(...)`), ré-ajouter l'entrée dans `vercel.json`, incrémenter le count dans `app/api/cron/__tests__/max-duration.test.ts`.

| Job retiré                  | Catégorie   | Note de réactivation                                                             |
| --------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `build-ereporting-batch`    | e-invoicing | **À réactiver au go-live e-reporting (1ᵉʳ sept. 2027)** — cf. `INVOICING.md`.    |
| `transmit-ereporting-batch` | e-invoicing | Idem. No-op tant que `INVOICE_ENABLE_EREPORTING=OFF` / `INVOICE_PROVIDER=local`. |
| `reconcile-voided-invoices` | e-invoicing | Idem.                                                                            |
| `cleanup-sessions`          | retention   | Housekeeping DB. Réactiver si bloat sessions.                                    |
| `cleanup-carts`             | retention   | Housekeeping DB.                                                                 |
| `cleanup-wishlists`         | retention   | Housekeeping DB.                                                                 |
| `cleanup-webhook-events`    | retention   | Housekeeping DB (purge `webhook_event` anciens).                                 |
| `cleanup-orphan-media`      | retention   | Housekeeping UploadThing + DB.                                                   |
| `cleanup-pending-orders`    | revenue     | Déjà **no-op** dans le flow Elements (`sync-async-payments` est propriétaire).   |
| `send-review-requests`      | engagement  | Emails demande d'avis post-achat.                                                |

## Ajouter un cron

1. **Service** dans `modules/cron/services/<job>.service.ts` (ou domaine si transactionnel partagé — cf CLAUDE.md § "Exception: Services transactionnels partagés") qui retourne `Promise<CronResult>`.
2. **Route** dans `app/api/cron/<job>/route.ts` avec `export const maxDuration = 60` + `withCronGuard({ jobName: "<job>" }, () => myService())`.
3. **Entry** dans `vercel.json` `crons` array (SSOT).
4. **Tests** : `<job>.service.test.ts` à côté du service. Route test sous `__tests__/route.test.ts` uniquement si la route a une logique propre (rare).
5. **Incrémenter** `expect(vercelConfig.crons).toHaveLength(N)` dans `app/api/cron/__tests__/max-duration.test.ts`.
6. **Documenter** : ajouter une ligne à la table de schedules ci-dessus + à la table CRON dans `CLAUDE.md § "Cron Jobs"`. Si le cron est e-invoicing, ajouter aussi à `INVOICING.md § Crons`.
