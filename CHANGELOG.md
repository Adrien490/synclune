# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **E-invoicing Phase 2-4** (réforme française 2026/2027) :
  - Modèles B2B/B2G : champs `companyName/companyVatNumber/companySiren` sur `User` + snapshot `customerType` sur `Order` ; VAT par ligne sur `OrderItem`
  - Pivot `InvoiceData` (Zod-validé) consommé par `renderInvoicePdf` / `renderFacturXMinimum` (Factur-X CII XML minimal profile) / `renderUbl` (UBL 2.1)
  - Abstraction `InvoiceProvider` + `LocalPdfProvider` stub ; feature flags `INVOICE_PROVIDER`, `INVOICE_VALIDATE_XML`, `EREPORTING_ENABLED`
  - Numérotation gap-free `F-YYYY-NNNNN` / `A-YYYY-NNNNN` avec advisory locks Postgres + CHECK constraints + garde overflow 99999/an
  - Crédit notes via `void-invoice.service.ts` (cancel-order, mark-as-fully-refunded, charge.refunded total)
  - PDF immuable post-paiement archivé sur UploadThing + SHA-256 (`Order.invoicePdfHash`)
  - E-reporting : modèles `EReportingTransaction` + `EReportingBatch`, hooks SALES/REFUND, agrégation quotidienne, transmission PDP (dry-run tant que flag OFF)
  - Admin dashboard `/admin/ventes/facturation` + admin invoice download + filter `invoiceStatus`
  - 9 cron jobs : `transmit-invoices`, `transmit-ereporting-batch`, `retry-invoice-transmissions`, `reconcile-invoice-statuses`, `build-ereporting-batch`, `reconcile-invoices`, `reconcile-voided-invoices`, `refresh-stale-directory-entries`, `retry-post-webhook-tasks`
  - Tests régression d'invariants : `no-manual-invoice-creation`, `no-manual-ereporting-write`, `order-history-immutability`, `persist-invoice-number` overflow
  - Docs : [`INVOICING.md`](docs/INVOICING.md) + [`RUNBOOK-INVOICING.md`](docs/RUNBOOK-INVOICING.md) + section "Facturation électronique" dans `CLAUDE.md`
- **Audits qualité** (mai 2026) : checkout adjacent pages, cron jobs full audit, rate-limit hardening, admin mobile header/bottom-bar/menu-sheet, home FAQ, latest-creations, footer
- **Performance** : LCP hero CSS-only floating images, atelier entrance animations CSS-only, compositor-friendly animations, preconnect UploadThing, lazy-mount client modals, immutable cache + admin bypass on invoice route
- **SEO** : OG image dynamique par catégorie produit
- **Auth** : pages `forbidden`/`unauthorized` (`authInterrupts` opt-in), email `oauth-account-linked`, durcissement filtres `fetchUserForAuth` (suspended/PENDING_DELETION/INACTIVE/ANONYMIZED), rate-limits applicatifs `changePassword` + `signInSocial` + per-email-target sur reset
- Tests : couverture `useActionStateWithToast`, broader roving radio selector
- Comprehensive test coverage for shared utilities
- Error boundary for legal pages
- Extended CODEOWNERS for all critical paths
- Lighthouse CI thresholds (performance >= 90, a11y >= 95, SEO >= 95)
- CHANGELOG.md and README.md

### Changed

- **Counts realignment** : 24 DDD modules (was 26), 16 email templates (was 36), 23 cron jobs (was 18), 9 Zustand stores (was 5) — drift entre doc et code corrigé 2026-05-28
- Resolved all TODO/FIXME/HACK comments across the codebase
- Lighthouse assertions upgraded from `warn` to `error`

### Fixed

- iOS Safari audit storefront — `dvh`, `can-hover` gate, sticky keyboard
- Cart : split tombstone undo (mobile cancelTombstone seul, pas de double quantity)
- ResponsiveActionMenu Link history.back race (Vaul `<DrawerClose asChild>`)
- Removed dead commented-out newsletter code from settings page

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
