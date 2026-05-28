# Runbook — Observabilité facturation

Procédures opérationnelles pour les alertes email admin facturation. Mis en place suite à l'audit `EINV-OPS-*` (2026-05-28).

> **Recentrage B2C (2026-05-28)** : la transmission B2B/B2G sur PDP a été supprimée (Synclune = micro-entreprise franchise TVA, vente B2C). Les alertes liées à `transmit-invoices` / `retry-invoice-transmissions` / `reconcile-invoice-statuses` / `refresh-stale-directory-entries` ne s'appliquent plus. Restent : génération/archivage facture, avoirs, e-reporting B2C.

> Voir aussi `docs/INVOICING.md` pour l'architecture détaillée du module (cycle facture/avoir, e-reporting).

## Tableau d'intervention

| Alerte email                                                             | Symptôme                                                                                       | Diagnostic                                                                                                                                                                     | Remédiation                                                                                                                           | Vérification                                                                                    |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `[Admin] Échec génération facture`                                       | `ensure-invoice-number` n'a pas pu écrire `invoiceNumber`                                      | Vérifier Sentry tag `service:ensure-invoice-number` + `orderId`. Causes : advisory lock conflict prolongé, P2002 persistant, DB down.                                          | Le cron `reconcile-invoices` (daily 02:00) rejouera. Pour relancer manuellement : bouton "Relancer" dans `/admin/ventes/facturation`. | Vérifier `Order.invoiceNumber IS NOT NULL` puis `OrderHistory` action `INVOICE_RECONCILED`.     |
| `[Admin] Échec archivage PDF facture`                                    | `archiveInvoicePdf` n'a pas réussi l'upload UploadThing                                        | Sentry tag `service:archive-invoice-pdf`. Causes : UploadThing down, quota, signature invalide.                                                                                | Vérifier le statut UploadThing. Le cron `reconcile-invoices` retentera. Bouton "Relancer" dispo.                                      | `Order.invoicePdfUrl IS NOT NULL` puis hash SHA-256 vérifié.                                    |
| `[Admin] Échec émission avoir`                                           | `voidInvoice` retourne `kind: "failed"` après 5 retries                                        | Sentry tag `service:void-invoice`. Causes : advisory lock persistant, contrainte CHECK violée, race émission avoir.                                                            | Cron `reconcile-invoices` rejouera (passe 3). Si > 3 tentatives, escalade auto.                                                       | `Order.creditNoteNumber IS NOT NULL` + `OrderHistory.INVOICE_VOIDED`.                           |
| `[URGENT] Saturation séquence facture/avoir`                             | 99 999 factures (ou avoirs) émises dans l'année                                                | `BusinessError.code = INVOICE_SEQUENCE_OVERFLOW` ou `CREDIT_NOTE_SEQUENCE_OVERFLOW`. Émission complètement bloquée.                                                            | **Migration urgente** : étendre regex `Order_invoiceNumber_format_check` à `^F-[0-9]{4}-[0-9]{5,6}$`. Idem `creditNote`. Déployer.    | Tester émission d'une nouvelle facture sur staging avant prod.                                  |
| `[Admin] Webhook X échoué N tentatives`                                  | Cron `retry-webhooks` n'arrive plus à traiter un event Stripe                                  | Sentry tag `webhookHandler` + `stripeEventId`. Vérifier Stripe dashboard.                                                                                                      | Re-déclencher manuellement via Stripe (resend webhook) ou via `/admin/stripe/webhooks/replay`.                                        | `WebhookEvent.status = COMPLETED`.                                                              |
| `[Admin] Échec génération facture` (motif `Transmission PDP abandonnée`) | `retry-invoice-transmissions` a épuisé les 5 retries → `pdpStatus = ABANDONED` (EINV-CRON-002) | Sentry fingerprint `["cron","retry-invoice-transmissions","abandoned"]` + tag `orderId`. Causes : PDP injoignable durablement, payload refusé non corrigeable (SIRET inconnu). | Voir **§5**. La transmission ne sera plus retentée automatiquement — action manuelle requise.                                         | `Order.pdpStatus` repassé à `SENT/ACCEPTED` après replay, ou émission papier de secours tracée. |
| `[Admin] N batch(es) e-reporting bloqué(s)`                              | `EReportingBatch` PENDING/RETRYING/REJECTED/ABANDONED > 48h (EINV-CRON-005)                    | Sentry tag `eReportingBatchId` + fingerprint `["service","submit-ereporting-batch","rejected"\|"abandoned"]`. Vérifier provider PDP (PA agréée).                               | Voir **§6**. REJECTED/ABANDONED ne sont jamais rejoués automatiquement.                                                               | `EReportingBatch.status` passe à `SENT` puis `ACCEPTED`.                                        |
| `[Admin] N commande(s) en attente prolongée`                             | `alert-stuck-orders` hebdo                                                                     | Liste agrégée processing + shipped + invoices stuck + batches e-reporting bloqués.                                                                                             | Voir détails dans l'email + dashboard.                                                                                                | Le compteur baisse à la prochaine exécution.                                                    |

## Filtres Sentry

Toujours filtrer par tag (audit monitoring 2026-05-28 EINV-OPS-006 a promu les IDs en first-class) :

- `invoiceNumber:F-2026-00042`
- `creditNoteNumber:A-2026-00007`
- `orderId:ord_xxx`
- `refundId:ref_xxx`
- `paymentIntentId:pi_xxx`
- `stripeEventId:evt_xxx`
- `eReportingBatchId:batch_xxx`
- `invoice_path:archived|lazy_regenerate|lazy_generate_number` (signal santé eager path)
- `service:ensure-invoice-number|archive-invoice-pdf|void-invoice|persist-invoice-number|submit-ereporting-batch|retry-invoice-transmissions`
- `cronJob:reconcile-invoices|alert-stuck-orders|reconcile-refunds|retry-invoice-transmissions|transmit-ereporting-batch`

Fingerprints e-invoicing dédiés (un seul groupe Sentry par classe d'incident) :

- `["cron","retry-invoice-transmissions","abandoned"]` — transmission PDP facture abandonnée après MAX retries (EINV-CRON-002).
- `["service","submit-ereporting-batch","rejected"]` — batch e-reporting rejeté synchrone par la PA (action admin requise).
- `["service","submit-ereporting-batch","abandoned"]` — batch e-reporting abandonné après MAX retries.

## SLA opérationnel

- **Eager path** (webhook `payment_intent.succeeded`) : ≥ 99,5% de succès attendus pour `ensureInvoiceNumberPersisted`.
- **Lazy fallback** (route `/api/orders/[orderNumber]/invoice` avec `invoice_path:lazy_regenerate`) : < 1% du trafic facture.
- **Cron `reconcile-invoices`** : doit résoudre ≥ 90% des anomalies en une passe daily (rattrapage 24h max).
- **Couverture e-reporting** (dashboard `/admin/ventes/facturation`) : ≥ 99% SALES + REFUND. < 95% = critique.

## Procédures détaillées

### 1. Saturation séquence (limite annuelle 99 999)

> **Fréquence** : extrêmement rare (Synclune ~200 commandes/mois → ~50 ans avant saturation à régime constant). À traiter immédiatement si l'alerte tombe.

1. Vérifier Sentry — `BusinessError.code = INVOICE_SEQUENCE_OVERFLOW` ou `CREDIT_NOTE_SEQUENCE_OVERFLOW`.
2. Compter les factures émises dans l'année : `SELECT COUNT(*) FROM "Order" WHERE "invoiceNumber" LIKE 'F-YYYY-%';`.
3. Créer une migration Prisma :
   ```sql
   ALTER TABLE "Order" DROP CONSTRAINT "Order_invoiceNumber_format_check";
   ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceNumber_format_check"
       CHECK ("invoiceNumber" IS NULL OR "invoiceNumber" ~ '^F-[0-9]{4}-[0-9]{5,6}$');
   ```
4. Idem pour `creditNoteNumber` si l'alerte concerne les avoirs (`{5,6}` au lieu de `{5}`).
5. Mettre à jour `MAX_SEQUENCE_PER_YEAR = 999_999` dans `persist-invoice-number.service.ts` et `void-invoice.service.ts`.
6. Mettre à jour le `String(...).padStart(5, "0")` pour ne pas tronquer à 5 chars.
7. Déployer en urgence (l'émission est bloquée d'ici là).

### 2. Anomalie facture sur une commande spécifique

1. Aller sur `/admin/ventes/facturation` → section "Factures à résoudre".
2. Trouver l'`orderId` ou rechercher par `orderNumber`.
3. Cliquer "Relancer" — la Server Action `retryInvoiceGeneration` exécute synchrone la même logique que le cron.
4. Si "Tentatives multiples échouées" : ouvrir Sentry filtré sur `orderId:<id>` pour identifier la cause root.
5. Si root cause = UploadThing down : attendre rétablissement + relancer.
6. Si root cause = DB constraint : investiguer la donnée corrompue (rare).

### 3. Webhook Stripe en boucle d'échec

1. Filter Sentry par `stripeEventId:evt_xxx`.
2. Vérifier `WebhookEvent.attempts` + `WebhookEvent.errorMessage`.
3. Si la cause est un bug fix dans une version récente : re-déployer + Stripe re-livrera.
4. Si l'event est obsolète (paiement déjà réconcilié) : marquer manuellement `status = SKIPPED` dans Prisma Studio.

### 4. Test smoke staging

```bash
# Webhook simulé invoice failure (UploadThing env bidon)
UPLOADTHING_TOKEN=fake pnpm dev
# Trigger paiement test → vérifier :
#  - Order PAID
#  - Email admin reçu (sendAdminInvoiceFailedAlert ou sendAdminPdfArchiveFailedAlert)
#  - Order.invoiceRetryDeferred = true en DB
#  - OrderHistory action INVOICE_GENERATION_FAILED ou PDF_ARCHIVE_FAILED présent
```

Puis activer le cron manuellement :

```bash
curl -X GET "https://staging.synclune.fr/api/cron/reconcile-invoices" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Vérifier la réponse `processed > 0` et que `invoiceRetryDeferred` est repassé à `false`.

### 5. Transmission PDP facture abandonnée (`pdpStatus = ABANDONED`)

> **Contexte** : concerne uniquement les factures B2B/B2G (la transmission PDP). Le cron `retry-invoice-transmissions` (toutes les 15 min) retente les transmissions `REJECTED` avec backoff exponentiel (15min → 4h, 5 tentatives). À épuisement — ou sur un code de rejet non récupérable (SIRET inconnu, format invalide) — la facture passe `ABANDONED` et **n'est plus retentée automatiquement** : alerte Sentry (error) + email admin sont émis (EINV-CRON-002).

1. Filtrer Sentry sur le fingerprint `["cron","retry-invoice-transmissions","abandoned"]` ou le tag `orderId`.
2. Inspecter la cause : `SELECT "pdpRejectionCode", "pdpRejectionReason", "pdpRetryCount" FROM "Order" WHERE id = '<orderId>';` + les lignes `InvoiceTransmissionLog` (status `FAILED`) pour l'historique des tentatives.
3. **Cause = PDP injoignable durablement** (TIMEOUT/NETWORK/5xx) : vérifier le statut de la PA. Une fois rétablie, remettre la facture en file en repassant `pdpStatus = REJECTED` + `pdpRetryCount = 0` via Prisma Studio — le cron la reprendra au run suivant. **Ne jamais écrire `pdpStatus` directement depuis une Server Action** (invariant SSOT `persist-pdp-transmission`).
4. **Cause = payload refusé non corrigeable** (SIRET destinataire inconnu, format) : corriger la donnée source (annuaire client) puis remettre `REJECTED` comme ci-dessus, OU basculer en émission papier de secours (impression PDF archivé + envoi postal) et tracer la décision.
5. **Vérification** : `Order.pdpStatus` repasse à `SENT` puis `ACCEPTED` (webhook PA ou cron `reconcile-invoice-statuses`), ou la décision papier est consignée dans `OrderHistory`.

### 6. Batch e-reporting bloqué (`REJECTED` / `SENT` prolongé)

> **Contexte** : l'e-reporting B2C agrège les ventes/remboursements en `EReportingBatch` transmis à la PA. `RETRYING` est transitoire (auto-réparé par backoff — **ne déclenche pas d'alerte**, EINV-CRON-004). `REJECTED` (rejet synchrone PA) et `ABANDONED` (retries épuisés) ne sont **jamais** rejoués automatiquement. Le scan hebdo `alert-stuck-orders` remonte tout batch `PENDING/RETRYING/REJECTED/ABANDONED` âgé > 48h (EINV-CRON-005).

1. Filtrer Sentry sur `eReportingBatchId:<id>` ou les fingerprints `["service","submit-ereporting-batch","rejected"|"abandoned"]`.
2. Inspecter : `SELECT status, "retryCount", "rejectionReason", "providerBatchId" FROM "EReportingBatch" WHERE id = '<id>';`.
3. **`REJECTED`** : lire `rejectionReason` (motif PA). Corriger la cause (ex : période/montants), puis relancer le batch — via la Server Action admin `retryEReportingBatch` (dashboard) qui repasse le batch en `PENDING/RETRYING` ; ne jamais poser `status` manuellement (invariant 9).
4. **`SENT` prolongé sans passage `ACCEPTED`** : la PA a accusé réception mais l'acceptation DGFiP asynchrone n'est pas revenue. ⚠️ **Limitation connue (EINV-CRON-003)** : il n'existe pas encore de cron de réconciliation `SENT → ACCEPTED` pour les batches (contrairement aux factures via `reconcile-invoice-statuses`). À implémenter au branchement d'une PDP à acceptation asynchrone (cf. checklist « Brancher une nouvelle PDP » dans `docs/INVOICING.md`). En attendant : vérifier manuellement le statut côté portail PA.
5. **Vérification** : `EReportingBatch.status` passe à `SENT` puis `ACCEPTED` ; les `EReportingTransaction` enfants suivent.
