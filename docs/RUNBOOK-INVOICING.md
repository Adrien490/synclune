# Runbook — Observabilité facturation

Procédures opérationnelles pour les alertes email admin facturation. Mis en place suite à l'audit `EINV-OPS-*` (2026-05-28).

> Voir aussi `docs/INVOICING.md` pour l'architecture détaillée du module (cycle facture/avoir, e-reporting, PDP).

## Tableau d'intervention

| Alerte email                                 | Symptôme                                                      | Diagnostic                                                                                                                            | Remédiation                                                                                                                           | Vérification                                                                                |
| -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `[Admin] Échec génération facture`           | `ensure-invoice-number` n'a pas pu écrire `invoiceNumber`     | Vérifier Sentry tag `service:ensure-invoice-number` + `orderId`. Causes : advisory lock conflict prolongé, P2002 persistant, DB down. | Le cron `reconcile-invoices` (daily 02:00) rejouera. Pour relancer manuellement : bouton "Relancer" dans `/admin/ventes/facturation`. | Vérifier `Order.invoiceNumber IS NOT NULL` puis `OrderHistory` action `INVOICE_RECONCILED`. |
| `[Admin] Échec archivage PDF facture`        | `archiveInvoicePdf` n'a pas réussi l'upload UploadThing       | Sentry tag `service:archive-invoice-pdf`. Causes : UploadThing down, quota, signature invalide.                                       | Vérifier le statut UploadThing. Le cron `reconcile-invoices` retentera. Bouton "Relancer" dispo.                                      | `Order.invoicePdfUrl IS NOT NULL` puis hash SHA-256 vérifié.                                |
| `[Admin] Échec émission avoir`               | `voidInvoice` retourne `kind: "failed"` après 5 retries       | Sentry tag `service:void-invoice`. Causes : advisory lock persistant, contrainte CHECK violée, race émission avoir.                   | Cron `reconcile-invoices` rejouera (passe 3). Si > 3 tentatives, escalade auto.                                                       | `Order.creditNoteNumber IS NOT NULL` + `OrderHistory.INVOICE_VOIDED`.                       |
| `[URGENT] Saturation séquence facture/avoir` | 99 999 factures (ou avoirs) émises dans l'année               | `BusinessError.code = INVOICE_SEQUENCE_OVERFLOW` ou `CREDIT_NOTE_SEQUENCE_OVERFLOW`. Émission complètement bloquée.                   | **Migration urgente** : étendre regex `Order_invoiceNumber_format_check` à `^F-[0-9]{4}-[0-9]{5,6}$`. Idem `creditNote`. Déployer.    | Tester émission d'une nouvelle facture sur staging avant prod.                              |
| `[Admin] Webhook X échoué N tentatives`      | Cron `retry-webhooks` n'arrive plus à traiter un event Stripe | Sentry tag `webhookHandler` + `stripeEventId`. Vérifier Stripe dashboard.                                                             | Re-déclencher manuellement via Stripe (resend webhook) ou via `/admin/stripe/webhooks/replay`.                                        | `WebhookEvent.status = COMPLETED`.                                                          |
| `[Admin] N batch(es) e-reporting bloqué(s)`  | `EReportingBatch` PENDING/RETRYING > 48h                      | Sentry tag `eReportingBatchId`. Vérifier provider PDP (Chorus Pro/aggregateur).                                                       | Si provider PDP non câblé : attendre. Sinon : vérifier creds + replay batch via dashboard.                                            | `EReportingBatch.status` passe à `SENT` puis `ACCEPTED`.                                    |
| `[Admin] N commande(s) en attente prolongée` | `alert-stuck-orders` hebdo                                    | Liste agrégée processing + shipped + invoices stuck.                                                                                  | Voir détails dans l'email + dashboard.                                                                                                | Le compteur baisse à la prochaine exécution.                                                |

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
- `service:ensure-invoice-number|archive-invoice-pdf|void-invoice|persist-invoice-number`
- `cronJob:reconcile-invoices|alert-stuck-orders|reconcile-refunds`

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
