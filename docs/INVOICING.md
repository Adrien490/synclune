# Facturation électronique Synclune

Architecture, invariants et état d'avancement de la conformité française à la
réforme **facturation électronique 2026-2027** (Art. 286 / 289-I / 272-I /
293 B CGI, L102 B LPF, L123-22 C. com., Directive EU 2014/55).

> Audits :
>
> - `~/.claude/plans/tu-es-un-auditeur-radiant-stonebraker.md` (2026-05-27) — audit conformité initial.
> - `~/.claude/plans/tu-es-un-auditeur-merry-russell.md` (2026-05-28) — audit avoirs & remboursements (EINV-CREDIT-001 à 017).
>
> Ce document trace les choix d'implémentation qui en découlent.

---

## Statut Synclune

- **Forme juridique** : entrepreneur individuel, micro-entreprise.
- **Régime TVA actuel** : franchise art. 293 B (TVA non applicable).
- **Calendrier réforme** :
  - **Réception facture électronique B2B** : obligatoire au **1ᵉʳ septembre 2026**.
  - **Émission facture électronique B2B/B2G + e-reporting B2C** : obligatoire au **1ᵉʳ septembre 2027** (PME / TPE / micro-entreprises).
- **Verdict audit 2026-05-27** : note 62/100 — **partiellement prêt**. Phase 1+2+3+4 (1-2A-2B-3-4 partiel) ont livré l'infrastructure ; il manque le contrat PDP/PA et la transmission.

---

## Architecture

```
modules/invoices/
├── types/
│   ├── invoice-data.ts            # InvoiceData (objet pivot — source de vérité)
│   └── invoice-provider.ts        # interface InvoiceProvider (PDP/PA)
├── schemas/
│   └── invoice.schema.ts          # validation Zod runtime + refine cohérence
├── services/
│   ├── build-invoice-data.ts      # Order → InvoiceData (snapshot pur)
│   ├── render-invoice-pdf.ts      # InvoiceData → PDF (jsPDF)
│   ├── render-facturx.ts          # InvoiceData → XML CII MINIMUM (Factur-X 1.0.07)
│   ├── build-ereporting-transaction.ts  # Order|Refund → payload e-reporting
│   └── record-ereporting.service.ts     # wrapper feature-flag + idempotent + best-effort
├── providers/
│   ├── factory.ts                 # getInvoiceProvider() env-driven
│   └── local-pdf.provider.ts      # stub B2C par défaut
├── constants/
│   ├── cache.ts
│   └── feature-flags.ts           # INVOICE_FEATURE_FLAGS (env-driven, fail-closed)
├── data/
│   └── get-invoicing-overview.ts  # dashboard admin (compteurs + batches)
└── components/admin/
    └── invoicing-overview.tsx     # Server Component dashboard

modules/orders/services/                  # voisins toujours sources de numérotation
├── persist-invoice-number.service.ts     # F-YYYY-NNNNN — Art. 286 CGI
├── void-invoice.service.ts               # A-YYYY-NNNNN — Art. 272-I CGI
├── archive-invoice-pdf.service.ts        # UploadThing + SHA-256 — Art. L102 B LPF
└── ensure-invoice-number.service.ts      # eager via webhook — Art. 289-I CGI

modules/cron/services/
└── build-ereporting-batch.service.ts     # agrège transactions PENDING (daily 1h UTC)

app/api/cron/
└── build-ereporting-batch/route.ts
```

### Flux d'une commande payée (B2C franchise)

```
Stripe webhook payment_intent.succeeded
  │
  ├─→ markOrderAsPaid()                     (modules/payments)
  │
  ├─→ ensureInvoiceNumberPersisted()        F-YYYY-NNNNN ─ Art. 289-I
  │     └─ persistInvoiceNumber()           advisory lock pg_advisory_xact_lock
  │
  ├─→ recordSalesEReporting()               EReportingTransaction (SALES)
  │     ├─ if !enable_ereporting → skip
  │     ├─ if findFirst(orderId, SALES)     → skip (idempotent)
  │     └─ buildSalesTransaction(order) → prisma.create
  │
  └─→ post-checkout tasks                   emails, cache invalidation

GET /api/orders/[orderNumber]/invoice
  │
  ├─→ getOrder() + ownership check (admin bypass)
  ├─→ persistInvoiceNumber() fallback       (lazy, si webhook a échoué)
  ├─→ if archive Order.invoicePdfUrl → stream UploadThing  ⇐ Art. L102 B
  └─→ else
        ├─→ buildInvoiceData(order)         InvoiceData immuable
        ├─→ renderInvoicePdf(data)          jsPDF
        └─→ archiveInvoicePdf() best-effort UploadThing + SHA-256

Cron 1h UTC daily: build-ereporting-batch
  │
  ├─→ findMany EReportingTransaction PENDING + batchId=null + occurredAt < today
  ├─→ group by UTC day
  └─→ for each day:
        ├─→ prisma.$transaction:
        │     ├─ create EReportingBatch (status=PENDING)
        │     └─ updateMany transactions batchId=batch.id (filter batchId=null)
        └─→ (transmission DGFiP = futur transmit-ereporting-batch cron + PDP signé)
```

### Flux d'un remboursement

```
processRefund() (admin Server Action)        OR    reconcile-refunds cron (DLQ)
  │                                                  │
  ├─→ stripe.refunds.create()                        ├─→ stripe.refunds.retrieve()
  ├─→ persist stripeRefundId (Step 2.5)              ├─→ finalizeRefund() COMPLETED
  ├─→ tx Step 3: refund.update COMPLETED             └─→ recordRefundEReporting()
  │     + recalcul order.paymentStatus                     idempotent → skip si déjà créée
  │     + createOrderAuditTx(REFUND_COMPLETED)
  ├─→ recordRefundEReporting()               EReportingTransaction (REFUND, amount<0)
  └─→ sendRefundConfirmationEmail()
```

---

## Invariants intangibles

Référencés en détail dans **CLAUDE.md** § "Facturation électronique — invariants". Résumé :

1. **Aucune création manuelle de facture** — toute facture passe par `persistInvoiceNumber` (webhook payment ou route invoice lazy fallback).
2. **Aucun avoir manuel** — `voidInvoice` est le seul producteur de `A-YYYY-NNNNN`.
3. **`OrderHistory` immuable** — pas de `deletedAt`, pas d'`update`/`delete`. Audit trail 10 ans.
4. **Snapshots `OrderItem`** figés au checkout.
5. **Snapshots adresses** figés au checkout.
6. **PDF immuable** après paiement — archive UploadThing + SHA-256, servi en priorité depuis l'archive.
7. **Numérotation séquentielle gap-free** — CHECK constraints DB + advisory locks Postgres.
8. **Pas de vente manuelle / pas de caisse** — toute Order PAID passe par Stripe (sinon risque NF 525).

Tests de régression dédiés :

- `modules/orders/services/__tests__/order-history-immutability.regression.test.ts`
- `modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts`
- `modules/orders/services/__tests__/persist-invoice-number.service.test.ts` (suite "overflow")

---

## Matrices de décision B2C / B2B / B2G

| Type client                | Distinction au checkout                        | Format facture (cible)           | E-reporting DGFiP                                  | Plateforme requise |
| -------------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------------- | ------------------ |
| **B2C** (particulier)      | `customerType=B2C` (défaut)                    | PDF (Factur-X facultatif)        | **OUI** (Sept 2027)                                | OUI à terme        |
| **B2B FR** (entreprise FR) | `customerType=B2B` + SIREN/SIRET               | Factur-X / UBL / CII obligatoire | NON (la facture structurée transporte les données) | OUI obligatoire    |
| **B2G** (entité publique)  | `customerType=B2G` + identifiant Chorus        | UBL via Chorus Pro               | NON                                                | Chorus Pro         |
| **B2B intra-UE**           | `customerType=B2B` + VAT intracom              | Factur-X (intracom rules)        | NON                                                | OUI                |
| **B2C hors UE**            | `customerType=B2C` + `shippingCountry` hors UE | PDF + mention export             | OUI (export)                                       | À confirmer        |

Synclune actuel : 100 % B2C FR. La distinction B2B/B2G nécessite Phase 5 (onboarding form + lookup annuaire DGFiP).

---

## État des phases

| Phase   | Scope                                                                                                                                                                                                                                                                                             | Statut                                                 | Commits clés            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- |
| **1**   | Sécurisation immédiate (doc invariants, rollover guard 99999, validation env, cache immutable, admin bypass, UI download/filter/export, E2E)                                                                                                                                                      | ✓ livré 2026-05-27                                     | `63a063be` → `11165652` |
| **2A**  | Migrations Prisma additives (User B2B, Order snapshot, OrderItem TVA/ligne, Refund.creditNoteNumber)                                                                                                                                                                                              | ✓ livré 2026-05-27                                     | `e2aa1eec` → `116f9458` |
| **2B**  | Module `modules/invoices/` (InvoiceData pivot, schemas, build/render, provider abstraction, flags)                                                                                                                                                                                                | ✓ livré 2026-05-27                                     | `2663de7d` → `df659031` |
| **3**   | Factur-X MINIMUM XML + modèles EReporting + service build transaction + cron aggregation                                                                                                                                                                                                          | ✓ livré 2026-05-28                                     | `3bdc268f` → `b17d4272` |
| **4**   | Câblage hooks production (SALES + REFUND e-reporting sur webhooks payment/refund/cancel-order/mark-as-fully-refunded) + dashboard admin + cette doc                                                                                                                                               | ✓ livré 2026-05-28                                     | `99be7719` → présent    |
| **2C**  | Avoir comptable Phase 2 — `issueCreditNoteForRefund` (refund partiel), `archiveCreditNotePdf`, `buildCreditNoteData`, endpoint `/credit-note/[refundId]`, enum `CREDIT_NOTE_GENERATED`, fenêtre `reconcile-refunds` 90j, Sentry alert `voidInvoice` failed                                        | ⏳ livré 2026-05-28 (audit EINV-CREDIT)                | présent                 |
| **3+**  | Validation CEN EN 16931 runtime (BR-CO-_ + BR-FR-FX-_) via `assertFacturXCenRules` + `assertUblCenRules` — flag opt-in `INVOICE_VALIDATE_XML` (cf. audit 2026-05-28). XSD validation CI complète + PDF/A-3 embedding (engine swap jsPDF→pdf-lib) restent reportés post-PDP signing                | ⏳ partiel — runtime livré, XSD/PDF-A3 reportés        | présent                 |
| **3++** | Provider PDP/PA concret + cron `transmit-ereporting-batch` + cron `transmit-invoices` (B2B initial) + webhook entrant. Infrastructure complète (orchestrateurs + interface + canary `shouldTransmitInvoice` + 2 crons no-op tant que `LocalPdfProvider`) — manque uniquement le provider concret. | ⏳ infrastructure prête — attente provider concret     | présent                 |
| **4+**  | E2E full flow B2C avec transmission sandbox + audit externe comptable+RGPD                                                                                                                                                                                                                        | 🔒 bloqué : sandbox PDP requise                        | —                       |
| **5**   | Onboarding B2B (form SIREN) + lookup annuaire DGFiP + Chorus Pro — `lookupEInvoicingDirectory` interface + cron `refresh-stale-directory-entries` livrés, manque provider concret                                                                                                                 | ⏳ infrastructure partielle — attente provider concret | présent                 |

---

## Feature flags

Pilotés par variables d'environnement, validés au boot via `envSchema`
(`shared/schemas/env.schema.ts`). **Fail-closed** : une valeur autre que
`true|1|yes` (insensible casse) = OFF.

| Variable                               | Effet quand ON                                                                        | Effet quand OFF (défaut)                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `INVOICE_PROVIDER=local` (défaut)      | n/a                                                                                   | n/a                                                          |
| `INVOICE_PROVIDER=<pdp>` (futur)       | Active provider concret pour transmission                                             | Comportement actuel local                                    |
| `INVOICE_ENABLE_XML`                   | Génère Factur-X XML en plus du PDF                                                    | XML jamais généré                                            |
| `INVOICE_ENABLE_EREPORTING`            | `recordSalesEReporting` / `recordRefundEReporting` créent réellement les transactions | Hooks répondent "skipped" immédiatement (rien en DB)         |
| `INVOICE_VALIDATE_XML`                 | Active la validation CEN EN 16931 post-render (BR-CO-_ + BR-FR-FX-_). Fail-closed     | Renderer émet sans valider (assertions structurelles seules) |
| `INVOICE_ENABLE_PROVIDER_TRANSMISSION` | Active la transmission B2B/B2G via `transmit-invoices` cron + `submit-invoice-by-id`  | Cron tourne mais skip tous les candidats                     |
| `INVOICE_TRANSMISSION_CANARY_PERCENT`  | Limite la transmission à X% des orders (hash modulo). 0=off, 100=full                 | 0% = aucune transmission                                     |
| `INVOICE_TRANSMISSION_MIN_AMOUNT`      | Ne transmet que les factures > X centimes (pilote B2B grosses commandes)              | Pas de seuil                                                 |

**Recommandation de roll-out** (ordre chronologique, étape N exige étape N-1) :

1. ⏳ **Staging** — `INVOICE_ENABLE_EREPORTING=true` : la cron J4 agrège les `EReportingTransaction`, rien n'est transmis (provider=local). Valide la qualité des `payloadSnapshot` snapshot par snapshot pendant ~7 jours.
2. ⏳ **Staging** — `INVOICE_VALIDATE_XML=true` : capture les drifts CEN EN 16931 entre `buildInvoiceData` et `renderFacturXMinimum`/`renderUblInvoice`. Si une seule violation BR-CO-_ / BR-FR-FX-_ sort, c'est un bug bloquant à corriger avant prod.
3. ⏳ **Prod canary 1 %** — `INVOICE_ENABLE_EREPORTING=true` : mesure l'overhead webhook (~5ms attendu). Snapshot prod ⇄ snapshot staging doit être identique structurellement.
4. ⏳ **Prod 100 %** — `INVOICE_ENABLE_EREPORTING=true` partout.
5. 🔒 **Pré-PDP signing** — `INVOICE_ENABLE_XML=true` : les XML serviront à la transmission. Activer après que `INVOICE_VALIDATE_XML` ait tourné ≥ 4 semaines sans alerte.
6. 🔒 **PDP signing** — `INVOICE_PROVIDER=<chosen-pdp>` : remplacer `LocalPdfProvider`. Tester en sandbox PDP avant.
7. 🔒 **PDP transmission canary** — `INVOICE_ENABLE_PROVIDER_TRANSMISSION=true` + `INVOICE_TRANSMISSION_CANARY_PERCENT=1` + `INVOICE_TRANSMISSION_MIN_AMOUNT=50000` (transmet uniquement ~1 % des orders > 500 €). Monitorer le ratio ACCEPTED/REJECTED sur 1 semaine.
8. 🔒 **PDP transmission full** — `INVOICE_TRANSMISSION_CANARY_PERCENT=100`, `INVOICE_TRANSMISSION_MIN_AMOUNT=0`.

---

## Brancher une nouvelle PDP

Étapes pour ajouter un provider concret (Chorus Pro, PDP commerciale, etc.) sans toucher au contrat existant. L'abstraction repose sur l'interface `InvoiceProvider` (`modules/invoices/types/invoice-provider.ts`), un factory env-driven (`modules/invoices/providers/factory.ts`) et trois orchestrateurs réutilisables :

- `submitInvoiceById(orderId)` — `modules/invoices/services/submit-invoice-by-id.service.ts` (Phase 5 B2B/B2G).
- `submitEReportingBatchById(batchId)` — `modules/invoices/services/submit-ereporting-batch.service.ts` (Phase 3+ B2C).
- `persistPdpTransmission` — `modules/orders/services/persist-pdp-transmission.service.ts` (audit trail + idempotence).

### Checklist

1. **Créer la classe provider** dans `modules/invoices/providers/<name>.provider.ts` :
   - `implements InvoiceProvider`
   - `id`, `supportedFormats`, `capabilities` adaptés. Mettre à `true` uniquement les méthodes implémentées — `LocalPdfProvider` est l'exemple "tout à `false`", `MockProvider` "tout à `true`".
   - Méthodes non supportées : `throw new Error("not implemented")` (jamais retourner un faux statut).
2. **Ajouter le case dans la factory** `modules/invoices/providers/factory.ts` :
   - `case "<name>": cached = new <Name>Provider(); return cached;`
   - Retirer `<name>` de la liste throw "reserved" si présent.
3. **Définir les env vars provider-specific** dans `shared/schemas/env.schema.ts` :
   - `<NAME>_API_URL`, `<NAME>_API_KEY`, `<NAME>_WEBHOOK_SECRET`. Ne jamais hardcoder d'URL ni de secret dans le code.
4. **Implémenter `handleProviderWebhook`** : vérifier la signature provider-specific (HMAC, RSA, etc.). La route générique `/api/webhooks/pdp/<name>` la délègue déjà — voir `app/api/webhooks/pdp/[providerId]/route.ts`.
5. **Mapper les erreurs HTTP** :
   - 4xx (validation, schema) → throw `ProviderBusinessError(message, status)` → l'orchestrateur passe en `REJECTED` direct sans retry.
   - 5xx / timeout / network → throw classique → l'orchestrateur passe en `RETRYING` avec backoff exponentiel.
6. **Écrire les tests** :
   - Étendre `provider-contract.test.ts` pour inclure le provider dans le harness `describe.each`.
   - Tests dédiés `<name>.provider.test.ts` (signature webhook, error mapping, idempotence).
7. **Bascule progressive** :
   - `INVOICE_PROVIDER=mock` en CI E2E pour tester l'orchestration.
   - `INVOICE_PROVIDER=<name>` en staging vers sandbox PDP.
   - Canary 1% prod via flag custom (à définir au moment du go-live).
   - Activer `INVOICE_ENABLE_XML=true` puis `INVOICE_ENABLE_EREPORTING=true` selon scope.

### Invariants à respecter

- Aucun `process.env.INVOICE_PROVIDER` ailleurs que dans `factory.ts`.
- Aucun appel HTTP externe en dehors de la classe provider — l'orchestrateur ne connaît que l'interface.
- Toute transition `Order.pdpStatus` passe par `persistPdpTransmission` (régression test `no-direct-pdp-status-write`).
- Aucune mutation directe `EReportingTransaction` / `EReportingBatch` hors `record-ereporting.service.ts` + `build-ereporting-batch.service.ts` + `submit-ereporting-batch.service.ts` (Invariant 9, cf. CLAUDE.md).
- Idempotence : `providerInvoiceId` / `providerBatchId` doivent être stables pour le même input — `MockProvider` montre le pattern (hash de `invoiceNumber`).

---

## Conformité réglementaire — matrice

| Article                                         | Localisation                                                    | Statut                                           |
| ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| Art. 286 CGI — séquentialité gap-free           | `persist-invoice-number.service.ts` + CHECK DB                  | ✓                                                |
| Art. 289-I CGI — émission à l'encaissement      | `ensure-invoice-number.service.ts` (ORD-COMPLY-002)             | ✓                                                |
| Art. 272-I CGI — avoir post-facture (full)      | `void-invoice.service.ts` (ORD-COMPLY-003)                      | ✓                                                |
| Art. 272-I CGI — avoir post-facture (partiel)   | `issueCreditNoteForRefund` (EINV-CREDIT-001/005/010)            | ✓ livré 2026-05-28                               |
| Art. 293 B CGI — mention franchise TVA          | `render-invoice-pdf.ts` (mention pied)                          | ✓                                                |
| Art. L102 B LPF — immutabilité 10 ans (facture) | `archive-invoice-pdf.service.ts` (ORD-COMPLY-005)               | ✓                                                |
| Art. L102 B LPF — immutabilité 10 ans (avoir)   | `archive-credit-note-pdf.service.ts` (EINV-CREDIT-002)          | ✓ livré 2026-05-28                               |
| Art. L123-22 C. com. — audit trail              | `OrderHistory` + `createOrderAuditTx`                           | ✓                                                |
| Art. 50-0 CGI — CA à l'encaissement             | `export-orders-csv.service.ts` filtre `paidAt` (ORD-COMPLY-007) | ✓                                                |
| EU 2014/55 — facture structurée                 | `render-facturx.ts` profil MINIMUM                              | ✓ partiel (MINIMUM, pas BASIC/EN16931/EXTENDED)  |
| Réforme 2026/2027 — émission structurée B2B     | (Phase 5 + provider PDP)                                        | 🔒                                               |
| Réforme 2026/2027 — e-reporting B2C             | (Phase 3+4 + provider PDP)                                      | ⏳ infrastructure prête, transmission en attente |

---

## Troubleshooting

### "Facture indisponible pour cette commande" (400)

Cause : `order.paymentStatus !== "PAID"`.
Fix : vérifier le statut de paiement Stripe, attendre webhook ou faire tourner `sync-async-payments`.

### Aucune `EReportingTransaction` créée après paiement

1. Vérifier `INVOICE_ENABLE_EREPORTING=true` dans l'env.
2. Vérifier dans le dashboard `/admin/ventes/facturation` la carte feature flags.
3. Chercher `service:record-ereporting` dans les logs Sentry pour erreurs DB.
4. Idempotence : si une transaction existe déjà (`findFirst` match), le hook retourne `"skipped"` silencieusement — c'est normal en cas de webhook replay.

### Batch e-reporting bloqué en `PENDING`

Tant que le provider PDP n'est pas configuré, **c'est attendu**. Le cron `build-ereporting-batch` crée les batches mais n'a personne à qui les transmettre. Dès qu'un provider concret remplacera `LocalPdfProvider`, le futur cron `transmit-ereporting-batch` consommera la file (ordre `periodFrom asc`).

### Batch `REJECTED`

Voir l'alerte rouge en haut du dashboard. Le `rejectionReason` est stocké sur le batch ; les détails d'API sont dans la table `providerResponse` (Json). Workflow :

1. Lire la raison, corriger le payload côté Order (souvent un champ manquant).
2. Re-créer une `EReportingTransaction` pour les transactions impactées (script ad-hoc — pas encore d'UI).
3. Le prochain run de `build-ereporting-batch` les ré-agrège dans un nouveau batch.

### Erreur `INVOICE_SEQUENCE_OVERFLOW` (99999/an)

Le format `F-YYYY-NNNNN` ne permet que 99 999 factures par année. Au-delà :

1. Migration : étendre la regex CHECK à `^F-[0-9]{4}-[0-9]{5,6}$`.
2. Étendre `padStart(5, "0")` → `padStart(6, "0")` dans le service.

Probabilité : nulle à court terme (Synclune émet ~50-100 factures/mois). Le guard existe pour éviter une P2002 silencieuse rejouée 5 fois.

---

## Crons

| Job                               | Schedule (UTC) | Service                                                            | Statut                                                                                                                            |
| --------------------------------- | -------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `build-ereporting-batch`          | `0 1 * * *`    | `modules/cron/services/build-ereporting-batch.service.ts`          | ✓ livré (Phase 3)                                                                                                                 |
| `transmit-ereporting-batch`       | `*/30 * * * *` | `modules/cron/services/transmit-ereporting-batch.service.ts`       | ✓ livré (dry-run tant que `provider=local`)                                                                                       |
| `transmit-invoices`               | `*/30 * * * *` | `modules/cron/services/transmit-invoices.service.ts`               | ✓ livré (Phase 3++ — initial B2B/B2G transmission, no-op tant que `INVOICE_ENABLE_PROVIDER_TRANSMISSION` OFF ou `provider=local`) |
| `retry-invoice-transmissions`     | `*/15 * * * *` | `modules/cron/services/retry-invoice-transmissions.service.ts`     | ✓ livré (DLQ REJECTED, backoff exponentiel 5×)                                                                                    |
| `reconcile-invoices`              | `0 2 * * *`    | `modules/cron/services/reconcile-invoices.service.ts`              | ✓ livré (DLQ invoiceRetryDeferred 3 passes)                                                                                       |
| `reconcile-voided-invoices`       | `0 7 * * *`    | `modules/cron/services/reconcile-voided-invoices.service.ts`       | ✓ livré (rattrape avoirs manquants post-refund)                                                                                   |
| `reconcile-invoice-statuses`      | `0 */4 * * *`  | `modules/cron/services/reconcile-invoice-statuses.service.ts`      | ✓ livré (polling status PDP si webhook raté)                                                                                      |
| `refresh-stale-directory-entries` | `0 6 1 * *`    | `modules/cron/services/refresh-stale-directory-entries.service.ts` | ✓ livré (annuaire DGFiP, no-op `LocalPdfProvider`)                                                                                |

Cf. `docs/CRONS.md` pour la liste complète des crons Synclune (incl. crons non liés à la facturation).

---

## Variables d'environnement

```bash
# Vendeur (validés au boot via envSchema)
VENDOR_LEGAL_NAME="TADDEI LEANE - Entrepreneur Individuel"
VENDOR_TRADE_NAME="Synclune"
VENDOR_SIREN="839 183 027"          # 9 chiffres (espaces optionnels)
VENDOR_SIRET="839 183 027 00037"    # 14 chiffres (espaces optionnels)
VENDOR_VAT_NUMBER="FR35839183027"   # FR + 2 chars + 9 chiffres SIREN
VENDOR_APE_CODE="47.91B"
VENDOR_FULL_ADDRESS="77 Boulevard du Tertre, 44100 Nantes, France"
VENDOR_EMAIL="contact@synclune.fr"
VENDOR_VAT_EXEMPTION_TEXT="TVA non applicable, art. 293 B du CGI"
# … cf. shared/lib/stripe.ts:getVendorLegalInfo()

# Provider & feature flags
INVOICE_PROVIDER=local                          # local (défaut) | mock | chorus-pro (futur) | pdp-xxx (futur)
INVOICE_ENABLE_XML=                             # vide = OFF, "true"/"1"/"yes" = ON
INVOICE_ENABLE_EREPORTING=                      # idem
INVOICE_VALIDATE_XML=                           # idem — active validation CEN EN 16931 post-render
INVOICE_ENABLE_PROVIDER_TRANSMISSION=           # idem — kill-switch global transmission B2B/B2G
INVOICE_TRANSMISSION_CANARY_PERCENT=0           # 0-100, hash modulo orderId
INVOICE_TRANSMISSION_MIN_AMOUNT=0               # centimes (0 = pas de seuil)
```

---

## Points en attente (décisions métier / business)

1. **Choix plateforme agréée (PDP / PA)** — débloque la transmission e-reporting et l'émission B2B structurée. Critères à arbitrer : prix, support B2C-only, intégration API/webhook, certification DGFiP.
2. **Profil Factur-X cible pour B2B** : MINIMUM (livré) suffit ? ou BASIC/EN16931 ? Dépend de ce que la PDP exige.
3. **Périodicité e-reporting B2C** : décret final pas encore publié (mai 2026). Daily aggregation est notre défaut prudent.
4. **TVA franchise dans Factur-X** : code UNTDID 5305 retenu = `ZB` (zéro pour franchise). À valider avec un expert-comptable que ce mapping est accepté par la DGFiP.
5. **Bascule régime réel TVA** : si Synclune dépasse 37 500 € en services, recalibrer `OrderItem.taxRate`/`taxAmount` au checkout et reprendre la numérotation depuis le compteur courant (pas de reset).
