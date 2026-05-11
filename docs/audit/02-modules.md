---
title: Audits modulaires (22 prompts)
version: 2.0.0
last-reviewed: 2026-05-10
prerequisites:
  - docs/audit/00-standards.md
  - docs/audit/01-conventions.md
  - docs/audit/glossary.md
---

# Audits modulaires

22 prompts auto-suffisants — un par module DDD. Chaque prompt suit un format normalisé.

> **Avant chaque prompt** : la session doit avoir lu `00-standards.md` + `01-conventions.md` + `glossary.md`. Le prompt référence ces fichiers, ne les répète pas.

## Format normalisé

Chaque prompt comporte :

```
**TLDR** : enjeu central en 1 phrase.
**Criticité** : 🟢 simple | 🟡 standard | 🔴 critical path
**Effort estimé** : ⏱ <durée>
**Prérequis** : <fichiers à lire>
**Tests à lancer en fin** : <commandes>

Prompt body (12-20 bullets).

**Definition of done** : critères spécifiques au module.
```

## Sommaire

1. [addresses](#1-modulesaddresses) 🟡
2. [auth](#2-modulesauth) 🔴
3. [cart](#3-modulescart) 🔴
4. [collections](#4-modulescollections) 🟡
5. [colors](#5-modulescolors) 🟢
6. [cron](#6-modulescron) 🟡
7. [dashboard](#7-modulesdashboard) 🟡
8. [discounts](#8-modulesdiscounts) 🔴
9. [emails](#9-modulesemails) 🟡
10. [materials](#10-modulesmaterials) 🟢
11. [media](#11-modulesmedia) 🟡
12. [orders](#12-modulesorders) 🔴
13. [payments](#13-modulespayments) 🔴
14. [product-types](#14-modulesproduct-types) 🟢
15. [products](#15-modulesproducts) 🟡 (gros volume)
16. [refunds](#16-modulesrefunds) 🔴
17. [reviews](#17-modulesreviews) 🟡
18. [skus](#18-modulesskus) 🔴
19. [store-settings](#19-modulesstore-settings) 🟢
20. [users](#20-modulesusers) 🔴
21. [webhooks](#21-moduleswebhooks) 🔴
22. [wishlist](#22-moduleswishlist) 🟡

**Ordre recommandé** : Foundations (`auth` → `users` → `addresses`) → Référentiels (`colors` ‖ `materials` ‖ `product-types` → `collections`) → Catalogue (`skus` → `products` → `media`) → Critical path (`cart` → `discounts` → `payments` → `webhooks` → `orders` → `refunds`) → Périphérie (`reviews` → `wishlist` → `emails` → `cron` → `dashboard` → `store-settings`).

---

### 1. `modules/addresses`

**TLDR** : invariants atomiques (un seul `isDefault` par type) et conformité RGPD/snapshot Order.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 1-2h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/addresses && pnpm typecheck`

```
Audit modules/addresses (CRUD adresses livraison/facturation).

Spécificités :
1. Toggle isDefault : transaction Prisma atomique (un seul default par user × type). Grep séquences `prisma.address.update` non transactionnelles.
2. Snapshot vs FK dans Order : documenter le choix. Si snapshot, dédoublonnage côté UI ; si FK, gestion orphelin sur soft-delete user.
3. Validation Zod : ISO 3166-1 alpha-2, postal code regex par pays (FR/BE/CH/LU/CA min), phone E.164. Pas de duplication avec `shared/schemas/address-schema.ts`.
4. Cache wrapper : `getAddresses` public → `_fetchAddresses` `"use cache: private"` cacheTag `addresses-${userId}` cacheLife `user`.
5. updateTag exhaustif sur create/update/delete (`addresses-${userId}` + tous tags Order si snapshot).
6. RGPD export : adresses incluses dans export complet user.
7. Soft delete + retention 10 ans si rattachée à Order.
8. a11y form : autocomplete browser tokens (`shipping street-address` / `billing postal-code`), enterKeyHint, inputMode.
9. Indexes DB : @@index composite ([userId, isDefault, type]).
10. Server Actions : pattern `requireAuth` + `validateInput` + `handleActionError` strict.
11. Tests : transaction toggle isDefault atomique (concurrent calls), validation pays exotiques.
12. Layering : reads dans data/, query builders dans services/, mutations dans actions/.

Vérifier les anti-patterns du README (sync cookies/headers, `any`, mock DB, etc.).
```

**Definition of done** : tous bullets traités + 0 mutation Prisma non transactionnelle pour isDefault + RGPD export validé.

---

### 2. `modules/auth`

**TLDR** : surface sécurité critique — 0 privilege escalation, 0 open redirect, helpers `requireX` exhaustifs.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 4-6h
**Prérequis** : `00-standards.md`, `01-conventions.md`, `glossary.md`
**Tests à lancer** : `pnpm test:critical && pnpm e2e --grep @critical`

```
Audit modules/auth (Better Auth : email + Google + GitHub).

Spécificités :
1. Async APIs Next.js 16.2 : `await cookies()` partout (handler api/auth/, middleware, callbacks).
2. Middleware matcher minimal (perf), runtime compatible (edge si pas de Prisma).
3. require-auth helpers : 3 fonctions partagent une base privée DRY. Surface API minimale.
4. callbackUrl / redirectTo validation allowlist origin (open redirect = OWASP A01). Tests : `https://evil.com`, `//evil.com`, `javascript:`, encoded chars.
5. OAuth state CSRF : token state vérifié sur callback Google/GitHub, cookie httpOnly + expiry court.
6. Password reset / email verification : tokens single-use, expiration ≤ 1h, rate-limit, hash en DB (jamais le token brut).
7. Session cleanup : cron `cleanup-sessions` purge expirées + révoquées. Index DB `expiresAt`.
8. Account deletion : process-account-deletions cron, RGPD purge cascade (orders soft-delete retention 10 ans, wishlist hard-delete, sessions invalidate, cookies cleared).
9. Sentry beforeSend : filtre password / token / email / IBAN du body events. Vérifier sentry.client.config + sentry.server.config.
10. Logs : aucun mot de passe / token / email brut. Structured JSON.
11. Rate limit : login (5/15min/IP), password-reset (3/h/email), signup (3/h/IP).
12. Cookies : Secure + HttpOnly + SameSite=Lax (Strict pour CSRF), Path scoped.
13. Server Actions login/signup : useActionState (pas useFormState), focus-first-error, redirect() Next post-login.
14. MFA roadmap : si non implémenté, dette P1 sécurité documentée.
15. Tests E2E @critical : login, password reset complet, OAuth callback, account deletion cascade.

Privilege escalation = P0 immédiat. Vérifier qu'AUCUNE action permet USER → ADMIN sans `requireAdmin` (grep `role.*ADMIN` dans actions/).
```

**Definition of done** : 0 vulnérabilité OWASP A01/A07 + 100% Server Actions admin protégées par `requireAdmin` + tests E2E auth verts.

---

### 3. `modules/cart`

**TLDR** : panier critical path — atomicité stock + sync guest↔user + useOptimistic exemplaire.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 3-4h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/cart (panier — critical path).

Spécificités :
1. Cache wrapper strict : `getCart()` lit session → `_fetchCart(userId)` `"use cache: private"` cacheTag `cart-${userId}` cacheLife `checkout`. Aucune lecture cookies/headers ne traverse `"use cache"`.
2. useOptimistic React 19 : add/remove/qty change → React réconcilie automatiquement (pas de "rollback explicite" — c'est implicite). FAB exemplaire à propager.
3. Sync guest ↔ user au login : transaction atomique. Conflit même SKU = max(qty1, qty2) ou somme bornée stock — documenter dans services/.
4. Persistence guest : cookie ou DB ? TTL guest cart (cleanup cron) ?
5. Stock validation : fraîcheur cache 1m/30s vs flash sales. Revalidation forcée checkout via `updateTag('cart-' + userId)` avant payment intent.
6. sku-validation.service.ts (exception documentée) : pure read+throw BusinessError, pas de mutation.
7. Race conditions : 2 onglets dernier exemplaire → un seul gagne. Check-and-set Prisma optimistic (where stock gte qty + decrement).
8. PPR : N/A — l'architecture cart est sheet/drawer global (mounté en layout, pas une route `/panier`). Suspense parent route gère.
9. Server Actions : useActionState add/remove, useFormStatus bouton "Ajouter au panier" pending.
10. a11y : aria-live sr-only pour ajout/suppression, focus management après remove.
11. Mobile : haptic light sur add, medium sur remove, error sur stock épuisé.
12. View Transitions : N/A intra-cart — l'architecture sheet-only n'a pas de morph cross-route. Motion gère l'in-sheet enter/exit via `AnimatePresence`.
13. Tests intégration INTERDIT mocks DB. Cas : add same SKU twice, exceed stock, expired session, guest→user merge, concurrent decrement.
14. Indexes DB : @@index composite ([userId, skuId]) UNIQUE pour upsert atomique.
15. Layering : `services/sku-validation` pur read+throw, jamais de mutation.

pnpm test:critical OBLIGATOIRE en fin.
```

**Definition of done** : 0 race condition stock + sync guest↔user testé + useOptimistic propre.

---

### 4. `modules/collections`

**TLDR** : référentiel cache reference, slugs immuables, JSON-LD enrichi SEO.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 2h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/collections`

```
Audit modules/collections (catégories curated).

Spécificités :
1. Cache reference (7d/24h). updateTag exhaustif sur mutation : `collections-list`, `collection-${slug}`, `products-list`, `product-${slug}` pour produits affectés, sitemap.
2. Slug : génération via `shared/services/unique-name-generator.service.ts`, collisions handled, immuable post-publication (sinon redirect 301 obligatoire).
3. generateStaticParams sur `/collections/[slug]` : précompiler top N collections published.
4. generateMetadata : title/description/OG/canonical par collection, alternates pagination.
5. JSON-LD : `CollectionPage` + `ItemList` enrichi (Product+Offer+aggregateRating si reviews>0).
6. View Transitions : `viewTransitionName: "collection-${slug}"` cohérent home → liste → détail.
7. Soft delete impact : produit dont la dernière collection est soft-deletée → orphelin catalogue ? Fallback "Sans collection" ou exclusion (documenter).
8. DRY storefront vs admin : CollectionCard partagé ou dupliqué (justifier).
9. Sitemap : régénération automatique sur create/update/delete (updateTag('sitemap')).
10. Indexes DB : @@index sur (slug UNIQUE), (isPublished, displayOrder).
11. Server Actions : requireAdmin, validateInput, updateTag exhaustif.
12. Tests : redirect 301 si slug change, ItemList JSON-LD valide schema.org.

Vérifier anti-patterns README + memory feedbacks.
```

**Definition of done** : slug immuable post-publish + JSON-LD valide + 0 orphelin produit.

---

### 5. `modules/colors`

**TLDR** : référentiel simple — isSystem protections, contraste WCAG, FK behavior.
**Criticité** : 🟢 simple
**Effort estimé** : ⏱ 1h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/colors`

```
Audit modules/colors (référentiel couleurs SKU).

Spécificités :
1. Cache reference + cascade tags `skus-list`, `product-${slug}` pour produits utilisant cette couleur.
2. Validation hex : regex strict `^#[0-9a-fA-F]{6}$` (pas short form #fff, pas rgba). Test contraste WCAG AA si swatch sur fond clair/sombre.
3. isSystem : protections delete/edit. Bulk skip + UI badge "Système".
4. Unicité name + code : findFirst + create transactionnels (exception read dans actions/ documentée OK).
5. FK behavior : `onDelete: Restrict` ou soft-delete ? Si Restrict, action lève BusinessError avec liste SKUs bloquants.
6. ColorSwatch shared component : accessible (aria-label="couleur or rose"), focus ring visible, contrast ratio respecté.
7. Form admin : color picker natif + hex input + preview live, validation onChange Zod.
8. DRY référentiels : si pattern identique colors/materials/product-types, candidat helper `referentialCrud<T>()` (cf. cookbook).
9. Indexes DB : @@unique sur (code), @@index sur (isActive).
10. Server Actions : requireAdmin, validateInput, updateTag.
11. Tests : isSystem protection, FK Restrict avec listing bloquants, hex validation edge cases.
12. Layering strict : reads data/, validation services/, mutation actions/.

Vérifier anti-patterns README.
```

**Definition of done** : 0 violation isSystem + contraste WCAG validé + FK behavior testé.

---

### 6. `modules/cron`

**TLDR** : 9 jobs Vercel — withCronGuard 100% + idempotence + DLQ design.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 2-3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/cron`

```
Audit modules/cron (9 jobs Vercel + withCronGuard).

Spécificités :
1. Route handlers `api/cron/*` : runtime node (pas edge — Prisma), `authorization: Bearer ${CRON_SECRET}` vérifié AVANT toute logique.
2. withCronGuard couverture 100% : tags Sentry `cronJob`, fingerprint groupé, `setLevel("error")`, capture metrics counters.
3. Idempotence : re-run ne corrompt pas l'état (UPSERT ou check-then-skip, jamais INSERT aveugle).
4. Batching : MAX_BATCH constant nommé, `take` borné, cursor pagination si volume.
5. Timeout Vercel : 60s default Pro, 300s max. Job > 60s → découper sous-jobs ou stream.
6. Tests __tests__ : couverture par job, edge-cases (DB indispo, batch trop gros, item corrompu skippé pas crash).
7. Sentry latency spans : `Sentry.startSpan` autour chaque job, attributs `processed_count`, `errored_count` (pattern dashboard).
8. Logs structurés JSON : metrics retournées exploitables Vercel logs / Sentry.
9. Schedules vercel.json ↔ table CLAUDE.md cohérente. Pas de drift.
10. DRY : helper `paginateAndProcess(query, batchSize, fn)` mutualisable cleanup-* jobs ?
11. Plan DLQ (gap audit error-handling 2026-05-08 ouvert) : table `WebhookEventFailed` ou flag retry_count, cron `retry-failed-webhooks` exponential backoff, alert admin après MAX_RETRY=3.
12. Type retour standardisé : `interface CronResult { processed: number; errored: number; skipped: number; durationMs: number }`.
13. Layering : services/ purs (logique), lib/ (withCronGuard), api/cron/ (route handler thin).
14. Indexes DB sur colonnes cleanup (createdAt, status, deletedAt selon job).

Identifier candidats E2E (sync-async-payments en P0).
```

**Definition of done** : 100% jobs withCronGuard + plan DLQ explicite + idempotence testée.

---

### 7. `modules/dashboard`

**TLDR** : analytics admin — note récente 9.5/10, viser 9.7+ par streaming + spans Sentry.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 2h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/dashboard`

```
Audit modules/dashboard (admin analytics).

Contexte : audit 2026-05-08 a livré TVA franchise / URSSAF / refundRate / fulfillment-time / reviewHealth split / Sentry spans. Vise 9.7+.

Spécificités :
1. PPR : page = static shell + Suspense par card. Vérifier chaque card a son `<Suspense fallback={<Skeleton/>}>`. Fetchers parallèles (Suspense parallèles, pas Promise.all).
2. Cache tags granulaires : `dashboard-stats-vat`, `dashboard-stats-revenue`, `dashboard-stats-orders`. updateTag webhook ne casse pas toutes les cards.
3. Services purs testés : URSSAF rollover trimestres (4 cas limites), TVA art. 293 B (seuil + tolérance), fulfillment-time percentiles (pas moyenne, p50/p95).
4. Date.now() injecté en argument services purs (testabilité) — fake timers Vitest.
5. Loading skeleton miroir layout exact (CLS 0).
6. Mobile : Recharts responsive, tooltip touch-friendly, légende collapse.
7. Types orphelins / cache tags morts : audit a nettoyé, vérifier régression.
8. Role-based filtering : si multi-admin, scope par rôle.
9. Export CSV : si présent, encoding UTF-8 BOM, séparateur `;` (Excel FR), escape quotes.
10. Conformité fiscale (TVA 37 500 €, URSSAF échéances) : env vars typées Zod.
11. Sentry latency spans : `Sentry.startSpan` sur 5 fetchers principaux.
12. Layering : data/ pour fetchers cachés, services/ pour calculs purs.
13. Tests edge cases : 0 commande, 1 commande, masse, données corrompues.

Rapport ciblé sur nouveautés depuis 2026-05-08 (pas duplication audit).
```

**Definition of done** : Suspense parallèles confirmés + tests rollover URSSAF/TVA verts + spans Sentry.

---

### 8. `modules/discounts`

**TLDR** : pricing engine pur testé + atomicité usage limit + sécurité financière.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/discounts (codes promo — critical path).

Spécificités :
1. Pricing engine pur services/ : zéro I/O, ordre d'application déterministe documenté (% → fixe → free shipping → BoGo si présent), tests exhaustifs branches.
2. Atomicité usage limit : `prisma.$transaction([incrementUsage, applyToOrder])` ou row lock pessimiste. Race 2 users dernier code → un seul gagne.
3. Validation dates : start ≤ now ≤ end vérifié serveur ET DB (CHECK constraint Prisma idéal).
4. order-creation.service.ts (exception documentée) : transaction stock + order + discount usage atomique, rollback complet sur Stripe error.
5. Bulk actions admin : skip si déjà utilisé (préserve audit trail), code unique sensible casse à documenter.
6. Server Actions : useActionState, optimistic update FAB-style.
7. Sécurité : code non-énumérable (secure random crypto, pas séquentiel), rate-limit apply-discount (5 essais/min/IP).
8. Tests critical : pricing branches + race usage limit + expiration boundary.
9. Indexes DB : @@unique (code), @@index (isActive, endsAt).
10. Layering : services/ pricing engine pur + tests exhaustifs.
11. Conformité affichage prix barré (loi consommateur FR : prix de référence justifié).
12. View Transitions sur application discount : feedback visuel.
13. a11y : aria-live success/error sur apply, message d'erreur précis (code expiré vs invalide).

Sécurité financière P0 immédiat.
```

**Definition of done** : pricing engine 100% covert + 0 race condition usage limit + rate-limit testé.

---

### 9. `modules/emails`

**TLDR** : 33 templates DRY + Sentry tracking failures + deliverability.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm email:dev` (vérifier warnings)

```
Audit modules/emails (33 templates React Email + Resend).

Spécificités :
1. Composants partagés : Header / Footer / Button / Section / Heading mutualisés `emails/components/`. Si templates dupliquent 50 lignes header → DRY P1.
2. Props typées Zod : chaque template a un schema, validation server-side avant `render()`. Pas d'`any`.
3. i18n : strings français centralisés (`modules/emails/constants/email.constants.ts`) ou inline ? Si inline, plan migration.
4. Preview pnpm email:dev : 14/14 fonctionnels, données de preview réalistes (pas "John Doe").
5. Sentry tracking Resend failures (gap P1#4 audit error-handling 2026-05-08) : wrapper `sendEmail()` try/catch + Sentry tags `emailTemplate`, `recipient` (hashed), `resendId`.
6. Idempotence : email envoyé 1×/event (idempotency Resend ou flag DB `emailSentAt`).
7. a11y email : alt text toutes images, fallback texte plein, role="presentation" tables layout, contraste WCAG AA, dark mode `<meta name="color-scheme" content="light dark">`.
8. Liens : tous absolus (pas relatifs), tracking UTM cohérents, unsubscribe présent (RGPD + CAN-SPAM).
9. Deliverability : domaine vérifié (DKIM/SPF/DMARC), from cohérent shared/lib/email-config, list-unsubscribe header (one-click).
10. Templates critiques P0 : payment-failed, refund-confirmed, password-reset, order-confirmation. Snapshot tests rendering.
11. shared/lib/email-config.ts : domaines from/replyTo, test/prod, env validation Zod.
12. Layering : services/ pour send (transactionnel partagé), templates dans `emails/`.
13. Conformité RGPD : opt-out one-click, mention légale obligatoire footer.

Lance pnpm email:dev et identifie warnings console.
```

**Definition of done** : 33/33 previews OK + Sentry wrapper sendEmail + DKIM/SPF/DMARC vérifiés.

---

### 10. `modules/materials`

**TLDR** : référentiel matériaux miroir colors avec champs métier (carat, certification).
**Criticité** : 🟢 simple
**Effort estimé** : ⏱ 1h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/materials`

```
Audit modules/materials (référentiel matériaux SKU).

Spécificités (miroir colors avec champs propres) :
1. Cache reference + cascade `skus-list`, `product-${slug}`.
2. Champs métier : titre (ex. "Or 18 carats"), pureté (carat 9/14/18/24), hypoallergénique bool, certification (RJC/Fairmined ?), origine. Validation Zod stricte (enum carat).
3. isSystem + bulk skip + UI badge.
4. Unicité name + code (transaction findFirst + create exception OK).
5. FK behavior Restrict avec listing SKUs bloquants dans BusinessError.
6. Affichage storefront : tooltip "qu'est-ce que l'or 18k ?" — composant partagé MaterialBadge.
7. DRY colors / product-types : factoriser `referentialCrud<T>` si 80% dupliqué (cf. cookbook).
8. Indexes DB : @@unique (slug), @@index (isActive).
9. Server Actions : requireAdmin, validateInput, updateTag.
10. Tests : carat enum validation, FK Restrict, isSystem.
11. Layering strict : reads data/, validation services/, mutation actions/.
12. Pricing impact : si matériau "or 24k" → multiplicateur prix ? Documenter.

Vérifier anti-patterns README.
```

**Definition of done** : champs métier validés Zod + factorisation `referentialCrud` évaluée + FK Restrict testé.

---

### 11. `modules/media`

**TLDR** : UploadThing sécurisé + EXIF stripping + lightbox lazy + cleanup orphan robuste.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/media`

```
Audit modules/media (UploadThing + cleanup orphan + lightbox).

Spécificités :
1. UploadThing route : runtime node, validation server-side (size, MIME allowlist, dimensions min/max via sharp), bypass client impossible.
2. Sécurité upload : pas de filename user en path (sanitize), URL signing si privé, expiry, anti-hotlinking referrer check.
3. EXIF stripping : retirer GPS/PII (sharp `withMetadata({})` ou pipeline dédié) — RGPD.
4. Variants responsive : sizes prop Image cohérent grille (audit admin lists 2026-05-08 a touché 3 fichiers).
5. next/image priority : LCP only, jamais below-the-fold.
6. placeholder="blur" + blurDataURL généré upload-time (pas runtime).
7. Lightbox : `next/dynamic` + `ssr:false` (lourd, client-only), Suspense fallback léger, focus trap, ESC, swipe haptic mobile.
8. DnD upload reorder : transaction Prisma atomique sur `displayOrder`, rollback sur error.
9. Cleanup orphan media cron : grace period (48h) éviter delete sur upload en cours, filtre soft-deleted parent + grace.
10. CDN : invalidation cache après replace (purge URL ou versionnage `?v=hash`).
11. Tests : upload limites (1MB sous/pile/+1, 100MB), MIME spoofing (rename .exe en .jpg → reject), reorder concurrent.
12. RGPD : EXIF strip documenté + hash filename anti-fingerprinting.
13. Layering : services/ pour traitement sharp, actions/ pour mutations DB, lib/ pour UploadThing config.
14. Indexes DB : @@index sur (parentId, displayOrder), (deletedAt) pour cron.
15. a11y lightbox : focus trap Radix natif ou implémenté, aria-label, ESC, navigation flèches.

Vérifier anti-patterns README.
```

**Definition of done** : EXIF strip vérifié + MIME spoofing rejette + lightbox a11y validé.

---

### 12. `modules/orders`

**TLDR** : state machine orders × payment × fulfillment, audit log exhaustif, conformité facture FR.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 4-5h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/orders (commandes — critical path).

Spécificités :
1. State machine OrderStatus × PaymentStatus × FulfillmentStatus : `services/order-status-validation.service.ts` `canTransition(from, to)` pure fn, tests matrice complète.
2. buildOrderWhereClause services/ : DRY storefront vs admin, tests params combinés (search + filters + soft-delete + userId scope).
3. OrderAuditLog : entrées sur TOUTES transitions (paid, failed, cancelled, shipped, delivered, returned). Audit 2026-04-18 a livré 3 webhook handlers, vérifier complétude.
4. Bulk cancel PENDING/UNPAID (audit comfort 2026-05-08) : transaction atomique restore stock + cancel + email + audit log + Stripe cancel PI.
5. Cache user 2m/1m + tag `orders-list` + `order-${id}`. Webhook update → updateTag cohérent cross-module.
6. Detail page admin : 3 status badges per-id viewTransitionName (audit mobile 2026-05-08 livré).
7. Numérotation factures FR séquentielle, immuable, sans trou (loi anti-fraude TVA). Format `FAC-YYYY-NNNNNN`. Lock atomique counter (transaction + advisory lock Postgres si volume).
8. PDF facture : génération on-demand (pas stockage), nom `facture-${number}.pdf`, header X-Frame-Options DENY.
9. Tracking number : validation format par carrier (Colissimo/UPS/DHL regex), webhook update auto via API carrier ?
10. Server Actions : useActionState, useOptimistic sur status update admin, useFormStatus.
11. Tests intégration INTERDIT mocks DB. Cancel après PAID = refund flow ? Ship sans tracking = warning ?
12. Indexes DB : composite (userId, status, createdAt DESC) listing user, (status, createdAt DESC) admin.
13. Layering : state machine pure services/, query builders services/, mutations actions/.
14. Webhook idempotence : updates orders depuis webhooks Stripe (cf. modules/webhooks).
15. Conformité droit rétractation 14j : tracking dans audit log.

Critical path P0.
```

**Definition of done** : state machine 100% covert + numérotation factures atomique + audit log exhaustif.

---

### 13. `modules/payments`

**TLDR** : Stripe — idempotency keys déterministes, SCA/3DS2, classifyStripeError exhaustif, DLQ async.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 4h
**Prérequis** : `00-standards.md`, `01-conventions.md`, `glossary.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/payments (Stripe — critical path).

Spécificités :
1. Services transactionnels documentés : `stripe-customer.service.ts` (paire atomique Stripe+DB), `order-creation.service.ts` (stock+order+discount). Justification toujours valide ?
2. Idempotency keys Stripe déterministes (`order-${orderId}-pi`, `refund-${refundId}`), pas UUID random.
3. Webhook signature verification : `stripe.webhooks.constructEvent` avec raw body. Next.js 16.2 : `await req.text()` AVANT JSON.parse.
4. 5min replay window : event timestamp check.
5. classifyStripeError couverture exhaustive codes (card_declined sub-codes, authentication_required, processing_error, insufficient_funds, generic_decline, fraudulent, lost_card, stolen_card). Gap audit error-handling 2026-05-08 (0 test E2E payment_failed).
6. SCA / 3DS2 / PSD2 : authentication_required handled, redirect/return_url corrects, paymentIntent status `requires_action` géré.
7. Async payment sync cron : robustesse retry, exponential backoff, DLQ design.
8. Refund processing : Stripe individuel post bulk-approve PENDING→APPROVED (audit comfort).
9. Server Actions checkout : useActionState, redirect Stripe via `redirect()` Next ou client `loadStripe()`.
10. Edge cases : 3DS auth required, async payment (SEPA debit pending → succeeded h+J), partial refund, dispute, chargeback.
11. Tests : pas mocks DB, mocks Stripe SDK only. Fixture events Stripe versionnés (stripe-mock).
12. Sécurité : pas de PI client_secret en cache server, scope strict aux IDs user, webhook secret rotation testée.
13. Logs : aucun PAN, aucun CVC, aucun PI client_secret. Stripe IDs OK.
14. API version Stripe pinned : éviter drift sur webhooks.
15. Layering : services/ transactionnels documentés, actions/ checkout, lib/ stripe client.

Sécurité financière P0 immédiat.
```

**Definition of done** : classifyStripeError 100% couvert + SCA/3DS2 testé + 0 PII Stripe dans logs.

---

### 14. `modules/product-types`

**TLDR** : référentiel type produit avec attributs polymorphes (size scale par type).
**Criticité** : 🟢 simple
**Effort estimé** : ⏱ 1h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/product-types`

```
Audit modules/product-types (catégorie produit : bague, collier, etc.).

Spécificités :
1. isSystem protections strictes (audit comfort 2026-05-08) : delete/rename/bulk impossibles, UI badge, tests business rules.
2. Schema attributs par type : ring (size scale EU/US/UK/JP), necklace (length cm), earring (back type) — extensibilité via JSON schema typé Zod ou table polymorphe ? Documenter le choix.
3. Cache reference + cascade `products-list`, `product-${slug}`.
4. FK behavior Restrict avec listing produits bloquants.
5. Couplage SKU variants : size scale dépend du type → `getSizesForProductType(typeId)` testable, pure.
6. DRY référentiels : si pattern identique colors/materials/product-types, extraire `referentialCrud<T>()`.
7. Indexes DB : @@unique (slug), @@index (isActive).
8. Server Actions : requireAdmin, validateInput, updateTag.
9. Tests : isSystem protection, FK Restrict, attributs par type valides.
10. Layering strict : reads data/, validation + buildSizeScale services/, mutation actions/.
11. Naming : `ProductTypeAttributes` discriminated union (par type).
12. View Transitions : `viewTransitionName: "product-type-${slug}"` admin listing → détail.

Vérifier anti-patterns README.
```

**Definition of done** : isSystem testé + size scale par type valide + DRY référentiels évalué.

---

### 15. `modules/products`

**TLDR** : module le plus large — 6 sous-sections (listing/detail/forms/bulk/state machine/recherche).
**Criticité** : 🟡 standard (mais gros volume)
**Effort estimé** : ⏱ 6-8h
**Prérequis** : `00-standards.md`, `01-conventions.md`, `glossary.md`
**Tests à lancer** : `pnpm test --run modules/products && pnpm typecheck`

```
Audit modules/products (catalogue — module le plus large).

Découper rapport en sous-sections :

(A) Listing :
1. PPR : shell statique + Suspense par bloc (filters / liste / pagination). Streaming parallèle (pas Promise.all).
2. buildProductWhereClause + buildProductOrderBy services/ : DRY storefront vs admin, tests params combinés.
3. N+1 Prisma : `select` granulaire (pas `include` qui ramène toutes relations), images sub-select limit 1 (cover only).
4. Pagination cursor > offset (perf > 10k produits).
5. Cache catalog 15m/5m + tags `products-list`, `products-list-${collectionSlug}` granulaire.
6. Image sizes responsive cohérent grille (1col mobile, 2col tablet, 3-4col desktop).
7. Indexes DB : composite (status, publishedAt DESC), (collectionId, status), GIN sur tsvector si full-text search.

(B) Detail `/produits/[slug]` :
8. generateStaticParams : top N produits ACTIVE précompilés.
9. generateMetadata : title/desc/OG par produit, JSON-LD `Product+Offer+aggregateRating`.
10. MediaLightbox dynamic + Suspense (audit detail 2026-05-08 livré).
11. ProductDescriptionCollapse : ResizeObserver + line-clamp.
12. View Transitions : `viewTransitionName: "product-${slug}"` cohérent.

(C) Forms create/edit (audit mobile 2026-05-08 P1 livré) :
13. TanStack Form + useAppForm, validation Zod onChange.
14. AdminFormFooter sticky + sr-only aria-live.
15. DnD media reorder atomique.

(D) Bulk admin (audit comfort 2026-05-08) :
16. Business rules : ≥1 SKU active pour ACTIVE, isDefault SKU protection.
17. Transaction atomique multi-update.

(E) State machine :
18. ProductStatus (DRAFT/ACTIVE/ARCHIVED) `canTransition(from, to)` pure fn testée.

(F) Recherche :
19. pg_trgm / tsvector si full-text, fallback ILIKE multi-colonnes.
20. Couplage fuzzy-search (memory audit 2026-05-08 P1 livré).

Module riche : 30+ findings attendus. Rapport en sous-sections.
```

**Definition of done** : 6 sous-sections traitées + state machine 100% covert + N+1 audit clean.

---

### 16. `modules/refunds`

**TLDR** : remboursements critical path — state machine, bulk approve atomique, conformité 14j.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/refunds (remboursements — critical path).

Spécificités :
1. State machine RefundStatus (PENDING/APPROVED/PROCESSING/COMPLETED/FAILED/REJECTED) `canTransition` pure testée.
2. Bulk approve PENDING→APPROVED (audit comfort 2026-05-08) atomique, processing Stripe individuel post-approval.
3. Webhook charge.refunded : idempotence (WebhookEvent), update atomique PaymentStatus + RefundStatus + email + audit log.
4. Email refund-approved + refund-confirmed + admin refund-failed.
5. Audit log : qui approve/reject + raison + timestamp + amount.
6. Validation montant : ≤ amount payment, partiel autorisé, multi-refund cumul ≤ payment.
7. Stripe error handling : classifyStripeError, retry exponential, DLQ après MAX_RETRY (gap P0#1 audit error-handling 2026-05-08).
8. Cache invalidation : `refunds-list`, `refund-${id}`, `order-${orderId}`.
9. Conformité droit rétractation 14j FR : tracking délai dans audit log, alert admin si > 14j.
10. Tests INTERDIT mocks DB. Concurrent approve même refund, partial cumul dépassement, Stripe error post-approval.
11. Indexes DB : @@index (status, createdAt DESC), (orderId).
12. Server Actions : useActionState, useFormStatus, requireAdmin.
13. Layering : state machine pure services/, mutations actions/, transactionnels webhook handlers/.
14. Sécurité financière : pas de modification montant après APPROVED.

Critical path P0. Sécurité financière.
```

**Definition of done** : state machine 100% covert + bulk approve atomique testé + 14j conformité tracée.

---

### 17. `modules/reviews`

**TLDR** : avis clients — modération anti-spam, aggregate rating atomique, JSON-LD enrichi.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 2h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/reviews`

```
Audit modules/reviews (avis clients).

Spécificités :
1. send-review-request-email.service.ts (exception documentée : cron + webhooks + actions). Pure si possible, idempotent (flag `reviewRequestSentAt`).
2. Modération : workflow PENDING/APPROVED/REJECTED, anti-spam (rate-limit per user 1/produit/30j, longueur min/max, pattern blacklist).
3. Aggregate rating : recalcul atomique sur mutation (`prisma.$transaction` ou raw SQL `UPDATE product SET avg = (SELECT AVG ...)`). Cache `reviewHealth` split (dashboard audit 2026-05-08).
4. Cache : `reviews-${productId}` + invalidation `product-${slug}` sur new review approved (rating change).
5. Storefront affichage : pagination, filtres rating star, photos lightbox, "useful" votes ?
6. Photo modération : NSFW detection (service externe ou ML local ?), EXIF strip auto.
7. Bulk approve admin (audit comfort 2026-05-08).
8. JSON-LD aggregateRating dans Product schema (memory landing-page audit 2026-05-09 livré).
9. RGPD : suppression review sur account deletion (anonymise ou hard-delete ? trade-off transparence vs droit oubli — documenter).
10. Tests : aggregate recalc edge cases (0/1/masse reviews), modération workflow, rate-limit par user.
11. Indexes DB : (productId, status, createdAt DESC), (userId).
12. Layering : aggregate compute services/, mutations actions/, send email transactionnel partagé services/.
13. a11y : aria-label "noté X étoiles sur 5", `<form>` semantic.
14. View Transitions sur post review : feedback fluide.

Vérifier anti-patterns README.
```

**Definition of done** : modération anti-spam testée + aggregate atomique + JSON-LD valide.

---

### 18. `modules/skus`

**TLDR** : variants stock authoritatif — atomicité décrément, isDefault unique, tests concurrent.
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/skus (variants — stock authoritatif).

Spécificités :
1. isDefault flag : un seul par product, transaction atomique (UPDATE WHERE productId AND isDefault SET false, INSERT new default).
2. Stock counter atomique : `prisma.sku.update({ where: { id, stock: { gte: qty }}, data: { stock: { decrement: qty }}})` (check-and-set Prisma optimistic), pas de read-then-write.
3. order-creation.service.ts (exception documentée) : transaction stock lock + order, rollback si Stripe échoue.
4. Code unicité : génération via `shared/services/unique-name-generator.service.ts` (color-material-size pattern), validation regex.
5. Bulk actions admin (audit comfort 2026-05-08) : skip isDefault + skip si product passerait sous ≥1 active SKU.
6. Forms create/edit (audit mobile 2026-05-08 P1 livré).
7. buildVariantLabel pure : `color · material · size` filter null (audit detail livré).
8. Cache invalidation : `product-${slug}` + `products-list` + `skus-list`.
9. sku-validation.service.ts (exception documentée) : pure read+throw BusinessError.
10. Tests : concurrent decrement (2 commandes même dernier exemplaire → 1 seule passe), isDefault toggle race, restock + notify back-in-stock.
11. Indexes DB : (productId, isDefault), (productId, status), @@unique (code).
12. Layering : validation + buildVariantLabel services/ purs, mutations actions/.
13. Notify back-in-stock service (modules/wishlist/services exception documentée) : déclenché post-restock.
14. State machine : sku status (active/inactive/sold-out), `canTransition` pure.
15. Conformité affichage : prix barré si compareAtPrice, stock visible "Plus que X".

Module sensible (stock = revenu). Critical path P0.
```

**Definition of done** : 0 race condition stock + isDefault testé + concurrent decrement vert.

---

### 19. `modules/store-settings`

**TLDR** : config boutique singleton — note 9.6 récente, focus métier (pas mobile).
**Criticité** : 🟢 simple
**Effort estimé** : ⏱ 1-2h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/store-settings`

```
Audit modules/store-settings (config boutique : ouverture/fermeture/horaires).

Contexte : audit mobile 2026-05-08 a livré P0+P1+P2 (note 9.6/10). Focus métier ici (pas mobile).

Spécificités :
1. Cache reference (config quasi-statique) + invalidation `store-settings` global tag → cascade storefront banner / blocage checkout.
2. Close-store impact storefront : middleware ou layout boutique check `isStoreOpen()` → banner "Fermé temporairement" + blocage Server Actions add-to-cart/checkout (early return BusinessError).
3. Reopen scheduling : `reopensAt` validation (≥ now), cron `reopen-store` réveille auto à l'heure ou check à chaque request ?
4. closedBy traçabilité : userId snapshot (string, pas FK — survit suppression admin), retention 10 ans (legal).
5. Forms close-store / sub-forms : audit mobile a migré vers AdminFormFooter, vérifier régression.
6. Emails clients : si commande PENDING au moment fermeture → email d'info ?
7. Singleton pattern : un seul row store-settings (id fixe ou enforce check-and-create) ?
8. Tests : 141/141 passent + edge cases reopen passé (auto-reopen ? force admin ?).
9. Server Actions : requireAdmin, validateInput, updateTag.
10. Layering : services/ pour `isStoreOpen()` pure (param: settings, now), middleware appel.
11. Conformité : si fermé, panier en cours doit afficher message clair (UX + légal).
12. View Transitions sur status change.

Rapport ciblé métier, pas mobile.
```

**Definition of done** : isStoreOpen testée pure + middleware blocage testé + cron reopen documenté.

---

### 20. `modules/users`

**TLDR** : gestion users admin — privilege escalation P0, ≥1 admin guard, RGPD export complet.
**Criticité** : 🔴 critical path (sécurité)
**Effort estimé** : ⏱ 3h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test:critical`

```
Audit modules/users (gestion utilisateurs admin).

Spécificités :
1. Bulk role change USER↔ADMIN (audit comfort 2026-05-08) : self-skip, ≥1 admin guard atomique (transaction count + update), audit log entry.
2. Privilege escalation P0 : aucune Server Action ne doit permettre USER → ADMIN sans `requireAdmin()`. Audit grep `role.*ADMIN` dans actions/ (audit transversal aussi).
3. Soft delete + cron `process-account-deletions` grace period 30j (RGPD), purge cascade.
4. Suspension flag : impact session (force logout au prochain request via middleware), middleware check `if (user.suspended) redirect('/suspended')`.
5. Cache user 2m/1m + tag `users-list`, `user-${id}`.
6. Server Actions : `requireAdminWithUser()` (récupère user pour audit log), validation Zod stricte.
7. RGPD export : tous modules cohérent (orders, addresses, reviews, wishlist, cart, sessions). Format JSON + ZIP. Rate-limit 1 export / 24h / user.
8. 2FA roadmap : si non implémenté, dette P1 sécurité documentée.
9. Recherche admin : index DB sur email/name (Prisma `@@index`), fuzzy-search couplage (memory audit 2026-05-08 P1 livré).
10. Tests : privilege escalation, demote dernier admin (doit fail), self-suspend (doit fail), account deletion cascade.
11. Indexes DB : @@unique (email), @@index (role, suspendedAt, deletedAt).
12. Layering : services/ pour validation business rules (≥1 admin), actions/ mutations.
13. Sécurité : rate-limit role change (5/h/admin), pas de mass change (limite batch 50).
14. Conformité RGPD : export DOIT être complet (pas juste profile, tous les modules).

Sécurité P0 immédiat.
```

**Definition of done** : 0 privilege escalation possible + ≥1 admin guard testé + RGPD export complet validé.

---

### 21. `modules/webhooks`

**TLDR** : Stripe webhooks — idempotence, eventual consistency, DLQ design (gap ouvert).
**Criticité** : 🔴 critical path
**Effort estimé** : ⏱ 3-4h
**Prérequis** : `00-standards.md`, `01-conventions.md`, `glossary.md`
**Tests à lancer** : `pnpm test --run modules/webhooks`

```
Audit modules/webhooks (Stripe webhooks).

Contexte : audit error-handling 2026-05-08 a livré `capture-webhook-error.ts` + 13 handlers wrappés. Gap P0#1 DLQ encore ouvert.

Spécificités :
1. Route handler `api/webhooks/stripe` : runtime node (Stripe SDK), `await req.text()` AVANT verify (raw body), `stripe.webhooks.constructEvent` avec STRIPE_WEBHOOK_SECRET.
2. Idempotency : `WebhookEvent` table avec `stripeEventId UNIQUE`, INSERT avant traitement, skip si exists.
3. 5min replay window : `event.created` check.
4. Eventual consistency : Stripe peut envoyer events hors ordre. Handlers tolérants (ex. refund.created peut arriver avant charge.refunded).
5. capture-webhook-error.ts couverture 100% handlers (payment 4 + refund 3 + dispute 2 + checkout 2 + async 2). Nouveaux handlers ajoutés depuis audit ?
6. DLQ design (gap ouvert) : table `WebhookEventFailed` ou flag `WebhookEvent.status='FAILED'` + retry counter, cron `retry-failed-webhooks` exponential backoff, alert admin après MAX_RETRY (3 ?). PLAN D'ATTAQUE DÉTAILLÉ ATTENDU.
7. Exception services/ documentée : logique transactionnelle complète (read + mutation atomique). Justifier handler par handler.
8. handleInvoicePaymentFailed + 2 dispute handlers : try/catch ajouté audit 2026-05-08, encore en place ?
9. cleanup-webhook-events cron : retention adéquate (90j ? 1an ?), index sur createdAt + status.
10. Sentry : tags `webhookHandler`, `eventType`, fingerprint groupé, contexte business (orderId/PI/refundId/disputeId).
11. Tests : 309 passent + edge cases (signature invalide → 400, replay → 200 idempotent, payload malformé → 400 + Sentry, handler unknown → 200 ack avec warning).
12. Sécurité : webhook secret rotation testée, pas de log payload brut (PII Stripe), no PAN.
13. API version Stripe pinned : compatible SDK installé.
14. Layering : exception services/ documentée (transactionnel), handlers/ thin dispatchers, lib/ Stripe client.
15. Cross-module : updateTag exhaustif vers orders/payments/refunds (cf. audit transversal).

Sécurité P0. Plan DLQ explicite ATTENDU.
```

**Definition of done** : 100% handlers wrapped + DLQ plan livré + signature verification testée.

---

### 22. `modules/wishlist`

**TLDR** : favoris + back-in-stock notify — useOptimistic, idempotence notification.
**Criticité** : 🟡 standard
**Effort estimé** : ⏱ 1.5h
**Prérequis** : `00-standards.md`, `01-conventions.md`
**Tests à lancer** : `pnpm test --run modules/wishlist`

```
Audit modules/wishlist (favoris + back-in-stock notify).

Spécificités :
1. notify-back-in-stock.ts (exception documentée) : notification atomique post-restock, idempotent (`notifiedAt` flag), email batché si masse.
2. Cleanup wishlists cron (daily 2:30) : items orphelins (produit hard-deleted, user soft-deleted post-grace), retention.
3. Cache wrapper : `getWishlist()` public → `_fetchWishlist(userId)` `"use cache: private"` cacheTag `wishlist-${userId}` cacheLife `user`.
4. useOptimistic React 19 : add/remove → React réconcilie automatiquement (FAB exemplaire — memory feedback à propager).
5. Couplage cart : "ajouter au panier depuis wishlist" atomique (transaction add-to-cart + remove-from-wishlist optionnel).
6. RGPD : purge sur account deletion.
7. Server Actions : useActionState, useFormStatus, withViewTransition sur navigation.
8. Tests : race condition restock + notify (1 user notifié 1 fois), concurrent add/remove same item.
9. Hooks client : pas de useMemo/useCallback (React 19).
10. Sécurité : add-to-wishlist rate-limit (10/min/user) anti-spam.
11. Indexes DB : @@unique (userId, skuId), @@index (skuId) pour notify-back-in-stock query.
12. Layering : services/ pour notify-back-in-stock transactionnel, actions/ pour CRUD.
13. a11y : aria-label heart "Ajouter aux favoris" / "Retirer des favoris", aria-pressed.
14. View Transitions : `viewTransitionName: "wishlist-item-${skuId}"`.

Plan de propagation pattern useOptimistic sur cart à proposer.
```

**Definition of done** : useOptimistic propre + idempotence notify testée + 0 régression cron.

---

## Annexe : commandes utiles

```bash
# Type safety + lint
pnpm typecheck
pnpm lint
pnpm format:check

# Tests scope
pnpm test --run modules/<nom>

# Critical path (cart/orders/payments/webhooks/auth/discounts/refunds)
pnpm test:critical

# E2E
pnpm e2e --grep @smoke
pnpm e2e --grep @critical

# Bundle
pnpm size
pnpm analyse

# Email preview
pnpm email:dev

# DB
pnpm prisma migrate dev --name <descriptif>
pnpm prisma migrate diff
pnpm db:studio
pnpm seed
```

## Note finale par module

Chaque audit doit produire une note avant/après sur 10 selon les axes du [README](./README.md#definition-of-done-universelle-pour-chaque-audit). Documenter dans le rapport final.
