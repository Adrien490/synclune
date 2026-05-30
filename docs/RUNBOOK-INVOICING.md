# Runbook — Observabilité facturation

Procédures opérationnelles pour les alertes email admin facturation. Mis en place suite à l'audit `EINV-OPS-*` (2026-05-28).

> **Recentrage B2C (2026-05-28)** : la transmission B2B/B2G sur PA (« Plateforme Agréée », ex-PDP) a été supprimée (Synclune = micro-entreprise franchise TVA, vente B2C). Les alertes liées à `transmit-invoices` / `retry-invoice-transmissions` / `reconcile-invoice-statuses` / `refresh-stale-directory-entries` ne s'appliquent plus. Restent : génération/archivage facture, avoirs, e-reporting B2C.

> Voir aussi `docs/INVOICING.md` pour l'architecture détaillée du module (cycle facture/avoir, e-reporting).

## Tableau d'intervention

| Alerte email                                         | Symptôme                                                                                                | Diagnostic                                                                                                                                                                                                            | Remédiation                                                                                                                           | Vérification                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `[Admin] Échec génération facture`                   | `ensure-invoice-number` n'a pas pu écrire `invoiceNumber`                                               | Vérifier Sentry tag `service:ensure-invoice-number` + `orderId`. Causes : advisory lock conflict prolongé, P2002 persistant, DB down.                                                                                 | Le cron `reconcile-invoices` (daily 02:00) rejouera. Pour relancer manuellement : bouton "Relancer" dans `/admin/ventes/facturation`. | Vérifier `Order.invoiceNumber IS NOT NULL` puis `OrderHistory` action `INVOICE_RECONCILED`. |
| `[Admin] Échec archivage PDF facture`                | `archiveInvoicePdf` n'a pas réussi l'upload UploadThing                                                 | Sentry tag `service:archive-invoice-pdf`. Causes : UploadThing down, quota, signature invalide.                                                                                                                       | Vérifier le statut UploadThing. Le cron `reconcile-invoices` retentera. Bouton "Relancer" dispo.                                      | `Order.invoicePdfUrl IS NOT NULL` puis hash SHA-256 vérifié.                                |
| `[Admin] Échec émission avoir`                       | `voidInvoice` retourne `kind: "failed"` après 5 retries                                                 | Sentry tag `service:void-invoice`. Causes : advisory lock persistant, contrainte CHECK violée, race émission avoir.                                                                                                   | Cron `reconcile-invoices` rejouera (passe 3). Si > 3 tentatives, escalade auto.                                                       | `Order.creditNoteNumber IS NOT NULL` + `OrderHistory.INVOICE_VOIDED`.                       |
| `[URGENT] Saturation séquence facture/avoir`         | 99 999 factures (ou avoirs) émises dans l'année                                                         | `BusinessError.code = INVOICE_SEQUENCE_OVERFLOW` ou `CREDIT_NOTE_SEQUENCE_OVERFLOW`. Émission complètement bloquée.                                                                                                   | **Migration urgente** : étendre regex `Order_invoiceNumber_format_check` à `^F-[0-9]{4}-[0-9]{5,6}$`. Idem `creditNote`. Déployer.    | Tester émission d'une nouvelle facture sur staging avant prod.                              |
| `[Admin] Webhook X échoué N tentatives`              | Cron `retry-webhooks` n'arrive plus à traiter un event Stripe                                           | Sentry tag `webhookHandler` + `stripeEventId`. Vérifier Stripe dashboard.                                                                                                                                             | Re-déclencher manuellement via Stripe (resend webhook) ou via `/admin/stripe/webhooks/replay`.                                        | `WebhookEvent.status = COMPLETED`.                                                          |
| `[Admin] N batch(es) e-reporting bloqué(s)`          | `EReportingBatch` PENDING/RETRYING/REJECTED/ABANDONED > 48h (EINV-CRON-005)                             | Sentry tag `eReportingBatchId` + fingerprint `["service","submit-ereporting-batch","rejected"\|"abandoned"]`. Vérifier le provider e-reporting (PA agréée).                                                           | Voir **§5**. REJECTED/ABANDONED ne sont jamais rejoués automatiquement.                                                               | `EReportingBatch.status` passe à `SENT` puis `ACCEPTED`.                                    |
| `[Admin] N commande(s) en attente prolongée`         | `alert-stuck-orders` hebdo                                                                              | Liste agrégée processing + shipped + invoices stuck + batches e-reporting bloqués.                                                                                                                                    | Voir détails dans l'email + dashboard.                                                                                                | Le compteur baisse à la prochaine exécution.                                                |
| `[Admin] Cron reconcile-invoices:ereporting-orphans` | Transaction(s) e-reporting PENDING dont la période est close > 48h et jamais batchée (EINV-EREPORT-008) | Sentry fingerprint `["ereporting","orphan-transactions"]` — détail `orphanCount` / `oldestOccurredAt` / `sampleIds`. Cause probable : `build-ereporting-batch` n'a pas tourné, a crashé, ou une période a été sautée. | Voir **§6**.                                                                                                                          | Le prochain `build-ereporting-batch` rattache les transactions (orphanCount → 0).           |

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
- `service:ensure-invoice-number|archive-invoice-pdf|void-invoice|persist-invoice-number|submit-ereporting-batch`
- `cronJob:reconcile-invoices|reconcile-invoices:ereporting-orphans|alert-stuck-orders|reconcile-refunds|transmit-ereporting-batch`

Fingerprints e-invoicing dédiés (un seul groupe Sentry par classe d'incident) :

- `["service","submit-ereporting-batch","rejected"]` — batch e-reporting rejeté synchrone par la PA (action admin requise).
- `["service","submit-ereporting-batch","abandoned"]` — batch e-reporting abandonné après MAX retries.
- `["ereporting","orphan-transactions"]` — transaction e-reporting close jamais batchée (anti-trou EINV-EREPORT-008, Passe 5 `reconcile-invoices`).
- `["ereporting","requeue-cap-exceeded"]` — transaction(s) ayant atteint le cap de re-queue (EINV-EREPORT-009) : figées `ABANDONED` sur leur tombstone batch, plus jamais ré-agrégées automatiquement. Niveau `error` : corriger l'Order/Refund source puis re-queue manuel.

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

### 5. Batch e-reporting bloqué (`REJECTED` / `SENT` prolongé)

> **Contexte** : l'e-reporting B2C agrège les ventes/remboursements en `EReportingBatch` transmis à la PA. `RETRYING` est transitoire (auto-réparé par backoff — **ne déclenche pas d'alerte**, EINV-CRON-004). `REJECTED` (rejet synchrone PA) et `ABANDONED` (retries épuisés) ne sont **jamais** rejoués automatiquement. Le scan hebdo `alert-stuck-orders` remonte tout batch `PENDING/RETRYING/REJECTED/ABANDONED` âgé > 48h (EINV-CRON-005).

1. Filtrer Sentry sur `eReportingBatchId:<id>` ou les fingerprints `["service","submit-ereporting-batch","rejected"|"abandoned"]`.
2. Inspecter : `SELECT status, "retryCount", "rejectionReason", "providerBatchId" FROM "EReportingBatch" WHERE id = '<id>';`.
3. **`REJECTED`** : lire `rejectionReason` (motif PA). Corriger la cause (ex : période/montants), puis relancer le batch — via la Server Action admin `retryEReportingBatch` (dashboard) qui repasse le batch en `PENDING/RETRYING` ; ne jamais poser `status` manuellement (invariant 9).
4. **`SENT` prolongé sans passage `ACCEPTED`** : la PA a accusé réception mais l'acceptation DGFiP asynchrone n'est pas revenue. Depuis 2026-05-30, `alert-stuck-orders` **remonte** tout batch `SENT` > 48h (plus invisible). ⚠️ **Reste différé (EINV-CRON-003)** : pas de cron de réconciliation `SENT → ACCEPTED` automatique (méthode `getEReportingBatchStatus` stubbée dans l'interface, à implémenter au branchement d'une PA à acceptation asynchrone — cf. `docs/INVOICING.md § Durcissement pré-go-live`). En attendant : sur alerte, vérifier manuellement le statut côté portail PA.

5. **Transaction(s) `requeue-cap-exceeded`** (EINV-EREPORT-009) : un batch a été re-rejeté trop de fois ; ses transactions sont figées `ABANDONED` (attachées au tombstone, non ré-agrégées). Lire le contexte Sentry (`cappedCount`), corriger la donnée source (Order/Refund), puis remettre manuellement les transactions concernées en `PENDING` + `batchId=null` via Prisma Studio (le prochain `build-ereporting-batch` les ré-agrègera). Ne jamais poser `status`/`batchId` depuis une Server Action (invariant 9).
6. **Vérification** : `EReportingBatch.status` passe à `SENT` puis `ACCEPTED` ; les `EReportingTransaction` enfants suivent.

### 6. Transactions e-reporting orphelines (anti-trou périodes — EINV-EREPORT-008)

> **Contexte** : la Passe 5 de `reconcile-invoices` (`check-ereporting-period-continuity.service.ts`) détecte les `EReportingTransaction` `PENDING` + `batchId = null` dont la période est close depuis > 48h. L'exclusion constraint `EReportingPeriod_no_overlap` garantit le non-recouvrement mais **PAS** l'absence de trou : ce contrôle est le filet. Une transaction orpheline = vente/remboursement encaissé jamais agrégé donc jamais déclaré (sous-déclaration DGFiP). Lecture seule — n'auto-corrige PAS.

1. Filtrer Sentry sur le fingerprint `["ereporting","orphan-transactions"]` (contexte `orphanCount` / `oldestOccurredAt` / `sampleIds`).
2. Inspecter : `SELECT id, "occurredAt", type, status, "batchId" FROM "EReportingTransaction" WHERE id = ANY('{<sampleIds>}');`.
3. **Cause la plus fréquente** : `build-ereporting-batch` (daily 01:00) n'a pas tourné ou a échoué. Vérifier les logs Vercel du cron + Sentry `cronJob:build-ereporting-batch`.
4. **Remédiation** : relancer `build-ereporting-batch` (il rattache idempotemment les transactions orphelines au prochain run — filtre `batchId = null`). Ne jamais poser `batchId`/`status` à la main (invariant 9).
5. **Si une période a été sautée structurellement** (rejet build sur cette période, bug grouping) : corriger la cause puis relancer le build. Vérifier qu'une `EReportingPeriod` couvre bien `occurredAt`.
6. **Vérification** : au prochain `reconcile-invoices`, `orphanCount` retombe à 0 (plus d'alerte) ; les transactions ont un `batchId` non nul.
