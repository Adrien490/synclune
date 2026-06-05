# Facturation électronique Synclune

Architecture, invariants et état d'avancement de la conformité française à la
réforme **facturation électronique 2026-2027** (Art. 286 / 289-I / 272-I /
293 B CGI, L102 B LPF, L123-22 C. com.).

> **⚠️ Recentrage B2C (2026-05-28) — appliqué au code.** Synclune est une
> micro-entreprise en franchise de TVA vendant **exclusivement en B2C**. Toute
> l'infrastructure de **transmission B2B/B2G sur PA** (« Plateforme Agréée », ex-PDP),
> l'**annuaire DGFiP**, le **XML structuré** (Factur-X / UBL / CII) et la **TVA par
> ligne `OrderItem`** ont été **supprimés du code** : jamais activés, sans pertinence pour un
> commerce B2C en franchise. La seule couche structurée conservée est
> l'**e-reporting B2C agrégé** (`EReportingTransaction` / `EReportingBatch` /
> `EReportingPeriod`, vraie obligation Sept 2027). Ce document décrit le code
> **réel** au 2026-05-30 (audit `bright-starlight`, note 16/20). Les seuls
> résidus du périmètre supprimé sont des valeurs d'enum `OrderHistoryAction`
> `PDP_*` marquées « réservées/inutilisées » dans le schema (retrait d'une
> valeur d'enum Postgres = recréation de type, jugé trop risqué pour un gain nul).

> Audits :
>
> - `~/.claude/plans/tu-es-un-auditeur-radiant-stonebraker.md` (2026-05-27) — conformité initiale.
> - `~/.claude/plans/tu-es-un-auditeur-merry-russell.md` (2026-05-28) — avoirs & remboursements (EINV-CREDIT-001 à 017).
> - `~/.claude/plans/m-ne-un-audit-complet-bright-starlight.md` (2026-05-30) — audit complet noté + remise en phase de ce doc.

---

## Statut Synclune

- **Forme juridique** : entrepreneur individuel, micro-entreprise.
- **Régime TVA actuel** : franchise art. 293 B (TVA non applicable).
- **Seuil de franchise (2026, inchangés)** : **85 000 € HT/an pour les ventes de marchandises**
  (seuil majoré 93 500 €) — c'est **le seuil applicable à Synclune** (bijoux = vente de biens).
  Le seuil prestations de services est de 37 500 € (majoré 41 250 €). _Le seuil unique 25 000 €
  (LF 2025) puis celui de 37 500 € envisagé pour 2026 ont **tous deux été abandonnés**._
  - ⚠️ **Zone grise à arbitrer avec l'expert-comptable** : le parcours `/personnalisation`
    (sur-mesure) peut requalifier une partie de l'activité en **prestation de services** (seuil
    37 500 €) ET changer la catégorie e-reporting (`operationCategory`, aujourd'hui figée `GOODS`).
    Le seuil surveillé est piloté par `VAT_FRANCHISE_THRESHOLD_EUR` (défaut 85 000 € — SSOT
    `shared/constants/vat-franchise.ts`, consommée par le bandeau dashboard et la vue facturation).
- **Périmètre commercial** : **100 % B2C FR** (aucun flux B2B/B2G dans le code).
- **Calendrier réforme** :
  - **Réception facture électronique B2B** : obligatoire au **1ᵉʳ septembre 2026** (sans objet tant que pas d'achats B2B sur facture structurée entrante). **Voir l'encadré « Réception » ci-dessous — échéance la plus proche, à traiter en back-office.**
  - **E-reporting B2C** : obligatoire au **1ᵉʳ septembre 2027** (PME / TPE / micro-entreprises).
- **État** : infrastructure e-reporting B2C **livrée et testée**, en **dry-run intégral** tant qu'aucune Plateforme Agréée (PA) concrète n'est branchée et que `INVOICE_ENABLE_EREPORTING` est OFF.

> **📥 Réception facture électronique — échéance 1ᵉʳ septembre 2026 (F2, priorité back-office).**
> C'est l'échéance la **plus proche** de la réforme. Dès le 1ᵉʳ sept 2026, toute entreprise (même
> en franchise, même 100 % B2C) doit pouvoir **recevoir** les factures électroniques de ses
> **fournisseurs** via une Plateforme Agréée (PA). C'est une **obligation organisationnelle**
> (s'inscrire auprès d'une PA pour réceptionner), **pas du code storefront** — donc invisible
> dans ce schéma applicatif. ➡️ **TODO non-code, à cadrer en priorité** : choisir une PA et y
> rattacher le SIREN pour la réception (le même choix de PA servira la transmission e-reporting
> de 2027, cf. F3 ci-dessous).

---

## Architecture (code réel)

```
modules/invoices/
├── types/
│   ├── invoice-data.ts                    # InvoiceData (objet pivot — source de vérité)
│   └── invoice-provider.ts                # interface InvoiceProvider (submitEReportingBatch only)
├── schemas/
│   └── invoice.schema.ts                  # validation Zod runtime + refine cohérence comptable
├── services/
│   ├── build-invoice-data.ts              # Order → InvoiceData (snapshot pur)
│   ├── build-credit-note-data.ts          # Order + Refund → InvoiceData (avoir A-YYYY)
│   ├── render-invoice-pdf.ts              # InvoiceData → PDF déterministe (jsPDF), facture & avoir
│   ├── resolve-invoice-data.ts            # snapshot figé > rebuild live (+ verify hash)
│   ├── verify-invoice-snapshot.ts         # SHA-256 canonical-JSON vs invoiceDataHash
│   ├── credit-note-sequence.service.ts    # A-YYYY-NNNNN — SSOT séquence cross-table (Order ∪ Refund)
│   ├── check-sequence-continuity.service.ts        # défense anti-trou/doublon numérotation (Art. 286)
│   ├── build-ereporting-transaction.ts    # Order|Refund → payload e-reporting (snapshot + hash)
│   ├── record-ereporting.service.ts       # hook SALES/REFUND : feature-flag + idempotent + best-effort
│   ├── submit-ereporting-batch.service.ts # transmission d'un batch (backoff, re-queue, idempotence)
│   └── check-ereporting-period-continuity.service.ts # filet anti-trou périodes (orphelins PENDING)
├── providers/
│   ├── factory.ts                         # getInvoiceProvider() env-driven (local | mock)
│   ├── local-pdf.provider.ts              # B2C par défaut — eReporting:false (dry-run PENDING)
│   └── mock.provider.ts                   # eReporting:true — CI/E2E
├── constants/
│   ├── cache.ts
│   ├── ereporting-period.ts               # EREPORTING_PERIOD_LENGTH, ORPHAN_GRACE, computeEReportingPeriod
│   └── feature-flags.ts                   # INVOICE_FEATURE_FLAGS (1 flag : enable_ereporting)
├── actions/
│   ├── retry-ereporting-batch.ts          # admin : relance d'un batch (refuse tombstone vide)
│   └── retry-invoice-generation.ts        # admin : relance génération facture
├── data/
│   ├── get-ereporting-batch-by-id.ts
│   └── get-invoicing-overview.ts          # dashboard admin (compteurs + batches)
└── components/admin/
    └── invoicing-overview.tsx             # Server Component dashboard

modules/orders/services/                   # sources de numérotation & archivage (voisins)
├── persist-invoice-number.service.ts      # F-YYYY-NNNNN — Art. 286 CGI (advisory lock + idempotence)
├── ensure-invoice-number.service.ts       # eager via webhook paiement — Art. 289-I CGI
├── void-invoice.service.ts                # A-YYYY-NNNNN full void — Art. 272-I CGI
├── archive-invoice-pdf.service.ts         # UploadThing + SHA-256 facture — Art. L102 B LPF
└── archive-credit-note-pdf.service.ts     # UploadThing + SHA-256 avoir — Art. L102 B LPF

modules/refunds/services/
├── issue-credit-note.service.ts           # avoir partiel par Refund — Art. 272-I CGI
└── archive-credit-note-pdf.service.ts     # archive avoir attaché au Refund

modules/cron/services/                     # 4 crons e-invoicing (cf. § Crons)
├── build-ereporting-batch.service.ts
├── transmit-ereporting-batch.service.ts
├── reconcile-invoices.service.ts
└── reconcile-voided-invoices.service.ts
```

### Flux d'une commande payée (B2C franchise)

```
Stripe webhook payment_intent.succeeded
  │
  ├─→ markOrderAsPaid()                     (modules/payments)
  │
  ├─→ ensureInvoiceNumberPersisted()        F-YYYY-NNNNN ─ Art. 289-I
  │     └─ persistInvoiceNumber()           pg_advisory_xact_lock(1_000_000+year)
  │            + snapshot InvoiceData figé + SHA-256 (Art. L102 B)
  │     └─ archive eager PDF UploadThing (best-effort)
  │
  ├─→ recordSalesEReporting()               EReportingTransaction (SALES)
  │     ├─ if !enable_ereporting → skip
  │     ├─ if customerType != B2C → skip
  │     ├─ if findFirst(orderId, SALES)     → skip (idempotent, unique [orderId,type])
  │     └─ buildSalesTransaction(order) → prisma.create (payloadSnapshot + payloadHash)
  │
  └─→ post-checkout tasks                   emails, cache invalidation

GET /api/orders/[orderNumber]/invoice
  │
  ├─→ getOrder() + auth (admin re-DB | owner | token HMAC) + rate-limit
  ├─→ persistInvoiceNumber() fallback lazy  (si webhook a échoué — TOCTOU couvert sous lock)
  ├─→ if archive Order.invoicePdfUrl :
  │     └─ stream UploadThing + RE-HASH octets vs invoicePdfHash
  │            → divergence ? Sentry + fall-through régénération (self-heal)
  └─→ else (lazy regenerate) :
        ├─→ resolveInvoiceData(order)        snapshot figé > rebuild live (+ verify hash)
        ├─→ renderInvoicePdf(data)           jsPDF déterministe
        └─→ archiveInvoicePdf() best-effort  UploadThing + SHA-256

Cron build-ereporting-batch (Daily 01:00 UTC)
  │
  ├─→ findMany EReportingTransaction PENDING + batchId=null
  ├─→ group by PÉRIODE (computeEReportingPeriod, EREPORTING_PERIOD_LENGTH, défaut DAILY)
  └─→ for each période CLOSE (periodTo ≤ now — sinon différée), par chunk de MAX_BATCH_TRANSACTIONS :
        └─→ prisma.$transaction:
              ├─ upsert EReportingPeriod (periodFrom @unique, idempotent)
              ├─ create EReportingBatch (status=PENDING, periodId)
              └─ updateMany transactions batchId=batch.id (filter batchId=null)

Cron transmit-ereporting-batch (*/30 min)
  └─→ for each batch PENDING/RETRYING : submitEReportingBatchById()
        └─ provider local (eReporting:false) → reste PENDING (dry-run, rien transmis)
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
2. **`check-ereporting-period-continuity`** (EINV-EREPORT-008, appelé en passe
   `reconcile-invoices`) : détecte les `EReportingTransaction` PENDING dont la
   période est close depuis > `EREPORTING_ORPHAN_GRACE_MS` (48h) et jamais batchées
   (= sous-déclaration), puis alerte l'admin (`sendAdminCronFailedAlert` + Sentry).
   Lecture seule, jamais bloquant. Symétrie volontaire avec la détection de gap de
   numérotation (`check-sequence-continuity`, Art. 286).

### Flux d'un remboursement

```
processRefund() (admin Server Action)        OR    reconcile-refunds cron (DLQ)
  │                                                  │
  ├─→ stripe.refunds.create()                        ├─→ stripe.refunds.retrieve()
  ├─→ tx Step 3: refund.update COMPLETED             ├─→ finalizeRefund() COMPLETED
  │     + recalcul order.paymentStatus               └─→ recordRefundEReporting()
  │     + createOrderAuditTx(REFUND_COMPLETED)              idempotent → skip si déjà créée
  ├─→ (si full refund) voidInvoice() ─ Art. 272-I
  ├─→ (si partiel) issueCreditNoteForRefund() A-YYYY
  ├─→ recordRefundEReporting()               EReportingTransaction (REFUND, amount<0)
  └─→ sendRefundConfirmationEmail()

Webhook charge.refunded → handleChargeRefunded
  ├─→ syncStripeRefunds() (détecte refunds dashboard Stripe)
  ├─→ updateOrderPaymentStatus() (full/partial)
  ├─→ (full) voidInvoice() | (partiel) issueCreditNoteForRefund()
  └─→ recordRefundEReporting()

Cron reconcile-voided-invoices (Daily 07:00) → rattrape avoirs manquants post-refund
```

---

## Invariants intangibles

**SSOT : CLAUDE.md § "Facturation électronique — invariants" (#1 à #10).** Résumé
des points spécifiques à l'implémentation e-invoicing :

1. **Aucune création manuelle de facture** — toute facture passe par
   `persistInvoiceNumber` (webhook payment eager ou route invoice lazy fallback).
2. **Aucun avoir manuel** — `A-YYYY-NNNNN` n'est produit que par `voidInvoice`
   (full void, écrit `Order.creditNoteNumber`) et `issueCreditNoteForRefund`
   (refund partiel/total, écrit `Refund.creditNoteNumber`). **Les deux passent
   obligatoirement par le helper SSOT `nextCreditNoteNumberTx`**
   (`modules/invoices/services/credit-note-sequence.service.ts`) : advisory lock
   `2_000_000+year` + lookup `MAX` sur l'**UNION (Order ∪ Refund)**. C'est ce
   lookup partagé — et non les UNIQUE par table — qui garantit l'unicité
   cross-table (EINV-PRISMA-001). Ne jamais réintroduire un lookup `FROM "Order"`
   seul.
3. **`OrderHistory` immuable** — pas de `deletedAt`, pas d'`update`/`delete`.
   Audit trail 10 ans (Art. L123-22).
4. **Snapshots `OrderItem`** figés au checkout.
5. **Snapshots adresses** figés au checkout (`billing*` / `shipping*` sur Order).
6. **PDF immuable** après paiement — archive UploadThing + SHA-256, servi en
   priorité depuis l'archive avec **re-hash des octets fetchés** (EINV-PDF-006).
   Les 3 colonnes de hash PDF (`Order.invoicePdfHash`, `Order.creditNotePdfHash`,
   `Refund.creditNotePdfHash`) ont un CHECK `^[a-f0-9]{64}$`, aligné sur
   `invoiceDataHash`.
7. **Numérotation séquentielle gap-free** — ⚠️ **Garantie applicative, pas DB**
   (EINV-PRISMA-004) : la DB valide le _format_ (`^F-…$`/`^A-…$`) et l'unicité
   _par table_, mais la séquentialité/gap-free repose sur l'advisory lock + le
   scan `MAX` côté code + l'idempotence sous lock — il n'existe ni séquence
   Postgres ni trigger anti-UPDATE/DELETE. Toute migration ou script de
   maintenance doit préserver cet invariant manuellement.
8. **Pas de vente manuelle / pas de caisse** — toute Order PAID passe par Stripe
   (sinon risque NF 525).
9. **Aucune mutation directe `EReportingTransaction` / `EReportingBatch`** hors
   `record-ereporting.service.ts` + `build-ereporting-batch.service.ts` +
   `submit-ereporting-batch.service.ts`. Aucune Server Action admin ne pose un
   `status: ACCEPTED` ni ne crée de batch fictif.
10. **Rétention PII vs RGPD** (cycle en 2 temps — cf. § dédiée).

Tests de régression dédiés (inventaire vivant : `grep -rn "@regression" --include="*.test.ts*"`) :

- `modules/orders/services/__tests__/order-history-immutability.regression.test.ts`
- `modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts`
- `modules/orders/services/__tests__/persist-invoice-number.service.test.ts` (suite "overflow")
- `modules/invoices/services/__tests__/credit-note-sequence.regression.test.ts` (EINV-PRISMA-001)
- `modules/invoices/services/__tests__/no-manual-ereporting-write.regression.test.ts` (invariant 9)
- `modules/invoices/services/__tests__/ereporting-requeue-on-terminal-failure.regression.test.ts`
- `modules/invoices/services/__tests__/check-ereporting-period-continuity.test.ts` (EINV-EREPORT-008)
- `modules/users/services/__tests__/anonymize-user-preserves-invoice.regression.test.ts` (invariant 10)

### Notes d'audit Prisma

- **EINV-PRISMA-002** — les 3 colonnes de hash PDF ont un CHECK `^[a-f0-9]{64}$`.
- **EINV-PRISMA-004** — la séquentialité/immutabilité est applicative (cf. invariant 7).
- **EINV-EREPORT-009** — `EReportingTransaction.requeueCount` (migration `20260530000000`,
  CHECK `>= 0`) borne le nombre de re-queues : cap anti-boucle de re-rejet (cf.
  § Durcissement pré-go-live).
- **Résidus enum `OrderHistoryAction` `PDP_*`** — les valeurs `PDP_SUBMITTED`,
  `PDP_ACCEPTED`, `PDP_REJECTED`, `PDP_RETRY`, `PDP_ABANDONED`, `PDP_CANCELLED`
  sont **inutilisées** (transmission B2B/B2G supprimée). Conservées : retirer une
  valeur d'enum Postgres impose de recréer le type (risque > gain). Marquées
  « réservé/inutilisé » dans `prisma/schema.prisma`. Ne pas les réutiliser pour
  un autre sens. **Terminologie (F8)** : « PDP » est l'ancien nom ; depuis 2025
  on dit **« Plateforme Agréée » (PA)**. Le préfixe d'enum reste `PDP_*` pour ne
  pas recréer le type Postgres, mais c'est un **alias de « PA »**.

---

## Numérotation — Art. 286 / 289-I / 272-I CGI

### Factures `F-YYYY-NNNNN` (`persist-invoice-number.service.ts`)

- **Advisory lock par année** `pg_advisory_xact_lock(1_000_000 + year)` acquis en
  tête de transaction — gère le cas table vide (1ʳᵉ facture de l'année) qu'un
  `FOR UPDATE` ne couvrirait pas.
- **Idempotence sous lock (EINV-SEQ-006)** : re-lecture de `invoiceNumber` _après_
  acquisition du lock. Les appelants (webhook eager, fallback lazy download, cron)
  pré-vérifient hors lock → TOCTOU ; le 2ᵉ entrant retourne le numéro existant en
  **noop** au lieu d'écraser (= protège contre un gap Art. 286).
- **Millésime = date d'encaissement** (`paidAt`) en `Europe/Paris`, **pas**
  l'horloge serveur UTC (EINV-SEQ-002). Fallback `createdAt` si `paidAt` absent.
- **Snapshot comptable figé** : `buildInvoiceData` → canonical-JSON →
  `invoiceDataHash` SHA-256, écrit dans la **même transaction** que l'attribution.
- **Garde overflow** 99 999/an : `BusinessError("INVOICE_SEQUENCE_OVERFLOW")`
  _avant_ l'UPDATE + pré-alerte Sentry à 90 % + email admin. Au-delà : étendre la
  regex CHECK DB à `{5,6}` + `padStart(6)` (cf. § Troubleshooting).
- **Identité vendeur figée** (`buildVendorSnapshot`) — reconstituable 10 ans même
  après changement SIRET / régime TVA.

### Avoirs `A-YYYY-NNNNN`

- **Full void** : `void-invoice.service.ts` (lock `2_000_000+year`, idempotent,
  `Order.creditNoteNumber`). Déclenché par `cancel-order`, `mark-as-fully-refunded`
  et le webhook `charge.refunded` (remboursement total).
- **Partiel** : `issueCreditNoteForRefund` (`Refund.creditNoteNumber`).
- **SSOT séquence** : `nextCreditNoteNumberTx` — `MAX` sur UNION (Order ∪ Refund).

---

## PDF immuable — Art. L102 B LPF

- `render-invoice-pdf.ts` **déterministe bit-à-bit** : `creationDate`/`fileID`
  figés, dates sans `Intl` (UTC + mois FR constant), montants formatés à la main.
  Détecte le préfixe `A-` → mode AVOIR (bandeau « FACTURE ANNULÉE »).
- `archive-invoice-pdf.service.ts` / `archive-credit-note-pdf.service.ts` : upload
  UploadThing + SHA-256, idempotent, best-effort (échec ⇒ fallback lazy au download).
- Route `/api/orders/[orderNumber]/invoice` : sert l'archive en priorité,
  **re-hashe les octets fetchés** vs `invoicePdfHash` et bascule en régénération +
  Sentry sur divergence (self-heal, EINV-PDF-006). Refuse de servir un rendu
  divergent (503 Retry-After). VOIDED ⇒ régénération forcée avec bandeau
  (`Cache-Control: max-age=0, must-revalidate`).
- `resolve-invoice-data.ts` : priorité au **snapshot figé** > rebuild live, avec
  `verify-invoice-snapshot.ts` (recalcul SHA-256, throw `InvoiceSnapshotIntegrityError`
  sur mismatch).

---

## E-reporting B2C — réforme 2026-2027

### Modèles (`prisma/schema.prisma`)

- **`EReportingTransaction`** — atomique (SALES/PAYMENT ⇒ `orderId`, REFUND ⇒
  `refundId`, CHECK `source_xor` migration `20260529120000`). `payloadSnapshot`
  figé + `payloadHash` SHA-256. `amountIncTax` négatif pour REFUND. `taxAmount=0`
  en franchise. `vatBreakdown` / `operationCategory` (GOODS défaut) DORMANT.
- **`EReportingBatch`** — agrégat par période. `providerBatchId @unique`
  (idempotence transmission). Statuts via `EReportingStatus`. `vatBreakdown` DORMANT.
- **`EReportingPeriod`** — unité de non-recouvrement. `periodFrom @unique`. EXCLUDE
  gist non-overlap (migration `20260529130000`).

### Services

- **`record-ereporting.service.ts`** — `recordSalesEReporting` / `recordRefundEReporting`.
  Best-effort (jamais de rethrow), **fail-closed** (flag OFF → `"skipped"`),
  idempotent (unique `[orderId,type]` / `[refundId,type]`), B2C-only.
- **`build-ereporting-transaction.ts`** — payload pur (snapshot + hash).
- **`submit-ereporting-batch.service.ts`** — transmission d'un batch :
  - Statuts `EReportingStatus` : PENDING → SENT/ACCEPTED, ou REJECTED (4xx métier,
    pas de retry) / RETRYING (réseau 5xx/timeout, backoff) / ABANDONED (> `MAX_RETRY=5`).
  - **Garde batch vide** (`SKIPPED_EMPTY`) : un batch éligible sans transaction
    vivante n'est jamais transmis (pas de batch fantôme DGFiP).
  - **Re-queue terminal** : REJECTED/ABANDONED ⇒ détache atomiquement les
    transactions (`batchId=null`, `status=PENDING`), le batch reste un **tombstone
    immuable**. `build` les ré-agrège au cycle suivant (même ligne, jamais de `create`).
  - **Idempotent** : batch déjà SENT/ACCEPTED → `NOT_ELIGIBLE`.
- **`check-ereporting-period-continuity.service.ts`** — filet anti-trou (cf. supra).

### Provider

Interface `InvoiceProvider` (`types/invoice-provider.ts`) réduite à
`submitEReportingBatch({ batch, idempotencyKey })` + `capabilities.eReporting`.
Factory env-driven (`INVOICE_PROVIDER` ∈ `local | mock`) :

- `LocalPdfProvider` — `eReporting: false`, dry-run (batch reste PENDING). Défaut B2C.
- `MockProvider` — `eReporting: true`, hash idempotent. CI/E2E.

---

## Rétention PII vs RGPD (Art. 17(3)(b) + 5.1.e)

Une facture **doit** porter l'identité du client (Art. 289 CGI) et être conservée
10 ans (Art. L102 B LPF / L123-22 C. com.) — fondant une **exemption au droit à
l'effacement** (RGPD Art. 17(3)(b)). Cycle de vie en deux temps :

**1. À l'anonymisation du compte** (`anonymize-user.service.ts`, cron
`process-account-deletions` après 30 j de grâce) — scrub des surfaces
**opérationnelles** uniquement :

- `customerEmail` / `customerName` / `customerPhone`
- adresse de **livraison** (`shipping*`)
- `User.image`, sessions, OAuth, adresses, panier, wishlist (hard delete)
- `ProductReview` masqué + `ReviewMedia` supprimés ; `ReviewResponse.authorName` → « Synclune »

**Conservé délibérément** (verrouillé par la régression
`rgpd-anonymize-preserves-invoice-snapshot-2026-05-28`) :

- adresse de **facturation** (`billing*`) = identité légale du client
- `invoiceDataSnapshot` / `invoiceDataHash` + PDF facture/avoir
- `OrderHistory.authorName` / `OrderNote.authorName` = audit trail comptable

> ⚠️ Ne JAMAIS scrubber `billing*` à l'anonymisation.

**2. À l'expiration de la base légale** (`paidAt + 10 ans`) — cron
`hard-delete-retention` (`purgeExpiredOrderPii`) scrubbe la PII facture restante
(`billing*`, `customer*`, `shipping*`, `invoiceDataSnapshot`/`Hash`) et supprime
les PDF d'UploadThing, en **conservant** les données comptables non-PII (numéros,
montants, dates). Marqueur `Order.piiPurgedAt` (idempotence). RGPD Art. 5.1.e.

> **Portabilité (Art. 15/20)** : `build-user-data-export.service.ts` exporte
> profil, adresses, commandes (+ items + remboursements), wishlist, codes promo,
> avis, sessions.

---

## Conformité réglementaire — matrice

| Article                                         | Localisation                                                    | Statut                                   |
| ----------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Art. 286 CGI — séquentialité gap-free           | `persist-invoice-number.service.ts` + CHECK DB                  | ✓                                        |
| Art. 289-I CGI — émission à l'encaissement      | `ensure-invoice-number.service.ts` (ORD-COMPLY-002)             | ✓                                        |
| Art. 272-I CGI — avoir post-facture (full)      | `void-invoice.service.ts` (ORD-COMPLY-003)                      | ✓                                        |
| Art. 272-I CGI — avoir post-facture (partiel)   | `issue-credit-note.service.ts` (EINV-CREDIT-001/005/010)        | ✓ livré 2026-05-28                       |
| Art. 293 B CGI — mention franchise TVA          | `render-invoice-pdf.ts` (mention pied)                          | ✓                                        |
| Art. L102 B LPF — immutabilité 10 ans (facture) | `archive-invoice-pdf.service.ts` (ORD-COMPLY-005)               | ✓                                        |
| Art. L102 B LPF — immutabilité 10 ans (avoir)   | `archive-credit-note-pdf.service.ts` (EINV-CREDIT-002)          | ✓ livré 2026-05-28                       |
| Art. L123-22 C. com. — audit trail              | `OrderHistory` + `createOrderAuditTx`                           | ✓                                        |
| RGPD Art. 17(3)(b) — exemption effacement       | PII facture conservée (cf. § Rétention PII vs RGPD)             | ✓                                        |
| RGPD Art. 5.1.e — purge à 10 ans                | `hard-delete-retention.service.ts` (`purgeExpiredOrderPii`)     | ✓ livré 2026-05-29                       |
| Art. 50-0 CGI — CA à l'encaissement             | `export-orders-csv.service.ts` filtre `paidAt` (ORD-COMPLY-007) | ✓                                        |
| Réforme 2026/2027 — e-reporting B2C             | infra `EReporting*` + provider PA (cf. § E-reporting)           | ⏳ infra livrée, transmission en attente |

> **Hors périmètre B2C franchise** (supprimés du code) : émission structurée B2B
> Factur-X/UBL (EU 2014/55), transmission PA (ex-PDP) B2B/B2G, annuaire DGFiP, TVA par
> ligne. Sans objet pour un commerce 100 % B2C en franchise.
>
> **Factur-X — précision (F5).** L'e-reporting B2C **n'utilise PAS Factur-X** : il
> transmet des **données agrégées** au format défini par la PA / la DGFiP, pas une
> facture hybride PDF+XML. Le PDF client archivable est généré par **jsPDF seul**
> (`render-invoice-pdf.ts`) — facture B2C classique, **pas** de l'e-invoicing. La
> dépendance `@stackforge-eu/factur-x` (jamais importée, renderers `renderFacturX*`/
> `renderUbl` supprimés) a été **retirée de `package.json` le 2026-05-30**. À
> réintroduire **uniquement** en cas de sortie de franchise → e-invoicing B2B réel.
> Les commentaires « futurs renderers Factur-X / UBL / CII » du code décrivent une
> cible **non implémentée**, pas un existant.

---

## Brancher une Plateforme Agréée (PA) concrète

> **⚠️ Aucune PA sélectionnée ni branchée (F3, bloquant go-live 2027).** Les seuls
> providers existants sont `local` (dry-run) et `mock` (CI/staging) ; il n'y a
> **aucune PA réelle**. Tant qu'une PA n'est pas **choisie + son contrat d'API
> intégré**, `transmit-ereporting-batch` ne peut **rien transmettre de réel**.
> Toute transmission DGFiP passe **obligatoirement** par une PA immatriculée (>100
> immatriculées en 2026), avec son API et son format propres. La qualification de
> bout en bout prend **plusieurs semaines** → **à cadrer bien avant l'été 2027**.
> Le **même** choix de PA sert aussi la réception (échéance sept 2026, cf. § Statut).

L'abstraction repose sur l'interface `InvoiceProvider`
(`modules/invoices/types/invoice-provider.ts`), un factory env-driven
(`modules/invoices/providers/factory.ts`) et l'orchestrateur
`submitEReportingBatchById(batchId)`
(`modules/invoices/services/submit-ereporting-batch.service.ts`).

### Checklist

1. **Créer la classe provider** dans `modules/invoices/providers/<name>.provider.ts` :
   - `implements InvoiceProvider`, `id`, `capabilities.eReporting = true`.
   - Implémenter `submitEReportingBatch({ batch, idempotencyKey })`.
2. **Étendre la factory** (`factory.ts`) + l'enum env `INVOICE_PROVIDER` dans
   `shared/schemas/env.schema.ts` (actuellement `["local", "mock"]`).
3. **Définir les env vars provider-specific** (`<NAME>_API_URL`, `<NAME>_API_KEY`,
   `<NAME>_WEBHOOK_SECRET`). Jamais de secret ni d'URL hardcodés.
4. **Mapper les erreurs HTTP** dans la classe :
   - 4xx (validation, schema) → `ProviderBusinessError` → batch `REJECTED` (pas de
     retry, re-queue automatique des transactions + correction Order).
   - 5xx / timeout / network → throw classique → `RETRYING` + backoff (≤ `MAX_RETRY`),
     puis `ABANDONED`.
5. **Idempotency-key (EINV-EREPORT-003)** : `submitEReportingBatch` reçoit
   `idempotencyKey = EReportingBatch.id` (stable transmission + tous les retries).
   Tout adaptateur réel **DOIT** la propager côté PA (en-tête `Idempotency-Key` ou
   champ API) — sinon un retry après timeout crée un **double dépôt** DGFiP.
6. **Écrire les tests** : provider dédié `<name>.provider.test.ts` (idempotence,
   error mapping) + harness `provider-contract.test.ts`.

### Durcissement pré-go-live (EINV-CRON-003 / EINV-EREPORT-009)

Tant que `LocalPdfProvider` retourne PENDING (dry-run), ces mécanismes sont inertes.
État au 2026-05-30 (audit `bright-starlight`) :

1. **Cap de re-queue par transaction — ✓ LIVRÉ (EINV-EREPORT-009).** Un REJECTED 4xx
   (donnée structurellement invalide) ne reboucle plus indéfiniment : chaque re-queue
   incrémente `EReportingTransaction.requeueCount` (migration `20260530000000`), et
   au-delà de `MAX_REQUEUE_ATTEMPTS` (3, `submit-ereporting-batch.service.ts`) la
   transaction est **figée ABANDONED en restant attachée à son tombstone batch**
   (donc visible via `alert-stuck-orders`, jamais ré-agrégée ni retransmise) +
   alerte Sentry `["ereporting","requeue-cap-exceeded"]`. Force une intervention
   admin (corriger l'Order/Refund source puis re-queue manuel) au lieu d'une boucle
   quotidienne. Verrouillé par `ereporting-requeue-on-terminal-failure.regression.test.ts`.
2. **Détection `SENT` en souffrance — ✓ LIVRÉ (partiel).** `alert-stuck-orders`
   scanne désormais les batches `SENT` > 48h (en plus de PENDING/RETRYING/REJECTED/
   ABANDONED) : un batch transmis mais jamais accusé par la DGFiP n'est plus
   invisible. **Reste différé** (volontairement, KISS — abstraction PA inconnue) :
   le cron `reconcile-ereporting-statuses` (`SENT → ACCEPTED/REJECTED` automatique).
   Au branchement d'une PA à acceptation **asynchrone**, implémenter la méthode
   optionnelle `getEReportingBatchStatus(providerBatchId)` (déjà stubbée dans
   l'interface `InvoiceProvider`) PUIS créer le cron (modèle : passes de
   `reconcile-invoices`). En attendant, l'alerte hebdo `alert-stuck-orders` couvre
   le risque de sous-déclaration.
3. **Cadence de période — décision métier (F4).** `EREPORTING_PERIOD_LENGTH` est branché
   end-to-end (`DAILY` / `MONTHLY` / `BIMONTHLY`), **défaut `DAILY`** prudent.
   ⚠️ **Distinguer la granularité des données de la fenêtre de transmission** : la DGFiP
   veut le **détail journalier**, mais la cadence de transmission d'une franchise est
   **bimestrielle**. Aujourd'hui `DAILY` + cron `transmit-ereporting-batch` toutes les
   30 min ⇒ on transmettrait **quotidiennement** — ce n'est **pas** « sur-conforme
   inoffensif » : une PA attend généralement **une soumission bimestrielle contenant le
   détail journalier**, pas 60 batches séparés. ➡️ **Ne JAMAIS brancher la config `DAILY`
   sur une vraie PA.** Au go-live : basculer `EREPORTING_PERIOD_LENGTH=BIMONTHLY` (simple
   changement d'env) **ou** découpler _période-de-données_ (journalière) et
   _fenêtre-de-transmission_ (bimestrielle), une fois le décret final / la spec PA figés.
   Avec `BIMONTHLY`, le cron toutes les 30 min reste un simple _détecteur de batchs prêts_
   et n'émet qu'à la **clôture** de la période bimestrielle.

   **Garde fail-closed (EINV-EREPORT-010)** : `submit-ereporting-batch` REFUSE désormais
   de transmettre (`status: "SKIPPED_CADENCE_GUARD"` + alerte Sentry `error`) si le provider
   transmet réellement (`capabilities.eReporting === true`, hors `mock`) ET la cadence est
   `DAILY` ET l'acquittement explicite `EREPORTING_ALLOW_DAILY_TRANSMISSION` est absent. Le
   piège « vraie PA branchée + cadence DAILY oubliée » est donc bloqué par le code, pas
   seulement par cette doc. Sans effet en dry-run (`local`) ni en staging (`mock`).

   **Payload transmis enrichi (EINV-EREPORT-010, P2-2/P2-3)** : le batch transmis porte
   désormais (a) une **ventilation par taux** (`vatBreakdown`) — MÊME en franchise, ligne
   unique `rate: 0` portant tout le HT (référentiel : ventilation à transmettre même à 0) —
   et (b) des **agrégats journaliers** (`dailyAggregates`) dérivés des transactions. Ces
   champs sont calculés **à l'émission** depuis les totaux/transactions déjà persistés : le
   snapshot stocké reste figé (Art. L102 B, régression `ereporting-vat-breakdown` intacte —
   stockage toujours `null` en franchise).

### Invariants à respecter

- Aucun `process.env.INVOICE_PROVIDER` ailleurs que dans `factory.ts`.
- Aucun appel HTTP externe en dehors de la classe provider.
- Aucune mutation directe `EReporting*` hors `record-ereporting` + `build-ereporting-batch`
  - `submit-ereporting-batch` (Invariant 9).
- E-reporting B2C **agrégé** uniquement — jamais de dépôt de facture individuelle.

---

## Feature flags & configuration

Pilotés par variables d'environnement, validés au boot via `envSchema`
(`shared/schemas/env.schema.ts`). **Fail-closed** : une valeur autre que
`true|1|yes` (insensible casse) = OFF.

| Variable                              | Effet quand ON                                                                      | Effet quand OFF (défaut)                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `INVOICE_PROVIDER`                    | `local` (défaut, dry-run) \| `mock` (CI/E2E, transmet)                              | n/a (`local`)                                         |
| `INVOICE_ENABLE_EREPORTING`           | `recordSalesEReporting` / `recordRefundEReporting` créent les transactions          | Hooks répondent `"skipped"` (rien en DB)              |
| `EREPORTING_PERIOD_LENGTH`            | Cadence d'agrégation `DAILY` \| `MONTHLY` \| `BIMONTHLY`                            | `DAILY`                                               |
| `EREPORTING_ALLOW_DAILY_TRANSMISSION` | Acquitte la transmission `DAILY` vers une vraie PA (lève la garde EINV-EREPORT-010) | OFF ⇒ transmission `DAILY` BLOQUÉE pour une PA réelle |

**Recommandation de roll-out** (étape N exige N-1) :

1. ⏳ **Staging** — `INVOICE_ENABLE_EREPORTING=true` (`provider=local`) : la cron
   J1 agrège les `EReportingTransaction`, rien n'est transmis. Valide la qualité
   des `payloadSnapshot` ~7 jours.
2. ⏳ **Prod canary** — `INVOICE_ENABLE_EREPORTING=true` : mesure l'overhead webhook (~5ms).
3. ⏳ **Prod 100 %** — `INVOICE_ENABLE_EREPORTING=true` partout.
4. 🔒 **PA signing** — livrer d'abord les 3 angles morts (cf. § ci-dessus), puis
   `INVOICE_PROVIDER=<pa>` + sandbox.

---

## Crons

| Job                         | Schedule (UTC) | Service                                                      | Statut                                          |
| --------------------------- | -------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `build-ereporting-batch`    | `0 1 * * *`    | `modules/cron/services/build-ereporting-batch.service.ts`    | ✓ livré                                         |
| `transmit-ereporting-batch` | `*/30 * * * *` | `modules/cron/services/transmit-ereporting-batch.service.ts` | ✓ livré (dry-run tant que `provider=local`)     |
| `reconcile-invoices`        | `0 2 * * *`    | `modules/cron/services/reconcile-invoices.service.ts`        | ✓ livré (DLQ + continuité numéros & périodes)   |
| `reconcile-voided-invoices` | `0 7 * * *`    | `modules/cron/services/reconcile-voided-invoices.service.ts` | ✓ livré (rattrape avoirs manquants post-refund) |

⚠️ **« ✓ livré » = service `modules/` présent et testé, PAS forcément route planifiée.**
Au 2026-05-30, seul **`reconcile-invoices` est effectivement planifié dans `vercel.json`**
(`0 2 * * *`) car son DLQ facture (Passes 0-3) est une obligation **LIVE** (Art. 286/289-I).
Les trois autres (`build-ereporting-batch`, `transmit-ereporting-batch`,
`reconcile-voided-invoices`) ont leur **route supprimée** et sont **à réactiver au go-live
e-reporting (1ᵉʳ sept. 2027)** — les schedules ci-dessus sont les valeurs cibles à recréer.

SSOT des schedules : `vercel.json`. Cf. `docs/CRONS.md` pour la liste complète des
crons Synclune (incl. crons non liés à la facturation).

---

## Troubleshooting

### "Facture indisponible pour cette commande" (400)

Cause : `order.paymentStatus !== "PAID"`. Fix : vérifier Stripe / attendre le
webhook ou lancer `sync-async-payments`.

### Aucune `EReportingTransaction` créée après paiement

1. Vérifier `INVOICE_ENABLE_EREPORTING=true`.
2. Vérifier le dashboard `/admin/ventes/facturation` (carte feature flags).
3. Logs Sentry `service:record-ereporting`.
4. Idempotence : si une transaction existe déjà (`findFirst` match) → `"skipped"`
   silencieux (normal en cas de webhook replay).

### Batch e-reporting bloqué en `PENDING`

Tant que le provider PA n'est pas configuré, **c'est attendu** (dry-run). Dès qu'un
provider concret remplace `LocalPdfProvider`, `transmit-ereporting-batch` consomme
la file (`periodFrom asc`).

### Batch `REJECTED` / `ABANDONED` — re-queue automatique

`submit-ereporting-batch` détache atomiquement les transactions (`batchId=null`,
`PENDING`) ; le batch reste un **tombstone immuable** (`rejectionReason` conservé).
Le prochain `build` les ré-agrège — aucune transaction orpheline. Garde batch vide :
un tombstone re-queué (0 transaction) n'est jamais re-transmis (`SKIPPED_EMPTY`), et
le bouton admin « Relancer » le refuse. Verrouillé par
`ereporting-requeue-on-terminal-failure.regression.test.ts`.

> ⚠️ **Limitation** (cf. § « À livrer AVANT le go-live PA », point 2) : un REJECTED
> 4xx structurel boucle quotidiennement une fois une vraie PA branchée, jusqu'à
> correction de l'Order. Cap `requeueCount` à implémenter au go-live.

### Erreur `INVOICE_SEQUENCE_OVERFLOW` (99999/an)

`F-YYYY-NNNNN` plafonne à 99 999 factures/an. Au-delà :

1. Migration : regex CHECK → `^F-[0-9]{4}-[0-9]{5,6}$`.
2. `padStart(5, "0")` → `padStart(6, "0")` dans `persist-invoice-number.service.ts`.

Probabilité nulle à court terme (~50-100 factures/mois). Le guard évite une P2002
silencieuse rejouée 5 fois.

---

## Variables d'environnement

```bash
# Vendeur (validés au boot via envSchema — shared/lib/stripe.ts:getVendorLegalInfo())
VENDOR_LEGAL_NAME="TADDEI LEANE - Entrepreneur Individuel"
VENDOR_TRADE_NAME="Synclune"
VENDOR_SIREN="839 183 027"          # 9 chiffres (espaces optionnels)
VENDOR_SIRET="839 183 027 00037"    # 14 chiffres (espaces optionnels)
VENDOR_VAT_NUMBER="FR35839183027"   # FR + 2 chars + 9 chiffres SIREN
VENDOR_APE_CODE="47.91B"
VENDOR_FULL_ADDRESS="77 Boulevard du Tertre, 44100 Nantes, France"
VENDOR_EMAIL="contact@synclune.fr"
VENDOR_VAT_REGIME="FRANCHISE_BASE"  # FRANCHISE_BASE | NORMAL | SIMPLIFIE
VENDOR_VAT_EXEMPTION_TEXT="TVA non applicable, art. 293 B du CGI"
VENDOR_BANK_IBAN="..."              # normalisé (CHECK DB)
VENDOR_BANK_BIC="..."

# Facturation électronique
INVOICE_PROVIDER=local              # local (défaut) | mock
INVOICE_ENABLE_EREPORTING=          # vide = OFF, "true"/"1"/"yes" = ON
EREPORTING_PERIOD_LENGTH=DAILY      # DAILY (défaut) | MONTHLY | BIMONTHLY
                                    # ⚠️ NE JAMAIS laisser DAILY sur une vraie PA (cf. F4) :
                                    # passer BIMONTHLY au go-live (transmission bimestrielle,
                                    # détail journalier).
EREPORTING_ALLOW_DAILY_TRANSMISSION= # vide = OFF (garde EINV-EREPORT-010 : transmission DAILY
                                    # BLOQUÉE pour une vraie PA). "true" UNIQUEMENT si la spec
                                    # PA confirme accepter le détail journalier en transmission.

# Surveillance franchise TVA (SSOT shared/constants/vat-franchise.ts)
VAT_FRANCHISE_THRESHOLD_EUR=85000   # défaut 85 000 € (ventes de biens — cas Synclune ;
                                    # 37 500 € si requalification prestations de services)
```

---

## Points en attente (décisions métier / business)

1. **Choix de la Plateforme Agréée (PA)** — débloque la transmission e-reporting **et**
   la réception (sept 2026). Critères : prix, support B2C agrégé, intégration API/webhook,
   certification DGFiP. **Aucune PA branchée à ce jour** (cf. F3, § Brancher une PA).
2. **Périodicité e-reporting B2C** — décret final non publié (mai 2026). La cadence
   franchise est de nature **bimestrielle** ; `EREPORTING_PERIOD_LENGTH` défaut
   `DAILY` prudent. **Ne jamais transmettre en `DAILY` à une vraie PA** (cf. F4).
3. **Bascule régime réel TVA** — si Synclune dépasse le seuil applicable (**85 000 €
   ventes de biens** par défaut, cf. § Statut), recâbler `OrderItem.taxRate`/`taxAmount`
   au checkout (et alimenter `vatBreakdown`, actuellement DORMANT) et reprendre la
   numérotation depuis le compteur courant (pas de reset).

---

## Open items conformité — à figer contre le format PA / l'arrêté final (2026-05-30)

Ces points dépendent du **format exact exigé par la PA / la DGFiP** (non figé en mai 2026).
**Aucun changement de code tant que la PA n'est pas choisie** — ils sont tracés ici pour ne
pas les perdre au moment de l'intégration réelle.

- **F7 — Mention « art. 293 B » dans le payload structuré (pas seulement le PDF).** Aujourd'hui
  le `PayloadSnapshot` (`build-ereporting-transaction.ts`) ne porte que des montants numériques
  (`taxAmount = 0` en franchise) ; la mention « TVA non applicable, art. 293 B » n'existe que
  dans le **PDF** (`render-invoice-pdf.ts`). ➡️ **À confirmer** : si la spec PA exige l'exemption
  en **donnée structurée**, ajouter un champ dédié (type `vatExemptionMention`) au snapshot.
- **F6a — Ventilation TVA même à 0.** `vatBreakdown` est `null` en franchise
  (`build-ereporting-transaction.ts`, `taxAmount === 0`). ➡️ **À confirmer** : le schéma final
  de la PA accepte-t-il `null`, ou exige-t-il une **ligne explicite « taux 0 / exonéré 293 B »** ?
- **F6b — Flux paiements e-reporting.** `EReportingTransactionType.PAYMENT` est marqué « futur ».
  L'e-reporting comporte deux flux (transactions **et** paiements) ; en franchise, les **données
  de paiement sont aussi transmises tous les deux mois**. Enjeu faible pour des biens payés
  comptant par CB, mais ➡️ **à valider explicitement** contre la spec (ne pas l'oublier par défaut).
- **F9 — Sanctions (conscience du risque).** ~**250–500 € par transmission e-reporting manquante,
  plafond 15 000 €/an** (montant unitaire à reconfirmer sur impots.gouv.fr — les sources divergent
  entre 250 € et 500 €). Filet existant : alerte hebdo `alert-stuck-orders` (scan batches
  PENDING/RETRYING/REJECTED/ABANDONED/SENT) + monitoring e-reporting.
- **F8 — Terminologie.** Depuis 2025, **PDP → « Plateforme Agréée » (PA)** et **opérateur de
  dématérialisation (OD) → « Solution Compatible » (SC)**. Ce doc est harmonisé sur « PA » ; le
  préfixe d'enum `PDP_*` reste figé pour ne pas recréer le type Postgres (alias « PA »).

```

```
