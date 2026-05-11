---
title: Audit Framework — Changelog
format: Keep a Changelog 1.1.0 + SemVer 2.0.0
---

# Changelog

Toutes les modifications notables de ce framework sont documentées ici.

Format : [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning : [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] — 2026-05-11

### Changed

- **`01-conventions.md` § Services transactionnels partagés** : ajout de 5 lignes pour formaliser les exceptions layering déjà actives en code (audit `modules/media/` 2026-05-11) :
  - `media/services/delete-uploadthing-files.service.ts` — UTApi cleanup partagé reviews / account-deletion / hard-delete
  - `media/services/generate-thumbhash.ts` — Sharp + HTTP download depuis UploadThing core
  - `media/services/image-downloader.service.ts` — HTTP download SSRF-safe partagé thumbhash + validate-dimensions + strip-metadata
  - `media/services/validate-image-dimensions.service.ts` — Sharp anti-image-bomb depuis UploadThing core
  - `media/services/strip-image-metadata.service.ts` — Sharp EXIF/GPS strip RGPD depuis UploadThing core (nouveau service P0.1 audit)

## [2.1.0] — 2026-05-10

### Added

- **Script `pnpm audit:lint`** (`scripts/audit-lint.ts`) : valide automatiquement que les chemins `modules/`, `shared/`, `app/`, `prisma/`, `emails/`, `scripts/` cités dans `docs/audit/*.md` existent réellement. Détecte le drift dès la PR. Supporte marqueur `<!-- audit-lint-ignore -->` pour références volontairement illustratives ou pointant vers fichiers absents documentés.
- **`patterns-cookbook.md`** : 6 patterns métier projet ajoutés (sections 31-36) :
  - 31. Soft delete (`notDeleted` + `softDelete.x()`)
  - 32. Webhook idempotency Stripe (signature + WebhookEvent + 5min replay)
  - 33. Error boundary (route + shared `AdminListErrorBoundary` + `global-error.tsx`)
  - 34. `useFocusFirstError` (a11y forms via `useAppForm`)
  - 35. Responsive components (`ResponsiveDialog`/`AlertDialog`/`ActionMenu`/`AdminFormFooter`)
  - 36. `useHaptic` (light/medium/error/selection)
- **`glossary.md`** : 9 entrées métier ajoutées : Cache profiles 🟣 (4 profils détaillés), Customization 🟣, Dispute, Fulfillment 🟣, Idempotency webhook 🟣, Restock 🟣, SIREN/SIRET, SKU 🟣, Soft delete 🟣 (enrichi RGPD/anti-fraude), TVA franchise art. 293 B 🟣, URSSAF 🟣.
- **`04-foundations.md`** : restructuré en 3 sous-sections par audit (`X.X.1 Prompt` / `X.X.2 Outils spécifiques` / `X.X.3 Definition of done`) + nouvelle section `Outils requis (commun)` avec table commandes (`pnpm typecheck`, `pnpm knip`, `npx madge`, `pnpm audit:lint`, `pnpm size`, etc.).

### Changed

- **`01-conventions.md`** : déduplication majeure avec `CLAUDE.md`. Sections "Architecture en couches" (table layers + matrice de décision), "Auth helpers" (table requireX), "Profils de cache" (table 4 profils), "Naming" (table base), "Composants partagés" (arbo `shared/`) → remplacées par renvoi `📘 voir CLAUDE.md § X` + delta audit-specific seulement. Fichier passe de ~415 à ~290 lignes utiles, sans perte d'info.
- **`02-modules.md`** :
  - L.76 (addresses) : `shared/schemas/address.ts` → `shared/schemas/address-schema.ts` (nom réel).
  - L.177, L.667 (collections, skus) : `shared/services/unique-name-generator.ts` → `shared/services/unique-name-generator.service.ts` (nom réel).
  - L.344 (emails) : `emails/constants/strings.ts` → `modules/emails/constants/email.constants.ts`.
  - L.345 : "33/33 fonctionnels" → "14/14 fonctionnels" (réalité `ls emails/`).
- **`03-cross-module.md`** : L.194 `modules/products/actions/bulk-archive.ts` → `bulk-archive-products.ts` (nom réel).
- **`04-foundations.md`** : structure `app/` mise à jour (groupes réels `(account)`, `(auth)`, `(legal)`, `(shop)`, `admin` au lieu de l'ancien `(boutique)` unique), liste fichiers racine alignée (`global-error.tsx`, `layout.tsx`, `manifest.ts`, `not-found.tsx`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`, `sw.ts`), correction "9 jobs vercel.json" → "7 jobs", fix `app/layout.ts` → `app/layout.tsx` (et toutes les autres `.ts` qui devaient être `.tsx`).
- **`patterns-cookbook.md`** :
  - Pattern 25 commentaire fichier : `order-state-machine.ts` → `order-status-validation.service.ts`.
  - Pattern 30 commentaire fichier : `__tests__/cancel-order.integration.test.ts` → `actions/__tests__/cancel-order.test.ts` (nom réel).
  - Pattern 10 commentaire fichier : `app/page.tsx` (root) → `app/(shop)/produits/[slug]/page.tsx (illustratif)`.
- **`CLAUDE.md`** (hors framework strict, alignement réalité) :
  - Storefront `(boutique)` → `(shop)` ; ajout `(account)` et `(legal)` séparés.

### Fixed

- 100% des chemins `modules/`/`shared/`/`app/`/`emails/` cités dans `docs/audit/` résolvent désormais à des fichiers réels (validé par `pnpm audit:lint`).

### Migration depuis 2.0.1

Aucune action requise — toutes les modifications sont rétro-compatibles. `pnpm audit:lint` peut être ajouté en pre-commit hook ou job CI séparé pour empêcher tout futur drift.

## [2.0.1] — 2026-05-10

### Fixed

- `02-modules.md:443` (orders) : `services/order-state-machine.ts` → `services/order-status-validation.service.ts` (nom réel du service).
- `03-cross-module.md:47` : même correction `order-state-machine.ts` → `order-status-validation.service.ts`.
- `03-cross-module.md:48` : `refund-state-machine.ts` (inexistant) remplacé par référence aux services réels (`refund-calculation.service.ts`, `return-eligibility.service.ts`) + handlers webhook.
- `02-modules.md:313` (discounts) : retrait référence "Newsletter promo code (newsletter/services exception)" — module inexistant.
- `01-conventions.md:79-82` : retrait des 4 lignes `newsletter/services/*` du tableau des services transactionnels partagés (module inexistant dans `modules/`).

### Removed

- Toutes les références au module `newsletter/` dans le framework — la logique newsletter n'existe pas (encore) dans `modules/`.

### Notes

- Un audit du framework lui-même a relevé : note globale **8.0/10**. Backlog déduplication CLAUDE.md ↔ `01-conventions.md`, enrichissement `patterns-cookbook.md` (mobile-first, soft-delete, webhook idempotency, error boundaries, useFocusFirstError, responsive components, haptic), restructuration `04-foundations.md` (prompt/outils/DoD), enrichissement `glossary.md` (termes métier ecommerce + fiscal FR) à planifier en v2.1.0.
- CLAUDE.md mis à jour en parallèle (hors framework strict) : 23 → 22 modules, 33/24 → 14 templates, 9 → 7 cron jobs, retrait `cleanup-newsletter` et route `/boutique/newsletter` (inexistants).

## [2.0.0] — 2026-05-10

### Added

- Split du fichier monolithique `docs/module-audit-prompts.md` en 9 fichiers thématiques (`docs/audit/`).
- Définition mesurable des priorités P0/P1/P2 (critères stricts, plus de subjectivité).
- Format `Format finding` obligatoire pour chaque finding (file:line + impact + critère + diff + tests + effort).
- Definition of Done (DoD) universelle.
- Glossaire complet des acronymes (`glossary.md`) — PPR, CVA, AAA, SCA, PSD2, CLS, LCP, INP, CSP, PII, DLQ, RJC, etc.
- Patterns cookbook (`patterns-cookbook.md`) — ~30 snippets avant/après idiomatiques.
- Audit transversal (`03-cross-module.md`) — cohérence cache tags, state machines, naming, error handling, auth helpers.
- Audit foundations (`04-foundations.md`) — couvre `shared/`, `app/`, `prisma/`, configs (next/ts/eslint/sentry/vercel/env).
- Liste explicite des anti-patterns à proscrire (avec priorité associée).
- Liste explicite "ce qui n'est PAS audité".
- Memory feedbacks owner matérialisés en règles documentées (no autoFocus, no double back, no reassurance icons, no Cancel button create-product, Speculation Rules refusées).
- Frontmatter + version + date + owner + status sur chaque fichier.
- Section "Maintenance" : qui fait quoi quand un évènement se produit.

### Changed

- Préambule désormais référencé (lecture obligatoire `00-standards.md` + `01-conventions.md`) au lieu de copier-coller à chaque session — mise à jour atomique.
- Tous les prompts modules normalisés à 12-20 bullet points (auparavant inégaux : auth ~30, colors ~8).
- Chaque prompt module enrichi de TLDR, badges (criticité/durée), prérequis, DoD spécifique.
- Précisions techniques corrigées :
  - `useOptimistic` : ne fait pas de "rollback explicite" — React réconcilie automatiquement.
  - `useActionState` (`react`) vs `useFormState` (`react-dom`, legacy) — distinction explicite.
  - `ref as prop` : function components uniquement, pas class.
  - Cache Components Next.js 16 vs PPR — distinction.
  - Suspense parallèles vs `Promise.all` — non équivalents (streaming vs render-after-all).
- Pattern projet error handling clarifié : `BusinessError` thrown + `handleActionError` (pas `Result<T,E>` — alignement avec convention existante).

### Fixed

- Imprécision "Promise.all ou Suspense parallèle" → distinction render-after-all vs streaming.
- Imprécision sur React Activity (statut React 19.2).

### Removed

- `docs/module-audit-prompts.md` (monolithique, déprécié — git history conservée).

### Migration depuis 1.0.0

```
Avant (1.0):
  Coller préambule (250 lignes) + prompt module → session.

Après (2.0):
  Coller `docs/audit/00-standards.md` + `docs/audit/01-conventions.md` + prompt cible.
  Optionnel : `docs/audit/glossary.md` + `docs/audit/patterns-cookbook.md`.
```

Aucune perte de couverture. Toutes les règles de 1.0 sont préservées et précisées.

## [1.0.0] — 2026-05-10

### Added

- Version initiale — fichier monolithique `docs/module-audit-prompts.md`.
- 22 prompts modules.
- Préambule commun (Next.js 16.2, React 19.2, TS strict, SOLID/DRY).
- Annexes outils + commandes.
