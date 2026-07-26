# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **e-reporting DGFiP retiré (right-sizing 2026-07-26)** : suppression des modèles
  `EReportingTransaction` / `EReportingBatch` / `EReportingPeriod`, des enums
  `EReportingTransactionType` / `EReportingStatus`, des colonnes DLQ
  `Order.ereportingRetryDeferred` / `Refund.ereportingRetryDeferred`, des hooks SALES/REFUND sur le
  hot path paiement/remboursement, des passes SALES/5/6 de `reconcile-invoices`, du dossier
  `modules/invoices/providers/` (qui ne servait qu'à l'e-reporting), du module de feature flags
  facturation et de la page admin `/admin/ventes/facturation/batches`.
  Migration `20260726190000_drop_ereporting` (+ `down.sql`).
  **Motif** : ~7 200 lignes en dry-run intégral (flag jamais activé, aucune Plateforme Agréée
  branchée) écrites contre une spec non figée, pour une obligation au 1ᵉʳ sept. 2027 — à réécrire
  contre l'arrêté définitif. Les obligations **actuelles** (numérotation gap-free, PDF immuable,
  avoirs, rétention 10 ans) sont intactes. Cf. `docs/RUNBOOK.md § e-reporting`.

### Added

- **Numérotation gap-free — durcissement (audit 2026-07-09)** : job CI `tests-integration` (service Postgres éphémère — les suites de concurrence advisory-lock tournent désormais sur chaque PR, adapter `@prisma/adapter-pg` sélectionné hors Neon) ; trigger DB `check_credit_note_cross_table_unique` (unicité cross-table Order↔Refund des numéros d'avoir, migration 20260709 + down.sql + test d'intégration) ; timeouts explicites `TX_TIMEOUT_LONG` sur les 3 transactions de séquence (l'attente advisory lock compte dans le timeout) ; retry élargi aux codes transitoires P2024/P2028 (`RETRYABLE_SEQUENCE_TX_ERROR_CODES`, sûr grâce à la garde d'idempotence sous lock)
- **Right-sizing (audit 2026-06)** : SSOT des plannings cron `modules/cron/constants/schedules.ts` + monitoring **Sentry Cron** (alerte sur run manqué, MON-03) ; docs `docs/BUSINESS.md` (modèle / coûts / périmètre assumé) + `docs/RUNBOOK.md` (procédures ops solo) ; widget dashboard « À traiter » remplaçant les crons d'alerte e-mail
- **E-invoicing Phase 2-4** (réforme française 2026/2027) :
  - Modèles B2B/B2G : champs `companyName/companyVatNumber/companySiren` sur `User` + snapshot `customerType` sur `Order` ; VAT par ligne sur `OrderItem`
  - Pivot `InvoiceData` (Zod-validé) consommé par `renderInvoicePdf` / `renderFacturXMinimum` (Factur-X CII XML minimal profile) / `renderUbl` (UBL 2.1)
  - Abstraction `InvoiceProvider` + `LocalPdfProvider` stub ; feature flags `INVOICE_PROVIDER`, `INVOICE_VALIDATE_XML`, `EREPORTING_ENABLED`
  - Numérotation gap-free `F-YYYY-NNNNN` / `A-YYYY-NNNNN` avec advisory locks Postgres + CHECK constraints + garde overflow 99999/an
  - Crédit notes via `void-invoice.service.ts` (cancel-order, mark-as-fully-refunded, charge.refunded total)
  - PDF immuable post-paiement archivé sur UploadThing + SHA-256 (`Order.invoicePdfHash`)
  - E-reporting : modèles `EReportingTransaction` + `EReportingBatch`, hooks SALES/REFUND, agrégation quotidienne, transmission PDP (dry-run tant que flag OFF)
  - Admin dashboard `/admin/ventes/facturation` + admin invoice download + filter `invoiceStatus`
  - E-reporting : services `build`/`transmit-ereporting-batch` présents mais **retirés de `vercel.json`** (standby, réactivables au go-live 2027) ; `reconcile-invoices` (DLQ facture, Passes 0-3) + `retry-post-webhook-tasks` actifs
  - Tests régression d'invariants : `no-manual-invoice-creation`, `no-manual-ereporting-write`, `order-history-immutability`, `persist-invoice-number` overflow
  - Docs : section "Facturation électronique" dans `CLAUDE.md` + [`BUSINESS.md`](docs/BUSINESS.md) + [`RUNBOOK.md`](docs/RUNBOOK.md)
- **Audits qualité** (mai 2026) : checkout adjacent pages, cron jobs full audit, rate-limit hardening, admin mobile header/bottom-bar/menu-sheet, home FAQ, latest-creations, footer
- **Performance** : LCP hero CSS-only floating images, atelier entrance animations CSS-only, compositor-friendly animations, preconnect UploadThing, lazy-mount client modals, immutable cache + admin bypass on invoice route
- **SEO** : OG image dynamique par catégorie produit
- **Auth** : pages `forbidden`/`unauthorized` (`authInterrupts` opt-in), email `oauth-account-linked`, durcissement filtres `fetchUserForAuth` (suspended/PENDING_DELETION/INACTIVE/ANONYMIZED), rate-limits applicatifs `changePassword` + `signInSocial` + per-email-target sur reset
- Tests : couverture `useActionStateWithToast`, broader roving radio selector
- Comprehensive test coverage for shared utilities
- Error boundary for legal pages
- Extended CODEOWNERS for all critical paths
- CHANGELOG.md and README.md

### Changed

- **Counts** : 24 modules DDD, 11 templates email, 10 cron jobs, 9 stores Zustand (réalignement doc ↔ code, 2026-06)
- Resolved all TODO/FIXME/HACK comments across the codebase

### Fixed

- iOS Safari audit storefront — `dvh`, `can-hover` gate, sticky keyboard
- Cart : split tombstone undo (mobile cancelTombstone seul, pas de double quantity)
- ResponsiveActionMenu Link history.back race (Vaul `<DrawerClose asChild>`)
- Removed dead commented-out newsletter code from settings page

### Removed

- **Right-sizing (audit 2026-06)** : PWA/Serwist (service worker, page offline, manifest), Vercel Analytics + Speed Insights, Lighthouse CI (workflow + configs), crons `alert-overbilled-orders` + `alert-stuck-orders` (remplacés par le widget dashboard « À traiter »), crons `cleanup-*` (sessions/webhook-events/wishlists), actions panier `set-cart-notes` + `set-gift-options`
- Docs obsolètes : `docs/INVOICING.md`, `docs/CRONS.md`, `docs/RUNBOOK-INVOICING.md`, `docs/audit/`, `docs/runbooks/` (connaissance conformité conservée inline dans `CLAUDE.md` ; ops dans `docs/RUNBOOK.md`)

## [0.1.0] - 2026-03-01

### Added

- Initial release of Synclune e-commerce platform
- 26 DDD modules (products, orders, payments, cart, wishlist, reviews, etc.)
- Stripe integration (payments, webhooks, refunds)
- Better Auth (email, Google, GitHub)
- 36 React Email transactional templates
- PWA with Serwist (offline page, install prompt)
- 18 Vercel cron jobs for maintenance and automation
- Admin dashboard with analytics
- Product search with fuzzy matching and spell correction
- Cursor pagination across all list views
- RGPD compliance (soft deletes, consent tracking, data export)
