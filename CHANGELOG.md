# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive test coverage for shared utilities
- Error boundary for legal pages
- Extended CODEOWNERS for all critical paths
- Lighthouse CI thresholds (performance >= 90, a11y >= 95, SEO >= 95)
- CHANGELOG.md and README.md

### Changed

- Resolved all TODO/FIXME/HACK comments across the codebase
- Lighthouse assertions upgraded from `warn` to `error`

### Fixed

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
