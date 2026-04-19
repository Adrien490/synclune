# Prompts d'implémentation — Refactoring 2026 Synclune

Ce fichier contient les prompts atomiques à lancer successivement pour exécuter le refactoring décrit dans [`audit-refactoring-2026.md`](./audit-refactoring-2026.md).

## Règles communes à tous les prompts

> **Important** : ces règles s'appliquent à TOUS les prompts. Pour qu'un prompt soit réellement indépendant, prépend ces règles (ou au moins un lien vers cette section) quand tu le copies vers une nouvelle session IA.

- **Langue** : répondre en français, messages UI en français.
- **Règle 2-PR** : pour chaque module supprimé (Phase 1/2), **2 prompts distincts** : `<X>-code` puis `<X>-migration`. Attendre au moins 48 h entre les deux en prod (cf. §6.2 du doc audit).
- **Checks obligatoires avant de clore un prompt** : `pnpm typecheck`, `pnpm lint`, `pnpm test run <scope>` ciblé, `pnpm build` si build-impacting.
- **Jamais de `--no-verify`**, pas d'amend sur commit déjà poussé.
- **Référence canonique** : toujours ouvrir `docs/audit-refactoring-2026.md` avant d'agir — il contient la matrice des imports, relations Prisma, emails liés, crons liés pour chaque module.
- **Conventions Synclune** : voir `CLAUDE.md` (server actions pattern, cache patterns, modules DDD en couches, pas de useMemo/useCallback/React.memo).

---

## Audit de conformité (2026-04-19, post-décision « wishlist conservée »)

### Conformité avec `audit-refactoring-2026.md`

| Item                                                | Doc audit (vérité)                                  | Prompts                       | Statut                 |
| --------------------------------------------------- | --------------------------------------------------- | ----------------------------- | ---------------------- |
| Modules à supprimer Phase 1                         | 3 (customizations, announcements, faq)              | 3 prompts code + 3 migrations | ✅                     |
| Modules à simplifier Phase 2                        | 4 (reviews, refunds, discounts, dashboard)          | 4 prompts (2.4–2.7)           | ✅                     |
| Emails cible                                        | 15 (back-in-stock conservé)                         | Prompt 99 attend 15           | ✅ (corrigé)           |
| Crons cible                                         | 8 (cleanup-wishlists conservé)                      | Prompt 5.13 attend 8          | ✅ (corrigé)           |
| Modules cible                                       | 23 (wishlist conservée)                             | Prompt 99 attend 23           | ✅ (corrigé)           |
| Imports `DASHBOARD_CACHE_TAGS` dans refunds/actions | **9** (§3.1, §3.6)                                  | Prompt 2.5 dit 9              | ✅ (corrigé de 12 à 9) |
| Total imports transverses dashboard                 | 17 (9 + 3 + 4 + 1)                                  | Prompt 2.7 dit 17             | ✅                     |
| Risque rate-limit                                   | #5 P0 (439 callers)                                 | Prompt 8.20 dit #5            | ✅                     |
| Risque reconcile-refunds                            | #8                                                  | Prompt 2.5 dit #8             | ✅                     |
| Risque discounts signatures                         | #6                                                  | Prompt 2.6 dit #6             | ✅                     |
| Critical path pre-commit                            | `{cart,orders,payments,webhooks,auth}` (§3.7)       | Prompt 7.15 idem              | ✅                     |
| Numérotation globale 1–21                           | 1, 2, 3 / 4–7 / 8–10 / 11–12 / 13 / 14 / 15 / 16–21 | Prompts alignés               | ✅                     |

### Indépendance de chaque prompt

**Critères appliqués** :

1. Nomme explicitement le projet (Synclune) ✅ tous
2. Référence le doc audit pour les détails ✅ tous
3. Liste scope précis (fichiers, routes, emails) ✅ tous
4. Vérifications obligatoires (typecheck/lint/tests/build) ✅ tous
5. Message de commit suggéré ✅ tous
6. Préconditions inter-phases explicites :
   - ✅ Prompts migration : toujours préconditions (48 h, Sentry clean, snapshot Neon)
   - ✅ Prompt 4.11 : « Phases 1–3 mergées »
   - ✅ Prompt 8.20 : « Phases 1–7 + 8.16–8.19 mergées »
   - ✅ Prompt 8.21 : « Phase 8.20 stable 7 jours »
   - ⚠️ Prompt 3.8–3.10, 5.13, 6.14, 7.15, 8.16–8.19 : pas de précondition explicite. **Acceptable** car additifs / indépendants de l'état des phases précédentes.

**Limites d'indépendance — à garder en tête** :

- Les prompts utilisent `§3.1`, `§3.6`, etc. — efficaces SI l'IA lit le doc audit en ouverture (règle #5 commune).
- Les « Règles communes » au-dessus ne sont PAS répétées dans chaque bloc de prompt. Si tu colles un prompt dans une session IA vide, **ajoute en tête** : « Lis d'abord les Règles communes de `docs/refactoring-prompts-2026.md`. »
- Certains comptes (fichiers prod, LOC, emails) étaient vrais au **2026-04-19**. Si un prompt est lancé des semaines après et que d'autres travaux ont changé la codebase, l'IA doit re-vérifier par `grep`/`find` avant d'agir (et non se fier aveuglément aux chiffres indiqués). Le doc audit a une note explicite là-dessus.

### État global

- **Conformité** : ✅ aligné après corrections ci-dessus (3 bugs corrigés : prompt 2.5 imports, prompt 99 cibles modules/emails/crons).
- **Indépendance** : ✅ chaque prompt est auto-portant si lancé avec le fichier de prompts + le doc audit accessibles.
- **Pas de référence orpheline** : vérifié que tous les `§X.Y` cités dans les prompts existent dans le doc audit.

---

## Prompt 0 — Pré-flight (une seule fois avant Phase 1)

```
Avant de commencer le refactoring 2026 de Synclune (voir docs/audit-refactoring-2026.md), exécute les vérifications pré-flight de la section §6.0 :

1. Lance le SQL de volumétrie sur les tables à DROP (CustomizationRequest, CustomizationMedia, AnnouncementBar, FaqItem). Utilise `pnpm prisma studio` ou un script Node temporaire avec le client Prisma pour obtenir les counts. Rapporte les chiffres.

2. Capture le baseline bundle : `pnpm size:check > .size-baseline.json` à la racine. Commite ce fichier sur une branche `refactor/baseline-2026` avec un message `chore: capture bundle baseline pre-refactor-2026`.

3. Vérifie que `git status` est clean et que la branche `main` est à jour.

4. Vérifie que le nombre de callers de `enforceRateLimit` est toujours d'actualité : `grep -rn "enforceRateLimit(" modules shared app --include="*.ts" --include="*.tsx" | wc -l`. Rapporte le nombre (attendu ~439).

5. Si un count de volumétrie dépasse 10 000 lignes, signale-le avant de continuer (nécessite DELETE batché avant DROP).

Ne touche à aucun autre fichier. Rapport final en 10 lignes max.
```

---

## Phase 1 — Suppression modules (3 sous-phases × 2 PR)

> **Wishlist conservée** (décision utilisateur). Les prompts 1.2-code et 1.2-migration ont été retirés. Phase 1 contient désormais : customizations (1.1), announcements (1.2), faq (1.3).

### 1.1-code — `customizations` (code sans migration)

```
Exécute la Phase 1.1-code du refactoring 2026 Synclune (voir docs/audit-refactoring-2026.md §3.1 et §4).

Objectif : supprimer le module customizations SANS toucher au schéma Prisma (migration DROP en prompt séparé 1.1-migration plus tard).

Scope de CE PR :
1. Supprimer `modules/customizations/` (59 fichiers prod + ~39 tests).
2. Supprimer les routes :
   - `app/admin/marketing/personnalisations/` (index + [id])
   - `app/(shop)/personnalisation/`
   - `app/(account)/personnalisations/` s'il existe
3. Supprimer les 3 emails :
   - `emails/customization-request-email.tsx`
   - `emails/customization-confirmation-email.tsx`
   - `emails/customization-status-email.tsx`
4. Retirer les références dans `shared/lib/email-config.ts`.
5. Purger toute référence dans `modules/cron/services/hard-delete-retention.service.ts`.
6. Retirer l'entrée sidebar admin (`app/admin/_components/sidebar.tsx` ou équivalent) pointant vers `/admin/marketing/personnalisations`.
7. Ajouter 301 dans `next.config.ts` : `/personnalisation` → `/contact` (risque #1 §10).
8. Retirer les entrées du command palette admin référant ces routes (si présent).
9. Retirer le lien navbar public vers /personnalisation.

NE PAS TOUCHER `prisma/schema.prisma` à ce stade. Les relations inverses (User.customizationRequests, Product.customizationInspirations, ProductType.customizationRequests) restent dans le schéma pour que le code Prisma généré continue de fonctionner jusqu'à la migration.

Vérifications :
- `pnpm typecheck` vert
- `pnpm lint` vert
- `pnpm test run modules/{cart,orders,payments,webhooks,auth}` vert
- `pnpm build` sans erreur
- `grep -rn "@/modules/customizations" modules shared app` → 0 résultat

Commit : `feat: remove customizations module (code-only, migration to follow)`.
```

### 1.1-migration — `customizations` (Prisma DROP)

```
Exécute la Phase 1.1-migration du refactoring 2026 Synclune (voir docs/audit-refactoring-2026.md §5 Checklist Prisma DROP).

Préconditions :
- Le PR 1.1-code est mergé et déployé en prod depuis au moins 48h.
- Aucune erreur Sentry liée à customizations dans les 24 dernières heures.
- Snapshot Neon Point-in-Time capturé (noter le snapshot ID en commentaire de commit).

Scope :
1. Éditer `prisma/schema.prisma` :
   - Retirer les relations inverses : `User.customizationRequests`, `Product.customizationInspirations` (relation nommée `CustomizationInspirations`), `ProductType.customizationRequests`
   - Retirer les modèles `CustomizationRequest` et `CustomizationMedia`
   - Retirer l'enum `CustomizationRequestStatus` si plus référencé
2. Générer la migration : `pnpm prisma migrate dev --name drop_customizations`
3. Vérifier le SQL généré : DROP TABLE `CustomizationMedia` AVANT `CustomizationRequest` (FK-safe).
4. Lancer `pnpm seed` pour valider que le seed passe toujours.

Vérifications :
- `pnpm prisma validate` vert
- `pnpm typecheck` vert
- `pnpm build` vert
- Schéma propre, aucun résidu customizations.

Commit : `feat(prisma): drop customizations models (snapshot: <neon-id>)`.
```

### 1.2-code — `announcements` (code + migration StoreSettings)

```
Exécute la Phase 1.2 du refactoring 2026 Synclune (voir docs/audit-refactoring-2026.md §3.1).

Spécificité : ce module se remplace par des champs dans `StoreSettings`. Le flux est donc :
(a) Ajouter les champs + migration ADD COLUMN
(b) Code qui consomme ces champs
(c) Migration DROP `AnnouncementBar` (dans un prompt 1.2-migration séparé)

Scope de CE PR (code + ADD COLUMN) :
1. Éditer `prisma/schema.prisma` : ajouter à `StoreSettings` :
   - `announcementMessage String? @db.VarChar(200)`
   - `announcementLink String? @db.VarChar(2048)`
   - `announcementStartsAt DateTime?`
   - `announcementEndsAt DateTime?`
   - `announcementIsActive Boolean @default(false)`
2. `pnpm prisma migrate dev --name add_announcement_fields_to_store_settings`
3. Migrer les données existantes `AnnouncementBar` actives vers `StoreSettings` (script Node one-shot ou via seed). Documenter dans le commit.
4. Mettre à jour le composant `app/(shop)/layout.tsx` (+ legal, account) pour lire depuis `StoreSettings` via `modules/store-settings/data/`.
5. Supprimer `modules/announcements/` (39 fichiers prod).
6. Supprimer la route `app/admin/contenu/annonces/`.
7. Ajouter un champ de gestion dans `app/admin/configuration/` (route store-settings existante).
8. Retirer l'entrée sidebar admin correspondante.

NE PAS DROP `AnnouncementBar` à ce stade (migration séparée 1.2-migration).

Vérifications :
- `pnpm typecheck` vert
- Affichage de la barre d'annonce via StoreSettings testé en dev
- `grep -rn "@/modules/announcements" modules shared app` → 0 résultat
- `pnpm build` vert

Commit : `feat: migrate announcements to StoreSettings fields`.
```

### 1.2-migration — DROP `AnnouncementBar`

```
Exécute la Phase 1.2-migration du refactoring 2026 Synclune.

Préconditions : 1.2-code mergé + 48h + Sentry clean + snapshot Neon + vérification que plus aucune lecture n'est faite sur `AnnouncementBar` en prod (`grep -rn "AnnouncementBar\b" modules shared app` → 0 résultat).

Scope :
1. Éditer `prisma/schema.prisma` : retirer le modèle `AnnouncementBar`.
2. `pnpm prisma migrate dev --name drop_announcement_bar`
3. Vérifier typecheck + build.

Commit : `feat(prisma): drop AnnouncementBar model (snapshot: <neon-id>)`.
```

### 1.3-code — `faq` (code + MDX statique)

```
Exécute la Phase 1.3-code du refactoring 2026 Synclune.

Scope :
1. Créer `app/(shop)/faq/page.tsx` qui rend du MDX statique (ou Markdown parsé). Utilise `next-mdx-remote` si déjà installé, sinon JSX statique.
2. Migrer les questions/réponses actives depuis `FaqItem` vers le contenu MDX/JSX.
3. Supprimer `modules/faq/` (25 fichiers prod).
4. Supprimer la route admin `app/admin/contenu/faq/`.
5. Retirer l'entrée sidebar admin correspondante.
6. Mettre à jour `app/sitemap.ts` si /faq y figurait.

NE PAS TOUCHER `prisma/schema.prisma`.

Vérifications :
- Route `/faq` accessible en dev, rend correctement
- `pnpm typecheck` + `pnpm lint` verts
- `grep -rn "@/modules/faq" modules shared app` → 0 résultat

Commit : `feat: replace faq module with static MDX`.
```

### 1.3-migration — DROP `FaqItem`

```
Exécute la Phase 1.3-migration du refactoring 2026 Synclune.

Préconditions : 1.3-code mergé + 48h + snapshot Neon.

Scope :
1. Retirer le modèle `FaqItem` de `prisma/schema.prisma`.
2. `pnpm prisma migrate dev --name drop_faq_item`
3. Vérifier typecheck + build.

Commit : `feat(prisma): drop FaqItem model (snapshot: <neon-id>)`.
```

---

## Phase 2 — Simplification modules restants

### 2.4 — Simplifier `reviews`

```
Exécute la Phase 2.4 du refactoring 2026 Synclune (voir docs/audit-refactoring-2026.md §3.1).

Objectif : passer `modules/reviews` de 83 → ~40 fichiers prod.

Scope :
1. Supprimer la modération bulk :
   - Actions `modules/reviews/actions/bulk-*.ts`
   - Composants admin `*-bulk-*.tsx`
2. Supprimer le cron + emails review-request :
   - `app/api/cron/review-request-emails/route.ts` + entrée `vercel.json`
   - `modules/cron/services/review-request-emails.service.ts`
   - `emails/review-request-email.tsx`
   - `emails/review-response-email.tsx`
3. Retirer les callers du cron dans `modules/orders/actions/{mark-as-delivered,bulk-mark-as-delivered,resend-order-email}.ts` (supprimer appel au service review-request).
4. Retirer les références dans `shared/lib/email-config.ts`.

Conserver :
- Lecture/affichage reviews (storefront + PDP)
- Création review par customer
- Affichage étoiles + stats
- Relations Prisma (User.reviews, Product.reviews, Product.reviewStats, OrderItem.review) — pas de DROP
- JSON-LD structured-data (`shared/components/structured-data.tsx`)

Vérifications :
- `pnpm typecheck` + `pnpm lint` verts
- `pnpm test run modules/reviews modules/orders` vert
- `pnpm build` vert

Commit : `refactor(reviews): remove bulk moderation + review-request cron/emails`.
```

### 2.5 — Simplifier `refunds`

```
Exécute la Phase 2.5 du refactoring 2026 Synclune.

⚠️ Risque #8 §10 : avant suppression du cron `reconcile-refunds`, **lire `modules/webhooks/handlers/refund-handlers.ts`** et vérifier qu'il couvre les 4 cas : refund API Synclune, refund dashboard Stripe externe, refund partiel multi-events, refund sur dispute. Si un cas n'est pas couvert → STOP et signaler.

Scope :
1. Remboursement total uniquement :
   - Retirer les formulaires/actions de refund partiel dans `modules/refunds/actions/`
   - Simplifier `modules/refunds/components/admin/create-refund-form.tsx` (garder montant total auto)
2. Fusion des 3 emails refund :
   - Nouveau `emails/refund-confirmed-email.tsx` paramétrable (status, raison optionnelle)
   - Supprimer `refund-cancelled-email.tsx`, `refund-rejected-email.tsx`, `refund-status-email.tsx`
   - Mettre à jour `shared/lib/email-config.ts`
   - Mettre à jour les callers dans `modules/refunds/actions/` et `modules/webhooks/handlers/refund-handlers.ts`
3. Supprimer le cron `reconcile-refunds` :
   - `app/api/cron/reconcile-refunds/route.ts`
   - Entrée `vercel.json`
   - `modules/cron/services/reconcile-refunds.service.ts`
4. Retirer les 9 imports `DASHBOARD_CACHE_TAGS` dans `modules/refunds/actions/` : remplacer par les tags locaux déjà émis (`updateTag("orders-list")` ou équivalent). Cf. audit doc §3.1 ligne dashboard et §3.6.

Conserver :
- Relations Prisma (User.refundsCreated, Order.refunds) — pas de DROP
- Feature refund complète côté admin et customer

Vérifications :
- `pnpm typecheck` + `pnpm lint` verts
- `pnpm test run modules/refunds modules/webhooks modules/orders modules/payments` vert
- `pnpm build` vert

Commit : `refactor(refunds): total-only + single email + drop reconcile cron`.
```

### 2.6 — Simplifier `discounts`

```
Exécute la Phase 2.6 du refactoring 2026 Synclune.

⚠️ Risque #6 §10 : les signatures `checkDiscountEligibility()` et `calculateDiscountWithExclusion()` DOIVENT être préservées à 100 % (2 callers : `modules/payments/services/order-creation.service.ts` et `modules/cart/actions/apply-cart-discount.ts`).

Scope :
1. Retirer `scheduledAt` du model Discount :
   - Éditer `prisma/schema.prisma` : retirer le champ `scheduledAt`
   - `pnpm prisma migrate dev --name drop_discount_scheduled_at`
2. Supprimer le cron :
   - `app/api/cron/process-scheduled-discounts/route.ts`
   - Entrée `vercel.json`
   - Service `processScheduledDiscounts()` dans `modules/cron/services/`
3. Supprimer les features bulk-generate :
   - Actions + components admin `bulk-generate-*`
4. Supprimer le `usages-dialog` (composant usages admin).
5. Activation manuelle admin : garantir que le toggle `isActive` existe déjà sur le formulaire admin.
6. Auditer `calculateDiscount()` sans exclusion : si 0 caller → supprimer. Sinon conserver.

Vérifications :
- `pnpm typecheck` + `pnpm lint` verts
- **Tests de non-régression ciblés** sur `modules/payments/services/order-creation.service.ts` + `modules/cart/actions/apply-cart-discount.ts` verts
- `pnpm test run modules/discounts modules/payments modules/cart` vert
- `pnpm build` vert

Commit : `refactor(discounts): drop scheduled/bulk-generate, preserve public signatures`.
```

### 2.7 — Simplifier `dashboard`

```
Exécute la Phase 2.7 du refactoring 2026 Synclune (voir §3.6).

Scope :
1. Supprimer dans `modules/dashboard/` :
   - `services/kpi-sparkline-builder.service.ts`
   - `components/fulfillment-pipeline.tsx`
   - `components/dashboard-period-swipe-wrapper.tsx`
   - `components/comparison-mode-selector.tsx`
   - Drawer export CSV/JSON + actions associées
   - Heatmaps components
2. Garder : 3 KPI cards, tableau 10 dernières commandes, 1 bar chart CA 30j.
3. Rewire des 17 imports transverses de `DASHBOARD_CACHE_TAGS` :
   - 9 fichiers `modules/refunds/actions/*` → remplacer par tags locaux (`orders-list`, `payments-list`)
   - 3 fichiers `modules/cron/services/*` → idem
   - 4 fichiers `modules/webhooks/handlers/*` → idem
   - 1 fichier `modules/orders/constants/cache.ts` → nettoyer
4. Valider que le dashboard se rafraîchit correctement via les tags existants (test manuel : créer une commande → voir apparition dashboard).

Vérifications :
- `pnpm typecheck` + `pnpm lint` verts
- `pnpm test run modules/dashboard modules/refunds modules/webhooks modules/cron modules/orders` vert
- Build vert
- Dashboard fonctionnel en dev (manuel)

Commit : `refactor(dashboard): trim sparklines/heatmap/export, rewire cache tags`.
```

---

## Phase 3 — Emails résiduels

### 3.8 — Fusionner les 7 alertes admin

```
Exécute la Phase 3.8 du refactoring 2026 Synclune.

Scope :
1. Créer `emails/admin-alert-email.tsx` générique, paramétré `{type: "checkout"|"cron"|"dispute"|"invoice"|"order-processing"|"refund"|"webhook", context: string, summary: string, stackTrace?: string}`.
2. Supprimer les 7 emails :
   - admin-checkout-failed
   - admin-cron-failed
   - admin-dispute-alert
   - admin-invoice-failed
   - admin-order-processing-failed
   - admin-refund-failed
   - admin-webhook-failed
3. Mettre à jour `shared/lib/email-config.ts` + tous les callers (`modules/cron/services/*`, `modules/webhooks/handlers/*`, Server Actions admin).

Vérifications :
- Typecheck + lint verts
- Preview `pnpm email:dev` sur `admin-alert` pour les 7 types
- Tests ciblés `modules/webhooks modules/cron` verts

Commit : `refactor(emails): merge 7 admin alerts into single template`.
```

### 3.9 — Fusionner `email-change-confirmation` dans `verification`

```
Exécute la Phase 3.9 du refactoring 2026 Synclune.

Scope :
1. Étendre `emails/verification-email.tsx` pour accepter un prop `mode: "signup" | "email-change"` avec wording adapté.
2. Supprimer `emails/email-change-confirmation-email.tsx`.
3. Mettre à jour les callers `modules/auth/actions/` et `shared/lib/email-config.ts`.

Vérifications :
- Typecheck + lint verts
- Preview email `pnpm email:dev` sur les 2 modes
- Tests auth verts (`pnpm test run modules/auth`)

Commit : `refactor(emails): merge email-change-confirmation into verification`.
```

### 3.10 — Supprimer les 3 edge cases rares

```
Exécute la Phase 3.10 du refactoring 2026 Synclune.

Scope : supprimer les 3 emails non essentiels :
1. `emails/password-changed-email.tsx` (non critique, notification optionnelle)
2. `emails/return-confirmation-email.tsx`
3. `emails/revert-shipping-notification-email.tsx`

Pour chacun : retirer les callers dans `modules/auth/actions/`, `modules/orders/actions/`, et mettre à jour `shared/lib/email-config.ts`.

Vérifications : typecheck + lint + tests auth/orders verts. Build vert.

Commit : `refactor(emails): remove 3 rare edge-case templates`.
```

---

## Phase 4 — Observabilité & cache

### 4.11 — Retirer wirings OTel / PostHog / web-vitals

```
Exécute la Phase 4.11 du refactoring 2026 Synclune (voir §3.4 checklist exacte).

Préconditions :
- Phases 1–3 mergées.
- Noter le bundle courant : `pnpm size:check > .size-pre-observability.json`.

Scope (suivre strictement la checklist §3.4) :
1. `instrumentation.ts` : retirer `import { registerOTel } from "@vercel/otel"` + appel `registerOTel(...)`.
2. `instrumentation-client.ts` : retirer init `posthog-js`.
3. Supprimer :
   - `shared/providers/posthog-provider.tsx`
   - `shared/components/web-vitals-reporter.tsx`
   - `shared/components/posthog-identify.tsx`
   - `shared/components/posthog-identify-async.tsx`
   - `shared/components/posthog-track.tsx`
   - `shared/lib/posthog*.ts` (tous)
   - `shared/lib/feature-flags.ts`
   - Route `app/api/analytics/web-vitals/` devenue morte
4. `app/layout.tsx` : retirer `<PostHogProvider>` et `<WebVitalsReporter>`.
5. Conserver tel quel : `next.config.ts` tunnelRoute `/monitoring`, `app/serwist/[path]/route.ts`, `shared/lib/logger.ts`.
6. Ne PAS faire `pnpm remove` sur les packages (décision §8).

Vérifications :
- `pnpm typecheck` vert
- `pnpm lint` vert
- `grep -rn "posthog\|@vercel/otel\|WebVitalsReporter\|feature-flags" modules shared app` → 0 résultat fonctionnel
- `pnpm build` vert
- `pnpm size:check` → comparer avec .size-pre-observability.json, attendu −30 à −50 KB gzip

Commit : `refactor(observability): remove OTel/PostHog/web-vitals wirings`.
```

### 4.12 — Consolider cache profiles 10 → 4

````
Exécute la Phase 4.12 du refactoring 2026 Synclune (voir §3.5).

Scope :
1. Éditer `next.config.ts` : remplacer les 10 profils par les 4 :
   ```ts
   catalog:   { stale: 900,    revalidate: 300,   expire: 21600 },
   checkout:  { stale: 60,     revalidate: 30,    expire: 300 },
   reference: { stale: 604800, revalidate: 86400, expire: 2592000 },
   user:      { stale: 120,    revalidate: 60,    expire: 600 },
````

2. Remapper tous les `cacheLife(...)` selon §3.5 :
   - products/skus/data → `cacheLife("catalog")`
   - cart/auth session → `cacheLife("checkout")`
   - collections/store-settings/colors/materials/product-types → `cacheLife("reference")`
   - orders (user) / dashboard → `cacheLife("user")`
3. Optionnel (si temps) : ajouter une ESLint rule custom `no-unknown-cacheLife-profile` pour verrouiller les 4 noms valides.

Vérifications :

- `grep -rn "cacheLife(" modules shared app | grep -v "catalog\|checkout\|reference\|user"` → 0 résultat
- `pnpm typecheck` + `pnpm lint` + `pnpm build` verts
- `pnpm test` global vert

Commit : `refactor(cache): consolidate 10 profiles into 4`.

```

---

## Phase 5 — Crons résiduels

### 5.13 — Supprimer 4 crons résiduels

```

Exécute la Phase 5.13 du refactoring 2026 Synclune (voir §3.3).

Rappel : les 3 crons liés aux modules simplifiés (`review-request-emails`, `reconcile-refunds`, `process-scheduled-discounts`) ont déjà été supprimés en Phase 2. `cleanup-wishlists` est CONSERVÉ (wishlist conservée).

Scope des 4 crons résiduels non liés à un module :

1. `app/api/cron/cleanup-pending-orders/route.ts` + `modules/cron/services/cleanup-pending-orders.service.ts` + entrée vercel.json → SUPPRIMER
2. `app/api/cron/retry-webhooks/route.ts` + entrée vercel.json → SUPPRIMER
3. `app/api/cron/retry-failed-emails/route.ts` + entrée vercel.json → SUPPRIMER
4. `app/api/cron/cleanup-carts/route.ts` + entrée vercel.json → SUPPRIMER

Vérifications :

- `vercel.json` contient exactement 8 crons : cleanup-sessions, sync-async-payments, process-account-deletions, hard-delete-retention, cleanup-webhook-events, cleanup-orphan-media, cleanup-newsletter, cleanup-wishlists.
- `pnpm typecheck` + `pnpm lint` + `pnpm build` verts
- `pnpm test run modules/cron` vert

Commit : `refactor(crons): drop 4 non-essential crons (total 15 → 8)`.

```

---

## Phase 6 — Admin résiduel

### 6.14 — Supprimer Command palette + bulk ops admin

```

Exécute la Phase 6.14 du refactoring 2026 Synclune (voir §3.6).

Scope :

1. Supprimer le Command palette :
   - `app/admin/_components/command-palette.tsx`
   - Tous les imports/providers associés dans `app/admin/layout.tsx` ou shell
   - Hook `shared/hooks/use-admin-recent-searches.ts` s'il est uniquement utilisé par la palette (sinon garder pour Phase 8)
   - Raccourci clavier ⌘K
2. Supprimer les bulk operations dans les modules admin conservés :
   - `modules/products/actions/bulk-*.ts`
   - `modules/orders/actions/bulk-*.ts` (sauf bulk-mark-as-delivered qui reste si utile)
   - `modules/{colors,materials,product-types,collections,skus,users,addresses}/actions/bulk-*.ts`
   - Composants `*-bulk-*.tsx` + toolbars associées
3. Conserver les actions par ligne (individuelles).

Vérifications :

- `pnpm typecheck` + `pnpm lint` + `pnpm build` verts
- Tests admin verts (`pnpm test run modules/{products,orders}`)
- Test manuel : ouvrir admin, vérifier que la liste produits/commandes fonctionne sans barre bulk

Commit : `refactor(admin): drop command palette + bulk operations`.

```

---

## Phase 7 — Tests / CI

### 7.15 — Ajuster critical path pre-commit

```

Exécute la Phase 7.15 du refactoring 2026 Synclune.

Scope :

1. Ajuster `package.json` scripts :
   - `test:critical` : `vitest run modules/{cart,orders,payments,webhooks,auth}`
   - `test:pre-commit` : alias sur `test:critical`
2. Configurer `husky` (ou équivalent déjà présent) pour lancer `test:pre-commit` en pre-commit sur les fichiers staged touchant ces 5 modules.
3. Configurer CI (GitHub Actions ou équivalent) :
   - Pre-commit : `test:critical` uniquement
   - PR : suite complète `pnpm test` + `pnpm e2e` (smoke spec)
4. Documenter dans `CLAUDE.md` la stratégie de test (section dédiée).

Vérifications :

- `pnpm test:critical` vert
- Pre-commit hook fonctionne (tester en modifiant un fichier cart)
- CI reste verte

Commit : `chore(tests): critical-path pre-commit strategy`.

```

---

## Phase 8 — Nettoyage `shared/`

### 8.16 — Inline les 3 hooks 1-usage (§3.8.1 révisé)

```

Exécute la Phase 8.16 du refactoring 2026 Synclune (voir §3.8.1).

Scope : inliner dans leur unique consumer les 3 hooks suivants (puis supprimer les fichiers) :

1. `shared/hooks/use-pinch-zoom.ts` → inline dans `modules/media/components/gallery/pinch-zoom.tsx`
2. `shared/hooks/use-pulse-on-change.ts` → inline dans `shared/components/ui/item-count-badge.tsx`
3. `shared/hooks/use-scroll-hide-bottom-bar.ts` → inline dans `shared/components/bottom-bar/bottom-bar.tsx`

Pour chaque hook :

- Lire le consumer unique
- Copier la logique du hook dans le consumer (en respectant le pattern React 19, pas de useMemo/useCallback/React.memo)
- Supprimer le fichier hook + son test `__tests__/`
- Vérifier que le consumer passe toujours ses tests

Vérifications :

- `pnpm typecheck` + `pnpm lint` verts
- Tests du consumer verts
- `grep -rn "use-pinch-zoom\|use-pulse-on-change\|use-scroll-hide-bottom-bar"` → 0 résultat

Commit : `refactor(shared): inline 3 single-use hooks`.

```

### 8.17 — Inline les 12 hooks 1-usage (§3.8.2)

```

Exécute la Phase 8.17 du refactoring 2026 Synclune (voir §3.8.2).

Scope : inliner les 12 hooks listés dans leur unique consumer :
`use-admin-recent-searches`, `use-app-badge`, `use-cursor-pagination`, `use-fab-visibility`, `use-install-prompt`, `use-long-press`, `use-online-status`, `use-select-filter`, `use-sort-select`, `use-swipe-action`, `use-visual-viewport`, `use-web-share`.

⚠️ `use-selection` NE PAS INLINER (20+ consumers, abstraction légitime).

Méthode par hook :

1. Localiser le consumer unique : `grep -rln "use<HookName>" modules shared app --include="*.ts" --include="*.tsx" | grep -v __tests__`
2. Si 0 ou ≥ 2 consumers trouvés → STOP et signaler (l'audit peut être désaligné avec la réalité actuelle).
3. Sinon inliner dans ce consumer unique, supprimer le hook + son test.

Vérifications :

- `pnpm typecheck` + `pnpm lint` verts
- Tests ciblés sur chaque module touché verts
- `pnpm build` vert

Commit : `refactor(shared): inline 12 single-use hooks`.

```

### 8.18 — Supprimer les 8 composants racine dead

```

Exécute la Phase 8.18 du refactoring 2026 Synclune (voir §3.8.3).

Préconditions : vérifier pour chaque composant que le count d'usages est bien 0 (ou 1 pour scroll-indicator).

Scope : supprimer :

1. `shared/components/push-notifications-optin.tsx` (+ test)
2. `shared/components/system-banner.tsx` (+ test)
3. `shared/components/install-prompt-banner-async.tsx` (+ test)
4. `shared/components/voice-search-button.tsx` (+ test)
5. `shared/components/animations/split-text-css.tsx` (+ test)
6. `shared/components/animations/scroll-indicator.tsx` (1 usage : retirer aussi l'usage avant suppression)
7. `shared/components/navigation/guarded-link.tsx` (+ test)
8. `shared/components/navigation/loading-indicator.tsx` (+ test)

Pour chaque : `grep -rn "<ComponentName>\|from.*<file>"` avant suppression pour sécuriser.

Vérifications :

- `pnpm typecheck` + `pnpm lint` + `pnpm build` verts
- Tests shared verts

Commit : `refactor(shared): drop 8 unused components`.

```

### 8.19 — Simplifier `cookie-consent-store` (Zustand → vanilla)

```

Exécute la Phase 8.19 du refactoring 2026 Synclune (voir §3.8.4).

Scope :

1. Remplacer `shared/stores/cookie-consent-store.ts` (125 LOC) par :
   - `shared/hooks/use-cookie-consent.ts` (~30 LOC) : lit/écrit un JSON dans `localStorage` sous une clé `synclune_cookie_consent`, avec expiry 6 mois
   - Interface : `{ status: "accepted"|"rejected"|"pending", setStatus: (s) => void }`
2. Mettre à jour les 9 consumers existants pour utiliser le nouveau hook (interface équivalente).
3. Supprimer `shared/providers/cookie-consent-store-provider.tsx` + retirer du root `app/layout.tsx`.
4. Conserver le comportement RGPD identique (expiry 6 mois, default "pending").
5. Écrire 3-4 tests unitaires pour le nouveau hook (SSR-safe, read/write, expiry).

Vérifications :

- `pnpm typecheck` + `pnpm lint` verts
- Tests verts
- Test manuel : banneau de consentement apparaît, disparaît après acceptation, réapparaît après 6 mois (ou en vidant localStorage)

Commit : `refactor(shared): replace cookie-consent Zustand store with vanilla hook`.

```

### 8.20 — Trimmer `rate-limit.ts` (risque #5 P0)

```

Exécute la Phase 8.20 du refactoring 2026 Synclune — **RISQUE #5 P0**.

⚠️ **439 callers** de `enforceRateLimit()` en prod. Toute régression de signature bloque la CI complète. PR dédié, canary 24h avant prod.

Préconditions :

- Phases 1–7 + 8.16–8.19 mergées et stables
- Snapshot Sentry "rate-limit" tag sur 7 derniers jours (baseline)

Scope :

1. Lire intégralement `shared/lib/rate-limit.ts` (285 LOC actuelles).
2. Noter EXACTEMENT la signature publique de `enforceRateLimit(key, options)` — l'export doit rester identique au caractère près.
3. Refonte interne uniquement :
   - Simple Map `{key → number[]}` (timestamps)
   - Cleanup horaire via `setInterval` ou sur accès (lazy cleanup si âge > 1h)
   - Retirer whitelist/blacklist IP via env (jamais utilisés)
   - Retirer les mentions Arcjet dormantes dans les commentaires + mocks de test
   - Cible : **≤60 LOC**
4. Conserver 100% le comportement observable : même erreurs retournées, même métadonnées, même logs Sentry tag `rate-limit`.
5. Tests de non-régression :
   - Tests unitaires existants `shared/lib/__tests__/rate-limit.test.ts` doivent passer sans modification
   - Ajouter tests supplémentaires : fenêtre glissante, cleanup, cas limite 0 req
6. Vérifier count callers identique : `grep -rn "enforceRateLimit(" modules shared app | wc -l` → attendu 439 avant ET après.

Vérifications obligatoires :

- `pnpm typecheck` + `pnpm lint` verts
- `pnpm test run shared/lib` vert
- `pnpm test run modules` global vert (s'assurer qu'aucun module ne casse)
- `pnpm build` vert
- Bundle : pas de régression

Déploiement :

- PR dédié, pas bundlé avec d'autres travaux
- Canary preview 24h minimum
- Monitorer Sentry tag `rate-limit` sur preview : aucune nouvelle erreur
- Puis merge et 1 semaine d'observation prod avant Phase 8.21

Commit : `refactor(rate-limit): internal rewrite 285→~60 LOC, signature preserved`.

```

### 8.21 — Supprimer `identifiers.schema.ts`

```

Exécute la Phase 8.21 du refactoring 2026 Synclune.

Préconditions : Phase 8.20 stable en prod depuis 7 jours.

Scope :

1. Vérifier à nouveau 0 consumer hors test : `grep -rn "from.*identifiers.schema\|from.*identifiers\"" modules shared app`.
2. Supprimer `shared/schemas/identifiers.schema.ts` et son test.
3. Vérifier aucun import résiduel.

Vérifications :

- `pnpm typecheck` + `pnpm lint` + `pnpm build` verts
- Tests shared verts

Commit : `refactor(shared): drop unused identifiers schema`.

```

---

## Clôture du refactoring

### 99 — Synthèse finale

```

Le refactoring 2026 de Synclune est terminé (Phases 1–8 mergées). Vérifie et rapporte :

1. Compte final :
   - Modules : `find modules -maxdepth 1 -mindepth 1 -type d | wc -l` (attendu **23** — wishlist conservée)
   - LOC modules hors tests : `find modules -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*__tests__*" -exec wc -l {} + | tail -1` (attendu ~78 000)
   - Emails : `ls emails/*.tsx | wc -l` (attendu **15** — `back-in-stock` conservé)
   - Crons vercel.json : count (attendu **8** — `cleanup-wishlists` conservé)
   - Cache profiles next.config.ts : count (attendu 4)
   - Tests unitaires : `find . -path "*__tests__*" -name "*.test.*" | wc -l` (attendu ~1 072)
   - Playwright specs : `ls e2e/**/*.spec.ts | wc -l`
2. Bundle final : `pnpm size:check > .size-final.json` et comparer avec `.size-baseline.json` du prompt 0. Rapporter gain gzip.
3. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` tous verts.
4. Sentry : aucune nouvelle famille d'erreurs depuis Phase 1.
5. Mettre à jour `CLAUDE.md` :
   - Count modules → 23 (aligner si inexact)
   - Count emails → 15 (aligner si inexact)
   - Count cache profiles 10 → 4
   - Count crons → 8 (aligner si inexact)
6. Fermer cette ligne finale dans le doc audit : ajouter en §7 une colonne "Réel post-refacto" avec les chiffres mesurés.
7. Archiver `docs/audit-refactoring-2026.md` + `docs/refactoring-prompts-2026.md` : marquer en tête `# [ARCHIVED 2026-XX-XX] ...` (ne pas supprimer).

Rapport final : tableau avant/après vérifié, bundle Δ, incidents notables.

```

```
