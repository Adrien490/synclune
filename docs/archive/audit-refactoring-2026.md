# Audit Refactoring 2026 — Synclune

**Date** : 2026-04-19
**Contexte** : Synclune est une petite boutique de bijoux artisanaux (solo créateur) avec ~50–100 produits et 20–30 commandes/mois. L'audit ci-dessous identifie la sur-ingénierie relative à cette échelle et propose une trajectoire de simplification production-ready.

---

## 1. Conformité actuelle au besoin : **4/10**

| Axe                           | Note     | Commentaire                             |
| ----------------------------- | -------- | --------------------------------------- |
| Qualité code & UX storefront  | **9/10** | Excellent — c'est l'actif différenciant |
| Fit-for-purpose (≈1 cmd/jour) | **3/10** | Stack enterprise pour un solo           |
| Maintenabilité long terme     | **4/10** | 26 modules à surveiller                 |
| Coût infra mensuel            | **5/10** | Crons Vercel + 3 SaaS observabilité     |
| Vitesse d'évolution future    | **4/10** | Chaque refactor touche 10 modules       |
| **Global vs besoin**          | **4/10** | Sur-ingénierie systémique               |

**Lecture** : la qualité pure du code reste excellente (≈9/10). C'est l'**adéquation au besoin réel** qui est basse — l'app résout des problèmes qu'une boutique de 20–30 cmd/mois n'a pas.

---

## 2. Surface actuelle (état des lieux — chiffres vérifiés 2026-04-19)

| Dimension                       | Valeur                                                                                              | Source                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Modules DDD                     | **26**                                                                                              | `modules/*/`                                      |
| Fichiers modules (hors tests)   | **~1 617**                                                                                          | `find modules -type f -not -path '*__tests__*'`   |
| Fichiers tests modules          | **1 060**                                                                                           | `find modules -path '*__tests__*'`                |
| LOC modules (hors tests)        | **~139 613**                                                                                        | `wc -l`                                           |
| Templates emails                | **33**                                                                                              | `emails/*.tsx`                                    |
| Cron jobs Vercel                | **15**                                                                                              | `vercel.json`                                     |
| Routes admin top-level          | **7** (dashboard, catalogue, ventes, contenu, marketing, clients, configuration) + ~100 sous-routes | `app/admin/*`                                     |
| Couches d'observabilité actives | **5** (Sentry server + Sentry client + `@vercel/otel` + PostHog + web-vitals + Vercel Analytics)    | `instrumentation.ts`, `instrumentation-client.ts` |
| Profils de cache                | **10**                                                                                              | `next.config.ts:120-131`                          |
| Fichiers de tests unitaires     | **1 519**                                                                                           | `**/__tests__/*.test.*`                           |
| Specs E2E Playwright            | **75**                                                                                              | `e2e/**/*.spec.ts`                                |

> **Note** : le chiffre ~334 000 LOC app annoncé en v1 agrégeait `app/` + `shared/` + `modules/` + vendor généré. Le chiffre à suivre pour la dette de code effective est **~139 613 LOC modules** + shared (à mesurer). Pour le bundle client, se référer à `pnpm size`.

---

## 3. Sur-ingénierie identifiée

### 3.1 Modules candidats à suppression / simplification

Chiffres vérifiés (fichiers hors `__tests__`, LOC hors tests). La colonne **Imports entrants** compte les occurrences de `from "@/modules/<m>"` hors du module lui-même et sert d'indicateur de ramification à traiter.

| Module                   | Fichiers |   LOC |                                                                                                                                             Imports entrants | Relations Prisma entrantes                                                                                                                  | Classification   | Action                                                    |
| ------------------------ | -------: | ----: | -----------------------------------------------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| `customizations`         |   **59** | 5 524 |                                                                                                                                                       **28** | `User.customizationRequests`, `Product.customizationInspirations` (nommée `CustomizationInspirations`), `ProductType.customizationRequests` | **Overkill**     | Supprimer — `mailto:` ou formulaire basique               |
| `wishlist`               |   **32** | 3 043 |                                                                                                                                                       **75** | `User.wishlist (1-1)`, `Product.wishlistItems`                                                                                              | **Overkill**     | Supprimer — faible valeur catalogue fixe                  |
| `announcements`          |   **39** | 2 584 |                                                                                                                                                       **14** | — (modèle `AnnouncementBar` isolé)                                                                                                          | **Overkill**     | Remplacer par 3 champs `StoreSettings`                    |
| `faq`                    |   **25** | 1 974 |                                                                                                                                                        **6** | — (modèle `FaqItem` isolé)                                                                                                                  | **Overkill**     | Remplacer par MDX statique                                |
| `reviews`                |   **83** | 8 416 |                                                                                                                                                       **54** | `User.reviews`, `Product.reviews`, `Product.reviewStats`, `OrderItem.review (1-1)`                                                          | **À simplifier** | Retirer modération bulk + cron request email              |
| `refunds`                |   **50** | 5 883 |                                                                                                                                                       **52** | `User.refundsCreated`, `Order.refunds`                                                                                                      | **À simplifier** | Remboursement total uniquement + 1 email                  |
| `discounts`              |   **52** | 5 381 |                                                                                                                                                       **63** | `User.discountUsages`, `Order.discountUsages`                                                                                               | **À simplifier** | CRUD simple, retirer scheduled + bulk-generate            |
| `dashboard`              |   **46** | 4 542 | **61** (dont **12** imports de `DASHBOARD_CACHE_TAGS` dans `modules/refunds/actions/`, 3 dans `modules/cron/services/`, 2 dans `modules/webhooks/handlers/`) | — (cache tags uniquement)                                                                                                                   | **À simplifier** | 3 KPI + 1 chart, retirer heatmaps/sparklines/period-swipe |
| **Conservés (décision)** |          |       |                                                                                                                                                              |                                                                                                                                             |                  |                                                           |
| `newsletter`             |   **52** | 3 988 |                                                                                                                                                            — | —                                                                                                                                           | Conservé         | —                                                         |
| `colors`                 |   **59** | 4 499 |                                                                                                                                                            — | —                                                                                                                                           | Conservé         | —                                                         |
| `materials`              |   **41** | 3 193 |                                                                                                                                                            — | —                                                                                                                                           | Conservé         | —                                                         |
| `product-types`          |   **44** | 3 283 |                                                                                                                                                            — | —                                                                                                                                           | Conservé         | —                                                         |
| `collections`            |   **70** | 6 473 |                                                                                                                                                            — | —                                                                                                                                           | Conservé         | —                                                         |

**Modules essentiels (intouchables)** : `auth`, `cart`, `orders` (155 fichiers), `payments`, `products` (185 fichiers), `skus`, `users`, `addresses`, `emails`, `webhooks`, `store-settings`, `cron`, `media`.

**Discounts — couplage critique** : `modules/payments/services/order-creation.service.ts` appelle `checkDiscountEligibility()` + `calculateDiscount()` ; `modules/cart/actions/apply-cart-discount.ts` appelle `checkDiscountEligibility()` + `calculateDiscountWithExclusion()`. La simplification doit **préserver ces signatures**.

**Dashboard — refactor cache tags** : les 17 fichiers hors-module qui importent `DASHBOARD_CACHE_TAGS` pour invalidation transverse peuvent être rewirés vers les tags déjà émis (ex: `updateTag("orders-list")`). Le dashboard consomme les mêmes tags, pas besoin d'un tag dédié.

### 3.2 Templates emails (33 → cible 14)

**À supprimer (19)** :

- **Alertes admin à fusionner en 1 générique** : `admin-checkout-failed`, `admin-cron-failed`, `admin-dispute-alert`, `admin-invoice-failed`, `admin-order-processing-failed`, `admin-refund-failed`, `admin-webhook-failed`.
- **Features supprimées** : `back-in-stock` (wishlist), `customization-{request,confirmation,status}` (module supprimé).
- **Remboursements simplifiés** : `refund-cancelled`, `refund-rejected`, `refund-status` (fusionner en `refund-confirmed`).
- **Reviews simplifiées** : `review-request`, `review-response`.
- **Edge cases rares** : `password-changed`, `return-confirmation`, `revert-shipping-notification`, `email-change-confirmation` (fusionner dans `verification`).

**À conserver (14)** :

- Transactionnels commande : `order-confirmation`, `payment-failed`, `shipping-confirmation`, `tracking-update`, `delivery-confirmation`, `cancel-order-confirmation`, `refund-confirmed`.
- Auth : `password-reset`, `verification`, `welcome`, `account-deletion`.
- Admin : `admin-new-order` + 1 alerte générique fusionnée.
- Newsletter (conservée) : `newsletter-confirmation`, `newsletter-welcome`.

**Mapping dépendances — quels emails deviennent automatiquement morts** :

- `back-in-stock-email.tsx` → importé uniquement par `modules/wishlist/services/notify-back-in-stock.ts` → mort après Phase 1.2
- `customization-request-email.tsx`, `customization-confirmation-email.tsx`, `customization-status-email.tsx` → uniquement `modules/customizations/` → mort après Phase 1.1
- `review-request-email.tsx` → appelé par cron `review-request-emails` via `modules/cron/services/review-request-emails.service.ts` → à aligner avec Phase 5 (suppression cron)
- `review-response-email.tsx` → action admin → mort dès simplification `reviews`
- `refund-{cancelled,rejected,status}-email.tsx` → à fusionner en `refund-confirmed` via `shared/lib/email-config.ts`

### 3.3 Cron jobs (15 → cible 7)

**À supprimer (8)** :

| Cron                          | Schedule       | Handler                                             | Service appelé                                            | Raison suppression                                                                      |
| ----------------------------- | -------------- | --------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `reconcile-refunds`           | `0 */6 * * *`  | `app/api/cron/reconcile-refunds/route.ts`           | `modules/cron/services/reconcile-refunds.service.ts`      | Webhook `charge.refunded` déjà wiré dans `modules/webhooks/handlers/refund-handlers.ts` |
| `process-scheduled-discounts` | `0 */4 * * *`  | `app/api/cron/process-scheduled-discounts/route.ts` | `processScheduledDiscounts()`                             | Activation manuelle admin → supprimer aussi champ `scheduledAt` du model Discount       |
| `cleanup-pending-orders`      | `*/30 * * * *` | `app/api/cron/cleanup-pending-orders/route.ts`      | `modules/cron/services/cleanup-pending-orders.service.ts` | Timeout Stripe checkout session (24h) couvre le cas                                     |
| `retry-webhooks`              | `0 * * * *`    | `app/api/cron/retry-webhooks/route.ts`              | —                                                         | Stripe retry natif 72h                                                                  |
| `retry-failed-emails`         | `0 * * * *`    | `app/api/cron/retry-failed-emails/route.ts`         | —                                                         | Resend fait les retries                                                                 |
| `cleanup-carts`               | `0 2 * * *`    | `app/api/cron/cleanup-carts/route.ts`               | —                                                         | Volume négligeable à cette échelle                                                      |
| `cleanup-wishlists`           | `30 2 * * *`   | `app/api/cron/cleanup-wishlists/route.ts`           | `cleanupExpiredWishlists()`                               | Mort après Phase 1.2 (module wishlist supprimé)                                         |
| `review-request-emails`       | `0 10 * * *`   | `app/api/cron/review-request-emails/route.ts`       | `modules/cron/services/review-request-emails.service.ts`  | Feature simplifiée — bouton admin manuel suffit                                         |

**À conserver (7)** : `cleanup-sessions` (RGPD), `sync-async-payments` (Stripe async payments), `process-account-deletions` (RGPD), `hard-delete-retention` (RGPD), `cleanup-webhook-events` (housekeeping), `cleanup-orphan-media` (housekeeping), `cleanup-newsletter` (module conservé).

> Note : la v1 listait 15 crons et ciblait « 7 » mais en conservait 8 (incluant `review-request-emails`). Après analyse, `review-request-emails` peut être rendu manuel → cible ferme à **7**.

### 3.4 Observabilité (5 couches → 2)

| Layer                                                 | État                                                                | Décision                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| **Sentry**                                            | Wired (client + server)                                             | ✅ **Garder** (erreurs prod essentielles)               |
| **Vercel Analytics + Speed Insights**                 | Wired                                                               | ✅ **Garder** (traffic + vitals)                        |
| `@vercel/otel` + `@prisma/sqlcommenter-trace-context` | Wired (`instrumentation.ts`)                                        | ❌ **Retirer wiring** (aucun backend OTel consommateur) |
| `web-vitals` + `WebVitalsReporter`                    | Wired                                                               | ❌ **Retirer wiring** (redondant avec Speed Insights)   |
| **PostHog**                                           | Fully implemented (provider, track, identify, proxy, feature-flags) | ❌ **Retirer wiring** (usage faible à cette échelle)    |

**Packages npm** : non désinstallés (décision utilisateur), uniquement les wirings/imports sont retirés. Les packages peuvent être désinstallés plus tard si besoin.

**Checklist de démontage précise** :

| Fichier                                        | Ligne(s) / action                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `instrumentation.ts`                           | Retirer import `@vercel/otel` + appel `registerOTel(...)` (ligne 2 et suivantes) |
| `instrumentation-client.ts`                    | Retirer init `posthog-js` (ligne 8) + imports associés                           |
| `shared/providers/posthog-provider.tsx`        | **Supprimer le fichier**                                                         |
| `shared/components/web-vitals-reporter.tsx`    | **Supprimer le fichier** (redondant avec Vercel Speed Insights)                  |
| `shared/components/posthog-identify.tsx`       | **Supprimer**                                                                    |
| `shared/components/posthog-identify-async.tsx` | **Supprimer**                                                                    |
| `shared/components/posthog-track.tsx`          | **Supprimer**                                                                    |
| `shared/lib/posthog*.ts`                       | **Supprimer**                                                                    |
| `shared/lib/feature-flags.ts`                  | **Supprimer** — 2 imports réels dont 1 test, aucun flag actif                    |
| `app/layout.tsx`                               | Retirer `<PostHogProvider>` et `<WebVitalsReporter>` du root                     |
| `next.config.ts`                               | Conserver `tunnelRoute: "/monitoring"` Sentry (légitime contre ad-blockers)      |

**Conservé tel quel** : `app/serwist/[path]/route.ts` (Sentry error capture SW), `shared/lib/logger.ts` (wrapper Sentry.captureException).

### 3.5 Cache profiles (10 → cible 4)

Actuellement dans `next.config.ts` : `realtime`, `dashboard`, `session`, `userOrders`, `cart`, `products`, `productDetail`, `relatedProducts`, `collections`, `reference`.

**Consolidation proposée** :

```ts
{
  catalog:   { stale: 900,    revalidate: 300,   expire: 21600 },   // products + productDetail + relatedProducts
  checkout:  { stale: 60,     revalidate: 30,    expire: 300 },     // cart + session + realtime
  reference: { stale: 604800, revalidate: 86400, expire: 2592000 }, // collections + faq (MDX)
  user:      { stale: 120,    revalidate: 60,    expire: 600 },     // userOrders + dashboard
}
```

**Remap des `cacheLife(...)` par zone** :

- `modules/products/data/*.ts`, `modules/skus/data/*.ts` → `cacheLife("catalog")`
- `modules/cart/data/*.ts`, `modules/auth/lib/session*.ts` → `cacheLife("checkout")`
- `modules/collections/data/*.ts`, `modules/store-settings/data/*.ts`, pages MDX (remplacement FAQ) → `cacheLife("reference")`
- `modules/orders/data/getUserOrders.ts`, `modules/dashboard/data/*.ts` → `cacheLife("user")`
- `modules/{colors,materials,product-types}/data/*.ts` → `cacheLife("reference")` (taxonomies stables)

### 3.6 Admin — complexité à trimmer

**À supprimer** :

- `app/admin/marketing/personnalisations/` (2 routes : index + `[id]/`)
- `app/admin/contenu/annonces/` (1 route + `create-announcement-button.tsx`)
- `app/admin/contenu/faq/` (1 route + `create-faq-button.tsx`)
- Bulk operations dans tous les modules admin (<100 items → actions par ligne suffisent)
- Command palette ⌘K (`app/admin/_components/command-palette.tsx`) — sidebar suffit pour un solo

**À simplifier** :

- Dashboard : supprimer `kpi-sparkline-builder.service.ts`, `fulfillment-pipeline.tsx`, `dashboard-period-swipe-wrapper.tsx`, `comparison-mode-selector.tsx`, export CSV/JSON drawer. Garder : 3 KPI cards, tableau 10 dernières commandes, 1 bar chart CA 30j.
- **Rewire invalidation cache dashboard** : remplacer les 17 imports transverses de `DASHBOARD_CACHE_TAGS` (12 dans `modules/refunds/actions/`, 3 dans `modules/cron/services/`, 2 dans `modules/webhooks/handlers/`) par les tags déjà émis localement. Le dashboard lit ses données via `orders-list`, `payments-list`, etc. — pas besoin d'un tag dédié.

**Conservés (décision utilisateur)** :

- Taxonomies produits (`couleurs`, `materiaux`, `types-de-produits`, `collections`)
- Newsletter admin
- Filter sheets (11 instances)
- Admin mobile polish (haptic, pull-to-refresh, bottom bar)
- PWA / Serwist

### 3.7 Tests — stratégie

**Actuellement** : **1 519** fichiers unit + **1 060** fichiers `__tests__` internes aux modules + **75** specs E2E Playwright (chiffres corrigés vs v1 qui annonçait 1 865 / 42). Scores 9.x/10 documentés sur ~80 composants.

**Recommandation** : ne pas supprimer l'existant (coût > bénéfice). **Geler la croissance** :

- Ne plus écrire de tests pour features supprimées
- Ne plus écrire de tests pour polish UX isolé (haptic, view transitions, safe-area)
- Tester uniquement : services purs, Server Actions critiques (cart, checkout, payment, refund, auth), webhook handlers Stripe
- CI : pre-commit sur `modules/{cart,orders,payments,webhooks,auth}` uniquement. Suite complète + E2E sur PR.
- **Suppression tests des modules retirés** : ~420 fichiers tests associés aux modules `customizations`, `wishlist`, `announcements`, `faq` (somme des colonnes `Tests` de l'explorateur) seront supprimés avec les modules → pas un effort dédié.

### 3.8 Sur-ingénierie cachée dans `shared/` (non documentée en v1)

L'exploration systématique de `shared/` a révélé des poches de code mort et de sur-abstraction qui ne figurent pas dans les sections §3.1–3.7.

#### 3.8.1 Hooks à 0 usage — **suppression directe**

~100 LOC cumulées, aucun consumer hors tests internes :

- `shared/hooks/use-bottom-bar-height.ts`
- `shared/hooks/use-lightbox.ts`
- `shared/hooks/use-pinch-zoom.ts`
- `shared/hooks/use-pulse-on-change.ts`
- `shared/hooks/use-scroll-hide-bottom-bar.ts`
- `shared/hooks/use-toolbar-drawer.ts`

#### 3.8.2 Hooks à 1 usage — **inline dans leur consumer**

13 fichiers, ~200 LOC. Abstraction prématurée, à inliner :
`use-admin-recent-searches`, `use-app-badge`, `use-cursor-pagination`, `use-fab-visibility`, `use-install-prompt`, `use-long-press`, `use-online-status`, `use-select-filter`, `use-selection`, `use-sort-select`, `use-swipe-action`, `use-visual-viewport`, `use-web-share`.

#### 3.8.3 Composants racine à 0–1 usage — **dead code**

- `shared/components/push-notifications-optin.tsx` (0 usage)
- `shared/components/system-banner.tsx` (0 usage)
- `shared/components/install-prompt-banner-async.tsx` (0 usage)
- `shared/components/voice-search-button.tsx` (0 usage)
- `shared/components/animations/split-text-css.tsx` (0 usage)
- `shared/components/animations/scroll-indicator.tsx` (1 usage)
- `shared/components/navigation/guarded-link.tsx` (0 usage)
- `shared/components/navigation/loading-indicator.tsx` (0 usage)

> **Note PWA** : Serwist + manifest + page `/~offline` restent actifs (décision §8). Seuls les composants UI d'install prompt et push opt-in sans consumer sont retirés.

#### 3.8.4 Zustand stores — simplifier

| Store                     | LOC | Consumers | Action                                                                                                                                               |
| ------------------------- | --: | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookie-consent-store.ts` | 125 |         9 | **Simplifier en vanilla `localStorage` + hook `useCookieConsent` (~30 LOC)** — Zustand persist + devtools surdimensionné pour un unique bandeau RGPD |
| `sheet-store.ts`          |  32 |         7 | Conserver (ou fusionner plus tard avec dialog/alert-dialog dans un `overlay-store` unique, −50 LOC + −2 providers)                                   |
| `badge-counts-store.ts`   |  38 |        17 | Conserver                                                                                                                                            |
| `dialog-store.ts`         |  56 |       181 | Conserver                                                                                                                                            |
| `alert-dialog-store.ts`   |  54 |        90 | Conserver                                                                                                                                            |

#### 3.8.5 Rate-limit et schémas orphelins

- **`shared/lib/rate-limit.ts`** : 285 LOC (sliding window Map + GC + whitelist/blacklist IP via env + cleanup 5 min). Pour 20–30 cmd/mois sur 1 instance serveur, un simple Map `{key → [timestamps]}` avec cleanup horaire suffit (**≤60 LOC**). Arcjet est mentionné en commentaires et mock de test mais **jamais appelé en prod** → retirer les références dormantes.
- **`shared/schemas/identifiers.schema.ts`** : 21 LOC (`cuidSchema`, `userIdSchema`, `optionalUserIdSchema`), **0 consumer** hors son propre test → supprimer.

#### 3.8.6 Synthèse gains §3.8

| Chantier                             |       LOC gagnées | Effort   |
| ------------------------------------ | ----------------: | -------- |
| 6 hooks 0 usage                      |              ~100 | 1h       |
| 13 hooks 1 usage inlinés             |              ~200 | 2h       |
| 8 composants racine dead             |              ~200 | 1h       |
| `cookie-consent-store` → vanilla     |               ~95 | 3h       |
| `rate-limit.ts` simplification       |              ~225 | 3h       |
| `identifiers.schema.ts`              |               ~21 | 0.5h     |
| `feature-flags.ts` + PostHog wirings | (comptés en §3.4) | —        |
| **Total §3.8**                       |      **~840 LOC** | **~10h** |

---

## 4. Plan d'exécution (phases)

### Phase 1 — Suppression modules (risque faible, gain max)

1. `customizations` (98 fichiers) + migration Prisma DROP
2. `wishlist` (54 fichiers) + DROP
3. `announcements` → 3 champs `StoreSettings` + DROP
4. `faq` → MDX statique + DROP

### Phase 2 — Simplification modules restants

5. `reviews` : retirer modération bulk, cron review-request, review-response emails (154 → ~60 fichiers)
6. `refunds` : retirer partial + reconcile cron + 3 emails statut (85 → ~30 fichiers)
7. `discounts` : retirer scheduled cron + bulk-generate + usages dialog (94 → ~50 fichiers)
8. `dashboard` : retirer sparklines/heatmap/period-swipe/export (85 → ~20 fichiers)

### Phase 3 — Emails (33 → 14)

9. Fusionner alertes admin en 1 template générique
10. Supprimer 19 templates listés
11. Mettre à jour `email-config.ts` + services

### Phase 4 — Observabilité & cache

12. Retirer wirings OTel / web-vitals / PostHog dans `instrumentation.ts`, `app/layout.tsx`, providers
13. Consolider cache profiles 10 → 4 dans `next.config.ts` + mettre à jour `cacheLife(...)` dans tous `modules/*/data/*`

### Phase 5 — Crons (15 → 7)

14. Supprimer 8 routes `app/api/cron/*` + entrées `vercel.json` + services correspondants

### Phase 6 — Admin cleanup

15. Supprimer routes admin mortes + Command palette + bulk ops

### Phase 7 — Tests / CI

16. Ajuster `vitest` workspace + `package.json` scripts pour critical-path pre-commit

### Phase 8 — Nettoyage `shared/` (additive, sans risque)

17. Supprimer les 6 hooks 0-usage (§3.8.1)
18. Inliner les 13 hooks 1-usage dans leur consumer unique (§3.8.2)
19. Supprimer les 8 composants racine dead (§3.8.3)
20. Refactor `cookie-consent-store` en vanilla `localStorage` + hook minimal
21. Trimmer `shared/lib/rate-limit.ts` à ≤60 LOC, retirer les mentions Arcjet dormantes
22. Supprimer `shared/schemas/identifiers.schema.ts`

---

## 5. Fichiers / dossiers critiques

| Zone                   | Chemin                                                                                                                                                                                                                                                        | Action                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modules suppr.         | `modules/{customizations,wishlist,announcements,faq}/`                                                                                                                                                                                                        | `rm -rf` + cleanup imports                                                                                                                                                                                                                                                                                                          |
| Modules simplifiés     | `modules/{reviews,refunds,discounts,dashboard}/`                                                                                                                                                                                                              | Trim fichiers listés                                                                                                                                                                                                                                                                                                                |
| Admin routes           | `app/admin/{marketing/personnalisations,contenu}/`                                                                                                                                                                                                            | `rm -rf`                                                                                                                                                                                                                                                                                                                            |
| Emails                 | `emails/*.tsx` (19 à supprimer)                                                                                                                                                                                                                               | Voir §3.2                                                                                                                                                                                                                                                                                                                           |
| Crons                  | `app/api/cron/*`, `vercel.json`                                                                                                                                                                                                                               | 8 à supprimer                                                                                                                                                                                                                                                                                                                       |
| Observabilité          | `instrumentation.ts`, `app/layout.tsx`, `shared/providers/posthog-provider.tsx`, `shared/components/web-vitals-reporter.tsx`, `shared/components/posthog-*.tsx`, `shared/lib/posthog*.ts`, `shared/lib/feature-flags.ts`, `proxy.ts`                          | Retirer wirings                                                                                                                                                                                                                                                                                                                     |
| Config cache           | `next.config.ts`                                                                                                                                                                                                                                              | 10 profils → 4                                                                                                                                                                                                                                                                                                                      |
| Prisma                 | `prisma/schema.prisma`                                                                                                                                                                                                                                        | Migration DROP models (`CustomizationRequest`, `CustomizationMedia`, `Wishlist`, `WishlistItem`, `AnnouncementBar`, `FaqItem`) + relations inverses (`User.customizationRequests`, `User.wishlist`, `User.reviews` si simplifié, `Product.customizationInspirations`, `Product.wishlistItems`, `ProductType.customizationRequests`) |
| Shared dead hooks      | `shared/hooks/use-{bottom-bar-height,lightbox,pinch-zoom,pulse-on-change,scroll-hide-bottom-bar,toolbar-drawer}.ts`                                                                                                                                           | `rm`                                                                                                                                                                                                                                                                                                                                |
| Shared dead components | `shared/components/{push-notifications-optin,system-banner,install-prompt-banner-async,voice-search-button}.tsx` + `shared/components/animations/{split-text-css,scroll-indicator}.tsx` + `shared/components/navigation/{guarded-link,loading-indicator}.tsx` | `rm`                                                                                                                                                                                                                                                                                                                                |
| Shared simplify        | `shared/stores/cookie-consent-store.ts`, `shared/lib/rate-limit.ts`, `shared/schemas/identifiers.schema.ts`                                                                                                                                                   | refactor / rm                                                                                                                                                                                                                                                                                                                       |

### Fonctions / utils à réutiliser (intouchés)

- `shared/lib/actions/*` (success, error, handleActionError, validateInput)
- `modules/auth/lib/require-auth.ts`
- `shared/lib/prisma.ts` (softDelete, notDeleted)
- `shared/lib/email-config.ts`
- `shared/components/forms/useAppForm`

---

## 6. Vérification end-to-end

1. **Typecheck + lint** : `pnpm typecheck && pnpm lint` vert à chaque phase.
2. **Tests critical path** : `pnpm test run modules/{cart,orders,payments,webhooks,auth,refunds}` vert.
3. **Build** : `pnpm build` sans erreur ; `pnpm size` pour vérifier impact bundle.
4. **Migrations Prisma** : `pnpm prisma migrate dev --name refactor_trim_2026` sur base locale + `pnpm seed`.
5. **Smoke E2E manuel** (localhost) :
   - Inscription → vérification email → connexion
   - Parcours produit → panier → checkout Stripe test `4242 4242 4242 4242` → email confirmation
   - Admin : création produit, édition, suppression
   - Admin : statut commande "expédiée" → email tracking reçu
   - Admin : remboursement → webhook → email `refund-confirmed`
6. **Sentry** : erreur volontaire dans une Server Action → réception dashboard Sentry.
7. **Cron health** : `curl` chaque cron restant avec `Authorization: Bearer $CRON_SECRET` → 200.

---

## 7. Résultat attendu post-refacto

| Métrique                            | Avant (vérifié) | Après (projection) | Δ                                            |
| ----------------------------------- | --------------- | ------------------ | -------------------------------------------- |
| LOC modules (hors tests)            | **~139 613**    | ~75 000            | **−46%**                                     |
| Fichiers modules (hors tests)       | **~1 617**      | ~900               | **−44%**                                     |
| LOC shared (hors tests, cumul §3.8) | baseline        | **−~840**          | —                                            |
| Modules DDD                         | 26              | 22                 | −4                                           |
| Templates emails                    | 33              | 14                 | **−58%**                                     |
| Cron jobs                           | 15              | 7                  | **−53%**                                     |
| Routes admin                        | ~100            | ~60                | −40%                                         |
| Couches observabilité actives       | 5               | 2                  | **−60%**                                     |
| Profils cache                       | 10              | 4                  | **−60%**                                     |
| Fichiers tests unitaires            | **1 519**       | ~1 100             | **−28%** (suppression tests modules retirés) |
| Bundle shared                       | baseline        | ~−10 à −15 KB      | wirings + dead components                    |
| **Conformité au besoin**            | **4/10**        | **8.5/10**         | **+113%**                                    |
| Qualité code & UX                   | 9/10            | 9/10               | **inchangée**                                |

> La ligne « LOC app ~334 000 / −49% » de la v1 n'est plus la métrique suivie (agrégat incohérent). Le Δ qui compte pour la dette est la réduction **modules + shared** (~−65 000 LOC modules + −840 LOC shared = ~−47% dette de code).

---

## 8. Décisions utilisateur verrouillées

- ✅ **Observabilité** : Sentry + Vercel Analytics uniquement (wirings OTel/PostHog/web-vitals retirés, packages conservés)
- ✅ **PWA Serwist** : conservée telle quelle
- ✅ **Taxonomies** (`colors` / `materials` / `product-types` / `collections`) : conservées
- ✅ **Newsletter** : module conservé (+ cron + 2 emails)
- ✅ **Admin mobile polish** (haptic, pull-to-refresh, bottom bar) : conservé
- ✅ **Filter sheets** (11 instances) : pas de consolidation
- ✅ **Dependencies npm** : pas de `pnpm remove` massif

---

## 9. Durée & séquencement recommandés

- **Durée totale estimée** : **4–6 jours** focus pour un solo (3–5 jours phases 1–7 + 0,5–1 jour Phase 8 shared cleanup).
- **Découpage en PRs atomiques** : 1 PR par sous-phase, chacune déployable indépendamment.
- **Ordre** : Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
- **Point de départ recommandé** : Phase 1.1 (`customizations`) — **28 imports entrants** à patcher, **3 relations Prisma** à dropper (`User`, `Product`, `ProductType`), **3 emails** auto-morts, **2 routes admin** à supprimer, ~5 524 LOC éliminées (+ les tests associés).
- **Deuxième suppression recommandée** : Phase 1.4 (`faq`) — **seulement 6 imports** entrants, modèle Prisma isolé → gain rapide pour valider la pipeline migration DROP + MDX fallback avant d'aborder wishlist (75 imports).
