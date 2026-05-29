# Facturation électronique Synclune

Architecture, invariants et état d'avancement de la conformité française à la
réforme **facturation électronique 2026-2027** (Art. 286 / 289-I / 272-I /
293 B CGI, L102 B LPF, L123-22 C. com., Directive EU 2014/55).

> **⚠️ Recentrage B2C (2026-05-28).** Synclune est une micro-entreprise en
> franchise de TVA vendant **exclusivement en B2C**. Toute l'infrastructure de
> **transmission B2B/B2G sur PDP** (champs `Order.pdp*`, modèles
> `InvoiceTransmissionLog` / `ProviderWebhookEvent`, crons `transmit-invoices` /
> `retry-invoice-transmissions` / `reconcile-invoice-statuses`), l'**annuaire
> DGFiP** (`refresh-stale-directory-entries`, champs `User`/`Order` de routing),
> le **XML structuré** (Factur-X / UBL / CII) et la **TVA par ligne OrderItem**
> ont été **supprimés** : jamais activés, sans pertinence pour un commerce B2C en
> franchise. La seule couche structurée conservée est l'**e-reporting B2C**
> agrégé (`EReportingTransaction` / `EReportingBatch`, vraie obligation Sept 2027).
> Les sections ci-dessous décrivant la transmission PDP B2B/B2G et le XML sont
> conservées à titre historique mais **ne correspondent plus au code**.

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
  ├─→ group by PÉRIODE (computeEReportingPeriod, EREPORTING_PERIOD_LENGTH, défaut DAILY)
  └─→ for each période CLOSE (periodTo ≤ now — sinon différée) :
        ├─→ prisma.$transaction:
        │     ├─ upsert EReportingPeriod (periodFrom @unique, idempotent)
        │     ├─ create EReportingBatch (status=PENDING, periodId)
        │     └─ updateMany transactions batchId=batch.id (filter batchId=null)
        └─→ (transmission DGFiP = futur transmit-ereporting-batch cron + PDP signé)
```

#### Non-recouvrement vs anti-trou des périodes (EINV-EREPORT-006/008)

L'exclusion constraint Postgres `EReportingPeriod_no_overlap`
(`EXCLUDE USING gist (tsrange(periodFrom, periodTo, '[)') WITH &&)`) garantit le
**NON-RECOUVREMENT** des périodes (aucun double dépôt DGFiP) — et **rien d'autre** :
elle est parfaitement satisfaite si l'on saute une période contiguë, donc elle ne
protège **pas** contre un TROU. L'**absence de trou** (toute transaction encaissée
finit dans une période donc dans un batch) repose sur deux mécanismes hors schéma :

1. `build-ereporting-batch` crée (upsert) la période contiguë de **toute** période
   ayant des transactions — une période sans vente est légitimement absente.
2. **Passe 5 de `reconcile-invoices`** (`check-ereporting-period-continuity.service.ts`,
   EINV-EREPORT-008) : détecte les `EReportingTransaction` PENDING dont la période est
   close depuis > `EREPORTING_ORPHAN_GRACE_MS` (48h) et jamais batchées (= sous-déclaration),
   puis alerte l'admin (`sendAdminCronFailedAlert` + Sentry). Lecture seule, jamais bloquant.
   Symétrie volontaire avec la détection de gap de numérotation (Passe 4, Art. 286).

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
2. **Aucun avoir manuel** — `A-YYYY-NNNNN` n'est produit que par `voidInvoice` (full void, écrit `Order.creditNoteNumber`) et `issueCreditNoteForRefund` (refund partiel/total, écrit `Refund.creditNoteNumber`). **Les deux passent obligatoirement par le helper SSOT `nextCreditNoteNumberTx` (`modules/invoices/services/credit-note-sequence.service.ts`)** : advisory lock `2_000_000+year` + lookup `MAX` sur l'**UNION (Order ∪ Refund)**. C'est ce lookup partagé — et non les UNIQUE par table — qui garantit l'unicité cross-table (EINV-PRISMA-001). Ne jamais réintroduire un lookup `FROM "Order"` seul.
3. **`OrderHistory` immuable** — pas de `deletedAt`, pas d'`update`/`delete`. Audit trail 10 ans. Idem `InvoiceTransmissionLog` (append-only, create seul).
4. **Snapshots `OrderItem`** figés au checkout.
5. **Snapshots adresses** figés au checkout.
6. **PDF immuable** après paiement — archive UploadThing + SHA-256, servi en priorité depuis l'archive. Les 3 colonnes de hash PDF (`Order.invoicePdfHash`, `Order.creditNotePdfHash`, `Refund.creditNotePdfHash`) ont un CHECK `^[a-f0-9]{64}$` (EINV-PRISMA-002), aligné sur `invoiceDataHash`/`invoiceXmlHash`.
7. **Numérotation séquentielle gap-free** — CHECK constraints DB (format) + advisory locks Postgres (sérialisation). ⚠️ **Garantie applicative, pas DB** (EINV-PRISMA-004) : la DB valide le _format_ (`^F-…$`/`^A-…$`) et l'unicité _par table_, mais la séquentialité/gap-free et l'immutabilité de l'audit reposent sur l'advisory lock + le scan `MAX` côté code — il n'existe ni séquence Postgres ni trigger anti-UPDATE/DELETE. Toute migration ou script de maintenance doit préserver cet invariant manuellement.
8. **Pas de vente manuelle / pas de caisse** — toute Order PAID passe par Stripe (sinon risque NF 525).
9. **Snapshot routage B2B/B2G figé au checkout** (EINV-PDP-001/005) — `customerType`, `customerCompany*` et `customerEInvoicing*` sont figés sur `Order` au moment du checkout depuis le `User` + l'annuaire DGFiP résolu (`refreshCustomerRouting`). Un changement ultérieur du `User` (SIRET, PDP) **ne modifie jamais** une commande émise. `build-invoice-data` lit exclusivement ce snapshot Order, jamais le `User` live.

Tests de régression dédiés :

- `modules/orders/services/__tests__/order-history-immutability.regression.test.ts`
- `modules/orders/services/__tests__/invoice-transmission-log-immutability.regression.test.ts` (EINV-PRISMA-004)
- `modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts`
- `modules/orders/services/__tests__/persist-invoice-number.service.test.ts` (suite "overflow")
- `modules/invoices/services/__tests__/credit-note-sequence.regression.test.ts` (EINV-PRISMA-001 — séquence avoir cross-table)

### Notes d'audit Prisma (2026-05-28)

- **EINV-PRISMA-003** — `Order.invoiceXmlFormat` CHECK est volontairement aligné sur les **seuls formats émis par le renderer** (`FACTURX_MINIMUM`, `FACTURX_BASIC`, `UBL_INVOICE`, `UBL_CREDITNOTE` — cf. `XmlArtifactFormat` dans `store-invoice-artifact.ts`). **Ne pas élargir le CHECK de façon spéculative.** Le jour où `render-facturx`/`render-ubl` émet un nouveau profil (EN16931/COMFORT, EXTENDED, CII…) exigé par le PDP, étendre le type `XmlArtifactFormat` **et** le CHECK DB dans la même migration (lockstep), sinon drift code↔DB.
- **EINV-PRISMA-006** — deux migrations historiques n'ont pas de `down.sql` (`20260223_add_indexes_fix_refund_item`, `20260208_drop_ghost_invoice_columns`, cette dernière destructive). Conforme à la politique "pas de rétroactif". Rollback de ces deux migrations = **restore Neon PITR** uniquement.

---

## Matrices de décision B2C / B2B / B2G

| Type client                | Distinction au checkout                        | Format facture (cible)           | E-reporting DGFiP                                  | Plateforme requise |
| -------------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------------- | ------------------ |
| **B2C** (particulier)      | `customerType=B2C` (défaut)                    | PDF (Factur-X facultatif)        | **OUI** (Sept 2027)                                | OUI à terme        |
| **B2B FR** (entreprise FR) | `customerType=B2B` + SIREN/SIRET               | Factur-X / UBL / CII obligatoire | NON (la facture structurée transporte les données) | OUI obligatoire    |
| **B2G** (entité publique)  | `customerType=B2G` + identifiant Chorus        | UBL via Chorus Pro               | NON                                                | Chorus Pro         |
| **B2B intra-UE**           | `customerType=B2B` + VAT intracom              | Factur-X (intracom rules)        | NON                                                | OUI                |
| **B2C hors UE**            | `customerType=B2C` + `shippingCountry` hors UE | PDF + mention export             | OUI (export)                                       | À confirmer        |

Synclune actuel : 100 % B2C FR. Le pipeline B2B/B2G est **câblé** (snapshot checkout EINV-PDP-001, résolution annuaire EINV-PDP-005, filtre transmission EINV-PDP-002, réception webhook EINV-PDP-003) ; reste à livrer l'onboarding form B2B (capture `customerType`/SIRET côté `User`) + la capture Chorus Pro B2G (`customerPublicEntityCode`/`customerServiceCode`, non encore portés par le modèle `User`).

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
   - 4xx (validation, schema) → throw `ProviderBusinessError(message, status)` → `submitInvoiceById` persiste `REJECTED` avec un `errorCode` **non** dans `RETRYABLE_ERROR_CODES` → le cron DLQ marque `ABANDONED` direct (pas de retry inutile).
   - 5xx / timeout / network → throw classique → persiste `REJECTED` avec un `errorCode` retryable (`TIMEOUT`, `NETWORK_ERROR`, `PROVIDER_5XX`, `RATE_LIMITED`, `TEMPORARY_UNAVAILABLE`) → le cron `retry-invoice-transmissions` réessaie avec backoff exponentiel.
   - **Note `RETRYING`** : la valeur d'enum `PdpTransmissionStatus.RETRYING` existe mais n'est **jamais positionnée** — le re-essai est modélisé par `REJECTED` + `pdpRetryCount`, et le cron repasse directement à `SENT`/`REJECTED`. `RETRYING` est réservé (état d'orchestration documentaire, non utilisé en l'état — EINV-PDP-006).
6. **Écrire les tests** :
   - Étendre `provider-contract.test.ts` pour inclure le provider dans le harness `describe.each`.
   - Tests dédiés `<name>.provider.test.ts` (signature webhook, error mapping, idempotence).
7. **Bascule progressive** :
   - `INVOICE_PROVIDER=mock` en CI E2E pour tester l'orchestration.
   - `INVOICE_PROVIDER=<name>` en staging vers sandbox PDP.
   - Canary 1% prod via flag custom (à définir au moment du go-live).
   - Activer `INVOICE_ENABLE_XML=true` puis `INVOICE_ENABLE_EREPORTING=true` selon scope.
8. **Réconciliation acceptation asynchrone e-reporting (EINV-CRON-003)** : si la PA renvoie `SENT` (dépôt accusé) et confirme l'acceptation DGFiP **de façon asynchrone** (webhook ou polling), prévoir AVANT le go-live :
   - ajouter `getEReportingBatchStatus(providerBatchId)` à l'interface `InvoiceProvider` (symétrique de `getInvoiceStatus` pour les factures) ;
   - créer un cron `reconcile-ereporting-statuses` qui poll les batches `SENT` âgés et applique `SENT → ACCEPTED/REJECTED` (modèle : `reconcile-invoice-statuses.service.ts`) ;
   - étendre `alert-stuck-orders` au statut `SENT` âgé.
     Sans ça, un batch `SENT` reste figé indéfiniment (ni `transmit-ereporting-batch` ni `alert-stuck-orders` ne scannent `SENT`). Tant qu'aucune PA n'est branchée, `LocalPdfProvider` retourne `PENDING` (dry-run) → ce point ne mord pas.

### Invariants à respecter

- Aucun `process.env.INVOICE_PROVIDER` ailleurs que dans `factory.ts`.
- Aucun appel HTTP externe en dehors de la classe provider — l'orchestrateur ne connaît que l'interface.
- Toute transition `Order.pdpStatus` passe par `persistPdpTransmission` (régression test `no-direct-pdp-status-write`).
- Aucune mutation directe `EReportingTransaction` / `EReportingBatch` hors `record-ereporting.service.ts` + `build-ereporting-batch.service.ts` + `submit-ereporting-batch.service.ts` (Invariant 9, cf. CLAUDE.md).
- Idempotence : `providerInvoiceId` / `providerBatchId` doivent être stables pour le même input — `MockProvider` montre le pattern (hash de `invoiceNumber`).
- **Idempotency-key transmission (EINV-PDP-004)** : `submitInvoice({ ..., idempotencyKey })` reçoit `invoiceNumber` (stable transmission initiale + tous les retries DLQ). Tout adaptateur réel **DOIT** la propager côté plateforme (en-tête HTTP `Idempotency-Key` ou champ API). Sans elle, un retry après une réponse perdue (timeout) crée une **deuxième** facture côté PDP pour un même `invoiceNumber` → incident comptable (séquentiel gap-free Art. 286 CGI).
- **Périmètre transmission B2B/B2G uniquement** : `transmit-invoices` ne sélectionne que `customerType ∈ {B2B, B2G}`. Le B2C passe par l'e-reporting agrégé, jamais par un dépôt de facture sur la PDP (EINV-PDP-002).
- **Réception webhook** : `/api/webhooks/pdp/[providerId]` applique l'ACK via `persistPdpTransmission` (résolution `Order` par `pdpProviderRef`). Un event référençant un ref inconnu → `ProviderWebhookEvent` en `FAILED` (rejouable), jamais `COMPLETED` silencieux (EINV-PDP-003).

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
| RGPD Art. 17(3)(b) — exemption effacement       | PII facture conservée (cf. § Rétention PII vs RGPD)             | ✓                                                |
| RGPD Art. 5.1.e — purge à 10 ans                | `hard-delete-retention.service.ts` (`purgeExpiredOrderPii`)     | ✓ livré 2026-05-29                               |
| Art. 50-0 CGI — CA à l'encaissement             | `export-orders-csv.service.ts` filtre `paidAt` (ORD-COMPLY-007) | ✓                                                |
| EU 2014/55 — facture structurée                 | `render-facturx.ts` profil MINIMUM                              | ✓ partiel (MINIMUM, pas BASIC/EN16931/EXTENDED)  |
| Réforme 2026/2027 — émission structurée B2B     | (Phase 5 + provider PDP)                                        | 🔒                                               |
| Réforme 2026/2027 — e-reporting B2C             | (Phase 3+4 + provider PDP)                                      | ⏳ infrastructure prête, transmission en attente |

---

## Rétention PII vs RGPD (conflit effacement / conservation 10 ans)

Une facture **doit** porter l'identité du client (Art. 289 CGI) et être conservée
10 ans (Art. L102 B LPF, L123-22 C. com.). Cette obligation légale fonde une
**exemption au droit à l'effacement** (RGPD Art. 17(3)(b)). Le conflit avec le droit
à l'oubli est résolu par un cycle de vie en deux temps :

**1. À l'anonymisation du compte** (`anonymize-user.service.ts`, cron
`process-account-deletions` après 30 j de grâce) — on scrubbe uniquement les
surfaces **opérationnelles** non requises par la facture :

- `customerEmail` / `customerName` / `customerPhone`
- adresse de **livraison** (`shipping*`) — ne figure pas comme identité légale sur la facture
- `User.image`, sessions, OAuth, adresses, panier, wishlist (hard delete)
- `ProductReview` masqué + contenu effacé ; `ReviewMedia` supprimés d'UploadThing
- `ReviewResponse.authorName` (contenu public) → rebasculé sur la marque « Synclune »

On **conserve délibérément** (verrouillé par la régression
`rgpd-anonymize-preserves-invoice-snapshot-2026-05-28`) :

- adresse de **facturation** (`billing*`) = identité légale du client sur la facture
- `invoiceDataSnapshot` / `invoiceDataHash` + PDF facture/avoir (`invoicePdfUrl`,
  `creditNotePdfUrl`) = facture figée immuable (un PDF régénéré doit rester
  bit-identique à l'archive)
- `OrderHistory.authorName` / `OrderNote.authorName` = audit trail comptable interne
  (Art. L123-22), non purgés

**2. À l'expiration de la base légale** (`paidAt + 10 ans`) — le cron
`hard-delete-retention` (`purgeExpiredOrderPii`) scrubbe la PII facture restante
(`billing*`, `customer*`, `shipping*`, `invoiceDataSnapshot`/`Hash`) et supprime les
PDF facture/avoir d'UploadThing, en **conservant** les données comptables non-PII
(numéros de facture/avoir, montants, dates). Le marqueur `Order.piiPurgedAt` garantit
l'idempotence. C'est le respect de la limitation de conservation (RGPD Art. 5.1.e)
une fois l'obligation légale éteinte.

> **Portabilité (Art. 15/20)** : `build-user-data-export.service.ts` exporte profil,
> adresses, commandes (+ items + **remboursements**), wishlist, codes promo, avis,
> sessions.

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

### Batch `REJECTED` / `ABANDONED` — re-queue automatique

Voir l'alerte rouge en haut du dashboard. Le `rejectionReason` est stocké sur le batch ; les détails d'API sont dans la table `providerResponse` (Json).

**Re-queue automatique des transactions.** Quand `submit-ereporting-batch.service.ts` fait passer un batch en `REJECTED` (ACK synchrone PA ou erreur métier 4xx) ou `ABANDONED` (retries réseau épuisés), il **détache** atomiquement ses `EReportingTransaction` (`batchId = null`, `status = PENDING`) — le batch lui-même reste un **tombstone immuable** (status terminal + `rejectionReason` conservés pour l'audit). Le prochain run de `build-ereporting-batch` les **ré-agrège dans un nouveau batch** : aucune transaction n'est jamais orpheline. On réutilise la MÊME ligne transaction (jamais de `create`), donc le unique `[orderId,type]`/`[refundId,type]` n'est pas sollicité. Verrouillé par `ereporting-requeue-on-terminal-failure.regression.test.ts` (+ `ereporting-requeue-rebuild.integration.test.ts`).

**Garde batch vide.** Un batch éligible (PENDING/RETRYING) sans transaction vivante n'est jamais transmis (`SKIPPED_EMPTY`) → pas de batch fantôme déclaré à la DGFiP. Le bouton admin « Relancer » refuse de même un tombstone déjà re-queué (0 transaction).

Workflow admin pour un `REJECTED` métier (donnée invalide) :

1. Lire la raison, **corriger le payload côté Order** (souvent un champ manquant).
2. La correction faite, le re-queue automatique + `build` reprennent les transactions au prochain cycle — aucune action manuelle requise.

> ⚠️ **Limitation (à confirmer contre l'arrêté final / la spec de la PA).** Re-queuer un `REJECTED` 4xx signifie qu'une donnée structurellement invalide est ré-agrégée puis re-rejetée à **chaque** run de `build` une fois une **vraie PA branchée** (boucle de re-rejet quotidienne + alerte Sentry, jusqu'à correction de l'Order). Sans danger tant que `INVOICE_ENABLE_EREPORTING` est OFF (`LocalPdfProvider` = dry-run PENDING, jamais REJECTED). **Mitigation au go-live PA** : ajouter un cap de tentatives **par transaction** (champ `requeueCount` → migration) qui bascule en état terminal « intervention manuelle » après N rejets. **Non figé ici** — paramètre réglementaire à arbitrer.

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
3. **Périodicité e-reporting B2C** : décret final pas encore publié (mai 2026). La cadence franchise (Art. 293 B) est de nature **bimestrielle** (dépôt au plus tard 25-30 du mois suivant le bimestre). `EREPORTING_PERIOD_LENGTH` est désormais branché de bout en bout (`DAILY` / `MONTHLY` / `BIMONTHLY` — `computeEReportingPeriod` + grouping period-aware dans `build-ereporting-batch`), **défaut `DAILY`** prudent. Passer à `BIMONTHLY` le jour où la spec PA est fixée n'est qu'un changement de variable d'env (la PA peut aussi agréger elle-même — à confirmer contre sa spec).
4. **TVA franchise dans Factur-X** : code UNTDID 5305 retenu = `ZB` (zéro pour franchise). À valider avec un expert-comptable que ce mapping est accepté par la DGFiP.
5. **Bascule régime réel TVA** : si Synclune dépasse 37 500 € en services, recalibrer `OrderItem.taxRate`/`taxAmount` au checkout et reprendre la numérotation depuis le compteur courant (pas de reset).
