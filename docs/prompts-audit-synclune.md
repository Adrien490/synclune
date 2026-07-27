# Prompts d’audit Synclune / `synclune-bijoux`

Objectif : copier-coller un prompt dans Claude Code pour auditer un point précis du projet Synclune.

**156 prompts, trois blocs** : **01 → 99** métier, conformité et plomberie · **100 → 128** interfaces
(UI/UX mobile et desktop) · **129 → 156** architecture Next 16, fiabilité, sécurité, outillage et
exploitation. Le catalogue couvre l'intégralité du repo : toute zone sans prompt est un oubli à signaler.

Format attendu pour chaque audit :

- inspecter réellement le repo ;
- citer les fichiers consultés ;
- noter le point sur 100 ;
- classer les problèmes en P0 / P1 / P2 / P3 ;
- proposer corrections, améliorations et tests ;
- rester concret, simple et actionnable.

Contexte rapide :

- E-commerce de bijoux artisanaux.
- Stack : Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL Neon, Stripe, Better Auth, TanStack Form, Zod, Zustand, shadcn/ui, Tailwind, Motion.
- Modules critiques : cart, orders, payments, webhooks, auth, discounts, refunds, invoices, emails, cron, media, wishlist.
- Points critiques : paiement Stripe, webhooks idempotents, stock, commandes, factures, avoirs, RGPD, emails transactionnels, admin, sécurité.

### Les 24 modules réels (`modules/`)

`addresses`, `auth`, `cart`, `collections`, `colors`, `cron`, `dashboard`, `discounts`, `emails`, `invoices`,
`materials`, `media`, `notifications`, `orders`, `payments`, `product-types`, `products`, `refunds`,
`reviews`, `skus`, `store-settings`, `users`, `webhooks`, `wishlist`.

> ⚠️ Il n'existe **pas** de module `admin`, `catalog`, `search`, `shipping`, `stock`, `analytics`, `disputes`,
> `account`. L'admin est un **arbre de routes** (`app/admin/**`) qui consomme les modules
> métier ; l'analytics vit dans `modules/dashboard/**` ; le stock dans `modules/skus/**` ; la livraison, le
> tracking et les litiges dans `modules/orders/**` + `modules/webhooks/**` + `modules/cron/**` ;
> la facturation dans `modules/invoices/**` ; l'espace client dans `app/(account)/**` + `modules/users/**`.
> **Le filesystem fait foi** : vérifie chaque chemin cité dans un prompt avant de t'y fier.

### Positionnement vs `docs/AUDIT-PROMPTS.md`

Les deux fichiers sont complémentaires et ne s'utilisent pas dans la même session :

| Fichier                     | Registre                 | Sortie attendue                                           |
| --------------------------- | ------------------------ | --------------------------------------------------------- |
| `prompts-audit-synclune.md` | **ciblé, diagnostic**    | un rapport noté /100 + P0-P3 + correctifs proposés        |
| `AUDIT-PROMPTS.md`          | **large, transformatif** | le modèle audite, **conçoit, implémente, teste** et merge |

Règle simple : utilise **ce fichier** pour savoir _où ça fait mal_ (rapport, pas de refonte), et
`AUDIT-PROMPTS.md` quand tu veux qu'une surface soit **effectivement refondue**. Un audit de ce fichier est
un bon point d'entrée avant de lancer la mission large correspondante.

---

## 01 — Qualité métier e-commerce globale - DONE

```text
Audit le point « Qualité métier e-commerce globale » dans Synclune.

Vérifie que les parcours principaux sont cohérents : découverte produit, ajout panier, checkout, paiement Stripe, confirmation commande, email, facture, compte client et admin.

Inspecte `app/(shop)/**`, `app/paiement/**`, `modules/cart/**`, `modules/orders/**`, `modules/payments/**`, `modules/webhooks/**`.

Note /100, donne les preuves, problèmes P0/P1/P2/P3, corrections et tests à ajouter.
```

---

## 02 — Catalogue produits : DONE

```text
Audit le point « Catalogue produits » dans Synclune.

Vérifie produits, statuts DRAFT/PUBLIC/ARCHIVED, soft delete, collections, types, SEO, images, accessibilité et cohérence storefront/admin.

Inspecte `modules/products/**`, `modules/product-types/**`, `modules/collections/**`, `app/(shop)/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 03 — SKUs et variantes

```text
Audit le point « SKUs et variantes » dans Synclune.

Vérifie SKU unique, prix en centimes, stock, isDefault, couleurs/matériaux multi, taille, images, soft delete, validations et contraintes DB.

Inspecte `modules/skus/**`, `modules/products/**`, `prisma/schema.prisma`, les migrations SQL et tests SKU.

Note /100, classe les risques stock/prix en P0/P1.
```

---

## 04 — Prix et format monétaire - DONE

```text
Audit le point « Prix et format monétaire » dans Synclune.

Vérifie que tous les prix sont stockés en centimes, formatés en EUR, jamais en float dangereux, et que les prix affichés correspondent aux prix payés.

Inspecte `modules/cart/**`, `modules/orders/**`, `modules/payments/**`, `shared/utils/**`, `shared/constants/**`.

Note /100, propose corrections/améliorations si pertinent et tests d’arrondis.
```

---

## 05 — Panier invité et connecté - DONE

```text
Audit le point « Panier invité et connecté » dans Synclune.

Vérifie panier sessionId/userId, fusion éventuelle après login, expiration, quantité, prix snapshot `priceAtAdd`, stock, code promo et purge.

Inspecte `modules/cart/**`, `shared/stores/**`, cookies, `prisma/schema.prisma` et tests cart.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 06 — Validation stock panier

```text
Audit le point « Validation stock panier » dans Synclune.

Vérifie que le stock est validé à l’ajout, à la modification, avant checkout et au moment de création commande, sans vendre plus que le stock disponible.

Inspecte `modules/cart/**`, `modules/payments/**`, `modules/orders/**`, `modules/skus/**`, services de validation SKU et tests critiques.

Note /100, classe toute survente possible en P0.
```

---

## 07 — Checkout Stripe Elements

```text
Audit le point « Checkout Stripe Elements » dans Synclune.

Vérifie création PaymentIntent, montant, devise EUR, metadata, client secret, validation panier, shipping, discounts et erreurs Stripe.

Inspecte `modules/payments/**`, `app/paiement/**`, `app/api/**`, `shared/lib/stripe*`.

Note /100, propose corrections/améliorations si pertinent et tests critiques.
```

---

## 08 — Montant Stripe vs commande - DONE

```text
Audit le point « Montant Stripe vs montant commande » dans Synclune.

Vérifie que le montant encaissé Stripe correspond au total Order, que les écarts sont détectés, que le surpaiement est géré et qu’aucune commande payée n’est créée manuellement.

Inspecte `modules/payments/**`, `modules/orders/**`, `modules/webhooks/**`, services overbilling et tests.

Note /100, classe toute divergence non gérée en P0.
```

---

## 09 — Webhooks Stripe - DONE

```text
Audit le point « Webhooks Stripe » dans Synclune.

Vérifie signature Stripe, idempotence, ordre des événements, retry, DLQ, erreurs, logs, absence de double commande, double facture ou double email.

Inspecte `app/api/webhooks/stripe/**`, `modules/webhooks/**`, `modules/payments/**`, tests webhooks.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 10 — Idempotence paiement et webhooks

```text
Audit le point « Idempotence paiement et webhooks » dans Synclune.

Vérifie que rejouer un webhook Stripe ou une action critique ne crée pas de doublon : commande, paiement, facture, avoir, refund, email, stock movement.

Inspecte `modules/webhooks/**`, `modules/orders/**`, `modules/invoices/**`, `modules/refunds/**`, `modules/emails/**`.

Note /100, classe les doublons financiers en P0.
```

---

## 11 — Création de commande

```text
Audit le point « Création de commande » dans Synclune.

Vérifie transaction atomique : lock stock, création Order, OrderItem snapshots, discount usage, adresses snapshot, total, Stripe PaymentIntent et historique.

Inspecte `modules/payments/services/order-creation.service.ts`, `modules/orders/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent et tests transactionnels.
```

---

## 12 — Snapshots OrderItem

```text
Audit le point « Snapshots OrderItem » dans Synclune.

Vérifie que productTitle, productImageUrl, skuColor, skuMaterial, skuSize et price sont figés au checkout et ne changent jamais après mutation produit/SKU.

Inspecte `modules/orders/**`, `modules/payments/**`, `prisma/schema.prisma`, tests order item.

Note /100, classe toute dépendance dynamique produit après commande en P0/P1.
```

---

## 13 — Snapshots adresses commande

```text
Audit le point « Snapshots adresses commande » dans Synclune.

Vérifie que les adresses de livraison/facturation sont copiées sur Order au checkout et restent figées même si le client modifie ses adresses.

Inspecte `modules/orders/**`, `modules/addresses/**`, `app/(account)/adresses/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 14 — Statuts commande

```text
Audit le point « Statuts commande » dans Synclune.

Vérifie transitions OrderStatus, PaymentStatus, FulfillmentStatus, droits admin, historique, emails, cache invalidation et erreurs.

Inspecte `modules/orders/**`, `app/admin/ventes/commandes/**`, `modules/webhooks/**`, `modules/emails/**`.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 15 — Invalidation cache commandes

```text
Audit le point « Invalidation cache commandes » dans Synclune.

Vérifie que toute mutation Order.status/paymentStatus invalide via `getOrderInvalidationTags(userId, orderId)` et jamais via tags écrits à la main.

Inspecte `modules/orders/constants/cache.ts`, `modules/orders/**`, `modules/webhooks/**`, `modules/cron/**`.

Note /100, classe toute invalidation partielle en P1/P0 selon impact.
```

---

## 16 — Cache catalogue

```text
Audit le point « Cache catalogue » dans Synclune.

Vérifie `use cache`, `cacheLife("catalog")`, `cacheTag`, invalidation produits/SKUs/collections et absence de données privées dans le cache public.

Inspecte `modules/products/data/**`, `modules/collections/data/**`, `modules/skus/data/**`, `shared/data/**`.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 17 — Cache utilisateur et checkout

```text
Audit le point « Cache utilisateur et checkout » dans Synclune.

Vérifie `use cache: private`, cache profile `checkout`, données user-scoped, panier, session, stock validation et confirmation commande.

Inspecte `modules/cart/**`, `modules/orders/data/**`, `modules/users/**`, `app/(account)/**`, `shared/lib/cache*`.

Note /100, classe toute fuite cross-user en P0.
```

---

## 18 — Usage correct de `use cache`, `cacheLife`, `cacheTag`

```text
Audit le point « Usage correct du cache Next.js » dans Synclune.

Vérifie tous les usages de `use cache`, `use cache: private`, `cacheLife`, `cacheTag`, `updateTag`, `revalidateTag`.

Inspecte tout le repo avec recherche globale.

Note /100, propose corrections/améliorations si pertinent et tests de cache.
```

---

## 19 — Auth Better Auth

```text
Audit le point « Auth Better Auth » dans Synclune.

Vérifie email/password, Google, sessions, cookies, email verification, password reset, comptes suspendus, comptes supprimés et sécurité des flux.

Inspecte `modules/auth/**`, `app/api/auth/**`, `app/(auth)/**`, config Better Auth.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 20 — Admin role et re-check DB

```text
Audit le point « Admin role et re-check DB » dans Synclune.

Vérifie que les chemins privilégiés ne font jamais confiance à `session.user.role` et passent par `requireAdmin*` avec re-vérification DB.

Inspecte `modules/auth/lib/require-auth*`, `app/admin/**`, Server Actions et routes API admin.

Note /100, classe toute confiance directe au cookie/session en P0/P1.
```

---

## 21 — Comptes suspendus / inactifs / suppression

```text
Audit le point « Statuts de compte » dans Synclune.

Vérifie `ACTIVE`, `INACTIVE`, `PENDING_DELETION`, `ANONYMIZED`, `suspendedAt`, accès aux routes, checkout, espace client et admin.

Inspecte `modules/auth/**`, `modules/users/**`, `app/(account)/**`, `modules/cart/**`, `modules/orders/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 22 — Server Actions sécurisées

```text
Audit le point « Server Actions sécurisées » dans Synclune.

Vérifie auth/admin, validation Zod, `validateInput`, gestion d’erreurs, rate limit, mutations Prisma, cache invalidation et messages français.

Inspecte toutes les `modules/**/actions/**` et `shared/lib/actions/**`.

Note /100, liste actions conformes/non conformes.
```

---

## 23 — Validation Zod

```text
Audit le point « Validation Zod » dans Synclune.

Vérifie que les inputs formulaires, actions, API routes, checkout, adresses, téléphone, discounts, remboursements et admin sont validés avec Zod.

Inspecte `modules/**/schemas/**`, `shared/schemas/**`, actions et routes API.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 24 — Formulaires TanStack Form - DONE

```text
Audit le point « Formulaires TanStack Form » dans Synclune.

Vérifie formulaires auth, checkout, adresse, admin produit/SKU, discounts, refunds : validation, erreurs, loading, double submit, accessibilité.

Inspecte `shared/components/forms/**`, `shared/lib/form-context`, `modules/**/components/**`.

Note /100, propose corrections/améliorations si pertinent UX et tests.
```

---

## 25 — Sécurité CSRF

```text
Audit le point « Protection CSRF » dans Synclune.

Vérifie que les Server Actions et routes mutatives sont protégées contre les origines non autorisées et que les cookies auth ne suffisent pas à attaquer une mutation.

Inspecte `shared/lib/actions/**`, `modules/auth/**`, Server Actions et routes API mutatives.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 26 — Rate limiting

```text
Audit le point « Rate limiting » dans Synclune.

Vérifie les limites sur auth, search, checkout, discounts, admin actions, refunds, upload, emails et webhooks si pertinent.

Inspecte `shared/lib/rate-limit*`, actions, routes API et tests.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 27 — CSP et headers sécurité

```text
Audit le point « CSP et headers de sécurité » dans Synclune.

Vérifie Content-Security-Policy, headers sécurité, compatibilité Stripe, Sentry, UploadThing, Resend, images, scripts Next et next-themes si présent.

Inspecte `next.config.*`, middleware/proxy, layouts, instrumentation Sentry.

Note /100, propose plan CSP.
```

---

## 28 — Secrets et variables d’environnement

```text
Audit le point « Secrets et variables d’environnement » dans Synclune.

Vérifie que Stripe secret, Resend, database, Better Auth, UploadThing, Sentry et clés privées ne sont jamais exposés côté client.

Inspecte `.env.example`, `shared/lib/env*`, `next.config.*`, imports `process.env`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 29 — RGPD client

```text
Audit le point « RGPD client » dans Synclune.

Vérifie consentement CGV/confidentialité, suppression de compte, anonymisation, conservation légale, PII, droits utilisateur et purge opérationnelle.

Inspecte `modules/users/**`, `app/(account)/**`, `modules/auth/**`, `modules/cron/**`, `modules/orders/**`, `prisma/schema.prisma`.

Note /100, classe les risques RGPD en P0/P1.
```

---

## 30 — Rétention PII 10 ans

```text
Audit le point « Rétention PII 10 ans » dans Synclune.

Vérifie que la PII opérationnelle est scrubée au bon moment, que les données légales de facture sont conservées selon obligation, puis purgées à échéance.

Inspecte cron `hard-delete-retention`, services RGPD, modèles Order/User/Address, tests.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 31 — Facturation légale

```text
Audit le point « Facturation légale » dans Synclune.

Vérifie création de facture uniquement via services autorisés, numérotation `F-YYYY-NNNNN`, snapshot vendeur, snapshot invoiceData, PDF archivé et hash.

Inspecte `modules/invoices/**`, `modules/orders/**`, `app/api/orders/[orderNumber]/invoice/**`, `prisma/schema.prisma`.

Note /100, classe tout risque fiscal en P0.
```

---

## 32 — Numérotation gap-free factures

```text
Audit le point « Numérotation gap-free factures » dans Synclune.

Vérifie advisory locks Postgres, séquence annuelle, contraintes format, absence de génération concurrente dangereuse et tests de concurrence.

Inspecte `modules/invoices/**`, migrations SQL, Prisma, tests facturation.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 33 — Avoirs / credit notes

```text
Audit le point « Avoirs / credit notes » dans Synclune.

Vérifie génération `A-YYYY-NNNNN`, aucun avoir manuel, intégration avec annulation/remboursement total, PDF avoir, hash et archivage.

Inspecte `modules/refunds/**`, `modules/invoices/**`, `modules/orders/**`, webhooks `charge.refunded`.

Note /100, classe les risques fiscaux en P0.
```

---

## 34 — PDF facture immuable

```text
Audit le point « PDF facture immuable » dans Synclune.

Vérifie génération, archivage UploadThing, SHA-256, serving du PDF archivé en priorité, fallback contrôlé et absence de modification post-paiement.

Inspecte `modules/invoices/**`, `modules/orders/services/archive-invoice-pdf*`, routes invoice, UploadThing.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 35 — Interdiction vente manuelle / caisse

```text
Audit le point « Interdiction vente manuelle / caisse » dans Synclune.

Vérifie qu’aucune Server Action, route API, seed ou admin ne peut créer une commande payée sans Stripe PaymentIntent.

Inspecte `modules/orders/**`, `modules/payments/**`, `app/admin/**`, `prisma/seed*`, routes API.

Note /100, classe toute vente manuelle en P0.
```

---

## 36 — Remboursements Stripe

```text
Audit le point « Remboursements Stripe » dans Synclune.

Vérifie remboursements partiels/totaux, idempotence, statuts Refund, emails, avoirs, webhooks, reconciliation et erreurs Stripe.

Inspecte `modules/refunds/**`, `modules/payments/**`, `modules/webhooks/**`, tests refunds.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 37 — Litiges Stripe

```text
Audit le point « Litiges Stripe » dans Synclune.

Vérifie gestion dispute opened/resolved, alertes admin, historique commande, monitoring, deadline et absence de double traitement.

Inspecte `modules/orders/actions/**` (litiges), `modules/refunds/**`, `modules/webhooks/**`, `modules/cron/services/**` (`alert-dispute-deadlines`), `modules/dashboard/**`, emails admin.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 38 — Réconciliation paiements

```text
Audit le point « Réconciliation paiements » dans Synclune.

Vérifie crons sync-async-payments, retry webhooks, retry post-webhook tasks, overbilling, stuck orders et cohérence Stripe/DB.

Inspecte `modules/cron/**`, `modules/payments/**`, `modules/webhooks/**`, tests cron.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 39 — E-reporting B2C ⏳ (à construire, pas à auditer)

> ⚠️ **Retiré du code le 2026-07-26** (right-sizing) : l'implémentation était en dry-run intégral,
> écrite contre une spec non figée. Ce prompt n'a plus d'objet tant que l'arrêté définitif n'est pas
> publié et qu'aucune Plateforme Agréée n'est contractualisée. Voir la mission `INVOICE-GOLIVE` de
> [`docs/AUDIT-PROMPTS.md`](AUDIT-PROMPTS.md) et [`docs/RUNBOOK.md § e-reporting`](RUNBOOK.md).

---

## 40 — Franchise TVA micro-entreprise : DONE

```text
Audit le point « Franchise TVA micro-entreprise » dans Synclune.

Vérifie TVA à 0, mention Art. 293 B, seuil 85 000 €, constantes SSOT, snapshots vendeur et préparation sortie de franchise.

Inspecte `shared/constants/vat-franchise.ts`, `modules/invoices/**`, `modules/orders/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent/améliorations si pertinent.
```

---

## 41 — Cron jobs

```text
Audit le point « Cron jobs » dans Synclune.

Vérifie les 11 crons, cohérence `vercel.json` vs `modules/cron/constants/schedules.ts`, guard cron, Sentry Cron Monitoring, idempotence et logs.

Inspecte `app/api/cron/**`, `modules/cron/**`, `vercel.json`, tests schedules.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 42 — Emails transactionnels

```text
Audit le point « Emails transactionnels » dans Synclune.

Vérifie order confirmation, shipping, cancel, refund, payment failed, auth emails, back-in-stock, review request, contenu, erreurs et idempotence.

Inspecte `emails/**`, `modules/emails/**`, `shared/lib/email-config.ts`, services d’envoi.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 43 — Emails marketing et désinscription

```text
Audit le point « Emails marketing et désinscription » dans Synclune.

Vérifie List-Unsubscribe, One-Click, Precedence, Auto-Submitted, endpoint `/notifications/desinscription`, token HMAC et persistance `User.marketingOptOutAt` (Art. 21(3) RGPD) filtrée par les émetteurs marketing.

Inspecte `modules/emails/**`, routes notifications, config Resend.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 44 — Emails admin alert

```text
Audit le point « Emails admin alert » dans Synclune.

Vérifie le template polyvalent AdminAlertEmail, sous-types, idempotence, contenu actionnable, absence de PII excessive et déclencheurs critiques.

Inspecte `emails/admin-alert*`, `modules/emails/**`, `modules/cron/**`, `modules/webhooks/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 45 — UploadThing et médias - DONE

```text
Audit le point « UploadThing et médias » dans Synclune.

Vérifie upload images/vidéos, permissions admin, validation type/taille, HEIC conversion, sharp, thumbnails, alt text, sécurité et suppression.

Inspecte `app/api/uploadthing/**`, `modules/media/**`, `modules/products/**`, `shared/schemas/media*`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 46 — Images produit et performance - DONE

```text
Audit le point « Images produit et performance » dans Synclune.

Vérifie next/image, tailles, blurDataUrl/thumbhash, thumbnails vidéo, lazy loading, sitemap images et qualité UX storefront.

Inspecte composants produit, `SkuMedia`, scripts thumbnails, sitemap images.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 47 — Wishlist et back-in-stock

```text
Audit le point « Wishlist et back-in-stock » dans Synclune.

Vérifie favoris invité/connecté, sessionId/userId, produit supprimé, notification retour stock, idempotence email et RGPD.

Inspecte `modules/wishlist/**`, `modules/emails/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 48 — Codes promo / discounts - DONE

```text
Audit le point « Codes promo / discounts » dans Synclune.

Vérifie validation code, usage limits, userId optional, panier, checkout, Order.discountAmount, DiscountUsage, cache et erreurs.

Inspecte `modules/discounts/**`, `modules/cart/**`, `modules/orders/**`, tests critical.

Note /100, classe les pertes financières en P0/P1.
```

---

## 49 — Livraison et tracking

```text
Audit le point « Livraison et tracking » dans Synclune.

Vérifie modes de livraison, shippingCost, transporteur, tracking number/url, emails shipping, statuts fulfillment et espace client.

Inspecte `modules/orders/**` (schemas/services/composants shipping + tracking), `modules/emails/**`, `app/(account)/commandes/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 50 — Click and collect

```text
Audit le point « Click and collect » dans Synclune.

Vérifie CartFulfillmentType, shippingCost, adresse requise ou non, checkout, confirmation, email, admin order detail.

Inspecte `modules/cart/**`, `modules/orders/**`, `modules/payments/**`, UI checkout.

Note /100, propose corrections/améliorations si pertinent et tests.
```

---

## 51 — Admin catalogue

```text
Audit le point « Admin catalogue » dans Synclune.

Vérifie CRUD produits, SKUs, collections, types, couleurs, matériaux, médias, statuts, soft delete, validations et permissions admin.

Inspecte `app/admin/catalogue/**`, `modules/products/**`, `modules/skus/**`, `modules/collections/**`, `modules/colors/**`, `modules/materials/**`, `modules/product-types/**`, `modules/media/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 52 — Admin commandes

```text
Audit le point « Admin commandes » dans Synclune.

Vérifie listing, filtres, détail, statut, remboursement, factures, avoirs, historique, notes, exports CSV et permissions.

Inspecte `modules/orders/**`, `app/admin/ventes/**`, `modules/refunds/**`, `modules/invoices/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 53 — Analytics admin

```text
Audit le point « Analytics admin » dans Synclune.

Vérifie KPIs, revenue chart, commandes récentes, action items, filtres, performance, données exactes et absence de double comptage refunds.

Inspecte `modules/dashboard/**`, `app/admin/(dashboard)/**`, `modules/orders/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 54 — Recherche storefront/admin

```text
Audit le point « Recherche » dans Synclune.

Vérifie la recherche produits (Server Action, PAS de route `/api/search` — elle n'existe pas), la recherche admin, la sécurité, le rate limit, la pagination, la pertinence, l'accessibilité et la performance.

Inspecte `modules/products/actions/quick-search.ts`, `modules/products/data/{quick-search-products,get-quick-search-data,fuzzy-search}.ts`, `modules/products/components/quick-search-dialog/**`, `shared/components/search-input.tsx`, `shared/components/autocomplete/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 55 — SEO storefront

```text
Audit le point « SEO storefront » dans Synclune.

Vérifie metadata, Open Graph, sitemap, sitemap images, robots, canonical, structured data Product, collections, performance et pages légales.

Inspecte `app/(shop)/**`, `app/sitemap*`, `app/robots*`, SEO constants.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 56 — Pages légales

```text
Audit le point « Pages légales » dans Synclune.

Vérifie CGV, mentions légales, confidentialité, cookies, livraison, retours, micro-entreprise, TVA non applicable et conformité e-commerce.

Inspecte `app/(legal)/**`, contenus, liens footer et checkout.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 57 — UI design system

```text
Audit le point « UI design system » dans Synclune.

Vérifie shadcn/ui, Radix, Tailwind, variants, boutons, inputs, dialogs, drawers, badges, tables, focus, disabled, loading et cohérence visuelle.

Inspecte `shared/components/ui/**`, `shared/components/**`, modules UI.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 58 — Accessibilité globale

```text
Audit le point « Accessibilité globale » dans Synclune.

Vérifie clavier, focus, labels, erreurs, contrastes, modales Radix/Vaul, carrousels, formulaires checkout, produit, admin et tests axe.

Inspecte composants UI, tests Playwright axe, pages principales.

Note /100, propose corrections/améliorations si pertinent WCAG.
```

---

## 59 — Accessibilité checkout

```text
Audit le point « Accessibilité checkout » dans Synclune.

Vérifie formulaire adresse, téléphone, livraison, code promo, Stripe Elements, erreurs, focus, clavier, mobile et lecteurs d’écran.

Inspecte `app/paiement/**`, `modules/cart/**`, `modules/payments/**`, composants checkout.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 60 — Performance Web Vitals

```text
Audit le point « Performance Web Vitals » dans Synclune.

Vérifie LCP, INP, CLS, images produits, carrousels, hydration, Server Components, fonts, Motion, Recharts, Sentry et analytics.

Inspecte `app/(shop)/**`, composants client, `next.config.*`, instrumentation.

Note /100, propose optimisations.
```

---

## 61 — Bundle size

```text
Audit le point « Taille du bundle » dans Synclune.

Vérifie imports lourds : Stripe, Recharts, jspdf, UploadThing, heic-to, sharp, lightbox, Embla, Motion, Radix, lucide-react.

Inspecte imports, routes concernées, `size-limit`, `analyse`.

Note /100, propose lazy loading/dynamic imports.
```

---

## 62 — React 19 et React Compiler

```text
Audit le point « React 19 et React Compiler » dans Synclune.

Vérifie absence de `useMemo`, `useCallback`, `React.memo`, compatibilité avec React Compiler, version React 19.2.7, composants purs et doctor scripts.

Inspecte `package.json`, `next.config.*`, `app/**`, `modules/**`, `shared/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 63 — TypeScript

```text
Audit le point « Qualité TypeScript » dans Synclune.

Vérifie strictness, `any`, casts dangereux, `@ts-ignore`, types Prisma, types ActionState, enums, exhaustivité et types partagés.

Inspecte `tsconfig.json`, `modules/**`, `shared/types/**`, `app/generated/prisma`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 64 — Prisma schema et contraintes DB

```text
Audit le point « Prisma schema et contraintes DB » dans Synclune.

Vérifie modèles, relations, soft delete, indexes utiles, contraintes CHECK SQL brutes, uniques partiels, commentaires d’audit et cohérence migrations.

Inspecte `prisma/schema.prisma`, `prisma/migrations/**`, `shared/lib/prisma`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 65 — Migrations et rollback

```text
Audit le point « Migrations et rollback » dans Synclune.

Vérifie que chaque nouvelle migration a un `down.sql`, que les migrations critiques sont sûres et que le rollback est documenté.

Inspecte `prisma/migrations/**`, docs runbook et scripts DB.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 66 — Transactions Prisma longues

```text
Audit le point « Transactions Prisma longues » dans Synclune.

Vérifie usage de `TX_TIMEOUT_LONG` et `TX_MAX_WAIT_LONG` pour transactions bulk, locks, Stripe, webhooks ou I/O externe.

Inspecte `shared/lib/prisma`, services transactionnels, webhooks, refunds, invoices, orders.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 67 — Soft delete

```text
Audit le point « Soft delete » dans Synclune.

Vérifie `deletedAt`, helpers `notDeleted`, `softDelete`, conservation commandes, produits/SKUs archivés et absence de suppression physique dangereuse.

Inspecte `shared/lib/prisma`, modules products/orders/users, actions admin.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 68 — OrderHistory immuable

```text
Audit le point « OrderHistory immuable » dans Synclune.

Vérifie qu’OrderHistory n’est jamais update/delete, qu’il trace les actions critiques, source, auteur, statut, facture, refund et litiges.

Inspecte `modules/orders/**`, `modules/webhooks/**`, `modules/refunds/**`, `prisma/schema.prisma`.

Note /100, classe toute mutation historique en P0.
```

---

## 69 — Stock movements

```text
Audit le point « Stock movements » dans Synclune.

Vérifie journal des ajustements manuels, cohérence delta, non-négativité, admin, auteur, raisons, limites du journal et tests.

Inspecte `modules/skus/**` (stock + mouvements), `modules/orders/**`, `prisma/schema.prisma`, migrations CHECK.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 70 — Tests unitaires

```text
Audit le point « Tests unitaires » dans Synclune.

Vérifie couverture helpers, schemas, formatters, pricing, cart, discounts, invoices, refunds, email helpers, services purs et Prisma query builders.

Inspecte `*.test.ts(x)`, `__tests__`, config Vitest et coverage.

Note /100, liste les tests manquants.
```

---

## 71 — Tests critiques

```text
Audit le point « Tests critiques » dans Synclune.

Vérifie que `pnpm test:critical` couvre cart, orders, payments, webhooks, auth, discounts, refunds, invoices et contrats.

Inspecte `package.json`, tests des modules critiques et `test/contract`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 72 — Tests intégration

```text
Audit le point « Tests intégration » dans Synclune.

Vérifie `vitest.integration.config.ts`, DB test, Prisma, transactions, webhooks, checkout, emails, cron et isolation des données.

Inspecte config intégration et tests concernés.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 73 — Tests E2E Playwright

```text
Audit le point « Tests E2E Playwright » dans Synclune.

Vérifie parcours storefront, produit, panier, checkout Stripe mock, confirmation, compte, admin, mobile, accessibilité et erreurs.

Inspecte `e2e/**`, `playwright.config.*`, mocks Stripe et tests axe.

Note /100, propose scénarios manquants.
```

---

## 74 — Tests accessibilité

```text
Audit le point « Tests accessibilité » dans Synclune.

Vérifie usage de `@axe-core/playwright` et `vitest-axe`, pages shop, produit, panier, checkout, admin, auth et account.

Inspecte tests axe existants et composants UI.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 75 — Coverage

```text
Audit le point « Coverage » dans Synclune.

Vérifie `pnpm test:coverage`, seuils éventuels, coverage des modules critiques, absence de trous sur payments/webhooks/invoices/refunds.

Inspecte config Vitest, rapports coverage et tests.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 76 — CI/CD

```text
Audit le point « CI/CD » dans Synclune.

Vérifie que la CI lance lint, typecheck, format:check, tests critiques, coverage, build, size, e2e, Prisma generate et migrations si pertinent.

Inspecte `.github/workflows/**`, `package.json`, scripts et docs release.

Note /100, propose améliorations pipeline.
```

---

## 77 — Knip et dépendances inutiles

```text
Audit le point « Knip et dépendances inutiles » dans Synclune.

Vérifie `pnpm knip`, dépendances mortes, exports inutilisés, fichiers orphelins et exceptions justifiées.

Inspecte config knip, package.json et résultats.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 78 — Supply chain

```text
Audit le point « Supply chain » dans Synclune.

Vérifie pnpm lockfile, audit, dépendances sensibles, onlyBuiltDependencies, Stripe, Prisma, Better Auth, UploadThing, Sentry et scripts postinstall/build.

Inspecte `package.json`, `pnpm-lock.yaml`, config audit/Dependabot si présente.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 79 — Observabilité Sentry

```text
Audit le point « Observabilité Sentry » dans Synclune.

Vérifie instrumentation server/client, tunnel `/monitoring`, release, source maps, tags métier, erreurs Stripe/webhook/cron/email et absence de PII.

Inspecte `instrumentation*`, `next.config.*`, `shared/lib/logger*`, usages Sentry.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 80 — Logging pino

```text
Audit le point « Logging pino » dans Synclune.

Vérifie logs structurés, niveaux, contexte métier, absence de secrets/PII, Stripe IDs raisonnables, orderNumber, refundId, webhook event id.

Inspecte `shared/lib/logger*`, modules critiques et handlers.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 81 — Confidentialité données

```text
Audit le point « Confidentialité données » dans Synclune.

Vérifie PII, emails, adresses, téléphone, tokens, Stripe secrets, logs, Sentry, analytics, localStorage, Zustand persist et exports.

Inspecte modules auth/account/orders/payments, stores, logging, Sentry et analytics.

Note /100, classe les fuites en P0/P1.
```

---

## 82 — Zustand stores

```text
Audit le point « Zustand stores » dans Synclune.

Vérifie les 9 stores, données persistées, purge, confidentialité, hydratation, UX, badge counts, dialogs/sheets et bulk pending admin.

Inspecte `shared/stores/**`, providers, modules utilisant les stores.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 83 — Responsive mobile

```text
Audit le point « Responsive mobile » dans Synclune.

Vérifie storefront, produit, galerie, panier, checkout, compte, admin, dialogs/drawers, boutons tactiles et performance mobile.

Inspecte composants UI, pages principales et tests viewport mobile.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 84 — Carrousels et galeries

```text
Audit le point « Carrousels et galeries » dans Synclune.

Vérifie Embla, autoplay, lightbox, navigation clavier, swipe mobile, images/vidéos, alt text, performance et reduced motion.

Inspecte composants galerie produit, `yet-another-react-lightbox`, `embla-carousel`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 85 — Animations et reduced motion

```text
Audit le point « Animations et reduced motion » dans Synclune.

Vérifie Motion, animations Tailwind, jank, layout shift, respect `prefers-reduced-motion` et absence d’animation bloquante au checkout.

Inspecte composants animés et CSS global.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 86 — Thème et design visuel

```text
Audit le point « Thème et design visuel » dans Synclune.

Vérifie cohérence visuelle bijouterie/artisanat, couleurs, typographie, cards produit, badges, skeletons, empty states et admin.

Inspecte shared UI, pages shop et admin.

Note /100, propose améliorations simples.
```

---

## 87 — Contenu et microcopy

```text
Audit le point « Contenu et microcopy » dans Synclune.

Vérifie textes FR, boutons, erreurs, confirmations, checkout, emails, messages admin, pages légales et ton de marque.

Inspecte composants, emails et pages légales.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 88 — Localisation française

```text
Audit le point « Localisation française » dans Synclune.

Vérifie formats EUR, dates, téléphone, adresse FR, messages français, devise EUR unique et mentions TVA/franchise.

Inspecte `shared/utils/**`, `shared/constants/**`, invoices, checkout et emails.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 89 — Admin sécurité exports

```text
Audit le point « Sécurité des exports admin » dans Synclune.

Vérifie exports CSV/PDF, permissions, audit OrderHistory, RGPD, injection CSV/Excel, bulk export et absence de PII excessive.

Inspecte `modules/orders/**` (services export CSV), `modules/invoices/**`, `app/admin/ventes/**`, routes export et tests.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 90 — Facture PDF download

```text
Audit le point « Téléchargement facture PDF » dans Synclune.

Vérifie route invoice, droits client/admin, orderNumber, accès invité si nécessaire, audit INVOICE_DOWNLOADED, PDF archivé et erreurs.

Inspecte `app/api/orders/[orderNumber]/invoice/**`, modules invoices/orders/auth.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 91 — Admin refunds et avoirs

```text
Audit le point « Admin refunds et avoirs » dans Synclune.

Vérifie que l’admin peut rembourser correctement sans casser Stripe, statuts, facture, avoir, email et historique.

Inspecte `modules/refunds/**`, `app/admin/ventes/remboursements/**`, `modules/invoices/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 92 — Reviews produits

```text
Audit le point « Avis produits » dans Synclune.

Vérifie avis, modération, review request, stats, publication/hidden, anti-spam, accès client et affichage produit.

Inspecte `modules/reviews/**`, `modules/emails/**`, `prisma/schema.prisma`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 93 — Comptes et espace client

```text
Audit le point « Espace client » dans Synclune.

Vérifie compte, commandes, adresses, wishlist, factures, suppression de compte, sécurité et données user-scoped.

Inspecte `app/(account)/**`, `modules/users/**`, `modules/orders/**`, `modules/addresses/**`, `modules/wishlist/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 94 — Auth emails

```text
Audit le point « Emails d’authentification » dans Synclune.

Vérifie verification email, password reset, expiration tokens, contenu, sécurité, idempotence, rate limit et UX.

Inspecte `emails/**`, `modules/auth/**`, Better Auth config, Resend.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 95 — API routes

```text
Audit le point « API routes » dans Synclune.

Vérifie routes auth, cron, webhooks, search, uploadthing, invoice, sécurité, validation, rate limit, erreurs et permissions.

Inspecte `app/api/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 96 — Robots, sitemap et sitemap images

```text
Audit le point « Robots, sitemap et sitemap images » dans Synclune.

Vérifie sitemap produits/collections/images, URLs publiques uniquement, produits PUBLIC, images valides, canonical et robots.

Inspecte `app/sitemap*`, `app/robots*`, `app/sitemap-images.xml/**`, modules catalog.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 97 — Gestion erreurs globale

```text
Audit le point « Gestion erreurs globale » dans Synclune.

Vérifie erreurs 400/401/403/404/409/422/429/500, Stripe errors, Prisma errors, NotFound, error boundaries, toasts et messages FR.

Inspecte `app/**/error.tsx`, `app/**/not-found.tsx`, `shared/lib/actions/**`, modules critiques.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 98 — Pages paiement confirmation/annulation/retour

```text
Audit le point « Pages paiement » dans Synclune.

Vérifie confirmation, annulation, retour Stripe, récupération commande, sécurité, états pending/failed/paid, facture, email et UX.

Inspecte `app/paiement/**`, `modules/payments/**`, `modules/orders/**`.

Note /100, propose corrections/améliorations si pertinent.
```

---

## 99 — Production readiness globale

```text
Audit le point « Production readiness globale » dans Synclune.

Fais une synthèse globale : sécurité, paiement, stock, webhooks, commandes, factures, avoirs, RGPD, emails, cron, cache, tests, CI, performance et dettes critiques.

Inspecte les fichiers principaux du repo, package.json, CI, Prisma, modules critiques et docs.

Note /100, donne un verdict : OK production, OK avec réserves, à corriger avant release ou bloquant.
```

---

# Interfaces — UI & UX (mobile + desktop)

Les prompts **01 → 99** couvrent surtout le métier, la conformité et la plomberie. Les surfaces les plus
visitées du site (accueil, catalogue, page produit, panier, paiement, espace client, admin) n'y sont
auditées que par leur **angle données** : personne ne regarde l'écran. Les prompts **100 → 128** comblent ce
trou, une surface d'interface à la fois, **mobile et desktop dans le même audit**.

Chaque prompt rend un **verdict par surface** : `GARDER` / `CORRIGER` (retouche chiffrée) / `REFONDRE`
(le pattern lui-même est mauvais). L'objectif n'est pas de polir : c'est de savoir où l'interface tient et
où elle doit changer de forme.

### Index

| #   | Surface                                             | Priorité conversion |
| --- | --------------------------------------------------- | ------------------- |
| 100 | Design tokens & échelle visuelle                    | socle               |
| 101 | Layout, couches fixes & z-index                     | socle               |
| 102 | Navigation storefront — desktop                     | haute               |
| 103 | Navigation storefront — mobile                      | haute               |
| 104 | Vitrine / page d'accueil                            | haute               |
| 105 | Catalogue : grille, tri, pagination                 | haute               |
| 106 | Filtres produits                                    | haute               |
| 107 | Page produit (PDP) — desktop                        | **critique**        |
| 108 | Page produit (PDP) — mobile                         | **critique**        |
| 109 | Sélecteur de variantes (SKU)                        | **critique**        |
| 110 | Panier                                              | **critique**        |
| 111 | Tunnel de paiement                                  | **critique**        |
| 112 | Pages post-achat                                    | haute               |
| 113 | Espace client                                       | moyenne             |
| 114 | Écrans d'authentification                           | haute               |
| 115 | Favoris & retour en stock                           | moyenne             |
| 116 | Avis produits                                       | moyenne             |
| 117 | Recherche                                           | haute               |
| 118 | Overlays : dialogs, sheets, drawers                 | socle               |
| 119 | Feedback : toasts, squelettes, états vides, erreurs | socle               |
| 120 | Formulaires : ergonomie mobile & clavier            | haute               |
| 121 | Admin : shell & navigation                          | interne             |
| 122 | Admin : listes, tableaux & actions groupées         | interne             |
| 123 | Admin : formulaires & pages de détail               | interne             |
| 124 | Admin : dashboard & data-viz                        | interne             |
| 125 | Gestes tactiles & haptique                          | moyenne             |
| 126 | Confort desktop : densité, largeurs, zoom           | moyenne             |
| 127 | Bannières système & modes dégradés                  | moyenne             |
| 128 | Cohérence cross-surface & plan de refonte           | synthèse            |

---

## Préambule UI/UX — à coller en tête de CHAQUE prompt 100 → 128

```text
Préambule UI/UX Synclune.

Tu audites une INTERFACE, pas seulement du code. Contraintes de méthode :

1. REGARDE VRAIMENT L'ÉCRAN. Lance `pnpm dev`, puis capture avec Playwright (spec jetable dans `e2e/`
   ou `npx playwright screenshot`) aux viewports de référence : 360x740 (petit Android), 375x667
   (iPhone SE), 390x844 (iPhone 14), 768x1024 (iPad portrait), 1024x768 (iPad paysage), 1280x800,
   1440x900, 1920x1080. Un audit UI sans capture est incomplet — si tu n'as pas pu en produire, dis-le
   explicitement au lieu de déduire l'apparence du code.
2. TESTE LES DEUX ENTRÉES : souris + clavier ET tactile. `playwright.config.ts` fournit déjà les
   projets `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 7), `mobile-webkit` (iPhone 14) et
   `authenticated-user-mobile` — réutilise-les plutôt que d'en créer.
3. LE FILESYSTEM FAIT FOI. Vérifie chaque chemin avant de t'y fier. Il n'existe PAS de module `admin`,
   `search`, `shipping`, `stock`, `analytics`, `account`, `catalog` : l'admin est un arbre de routes
   (`app/admin/**`), l'analytics vit dans `modules/dashboard/**`, l'espace client dans
   `app/(account)/**` + `modules/users/**`.
4. TOKENS = SSOT. Toute valeur visuelle doit venir du bloc `@theme` de `app/globals.css` :
   `--navbar-height`, `--announcement-bar-height`, `--bottom-bar-height`, `--admin-header-height`,
   `--fab-corner-clearance`, `--toast-safe-top`, `--z-*`, `--duration-*`, `--ease-*`, `--text-2xs`,
   `--breakpoint-xs`, couleurs `oklch`. Toute valeur magique en dur dans un composant est un défaut à
   signaler avec son fichier:ligne.
5. THÈME CLAIR UNIQUEMENT. Il n'y a aucun dark mode (pas de `next-themes`, aucun
   `prefers-color-scheme` dans `app/globals.css`). Ne propose pas de dark mode dans le corps de
   l'audit ; si tu l'estimes pertinent, mets-le en annexe « chantier séparé » avec son coût.
6. REACT 19 + REACT COMPILER : jamais de `useMemo`, `useCallback`, `React.memo`. Textes d'UI en
   français, code en anglais, indentation par tabulations.
7. PARTIS PRIS DÉJÀ ARBITRÉS par le propriétaire du projet. Ne les « corrige » jamais en silence ; tu
   peux les rouvrir, mais uniquement nommés comme proposition explicite et argumentée :
   - pas de cursor-follow ni de chevron « scroll » sur le Hero ;
   - pas de View Transition sur fermeture Vaul, ni sur `onSelect` Embla, ni hero flottant → PDP ;
   - pas de `Drawer` pour les confirmations (AlertDialog), pas de `handleOnly` sur Drawer/Sheet ;
   - pas d'`autoFocus` dans les formulaires ;
   - pas de double bouton retour en admin mobile, pas de bouton Cancel sur les formulaires de
     création admin ;
   - pas d'icônes sur le bandeau de réassurance du Hero ;
   - haptique parcimonieuse : jamais sur une action passive ou un simple affichage ;
   - patterns natifs 2026 préférés aux rustines cosmétiques.
8. PRIORISE PAR IMPACT BUSINESS. Un défaut sur le chemin découverte → produit → panier → paiement
   pèse plus qu'un défaut en admin. Un défaut qui bloque ou décourage une conversion est P0 même s'il
   a l'air « cosmétique ». Un défaut d'accessibilité qui rend une action impossible au clavier ou au
   lecteur d'écran est P0.
9. VERDICT PAR SURFACE, obligatoire :
   - GARDER — rien à faire, dis pourquoi c'est bon ;
   - CORRIGER — retouche ciblée, avec fichier:ligne et estimation en heures ;
   - REFONDRE — le pattern lui-même est mauvais : explique le mécanisme du problème, propose le
     pattern remplaçant, et justifie pourquoi une retouche ne suffit pas.
   Ne propose une refonte que si la retouche est insuffisante. Sois franc dans les deux sens : ne
   dramatise pas, ne noie pas un vrai problème sous des nuances.
10. PROUVE TES RÉGRESSIONS. Chaque correction proposée vient avec le test qui l'aurait attrapée :
    Vitest + `vitest-axe` pour un composant, Playwright pour un comportement d'écran
    (`e2e/a11y/**`, `e2e/visual-regression.spec.ts`, `e2e/shop-mobile.spec.ts`).

Livrable : note /100, tableau des problèmes P0/P1/P2/P3 (surface, symptôme, fichier:ligne, impact
utilisateur, correctif, verdict), captures ou preuves, et tests à ajouter. Gates si tu implémentes :
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`.
```

---

## 100 — Design tokens & échelle visuelle

```text
Audit le point « Design tokens & échelle visuelle » dans Synclune.

Vérifie que le socle visuel est un vrai système et pas une accumulation : palette oklch, échelle
typographique (`--font-sans`, `--font-display`, `--font-cursive`, `--text-2xs`), échelle d'espacement,
rayons, ombres, `--text-shadow-*`, `--blur-*`, durées (`--duration-fast/normal/slow/slower`), courbes
(`--ease-spring`, `--ease-smooth-out`, `--ease-premium`), breakpoints (`--breakpoint-xs`, les media
queries du fichier) et couches (`--z-*`).

Cherche les défauts structurels : valeurs en dur qui doublonnent un token, tokens définis mais jamais
consommés, tokens consommés hors de leur intention, contrastes insuffisants (WCAG AA sur texte et sur
états focus/disabled), et divergences entre le storefront et l'admin qui ne sont pas des choix assumés.

Vérifie aussi la cohérence de marque « joaillerie artisanale » : la palette et la typographie doivent
raconter la même chose sur les deux surfaces.

Inspecte `app/globals.css` (bloc `@theme` et au-delà), `shared/styles/fonts.ts`,
`shared/components/ui/**`, `shared/constants/**` (brand), et échantillonne les composants les plus
visibles (`modules/products/components/product-card.tsx`,
`app/(shop)/(home)/_components/hero-section.tsx`, `shared/components/ui/button.tsx`).

Note /100, liste les tokens manquants/morts/mal utilisés, et rends le verdict par groupe de tokens.
```

---

## 101 — Layout, couches fixes & z-index

```text
Audit le point « Layout, couches fixes & z-index » dans Synclune.

Le site empile beaucoup d'éléments fixes : bannière d'annonce, navbar (transparente sur l'accueil),
bottom bar mobile, FAB, toasts, overlays Radix/Vaul, header admin, sticky action bars.
Vérifie que cet empilement est gouverné par les tokens `--z-*` et par les hauteurs déclarées
(`--navbar-height`, `--announcement-bar-height`, `--bottom-bar-height`, `--admin-header-height`,
`--fab-corner-clearance`, `--toast-safe-top`) et non par des `z-50` improvisés.

Traque en particulier :
- tout contenu masqué par une couche fixe (dernier item d'une liste sous la bottom bar, champ de
  formulaire sous une sticky action bar, toast sous la navbar) ;
- les `env(safe-area-inset-*)` manquants (encoche iPhone, barre gestuelle) ;
- le comportement quand deux couches coexistent (sheet ouvert + toast, drawer + alert-dialog) ;
- le scroll lock et le décalage de largeur à l'ouverture d'un overlay ;
- `scroll-padding-top` vs ancres et focus programmatique ;
- le clavier virtuel mobile (`shared/components/visual-viewport-bridge.tsx`,
  `shared/hooks/use-bottom-bar-height.ts`).

Inspecte `app/globals.css`, `app/layout.tsx`, `app/(shop)/layout.tsx`, `app/admin/layout.tsx`,
`shared/components/bottom-bar/**`, `shared/components/fab.tsx`,
`shared/components/announcement-bar*.tsx`, `shared/components/skip-link.tsx`,
`shared/components/sticky-action-bar/**`, `shared/components/visual-viewport-bridge.tsx`.

Note /100, classe tout contenu inatteignable ou masqué en P0/P1, et rends le verdict par couche.
```

---

## 102 — Navigation storefront desktop

```text
Audit le point « Navigation storefront desktop » dans Synclune.

Vérifie la navbar desktop et le mega-menu : lisibilité de l'arborescence (créations, collections,
types de produits), intention de survol (délai d'ouverture/fermeture, pas de menu qui se ferme quand
la souris traverse un vide), navigation clavier complète (Tab, flèches, Escape, `aria-expanded`),
état actif de l'item courant, comportement de la navbar transparente sur l'accueil au scroll,
contraste du texte sur image, et cohérence des icônes (panier, favoris, recherche, compte) avec leurs
badges de compteur.

Juge aussi l'ergonomie de fond : est-ce que le mega-menu aide à découvrir le catalogue (visuels,
hiérarchie, raccourcis) ou est-ce une simple liste de liens déguisée ?

Inspecte `app/(shop)/(home)/_components/navbar/**` (`navbar.tsx`, `desktop-nav.tsx`,
`mega-menu-collections.tsx`, `mega-menu-creations.tsx`, `mega-menu-column.tsx`,
`collection-mini-grid.tsx`, `navbar-styles.ts`, `navbar-wrapper.tsx`, `user-menu.tsx`,
`navbar-icon-buttons.tsx`), `shared/hooks/use-active-navbar-item.ts`,
`shared/hooks/use-roving-tab-index.ts`, `e2e/mega-menu-desktop.spec.ts`.

Note /100, classe toute impasse clavier en P0, et rends le verdict (garder / corriger / refondre).
```

---

## 103 — Navigation storefront mobile : DONE

```text
Audit le point « Navigation storefront mobile » dans Synclune.

Vérifie le trio de navigation mobile : menu sheet (Vaul), bottom bar et gestes. Points à trancher :
atteignabilité au pouce (zone basse), taille des cibles tactiles (44x44 CSS minimum), profondeur de
l'arborescence dans le sheet, retour arrière physique/geste qui ferme l'overlay au lieu de quitter la
page, indicateur de swipe de bord, cohérence entre les entrées du sheet et celles de la bottom bar,
et lisibilité des badges de compteur (panier, favoris).

Vérifie aussi les états : sheet ouvert pendant une navigation, focus restitué à la fermeture,
`aria-modal`/labels, scroll interne du sheet avec `env(safe-area-inset-bottom)`, et absence de
double navigation (le bug historique `<DrawerClose asChild>` qui annule un `<Link>`).

Inspecte `app/(shop)/(home)/_components/navbar/menu-sheet*.tsx`,
`app/(shop)/(home)/_components/navbar/edge-swipe-indicator.tsx`,
`shared/components/bottom-bar/**`, `shared/components/swipe-back-provider.tsx`,
`shared/hooks/{use-edge-swipe,use-back-button-close,use-gesture-hint-once,use-mobile}.ts`,
`shared/stores/use-overlay-stack-store.ts`, `e2e/shop-mobile.spec.ts`,
`e2e/mobile-accessibility.spec.ts`.

Note /100, classe toute navigation cassée ou cible sous 44px sur un chemin d'achat en P0/P1, et rends
le verdict par élément (sheet / bottom bar / gestes).
```

---

## 104 — Vitrine / page d'accueil

```text
Audit le point « Vitrine / page d'accueil » dans Synclune.

C'est la première impression de la marque. Vérifie, en mobile ET en desktop, la hiérarchie narrative
de la page : hero (promesse, CTA, images flottantes, bandeau de réassurance), section atelier
(polaroids, stats), collections, dernières créations, FAQ, footer.

Juge sur trois axes :
1. Impression de marque — est-ce qu'on croit à une joaillerie artisanale premium dès le premier écran ?
2. Chemin de conversion — combien de gestes entre l'arrivée et une fiche produit ? Le CTA principal
   est-il évident sans scroller sur 375x667 ?
3. Solidité technique — LCP et CLS du hero, images flottantes (poids, `sizes`, priorité), animations
   scroll-driven qui ne cassent pas les captures ni `prefers-reduced-motion`, sections en `use cache`
   dont le squelette correspond au rendu final.

Signale les sections qui n'apportent rien (à supprimer, pas à améliorer) et celles qui manquent.

Inspecte `app/(shop)/(home)/page.tsx`, `app/(shop)/(home)/_components/**` (`hero-section.tsx`,
`floating-images/**`, `atelier-section/**`, `collections-section.tsx`, `latest-creations.tsx`,
`home-faq*.tsx`, `footer.tsx`), `shared/components/{section-title,scroll-fade,polaroid-frame}.tsx`,
`e2e/scroll-driven-animations.spec.ts`, `e2e/performance.spec.ts`.

Note /100, donne le verdict section par section, et dis explicitement laquelle refondre en premier.
```

---

## 105 — Catalogue : grille, tri, pagination

```text
Audit le point « Catalogue : grille, tri et pagination » dans Synclune.

Vérifie les pages de liste (`/produits`, `/produits/[productTypeSlug]`, `/collections/[slug]`,
`/favoris`) : densité de la grille à chaque breakpoint (1/2/3/4 colonnes — les seuils sont-ils les
bons ?), anatomie de la carte produit (image, titre, prix, prix barré, pastilles de couleur, badge
rupture, action favori), stabilité de la mise en page pendant le chargement (squelettes vs rendu
final, CLS), barre de tri, chargement incrémental (« charger plus » vs pagination), position de
scroll restaurée au retour depuis une fiche produit, et états vides / zéro résultat.

Juge aussi la scannabilité : sur 390x844, combien de produits sont visibles et compréhensibles sans
zoom ? Les informations affichées sur la carte sont-elles celles qui décident l'achat ?

Inspecte `app/(shop)/produits/**`, `app/(shop)/collections/**`, `app/(shop)/favoris/**`,
`modules/products/components/{product-catalog,product-list,product-card,product-card-skeleton,
product-card-color-swatches,product-price,product-sort-bar,products-load-more,product-list-skeleton,
product-catalog-skeleton}.tsx`, `shared/components/{load-more,cursor-pagination}/**`,
`shared/components/{sort-select,scroll-restoration}.tsx`, `shared/components/ui/empty.tsx`,
`e2e/product-browsing.spec.ts`.

Note /100, rends le verdict pour la grille, la carte, le tri et la pagination séparément.
```

---

## 106 — Filtres produits

```text
Audit le point « Filtres produits » dans Synclune.

Vérifie l'expérience de filtrage en mobile (sheet) et en desktop : découvrabilité du déclencheur,
lisibilité du nombre de filtres actifs, résumé des filtres appliqués (badges retirables), sections
(types, couleurs, matériaux, disponibilité, note, fourchette de prix), comportement du prix
(saisie, validation, min > max), application immédiate vs bouton « Appliquer », réinitialisation,
persistance dans l'URL, retour arrière navigateur, et compte de résultats mis à jour.

Traque les frictions classiques : sheet qui se ferme et perd la sélection, filtre qui produit zéro
résultat sans proposition de sortie, liste de couleurs/matériaux trop longue sans recherche interne,
cases à cocher sous 44px, absence de `aria-live` sur le compteur de résultats.

Inspecte `modules/products/components/{product-filter-sheet,product-filter-trigger,filter-badges,
filter-section-header,filter-section-types,filter-section-colors,filter-section-materials,
filter-section-availability,filter-section-rating,price-range-inputs,clear-search-button}.tsx`,
`shared/components/{filter-badge,filter-badges,filter-sheet-wrapper,select-filter}.tsx`,
`shared/components/sort-drawer/**`, `shared/hooks/{use-filter,use-url-param,use-active-list-controls}.ts`,
`app/(shop)/produits/_utils/**`.

Note /100, classe toute perte de sélection ou impasse « zéro résultat » en P1, et rends le verdict
mobile puis desktop.
```

---

## 107 — Page produit (PDP) desktop

```text
Audit le point « Page produit (PDP) desktop » dans Synclune.

C'est la page qui convertit. Vérifie en 1280x800, 1440x900 et 1920x1080 : la composition en deux
colonnes (galerie / bloc d'achat), la hiérarchie de lecture (titre, prix, variantes, ajout au panier,
réassurance, caractéristiques, entretien, avis, produits liés), le comportement de la galerie
(vignettes, zoom, lightbox, vidéo), la sticky CTA desktop, l'estimation de livraison, le partage,
et les blocs secondaires (récemment vus, recommandations).

Juge sans complaisance : est-ce que le prix, la variante et le bouton d'ajout sont visibles ensemble
sans scroller ? Est-ce que les informations qui lèvent un doute d'achat (matériau, taille, délai,
retours) sont accessibles sans chasse au trésor ? Y a-t-il des blocs qui repoussent l'achat vers le
bas sans rien apporter ?

Inspecte `app/(shop)/creations/[slug]/{page.tsx,loading.tsx,error.tsx,not-found.tsx}`,
`modules/products/components/{product-info,product-details,product-characteristics,
product-highlights,product-reassurance,product-care-info,product-price-display,delivery-estimator,
share-button,sticky-cart-cta-desktop,related-products,recently-viewed-products,product-main-skeleton}.tsx`,
`shared/components/gallery/**`, `modules/reviews/components/**` (bloc avis).

Note /100, rends le verdict bloc par bloc et propose l'ordre de lecture idéal si l'actuel est mauvais.
```

---

## 108 — Page produit (PDP) mobile

```text
Audit le point « Page produit (PDP) mobile » dans Synclune.

Vérifie en 360x740, 375x667 et 390x844 : hauteur de la galerie (combien reste-t-il pour le prix et le
CTA ?), swipe et pagination de la galerie, ouverture de la lightbox et sortie par geste, position et
comportement de la CTA d'ajout au panier au scroll, atteignabilité au pouce, sections repliables
(description, caractéristiques, entretien, avis), et absence de scroll horizontal parasite.

Traque : cible tactile trop petite sur les vignettes ou les pastilles de couleur, texte sous 14px sur
une information d'achat, image qui pousse le prix sous la ligne de flottaison, vidéo en autoplay
coûteuse en données, double barre fixe (bottom bar + CTA) qui mange l'écran, geste de swipe galerie
qui entre en conflit avec le swipe de retour arrière.

⚠️ Le composant `sticky-cart-cta.tsx` existe : vérifie ce qu'il fait RÉELLEMENT aujourd'hui (actif,
conditionnel, mort) avant de conclure, et rappelle que le principe d'une CTA collante mobile sur la
PDP a déjà été discuté — toute proposition doit être présentée comme telle, pas comme une correction.

Inspecte `app/(shop)/creations/[slug]/page.tsx`, `shared/components/gallery/**`,
`modules/products/components/{sticky-cart-cta,product-info,product-details}.tsx`,
`shared/components/description-collapse.tsx`, `shared/hooks/{use-lightbox,use-long-press,
use-touch-device}.ts`, `e2e/product-gallery-mobile.spec.ts`, `e2e/shop-mobile.spec.ts`.

Note /100, classe tout blocage d'ajout au panier en P0, et rends le verdict.
```

---

## 109 — Sélecteur de variantes (SKU)

```text
Audit le point « Sélecteur de variantes (SKU) » dans Synclune.

C'est le point de friction n°1 d'un bijou : couleur, matériau, taille. Vérifie la lisibilité des
options (pastilles de couleur avec libellé accessible, pas seulement une teinte), la représentation
des combinaisons indisponibles (grisé + raison, jamais silencieusement absent), la présélection par
défaut (`isDefault`), la mise à jour du prix et de l'image à la sélection, l'affichage du stock
restant, et le parcours quand une variante est en rupture (bascule vers l'alerte retour en stock).

Vérifie les deux contextes d'usage : le sélecteur inline sur la PDP et le dialog de sélection lancé
depuis une carte produit ou le panier. Les deux doivent raconter la même chose.

Côté accessibilité : rôles radio/groupe, navigation aux flèches, libellé de la valeur sélectionnée
annoncé, contraste des pastilles claires sur fond clair.

Inspecte `modules/cart/components/{sku-selector-dialog,sku-selector-form-content,
sku-selector-selectors,sku-selector-utils.ts,add-to-cart-form,add-to-cart-card-button}.tsx`,
`modules/products/components/{aria-color-swatch,product-card-color-swatches}.tsx`,
`modules/skus/components/**`, `shared/hooks/use-radio-group-keyboard.ts`,
`modules/wishlist/components/**` (alerte retour en stock).

Note /100, classe toute variante indisponible sélectionnable (ou disponible non sélectionnable) en
P0/P1, et rends le verdict pour l'inline et pour le dialog.
```

---

## 110 — Panier

```text
Audit le point « Panier (UI/UX) » dans Synclune.

Vérifie le panier sous ses deux formes (sheet latéral et parcours complet), en mobile et desktop :
ouverture après ajout (feedback immédiat, animation vers le panier), lignes d'article (visuel, titre,
variante, prix unitaire, sous-total), sélecteur de quantité, suppression avec confirmation, passage
en favoris, code promo (saisie, erreur, retrait), résumé des montants (sous-total, remise, livraison,
total), alerte de changement de prix, articles devenus indisponibles, panier vide, et CTA vers le
paiement.

Juge la clarté financière : le client comprend-il *pourquoi* il paie ce montant sans faire de calcul
mental ? Et la réversibilité : chaque action destructive est-elle annulable ou au moins confirmée ?

Vérifie aussi les états de chargement optimistes (quantité, suppression, vidage) et l'absence de
saut de mise en page quand un montant change.

Inspecte `modules/cart/components/**` (`cart-sheet*.tsx`, `cart-sheet-item-row.tsx`,
`cart-item-quantity-selector.tsx`, `cart-item-remove-button.tsx`, `cart-item-move-to-wishlist.tsx`,
`cart-promo-code-form.tsx`, `cart-price-change-alert.tsx`, `cart-clear-button.tsx`,
`clear-cart-alert-dialog.tsx`, `remove-unavailable-items-button.tsx`, `fly-to-cart-overlay.tsx`,
`cart-sheet-recommendations.tsx`, `cart-badge.tsx`), `shared/stores/badge-counts-store.ts`,
`e2e/cart.spec.ts`, `e2e/product-to-cart.spec.ts`.

Note /100, classe toute ambiguïté sur le montant en P0/P1, et rends le verdict sheet vs page.
```

---

## 111 — Tunnel de paiement

```text
Audit le point « Tunnel de paiement (UI/UX) » dans Synclune.

Le prompt 59 couvre l'accessibilité du checkout ; celui-ci couvre l'ERGONOMIE et le DESIGN, mobile et
desktop. Vérifie : structure de la page (formulaire vs récapitulatif, une colonne en mobile, deux en
desktop), ordre des étapes, récapitulatif de commande consultable sans perdre sa saisie, choix du mode
de livraison / retrait, saisie d'adresse (autocomplétion, pays, code postal, téléphone), code promo,
insertion de Stripe Elements (cohérence visuelle avec le reste du formulaire, hauteur qui ne fait pas
sauter la page), états du bouton de paiement (idle / en cours / erreur), messages d'erreur Stripe
traduits et actionnables, et absence de sortie accidentelle (retour arrière, fermeture d'overlay).

Traque les tueurs de conversion : champ obligatoire non signalé avant soumission, erreur affichée
loin du champ fautif, bouton de paiement qui ne dit pas combien on paie, réassurance absente à
l'instant du paiement, spinner sans texte, double soumission possible.

Inspecte `app/paiement/**` (`page.tsx`, `_components/**`), `modules/payments/components/**`,
`modules/addresses/components/**`, `modules/cart/components/cart-promo-code-form.tsx`,
`shared/components/forms/**`, `shared/lib/form-context.tsx`, `e2e/checkout.spec.ts`,
`e2e/authenticated/user-keyboard-purchase-flow.spec.ts`.

Note /100, classe tout blocage ou ambiguïté de montant en P0, et rends le verdict par étape.
```

---

## 112 — Pages post-achat

```text
Audit le point « Pages post-achat (UI/UX) » dans Synclune.

Vérifie confirmation, annulation et retour Stripe : ce que voit le client dans chaque état (payé,
en attente de paiement asynchrone, échec, annulé), la clarté du « et maintenant ? » (numéro de
commande, délai, email envoyé, facture, suivi, retour à la boutique), la gestion du rafraîchissement
de page et du partage d'URL, et le cas invité (sans compte).

Vérifie l'état d'attente en particulier : un paiement asynchrone ne doit ni afficher un faux succès,
ni laisser le client devant un spinner infini. Y a-t-il un rafraîchissement automatique, un message
d'attente honnête, une sortie ?

Juge aussi le moment de marque : la confirmation est le pic émotionnel de l'achat — est-ce qu'elle en
profite (ton, visuel, prochaine étape désirable) ou est-ce un reçu administratif ?

Inspecte `app/paiement/{confirmation,annulation,retour}/**`,
`app/paiement/confirmation/_components/**`, `modules/orders/components/**` (récapitulatif),
`modules/payments/components/**`, `e2e/authenticated/user-async-payment-flow.spec.ts`.

Note /100, classe tout faux succès ou attente sans issue en P0, et rends le verdict par page.
```

---

## 113 — Espace client

```text
Audit le point « Espace client (UI/UX) » dans Synclune.

Le prompt 93 couvre les données et la sécurité ; celui-ci couvre l'interface. Vérifie en mobile et
desktop : la page d'accueil du compte (que met-elle en avant ?), la liste des commandes (statut
lisible d'un coup d'œil, tri, pagination, état vide), le détail d'une commande (frise de statut,
articles, montants, facture, suivi, actions disponibles selon le statut), les adresses (ajout,
édition, suppression, adresse par défaut), les paramètres (profil, mot de passe, suppression de
compte), et la navigation entre ces sections (onglets ? sidebar ? menu ?).

Traque : statut de commande exprimé en jargon technique, action visible mais impossible, page de
détail qui répète l'entête sur trois écrans en mobile, suppression de compte trop facile ou au
contraire introuvable, absence de retour clair vers la boutique.

Inspecte `app/(account)/**` (`_components/espace-client-content.tsx`, `commandes/**`, `adresses/**`,
`parametres/**`), `modules/orders/components/**` (côté client), `modules/addresses/components/**`,
`modules/users/components/**`, `shared/components/tab-navigation.tsx`,
`e2e/authenticated/user-account-settings.spec.ts`.

Note /100, rends le verdict par section et dis laquelle mérite une refonte.
```

---

## 114 — Écrans d'authentification

```text
Audit le point « Écrans d'authentification (UI/UX) » dans Synclune.

Sept écrans : connexion, inscription, mot de passe oublié, réinitialisation, vérification d'email,
renvoi de vérification, erreur. Vérifie la cohérence visuelle entre eux, la clarté du chemin (aucun
écran ne doit être un cul-de-sac), la place de Google vs email/mot de passe, l'indicateur de force du
mot de passe, la révélation du mot de passe, les messages d'erreur (jamais d'énumération de comptes,
mais assez précis pour être utiles), le consentement CGV/confidentialité, et l'état après action
(« email envoyé » : que fait le client s'il ne le reçoit pas ?).

Vérifie aussi le contexte d'arrivée : un client renvoyé vers la connexion depuis le panier ou le
checkout doit revenir là où il était, et le savoir.

Rappel : pas d'`autoFocus` (parti pris arbitré). Vérifie que l'accessibilité est assurée autrement
(ordre de tabulation, labels, `aria-describedby` sur les erreurs, `autocomplete` correct).

Inspecte `app/(auth)/**` (7 routes), `modules/auth/components/**`, `shared/components/forms/**`,
`shared/utils/password-strength*`, `e2e/auth.spec.ts`, `e2e/signup-flow.spec.ts`.

Note /100, classe tout cul-de-sac en P1, et rends le verdict par écran.
```

---

## 115 — Favoris & retour en stock

```text
Audit le point « Favoris & retour en stock (UI/UX) » dans Synclune.

Vérifie le bouton favori partout où il apparaît (carte produit, PDP, panier) : état visuel clair
(ajouté / non ajouté / en cours), feedback immédiat, libellé accessible, comportement en invité
(le favori survit-il ? le client le sait-il ?), et cohérence du compteur dans la navbar.

Vérifie la page `/favoris` : mise en page, produit devenu indisponible ou supprimé, action « ajouter
au panier » depuis un favori, état vide (est-il utile ou juste vide ?), et le parcours d'alerte retour
en stock (demande, confirmation, désinscription).

Inspecte `app/(shop)/favoris/**`, `modules/wishlist/components/**`,
`modules/products/components/product-card.tsx`, `shared/stores/badge-counts-store.ts`,
`shared/components/ui/empty.tsx`, `e2e/pages/wishlist.page.ts`.

Note /100, rends le verdict pour le bouton, la page et l'alerte retour en stock.
```

---

## 116 — Avis produits (UI)

```text
Audit le point « Avis produits (UI/UX) » dans Synclune.

Le module `reviews` compte beaucoup de composants : vérifie qu'ils forment une expérience et pas un
empilement. Côté storefront : résumé de notation (moyenne, distribution), liste d'avis (tri,
pagination, longueur du texte, avis vérifié), formulaire de dépôt (notation par étoiles accessible au
clavier, longueur, envoi, confirmation), et affichage quand il n'y a aucun avis (le cas par défaut
d'une boutique qui démarre — est-il traité dignement ou laisse-t-il un trou ?).

Côté admin : file de modération, lecture rapide, actions publier/masquer, réponse éventuelle.

Traque : étoiles non utilisables au clavier, note affichée sans nombre d'avis, bloc d'avis qui pousse
les produits liés hors de portée, état vide honteux, incohérence entre la note de la carte produit et
celle de la PDP.

Inspecte `modules/reviews/components/**`, `shared/components/rating-stars.tsx`,
`app/admin/marketing/avis/**`, `e2e/authenticated/{user-reviews,admin-reviews}.spec.ts`.

Note /100, rends le verdict storefront puis admin.
```

---

## 117 — Recherche (UI/UX) : DONE

```text
Audit le point « Recherche (UI/UX) » dans Synclune.

Le prompt 54 couvre l'API et la pertinence ; celui-ci couvre l'interface. Vérifie le dialog de
recherche rapide en mobile et desktop : ouverture (icône, raccourci clavier, découvrabilité),
état initial (suggestions ? récents ? rien ?), latence perçue et indicateur de chargement, structure
des résultats (produits, collections, pages), navigation clavier (flèches, Entrée, Escape),
correction orthographique proposée, résultats vides avec sortie utile, et fermeture qui ne perd pas
le contexte.

Vérifie aussi le champ de recherche non modal (listes admin, catalogue) : debounce, bouton d'effacement,
état « recherche en cours », et annonce du nombre de résultats aux lecteurs d'écran.

Inspecte `modules/products/components/quick-search-dialog/**`,
`modules/products/components/{search-correction-suggestion,search-fallback-suggestions,
clear-search-button}.tsx`, `shared/components/search-input.tsx`,
`shared/components/autocomplete/**`, `shared/components/ui/{kbd,shortcut-kbd}.tsx`,
`e2e/quick-search.spec.ts`, `e2e/search.spec.ts`.

Note /100, rends le verdict pour le dialog et pour le champ inline.
```

---

## 118 — Overlays : dialogs, sheets, drawers : DONE

```text
Audit le point « Overlays : dialogs, sheets, drawers, alert-dialogs » dans Synclune.

Le projet orchestre les overlays via des stores Zustand (`dialog-store`, `sheet-store`,
`alert-dialog-store`, `use-overlay-stack-store`) et empile parfois du Vaul dans du Radix. Vérifie que
cette machinerie tient : un seul overlay visuellement actif à la fois (ou empilement assumé et
lisible), Escape et clic extérieur ferment le bon niveau, le bouton retour physique mobile ferme
l'overlay au lieu de quitter la page, le focus est piégé puis restitué au déclencheur, le scroll du
corps est verrouillé sans décalage de largeur, et les overlays imbriqués (AlertDialog dans un Sheet
Vaul) ne se bloquent pas mutuellement.

Vérifie la cohérence des choix : quand utilise-t-on un Dialog, un Sheet, un Drawer, un
`responsive-dialog` ? La règle doit être lisible dans le code, pas au cas par cas.

Rappels de partis pris : pas de `Drawer` pour les confirmations, pas de `handleOnly`, pas de View
Transition sur fermeture Vaul.

Inspecte `shared/components/ui/{dialog,sheet,drawer,alert-dialog,responsive-alert-dialog,
vaul-nested-context}.tsx`, `shared/components/responsive-dialog.tsx`,
`shared/components/dialogs/**`, `shared/stores/{dialog-store,sheet-store,alert-dialog-store,
use-overlay-stack-store,overlay-state-helpers}.ts`,
`shared/hooks/{use-register-overlay,use-back-button-close,use-escape-key}.ts`,
`shared/providers/**`.

Note /100, classe tout piège de focus ou overlay non fermable en P0, et rends le verdict par type.
```

---

## 119 — Feedback : toasts, squelettes, états vides, erreurs : DONE

```text
Audit le point « Système de feedback » dans Synclune.

Vérifie que chaque action donne une réponse proportionnée : toast, état inline, ou rien du tout
quand l'effet est déjà visible. Traque les deux excès
symétriques : action silencieuse (le client ne sait pas si ça a marché) et sur-notification (un toast
pour une action dont le résultat est évident à l'écran).

Vérifie aussi :
- squelettes vs rendu final (mêmes dimensions, pas de saut) sur toutes les pages `loading.tsx` ;
- états vides : sont-ils des culs-de-sac ou proposent-ils une action ?
- error boundaries storefront et admin : message en français, action de reprise, pas de trace
  technique exposée ;
- pages `error.tsx` / `not-found.tsx` par route ;
- `aria-live` pour les changements annoncés (compteur de résultats, ajout au panier, erreurs).

Rappel : l'haptique reste parcimonieuse.

Inspecte `shared/components/ui/{toaster,toast-icons,skeleton,empty,spinner,progress}.tsx`,
`shared/utils/toast.ts`,
`shared/hooks/{use-action-with-toast,use-action-state-with-toast,use-bulk-action-with-toast}.ts`,
`shared/components/loaders/**`, tous les `app/**/loading.tsx`, `app/**/error.tsx`,
`app/**/not-found.tsx`, `app/admin/_components/admin-{form,list}-error-boundary.tsx`,
`e2e/toast-ui.spec.ts`, `e2e/a11y/live-regions.spec.ts`, `e2e/error-pages.spec.ts`.

Note /100, classe toute action critique sans feedback en P1, et rends le verdict par canal.
```

---

## 120 — Formulaires : ergonomie mobile & clavier : DONE

```text
Audit le point « Ergonomie des formulaires (mobile & clavier) » dans Synclune.

Le prompt 24 couvre TanStack Form et la validation ; celui-ci couvre l'ERGONOMIE physique de la
saisie. Vérifie sur tous les formulaires du chemin d'achat et du compte : `type` et `inputMode`
adaptés (clavier numérique pour code postal et téléphone, `email`, `tel`), `autocomplete` correct
(`given-name`, `family-name`, `address-line1`, `postal-code`, `tel`, `email`,
`current-password`, `new-password`, `one-time-code`), taille de police ≥ 16px sur iOS pour éviter le
zoom automatique, hauteur de champ tactile, ordre de tabulation, `enterkeyhint`, et gestion du
clavier virtuel (champ masqué par le clavier, bouton de soumission atteignable).

Vérifie aussi : focus placé sur la première erreur après échec de soumission, résumé d'erreurs pour
les formulaires longs, protection contre le double envoi, état de soumission lisible, dialogue de
modifications non enregistrées, et champs obligatoires signalés AVANT la soumission.

Rappel : pas d'`autoFocus`.

Inspecte `shared/components/forms/**`, `shared/lib/form-context.tsx`,
`shared/hooks/{use-focus-first-error,use-server-field-errors,use-unsaved-changes,
use-admin-form-keyboard}.ts`, `shared/components/{required-fields-note,visual-viewport-bridge}.tsx`,
`shared/components/navigation/unsaved-changes-dialog.tsx`, `modules/addresses/components/**`,
`modules/auth/components/**`, `app/paiement/_components/**`.

Note /100, classe tout champ inatteignable derrière le clavier virtuel en P0/P1, et rends le verdict.
```

---

## 121 — Admin : shell & navigation : DONE

```text
Audit le point « Admin : shell & navigation » dans Synclune.

Vérifie la coquille de l'admin en desktop et en mobile : sidebar (groupes, état replié, item actif,
accès rapide, pied de page utilisateur), header, fil d'Ariane, navigation de section, menu sheet
mobile, bottom bar mobile, FAB, et raccourcis clavier.

Juge l'efficacité d'un usage quotidien : combien de clics pour aller de « une commande arrive » à
« commande expédiée » ? L'arborescence (ventes / catalogue / marketing / contenu / clients /
configuration) correspond-elle aux vraies tâches ? Les compteurs et badges attirent-ils l'attention
au bon endroit ?

Vérifie aussi : cohérence des hauteurs déclarées (`--admin-header-height`, `--bottom-bar-height`) avec
le padding du contenu, `scroll-padding-top` et ancres, focus visible, et le dialog de raccourcis
(est-il découvrable ?).

Rappel : pas de double bouton retour en admin mobile.

Inspecte `app/admin/layout.tsx`, `app/admin/_components/**` (`admin-sidebar.tsx`,
`admin-mobile-header.tsx`, `admin-mobile-bottom-bar.tsx`, `admin-menu-sheet.tsx`,
`admin-menu-collapsible-group.tsx`, `admin-menu-quick-access.tsx`, `dashboard-breadcrumb.tsx`,
`dashboard-header*.tsx`, `section-navigation*.tsx`, `navigation-config.tsx`,
`keyboard-shortcuts-dialog.tsx`, `nav-main-client.tsx`), `shared/components/ui/sidebar.tsx`,
`shared/components/admin-dashboard-fab.tsx`, `e2e/admin-workflows.spec.ts`.

Note /100, rends le verdict desktop puis mobile.
```

---

## 122 — Admin : listes, tableaux & actions groupées : DONE

```text
Audit le point « Admin : listes, tableaux et actions groupées » dans Synclune.

Vérifie les listes admin (commandes, produits, SKUs, collections, couleurs, matériaux, types, avis,
remises, clients, remboursements, facturation) sur trois axes :

1. Desktop — densité du tableau, colonnes utiles vs bruit, en-têtes collants, tri, largeur et scroll
   horizontal, troncature des textes longs, actions par ligne (menu vs boutons).
2. Mobile — un tableau ne passe pas en 390px : que devient-il ? cartes ? liste ? scroll horizontal
   assumé ? Vérifie que la réponse est cohérente d'une liste à l'autre.
3. Sélection multiple & actions groupées — mode sélection mobile, case « tout sélectionner » (portée :
   page ou tout le filtre ?), barre d'action collante, état en cours par ligne, confirmation
   destructive, résultat partiel (3 sur 5 ont échoué : le dit-on ?).

Vérifie aussi la barre d'outils (recherche, filtres, tri, compteur live), la pagination par curseur
(retour arrière, position restaurée), et les états vides / chargement.

Inspecte `shared/components/data-table/**`, `shared/components/{toolbar,table-scroll-container,
admin-list-live-count,active-toggle,swipeable-card}.tsx`, `shared/components/mobile-selection/**`,
`shared/components/multi-select/**`, `shared/components/sticky-action-bar/**`,
`shared/components/responsive-action-menu/**`, `shared/components/cursor-pagination/**`,
`shared/stores/{use-admin-list-selection-store,use-admin-list-bulk-pending-store}.ts`,
`shared/hooks/{use-bulk-selection-action-item,use-active-list-controls,use-toolbar-drawer}.ts`,
`app/admin/ventes/commandes/**`, `app/admin/catalogue/produits/**`,
`e2e/authenticated/admin-pagination.spec.ts`.

Note /100, classe toute action groupée dont la portée est ambiguë en P1, et rends le verdict.
```

---

## 123 — Admin : formulaires & pages de détail : DONE

```text
Audit le point « Admin : formulaires et pages de détail » dans Synclune.

Vérifie les formulaires de création/édition (produit, SKU, collection, couleur, matériau, type,
remise, annonce, configuration boutique, remboursement) et les pages de détail (commande, client,
remboursement) : organisation en sections ou onglets, longueur du formulaire en mobile, pied de page
d'action (collant ? atteignable ?), sauvegarde et retour à la liste, dialogue de modifications non
enregistrées, gestion des médias (upload, réordonnancement, suppression, alt text), et champs
dépendants (variantes, stock, prix).

Pour les pages de détail commande : hiérarchie de l'information (statut, client, articles, montants,
paiement, facture, avoir, historique, notes), actions disponibles selon le statut, et lisibilité de
l'historique immuable.

Traque : formulaire de 40 champs sans repères, action destructive au même niveau visuel qu'une action
banale, upload sans état de progression, retour qui perd la saisie, page de détail illisible en mobile.

Rappel : pas de bouton Cancel sur les formulaires de création admin.

Inspecte `app/admin/catalogue/**/{nouveau,[slug]}/**`, `app/admin/marketing/discounts/**`,
`app/admin/ventes/{commandes,remboursements}/[id]/**`, `app/admin/configuration/**`,
`app/admin/contenu/**`, `modules/orders/components/admin/**`, `modules/products/components/admin/**`,
`modules/skus/components/**`, `shared/components/{admin-form-footer,page-header}.tsx`,
`shared/components/media-upload/**`, `shared/components/admin/**`,
`shared/hooks/{use-unsaved-changes,use-back-to-list-on-delete,use-admin-form-keyboard}.ts`.

Note /100, rends le verdict formulaires puis pages de détail.
```

---

## 124 — Admin : dashboard & data-viz

```text
Audit le point « Admin : dashboard et data-viz » dans Synclune.

Vérifie le tableau de bord : ce qu'il montre en premier (les bons KPI ?), la lisibilité des tuiles
(valeur, unité, variation, période de comparaison), le graphique de revenu (axes, échelle, devise,
infobulle, responsive en 390px, `prefers-reduced-motion`), les listes d'action (commandes récentes,
alertes, stock bas, litiges), et le comportement en données vides ou insuffisantes (une boutique qui
démarre : le dashboard doit rester digne, pas afficher des zéros partout sans contexte).

Vérifie aussi le poids : Recharts est lourd — est-il chargé dynamiquement, uniquement sur les routes
qui en ont besoin ? Les données arrivent-elles par Server Component ou par un aller-retour client ?

Contrainte de rendu : couleurs de séries issues des tokens (pas de palette Recharts par défaut),
contraste suffisant, information jamais portée par la seule couleur.

Inspecte `app/admin/(dashboard)/**`, `modules/dashboard/components/**`, `modules/dashboard/data/**`,
`shared/components/analytics/**`, `shared/components/ui/{card,item,progress}.tsx`, `next.config.ts`
(optimisation d'imports), `package.json` (`size-limit`).

Note /100, rends le verdict par bloc du dashboard, et dis lesquels supprimer.
```

---

## 125 — Gestes tactiles & haptique : DONE

```text
Audit le point « Gestes tactiles et haptique » dans Synclune.

Le projet embarque beaucoup de gestes : swipe de retour arrière, swipe de bord, cartes glissables,
appui long, pull-to-refresh, plus un retour haptique. Vérifie que chacun est justifié, découvrable et
non destructif :

- chaque geste a-t-il une alternative visible (bouton, menu) ? Un geste ne doit JAMAIS être le seul
  chemin vers une action ;
- les gestes entrent-ils en conflit entre eux (swipe galerie vs swipe retour, appui long vs scroll,
  pull-to-refresh vs scroll en haut de liste) ?
- l'appui long ouvre-t-il un menu utile, et sur quelles cibles ? Le menu contextuel natif est-il
  correctement neutralisé ou volontairement conservé ?
- pull-to-refresh : est-il présent là où il a du sens, et jamais là où il rafraîchit inutilement ?
- indices de geste : sont-ils montrés une fois puis oubliés (`use-gesture-hint-once`) ou répétés ?
- haptique : parcimonie stricte — jamais sur une action passive, un affichage, un scroll. Vérifie
  chaque appel de `use-haptic` et juge-le individuellement.
- souris et clavier ne doivent jamais recevoir de comportement tactile résiduel
  (`use-touch-device`).

Inspecte `shared/components/{swipe-back-provider,swipeable-card,pull-to-refresh,
long-press-menu-link}.tsx` (+ `shared/components/long-press-menu-link/**`),
`shared/hooks/{use-haptic,use-long-press,use-edge-swipe,use-gesture-hint-once,use-touch-device}.ts`,
`shared/utils/toast.ts`, `app/(shop)/(home)/_components/navbar/edge-swipe-indicator.tsx`,
`modules/products/components/product-card-long-press.tsx`.

Note /100, classe tout geste sans alternative en P1, et rends le verdict geste par geste.
```

---

## 126 — Confort desktop : densité, largeurs, zoom : DONE

```text
Audit le point « Confort desktop et robustesse du responsive » dans Synclune.

Vérifie ce que le mobile-first fait oublier :
- largeurs maximales de contenu : le storefront en 1920px reste-t-il lisible (longueur de ligne) ou
  s'étale-t-il ? Les grilles gagnent-elles une colonne utile aux grands écrans ?
- tablette : 768x1024 et surtout 1024x768 (iPad paysage), zone de bascule mobile/desktop la plus
  souvent cassée. Vérifie les points de rupture (`use-media-query`, `use-mobile`,
  `--breakpoint-xs`) et les composants « responsive » à double rendu (dialog vs drawer, menu vs
  sheet) : y a-t-il une zone où l'on obtient les deux ou aucun ?
- reflow WCAG : 320px de large sans scroll horizontal sur toutes les pages du chemin d'achat ;
- zoom texte 200% : rien ne se chevauche, aucune barre fixe ne mange l'écran, tout reste cliquable ;
- survol vs focus : tout ce qui n'existe qu'au survol doit exister au focus clavier ;
- densité : espacements cohérents entre pages, alignements, sections qui respirent de la même façon.

Inspecte `shared/hooks/{use-media-query,use-mobile,use-touch-device}.ts`, `app/globals.css`
(media queries), `shared/components/responsive-dialog.tsx`,
`shared/components/ui/responsive-alert-dialog.tsx`,
`shared/components/responsive-action-menu/**`, `e2e/a11y/zoom-a11y.spec.ts`,
`e2e/visual-regression.spec.ts`, `playwright.config.ts`.

Note /100, classe tout chevauchement à 200% ou scroll horizontal à 320px en P1, et rends le verdict.
```

---

## 127 — Bannières système & modes dégradés

```text
Audit le point « Bannières système et modes dégradés » dans Synclune.

Vérifie tout ce qui s'affiche par-dessus l'expérience normale : bannière d'annonce, bandeau de
maintenance, bandeau de consentement cookies, avis « commandes en pause », et les états dégradés
(hors ligne, PWA installée, service momentanément indisponible).

Points à trancher :
- empilement : que se passe-t-il si deux bandeaux sont actifs en même temps ? La navbar transparente
  de l'accueil survit-elle à un bandeau au-dessus d'elle ?
- fermeture : un bandeau fermable reste-t-il fermé ? Où est stocké cet état, et est-ce conforme au
  consentement ?
- cookies : le bandeau bloque-t-il l'usage du site ? Le refus est-il aussi accessible que
  l'acceptation ? Le lien de gestion ultérieure est-il trouvable ?
- « commandes en pause » : le message est-il visible AVANT que le client remplisse un panier ? Les
  CTA d'achat sont-ils cohérents avec l'état de la boutique ?
- mode PWA / hors ligne : que voit-on ? Un écran cassé ou un message honnête ?

Inspecte `shared/components/{announcement-bar,announcement-bar-wrapper,maintenance-banner,
cookie-banner,cookie-banner-lazy,manage-cookies-button}.tsx`,
`shared/stores/cookie-consent-store.ts`, `modules/store-settings/components/**`,
`app/(shop)/layout.tsx`, `app/layout.tsx`, `e2e/error-resilience.spec.ts`.

⚠️ Synclune n'est PAS une PWA (ni manifest, ni service worker, ni page hors ligne — décision assumée).
N'audite pas un mode hors ligne inexistant : le seul état dégradé réseau à juger est celui que produit
Next.js nativement. Cf. prompt 138.

Note /100, classe tout blocage d'achat non annoncé en P1, et rends le verdict par bandeau.
```

---

## 128 — Cohérence cross-surface & plan de refonte

```text
Audit le point « Cohérence cross-surface et plan de refonte UI/UX » dans Synclune.

Prompt de SYNTHÈSE : à lancer après plusieurs audits 100 → 127. Ne re-détaille pas chaque surface,
cherche les incohérences TRANSVERSES, celles qu'on ne voit qu'en comparant :

- un même objet représenté différemment selon l'écran (un prix, un statut de commande, une variante,
  une rupture de stock, une remise) ;
- un même geste avec des conséquences différentes (fermer un sheet, revenir en arrière, supprimer) ;
- des libellés divergents pour la même action (« Ajouter au panier » / « J'achète » / « Commander ») ;
- des composants concurrents qui font le même travail (deux façons de filtrer, deux façons de
  paginer, deux styles de carte, deux systèmes de badge) ;
- une frontière storefront/admin qui n'est pas un choix mais un accident historique.

Puis rends un PLAN, pas une liste de bugs :
1. carte des surfaces avec verdict (GARDER / CORRIGER / REFONDRE) et note /100 par surface ;
2. les 3 refontes qui rapportent le plus, avec pour chacune : le problème de fond, la forme cible,
   les fichiers touchés, l'ordre d'exécution, le risque de régression et la mission correspondante
   dans `docs/AUDIT-PROMPTS.md` (`UIUX-01` → `UIUX-06`, `FEEDBACK`, `AUTH-UX`, `A11Y`) ;
3. ce qu'il faut SUPPRIMER (composants morts, sections sans valeur, variantes de patterns en trop) —
   une interface s'améliore aussi en retirant ;
4. le filet de tests à poser avant de toucher quoi que ce soit.

Inspecte largement : `shared/components/**`, `modules/*/components/**`, `app/(shop)/**`,
`app/(account)/**`, `app/(auth)/**`, `app/paiement/**`, `app/admin/**`, `app/globals.css`, et les
audits déjà produits.

Note /100 globalement, puis rends le plan. Sois franc : dis ce qui est bon, et dis ce qui doit
changer de forme plutôt que d'être repeint.
```

---

# Architecture, fiabilité & exploitation (129 → 156)

Les prompts 01→99 couvrent le métier et la conformité, 100→128 les interfaces. Ce dernier groupe couvre
les **couches que l'on ne voit pas** et qui font tomber une boutique : le proxy qui garde les routes, la
frontière Server/Client, les disjoncteurs sur Stripe et Resend, les fuseaux horaires, la concurrence, le
filet de 106 tests de régression, l'outillage et l'exploitation.

Ces prompts n'ont pas besoin du Préambule UI/UX — ils suivent le format des prompts 01→99. Une règle
s'applique quand même à tous : **le filesystem fait foi**, vérifie chaque chemin cité avant de t'y fier.

### Index

| #   | Sujet                                         | Groupe               |
| --- | --------------------------------------------- | -------------------- |
| 129 | Proxy et protection des routes                | Architecture Next 16 |
| 130 | Frontière Server / Client Components          | Architecture Next 16 |
| 131 | PPR, Cache Components & streaming             | Architecture Next 16 |
| 132 | Résilience des dépendances externes           | Fiabilité            |
| 133 | Dates, fuseaux horaires & bornes de période   | Fiabilité            |
| 134 | Performance des requêtes Prisma               | Fiabilité            |
| 135 | Concurrence, verrous & TOCTOU                 | Fiabilité            |
| 136 | Feature flags & configuration runtime         | Architecture Next 16 |
| 137 | Analytics, tracking & consentement            | Produit              |
| 138 | Icônes, favicons & métadonnées d'application  | Produit              |
| 139 | Rendu des emails (compatibilité clients)      | Produit              |
| 140 | Parcours retour / rétractation client         | Produit              |
| 141 | Injection dans le HTML brut & JSON-LD         | Sécurité             |
| 142 | Redirections & liens sortants                 | Sécurité             |
| 143 | Tests de régression verrouillés & garde-fous  | Qualité              |
| 144 | Lint local, hooks git & conventions outillées | Qualité              |
| 145 | Scripts d'outillage & maintenance             | Outillage            |
| 146 | Pipeline de migration en production           | Exploitation         |
| 147 | Analyse statique & veille des dépendances     | Sécurité             |
| 148 | Endpoints d'exploitation                      | Exploitation         |
| 149 | Page d'aide & FAQ                             | Produit              |
| 150 | Documentation & onboarding                    | Qualité              |
| 151 | Sauvegarde, restauration & reprise            | Exploitation         |
| 152 | Coûts, quotas & limites fournisseurs          | Exploitation         |
| 153 | Boutique fermée & disponibilité des commandes | Produit              |
| 154 | Vente à l'international & fiscalité           | Conformité           |
| 155 | Recherche : infrastructure & pertinence       | Fiabilité            |
| 156 | Feuille de route consolidée                   | Synthèse             |

---

## 129 — Proxy et protection des routes

```text
Audit le point « Proxy et protection des routes » dans Synclune.

`proxy.ts` (convention Next 16, ex-middleware) filtre chaque requête avant les Server Components. Il ne
valide PAS la session en base : il vérifie l'existence du cookie via `getSessionCookie` /
`getCookieCache` de Better Auth. Tout l'enjeu est que ce filtre reste un confort UX et jamais la seule
garde de sécurité.

Vérifie :
- l'exhaustivité et la justesse de la liste `publicRoutes` : chaque entrée correspond-elle à une route
  ou une redirection réelle ? Traque les entrées mortes (chemins supprimés) et surtout les entrées
  manquantes qui provoquent une redirection parasite vers la connexion ;
- que TOUTE page ou action derrière le proxy revalide côté serveur (`requireAuth()` / `requireAdmin*()`
  / `isAdmin()`) — le proxy seul ne protège rien, un cookie suffit à le passer ;
- le traitement des routes admin : le proxy ne doit jamais laisser croire qu'il vérifie un rôle ;
- les redirections : boucles possibles, préservation de la destination initiale (`callbackURL`), et
  absence de redirection ouverte (cf. prompt 142) ;
- le matcher / la portée : les assets, `/api/**`, les webhooks Stripe et les crons ne doivent pas être
  interceptés (un webhook redirigé = paiement perdu) ;
- le commentaire d'en-tête affirme que la CSP est posée dans `next.config.ts` et NON ici, à cause de
  l'extraction de nonce par Next — vérifie que c'est toujours vrai (une CSP en requête casse les
  Server Actions) ;
- la cohérence avec `app/{forbidden,unauthorized,not-found,global-error}.tsx` et
  `app/_components/not-found-shell.tsx` : un accès refusé produit-il la bonne surface ?

Inspecte `proxy.ts`, `modules/auth/lib/require-auth*`, `modules/auth/utils/guards*`, `next.config.ts`
(`headers()`, `redirects`), `app/{forbidden,unauthorized,not-found,global-error}.tsx`,
`app/_components/not-found-shell.tsx`, `e2e/admin-security.spec.ts`.

Note /100, classe toute route privée atteignable sans re-vérification serveur en P0, et toute entrée
morte ou manquante de `publicRoutes` en P2/P1 selon l'impact.
```

---

## 130 — Frontière Server / Client Components

```text
Audit le point « Frontière Server / Client Components » dans Synclune.

Avec ~540 fichiers dans `app/` et ~2600 dans `modules/`, la discipline RSC est structurante. Vérifie :
- chaque `"use client"` est-il justifié ? Traque les composants clients qui n'ont ni état, ni effet, ni
  gestionnaire d'événement, ni hook navigateur — ils alourdissent le bundle pour rien ;
- la remontée de la frontière : un `"use client"` haut dans l'arbre bascule tout son sous-arbre. Cherche
  les cas où descendre la frontière d'un niveau rendrait des dizaines de composants au serveur ;
- la sérialisation des props franchissant la frontière : pas de fonction, de classe, de `Date` ambiguë,
  d'instance Prisma ni d'objet Decimal passés à un composant client (une fonction de formatage passée à
  un client fait ÉCHOUER le build) ;
- les données sur-transmises : un Server Component qui passe un objet Prisma complet à un client expose
  des champs inutiles dans le HTML (fuite potentielle : email, `stripeCustomerId`, coût) ;
- `cookies()` / `headers()` / `getSession()` dans un fichier marqué `"use cache"` — incompatible par
  construction ; vérifie que le pattern wrapper décrit dans `CLAUDE.md` est respecté partout ;
- les Server Actions importées dans des composants clients : sont-elles toutes validées et gardées
  (elles constituent une surface HTTP publique) ?
- `import "server-only"` / `"client-only"` : sont-ils utilisés pour verrouiller les modules sensibles
  (Prisma, Stripe secret, env serveur) ?

Inspecte largement `app/**`, `modules/*/components/**`, `shared/components/**`, `shared/lib/prisma.ts`,
`shared/lib/env.ts`, et échantillonne les composants les plus lourds.

Note /100, classe toute fuite de donnée serveur vers le HTML client en P0/P1, et liste les `"use client"`
supprimables avec le gain estimé.
```

---

## 131 — PPR, Cache Components & streaming

```text
Audit le point « PPR, Cache Components & streaming » dans Synclune.

`next.config.ts` active `cacheComponents: true` et déclare 4 profils dans `cacheLife`. Les prompts 16/17/18
couvrent la justesse des tags et des profils ; celui-ci couvre le RENDU : ce que voit l'utilisateur pendant
que la page se compose.

Vérifie :
- le découpage prérendu / dynamique : quelle part de chaque page critique (accueil, catalogue, fiche
  produit) est servie instantanément, et quelle part attend la base ?
- les frontières `<Suspense>` : sont-elles posées autour de ce qui est réellement lent, ou trop haut (toute
  la page attend) / trop bas (cascade de dizaines de squelettes) ?
- `loading.tsx` par route : le squelette correspond-il à la géométrie finale (sinon CLS) ?
- les cascades de requêtes : deux `await` séquentiels qui pourraient être un `Promise.all` retardent le
  premier octet utile ;
- le streaming en conditions réelles : sur un mobile en 3G simulée, l'ordre d'apparition raconte-t-il
  quelque chose de sensé (le prix avant les avis, jamais l'inverse) ?
- les erreurs pendant le streaming : une donnée qui échoue après le début du flux — que voit-on ?
- l'usage de `connection()` / `await` explicite pour marquer l'entrée en dynamique, si présent.

Inspecte `next.config.ts` (`cacheComponents`, `cacheLife`), tous les `app/**/loading.tsx`, les
`page.tsx` des routes critiques, `modules/*/data/**`, `e2e/performance.spec.ts`.

Note /100, classe toute page critique intégralement dynamique alors qu'elle pourrait être prérendue en
P1, et propose le découpage Suspense cible.
```

---

## 132 — Résilience des dépendances externes

```text
Audit le point « Résilience des dépendances externes » dans Synclune.

Le projet embarque un disjoncteur (`shared/lib/circuit-breaker.ts`, instances `stripeCircuitBreaker` et
`resendCircuitBreaker`) et un helper de retry (`shared/utils/with-retry.ts`). Vérifie que cette défense
est réellement branchée et correctement réglée.

Vérifie :
- la couverture : quels appels sortants passent par le disjoncteur, lesquels l'ignorent ? Stripe, Resend,
  UploadThing, Neon, Sentry — dresse la carte ;
- les seuils : nombre d'échecs avant ouverture, durée d'ouverture, condition de fermeture. Un seuil trop
  bas coupe les paiements sur un incident passager, trop haut ne protège de rien ;
- ce qui se passe QUAND il est ouvert : le client voit-il un message honnête, la commande est-elle
  perdue, ou mise en file (PostWebhookTask, DLQ) ?
- l'interaction avec l'idempotence : un retry ne doit jamais produire un double paiement, un double
  email ou une double facture (croise avec le prompt 10) ;
- les timeouts explicites sur chaque appel réseau — un `fetch` sans timeout peut bloquer une Server
  Action jusqu'au timeout de la plateforme ;
- la distinction erreur transitoire / permanente : `shared/lib/stripe-errors.ts` et
  `classifyStripeError` sont-ils utilisés partout où une décision de retry est prise ?
- la remontée : un disjoncteur qui s'ouvre doit produire un signal (Sentry, alerte admin), pas juste un
  log.

Inspecte `shared/lib/circuit-breaker.ts`, `shared/utils/with-retry.ts`, `shared/lib/stripe-errors.ts`,
`shared/lib/{stripe,stripe-client,uploadthing}.ts`, `modules/emails/services/**`,
`modules/webhooks/**`, `modules/cron/services/**`, `app/api/health/route.ts`.

Note /100, classe tout appel critique sans timeout ni classification d'erreur en P1, et tout retry
susceptible de doubler une opération financière en P0.
```

---

## 133 — Dates, fuseaux horaires & bornes de période

```text
Audit le point « Dates, fuseaux horaires et bornes de période » dans Synclune.

Trois implémentations coexistent : `shared/utils/timezone.ts`, `modules/store-settings/utils/paris-datetime.ts`
et `modules/dashboard/services/period-boundaries.service.ts`. Un décalage de fuseau fausse le chiffre
d'affaires, décale une fermeture de boutique et peut déplacer une facture d'un exercice à l'autre.

Vérifie :
- la règle : que stocke-t-on en base (UTC ?), qu'affiche-t-on (Europe/Paris ?), et où se fait la
  conversion ? La règle est-elle écrite quelque part ou reconstituée au cas par cas ?
- les trois implémentations font-elles la même chose ? Si oui, laquelle est le SSOT et pourquoi les
  autres survivent ;
- les bornes de période des KPI et du graphique de revenu : « aujourd'hui », « ce mois », « 30 derniers
  jours » — début de journée en heure de Paris ou en UTC ? Un écart de 2 h en été déplace des commandes
  d'un jour à l'autre ;
- l'heure d'été / d'hiver : les jours de bascule (23 h ou 25 h), et les crons planifiés en UTC par
  Vercel dont l'heure locale se décale de mars à octobre (`reconcile-invoices` à 2:00, `hard-delete-retention`,
  `cleanup-pending-orders` à 3:00 — collision possible) ;
- les échéances légales : rétention 10 ans (`paidAt + 10 ans`), délai de rétractation, dates de facture
  et d'avoir — toute erreur y est une erreur de conformité ;
- le rendu déterministe des PDF (un test de régression y veille déjà) ;
- l'affichage client : dates au format FR, pas de `toLocaleDateString()` sans fuseau explicite (rendu
  serveur ≠ rendu client = erreur d'hydratation).

Inspecte `shared/utils/{timezone,dates}.ts`, `modules/store-settings/utils/paris-datetime.ts`,
`modules/dashboard/services/period-boundaries.service.ts`, `modules/dashboard/data/{get-kpis,get-revenue-chart}.ts`,
`modules/invoices/services/render-invoice-pdf.ts`, `vercel.json`, `modules/cron/constants/schedules.ts`.

Note /100, classe toute erreur de borne affectant un montant ou une échéance légale en P0/P1.
```

---

## 134 — Performance des requêtes Prisma

```text
Audit le point « Performance des requêtes Prisma » dans Synclune.

Le prompt 64 couvre le schéma et les index déclarés ; celui-ci couvre les REQUÊTES réelles de la couche
`data/` des 24 modules.

Vérifie :
- les N+1 : boucle sur des résultats avec une requête à l'intérieur, ou `include` manquant là où une
  jointure suffirait. Traque particulièrement les listes (catalogue, commandes admin, avis) ;
- le sur-fetch : `findMany` sans `select`, qui ramène toutes les colonnes (descriptions longues, JSON
  de snapshot) pour n'en afficher que trois ;
- les comptages : `count()` sur une grande table à chaque rendu de page, alors qu'un compteur approché
  ou caché suffirait ;
- la pagination : les curseurs sont-ils réellement indexés ? Un `skip` élevé dégrade linéairement ;
- les index déclarés mais jamais utilisés par une requête réelle, et les requêtes fréquentes sans index
  couvrant (croise le `where` + `orderBy` de chaque `data/` avec `prisma/schema.prisma`) ;
- les agrégations de tableau de bord : sont-elles cachées via le profil `user`, ou recalculées à chaque
  visite ?
- les requêtes dans les Server Actions : les lectures de validation avant mutation sont légitimes
  (cf. `CLAUDE.md`), mais restent-elles ciblées ?
- le pool Neon : nombre de connexions, requêtes longues, `$queryRaw` justifiés.

Inspecte `modules/*/data/**`, `modules/*/services/*query-builder*`, `prisma/schema.prisma`,
`shared/lib/{prisma,pagination}.ts`, `shared/components/cursor-pagination/**`.

Note /100, liste les 10 requêtes les plus coûteuses avec leur correctif, et classe tout N+1 sur un
chemin storefront en P1.
```

---

## 135 — Concurrence, verrous & TOCTOU

```text
Audit le point « Concurrence, verrous et TOCTOU » dans Synclune.

Ce repo a une histoire de bugs de course (stock, statuts de commande, séquences de facture, nettoyage de
checkout). Vérifie que chaque section critique est réellement sérialisée.

Vérifie :
- les schémas de garde utilisés : advisory locks Postgres, `SELECT ... FOR UPDATE`, `updateMany` avec
  condition dans le `where` (garde atomique), contrainte unique + rattrapage de P2002. Sont-ils
  cohérents, ou chacun fait-il à sa façon ?
- le piège central : une `$transaction` en READ COMMITTED ne protège PAS un « lire puis décider puis
  écrire ». Traque tout `findFirst`/`findUnique` suivi d'un `update` conditionné par ce qu'on vient de
  lire — le motif correct est un `updateMany` dont le `where` porte la condition, et dont on inspecte
  le `count` ;
- le stock : deux ajouts au panier simultanés sur le dernier exemplaire, deux checkouts concurrents ;
- les transitions de statut : deux admins qui agissent en même temps, un webhook qui arrive pendant une
  action admin ;
- les séquences de numérotation (facture, avoir) : verrous par année, timeouts longs, codes réessayables ;
- les webhooks concurrents sur la même commande, et l'ordre non garanti des événements Stripe ;
- les crons qui se chevauchent : un run qui dépasse son intervalle croise le suivant — y a-t-il un
  verrou d'exécution ?
- les timeouts : `TX_TIMEOUT_LONG` / `TX_MAX_WAIT_LONG` là où l'attente d'un verrou compte dans le budget.

Inspecte `modules/payments/services/order-creation.service.ts`, `modules/orders/actions/**`,
`modules/invoices/services/*sequence*`, `modules/webhooks/**`, `modules/skus/actions/**`,
`shared/lib/{prisma,prisma-tx-options}.ts`, les `*.integration.test.ts` et les
`*concurrency*.regression.test.ts`.

Note /100, classe toute survente, tout double encaissement et tout trou de séquence possible en P0.
Pour chaque risque, dis s'il est prouvé par un test d'intégration ou seulement supposé.
```

---

## 136 — Feature flags & configuration runtime

```text
Audit le point « Feature flags et configuration runtime » dans Synclune.

La configuration vient de trois endroits : les variables d'environnement (`shared/lib/env.ts` +
`shared/schemas/env.schema.ts`, ~200 lignes de validation Zod), les flags de facturation
(`modules/invoices/constants/feature-flags.ts`) et des constantes SSOT (`shared/constants/**`, dont
`orders-availability.ts` qui pilote l'ouverture des commandes).

Vérifie :
- la validation au démarrage : une variable manquante ou mal formée fait-elle échouer tôt, avec un
  message clair, ou plante-t-elle en production au premier appel ?
- la frontière client/serveur : aucun secret ne doit être lisible via une variable `NEXT_PUBLIC_*`
  (croise avec le prompt 28) ;
- les valeurs par défaut : sont-elles sûres ? Un flag absent doit désactiver, pas activer, une capacité
  réglementée (`INVOICE_ENABLE_EREPORTING` en particulier) ;
- la cohérence entre `.env.example` et le schéma : toute variable requise est-elle documentée, et
  inversement ?
- les flags morts : un flag jamais lu, ou lu mais dont les deux branches sont identiques ;
- les constantes SSOT compilées : `ORDERS_AVAILABLE` change le comportement de la boutique mais exige
  un redéploiement — est-ce assumé et documenté (cf. prompt 153) ?
- la traçabilité : sait-on, en production, quelle combinaison de flags est active (log de démarrage,
  endpoint de santé) ?

Inspecte `shared/lib/env.ts`, `shared/schemas/env.schema.ts`, `.env.example`,
`modules/invoices/constants/feature-flags.ts`, `shared/constants/orders-availability.ts`,
`next.config.ts`, `app/api/health/route.ts`.

Note /100, classe tout défaut par défaut dangereux en P1 et tout secret exposé en P0.
```

---

## 137 — Analytics, tracking & consentement

```text
Audit le point « Analytics, tracking et consentement » dans Synclune.

Il existe une couche de tracking (`shared/lib/analytics/track.ts`), des traceurs de conversion
(`shared/components/analytics/{purchase-tracker,view-item-tracker}.tsx`), un rapporteur de Web Vitals
(`app/_components/web-vitals-reporter.tsx`) et un store de consentement
(`shared/stores/cookie-consent-store.ts`).

⚠️ Commence par établir la RÉALITÉ : quel fournisseur est réellement branché en bout de chaîne ? Si les
événements ne partent nulle part, dis-le franchement — c'est le constat principal, et tout le reste de
l'audit s'y subordonne.

Vérifie ensuite :
- la couverture du tunnel : vue produit, ajout au panier, début de checkout, achat, remboursement.
  Manque-t-il une étape qui rend le taux de conversion incalculable ?
- le gating par consentement : aucun événement, aucun cookie, aucun script tiers avant acceptation. Le
  refus doit être respecté durablement (croise avec les prompts 29 et 127) ;
- l'absence de PII dans les événements (email, adresse, nom) et dans les Web Vitals ;
- la fiabilité de l'événement d'achat : émis une seule fois par commande, même en cas de
  rafraîchissement de la page de confirmation ou de retour arrière ;
- la cohérence des montants envoyés (centimes vs euros — un facteur 100 dans un tableau de bord
  d'analytics est un classique de ce repo) ;
- le coût client : poids du script, blocage du rendu, impact INP.

Inspecte `shared/lib/analytics/track.ts`, `shared/components/analytics/**`,
`app/_components/web-vitals-reporter.tsx`, `shared/stores/cookie-consent-store.ts`,
`shared/providers/cookie-consent-store-provider.tsx`, `shared/components/cookie-banner*.tsx`,
`app/paiement/confirmation/**`, `next.config.ts` (CSP : un fournisseur non autorisé y serait bloqué).

Note /100. Si la chaîne est ouverte (événements sans destination), classe-le en P1 et chiffre ce qu'on
ne mesure pas. Classe tout tracking avant consentement en P0.
```

---

## 138 — Icônes, favicons & métadonnées d'application

```text
Audit le point « Icônes, favicons et métadonnées d'application » dans Synclune.

Décision de produit à respecter : **Synclune n'est PAS une PWA** — pas de manifest, pas de service
worker, pas de mode hors ligne. Ne propose pas d'en (re)créer un ; si tu penses que c'est pertinent,
mets-le en annexe « chantier séparé » avec son coût. En revanche l'ajout à l'écran d'accueil iOS
fonctionne sans manifest, via les icônes et les écrans de démarrage.

Vérifie :
- le jeu d'icônes : `shared/constants/icons-config.ts` (`ICONS_CONFIG`) déclare favicons, icônes Apple
  et 10 écrans de démarrage. Chaque fichier déclaré existe-t-il dans `public/icons/` ou `public/splash/` ?
  Et inversement : reste-t-il des assets non référencés (poids mort) ?
- la synchronisation manuelle signalée en commentaire entre `shared/constants/brand-colors.ts`
  (`BRAND_PINK.theme`), `public/browserconfig.xml` (`TileColor`) et `msapplication-TileColor` /
  `themeColor` de `root-metadata.ts` : trois copies de la même couleur, aucune garde automatique.
  Propose une garde (test ou génération) ;
- `app/favicon.ico`, `app/opengraph-image.tsx` et les `opengraph-image.tsx` par route : rendu réel,
  dimensions, poids, lisibilité en vignette ;
- `rootViewport` : `viewportFit: "cover"`, `maximumScale: 5`, `userScalable: true` — le zoom doit rester
  autorisé (accessibilité) ;
- les résidus PWA : `app/styles/pwa.css` est mal nommé (il porte surtout des styles mobiles, safe-area,
  View Transitions et Vaul, tous vivants) mais contient des blocs `@media (display-mode: standalone)`
  désormais inatteignables. Signale-les sans casser le reste du fichier.

Inspecte `shared/constants/{icons-config,root-metadata,brand-colors}.ts`, `public/icons/`,
`public/splash/`, `public/browserconfig.xml`, `app/favicon.ico`, `app/opengraph-image.tsx`,
`app/styles/pwa.css`, `app/globals.css`.

Note /100, classe toute icône déclarée mais absente en P2, et propose la garde anti-dérive des couleurs.
```

---

## 139 — Rendu des emails (compatibilité clients)

```text
Audit le point « Rendu des emails » dans Synclune.

Les prompts 42/43/44 couvrent le contenu, l'idempotence et les déclencheurs. Celui-ci couvre le RENDU :
ce que voit réellement le destinataire dans son client de messagerie.

Vérifie sur les 12 templates :
- la cohérence du système visuel : `emails/_components/` et `emails/email-colors.ts` sont-ils utilisés
  partout, ou certains templates redéfinissent-ils leurs couleurs et leurs espacements ?
- la compatibilité : Gmail (web + iOS + Android), Apple Mail, Outlook. Les pièges habituels — pas de
  flexbox ni de grid, mise en page par tableaux, styles inline, largeur fixe ~600px, pas de
  `position`, pas de webfont bloquante ;
- le mode sombre : Gmail et Apple Mail inversent les couleurs. Un logo sombre sur fond transparent
  devient invisible. Synclune est clair uniquement côté site, mais le client mail impose son mode ;
- les images bloquées par défaut : le message reste-t-il compréhensible sans images ? Chaque image a-t-elle
  un `alt` utile ? Les informations critiques (numéro de commande, montant, lien) sont-elles en texte ?
- le préambule (`preview` / preheader) : est-il défini, et dit-il quelque chose d'utile ?
- les liens : URL absolues, cibles valides en production, pas de `localhost`, jeton de désinscription
  fonctionnel ;
- l'accessibilité : contraste, taille de police ≥ 14px, structure de titres, langue déclarée (`fr`) ;
- le poids total et le risque de troncature Gmail (au-delà de ~102 Ko, Gmail coupe le message) ;
- la version texte brut : existe-t-elle, est-elle lisible ?

Inspecte `emails/**` (12 templates + `_components/` + `email-colors.ts`), `emails/__tests__/**`,
`shared/lib/email-config.ts`, `modules/emails/services/**`. Utilise `pnpm email:dev` (port 3001) pour
voir le rendu réel plutôt que de le déduire du JSX.

Note /100, classe tout email illisible sans images ou en mode sombre en P1, et rends le verdict template
par template.
```

---

## 140 — Parcours retour / rétractation client

```text
Audit le point « Parcours retour et rétractation » dans Synclune.

Le droit de rétractation de 14 jours (vente à distance, Code de la consommation) est une obligation, pas
une option. Côté code, `modules/refunds/actions/request-return.ts` et
`modules/refunds/components/customer/request-return-button.tsx` existent.

⚠️ Établis d'abord la réalité de bout en bout : quand un client clique sur « demander un retour », que se
passe-t-il EXACTEMENT ? Suis la chaîne complète — écriture en base, email au client, alerte admin, entrée
dans le tableau de bord, historique de commande. Si un maillon manque, le client peut demander un retour
sans que personne ne le sache : dis-le franchement et classe-le selon l'impact.

Vérifie ensuite :
- la cohérence avec la page légale `/retractation` : le délai, le point de départ, les exclusions et la
  procédure annoncés correspondent-ils au comportement réel ?
- les bijoux personnalisés / sur-mesure : exclus du droit de rétractation par la loi. L'interface le
  reflète-t-elle ?
- l'éligibilité : sur quelles commandes le bouton apparaît-il (statut, délai écoulé, commande déjà
  remboursée) ? Une demande sur une commande inéligible doit être refusée côté serveur, pas seulement
  masquée côté UI ;
- l'idempotence : deux clics, deux onglets, un rafraîchissement — une seule demande ;
- l'articulation avec le remboursement admin (prompts 36/91) et l'avoir (prompt 33) : la demande
  client débouche-t-elle sur un chemin admin clair ?
- la trace : `OrderHistory` (immuable, sans PII client — cf. invariant 3) doit consigner la demande ;
- l'expérience : le client sait-il où en est sa demande, ou reste-t-il sans nouvelle ?

Inspecte `modules/refunds/actions/request-return.ts`, `modules/refunds/components/customer/**`,
`modules/refunds/{schemas,constants}/**`, `app/(legal)/retractation/page.tsx`,
`app/(account)/commandes/[orderNumber]/**`, `modules/emails/services/**`, `modules/orders/services/**`.

Note /100, classe toute demande client sans notification ni trace en P1 (P0 si elle est en plus
juridiquement due), et propose le chemin complet manquant.
```

---

## 141 — Injection dans le HTML brut & JSON-LD

```text
Audit le point « Injection dans le HTML brut et JSON-LD » dans Synclune.

Le repo compte une dizaine de `dangerouslySetInnerHTML`, presque tous pour injecter des données
structurées, plus des helpers dédiés : `shared/utils/safe-json-ld.ts`, `shared/lib/sanitize.ts`,
`shared/utils/script-env.ts`.

Vérifie :
- chaque `dangerouslySetInnerHTML` du repo, un par un : la donnée injectée passe-t-elle par
  `safeJsonLd()` ou un assainissement équivalent ? Une seule injection non filtrée sur du contenu
  contrôlable (titre de produit, description, nom de collection, avis client) suffit à casser le
  contexte `<script>` et exécuter du JavaScript ;
- ce que fait réellement `safeJsonLd` : échappe-t-il `<`, `>`, `&`, `</script>`, les séparateurs de
  ligne U+2028/U+2029 ? Un échappement partiel donne une fausse sécurité ;
- les avis clients et les champs libres admin (notes de commande, descriptions) : ce sont les entrées
  les moins fiables du système ;
- la CSP comme deuxième barrière : `script-src` autorise-t-il `unsafe-inline` ? Si oui, l'injection
  JSON-LD n'a aucun filet. Vérifie la stratégie de nonce et son interaction avec les scripts de
  streaming React ;
- `shared/lib/sanitize.ts` : où est-il utilisé, et pourquoi pas ailleurs ?
- les autres vecteurs : `<style>` injecté, attributs `href`/`src` construits (`javascript:`), rendu de
  Markdown éventuel, contenu d'email (les templates échappent-ils leurs interpolations ?) ;
- le rapport de violation : `app/api/csp-report/route.ts` reçoit-il quelque chose, et qui le regarde ?

Inspecte tous les `dangerouslySetInnerHTML` (`grep -rn "dangerouslySetInnerHTML" app shared modules emails`),
`shared/utils/{safe-json-ld,script-env}.ts`, `shared/lib/sanitize.ts`,
`shared/components/structured-data.tsx`, `next.config.ts` (CSP), `app/api/csp-report/route.ts`.

Note /100, classe toute injection non assainie de contenu contrôlable par un tiers en P0.
```

---

## 142 — Redirections & liens sortants

```text
Audit le point « Redirections et liens sortants » dans Synclune.

Vérifie que rien ne permet d'envoyer un utilisateur authentifié vers un domaine choisi par un attaquant,
ni de fuiter un jeton en chemin.

Vérifie :
- les redirections après authentification : `callbackURL` Better Auth, retour au panier ou au checkout
  après connexion, redirections de `proxy.ts`. Toute destination issue d'une URL doit être validée
  contre une liste d'origines autorisées — `shared/utils/is-safe-storefront-link.ts` existe : est-il
  appliqué à TOUS les points d'entrée, ou seulement à certains ?
- les formes contournantes d'une validation naïve : `//evil.com`, `https:/\evil.com`, `/\evil.com`,
  URL encodée, `@` dans l'autorité, redirection relative qui remonte hors du site ;
- les redirections déclarées dans `next.config.ts` (`redirects`, ex. `/a-propos` → `/`) : cohérentes
  avec `publicRoutes` de `proxy.ts` et avec le sitemap ?
- les liens sortants : `target="_blank"` accompagné de `rel="noopener noreferrer"` ;
- la fuite par `Referer` : un lien externe depuis une page contenant un jeton dans l'URL (facture,
  suivi de commande invité, désinscription) fuite ce jeton. La `Referrer-Policy` couvre-t-elle ce cas ?
- les redirections dans les emails et les liens de vérification / réinitialisation : URL absolues
  construites depuis une base de confiance, jamais depuis un en-tête `Host` de requête.

Inspecte `shared/utils/is-safe-storefront-link.ts`, `proxy.ts`, `next.config.ts` (`redirects`,
`headers`), `modules/auth/**` (flux `callbackURL`), `modules/notifications/utils/unsubscribe-token.ts`,
`app/api/orders/[orderNumber]/**`, `emails/**`, `shared/lib/navigation.ts`.

Note /100, classe toute redirection ouverte en P0 et toute fuite de jeton par `Referer` en P1.
```

---

## 143 — Tests de régression verrouillés & garde-fous

```text
Audit le point « Tests de régression verrouillés et garde-fous » dans Synclune.

Le repo compte plus de 100 fichiers `*.regression.test.ts(x)` et un dossier `test/conventions/`. C'est le
filet qui empêche les invariants métier de se déliter. Un filet qui a l'air vert sans rien garder est pire
que pas de filet.

Vérifie :
- l'inventaire : `grep -rn "@regression" --include="*.test.ts*"` — chaque fichier a-t-il bien son JSDoc
  `@regression <slug>` et le suffixe conventionnel ? Y a-t-il des tests de régression déguisés en tests
  ordinaires (donc modifiables sans review) ?
- la validité : chaque régression garde-t-elle encore quelque chose ? Traque celles qui portent sur du
  code supprimé, ou dont l'assertion a été assouplie jusqu'à l'inutilité ;
- les tests verts pour la mauvaise raison — le piège documenté de ce repo :
  - erreur Prisma simulée par `Object.assign(new Error(), { code: "P2002" })` : `instanceof` faux, le
    test passe sans rien vérifier (une vraie sous-classe est obligatoire) ;
  - garde-fou statique qui analyse la source avec un stripper de commentaires naïf, et qui avale des
    portions entières du fichier audité ;
  - assertion sur un mock plutôt que sur le comportement ;
  - `expect` dans une branche jamais atteinte ;
- les garde-fous statiques (ceux qui lisent le code source pour interdire un motif) : leur allowlist
  est-elle justifiée fichier par fichier, ou devenue un fourre-tout ?
- la couverture des 10 invariants de facturation de `CLAUDE.md` : chacun a-t-il son test, et le test
  correspond-il vraiment à l'invariant énoncé ?
- `test/conventions/no-react-memoization.regression.test.ts` : couvre-t-il tout le repo ?
- la documentation : le tableau des tests de régression de `CLAUDE.md` est-il à jour ?

Inspecte `grep -rl "@regression"`, tous les `*.regression.test.ts*`, `test/conventions/**`,
`test/contract/**`, `CLAUDE.md` (section « Tests régression dédiés »).

Note /100, classe tout test vert pour la mauvaise raison en P1 (P0 s'il garde un invariant financier ou
légal), et liste les invariants sans garde.
```

---

## 144 — Lint local, hooks git & conventions outillées

```text
Audit le point « Lint local, hooks git et conventions outillées » dans Synclune.

Le projet outille ses conventions plutôt que de les documenter seulement : un plugin ESLint maison
(`eslint-plugin-local/`, règle `require-cache-life`), deux hooks husky (`pre-commit`, `commit-msg`),
commitlint, prettier, editorconfig, et des correctifs automatiques (`scripts/react-doctor/*.mjs`).

Vérifie :
- la règle `require-cache-life` : que vérifie-t-elle exactement, est-elle activée dans
  `eslint.config.mjs`, et attrape-t-elle réellement un `"use cache"` sans `cacheLife()` ? Écris le cas
  qui devrait la déclencher et vérifie qu'elle le déclenche ;
- d'autres conventions du projet mériteraient-elles une règle plutôt qu'un paragraphe de `CLAUDE.md` ?
  Candidats : interdiction des tags de cache en littéral, `validateInput` obligatoire dans les Server
  Actions `ActionState`, interdiction d'écrire `invoiceNumber` hors des services autorisés ;
- le hook `pre-commit` : le filtre par module critique fonctionne-t-il (commit instantané si aucun
  module critique touché, tests sinon) ? Le regex du hook est-il synchronisé avec le glob du script
  `test:critical` de `package.json` — deux listes à maintenir à la main, dérive garantie ;
- `commit-msg` + commitlint : les types acceptés correspondent-ils aux conventions de `CLAUDE.md` ?
- ESLint : `--max-warnings=0` est-il tenable, y a-t-il des `eslint-disable` non justifiés, des règles
  désactivées globalement qui masquent de vrais défauts ?
- Prettier + editorconfig : indentation par tabulations respectée partout, `.prettierignore` justifié ;
- les scripts `react-doctor/*.mjs` : correctifs ponctuels ou outillage encore utile ? S'ils sont
  périmés, dis-le.

Inspecte `eslint-plugin-local/{index.mjs,rules/require-cache-life.mjs}`, `eslint.config.mjs`,
`.husky/{pre-commit,commit-msg}`, `commitlint.config.ts`, `.prettierrc`, `.prettierignore`,
`.editorconfig`, `package.json` (scripts), `scripts/react-doctor/**`.

Note /100, classe toute divergence entre le hook et `test:critical` en P2, et propose les règles ESLint
qui remplaceraient utilement une convention écrite.
```

---

## 145 — Scripts d'outillage & maintenance

```text
Audit le point « Scripts d'outillage et maintenance » dans Synclune.

`scripts/` contient une dizaine d'utilitaires : `audit-alt-text.ts`, `audit-lint.ts`,
`check-blur-placeholders.ts`, `cleanup-expired-carts.ts`, `cleanup-expired-wishlists.ts`,
`generate-video-thumbnails.ts`, `strip-video-audio.ts`, `test-database.ts`,
`validate-html-structure.cjs`, `lib/script-utils.ts` et `react-doctor/`.

Vérifie, pour chacun :
- est-il encore utilisé ? Par un script `package.json`, par la CI, par un humain, ou par personne ?
  Un script mort donne l'illusion d'un contrôle qui n'existe pas ;
- est-il sûr ? Les deux `cleanup-expired-*` écrivent en base : quelle base ciblent-ils, y a-t-il un
  garde-fou contre une exécution sur la production, sont-ils idempotents, que se passe-t-il si on les
  interrompt à la moitié ?
- pourquoi ces deux nettoyages sont-ils des scripts manuels alors que le nettoyage des commandes, des
  médias orphelins et des suppressions de compte sont des crons ? Un nettoyage qu'il faut penser à
  lancer n'est pas un nettoyage. Propose la bascule en cron ou la suppression assumée ;
- `test-database.ts` : peut-il toucher une base réelle ? Vérifie le refus explicite sur une URL
  contenant « prod » (le runner d'intégration a cette garde — le script l'a-t-il ?) ;
- les scripts d'audit (`audit-alt-text`, `check-blur-placeholders`, `validate-html-structure`) : leurs
  constats sont-ils actionnés, ou produisent-ils un rapport que personne ne lit ? Devraient-ils être
  des tests qui échouent en CI ?
- la robustesse : gestion des erreurs, code de sortie non nul en cas d'échec (sinon la CI l'ignore),
  journalisation utile.

Inspecte `scripts/**`, `package.json` (scripts), `.github/workflows/**`, `test/integration/setup.ts`
(pour comparer les gardes de base de données).

Note /100, classe tout script capable d'écrire en production sans garde en P0, et donne pour chacun un
verdict : garder / transformer en cron / transformer en test CI / supprimer.
```

---

## 146 — Pipeline de migration en production

```text
Audit le point « Pipeline de migration en production » dans Synclune.

`.github/workflows/migrate-deploy.yml` applique les migrations Prisma en production : déclenchement
manuel (`workflow_dispatch`) avec choix de cible et option de simulation, `prisma migrate status` avant,
`prisma migrate deploy`, puis `migrate status` de confirmation. Le prompt 65 couvre les `down.sql` ; celui-ci
couvre l'ACTE de déployer.

Vérifie :
- le garde-fou d'environnement : `environment:` GitHub impose-t-il une approbation manuelle sur la
  cible de production, et qui peut approuver ?
- la simulation : le mode `dry_run` empêche-t-il réellement l'application, ou est-ce seulement un
  affichage ?
- l'ordre code / base : une migration qui supprime ou renomme une colonne appliquée AVANT le déploiement
  du code casse la production en vol. Le pipeline impose-t-il un ordre, et la discipline
  « migrations rétrocompatibles d'abord » est-elle écrite quelque part ?
- l'échec au milieu : une migration qui échoue laisse la base dans un état partiel. Quelle est la
  procédure — `migrate resolve`, `down.sql`, restauration PITR (croise avec le prompt 151) ?
- les migrations longues : verrou de table sur une table volumineuse (`Order`, `OrderHistory`) pendant
  un `ALTER` bloque le site. Y a-t-il un contrôle de durée, un `lock_timeout` ?
- la cohérence avec les 133 migrations existantes et avec le `db push` du runner d'intégration (qui NE
  rejoue PAS les migrations : toute garde raw-SQL doit être listée dans `RAW_SQL_GUARD_MIGRATIONS`) ;
- les secrets : `DATABASE_URL` de production dans les secrets GitHub, portée limitée, pas de journal
  qui la révèle ;
- la trace : sait-on après coup qui a appliqué quoi et quand ?

Inspecte `.github/workflows/migrate-deploy.yml`, `prisma/migrations/**`, `prisma.config.ts`,
`test/integration/setup.ts`, `docs/RUNBOOK.md`.

Note /100, classe l'absence d'approbation manuelle sur la production en P1, et documente la procédure de
reprise après échec si elle manque.
```

---

## 147 — Analyse statique & veille des dépendances

```text
Audit le point « Analyse statique et veille des dépendances » dans Synclune.

Le prompt 78 couvre la chaîne d'approvisionnement (lockfile, scripts postinstall) ; celui-ci couvre la
DÉTECTION continue.

Vérifie :
- `.github/workflows/codeql.yml` : quels langages sont analysés, sur quels déclencheurs (push, PR,
  planification hebdomadaire lundi 6 h), et les alertes produites sont-elles regardées ? Un CodeQL dont
  personne ne lit les résultats est une case cochée ;
- la couverture réelle : CodeQL sur du TypeScript trouve surtout les injections et les flux de données
  douteux — croise ses catégories avec les surfaces sensibles du projet (Stripe, uploads, JSON-LD,
  redirections) ;
- les alertes de dépendances : Dependabot est-il configuré (fichier `.github/dependabot.yml`) ? Sinon,
  qu'est-ce qui prévient d'une CVE ? `pnpm audit` est-il exécuté en CI, et son échec bloque-t-il ?
- l'analyse des secrets : un secret committé serait-il détecté (secret scanning, hook local) ?
- les alertes non traitées : y a-t-il un stock d'avertissements accepté sans décision écrite ?
- la cohérence avec `pnpm knip` (prompt 77) et `pnpm doctor` : trois outils, trois rapports — qui les
  lit, et à quelle fréquence ?
- le blocage : parmi lint, typecheck, tests, CodeQL, audit, lesquels bloquent réellement une fusion ?
  Les protections de branche correspondent-elles à l'intention ?

Inspecte `.github/workflows/{codeql,ci}.yml`, `.github/dependabot.yml` (s'il existe), `knip.config.ts`,
`package.json`, `pnpm-lock.yaml`, `codecov.yml`, `react-doctor.config.json`.

Note /100, classe l'absence de veille CVE en P1, et dis explicitement quels contrôles bloquent une
fusion et lesquels sont décoratifs.
```

---

## 148 — Endpoints d'exploitation

```text
Audit le point « Endpoints d'exploitation » dans Synclune.

Quatre routes ne servent pas le produit mais son exploitation : `app/api/health/route.ts` (vérifie la
base et l'état des disjoncteurs Stripe/Resend, protégée par `requireAdminApiRoute` et une comparaison
`timingSafeEqual`), `app/api/csp-report/route.ts`, `app/api/noop/route.ts` (renvoie une source map vide)
et `app/api/orders/[orderNumber]/status/route.ts`.

Vérifie :
- `/api/health` : que révèle-t-il exactement ? Un message d'erreur de base de données renvoyé tel quel
  peut fuiter un hôte, un nom de base, une version. L'authentification est-elle réellement requise, et
  un service de surveillance externe peut-il l'appeler (sinon il ne sert à rien) ? La sonde
  elle-même est-elle bornée (timeout) pour ne pas s'ajouter à l'incident qu'elle mesure ?
- `/api/csp-report` : reçoit-il vraiment les violations (la directive `report-uri`/`report-to` est-elle
  posée dans la CSP) ? Est-il limité en débit — c'est un endpoint public non authentifié, donc un
  vecteur d'inondation ? Les rapports sont-ils agrégés quelque part ou jetés ?
- `/api/noop` : établis à quoi il sert réellement (source map vide — contournement d'un outil ?
  Sentry ?). S'il n'a plus d'usage, dis-le ;
- `/api/orders/[orderNumber]/status` : quelle autorisation ? Un numéro de commande devinable ne doit pas
  suffire à lire un statut. Y a-t-il un jeton, une session, une limitation de débit ? S'il sert au
  sondage d'un paiement asynchrone, quelle est la fréquence et qui l'arrête ?
- `/api/admin/orders/export` : croise avec le prompt 89 (permissions, injection CSV, PII) ;
- l'observabilité globale : ces endpoints sont-ils exclus des analytics, du sitemap et de l'indexation ?

Inspecte `app/api/{health,csp-report,noop}/route.ts`, `app/api/orders/[orderNumber]/status/route.ts`,
`app/api/admin/orders/export/route.ts`, `next.config.ts` (CSP, `tunnelRoute`), `shared/lib/rate-limit*`,
`proxy.ts` (`publicRoutes`), `app/robots.ts`.

Note /100, classe toute fuite d'information d'infrastructure en P1 et tout endpoint public non limité en
débit en P1/P2.
```

---

## 149 — Page d'aide & FAQ

```text
Audit le point « Page d'aide et FAQ » dans Synclune.

`app/(shop)/aide/page.tsx` et son composant de recherche `_components/aide-search-content.tsx`, alimentés
par `shared/constants/faq-items.tsx`, constituent le seul service après-vente en libre-service. La FAQ
d'accueil (`app/(shop)/(home)/_components/home-faq*.tsx`) puise-t-elle dans la même source ?

Vérifie :
- le SSOT : une seule liste de questions, ou deux copies qui divergent (accueil vs page d'aide) ?
- la couverture : les questions qui déclenchent réellement un contact — délais de fabrication et de
  livraison, entretien des bijoux, taille et ajustement, retour et rétractation, paiement sécurisé,
  commande sans compte, suivi, personnalisation — sont-elles traitées ? Liste celles qui manquent ;
- la recherche interne : tolère-t-elle les fautes, que montre-t-elle sans résultat, propose-t-elle une
  sortie (contact) ?
- l'articulation avec les pages légales (prompt 56) : la FAQ doit expliquer, les CGV engagent. Aucune
  contradiction n'est acceptable entre les deux — vérifie délais, frais de retour et exclusions ;
- le contact : est-il atteignable depuis l'aide, et depuis le tunnel d'achat ?
- le SEO : données structurées `FAQPage` (la page injecte déjà un `faqPageSchema`), une seule
  déclaration par page, cohérence avec le contenu visible ;
- l'accessibilité de l'accordéon : clavier, `aria-expanded`, ancres partageables ;
- le ton : réponses courtes, concrètes, dans la voix de la marque.

Inspecte `app/(shop)/aide/**`, `shared/constants/faq-items.tsx`,
`app/(shop)/(home)/_components/home-faq*.tsx`, `app/(legal)/**`, `shared/components/structured-data.tsx`.

Note /100, liste les questions manquantes et toute contradiction avec les CGV (P1).
```

---

## 150 — Documentation & onboarding

```text
Audit le point « Documentation et onboarding » dans Synclune.

La documentation de ce projet est dense : `CLAUDE.md` (instructions d'agent, invariants de facturation,
patterns), `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/{BUSINESS,RUNBOOK,AUDIT-PROMPTS,prompts-audit-synclune}.md`.
Une documentation fausse est plus coûteuse qu'une documentation absente : elle fait prendre de mauvaises
décisions avec assurance.

Vérifie, en confrontant CHAQUE affirmation au filesystem :
- les chemins cités existent-ils ? La dérive est un problème connu ici (un route group périmé, des
  modules inexistants, un nombre de crons faux) ;
- les inventaires chiffrés sont-ils exacts (nombre de crons, de templates d'email, de stores, de
  modules, de profils de cache) ?
- les surfaces décrites comme vivantes le sont-elles ? Traque l'inverse aussi : du code vivant que la
  doc ne mentionne pas ;
- les invariants de facturation de `CLAUDE.md` correspondent-ils au code et à leurs tests (croise avec
  le prompt 143) ?
- `docs/RUNBOOK.md` : les procédures sont-elles exécutables telles quelles par quelqu'un qui n'a pas
  écrit le code (commandes réelles, préconditions, vérification finale) ?
- `docs/BUSINESS.md` : seuils, statut fiscal et périmètre à jour ?
- `README` + `CONTRIBUTING` : un développeur qui arrive peut-il lancer le projet, la base, les tests et
  l'aperçu des emails sans aide ? Fais l'essai mentalement, étape par étape, et note le premier point
  de blocage ;
- `CHANGELOG.md` : tenu ou abandonné ? S'il est abandonné, dis-le plutôt que de le maintenir à moitié ;
- la documentation morte : configurations et fichiers orphelins de fonctionnalités retirées.

Inspecte `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/**`, `.env.example`, et
vérifie par sondage systématique.

Note /100, liste chaque affirmation fausse avec sa correction, et classe en P1 toute dérive susceptible
de faire violer un invariant métier.
```

---

## 151 — Sauvegarde, restauration & reprise

```text
Audit le point « Sauvegarde, restauration et reprise » dans Synclune.

Une boutique qui perd sa base perd ses commandes, ses factures et sa comptabilité — avec une obligation
de conservation de 10 ans (Art. L102 B LPF). `docs/RUNBOOK.md` évoque la restauration PITR Neon comme
issue de secours. Cet audit vérifie que l'issue existe vraiment.

Vérifie :
- la sauvegarde : quelle est la fenêtre de restauration PITR réellement offerte par le plan Neon utilisé ?
  Est-ce écrit quelque part, ou supposé ? Quel est le RPO (perte de données acceptable) et le RTO
  (temps de remise en service) implicites ?
- la restauration a-t-elle déjà été TESTÉE ? Une sauvegarde jamais restaurée n'est pas une sauvegarde.
  Propose une procédure d'essai sur une base de test ;
- les artefacts hors base : les PDF de factures et d'avoirs vivent sur UploadThing. Que se passe-t-il si
  UploadThing perd un fichier ou si le compte est suspendu ? Le hash SHA-256 en base permet de
  détecter la corruption (Passe 8 de `reconcile-invoices`) mais pas de reconstituer un PDF dont la
  régénération ne serait plus bit-identique. Y a-t-il un second exemplaire ?
- la cohérence croisée après restauration : la base restaurée à T-1 h et Stripe (source de vérité des
  paiements) divergent. Les crons de réconciliation suffisent-ils à recoller, et dans quel ordre les
  lancer ?
- la numérotation gap-free : une restauration en arrière peut réattribuer un numéro de facture déjà
  émis et envoyé. C'est un risque fiscal — est-il identifié, et quelle est la procédure ?
- les secrets et la configuration : reconstituables sans la personne qui les a créés ?
- la documentation : la procédure de reprise est-elle rédigée pour être suivie en situation de stress ?

Inspecte `docs/RUNBOOK.md`, `prisma/migrations/**`, `modules/invoices/services/**` (séquences, archivage,
intégrité), `modules/cron/services/**` (réconciliation), `shared/lib/uploadthing.ts`, `.env.example`.

Note /100, classe l'absence de procédure de restauration testée en P1, et le risque de réémission d'un
numéro de facture après restauration en P0 s'il n'est pas traité.
```

---

## 152 — Coûts, quotas & limites fournisseurs : DONE

```text
Audit le point « Coûts, quotas et limites fournisseurs » dans Synclune.

Une micro-entreprise ne peut pas absorber une facture d'infrastructure imprévue, ni une coupure de
service pour dépassement de quota. Les fournisseurs en jeu : Vercel (invocations, bande passante,
transformations d'images), Neon (temps de calcul, stockage, branches), UploadThing (stockage, trafic),
Resend (volume d'emails, domaine), Sentry (événements, rétention), Stripe (commission par transaction).

Vérifie :
- pour chaque fournisseur : quel plan, quelles limites, que se passe-t-il au dépassement (facturation à
  l'usage ou coupure) ? Sais-tu le dire, ou est-ce une zone d'ombre ?
- les postes qui grossissent tout seuls : transformations `next/image` (nombre de tailles × nombre de
  produits), volume d'événements Sentry (`tracesSampleRate` — un taux à 1 en production explose vite),
  stockage UploadThing qui n'est jamais purgé, temps de calcul Neon réveillé par 11 crons ;
- les crons : leur fréquence est-elle proportionnée au volume réel (~20 commandes/mois d'après les
  commentaires de la CI) ? `retry-post-webhook-tasks` toutes les 5 minutes réveille la base 8 640 fois
  par mois — pour quel bénéfice s'il n'y a rien à rejouer ?
- les emails : le volume a déjà été réduit volontairement ; le périmètre actuel tient-il dans le plan
  Resend, en comptant les pics (retour en stock sur un produit populaire) ?
- l'abus : sans limitation de débit inter-instances (le projet l'assume : compteur en mémoire par
  instance), un script hostile peut multiplier les invocations et les requêtes. Quel est le pire coût
  atteignable en une journée ?
- les garde-fous : y a-t-il des alertes de dépassement configurées, ou découvrira-t-on le problème sur
  la facture ?

Inspecte `vercel.json`, `next.config.ts` (`images`), `sentry.*.config.ts`, `instrumentation*.ts`,
`shared/lib/{uploadthing,rate-limit,rate-limit-config}.ts`, `modules/cron/constants/schedules.ts`,
`shared/lib/email-config.ts`, `.github/workflows/ci.yml` (minutes CI).

Note /100, chiffre le coût mensuel estimé et le pire cas, et classe tout risque de coupure de service
pour dépassement en P1.
```

---

## 153 — Boutique fermée & disponibilité des commandes

```text
Audit le point « Boutique fermée et disponibilité des commandes » dans Synclune.

Deux mécanismes se superposent : la constante de pré-lancement
`shared/constants/orders-availability.ts` (`ORDERS_AVAILABLE`, compilée — un changement exige un
redéploiement) et les réglages de boutique dynamiques `modules/store-settings/**` (fermeture jusqu'à une
date, réouverture automatique par le cron `reopen-store` toutes les 15 minutes).

Vérifie :
- la garde serveur : `assertStoreOpen()` est-elle appliquée à TOUTES les Server Actions de panier, de
  checkout et de paiement ? L'UI désactivée n'est qu'un confort — une action non gardée permet
  d'acheter dans une boutique fermée ;
- la cohérence des deux mécanismes : que se passe-t-il si `ORDERS_AVAILABLE` est vrai mais que la
  boutique est fermée jusqu'à une date, et l'inverse ? Lequel gagne, et est-ce écrit ?
- le contournement admin (`isVerifiedAdmin`) : un admin peut-il tester un achat boutique fermée, et
  cette exception est-elle sûre (re-vérification en base, pas de confiance au cookie) ?
- la course de la réouverture : le cron efface `closedUntil` aux dates échues ; un client en cours de
  checkout à cet instant obtient-il un état cohérent ?
- l'affichage : l'avis « commandes en pause » apparaît-il assez tôt — avant de remplir un panier, pas
  au moment de payer ? Les surfaces déclarées (fiche produit, pied de panier, page paiement, accueil)
  sont-elles toutes couvertes ? (Croise avec le prompt 127.)
- les fuites : un lien direct vers `/paiement`, un panier restauré depuis un cookie, une session
  reprise après la fermeture ;
- les effets de bord : emails, alertes de retour en stock, sitemap et données structurées
  (`offer-availability`) doivent refléter l'indisponibilité — annoncer un produit `InStock` alors
  qu'on ne peut pas commander est trompeur ;
- le jour du lancement : la procédure de bascule est-elle documentée et sans risque ?

Inspecte `shared/constants/orders-availability.ts`, `modules/store-settings/**`,
`shared/utils/offer-availability.ts`, `modules/cart/actions/**`, `modules/payments/actions/**`,
`app/api/cron/reopen-store/**`, `docs/RUNBOOK.md`.

Note /100, classe toute action d'achat non gardée côté serveur en P0.
```

---

## 154 — Vente à l'international & fiscalité

```text
Audit le point « Vente à l'international et fiscalité » dans Synclune.

Synclune est une micro-entreprise en franchise de TVA (Art. 293 B CGI). Le prompt 40 couvre la franchise
elle-même ; celui-ci couvre ce qui se passe quand on vend hors de France, et les seuils qui font sortir
du régime.

Vérifie :
- les pays réellement livrables : `shared/constants/countries.ts` est-il la seule source, et le
  formulaire d'adresse, les frais de port, les validations de code postal et de téléphone en dérivent-ils ?
  Un pays sélectionnable sans tarif d'expédition est un piège ;
- la devise : EUR unique. Un client hors zone euro comprend-il ce qu'il paie ?
- le seuil OSS de 10 000 € (ventes à distance intra-UE, cf. `docs/RUNBOOK.md`) : est-il suivi ? Qu'est-ce
  qui alerte quand on s'en approche ? Le franchissement change les obligations de TVA ;
- le seuil de franchise (85 000 € pour les marchandises, majoré 93 500 €), piloté par
  `VAT_FRANCHISE_THRESHOLD_EUR` : le suivi est-il automatisé, et sur la bonne base (encaissements,
  Art. 50-0 CGI) ? La zone grise du sur-mesure (prestation de service, seuil 37 500 €) est-elle
  identifiée comme telle ?
- la préparation à la sortie de franchise : `shared/constants/tax-categories.ts`, la ventilation de TVA
  la ventilation par taux de TVA est-elle prête à être activée, ou faudra-t-il
  tout écrire en urgence ?
- `shared/schemas/b2b-identifiers.schema.ts` : à quoi sert-il réellement ? S'il prépare un flux B2B
  (numéro de TVA intracommunautaire, SIRET), est-il cohérent avec un modèle assumé B2C — ou dormant ?
- les mentions obligatoires sur facture selon la destination, et les documents douaniers hors UE ;
- `modules/dashboard/services/urssaf-deadline.service.ts` : les échéances de déclaration sont-elles
  justes et visibles au bon moment ?

Inspecte `shared/constants/{countries,currency,tax-categories,vat-franchise}.ts`,
`shared/schemas/{address-schema,phone.schemas,b2b-identifiers.schema}.ts`,
`modules/invoices/**`, `modules/orders/**` (frais de port, adresses),
`modules/dashboard/services/urssaf-deadline.service.ts`, `docs/{BUSINESS,RUNBOOK}.md`.

Note /100, classe tout franchissement de seuil non détecté en P1 (risque fiscal), et tout pays
livrable sans tarif ni validation en P2.
```

---

## 155 — Recherche : infrastructure & pertinence

```text
Audit le point « Recherche : infrastructure et pertinence » dans Synclune.

Le prompt 54 couvre l'API et le prompt 117 l'interface ; celui-ci couvre le MOTEUR :
`shared/lib/pg-trgm-availability.ts` (détection de l'extension Postgres `pg_trgm`),
`shared/lib/fuzzy-search.ts`, `modules/products/data/{fuzzy-search,quick-search-products}.ts`.

Vérifie :
- la dépendance à `pg_trgm` : que se passe-t-il si l'extension est absente (base locale, base
  d'intégration, nouvelle branche Neon) ? Le repli est-il silencieux et dégradé, ou visible ? Une
  recherche qui ne trouve plus rien sans le dire est pire qu'une erreur ;
- la détection : est-elle faite une fois et mise en cache, ou à chaque requête (coût inutile) ?
- les index de recherche : existent-ils réellement en base (index GIN trigramme sur les colonnes
  interrogées), sont-ils créés par une migration, et le runner d'intégration les applique-t-il
  (`db push` ne rejoue pas les migrations raw-SQL) ?
- la pertinence : ordre des résultats, pondération titre vs description vs collection, gestion des
  accents, du pluriel, de la casse, des termes composés (« collier lune » doit trouver) ;
- les fautes de frappe : seuil de similarité — trop strict on ne trouve rien, trop laxiste on trouve
  n'importe quoi. Est-il réglé empiriquement sur le vrai catalogue ?
- le vide : zéro résultat propose-t-il une correction (`search-correction-suggestion`) ou des
  suggestions de repli (`search-fallback-suggestions`) ?
- le périmètre : la recherche ne doit jamais exposer un produit `DRAFT`, `ARCHIVED` ou supprimé
  logiquement ;
- la performance et l'abus : coût d'une requête sur le catalogue complet, limitation de débit sur la
  Server Action de recherche, longueur maximale de la requête.

Inspecte `shared/lib/{pg-trgm-availability,fuzzy-search}.ts`,
`modules/products/data/{fuzzy-search,quick-search-products,get-quick-search-data}.ts`,
`modules/products/actions/quick-search.ts`, `prisma/migrations/**` (index GIN),
`test/integration/setup.ts`, `e2e/search.spec.ts`.

Note /100, classe tout repli silencieux qui vide les résultats en P1, et tout produit non public
atteignable par la recherche en P0.
```

---

## 156 — Feuille de route consolidée

```text
Audit le point « Feuille de route consolidée » dans Synclune.

Prompt de SYNTHÈSE FINALE : à lancer après plusieurs audits, en complément du prompt 99 (état de
préparation à la production) et du prompt 128 (plan de refonte UI/UX). Ceux-là répondent « est-ce prêt ? »
et « qu'est-ce qu'on refond ? ». Celui-ci répond : **dans quel ordre agir, et qu'est-ce qu'on ne fait
pas ?**

Rassemble les constats disponibles (rapports d'audit précédents, mémoires de session, `docs/`, tests de
régression, TODO du code) et produis :

1. Un TABLEAU DE BORD : par domaine (paiement, commandes, facturation, RGPD, sécurité, cache,
   interfaces, tests, exploitation), la note, la date du dernier audit, et les P0/P1 ouverts. Marque
   explicitement les domaines jamais audités — un trou est une information.
2. LA LIGNE DE FLOTTAISON : la liste courte de ce qui doit être corrigé AVANT d'ouvrir les commandes.
   Critère unique : est-ce qu'un client peut perdre de l'argent, ne pas recevoir sa commande, voir les
   données d'un autre, ou est-ce qu'une obligation légale est violée ? Tout le reste attend.
3. LA DETTE ASSUMÉE : ce qu'on choisit de ne PAS corriger, avec la raison et le risque accepté. Un
   projet sain a une dette explicite ; ce repo a déjà des choix de ce type (limitation de débit en
   mémoire par instance, pas de PWA, pas de dark mode, e-reporting à construire pour 2027) —
   liste-les comme des décisions, pas comme des défauts.
4. L'ORDRE D'EXÉCUTION : séquence les chantiers en tenant compte des dépendances (ex. le cache avant
   la performance, les tests avant les refontes, les fondations UI avant les surfaces) et des conflits
   de périmètre entre missions.
5. CE QU'IL FAUT SUPPRIMER : code mort, fonctionnalités fantômes, configurations orphelines, tests qui
   ne gardent plus rien. Retirer est aussi un progrès, et c'est souvent le chantier le mieux rentable.
6. LE PROCHAIN AUDIT : quel prompt lancer ensuite, et pourquoi celui-là.

Inspecte les rapports d'audit existants, `docs/**`, `CLAUDE.md`, les `*.regression.test.ts`, les
`TODO`/`FIXME` du code, et l'historique git récent.

Note /100 l'état global du projet. Puis rends le plan. Sois franc dans les deux sens : ne dramatise pas
un projet globalement solide, et ne minimise pas un bloquant réel. Si le projet est prêt à ouvrir, dis-le
clairement.
```
