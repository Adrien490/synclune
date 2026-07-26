# Synclune — Missions d'amélioration (prompts larges)

Ce fichier contient **21 missions larges et ambitieuses** (+ 5 du Track Croissance), conçues pour être
exécutées **une par une avec un modèle puissant (Fable 5, effort max)**. Chaque mission est une **mission de
fond** : le modèle audite l'existant, **conçoit** des améliorations, puis **les implémente, les teste et fait
passer les gates**.

L'accent reste mis sur l'**expérience** : élever Synclune au niveau d'une marque de joaillerie artisanale
premium. **9 des 21 missions sont UI/UX** (design system, vitrine, PDP, tunnel d'achat, admin, mobile,
accès au compte, contenu éditorial, système de feedback), complétées par **1 mission Marque** (voix,
emails, moments enchantés). Les autres couvrent la **Qualité** (accessibilité, performance, dette/tests,
SEO, analytics, observabilité/monitoring), les **Données** (architecture du schéma Prisma & discipline des
migrations), la **Sécurité/RGPD/conformité** (re-vérification + préparation du go-live e-reporting 2027) et
l'**Infra** (config/PWA/CI/docs). Le modèle a **carte blanche pour repenser** les interfaces, tant qu'il
respecte la cohérence de marque, les invariants métier et les conventions du repo.

> **Un seul registre : large.** Toutes les missions — design/expérientielles, Croissance, **et** durcissement/
> conformité/qualité — sont écrites **larges** : elles posent une **intention** et un **terrain**, jamais une
> liste de tâches. Le modèle **diagnostique, conçoit et décide** seul du quoi et du comment. Le **Préambule
> partagé** (invariants intouchables, conventions, Definition of Done, gates) est le **seul SSOT** : chaque
> mission le réutilise sans le réécrire, et n'ajoute qu'une poignée de garde-fous propres. Traite tout
> `fichier:ligne` cité ici ou ailleurs comme un **indice à vérifier**, jamais un fait — le filesystem fait foi.
> ⚠️ **Plusieurs surfaces que la doc/`CLAUDE.md` décrivent comme vivantes sont en réalité DORMANTES** — ne les
> présente jamais comme des flux fonctionnels (cf. avertissements ⚠️ dans UIUX-03, UIUX-04, CONTENT et le Track
> Croissance) : cron `send-review-requests` **retiré**, scaffolding panier-abandonné **inerte**, demande de
> retour **silencieuse** (ni email ni alerte), push PWA **retiré**, `DiscountType` **sans gating premier-achat**.

## Comment l'utiliser

1. Ouvre une session fraîche **sur une branche dédiée** (`git switch -c improve/<mission>`), idéalement un
   worktree, car ces missions touchent beaucoup de fichiers.
2. **Colle le « Préambule partagé »** en tête, puis — pour les missions à forte dimension expérientielle
   (`UIUX-*`, `AUTH-UX`, `CONTENT`, `FEEDBACK`, `BRAND-EXP`) — **l'« Étoile du Nord design »**, puis le
   prompt voulu.
3. Laisse la session diagnostiquer → concevoir → implémenter → tester → gates verts.
4. Relis le diff avant de merger : ces missions sont volontairement transformatives.

> Les missions sont indépendantes mais se chevauchent (ex. Design System ↔ Vitrine, Tunnel ↔ Analytics ↔
> Contenu, Feedback ↔ toutes les missions UI). Exécute-les **une à la fois** et relis entre chaque. Quand
> deux missions partagent un périmètre (panier/paiement, emails, `next.config.ts`, CI), la **mission
> propriétaire** fait la refonte de référence et les autres l'enrichissent sans la défaire. Pour les aires
> sensibles (facturation, RGPD, paiements), la mission dédiée (`GUARD`) est en **re-vérification** :
> lecture-mostly, ne corrige que les vraies régressions.

---

## Préambule partagé

> **À coller en tête de CHAQUE mission.**
>
> **Projet** : Synclune — e-commerce de bijoux artisanaux. Stack : Next.js 16 (App Router, Turbopack,
> Cache Components/PPR, React Compiler), React 19, TypeScript, Prisma 7 (Postgres/Neon), Stripe, Better
> Auth, TanStack Form (`useAppForm`), Zustand, shadcn/ui + Tailwind 4 + Motion (`motion/react`), React
> Email + Resend, Sentry. Architecture DDD : `modules/<domaine>/{actions,data,services,
components,schemas,hooks,types,utils}` + `shared/`. **Lis `CLAUDE.md` avant de commencer.**
>
> **⚠️ Source de vérité = filesystem, pas la doc.** `CLAUDE.md` (l.40) cite encore le route group
> `app/(boutique)` : c'est **PÉRIMÉ**. Le vrai groupe storefront est **`app/(shop)`** (sous-dossiers
> `(home)`, `aide`, `collections`, `creations`, `favoris`, `produits`). Les autres groupes : `app/(account)`,
> `app/(auth)`, `app/(legal)`, `app/admin`. Vérifie chaque chemin que tu cites avant de t'y fier ; un chemin
> faux dans ton diagnostic invalide tes conclusions.
>
> **Conventions NON négociables** :
>
> - **Pas de `useMemo` / `useCallback` / `React.memo`** (React Compiler optimise tout seul ; cf. `CLAUDE.md`
>   § React 19). N'ajoute pas non plus `forwardRef` dans du code neuf : en React 19 `ref` est une prop
>   ordinaire (le repo n'a aucun `forwardRef` en code prod).
> - Texte UI en **français**, code en **anglais**, indentation **tabs**, fichiers `kebab-case`,
>   composants `PascalCase`, constantes `UPPER_SNAKE_CASE`. Commits `feat:`/`fix:`/`refactor:`/`docs:`.
> - Server Actions : `requireAdmin`/`requireAdminWithUser`/`requireAdminApiRoute` (route handler) ou
>   `requireAuth` — **re-check DB systématique, jamais `session.user.role`** (cookie-cache Better Auth stale
>   ~5 min). Puis `validateInput(schema, data)` — le wrapper renvoie `{ data } | { error }`, donc le guard
>   est **`if ("error" in validation) return validation.error`** (PAS `if (!validation.success)`). Puis
>   mutation, puis invalidation cache, puis `success()`/`handleActionError()`.
> - **Invalidation des statuts commande** : toute mutation de `Order.status`/`paymentStatus` passe par
>   `getOrderInvalidationTags(userId, orderId)` (`modules/orders/constants/cache.ts:51`), **jamais** une liste
>   de tags manuelle. Tags de cache toujours via une constante SSOT du module.
> - **Tests** : `<nom>.test.ts(x)` à côté du code ou dans `__tests__/`. Régression = `<sujet>.regression.test.ts`
>   - JSDoc `@regression <slug>`. **Ne jamais écraser un test fourni** (restaure via git puis ajoute). Mocks
>     d'erreurs Prisma : subclass réelle (`PrismaClientKnownRequestError`), jamais
>     `Object.assign(new Error(), { code })` (faux `instanceof` ⇒ test « vert pour la mauvaise raison »).
>
> **INVARIANTS INTOUCHABLES — ne jamais modifier sans validation comptable explicite** (détail : `CLAUDE.md`
> § Facturation électronique, invariants 1-10) :
>
> - Numérotation gap-free `F-YYYY-NNNNN` / `A-YYYY-NNNNN` (advisory locks Postgres, CHECK constraints DB).
>   Seuls `persist-invoice-number.service.ts` (facture, déclenché par le webhook `payment_intent.succeeded`
>   via `ensure-invoice-number.service.ts` eager + lazy fallback dans la route invoice) et
>   `void-invoice.service.ts` (avoir) écrivent `invoiceNumber`/`creditNoteNumber`. **Aucune Server Action**.
> - `OrderHistory` immuable (pas de `deletedAt`/`update`/`delete`). Snapshots OrderItem + adresses `billing*`/
>   `shipping*` figés au checkout. PDF facture immuable (hash SHA-256, servi depuis l'archive en priorité).
> - **5 writers e-reporting seulement** (SSOT = `no-manual-ereporting-write.regression.test.ts`) ; aucune
>   Server Action ne crée/mute `EReportingTransaction`/`EReportingBatch` ni ne pose un statut terminal manuel.
> - Rétention PII RGPD : **ne jamais scrubber** `billing*`/`invoiceDataSnapshot` à l'anonymisation
>   (`anonymize-user.service.ts`, exemption Art. 17(3)(b) ; cf. `anonymize-user-preserves-invoice.regression.test.ts`).
> - **Pas de vente / pas de caisse manuelle** hors Stripe PaymentIntent (`recordCashSale`/`createManualOrder`
>   interdits — risque « logiciel de caisse » NF 525 non conforme).
> - Garde « commandes en pause » : `ORDERS_AVAILABLE` (SSOT `shared/constants/orders-availability.ts`, `false`
>   avant lancement) ; ne pas court-circuiter `assertStoreOpen()`.
>
> **Méthode** : (1) **diagnostique** l'existant en lecture seule (cite `fichier:ligne` ; vérifie les chemins
> avant de les affirmer) ; (2) **conçois** les améliorations (UI/UX : direction claire et justifiée) ;
> (3) **implémente** — l'UI peut être audacieuse, mais tout changement de comportement métier reste prudent
> et prouvé ; (4) écris/étends les **tests** ; (5) fais passer les **gates**. Classe chaque problème de fond
> en **P0** (bloquant : régression, faille, perte de données) → **P1** (impact fort) → **P2** (amélioration
> nette) → **P3** (cosmétique/nice-to-have).
>
> **Definition of Done (gates obligatoires, scripts `package.json` réels)** :
>
> - Toujours : `pnpm lint` (0 warning, `--max-warnings=0`) · `pnpm typecheck` (`tsc --noEmit`) ·
>   `pnpm format:check`.
> - Tests du périmètre : `pnpm test <glob>` (ex. `pnpm test modules/products`) ; **`pnpm test:critical`** si
>   tu touches un module critique (cart, orders, payments, webhooks, auth, discounts, refunds, invoices,
>   `app/api/webhooks/stripe`, `test/contract`). Couverture/intégration quand pertinent :
>   `pnpm test:coverage`, `pnpm test:integration` (DB locale via `INTEGRATION_DATABASE_URL`).
> - Selon le périmètre : `pnpm build` (si tu touches pages/config/`next.config.ts`) · `pnpm size` (si tu
>   touches le bundle) · `pnpm knip` (code/deps morts — gare aux faux positifs DDD) · `pnpm doctor`
>   (`react-doctor`, santé React) · `pnpm e2e e2e/performance.spec.ts` (budgets LCP/CLS/INP) · `pnpm check:media` (couverture blur/alt/dimensions).
> - **Rapporte la SORTIE BRUTE de chaque gate exécuté** (copie le résultat réel, pas un « tout est vert »).
>
> **Livrables minimaux de toute mission** : un rapport classé P0→P3 (`fichier:ligne` à l'appui), le diff
> implémenté, les tests ajoutés/étendus, et les gates ci-dessus collés avec leur sortie réelle.
>
> **NE PAS casser ni re-implémenter à l'aveugle** (zones récemment durcies) : numérotation/immuabilité
> facture, hooks e-reporting, purge PII RGPD, flow paiement carte/3DS, intégrité du montant PaymentIntent,
> webhooks (idempotence/anti-replay 300s), atomicité `order-creation`. Tu peux **embellir l'UI** de ces flows,
> mais pas en changer la logique métier sans un test prouvant la régression.

---

## Étoile du Nord — Design (socle partagé des missions expérientielles : `UIUX-*`, `AUTH-UX`, `CONTENT`, `FEEDBACK`, `BRAND-EXP`)

> **À coller pour CHAQUE mission expérientielle (`UIUX-*`, `AUTH-UX`, `CONTENT`, `FEEDBACK`, `BRAND-EXP`), après le Préambule partagé.** Ce n'est pas une mission : c'est la
> **charte de design commune** que toutes les missions UI/UX appliquent. Les **tokens et composants partagés**
> qu'elle décrit sont possédés et consolidés par **UIUX-01** (`shared/components/ui/`, `app/globals.css`,
> `shared/styles/fonts.ts`, `shared/components/animations/`) ; les missions `UIUX-02..06` les **réutilisent**
> sans en créer de divergents.
>
> **Tu es un duo Directeur Artistique + Ingénieur Front senior.** Objectif : faire passer Synclune d'une
> « bonne boutique fonctionnelle » à une **expérience de joaillerie artisanale mémorable**.
>
> **Identité de marque** (SSOT `shared/constants/brand.ts` — nom, tagline « Créations uniques faites avec
> amour », réseaux) : Synclune, bijoux **artisanaux faits main**. Univers **lunaire**, féminin, **premium
> accessible**, chaleureux et de confiance. On vend de l'émotion et du soin du détail, pas de la quincaillerie.
>
> - **Couleur primaire** : rose. Référence-la **toujours par le token** `--primary`
>   (`oklch(0.8593 0.097 340.78)`, `app/globals.css:318` — annoté WCAG AA en fond rose/texte sombre), **jamais
>   en hex en dur**. Le hex `#e493b3` n'est que le `themeColor` PWA (`shared/constants/root-metadata.ts:95`).
> - **Typographie** (SSOT `shared/styles/fonts.ts`) : **Fraunces** (`--font-display`, serif display, axe `opsz`,
>   `preload:true` — élément LCP above-fold), **Figtree** (`--font-sans`, corps, `preload:false`), **Sacramento**
>   (`--font-cursive`, script signature **mono-poids 400** — **RÉSERVÉE au décoratif** : logotype, légendes
>   polaroid ; **jamais** prix, libellés de formulaire, navigation ni body ; **pas** de `font-bold`/`italic`,
>   cf. `fonts.ts:32-39`).
>
> **Principes directeurs** :
>
> - **Hiérarchie & respiration** : espaces généreux, une intention par écran, le produit (la photo) est la star.
> - **Élégance > densité** côté vitrine ; **clarté & productivité** côté admin.
> - **Micro-interactions subtiles** via Motion, **tokenisées** : réutilise `MOTION_CONFIG`
>   (`shared/components/animations/motion.config.ts:6` — `durations`, `easing`, `spring` `gentle`/`snappy`/
>   `bouncy`) et les variables CSS de durée/easing de `globals.css` ; **aucune valeur magique éparse**, aucune
>   animation coûteuse sur le chemin du LCP.
> - **Conversion sans friction** : CTA évidents, signaux de confiance (paiement sécurisé, fait main, livraison/
>   retours), **états vides engageants** (jamais une page morte).
> - **Mobile-first** : pensé d'abord pour le pouce — cibles **≥ 44px**, bottom bars, sheets ; le breakpoint
>   ultra-petit `--breakpoint-xs: 375px` (`globals.css:163`) couvre l'iPhone SE.
> - **Accessibilité AA minimum** : contraste **4.5:1** (texte) / **3:1** (UI & large-text), focus visible via
>   l'utility `focus-ring` (`globals.css:17`, ring 3px), clavier, labels — contrainte de qualité, pas une option.
> - **Cohérence systémique** : réutilise tokens & composants partagés. Inventaire des tokens existants à
>   respecter/étendre dans `app/globals.css` (~156 variables : `--primary`/sémantiques, `--gradient-hero-{from,
via,to}`, `--color-glow-{pink,lavender,mint,yellow}`, `--star-filled`/`--star-empty`, échelle text-shadow
>   `sm/md/lg/glow`, z-index, radius, durations) — **pas de couleurs/tailles/ombres hardcodées one-off**.
>
> **Expression de marque** : touches lunaires/artisanales discrètes (texture, halo, script signature ponctuel
> via `--font-cursive`), sans nuire à la lisibilité ni à la perf.
>
> **Liberté & garde-fous** : tu peux refondre layouts, composants, motion, copywriting (FR), hiérarchie visuelle.
> Tu **ne dois pas casser** :
>
> - les contrats des Server Actions/données et les frontières `"use cache"` ;
> - les **invariants métier** (facturation/RGPD/paiement — cf. Préambule) ;
> - les **budgets** `.size-limit.json` (vérif `pnpm size`) ;
> - les **conventions React 19** : **pas** de `useMemo`/`useCallback`/`React.memo`/`forwardRef` ;
> - **`prefers-reduced-motion`** et **`forced-colors`** — **invariant** : **toute** animation a un fallback
>   `prefers-reduced-motion` (inventorie l'existant par `grep -rn prefers-reduced-motion app/globals.css app/styles/`
>   plutôt que de te fier à un compte figé ; il y en a ~13 aujourd'hui, mais le nombre n'est pas le contrat) ;
> - l'état transversal **« commandes en pause »** pré-lancement : `ORDERS_AVAILABLE`
>   (`shared/constants/orders-availability.ts`) désactive l'achat tout en gardant le catalogue visible —
>   ton UI doit gérer ce mode élégamment (CTA désactivés, bandeaux), jamais le contourner.
>
> Quand tu refonds un composant partagé, **propage la cohérence à tous ses usages**. Documente brièvement les
> décisions de design notables (commentaire dans `globals.css` ou court MD).
>
> **Critères d'acceptation (transversaux UI/UX)** :
>
> - **Aucune couleur/ombre/durée hardcodée** introduite : tout passe par un token `globals.css` ou
>   `MOTION_CONFIG` (vérifiable par grep des valeurs en dur dans le diff).
> - **Contraste AA** respecté (4.5:1 texte, 3:1 UI/large-text) et `focus-ring` présent sur tous les
>   interactifs — vérifié via le harness axe (`test/a11y/axe.ts`) sur les pages touchées.
> - **Aucune régression LCP/CLS** ni dépassement de budget : `pnpm size` vert sur les entrées impactées,
>   budgets `pnpm e2e e2e/performance.spec.ts` (LCP/CLS/INP) non dégradés sur les pages refondues.
> - **Toute animation** ajoutée a un fallback `prefers-reduced-motion`/`forced-colors`.
>
> **Gates de référence du socle** (chaque mission `UIUX-*` ajoute les siens propres) : `pnpm lint` (0 warning) ·
> `pnpm typecheck` · `pnpm format:check` · `pnpm test shared/components` · `pnpm build` (si pages/config) ·
> `pnpm size` (si bundle) · harness axe (`test/a11y/axe.ts`) · `pnpm doctor` (santé React) ·
> `pnpm e2e e2e/performance.spec.ts` (budgets CWV des pages refondues). **Rapporte le résultat réel.**

---

## Index

| ID             | Type       | Mission                                                                    | Périmètre principal                                                                                                                                                                                                       |
| -------------- | ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UIUX-01        | UI/UX      | Design system & identité de marque                                         | `shared/components/ui`, `globals.css`, tokens, Motion                                                                                                                                                                     |
| FEEDBACK       | UI/UX      | Système de feedback — toasts, états vides & squelettes                     | `shared/components/ui/{toaster,micro-toast,empty,skeleton}`, `loading.tsx`, `cookie-banner*`                                                                                                                              |
| UIUX-02        | UI/UX      | Vitrine & découverte (home, catalogue, collections, recherche)             | `app/(shop)`, `modules/products`                                                                                                                                                                                          |
| UIUX-03        | UI/UX      | Page produit (PDP) — la page reine                                         | `app/(shop)/creations/[slug]`, `modules/products`, `modules/skus`, `modules/reviews`                                                                                                                                      |
| UIUX-04        | UI/UX      | Tunnel d'achat & post-achat                                                | `modules/cart`, `modules/payments`, `app/paiement`, `app/(account)`                                                                                                                                                       |
| CONTENT        | UI/UX      | Contenu éditorial, atelier & expérience cadeau                             | `app/(shop)/a-propos` (nouveau), `atelier-section`, `modules/media`, option cadeau (`cart`/`payments`/`paiement`), `parametres`, `notifications/desinscription`                                                           |
| AUTH-UX        | UI/UX      | Accès au compte — connexion, inscription & récupération                    | `app/(auth)/*`, `modules/auth/components`, emails verification & password-reset                                                                                                                                           |
| UIUX-05        | UI/UX      | Expérience admin                                                           | `app/admin`, `modules/dashboard`                                                                                                                                                                                          |
| UIUX-06        | UI/UX      | Mobile & responsive de bout en bout                                        | bottom bars, sheets, gestures, viewport                                                                                                                                                                                   |
| BRAND-EXP      | Marque     | Expérience de marque — voix, emails & moments enchantés                    | `emails/*` (11 templates) + `email-colors.ts`, `shared/constants/brand.ts`, `fonts.ts` (Sacramento), `motion.config.ts`, `paiement/confirmation`, micro-célébrations (`wishlist`/`cart`), `docs/BRAND-VOICE.md` (nouveau) |
| A11Y           | Qualité    | Accessibilité WCAG 2.2 AA (storefront + admin + emails)                    | transversal                                                                                                                                                                                                               |
| SEO            | Qualité    | SEO technique, données structurées & découvrabilité                        | `app/{sitemap,robots,opengraph-image,sitemap-images.xml}`, `seo-config.ts`, metadata (shop/legal), JSON-LD, `e2e/seo.spec.ts`                                                                                             |
| ANALYTICS      | Qualité    | Analytics produit, funnel de conversion & consentement                     | `shared/lib/analytics/track.ts`, `conditional-analytics.tsx`, `analytics/{view-item,purchase}-tracker`, `cookie-consent-store-provider`, points de tracking (`cart`/`products`/`discounts`)                               |
| PERF           | Qualité    | Performance, Core Web Vitals, bundle & DB                                  | transversal                                                                                                                                                                                                               |
| QUALITY        | Qualité    | Dette technique, tests & gates CI                                          | transversal                                                                                                                                                                                                               |
| SCHEMA         | Données    | Architecture du schéma Prisma & discipline des migrations                  | `prisma/schema.prisma`, `prisma/migrations`, enums/contraintes, `shared/lib/prisma*`                                                                                                                                      |
| GUARD          | Sécurité   | Sécurité, RGPD, conformité & cache (re-vérification)                       | transversal                                                                                                                                                                                                               |
| INVOICE-GOLIVE | Conformité | Préparer le go-live e-reporting (2026-2027) ⏳                             | `modules/invoices`, flags e-reporting, providers/PA, crons e-reporting, `CLAUDE.md § Facturation` + `docs/RUNBOOK.md § e-reporting`                                                                                       |
| PRICE-COMPLY   | Conformité | Conformité des prix réduits (Directive Omnibus — prix de référence 30j) ⏱️ | `ProductSku.compareAtPrice`, historique de prix, `product-price-display.tsx`, migrations                                                                                                                                  |
| INFRA          | Infra      | Env/flags, headers/CSP, pipeline CI & docs                                 | config, `.github`, `docs`                                                                                                                                                                                                 |
| OBS            | Infra      | Observabilité, monitoring crons & santé production                         | `sentry.{server,edge}.config`, `instrumentation-client`, `next.config.ts` (Sentry), `api/{health,csp-report,cron}`, `vercel.json`, `circuit-breaker.ts`, runbooks                                                         |

**Track Croissance / Systèmes produit** (prompts _larges_, en fin de fichier — conçoivent du produit, pas du durcissement) :

| ID               | Type       | Mission                                                              | Quand                         |
| ---------------- | ---------- | -------------------------------------------------------------------- | ----------------------------- |
| GROWTH-ACQ       | Croissance | Acquisition & audience de pré-lancement (waitlist + offre)           | ⏱️ **maintenant**             |
| GROWTH-LIFECYCLE | Croissance | Cycle de vie & rétention (relance avis, panier abandonné, win-back)  | 🔒 post-lancement             |
| GROWTH-MERCH     | Croissance | Merchandising & curation (popularité, mises en avant, « la parure ») | 🔒 post-lancement (ventes)    |
| GROWTH-CRO       | Croissance | Expérimentation & conversion (A/B léger + itération funnel)          | 🔒 post-lancement (trafic)    |
| SEARCH-REL       | Croissance | Pertinence & classement de la recherche (ranking, synonymes)         | 🔒 post-lancement (catalogue) |

---

## Missions

---

### UIUX-01 — Design system & identité de marque

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Tu es la **fondation visuelle** de Synclune : le design system est déjà sérieusement tokenisé (`app/globals.css` bloc `@theme inline`, `MOTION_CONFIG` dans `shared/components/animations/motion.config.ts`, `shared/components/card-surface.constants.ts`, fonts SSOT `shared/styles/fonts.ts`) — ta mission est de le **hisser au niveau d'un système premium unique et auto-explicatif** et de diffuser cette cohérence dans toute l'UI. Le « halo lunaire », signature la plus reconnaissable de la marque, est aujourd'hui **éclaté en plusieurs formes parallèles** (au moins : `@utility hover-halo` — un seul consommateur prod, `fab.tsx` —, les radials du hero **et** de `latest-creations.tsx:38`, le glow d'`empty.tsx`, les box-shadows inline `CARD_SURFACE_HOVER` **et** `CARD_SURFACE_FOCUS` de `card-surface.constants.ts`) : l'inventaire est à compléter par grep, le chiffre n'est pas le contrat — unifie ce vocabulaire en tokens (un `--shadow-halo-*` **reste à créer** : seuls `--shadow-2xs..2xl` et `--text-shadow-glow` existent). Traque aussi les durées/easings **dupliqués** entre `globals.css` (`--duration-*`/`--ease-*`) et `MOTION_CONFIG` (liés par un simple commentaire, pas par le code). **L'excellence = un système auto-explicatif** : un développeur tiers retrouve le bon token sans chercher, et chaque couleur/ombre/durée du diff trace vers une source unique. Les missions `UIUX-02..06` réutiliseront ce que tu poses : exécute-toi en premier. À toi de juger ce qui converge, ce qu'il faut créer, ce qu'il faut consigner.

> **Garde-fous** : `UIUX-01` **possède** les tokens/primitives partagés — les autres missions UI réutilisent sans forker. Aucune couleur/ombre/durée hardcodée one-off : tout passe par un token ou `MOTION_CONFIG`. Invariant React 19 : pas de `useMemo`/`useCallback`/`React.memo`/`forwardRef` ; **toute** animation a un fallback `prefers-reduced-motion` **et** `forced-colors`. Note : `--color-glow-mint`/`yellow` sont des tokens **vivants** de la palette atelier (`atelier-section`, `floating-images`, polaroid) — à **intégrer**, pas à supprimer ; seuls `--blur-1/2/3` sont réellement inertes.

---

### FEEDBACK — Système de feedback : toasts, états vides & squelettes

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Unifie tout ce qui **répond à l'utilisateur** en une fondation cohérente, chaleureuse et sans saut de mise en page : toasts (`shared/components/ui/{toaster,micro-toast,toast-icons}.tsx` + leur CSS `app/styles/` via `[data-sonner-toaster]`, `micro-toast` piloté par un store Zustand), états vides (la primitive `shared/components/ui/empty.tsx`, recomposée surface par surface), squelettes (`skeleton.tsx` + **~70** `*-skeleton.tsx` + les `loading.tsx`), consentement de première visite (`cookie-banner.tsx` + sa variante lazy + `manage-cookies-button.tsx`), **et les surfaces de faillite** (`app/_components/not-found-shell.tsx` partagé par `not-found.tsx`/`forbidden.tsx`/`unauthorized.tsx` + les `not-found.tsx` **par route**, les `error.tsx`, `global-error.tsx`). ⚠️ Il n'existe **aucun SSOT éditorial** : toute la copy de vide/chargement/erreur est ad hoc, surface par surface (une première tentative, `shared/constants/ui-copy.ts`, n'a jamais été consommée et a été retirée) — **le SSOT est à créer**. Fais de l'ensemble un système réutilisable et fidèle à la voix lunaire. **L'excellence = plus jamais de page morte ni de copy ad hoc** : une fois le SSOT éditorial en place, toute copie de vide/chargement/erreur de production en dérive (zéro chaîne FR ad hoc résiduelle dans le diff), reste rassurante et de marque, et ne ressemble jamais à un bug. À toi de décider de la forme, du ton et du périmètre.

> **Frontière** : `FEEDBACK` possède la **forme/ton/a11y** des surfaces de faillite, pas leur instrumentation Sentry (`OBS`) ni le cache offline / service worker (`INFRA`). `global-error.tsx` rend **hors router** Next : il reste self-contained (ses propres fonts/`globals.css`, liens `<a>` natifs). Skeletons aux dimensions **exactes** du contenu final (anti-CLS). La réouverture de la bannière après opt-out relève d'`ANALYTICS`, pas d'ici.

---

### UIUX-02 — Vitrine & découverte

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Transforme la découverte produit — accueil (`app/(shop)/(home)`, `hero-section.tsx`), catalogue (`product-catalog.tsx`, `product-card.tsx`, filtres/tri/pagination dont `product-filter-sheet.tsx`), collections (`collections-section`, aujourd'hui un simple **carrousel** de `CollectionCard` — un vrai « spotlight » éditorial reste à imaginer), recherche (`quick-search-dialog`) — en une **expérience éditoriale, désirable et qui convertit**. La photo est la star : la carte a **déjà** un ratio (`aspect-3/4 sm:aspect-4/5`) et un **hover-galerie** par cross-fade `secondaryImage` (`product-card.tsx:296`) — **élève-les** (mise en scène, halo lunaire tokenisé d'`UIUX-01` à la place du gradient `after:from-black/5` actuel), ne les réinvente pas. Introduis du rythme éditorial sans casser la grille/pagination, et **capitalise sur les view transitions déjà câblées** (`product-${id}` sur `product-card.tsx`, `shop-hero`, `collections-section`). Synclune est en **pré-lancement** : `OrdersPausedNotice` s'affiche en tête de home (`shared/constants/orders-availability.ts`, `ORDERS_AVAILABLE=false`) — gère ce mode élégamment sans le contourner. **L'excellence = la découverte se lit comme une vitrine de joaillerie : la photo domine, la navigation home→catalogue→PDP est continue, le rythme éditorial donne envie d'explorer sans jamais casser grille ni pagination.**

> **Frontières** : ne touche pas la logique SKU/stock/prix (`UIUX-03`/`PRICE-COMPLY`), les données structurées JSON-LD (`SEO`), ni les émetteurs funnel (`ANALYTICS`) ; le merchandising/popularité/« la parure » est à `GROWTH-MERCH`, le ranking/synonymes à `SEARCH-REL`. Réutilise les `Empty`/`Skeleton`/toasts de `FEEDBACK` et les tokens/motion d'`UIUX-01`.

---

### UIUX-03 — Page produit (PDP), la page reine de la conversion

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Fais de la page produit (`app/(shop)/creations/[slug]`) une **vitrine de joaillerie irrésistible et limpide**, taillée pour l'ajout au panier : galerie qui sublime la photo (`modules/media/components/gallery`), choix de variantes évident (`modules/skus/components/sku-selector.tsx`), bloc d'achat rassurant (`product-details.tsx` orchestre `useSelectedSku` et compose `AddToCartForm` — de `modules/cart` — et `product-reassurance.tsx` ; la sticky CTA desktop `sticky-cart-cta-desktop.tsx` est montée au niveau `page.tsx`), preuve sociale crédible (`product-reviews-section.tsx`). Deux réalités à transformer en **moments de marque** plutôt qu'en trous : l'état **galerie vide** (« Photos en préparation » existe déjà, `gallery.tsx`, en simple `<p>` — élève-le ; ce sera le défaut au lancement pour beaucoup de pièces) et l'**absence d'avis** (`totalCount===0` — badges « fait main », signature créatrice ou citation atelier plutôt que masquer la section). Élève la description en récit (matériau, inspiration, soin) via la hiérarchie Fraunces/Figtree, sans toucher le champ DB. **L'excellence = sans scroll inutile, la cliente comprend la pièce, se projette en la portant, choisit sa variante et l'ajoute avec confiance — et l'absence de photo ou d'avis ressemble à une maison qui se prépare, jamais à un défaut.**

> **Garde-fous** : ne touche **jamais** la logique SKU/stock/prix ni le JSON-LD (la conformité `compareAtPrice`/Omnibus relève de `PRICE-COMPLY`) ; ne casse pas les contrats partagés avec le catalogue (`useSelectedSku`, `buildGallery`). Respecte `ORDERS_AVAILABLE` (CTA désactivé). ⚠️ Surfaces **dormantes** à ne pas croire vivantes : la sticky CTA **mobile** `sticky-cart-cta.tsx` (`StickyCartCTA`) n'est montée par **aucune route** (seul son test l'importe) — rebranche-la délibérément ou traite-la comme code mort ; la **surface client de dépôt d'avis** (`create-review-form.tsx`, `reviewable-products-section.tsx`…) n'est montée par aucune route et le cron `send-review-requests` est **retiré** (cycle d'avis non vivant de bout en bout).

---

### UIUX-04 — Tunnel d'achat & post-achat

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Minimise la friction et maximise la confiance sur tout le parcours **panier → checkout → confirmation** (`cart-sheet*`, `checkout-form.tsx`, `app/paiement/{,confirmation}`), puis soigne l'espace **compte** (`app/(account)` : commandes, adresses ; les **favoris** vivent sous `app/(shop)/favoris` et le **flux retour** dans `app/(account)/commandes/[orderNumber]/_components/order-detail-content.tsx`, sans route dédiée). C'est la **refonte UI de référence** du panier/checkout/compte — `CONTENT` et `BRAND-EXP` enrichiront par-dessus. Trois leviers premium concrets : (1) une **expérience cadeau native** — l'infra existe (`CartItem.giftWrap`/`giftMessage`, action `set-gift-options.ts` testée) mais **aucune UI ne l'appelle** et elle ne se propage pas encore à la commande ; (2) un **flux retour digne de confiance** — `requestReturn` crée bien la demande mais reste **muet côté notifications** (ni email ni alerte) : soigne l'écran de succès et le statut visible ; (3) des empties et une confirmation en **moments de marque lunaire** (capitalise sur les `viewTransitionName` `shop-paiement`/`checkout-item-${id}`). **L'excellence = au checkout, zéro doute sur le prix, la sécurité et le délai ; et la confirmation comme les empties donnent envie de revenir, pas seulement d'informer.**

> **Garde-fou intouchable** : tu touches à l'**UI, jamais à la logique de paiement** (`confirmCheckout`/`order-creation.service.ts`/PI/intégrité montant). Propager les options cadeau jusqu'à `Order`/`OrderItem` franchit la zone des **snapshots figés au checkout** → migration pairée `down.sql` + test de non-régression, prudemment (coordonne avec `CONTENT`/`SCHEMA`).

---

### CONTENT — Contenu éditorial, atelier & expérience cadeau

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Donne à Synclune le **storytelling et les leviers émotionnels d'une maison de joaillerie**. Trois surfaces, toutes absentes ou dormantes : (1) une vraie **page à-propos/atelier** — la **constante de route `ROUTES.SHOP.ABOUT = "/a-propos"` existe déjà** (`shared/constants/urls.ts:65`), seule la **page** manque (à créer) — à bâtir en réutilisant `ATELIER_CONTENT` et les composants `atelier-section/`, en re-câblant la nav (`shared/constants/navigation.ts` note que « l'atelier » a été retiré du menu mobile, à réintégrer) ; gère élégamment l'**absence de photos** (les imports `PlaceholderImage`/`PolaroidGallery` et leurs blocs JSX sont **commentés** avec `TODO(photos-atelier)` dans `atelier-section.tsx`) ; (2) une **expérience cadeau de marque** (emballage signature, carte manuscrite, copy lunaire) branchée sur l'infra `set-gift-options` dormante, en coordination avec la refonte panier d'`UIUX-04` ; (3) une **gestion claire des préférences de communication** dans `app/(account)/parametres` — qui ne monte aujourd'hui que `SecuritySection` (aucune surface de préférences n'existe), sachant que la désinscription One-Click ne **persiste rien**. **L'excellence = on sent une main et une histoire derrière chaque pièce (même sans photo), et offrir une création devient un geste, pas une case à cocher.**

> **Garde-fous** : reste **hors de la logique paiement/snapshots** — propager les champs cadeau vers `Order`/`OrderItem` touche les snapshots figés (migration pairée `down.sql`, prudence). La **voix** des emails relève de `BRAND-EXP` ; la **persistance du consentement** est partagée avec `QUALITY` (tests). Réutilise tokens/primitives (`UIUX-01`/`FEEDBACK`).

---

### AUTH-UX — Accès au compte : connexion, inscription & récupération

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Fais des écrans d'accès au compte (`app/(auth)/{connexion,inscription,mot-de-passe-oublie,reinitialiser-mot-de-passe,renvoyer-verification,verifier-email}`, `modules/auth/components/`) un **premier contact relationnel premium, rassurant et sans friction**. C'est la porte d'entrée de la marque : chaleur lunaire, clarté, messages d'erreur bienveillants (`modules/auth/constants/error-messages.ts`), succès et bienvenue **tokenisés** (le `--success` existe — `globals.css:342` —, `verifier-email` porte encore des verts one-off à reprendre) et cohérents avec le ✨ de la confirmation, et une **continuité après connexion** (le `callbackURL` défaute aujourd'hui à `/` brut). La mise en scène lunaire s'étend d'un socle existant (`auth-fade-in.tsx`) mais `auth-page-layout.tsx` n'a encore ni halo ni cursive — à composer (`--font-cursive` en signature décorative uniquement). **L'excellence = le visiteur sent l'univers de marque avant même de saisir un champ, et après connexion un nouvel inscrit comprend où il est et quoi faire ensuite — jamais une page catalogue anonyme.**

> **Garde-fous** : ne modifie pas la logique Better Auth (`auth.ts`, actions), ni l'**anti-énumération** (toujours le message de succès générique), ni les rate-limits/cooldowns. ⚠️ **GitHub OAuth est absent** (`auth.ts` ne déclare que Google, malgré `CLAUDE.md`) — n'affiche pas un bouton GitHub, et n'invente ni magic-link ni gating d'inscription. Le **contenu** des emails verification/password-reset se travaille ici (la voix transverse reste à `BRAND-EXP`) ; ne forke pas les tokens/composants d'`UIUX-01`.

---

### UIUX-05 — Expérience admin

> Colle le **Préambule partagé** + l'**Étoile du Nord design** (volet « clarté & productivité »).

Rends l'admin (`app/admin` : catalogue, ventes, marketing, contenu, configuration) **rapide, lisible et agréable** au quotidien — ici la boussole est la **productivité** (densité, clarté, états nets), pas l'esthétique vitrine. Harmonise la douzaine de listes (`AdminDataTable`, ex. `colors-data-table` vs `orders` très hétérogènes) sur un même rythme (alignement, badges de statut — dont les constants sont **dispersés** sur ≥ 6 fichiers `product-status-display`/`orders/status-display`/`order-status.constants`/`collection-status.constants`…, à faire **converger** —, actions de ligne, états vides, `bulk-selection-toolbar.tsx`), unifie les formulaires lourds produit (`create-product-form.tsx` + cards `status/stock/pricing/variant/media` sous `modules/products/components/admin/shared/`, `admin-form-footer.tsx`), fiabilise la coquille (`app/admin/layout.tsx`, breadcrumb, focus) et étends le `KeyboardShortcutsDialog`. Rends les `dashboard-alerts.tsx` plus exploitables — les deep-links existent déjà (`DashboardAlertLink`), vise donc la **priorisation/hiérarchisation visuelle** des alertes, aujourd'hui absente. **L'excellence = un admin scanne une liste, agit en masse et soumet un formulaire produit lourd sans jamais douter de l'état ni chercher une action.** Garde la touche de marque discrète (`DecorativeHalo`).

> **Garde-fous** : ne **jamais** affaiblir l'authz — l'admin re-vérifie le rôle en DB (`requireAdminWithUser`/`requireAdmin`), le cookie-cache Better Auth (stale ~5 min) est interdit comme source de privilège. Ne touche pas au storefront ni aux contrats Server Actions ; applique un **registre admin cohérent** (le storefront vouvoie — choisis et tiens la ligne). ⚠️ Pas d'UI litige in-app (alerte email seule) et `request-return` silencieux côté admin — ne présume pas d'écran litige / file SAV existant.

---

### UIUX-06 — Mobile & responsive de bout en bout

> Colle le **Préambule partagé** + l'**Étoile du Nord design** (volet « mobile-first »).

Garantis une expérience mobile **fluide et native-like** sur tout le parcours, en durcissant les **primitives responsive partagées** (`responsive-dialog.tsx` Vaul/Radix, `bottom-bar.tsx`, `visual-viewport-bridge.tsx`, `swipeable-card.tsx`, hooks `use-mobile`/`use-touch-device`/`use-haptic`) plutôt qu'en multipliant les correctifs ponctuels. Pense d'abord au pouce : clarifie la frontière `useIsMobile` (layout) vs `useIsTouchDevice` (interaction) — les deux hooks vivent côte à côte **sans SSOT de breakpoints partagé** (à créer, couvrant `--breakpoint-xs:375px`/iPhone SE) — garantis que tout champ reste visible **clavier ouvert** (le `VisualViewportBridge` existe — étends-le aux sheets/drawers de formulaire), et double chaque geste swipe d'une alternative clavier/bouton. Soigne le ressenti (haptique, spring) sans coût LCP. **L'excellence = aucun champ ne disparaît sous le clavier, aucun geste sans alternative bouton/clavier, et le ressenti tactile est cohérent du catalogue au compte — pas un patchwork de correctifs.**

> **Garde-fous** : **toute** animation (drawer, bottom-bar, swipe) a un fallback `prefers-reduced-motion` **et** `forced-colors` (déjà respecté — ne régresse pas) ; réutilise `MOTION_CONFIG` (`spring.bar`, canonique pour l'entrée des bottom-bars, `motion.config.ts:82`), pas de valeurs magiques ; n'introduis pas de primitive responsive divergente. ⚠️ Le **push PWA est retiré** (`app/sw.ts` documente la suppression) — ne conçois pas d'UX de notification push.

---

### BRAND-EXP — Expérience de marque : voix, emails & moments enchantés

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Fais rayonner l'identité **lunaire et artisanale** au-delà du storefront. Trois chantiers : (1) **codifier une voix de marque** dans `docs/BRAND-VOICE.md` (**absent** — à créer) et **trancher le tu vs vous** puis le **propager de façon cohérente** sur les surfaces concernées (la confirmation tutoie, le storefront vouvoie — l'arbitrage doit vivre dans le code, pas seulement dans le MD) ; (2) **hisser les 11 templates** (`emails/*`, layout `email-layout.tsx`, `email-colors.ts` — dont le polyvalent `admin-alert-email` au ton interne distinct) au niveau du site, sujets et corps avec souffle ; (3) **semer des micro-moments délicieux** en étendant les modèles réels (`HeartBurst` wishlist, `success-icon.tsx` de la confirmation, déjà sur `MOTION_CONFIG.spring.success`), sans coût perf. **L'excellence = un client reconnaît la voix et l'univers lunaire dès l'objet, et l'email prolonge le soin artisanal du site — pas un reçu Stripe relooké.**

> **Garde-fous** : ne **jamais** dégrader la **délivrabilité** (conserver `List-Unsubscribe`/One-Click/`Precedence`/`Auto-Submitted` des emails marketing + idempotencyKey Resend) ni la conformité du footer (mention 293 B, SIREN, adresse légale). Sacramento (`--font-cursive`) en signature décorative uniquement. Frontière : tu tranches/propages la **voix** (emails + confirmation), tu ne refonds pas la copie storefront (possédée par `UIUX-*`/`CONTENT`). ⚠️ Templates **retirés** (volume) — ne les réintroduis pas : `tracking-update`, `delivery-confirmation`, `welcome`, `oauth-account-linked` ; le déclencheur de `review-request` est dormant (cron retiré) et les emails de cycle de vie relèvent de `GROWTH-LIFECYCLE`.

---

### A11Y — Accessibilité WCAG 2.2 AA (storefront + admin + emails)

> Colle le **Préambule partagé**.

Porte **tout** Synclune — storefront, admin, emails — à la conformité **WCAG 2.2 niveau AA**, critères nouveaux de la 2.2 compris (cibles ≥ 24px, focus non masqué, gestes à alternative, authentification accessible, saisie non redondante). A11Y **possède le contrat d'accessibilité** (sémantique ARIA, focus, clavier, contraste, harness de test), pas la direction visuelle (aux missions `UIUX-*`). L'axe e2e couvre **déjà** large (PDP, panier/checkout, compte, **pages légales** dans `e2e/accessibility.spec.ts`, paiement dans `e2e/authenticated/`) : le vrai neuf est ailleurs. Déploie le harness jsdom `expectNoA11yViolations` (`test/a11y/axe.ts`, aujourd'hui **un seul** fichier consommateur ciblant `shared/components/ui/field.tsx`) sur les **états transitoires** (erreur, `aria-busy`, dropdown ouvert) des primitives `shared/components/forms/` **et** `ui/`, qu'aucune passe e2e n'atteint ; et vérifie **manuellement** les critères 2.2 qu'axe ne détecte pas seul (3.3.7 saisie redondante au checkout, 3.3.8 auth, 2.5.7 gestes draggable du pinch-zoom/sliders/dnd-kit). Verrouille chaque correction par un test. **L'excellence = le harness jsdom étendu aux états transitoires des primitives form/ui (zéro violation), les trois critères 2.2 non détectables par axe vérifiés avec preuve, et toute nouvelle surface rendue gardée.**

> **Frontière & indices** : le contraste ne se mesure qu'en **e2e** (jsdom désactive `color-contrast` par design) ; l'axe passe par `pnpm e2e` + `test/a11y/axe.ts`, pas de `pnpm axe` autonome. Si une correction impose un changement visuel, garde-le minimal — ne re-refonds pas un composant qu'une mission UI vient de livrer.

---

### SEO — SEO technique, données structurées & découvrabilité

> Colle le **Préambule partagé**.

Fais de Synclune une vitrine **parfaitement découvrable** : rich snippets bijoux crédibles, partages soignés, metadata unique par route (`generate-metadata.ts`, `root-metadata.ts`), sitemap/robots cohérents (`app/sitemap.ts`, `app/robots.ts`, `app/sitemap-images.xml`). Le vrai levier, c'est de faire **dire la vérité** aux données structurées (`modules/products/utils/seo/generate-structured-data.ts`) : `lowPrice`/`highPrice`/`offerCount` y sont **déjà agrégés** sur les SKU actifs, mais l'`availability` de l'`AggregateOffer` se calcule encore sur le seul SKU sélectionné — **incohérence interne** à aligner (InStock si au moins un SKU dispo) ; et `shippingRate`/`merchantReturnDays`/`returnFees` sont **codés en dur** — source-les depuis `modules/orders` (shipping-rates) et `store-settings`. Renforce `e2e/seo.spec.ts` pour **asserter que le JSON-LD correspond au DOM/DB** (prix affiché == `offers.price`, note == `aggregateRating`), pas seulement sa présence. À toi de juger la profondeur du JSON-LD.

> **Garde-fous** : **aucune donnée structurée fausse** (note inventée, stock/livraison/retour désynchronisés) — reflète la vérité DB sans la dupliquer. Synclune est **FR-only** : statue et documente la décision hreflang/x-default dans le code (pas un « bug à corriger »). Ne touche pas à la logique prix (réservée à `PRICE-COMPLY`) ni aux frontières `"use cache"`.

---

### ANALYTICS — Analytics produit, funnel de conversion & consentement

> Colle le **Préambule partagé**.

Complète un **funnel de conversion RGPD-clean** (view → add-to-cart → begin-checkout → purchase) pour piloter l'optimisation produit. Les trackers `view-item` (PDP, émet déjà `{productId, slug, value, currency}`) et `purchase` (confirmation) existent, `add_to_cart` est émis mais avec un payload `{quantity}` seul (`modules/cart/hooks/use-add-to-cart.ts`) — mais surtout **`BEGIN_CHECKOUT` est un enum dormant sans émetteur**. Câble-le au point naturel (le CTA vers `/paiement` dans `cart-sheet-footer.tsx`, en **action** et non en tracker monté), enrichis `add_to_cart` (productId/value/currency, **cohérent** avec `view-item`, sans PII), et **valorise/documente la voie de révocation qui existe déjà** (`manage-cookies-button.tsx`, `cookie-preferences.tsx`) au lieu d'en créer une seconde. **L'excellence = les 4 events émis avec un payload homogène (productId/value/currency, zéro PII), un funnel traçable view→add→begin→purchase verrouillé par des tests « aucun event avant opt-in » ET « après opt-out », et une seule voie de révocation documentée.**

> **Garde-fous & indices** : **câble les émetteurs manquants, ne redéfinis pas l'enum** `FUNNEL_EVENTS` ; réutilise le store de consentement Zustand existant. RGPD strict (consentement = condition d'émission, **aucune PII**, pas de double-tracking). L'émetteur `begin_checkout` doit vivre **derrière le gate `ORDERS_AVAILABLE`** (checkout désactivé en pré-lancement).

---

### PERF — Performance, Core Web Vitals, bundle & DB

> Colle le **Préambule partagé**.

Optimise le **ressenti** (LCP, CLS, INP) et l'**efficacité** (bundle, requêtes DB) de bout en bout, **mesures avant/après chiffrées à l'appui** (`pnpm e2e e2e/performance.spec.ts` + `pnpm analyse`, aujourd'hui non faites). Cherche les vrais gains : `GET_PRODUCTS_SELECT` charge `description` même hors PDP (`modules/products/constants/product.constants.ts:204` — un select PLP allégé gagnerait du payload) ; des N+1 **éventuels** dans les reads catalogue/panier (`get-related-products.ts` est réel ; ne présume pas que « recently-viewed » — client-side — ou des « recommandations panier » en soient) ; le CLS des sheets/modals. À l'inverse, **ne re-flague pas ce qui est déjà traité** : la galerie PDP LCP est optimisée (`isLCPCandidate` index 0 + `fetchPriority`), le CLS de l'`announcement-bar` est corrigé (audit 2026-05-30) — vérifie que ça **tient**. **L'excellence = le catalogue mobile se peint sans à-coup ni saut, aucune liste ne transporte de champ texte long inutile, et chaque gain est chiffré avant/après — sans régression LCP/CLS sur les pages déjà optimisées.**

> **Outils (sous-exploités) & garde-fous** : `pnpm analyse`/`size`/`check:media`/`knip`/`doctor` + `pnpm e2e e2e/performance.spec.ts`. **Aucune mémoïsation** (React Compiler) ; ne casse pas les décisions documentées (preload Fraunces sur le LCP, rejet d'`inlineCss`, profils `cacheLife`). Tout index DB pairé d'un `down.sql` non appliqué. Frontière : la **structure** du schéma est à `SCHEMA`, ici la **perf** des requêtes.

---

### QUALITY — Dette technique, tests & gates CI

> Colle le **Préambule partagé**.

Réduis la **dette réelle**, comble les **trous de couverture avérés** et **durcis la CI** — sans toucher la logique métier sensible (déléguée à `GUARD`). Les vraies cibles : décomposer le monolithe `use-media-upload.ts` (~904 LOC) en sous-hooks à **API publique stable** (prouvée par le test existant) ; ajouter les gates **`knip`** et **`test:integration`** à `ci.yml` (ils ne tournent dans aucun job — seul `test:coverage` y est ; attention aux faux positifs `knip` sur l'architecture DDD) ; typer les wrappers TanStack Form admin (annotations de paramètre `:any` + `eslint-disable`, dans `products-filter-sheet.types.ts` et les cards `stock/media/variant/pricing/status`) via schéma Zod inféré — ou tracer le coût si la generic-explosion le justifie ; résoudre ou tracer les fichiers `@deprecated` (inventorie-les par grep). À toi de prioriser ce qui réduit le risque réel. **L'excellence = `use-media-upload` décomposé à iso-comportement (test public toujours vert), `knip`+`test:integration` tournant dans un job CI réel, wrappers admin typés ou coût tracé, et la dette résiduelle consignée.**

> **Garde-fous & indices** : refacto **à iso-comportement** (ne jamais écraser un test fourni) ; pas de mémoïsation (`no-react-memoization.regression.test.ts` reste vert) ; mocks d'erreurs Prisma en subclass réelle. Trace la dette non résorbée dans un doc dédié (à créer s'il n'existe pas). ⚠️ Le vrai `any` est des **annotations de paramètre** des wrappers form admin, **pas** des casts `as any` (≈0 en prod hors `app/generated/prisma`, **généré** — ne le touche pas) ; `payment-intent.service.ts` `@deprecated` est en **zone GUARD** (n'en touche pas la logique).

---

### SCHEMA — Architecture du modèle de données & discipline des migrations

> Colle le **Préambule partagé**.

Le schéma Prisma a grossi par accrétion (~39 modèles, **28 enums**, une centaine de contraintes — à recompter sur le filesystem —, **126 migrations**) sans jamais d'audit de **cohérence d'ensemble**. **L'excellence = chaque champ libre survivant est un choix justifié (pas un enum oublié), chaque `onDelete` porte une raison métier, chaque index est justifié, et l'audit rend un verdict par axe — une carte de dette + les verrous qui comptent, pas une refonte.** Prends-en la responsabilité : hygiène des enums vs champs `String` libres (ex. `StockMovement.reason`, codes `Discount`), couverture réelle des contraintes (CHECK/UNIQUE/EXCLUDE — un seul EXCLUDE aujourd'hui, sur `EReportingPeriod`), discipline soft-delete (la JSDoc `shared/lib/prisma.ts:17-21` est **périmée** : elle liste 5 modèles vs les 9 réels à `deletedAt`), justification du mix `onDelete` (≈18 Cascade / 14 Restrict / 17 SetNull, aujourd'hui subi), qualité des index (ex. les `@@index` de `StockMovement`, un composite catalogue candidat). Statue notamment sur l'audit-trail `StockMovement` : il **est** peuplé par les ajustements admin (`stock-movement.service.ts` via `adjust-sku-stock.ts`) mais **absent du flux de vente** (le décrément checkout/webhook ne l'écrit pas) — décide s'il doit le couvrir (chevauche `GROWTH-LIFECYCLE`). À toi de juger dette à résorber vs invariant à verrouiller vs constat à documenter.

> **Garde-fous** : les **invariants 1–10** priment sur toute simplification (numérotation gap-free, `OrderHistory` immuable, snapshots `OrderItem`/`billing*`/`shipping*` figés, modèles e-reporting, enums `PDP_*`/e-reporting **réservés** — ne drop pas un enum PG). Toute migration **pairée d'un `down.sql`**, jamais appliquée en prod par tes soins, pas de réécriture rétroactive (restore Neon PITR). Une contrainte nouvelle se justifie par un test qui échoue sans elle. Frontière : la structure ici, la **perf** des requêtes à `PERF`.

---

### GUARD — Sécurité, RGPD, conformité & cache (re-vérification)

> Colle le **Préambule partagé**. **Mode = re-vérification** (lecture-mostly) : tu confirmes que les fondations tiennent et tu **ne corriges qu'une vraie faille/régression, prouvée par un test rouge d'abord**. Aucun embellissement, aucune refonte ; en cas de doute, tu **documentes** le risque sans patcher à l'aveugle.

Re-vérifie que les fondations **sécurité / RGPD / conformité facturation / cache** sont intactes, et ferme **uniquement** les failles réelles, chacune verrouillée par un test `@regression`. Le terrain : IDOR facture/avoir (`invoice/route.ts` — ownership strict, **404** anti-énumération, **410** si PII purgée, token guest HMAC seule voie anonyme), authz admin via `requireAdmin*` re-check DB (`resolve-invoice-admin.ts` — **jamais** `session.user.role` ; ⚠️ le commentaire `invoice/route.ts:43` formule mal ce re-check, à clarifier sans changer la logique), upload anti MIME-spoofing, rate-limit per-action (`rate-limit-config.ts`), RGPD (anonymisation 2-temps `anonymize-user.service.ts` qui scrubbe `customer*`/`shipping*` mais **préserve** `billing*`/`invoiceDataSnapshot`, purge à `paidAt + 10 ans`), invariants 1–10, et cache (pas de `cookies()`/`headers()` dans `"use cache"`, invalidation via `getOrderInvalidationTags()`). Donne à **chaque surface** un verdict explicite « vérifié OK » (référence test) ou un constat priorisé.

> **Garde-fous** : ne modifie aucune logique facturation/paiement/3DS/webhooks/order-creation sans test rouge prouvant la faille ; ne **jamais** affaiblir une authz ou un rate-limit. Le gap rate-limit **cross-instance** (Map per-instance Vercel, pas de Redis/Arcjet) est un constat **documenté**, pas un patch. Le SAV silencieux / One-Click sans persistance sont **hors GUARD** (`UIUX-04`/`CONTENT`).

---

### INVOICE-GOLIVE — Préparer le go-live e-reporting (2026-2027) ⏳ forward-looking

> Colle le **Préambule partagé**.

Toute la plomberie e-reporting est **livrée mais en veille** : providers `local`/`mock` (le `factory.ts` **throw** sur `chorus-pro`/`pdp-*`, aucune PA réelle), `INVOICE_ENABLE_EREPORTING=false`, cadence `DAILY` par défaut + `EREPORTING_ALLOW_DAILY_TRANSMISSION` fail-closed, services `build-`/`transmit-ereporting-batch` **orphelins** (vivants mais sans route cron), `getEReportingBatchStatus` = **méthode optionnelle de l'interface, non implémentée** (à câbler si la PA acquitte en async). Le calendrier approche : **réception** fournisseurs au 1ᵉʳ sept. **2026** (obligation back-office, pas du code storefront), **émission/e-reporting B2C** au 1ᵉʳ sept. **2027**. Cette mission **prépare le go-live** là où `GUARD` se contente de re-vérifier : cartographie la séquence d'activation — implémenter une classe `<Pa>Provider` derrière l'interface `InvoiceProvider` + son case dans `factory.ts`, recréer les routes cron `build`/`transmit` vers les services existants (+ `vercel.json`), basculer `BIMONTHLY` selon la spec PA, préparer la sortie de franchise TVA (ventilation des taux, `operationCategory`). **L'excellence = un plan d'activation exécutable et prouvé en dry-run (provider mock branché de bout en bout, routes cron recréées et testées, bascule BIMONTHLY documentée), distinguant nettement ce qui est activable aujourd'hui de ce qui attend la PA et la validation comptable.**

> **Garde-fous** : **rien en prod réelle sans validation comptable explicite et une PA contractualisée** — tout reste dry-run (flags fail-closed). Ne **jamais** câbler `DAILY` sur une vraie PA (dépôt bimestriel attendu). Invariants 1–10 + 5 writers e-reporting **intouchables** : tu prépares et instrumentes, tu ne contournes pas.

---

### PRICE-COMPLY — Conformité des prix réduits (Directive Omnibus) ⏱️ avant toute promo

> Colle le **Préambule partagé**.

Synclune affiche déjà des prix barrés et des « -X% / Économisez Y€ » (`product-price-display.tsx`, `product-pricing.service.ts` et ≥ 7 surfaces : cartes produit, `search-result-item.tsx`…) à partir de `ProductSku.compareAtPrice` — champ admin **libre** (seule validation `>= price`, `sku.schemas.ts:116`), **sans aucune notion de prix de référence légal**. Or la **Directive Omnibus** (art. L112-1-1 + R112-7 C. conso) impose que toute annonce de réduction référence le **prix le plus bas pratiqué sur 30 jours**. C'est le **seul vrai trou réglementaire orphelin** côté storefront (ni `UIUX-03` ni `SEO` ne touchent la logique prix ; le module `discounts`/codes promo est **séparé** — ne pas confondre). Deux voies à arbitrer : l'**infrastructure d'historique de prix** (table/colonnes capturées à chaque write de prix, calcul du plus bas, garde-fou admin refusant un `compareAtPrice` non-pratiqué), ou l'**option KISS** — retirer le prix barré tant que l'historique n'existe pas (un artisan ne solde quasi jamais). Propage la décision à **toutes** les surfaces d'affichage.

> **Garde-fous** : toute table/colonne d'historique pairée d'un `down.sql` (cf. `SCHEMA`), jamais appliquée en prod par tes soins. **Verrouille par un test `@regression`** : aucune réduction affichée ne référence un prix non-pratiqué dans les 30 jours. L'historique doit **se peupler dès le lancement** (avant `ORDERS_AVAILABLE=true` et toute promo) — sinon la première promo est non conforme. Ne touche **jamais** au calcul du montant payé ; présentation coordonnée avec `UIUX-03`.

---

### INFRA — Env/flags, headers/CSP, pipeline CI & docs

> Colle le **Préambule partagé**.

Durcis **configuration, CI et documentation** pour un déploiement reproductible, sans casser workflows ni headers. Le terrain réel : (1) **fail-closed à compléter** — `validateEnv()` est bien déclenché au boot (`instrumentation.ts` importe `shared/lib/env` côté nodejs), mais `VAT_FRANCHISE_THRESHOLD_EUR` est lu en `process.env` **brut** dans `vat-franchise.ts`, **hors** `env.schema.ts` : il échappe donc à la validation ; ajoute-le au schéma ; (2) **headers/CSP** — vérifie les directives CSP/HSTS/Permissions-Policy (`next.config.ts`). ⚠️ La **PWA (Serwist, `app/sw.ts`, `manifest.ts`) et Lighthouse CI ont été retirées** — ne pas re-documenter ; (3) gaps CI — `knip` et `test:integration` ne tournent dans aucun job ; (4) docs — `docs/` contient `AUDIT-PROMPTS.md` + `BUSINESS.md` + `RUNBOOK.md` ; les références mortes (docs `INVOICING.md`/`CRONS.md`/`RUNBOOK-INVOICING.md` supprimées) dans `CLAUDE.md`/`README`/`CHANGELOG` ont été **nettoyées (2026-06)** ; reste à documenter la **délivrabilité DNS** (SPF/DKIM/DMARC) et `ORDERS_AVAILABLE` (constante de code, pas flag env) dans un nouveau `DEPLOY.md`. **L'excellence = un nouvel arrivant clone, lit `DEPLOY.md` et déploie sans surprise — schéma env complet (aucune variable métier hors validation), CI qui attrape ce qu'elle prétend attraper (knip/integration), zéro doc fantôme.**

> **Garde-fous & indices** : `validateEnv()` reste **fail-closed** — une variable métier hors schéma (comme le seuil de franchise aujourd'hui) est précisément le trou à fermer. Ne retire pas naïvement `'unsafe-inline'`/`'unsafe-eval'` (Next/Tailwind les exigent). **Vérifie chaque doc contre le filesystem** avant de la dire « à régénérer » : plusieurs n'existent pas. Les invariants facturation/RGPD restent en re-vérification (`GUARD`).

---

### OBS — Observabilité, monitoring crons & santé production

> Colle le **Préambule partagé**.

Rends Synclune **observable et alertable** : (1) **symétrise** la couverture Sentry — le `beforeSend` serveur whiteliste les `*_SEQUENCE_OVERFLOW` mais **pas** l'edge (`sentry.edge.config.ts`), qui ne distingue donc pas un overflow attendu d'un crash ordinaire ; (2) enrichis `app/api/health/route.ts` (DB/Stripe/Resend déjà là) avec la **profondeur des DLQ** (`postWebhookTask` FAILED, `Order.invoiceRetryDeferred`/`ereportingRetryDeferred`) et « dernier succès cron > seuil = dégradé » ; (3) **exploite** les rapports CSP (`app/api/csp-report` les `logger.warn` sans jamais les agréger/forwarder) ; (4) instrumente chaque cron (dernier succès/durée/streak d'échecs) ; (5) un **runbook santé & alerting** (absent). Aligne aussi le commentaire « 14 jobs » de `sentry.server.config.ts` (réels : 11). **L'excellence = aucun échec silencieux — un overflow edge, une DLQ qui se remplit, un cron muet depuis N heures déclenchent une alerte actionnable avant le client, et le runbook dit quoi faire pour chacun.**

> **Garde-fous** : **aucune PII dans Sentry** (ne casse pas `beforeSend`/`scrubSentryEvent`) ; routes cron protégées (token Vercel) inchangées ; pas de dépendance lourde (préfère le natif Sentry). Le circuit-breaker couvre Stripe+Resend (pas UploadThing) ; signale l'absence de webhook Resend / gestion bounce (constat, coordonne avec `INFRA`).

---

## Track Croissance / Systèmes produit (prompts larges)

> **Ajouté le 2026-06-18** (track produit) ; **complété le 2026-06-19** (audit : passage de tout le fichier en mode large + missions `SCHEMA` et `INVOICE-GOLIVE`). Les 20 missions ci-dessus **durcissent et embellissent l'existant** ; ce track-ci **ouvre des chantiers produit** là où aucune mission n'a de mandat. Ces prompts sont **délibérément larges** : ils posent une **intention** et un **terrain de jeu**, **pas** une liste de tâches ni des chemins de fichiers. Le modèle **diagnostique l'existant, conçoit et décide seul** du quoi et du comment. La seule chose non négociable est le **Préambule partagé** (invariants intouchables) que chaque prompt réutilise — il ne le réécrit pas.
>
> **Timing.** Synclune est en **pré-lancement** (`ORDERS_AVAILABLE=false`). Seule **`GROWTH-ACQ`** vaut le coup **maintenant** (constituer une audience à convertir au lancement) ; les **quatre autres sont gatées post-lancement** — sans trafic / ventes / catalogue réels, elles tourneraient à vide. Lance-les quand le terrain existe.

---

### GROWTH-ACQ — Acquisition & audience de pré-lancement ⏱️ maintenant

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Synclune est en pré-lancement : le catalogue se visite mais on ne peut pas acheter. Le meilleur usage de cette période = **transformer les visiteurs en une audience à convertir à l'ouverture** — or **rien ne capte cet intérêt** aujourd'hui (aucune table/route de waitlist ou newsletter dans le code). Empare-toi du sujet de bout en bout comme une maison de joaillerie qui sait faire naître le désir **avant** d'ouvrir : capture d'email digne (sur le bandeau `app/(shop)/(home)/_components/orders-paused-notice.tsx`, en footer, en page produit non-achetable) avec une promesse claire et une offre de bienvenue. **L'excellence = une capture qui convertit l'intérêt en consentement durable (chemin de retrait réel inclus) et une promesse de bienvenue assez concrète pour faire revenir le jour J — le visiteur a le sentiment d'être admis dans le cercle d'une maison qui ouvre bientôt, pas d'avoir rempli un formulaire.**

> **Garde-fous & indices** : esthétique « commandes en pause » — aucun contournement de `assertStoreOpen()`/`ORDERS_AVAILABLE`. **RGPD strict** : pas de capture d'email + consentement marketing sans **chemin de suppression réel** — or la désinscription One-Click ne persiste rien, les champs `Cart.guest*`/`marketingConsent` portent une garde RGPD explicite (`schema.prisma`), et `cleanup-carts.service.ts` est lui-même **sans cron** (la purge promise n'est pas branchée). Récompenser le premier achat suppose une **extension du modèle `Discount`** (`DiscountType` n'a pas de gating « premier achat »), **en coordination avec `SCHEMA`** (migration pairée), jamais un hack UI.

---

### GROWTH-LIFECYCLE — Cycle de vie client & rétention 🔒 post-lancement

> Colle le **Préambule partagé**.

Une fois les ventes ouvertes, la relation ne s'arrête pas à la confirmation. Conçois la **vie relationnelle post-achat** — fidéliser, faire revenir, rattraper ce qui se perd — avec la chaleur de la marque et un RGPD irréprochable. Des fondations dorment, à arbitrer : la **relance avis** (`send-review-requests.service.ts` existe et est **testé** mais aucune route `api/cron`/`vercel.json` ne le déclenche), le **panier abandonné** (champs `Cart.*` + `cleanup-carts.service.ts` **sans caller**), la **notification** des demandes de retour (`request-return` **persiste déjà** la demande — Refund PENDING + audit, visible en badges/liste admin — mais reste **muet côté notifications**), l'**audit-trail des ventes/restock** dans `StockMovement` (jamais écrit hors ajustement manuel), et le **win-back / pièce-compagnon**. À l'inverse, le **back-in-stock est déjà vivant** (`notify-back-in-stock.ts`, event-driven). **L'excellence n'est pas de tout réveiller** : choisis les 1-2 leviers qui comptent le plus post-lancement et fais-les impeccablement — une cliente se sent **suivie sans se sentir traquée**, et chaque relance a une raison qu'elle perçoit.

> **Garde-fous** : toute relance marketing (avis, panier abandonné) exige le **préalable RGPD** — endpoint de retrait **fonctionnel** + purge des PII guest (cf. garde `schema.prisma`) — ne peuple pas `guestEmail`/`marketingConsent` sans ça. Délivrabilité : les emails marketing portent déjà `List-Unsubscribe` One-Click + `Precedence:bulk` ; respecte le circuit-breaker Resend + le throttle 350 ms de `notify-back-in-stock`.

---

### GROWTH-MERCH — Merchandising & curation 🔒 post-lancement

> Colle le **Préambule partagé** + l'**Étoile du Nord design**.

Le catalogue se contente de filtrer et trier (`PRODUCTS_SORT_OPTIONS` n'a pas de « popularité » — normal en pré-lancement). Donne-lui une **intention commerciale** de vitrine de joaillerie — plusieurs leviers possibles, à toi de choisir lesquels portent le plus : **« la parure »** (suggérer des pièces complémentaires pour composer un ensemble ; aujourd'hui `modules/products/components/cart-recommendations.tsx` recommande sur l'historique d'achat ou les nouveautés, mais **sans jamais tenir compte du contenu du panier courant**, alors que `get-related-products.ts` sait scorer collection>type>couleur — rends-le contextuel) ; une **curation éditoriale** au-delà du `isFeatured` par collection (coups de cœur, « à offrir », saisonnière) ; un **seuil franco / livraison offerte** (aujourd'hui un simple placeholder « Livraison offerte dès 50 € » dans `announcement-form.tsx`, **sans logique**) ; des **signaux de désirabilité** subtils (« pièce unique », « dernières disponibles » — aucun champ propre n'existe, à dériver du stock ou à modéliser). **L'excellence = un panier moyen qui monte parce que la boutique guide vers la parure et respire la curation d'une main, jamais la grille générée ni l'agressivité.**

> **Garde-fous** : toute mention « livraison offerte » / réassurance reste **honnête** (cf. refonte méga-menus) ; un seuil franco implique un gating montant **coordonné avec `SCHEMA`** (migration pairée). Mode « commandes en pause » : la curation s'affiche mais ne réactive pas l'achat (`ORDERS_AVAILABLE`) ; ne casse pas les budgets `size-limit` ni le tri JS pré-cache de `get-products.ts`.

---

### GROWTH-CRO — Expérimentation & conversion 🔒 post-lancement

> Colle le **Préambule partagé**.

Quand il y aura du trafic réel, Synclune doit **apprendre de ses visiteurs et itérer** plutôt que deviner. **Prérequis absolu** : compléter le funnel — `begin_checkout` n'est pas émis aujourd'hui, donc la conversion n'est pas mesurable de bout en bout (ce câblage est le **périmètre d'`ANALYTICS`** ; séquence cette mission **après** lui — sans begin_checkout émis, elle ne peut rien prouver). Ensuite, donne à la boutique l'**approche A/B la plus légère** qui tienne pour une petite app : assignation déterministe par bucket de visiteur, mesure via les events déjà en place, respect strict du consentement — pas une usine à gaz (aucun framework d'expérimentation n'existe ; les seuls « flags » du repo sont ceux de l'e-reporting). **L'excellence = pouvoir trancher une vraie friction du funnel avec une confiance raisonnable, à partir des events déjà en place et sans dette d'infra.**

> **Garde-fous** : consentement RGPD **inviolable** — toute assignation/mesure respecte `hasAnalyticsConsent()`, aucun event avant opt-in ni après opt-out, aucune PII. Ne **redéfinis pas** l'enum `FUNNEL_EVENTS` (propriété `ANALYTICS`) ni ne double le store de consentement ; ne court-circuite pas `ORDERS_AVAILABLE`.

---

### SEARCH-REL — Pertinence & classement de la recherche 🔒 post-lancement

> Colle le **Préambule partagé**.

La recherche trouve — mais classe-t-elle bien ? Quand le catalogue aura grandi, **fais de la pertinence un levier de conversion** pour un vocabulaire de bijoux. Le moteur vit entièrement dans `modules/products` (il n'existe **pas** de `modules/search`) : `fuzzy-search.ts` (scoring titre/desc, `ORDER BY score` pur), `search-synonyms.ts` (~14 groupes, **mono-mot** seulement), `spell-suggestion.ts` (correction). Les leviers : enrichir le ranking de **signaux métier** (disponibilité stock, fraîcheur, popularité post-lancement) au-delà de la seule similarité textuelle ; intégrer les related-fields (matériau/couleur/collection) **dans** le score, pas juste en filet ; gérer les **expressions multi-mots** du domaine (« pierre de lune », « boucle d'oreille », « plaqué or »), aujourd'hui décomposées ; et **réinjecter le tracking zero-result** déjà collecté (Sentry, `quick-search.ts`) pour combler les synonymes manquants — la boucle d'amélioration n'existe pas encore. À toi de décider comment rendre le moteur vraiment juste.

> **Garde-fous** : ne casse ni les frontières `"use cache"` (cacheLife `catalog`, cacheTag LIST) ni les protections DoS (`statement_timeout`, `MAX_SEARCH_LENGTH`, rate-limits) ; respecte le fallback gracieux quand `pg_trgm` est absent. Tout changement de ranking se prouve par un test (cf. `quick-search-products.test.ts` « preserves relevance ordering »).

---

> **Petits gaps réels — branchés dans les missions existantes** (pas de mission dédiée) : **SAV silencieux + canal de contact** → `UIUX-04` / `BRAND-EXP` / `CONTENT` ; **UI litige in-app** → `UIUX-05` (post-lancement) ; **persistance du consentement** → `CONTENT` + tests `QUALITY` ; **délivrabilité email / DNS (SPF/DKIM/DMARC + bounce)** → `INFRA` (+ `OBS` pour le monitoring) ; **gating discount premier-achat** → `GROWTH-ACQ` (+ `SCHEMA`) ; **stratégie stock / back-in-stock / audit-trail `StockMovement`** → `GROWTH-LIFECYCLE`.

---

## Séquencement suggéré

1. **Fondation système** : `UIUX-01` (design system — tokens) puis `FEEDBACK` (primitives toasts/empties/
   skeletons + SSOT éditorial). Ces deux missions posent ce que toutes les autres missions UI réutilisent ;
   inscrire « réutilise les empties/skeletons/toasts de FEEDBACK, pas de one-off » dans les suivantes.
2. **Parcours d'achat** (impact business) : `UIUX-03` (PDP) → `UIUX-02` (vitrine) → `UIUX-04` (tunnel
   d'achat & post-achat). C'est `UIUX-04` qui fait la refonte UI de référence du panier/checkout/compte.
3. **Enrichissements du parcours** (par-dessus la refonte UIUX-04, sans la défaire ni toucher la logique
   paiement) : `CONTENT` (atelier, page à-propos, option cadeau, préférences email) puis `ANALYTICS`
   (points de tracking funnel + gate de consentement). Exécuter après UIUX-04 pour éviter les conflits sur
   `modules/cart`/`modules/payments`.
4. **Accès au compte** : `AUTH-UX` (pages auth + emails de flux). À faire avant la passe A11Y pour qu'elle
   ne traite que l'a11y résiduelle des forms auth.
5. **Marque** : `BRAND-EXP` (voix, refonte éditoriale/visuelle des 11 emails, micro-célébrations). Après
   CONTENT/UIUX-04 car elle pose la couche émotionnelle SUR les structures déjà refondues ; elle délègue
   le contenu des emails auth à `AUTH-UX`.
6. **Découvrabilité** : `SEO` (metadata + JSON-LD Product/Offer/Review/LocalBusiness…). Après UIUX-02/03
   pour brancher les données structurées sur les pages finales et étendre `e2e/seo.spec.ts`.
7. **Transversal UI** : `UIUX-06` (mobile) puis `A11Y` (passe WCAG appliquée après les refontes).
8. **Admin** : `UIUX-05`.
9. **Robustesse & exploitation** : `SCHEMA` (architecture du schéma & migrations — exécutable à tout
   moment, sans dépendance UI), `PERF` (CWV/bundle/DB ; câble `pnpm e2e e2e/performance.spec.ts` + `pnpm size`), `QUALITY`
   (dette/tests/gates CI ; `knip`, `test:integration`, `doctor`), `GUARD` (re-vérification sécurité/RGPD/
   conformité), puis l'infra : `INFRA` (env/flags, headers CSP, workflows, docs) et `OBS`
   (Sentry/sourcemaps, santé, crons `vercel.json`, runbooks). `next.config.ts` et `.github/workflows`
   étant partagés (INFRA/OBS/QUALITY), coordonner et privilégier de petits diffs ciblés. `SCHEMA` et
   `PERF` se chevauchent sur la DB : `SCHEMA` possède la **structure** (modèles, contraintes, migrations),
   `PERF` la **performance** des requêtes.

> Chaque mission est exécutable indépendamment ; cet ordre minimise les conflits de design (tokens +
> primitives feedback d'abord), priorise la valeur utilisateur/business (parcours d'achat), et place les
> missions qui _enrichissent_ un périmètre déjà refondu (ANALYTICS, CONTENT, BRAND-EXP, SEO) **après** sa
> mission UI propriétaire pour éviter les write-fights.
>
> Le **Track Croissance / Systèmes produit** est **hors** de cette séquence de durcissement : `GROWTH-ACQ`
> est exécutable **immédiatement** (pré-lancement — c'est même le meilleur usage du temps d'ici l'ouverture) ;
> les quatre autres (`GROWTH-LIFECYCLE`, `GROWTH-MERCH`, `GROWTH-CRO`, `SEARCH-REL`) sont **gatées
> post-lancement** (besoin de trafic / ventes / catalogue réels) — à dégainer quand `ORDERS_AVAILABLE=true`.
>
> `INVOICE-GOLIVE` est lui aussi **hors séquence de lancement** : chantier prospectif gaté par le calendrier
> e-reporting (réception 1ᵉʳ sept. 2026, émission 1ᵉʳ sept. 2027) et la **contractualisation d'une Plateforme
> Agréée** — à dégainer à l'approche de l'échéance, tant que `INVOICE_ENABLE_EREPORTING=false` et qu'aucune PA
> réelle n'est branchée (tout reste dry-run d'ici là).
