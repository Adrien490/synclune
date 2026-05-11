---
title: Audit foundations (shared/, app/, prisma/, configs)
version: 2.1.0
last-reviewed: 2026-05-10
prerequisites:
  - docs/audit/00-standards.md
  - docs/audit/01-conventions.md
---

# Audit foundations

Audit des zones **hors `modules/`** : code transverse et infrastructure du projet.

> Critique : `shared/` est le code le plus réutilisé (donc le plus à risque de propagation de dette). `prisma/` définit les invariants DB. Les configs définissent l'identité du build. Un éventuel `middleware.ts` racine est sécurité-critique (à vérifier — non présent dans le repo à ce jour).

## Sommaire

- [Outils requis (commun)](#outils-requis-commun)
- [4.1 — Audit `shared/`](#41--audit-shared)
- [4.2 — Audit `app/` (routing, layouts, route handlers)](#42--audit-app)
- [4.3 — Audit `prisma/` (schéma, migrations, indexes)](#43--audit-prisma)
- [4.4 — Audit configs (next, ts, eslint, sentry, vercel, env, package)](#44--audit-configs)

---

## Outils requis (commun)

Chaque sous-audit ci-dessous suppose ces outils installés :

| Outil                       | Commande                  | Notes                                                                 |
| --------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `tsc`                       | `pnpm typecheck`          | Type checking (déjà devDep)                                           |
| `eslint`                    | `pnpm lint`               | Lint (devDep `eslint@^9`)                                             |
| `vitest`                    | `pnpm test --run <scope>` | Tests unitaires                                                       |
| `pnpm test:critical`        | `pnpm test:critical`      | Critical path 7 modules                                               |
| `knip`                      | `pnpm knip`               | Détecte exports/files morts (devDep `knip@^6`)                        |
| `madge`                     | `npx madge --circular .`  | Détecte deps circulaires (pas devDep — ad-hoc via npx)                |
| `pnpm audit:lint`           | `pnpm audit:lint`         | Valide que les paths cités dans `docs/audit/*.md` existent réellement |
| `next experimental-analyse` | `pnpm analyse`            | Bundle analysis                                                       |
| `size-limit`                | `pnpm size`               | Budgets bundles                                                       |

> Si un outil manque : ajouter en devDep + script `pnpm` AVANT de lancer l'audit, ne pas écrire d'instructions vagues.

---

## 4.1 — Audit `shared/`

**TLDR** : code transverse — surface API minimale, types réutilisés, hooks SRP.
**Criticité** : 🟡 standard (mais propage à tout le projet)
**Effort estimé** : ⏱ 3-4h

### 4.1.1 — Prompt

```
Audit shared/ (code transverse Synclune).

Structure inspectée :
- shared/actions/      # Client-side state actions
- shared/components/   # UI shadcn, animations, forms, icons, loaders, navigation
- shared/constants/    # Cache tags transverses, countries, currency, brand, SEO
- shared/contexts/     # React Context definitions
- shared/data/         # Shared data fetching with cache
- shared/hooks/        # ~20 hooks
- shared/lib/          # Core: prisma, stripe, email-config, cache, rate-limit, actions/
- shared/providers/    # Root providers
- shared/schemas/      # Address, email, pagination, media, phone (suffix `-schema.ts` ou `.schemas.ts`)
- shared/services/     # Unique name generator (`*.service.ts`)
- shared/stores/       # 5 Zustand stores
- shared/styles/       # Global styles, fonts
- shared/types/        # Server actions, sessions, pagination, errors
- shared/utils/        # Formatting, slug, date, currency, password strength

Spécificités :
1. Surface API minimale : chaque fichier a-t-il ≤ 5 exports nommés ? Sinon split.
2. shared/lib/actions : helpers (success, error, handleActionError, validateInput, enforceRateLimit) — couverture tests, pas de mutation cachée.
3. shared/lib/prisma : exports `prisma`, `notDeleted`, `softDelete`. Pas de business logic.
4. shared/lib/stripe : client unique, API version pinned.
5. shared/lib/cache : helpers cacheLife/cacheTag wrappers ?
6. shared/lib/rate-limit : Arcjet + in-memory fallback, granularité (IP/user/action).
7. shared/lib/email-config : env Zod typée.
8. shared/components/ : shadcn pure (pas de business logic), variants CVA, ref as prop (React 19), accessibilité WCAG.
9. shared/hooks/ : préfixe use, SRP, return signature stable, 0 useMemo/useCallback.
10. shared/schemas/ : Zod centralisé pour types réutilisés. `z.infer` exporté.
11. shared/utils/ : pure fns (zéro I/O), tests 100% lines.
12. shared/stores/ : 5 stores Zustand, sélecteurs ciblés, pas de duplication serveur.
13. shared/constants/ : `as const` partout, pas de magic numbers ailleurs (grep).
14. shared/providers/ : minimaux, descendre `"use client"` au plus bas.
15. shared/types/ : discriminated unions pour states, branded types pour IDs critiques.
16. Naming cohérent (cf. 01-conventions.md § Naming).
17. Layering : pas de business logic métier (réservé aux modules). Si `shared/services/` contient un cas qui devrait être dans un module, déplacer.
18. Tooling : grep des exports inutilisés (`pnpm knip`), circular deps (`npx madge --circular .`).
19. Bundle : pas d'import lourd qui se propage (ex. importer toute lib lucide-react).
20. Documentation : JSDoc sur APIs publiques non triviales (helpers transverses).

Vérifier anti-patterns README.
```

### 4.1.2 — Outils spécifiques

```bash
pnpm knip                      # exports morts
npx madge --circular .         # circular deps
pnpm audit:lint                # paths référencés dans docs/audit/ existent
pnpm test --run shared         # tests utils + services
```

### 4.1.3 — Definition of done

- [ ] 0 export mort détecté (`pnpm knip`).
- [ ] 0 circular dep (`npx madge --circular .`).
- [ ] Tests utils/services 100% lines.
- [ ] Hooks SRP validés (un hook = un concern).
- [ ] Pas de business logic métier dans `shared/services/`.
- [ ] `pnpm audit:lint` vert.

---

## 4.2 — Audit `app/`

**TLDR** : routing Next.js 16 — async params, PPR, route handlers idempotents.
**Criticité** : 🔴 critical path (route handlers + middleware = sécurité)
**Effort estimé** : ⏱ 3-4h

### 4.2.1 — Prompt

```
Audit app/ (routing Next.js 16.2, layouts, route handlers).

Structure inspectée (groupes réels au 2026-05-10) :
- app/(account)/              # Espace compte (orders, addresses, wishlist...)
- app/(auth)/                 # Connexion, inscription, mot-de-passe, vérification email
- app/(legal)/                # Pages légales (CGV, mentions, RGPD)
- app/(shop)/                 # Storefront public (accueil, produits, collections)
- app/admin/                  # Dashboard admin
- app/api/                    # Routes API (auth, cron, webhooks, search, uploadthing)
- app/paiement/               # Pages paiement (success/cancel/return)
- app/serwist/                # Service Worker PWA
- app/~offline/               # Page offline PWA
- app/sitemap-images.xml/     # Génération sitemap images

Fichiers racine :
- app/layout.tsx              # Root layout (RSC)
- app/global-error.tsx        # Erreur globale (Sentry)
- app/not-found.tsx           # 404 global
- app/opengraph-image.tsx     # OG image dynamique
- app/sitemap.ts              # Sitemap principal
- app/robots.ts               # robots.txt
- app/manifest.ts             # PWA manifest
- app/sw.ts                   # Serwist entrypoint
- app/globals.css             # Tailwind globals

⚠️ Note : pas de `app/middleware.ts` racine présent dans le repo à ce jour. Si l'audit révèle qu'un cas d'usage le nécessite (ex. enforce suspendedAt globalement), créer en P0/P1 selon contexte. Better Auth gère côté handler. <!-- audit-lint-ignore -->

Spécificités :
1. Async APIs Next.js 16 : grep `cookies\(\)` / `headers\(\)` / `params\.` / `searchParams\.` sans `await` → P0 build break.
2. Layouts : RSC par défaut, `"use client"` descendu au plus bas.
3. Boundaries : 1 Suspense par slot dynamique sur page statique (PPR).
4. loading.tsx miroir layout (CLS 0) — sur chaque hub.
5. error.tsx `"use client"` avec reset() + Sentry capture (présent par groupe : (account), (auth), (legal), (shop), admin).
6. global-error.tsx racine avec Sentry tags.
7. not-found.tsx scopé par route (pas seulement global).
8. Metadata : generateMetadata async + parent merger sur chaque page non triviale.
9. JSON-LD enrichi (Organization sur layout root, Product/CollectionPage sur listings/details).
10. Sitemap : génération dynamique (`sitemap.ts` + `sitemap-images.xml/route.ts`), tag sitemap invalidé.
11. Middleware éventuel : matcher minimal (perf), runtime compatible (edge si pas de Prisma), validation suspendedAt user, redirect logic centralisée.
12. Route Handlers (api/) : runtime explicite (`runtime = 'nodejs'` ou `'edge'`), Stripe/Prisma → nodejs OBLIGATOIRE.
13. api/auth : Better Auth handler, await cookies/headers.
14. api/cron : authorization Bearer ${CRON_SECRET} vérifié AVANT logique (cf. modules/cron audit).
15. api/webhooks/stripe : signature verification AVANT JSON.parse (cf. modules/webhooks audit).
16. api/uploadthing : validation server-side (cf. modules/media audit).
17. api/search : rate-limit, query length max, sanitization input.
18. PWA serwist : service worker offline strategy, cache versioning, expiration.
19. CSP / security headers (next.config.ts) : pas de unsafe-inline non justifié, nonce si scripts inline.
20. Internationalisation routing : si i18n actif, segments locale, alternates metadata.
21. Page transitions / View Transitions API natives (Next.js 16 supporté).
22. Pages routes paiement (success/cancel/return) : idempotentes, server-side seul (pas trust client).
23. App-wide error boundary : capture toute erreur non handled.
24. Asset preloading sur layout root (fonts variables) only.
25. Speculation Rules INTERDIT (refus owner).

Vérifier anti-patterns README.
```

### 4.2.2 — Outils spécifiques

```bash
grep -rn "cookies\(\)\." app/ shared/ modules/ | grep -v await   # async API leaks
pnpm typecheck                                                   # build break détection
pnpm e2e --grep @smoke                                           # routing smoke
```

### 4.2.3 — Definition of done

- [ ] 0 accès sync `cookies()` / `headers()` / `params` / `searchParams`.
- [ ] Si middleware présent : testé sécurité (suspendedAt force logout, redirect malicieux bloqué).
- [ ] Route handlers runtime explicite (Stripe/Prisma → nodejs).
- [ ] error.tsx (par groupe) + global-error.tsx + not-found.tsx présents et fonctionnels.
- [ ] Metadata enrichi (canonical, OG, JSON-LD) sur pages non triviales.

---

## 4.3 — Audit `prisma/`

**TLDR** : schéma DB — indexes cohérents, soft-delete uniforme, migrations reversibles.
**Criticité** : 🟡 standard (impact perf + intégrité)
**Effort estimé** : ⏱ 2h

### 4.3.1 — Prompt

```
Audit prisma/ (schéma + migrations + seed).

Spécificités :
1. schema.prisma : indexes (@@index) sur colonnes filtered/sorted/joined dans queries fréquentes. Auditer chaque modèle vs query patterns Prisma identifiés (audit modules/* services/data).
2. Composite unique (@@unique) où combinaison unique business (ex. wishlist (userId, skuId), session (userId, deviceId)).
3. Soft delete uniforme : `deletedAt DateTime?` sur tous modèles concernés (orders, users, addresses, reviews, etc.). Helper `notDeleted` filter cohérent.
4. Timestamps : `createdAt @default(now())`, `updatedAt @updatedAt` sur tous modèles.
5. FK behaviors : `onDelete: Cascade` (junction tables), `Restrict` (référentiels colors/materials/types), `SetNull` (optionnels), `NoAction` (rare). Documenté.
6. Connection pooling Neon : DIRECT_URL (migrations) + DATABASE_URL pooled (runtime). env Zod typée.
7. Migrations : atomiques, reversibles (tester rollback en local), pas de DROP destructif sans plan multi-step (add → backfill → bascule → drop).
8. Naming migrations : `YYYYMMDDHHMMSS_action_descriptif`. Pas de migration générique "update".
9. Seed : `prisma/seed.ts` idempotent (re-run safe), données réalistes pour dev (pas "test123"), respecte FK behaviors.
10. Enums centralisés : ProductStatus, OrderStatus, PaymentStatus, RefundStatus, FulfillmentStatus. Cohérents avec state machines (cf. cross-module audit).
11. Champs dérivés vs calculés : éviter colonne calculée si dérivable (ex. `total` order = sum lines, calculé runtime).
12. Indexes manqués : auditer chaque WHERE / ORDER BY / JOIN dans services/data — colonne indexée ?
13. Champs JSON : typés Zod côté code (pas any sur Prisma JsonValue).
14. Soft delete index : @@index sur deletedAt si filter fréquent (cron cleanup).
15. Index GIN sur tsvector si full-text search produits/collections.
16. Audit log models (OrderAuditLog, etc.) : append-only (pas update), index sur (entityId, createdAt DESC).
17. Retention legal : modèles soumis à 10 ans (factures, orders) — pas de hard-delete possible avant cron retention.
18. Schema documentation : commentaires `///` sur champs non-évidents (`/// Prix HT en centimes EUR`).

Lister :
- Indexes manqués (P1).
- Soft-delete oublié sur modèle concerné (P0 si RGPD).
- FK behavior dangereux (Cascade sur user → orders cascade hard delete = P0).
- Migrations sans rollback testé (P1).
```

### 4.3.2 — Outils spécifiques

```bash
pnpm prisma format                       # validation syntaxe
pnpm prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma  # diff complet
pnpm db:reset                            # rollback test (DEV ONLY)
```

### 4.3.3 — Definition of done

- [ ] Indexes audités vs query patterns réels (table de mapping).
- [ ] Soft delete uniforme (helper appliqué partout).
- [ ] FK behaviors documentés.
- [ ] Migrations testées rollback en local.
- [ ] Seed idempotent.

---

## 4.4 — Audit configs

**TLDR** : `next.config.ts`, `tsconfig.json`, ESLint, Sentry, Vercel, env, `package.json`.
**Criticité** : 🟡 standard (impact build + sécurité)
**Effort estimé** : ⏱ 2h

### 4.4.1 — Prompt

```
Audit configs Synclune (next, ts, eslint, sentry, vercel, env, package).

Spécificités :

# next.config.ts
1. cacheLife profiles définis (checkout / user / catalog / reference) — cohérents avec usage.
2. images.formats : ["image/avif", "image/webp"] activés.
3. images.remotePatterns : restreint aux domaines connus (uploadthing CDN, etc.) — pas de wildcard.
4. headers() : CSP (nonce ou hash si inline JS), HSTS (max-age 1an + includeSubDomains + preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal.
5. experimental flags : seulement ce qui est utilisé (PPR, cacheComponents, etc.) — pas de drift.
6. redirects() / rewrites() : documentés, pas de drift legacy.
7. Sentry config integrée (sentry.client/server/edge.config.ts).
8. Turbopack activé (`pnpm dev`/`pnpm build`).

# tsconfig.json
9. strict: true.
10. noUncheckedIndexedAccess: true (recommandé).
11. exactOptionalPropertyTypes: true (recommandé).
12. verbatimModuleSyntax: true.
13. paths : alias `@/` cohérent.
14. moduleResolution: "Bundler".
15. target: ES2022 ou supérieur.

# ESLint
16. eslint.config.mjs (flat config Next.js 16) : next/core-web-vitals, react-hooks, jsx-a11y, eslint-plugin-react-compiler (React 19), no-unused-vars, import/no-cycle.
17. Règle "no useMemo/useCallback/React.memo" custom (warn ou error).

# Sentry
18. sentry.client.config.ts : tracesSampleRate adapté (0.1-1.0 selon volume), beforeSend filter PII (email/password/token/PAN/IBAN/address/headers cookie+authorization).
19. sentry.server.config.ts : idem + spanFilter si besoin.
20. sentry.edge.config.ts : minimal (middleware).
21. dsn via env var, pas hardcodé.
22. release tag (commit SHA).

# vercel.json
23. crons : 7 jobs alignés avec table CLAUDE.md + paths corrects (cleanup-wishlists, cleanup-sessions, process-account-deletions, sync-async-payments, cleanup-webhook-events, hard-delete-retention, cleanup-orphan-media).
24. headers (si overrides next.config.ts).
25. functions : timeout config si > 60s nécessaire.

# .env.example / env validation Zod
26. Toutes les env vars utilisées sont dans .env.example.
27. Validation Zod côté code (`shared/lib/env.ts` ou équivalent) — éviter env undefined silencieux.
28. Secrets jamais dans .env.example (mettre placeholder `your_secret_here`).
29. NEXT_PUBLIC_ uniquement pour ce qui doit être client-exposé.

# package.json
30. Scripts cohérents (build, start, dev, test, test:critical, test:coverage, lint, typecheck, format, e2e, e2e:ui, size, analyse, seed, db:studio, email:dev, prisma, knip, audit:lint).
31. size-limit : budgets définis pour bundles critiques (storefront, admin).
32. engines : Node version pinned (≥ 20).
33. packageManager : pnpm version pinned.
34. dependencies vs devDependencies : tri correct (eslint, typescript en dev).
35. Pas de dépendance dépréciée (pnpm audit).
36. Pas de dépendance dupliquée (pnpm-lock.yaml propre).

# .gitignore / .gitattributes
37. .env / .env.local / .env.production ignored.
38. node_modules / .next / coverage ignored.
39. *.pem / *.key / secrets ignored.

Lister anti-patterns README + spécifiques au-dessus.
```

### 4.4.2 — Outils spécifiques

```bash
pnpm audit                       # deps vulns
pnpm size                        # budget bundles
pnpm analyse                     # bundle stats
pnpm typecheck                   # ts strict
```

### 4.4.3 — Definition of done

- [ ] CSP sans `unsafe-inline` non justifié.
- [ ] HSTS + headers sécurité présents.
- [ ] tsconfig strict + noUncheckedIndexedAccess.
- [ ] Sentry beforeSend filtre PII vérifié.
- [ ] Env vars typées Zod (validation runtime).
- [ ] vercel.json crons cohérent CLAUDE.md (7 jobs).
- [ ] package.json size-limit défini.

---

## Combinaison

L'audit foundations peut se faire en **4 sessions séparées** (shared/ + app/ + prisma/ + configs) ou **1 session longue** (3-4h cumulés). Préférer 4 sessions pour matière à reposer la session entre.

## Plan d'application post-audit

1. **P0 sécurité** (middleware bypass, CSP unsafe, secret commit) → fix immédiat avant déploiement.
2. **P1 dette** (indexes manqués, types non typés Zod, knip dust) → batch sprint dédié.
3. **P2 polish** (naming, tooling, docs) → opportuniste.
