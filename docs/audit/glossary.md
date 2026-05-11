---
title: Glossaire
version: 2.1.0
---

# Glossaire

Tous les acronymes, termes techniques et termes métier utilisés dans le framework d'audit. Ordre alphabétique. Termes Synclune-spécifiques marqués 🟣.

## A

- **AA / AAA** : niveaux de conformité WCAG. AA = obligatoire en France/UE pour services publics et e-commerce sérieux ; AAA = idéal mais souvent infaisable.
- **AAA (tests)** : pattern _Arrange / Act / Assert_ — structure recommandée pour tests Vitest.
- **API version Stripe** : version de l'API Stripe figée par compte (ex. `2024-12-18.acacia`). Toute mise à jour doit être testée — peut casser les webhooks.
- **ARIA** : _Accessible Rich Internet Applications_ — attributs HTML pour rendre composants custom accessibles aux lecteurs d'écran (`aria-label`, `aria-live`, `aria-expanded`, `aria-invalid`, `aria-describedby`).
- **AVIF** : format image moderne (meilleure compression que WebP).

## B

- **BoGo** : _Buy One Get One_ — type de promotion (acheter X, obtenir Y gratuit ou à prix réduit).
- **Branded type** : type TypeScript "marqué" pour distinguer des primitives identiques. Ex. `type OrderId = string & { __brand: "OrderId" }`.

## C

- **Cache Components** : feature Next.js 16 (`"use cache"` directive). Distinct de PPR (qui peut être désactivé indépendamment).
- **Cache profiles 🟣** : 4 profils définis dans `next.config.ts` Synclune :
  - `checkout` (stale 1m / revalidate 30s) — cart, session, stock validation, order confirmation.
  - `user` (stale 2m / revalidate 1m) — admin dashboard, user orders, user-scoped data.
  - `catalog` (stale 15m / revalidate 5m) — products, SKUs, related products.
  - `reference` (stale 7d / revalidate 24h) — legal, collections, materials, colors, FAQs, store settings.
- **CAN-SPAM** : loi US sur les emails marketing (équivalent règlementaire RGPD côté email US).
- **CLS** : _Cumulative Layout Shift_ — Core Web Vital, mesure les sauts de layout visuels. Cible : < 0.1.
- **Composite unique / index** : index Prisma sur plusieurs colonnes simultanées. Ex. `@@unique([userId, skuId])`.
- **CSP** : _Content Security Policy_ — header HTTP qui restreint les sources JS/CSS/etc. Combat XSS.
- **CSRF** : _Cross-Site Request Forgery_ — attaque où un site malveillant déclenche une action authentifiée sur un autre. Server Actions Next.js sont protégées par origin check natif.
- **Customization 🟣** : personnalisation produit (gravure, message, ajustement). Workflow : request → admin review → confirmation. Templates email dédiés.
- **CVA** : _Class Variance Authority_ — librairie pour gérer les variants de composants Tailwind (utilisée par shadcn/ui).
- **Cyclomatic complexity** : nombre de chemins d'exécution dans une fonction. Cible : < 10.

## D

- **DDD** : _Domain-Driven Design_ — architecture par domaine métier (ce que reflète `modules/` chez Synclune).
- **DKIM** : _DomainKeys Identified Mail_ — signature cryptographique des emails sortants (deliverability).
- **DLQ** : _Dead Letter Queue_ — file d'attente pour évènements qui échouent après N retries (ex. webhooks Stripe).
- **DMARC** : _Domain-based Message Authentication, Reporting & Conformance_ — policy email qui combine DKIM + SPF.
- **Dispute** : contestation client transmise par Stripe (`charge.dispute.created`). Workflow : evidence → win/lose. Délai légal 7-21j selon réseau carte.
- **DRY** : _Don't Repeat Yourself_. Limite : ne pas abstraire prématurément (3 lignes similaires ≠ besoin d'abstraction).

## E

- **E.164** : norme internationale numéros de téléphone (`+33612345678`).
- **EXIF** : métadonnées attachées aux photos (GPS, marque appareil). À retirer pour confidentialité (RGPD).

## F

- **FK** : _Foreign Key_ — clé étrangère DB. Comportements Prisma : `Cascade`, `Restrict`, `SetNull`, `NoAction`.
- **Focus trap** : maintenir le focus à l'intérieur d'une dialog ouverte. Obligatoire WCAG.
- **Fulfillment 🟣** : statut d'expédition d'une commande, indépendant de `OrderStatus` et `PaymentStatus`. Enum `FulfillmentStatus` : `UNFULFILLED`, `IN_PREPARATION`, `SHIPPED`, `DELIVERED`, `RETURNED`.

## G

- **GIN index** : index Postgres adapté au full-text search et aux types composites (ex. `tsvector`).
- **Guest cart** : panier d'un utilisateur non authentifié — typiquement persisté en cookie ou DB temporaire.

## H

- **Haptic** : retour tactile mobile via Vibration API (hook projet `useHaptic`).
- **HSTS** : _HTTP Strict Transport Security_ — header qui force HTTPS (next.config.ts).

## I

- **IDOR** : _Insecure Direct Object Reference_ — bug d'autorisation où un user accède à la ressource d'un autre via ID.
- **Idempotency key** : clé qui rend une opération sûre à rejouer. Stripe l'utilise pour garantir qu'un retry ne crée pas de doublon. Doit être déterministe (ex. `order-${orderId}-pi`).
- **Idempotency webhook 🟣** : protection contre rejeu chez Synclune = signature Stripe + table `WebhookEvent` (eventId unique) + fenêtre anti-replay 5 minutes. Voir `modules/webhooks/`.
- **INP** : _Interaction to Next Paint_ — Core Web Vital (remplace FID). Cible : < 200ms.

## J

- **JSON-LD** : structured data Schema.org embarquée pour SEO (`Product`, `Offer`, `AggregateRating`, `BreadcrumbList`, etc.).

## K

- **KISS** : _Keep It Simple, Stupid_ — préférer la solution directe. Anti pattern : abstraction prématurée.

## L

- **LCP** : _Largest Contentful Paint_ — Core Web Vital. Cible : < 2.5s.
- **List-Unsubscribe** : header email pour désabonnement one-click (CAN-SPAM + RGPD compliance).

## N

- **N+1** : pattern de requêtes inefficace (1 requête + N requêtes pour relations). Solution Prisma : `include` ou `select` granulaire.
- **NSFW** : _Not Safe For Work_ — contenu inapproprié (ex. modération photos reviews).

## O

- **OAuth state** : token CSRF protection lors d'un OAuth flow (Google/GitHub login).
- **Open redirect** : faille où un paramètre `?redirect=` non validé permet de rediriger l'utilisateur vers un domaine externe.
- **OWASP** : _Open Worldwide Application Security Project_ — référence sécurité (Top 10).

## P

- **PAN** : _Primary Account Number_ — numéro carte bancaire complet. JAMAIS dans logs.
- **pg_trgm** : extension Postgres pour similarité de chaînes (fuzzy search).
- **PII** : _Personally Identifiable Information_ — données personnelles (email, nom, adresse, téléphone, IP, IBAN). Filtrer Sentry beforeSend.
- **Polymorphisme via Slot** : pattern shadcn/ui (`asChild` + `<Slot>`) qui rend un composant rendu-able comme n'importe quel élément.
- **PPR** : _Partial Prerendering_ — feature Next.js : page = shell statique + Suspense slots dynamiques. Activable/désactivable indépendamment de Cache Components.
- **PSD2** : directive européenne paiements — exige SCA pour transactions > 30€.

## R

- **Restock 🟣** : remise en stock d'une SKU précédemment épuisée. Déclenche `notify-back-in-stock.ts` (wishlist) → emails utilisateurs en attente.
- **RGPD** : _Règlement Général sur la Protection des Données_ — règlement UE. Droits : accès, rectification, suppression, portabilité, opposition.
- **RJC** : _Responsible Jewellery Council_ — certification matériaux bijouterie.
- **RSC** : _React Server Components_ — composants rendus côté serveur, jamais hydratés côté client.

## S

- **SCA** : _Strong Customer Authentication_ — exigence PSD2 (3DS2 typiquement). Stripe gère, mais le code doit handler `requires_action`.
- **SIREN/SIRET** : identifiants entreprise FR (SIREN = entreprise 9 chiffres ; SIRET = établissement 14 chiffres). Affichés sur factures (loi anti-fraude).
- **SKU 🟣** : _Stock Keeping Unit_ — variant d'un produit (combinaison color × material × size). Stock authoritatif (pas le produit). Code unique généré via `unique-name-generator.service.ts`.
- **Slot pattern** : voir Polymorphisme.
- **SoC** : _Separation of Concerns_.
- **Soft delete 🟣** : marquer `deletedAt` au lieu de supprimer. Chez Synclune : retention 10 ans (factures, orders — loi anti-fraude TVA), grace period 30j (account deletion RGPD), hard-delete final via cron `hard-delete-retention`. Helpers : `notDeleted` filter, `softDelete.<entity>(id)` mutation.
- **SOLID** : Single responsibility, Open/closed, Liskov, Interface segregation, Dependency inversion.
- **SPF** : _Sender Policy Framework_ — DNS record qui liste les serveurs autorisés à envoyer pour un domaine.
- **SRP** : _Single Responsibility Principle_.
- **SSRF** : _Server-Side Request Forgery_ — attaque où le serveur fait une requête vers une URL contrôlée par l'attaquant.
- **Suspense parallèle** : plusieurs `<Suspense>` au même niveau qui streament chacun dès que prêt (≠ `Promise.all` qui attend tout avant render).

## T

- **3DS2** : _3-D Secure 2_ — protocole d'authentification forte cartes bancaires (SCA).
- **Touch target** : zone tactile cliquable. Min 44×44px (WCAG 2.5.5 + Apple HIG).
- **tsvector** : type Postgres pour full-text search indexable.
- **TVA franchise art. 293 B 🟣** : régime fiscal FR exemptant de TVA en dessous d'un seuil (37 500 € HT pour prestations de service / vente bijoux artisanaux selon catégorie). Synclune surveille via env `VAT_FRANCHISE_THRESHOLD_EUR` + bandeau dashboard warning ≥ 80%, critical ≥ 100%.

## U

- **UPSERT** : opération DB _update or insert_. Prisma : `prisma.x.upsert({ where, update, create })`. Idempotent.
- **URSSAF 🟣** : organisme collecteur cotisations sociales FR. Échéances trimestrielles : 30/04, 31/07, 31/10, 31/01 N+1 (rollover). Bandeau dashboard J-15 (`urssaf-deadline.service.ts`).

## V

- **Vaul** : librairie drawer (utilisée pour `ResponsiveAlertDialog` / `ResponsiveActionMenu` mobile).
- **View Transitions API** : navigation fluide entre vues (CSS transitions cross-document). Next.js 16 supporte natif.

## W

- **WCAG 2.1 AA** : _Web Content Accessibility Guidelines_ niveau AA. Standard légal e-commerce UE.
- **WebP** : format image moderne (compression > JPEG/PNG).
- **withCronGuard** : wrapper projet (`modules/cron/lib`) pour Sentry tagging + idempotence cron jobs.

## X

- **XSS** : _Cross-Site Scripting_ — injection JS dans page rendue.

## Y

- **YAGNI** : _You Aren't Gonna Need It_ — pas de feature flag / paramètre "au cas où".
