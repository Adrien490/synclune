# SIMPLIFICATION.md — Propositions d'allégement v1

> Doc créé le 2026-08-03 (branche `chore/v1-schema-simplification`), sur la base d'une exploration chiffrée du repo au 2026-08-01. Compagnon de [`BUSINESS.md`](BUSINESS.md) (choix de périmètre déjà actés) et [`KNOWN-ISSUES.md`](KNOWN-ISSUES.md) (défauts assumés). **Rien dans ce doc n'est exécuté sans arbitrage** : chaque proposition se termine par une case `Décision`.

**Profil réel** (cf. BUSINESS.md) : micro-entreprise en franchise de TVA, 1 personne (Léane), ~20 commandes/mois, parcours d'achat 100 % invité, admin = une seule session possible.

**Arbitrage du 2026-08-03.** Recommandations validées en bloc au départ, puis **affinées à l'instruction** : **Lots 0, 1, 2 et 4 exécutés** (PR #19, ~−21 000 lignes) ; **Lot 3 sans objet** — la fusion des taxonomies était déjà réalisée (§ 6, S3.1) ; **Rang 4 arbitré en fin de course** — la wishlist, le quick-search et la vidéo produit sont **GARDÉS** (ces surfaces venaient d'être auditées et remédiées), seul S4.4 (file d'upload hors-ligne + ETA, admin-only) est retenu et reste à exécuter. Quatre items instruits se sont conclus par un **« garder » motivé** plutôt qu'un retrait : `Order.vendor*` (S3.6), la granularité des transitions de statut (S3.8), le double fournisseur d'adresses (S3.9e) et la fusion des taxonomies (S3.1).

**Cap fixé par Adrien (2026-08-03)** — ces deux directives priment sur les recommandations item par item :

1. **Léane gère depuis le dashboard Stripe** ce que Stripe sait déjà faire (remboursements, litige, détail d'un paiement). Pas de code sur-ingénieré pour dupliquer Stripe — l'app garde uniquement ce que Stripe ne fait pas : la conformité française (factures, avoirs, numérotation) et la boutique elle-même.
2. **Limiter les cronjobs au noyau strict.** Le reste devient des actions manuelles — boutons dans l'admin, lancés de temps en temps.

---

## 0. Lecture honnête de l'état des lieux

La demande initiale est « trop de modèles Prisma ». Constat après inventaire : **les modèles superflus ont déjà largement été supprimés** — sept vagues de dégraissage entre le 2026-07-26 et le 2026-08-01 (§ 2). Ce qui reste à gagner côté schéma, ce sont **2 à 3 tables au plus** (Wishlist ×2, PostWebhookTask), **des colonnes et index morts** (résidus de l'espace client), et **de la dette d'enums**. Le vrai gras est ailleurs : **dans le code applicatif** (taxonomies clonées ×4, workflow remboursements, quick-search, dashboard, rate-limits) et **dans l'infra** (9 crons pour ~20 commandes/mois).

## 1. État des lieux chiffré (2026-08-01)

Chiffres issus de l'exploration ; ordres de grandeur, pas de la comptabilité au fichier près.

| Surface                | Mesure                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | 1 539 lignes — **30 modèles, ~440 champs, 20 enums**                                                                                                                                                                                                |
| Modèle `Order`         | **85 champs** (19 % du schéma), dont 12 colonnes `vendor*` identiques sur toutes les lignes                                                                                                                                                         |
| Code source            | ~131 k LOC dans `modules/` + ~39 k `shared/` + ~31 k `app/`                                                                                                                                                                                         |
| Server Actions         | 121 fichiers (`orders` seul : 20, dont 11 transitions de statut)                                                                                                                                                                                    |
| Pages admin            | **51** sur 77 pages au total (66 % de l'app est de l'admin ; catalogue = 27 pages)                                                                                                                                                                  |
| Crons                  | 9 jobs quotidiens/hebdo/mensuels (`vercel.json`)                                                                                                                                                                                                    |
| Rate limiting          | `shared/lib/rate-limit-config.ts` : **1 361 lignes, ~80 presets** (~55 pour des actions admin mono-utilisatrice)                                                                                                                                    |
| Tests                  | ~1 204 fichiers (201 régression, 16 intégration, 11 contract, 69 specs e2e), ~50 garde-fous statiques repo-wide                                                                                                                                     |
| Taxonomies             | `colors` + `materials` + `product-types` + `collections` = 292 fichiers — **⚠️ chiffre trompeur, corrigé le 2026-08-03** : le comptage d'origine mesurait des FICHIERS sans regarder leur ÉPAISSEUR. La mutualisation a depuis été faite (cf. S3.1) |

## 2. Ce qui a déjà été dégraissé — ne pas re-proposer

| Vague                                        | Date       | Contenu                                                                                        |
| -------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| e-reporting DGFiP                            | 2026-07-26 | ~7 200 lignes retirées, à réécrire au go-live 2027 (cf. RUNBOOK)                               |
| Click & collect                              | 2026-07    | Scaffolding retiré                                                                             |
| Système d'avis                               | 2026-07-30 | 4 tables, ~150 fichiers                                                                        |
| Back-in-stock + emails marketing             | 2026-07-30 | Plus aucun émetteur marketing                                                                  |
| **Espace client**                            | 2026-07-31 | Table `Address`, 5 colonnes `User`, routes compte, fusion post-login — login admin-only        |
| Modèle `Dispute`                             | 2026-08-01 | Table + 2 enums (le litige se gère dans Stripe)                                                |
| Décors hero, ParticleBackground, MicroToast… | 2026-08-01 | Right-sizing UI                                                                                |
| Volume email                                 | 2026-05→07 | Parc réduit à 8 templates (tracking-update, welcome, review-request, admin-new-order… retirés) |

Sont aussi **déjà actés** dans BUSINESS.md : français seul, EUR seul, pas de PWA, pas de relance panier/cross-sell. Ne pas rouvrir ici.

## 3. Format des propositions

Chaque item : **Quoi · Pourquoi · Gain · Risque/contraintes · Effort** (S < 1 j, M = 1-3 j, L > 3 j) **· Reco** (garder / simplifier / retirer) **· `Décision : ✅ reco validée (2026-08-03)`**. Les items d'un même rang peuvent s'arbitrer en bloc.

---

## 4. Rang 1 — Résidus morts (zéro risque, zéro perte fonctionnelle)

Tous ces items sont des restes de features déjà supprimées. Un seul lot, une seule migration (avec son `down.sql`).

| #    | Quoi                                                                                                   | Pourquoi c'est mort                                                                                                                                                                                                           | Effort | Décision      |
| ---- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------- |
| S1.1 | `User.stripeCustomerId` + son `@unique`                                                                | Lu/écrit uniquement derrière `if (userId)` dans `initialize-payment.ts`, `confirm-checkout.ts`, `stripe-customer.service.ts` — jamais peuplé sans compte client. Préalable : simplifier ces 3 call sites (retirer la branche) | S      | ✅ 2026-08-03 |
| S1.2 | `User.@@index([role, deletedAt])` + `@@index([deletedAt, suspendedAt])`                                | Motif documenté « admin listing » : cette page n'existe pas. Table à **1 ligne**                                                                                                                                              | S      | ✅ 2026-08-03 |
| S1.3 | `Order.@@index([userId, status, createdAt])` + `@@index([userId, createdAt])`                          | Commentés « Espace client : mes commandes » — surface supprimée                                                                                                                                                               | S      | ✅ 2026-08-03 |
| S1.4 | `OrderNote.isInternal`                                                                                 | Écrit, jamais lu ; le code lui-même la dit « colonne héritée de l'espace client » (`add-order-note.ts`)                                                                                                                       | S      | ✅ 2026-08-03 |
| S1.5 | `DiscountUsage.userId` + `@@index([userId])` + `@@index([discountId, userId])`                         | Jamais peuplé en invité ; `maxUsagePerUser` retombe déjà sur `customerEmail`                                                                                                                                                  | S      | ✅ 2026-08-03 |
| S1.6 | Test orphelin `modules/orders/constants/__tests__/order-address-read-snapshot-only.regression.test.ts` | Scanne les lecteurs du modèle `Address`… supprimé le 2026-07-31. Garde un invariant devenu vide                                                                                                                               | S      | ✅ 2026-08-03 |
| S1.7 | Deps `@types/color` + `@better-auth/cli`                                                               | Déjà dans `ignoreDependencies` de knip = inutilisées                                                                                                                                                                          | S      | ✅ 2026-08-03 |
| S1.8 | Drift doc : `BUSINESS.md` § « Pourquoi Vercel Pro n'est pas un choix »                                 | Parle de 11 crons dont 3 demi-horaires ; la réalité est 9 crons quotidiens plafonnés Hobby (CLAUDE.md + `cron-hobby-plan-daily-limit.regression.test.ts`). À réconcilier — d'autant plus si le § 8 réduit encore les crons    | S      | ✅ 2026-08-03 |
| S1.9 | Référence morte `docs/INVOICING.md`                                                                    | Le commentaire de l'enum `OrderAction` (`schema.prisma`, bloc `PDP_*`) renvoie vers un fichier qui n'existe pas — pointer vers RUNBOOK ou supprimer le renvoi                                                                 | S      | ✅ 2026-08-03 |

Nota : les services `cleanup-carts.service.ts` / `cleanup-wishlists.service.ts` ne sont **pas** orphelins (vérifié : appelés par la route `cleanup-pending-orders`) — une exploration précédente les avait mal classés.

## 5. Rang 2 — Dette d'enums (à purger opportunistement, pas pour elle-même)

Retirer une valeur d'un enum Postgres = recréer le type. Surtout : **une valeur référencée par une ligne d'`OrderHistory` (table immuable, rétention 10 ans) ne peut plus jamais être retirée** — vérifier `SELECT count(*)` avant tout drop.

| #    | Valeur                                              | État                                                                                                                                                                                                                                                              | Reco                     | Décision                    |
| ---- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------- |
| S2.1 | `OrderAction` : 6 valeurs `PDP_*`                   | Marquées « RÉSERVÉ / INUTILISÉ » dans le schéma — jamais émises, drop sûr                                                                                                                                                                                         | retirer                  | ✅ 2026-08-03               |
| S2.2 | `OrderAction.DISPUTE_OPENED` / `DISPUTE_RESOLVED`   | ⚠️ **Verdict inversé à l'audit Lot 6** : le modèle `Dispute` est parti mais le webhook émet toujours ces valeurs (7 writers `dispute-handlers.ts`, l'état a migré vers OrderHistory) et `hasOpenDisputeTx` bloque l'annulation pendant litige (`cancel-order.ts`) | **GARDER (vivant)**      | ✅ 2026-08-03 (audit Lot 6) |
| S2.3 | `PaymentStatus.EXPIRED`                             | 0 writer, 6 lecteurs de recovery, 0 ligne (Order **et** OrderHistory) — **droppée au Lot 6** avec simplification des lecteurs                                                                                                                                     | retirer                  | ✅ fait au Lot 6            |
| S2.4 | `HistorySource.CUSTOMER`                            | ⚠️ **Verdict inversé à l'audit Lot 6** : « plus aucun émetteur » était FAUX — émis à chaque téléchargement de facture/avoir par le lien tokenisé invité (`INVOICE_DOWNLOADED`, routes `invoice`/`credit-note`)                                                    | **GARDER (vivant)**      | ✅ 2026-08-03 (audit Lot 6) |
| S2.5 | `AccountStatus.PENDING_DELETION`                    | Plus aucun écrivain (cron supprimé)                                                                                                                                                                                                                               | retirer                  | ✅ 2026-08-03               |
| S2.6 | `Role.USER`                                         | Aucune ligne USER ne peut plus naître (`disableSignUp`), mais c'est le `@default` et Better Auth s'y adosse — coût > gain                                                                                                                                         | **garder**               | ✅ 2026-08-03               |
| S2.7 | `VatRegime` (3 valeurs, seul `FRANCHISE_BASE` réel) | Les 2 autres préparent la sortie de franchise (seuil 85 k€) — besoin futur réel, pas de la dette                                                                                                                                                                  | **garder**               | ✅ 2026-08-03               |
| S2.8 | `AccountStatus.ANONYMIZED`                          | 0 writer depuis le retrait de l'anonymisation (2026-07-31), mais 2 lecteurs défensifs vivants (garde `/sign-in/email`, `isInvoiceOwnerErased`) et tout futur chemin d'anonymisation la ré-émettra                                                                 | **garder** (audit Lot 6) | ✅ 2026-08-03               |

Reco globale : traiter S2.x **dans une migration qui touche déjà ces types** (ex. celle du Rang 1), pas en chantier dédié.

## 6. Rang 3 — Simplifications structurelles internes (invisibles pour les clientes)

### S3.1 — Fusionner les 4 taxonomies clonées → **DÉJÀ RÉALISÉ (constat mesuré 2026-08-03)**

- **Ce que le doc annonçait** : « 292 fichiers → ~90, −10 k LOC src ». **Ce chiffre était faux**, non par erreur de comptage mais de méthode : l'exploration du 2026-08-01 a compté des fichiers portant des noms clonés (`<T>s-bottom-bar`, `<T>s-filter-sheet`…) sans ouvrir ces fichiers.
- **La mesure réelle (2026-08-03)** :
  - `modules/taxonomies` porte **1 267 lignes de générique partagé** (10 composants, la config, les hooks, les types), consommé par les 3 modules — 9 composants admin et 5 hooks chacun ;
  - **17 fichiers de ≤ 15 lignes** dans `colors`/`materials`/`product-types` sont déjà de purs wrappers de délégation. Exemple intégral de `materials-bottom-bar.tsx` : `return <TaxonomyBottomBar config={TAXONOMY_CONFIG.material} />;`
  - ce qui reste épais **porte une spécificité réelle**, pas de la duplication : `hex-color-input` (252 L), `color-selector` (264 L), `color-library-sheet` (186 L), `sortable-color-chips` (155 L) sont propres aux couleurs ; les `data-table` ont des colonnes différentes (swatch vs comptage de variantes vs comptage de produits) ; les `data/` divergent plus qu'ils ne se ressemblent (diff normalisé `get-materials` ↔ `get-product-types` : **152 lignes d'écart sur 123**).
- **Les 18 actions ne sont PAS factorisables** — même motif que S3.8 : `admin-actions-require-admin.contract.test.ts` exige dans **chaque fichier** d'action l'import ET l'appel de `requireAdmin` (`AUTH_IMPORT_PATTERN` / `AUTH_CALL_PATTERN`). Une fabrique générique viderait les 18 fichiers de leur garde visible.
- **Reliquat réel** : les 6 formulaires `create-*-form` / `edit-*-form` (~1 225 L, vrais clones). ⚠️ **Les 6 sont ouverts par une session concurrente** au 2026-08-03 (refactor InputField) — à mutualiser après son commit, et son refactor les aura peut-être déjà rapprochés.
- **Verdict : rien à exécuter.** Le gain visé a été encaissé par l'audit admin catalogue du 2026-08-01. `Décision : ✅ CONSTAT — déjà réalisé, reliquat = 6 formulaires`

### S3.2 — Rate limiting : 80 presets → ~6

- **Quoi** : réduire `shared/lib/rate-limit-config.ts` à ~6 presets (public-lecture, public-écriture, checkout, auth, admin, pdf) ; conserver le champ `name` requis et le pattern de clé actuel.
- **Pourquoi** : ~55 presets protègent des actions admin exécutées par une seule personne déjà authentifiée. Le rate limiting reste obligatoire (un endpoint `"use server"` est public), mais 6 profils suffisent.
- **Gain** : ~−1 100 lignes + simplification de `server-actions-rate-limited.regression.test.ts`.
- **Risque** : faible — garder les leçons de KI-004 (jamais de compteur partagé implicite, `ipAddress` en 3ᵉ argument).
- **Bonus** : c'est la passe transverse qui règle **KI-003** (libellés de rate limit encore vouvoyés dans ~20 fichiers) — réécrire les ~6 messages restants en tutoiement au passage et fermer l'entrée dans KNOWN-ISSUES.md.
- **Effort** : M. **Reco : simplifier.** `Décision : ✅ reco validée (2026-08-03)`

### S3.3 — Remboursements : Stripe dashboard comme chemin nominal

- **Quoi** : Léane rembourse **depuis le dashboard Stripe**. L'app supprime le workflow d'approbation in-app (state machine `approve/reject/cancel/process/retry-failed`, 8 actions, ~30 composants admin) et garde uniquement : le webhook `charge.refunded` / `refund.updated` → `finalize-refund.service.ts` (restock, `paymentStatus`, **avoir automatique**, email), la page admin de **consultation** des remboursements, et un bouton de rattrapage manuel (§ 8).
- **Pourquoi** : cap n°1. Un workflow multi-acteurs (demandeur/approbateur) n'a pas de sens pour une personne seule ; Stripe fait déjà l'UI de remboursement, l'app n'a d'irremplaçable que la conformité (avoir `A-YYYY-NNNNN`, PDF immuable) — et elle est **déjà branchée sur le webhook**, donc un remboursement Stripe-dashboard produit son avoir sans code en plus.
- **Gain** : grosse part des 109 fichiers du module `refunds` (estimation ~50-60 fichiers) + 10 k LOC de tests associés.
- **Risque** : moyen — module revenue-critical ; les invariants 2 et 6 (avoir automatique, PDF immuable) doivent rester intacts, ils vivent côté webhook/services, pas côté UI supprimée. Les remboursements **partiels par ligne avec restock sélectif** (`RefundItem.restock`) perdent leur UI : depuis Stripe on rembourse un montant, pas des lignes — le restock devient un choix manuel côté admin (bouton « re-stocker » sur la commande) ou disparaît. À trancher explicitement.
- **Effort** : L. **Reco : simplifier (option Stripe-first).** `Décision : ✅ reco validée (2026-08-03)`

### S3.4 — PostWebhookTask : file durable maison → envoi direct + rattrapage

- **Quoi** : supprimer la table `PostWebhookTask`, son enum, son cron `retry-post-webhook-tasks` et le service de claim/backoff (~15 fichiers, ~490 LOC de cœur). Post-webhook : envoi direct + `revalidateTag` direct ; en cas d'échec, alerte admin + action `resend-order-email.ts` (existe déjà) + bouton de reconciliation (§ 8).
- **Pourquoi** : une file d'attente durable avec claim atomique et backoff exponentiel pour, en pratique, ~20 emails/mois.
- **Risque** : **réel et à assumer** — l'email de confirmation porte l'**unique accès de la cliente à sa commande** (lien tokenisé `/suivi-commande`). Perdre le retry automatique = si Resend échoue ET que l'alerte est ratée, la cliente n'a plus de lien. Mitigation : l'alerte admin + le renvoi manuel (volume faible → gérable à la main) ; Resend a en outre son idempotence 24 h.
- **Effort** : M. **Reco : simplifier** — cohérent avec le cap « boutons plutôt que machinerie ». `Décision : ✅ reco validée (2026-08-03)`

### S3.5 — Dashboard admin : recentrer sur ce que Stripe ne montre pas

- **Quoi** : réduire les 69 fichiers du module `dashboard` à : **progression franchise TVA** (`vat-progress-card`), **échéances URSSAF**, commandes récentes, alertes. Retirer sélecteur de période, sparklines SVG maison, évolutions %, temps moyen d'expédition, refresh sheet.
- **Pourquoi** : le CA, les paiements et leurs courbes sont dans le dashboard Stripe (cap n°1). Ce que Stripe ne montre pas — seuils fiscaux français — est justement la partie à garder.
- **Gain** : ~40 fichiers, −2 k LOC src, −3,5 k LOC test.
- **Effort** : M. **Reco : simplifier.** `Décision : ✅ reco validée (2026-08-03)`

### S3.6 — `Order.vendor*` : 12 colonnes → **INSTRUIT, verdict : GARDER**

- **Quoi** : 12 colonnes de snapshot vendeur, identiques sur toutes les lignes (il n'y a qu'une vendeuse). Elles ressemblent à une duplication de `invoiceDataSnapshot` (qui porte déjà `seller` sous SHA-256).
- **Ce que l'instruction a montré (2026-08-03)** — le flux réel, dans cet ordre :
  1. `persistInvoiceNumber` écrit les 12 colonnes depuis `getVendorLegalInfo()` (env) au moment de l'émission (`buildVendorSnapshot`, ligne 161) ;
  2. `buildInvoiceData` → **`buildSellerInfo(order)` lit `order.vendorX ?? env.X`**, colonne par colonne, pour les 12 ;
  3. le résultat est canonicalisé, hashé SHA-256 et figé dans `invoiceDataSnapshot`.
- **Pourquoi ce n'est PAS une duplication supprimable** : la Passe 0 du cron `reconcile-invoices` (`backfillInvoiceDataSnapshot`) reconstruit le snapshot des factures **pré-snapshot**, et pour celles-là les colonnes `vendor*` sont **la seule trace de l'identité d'émission** — l'env de l'époque n'est pas récupérable. Les dropper ferait tomber ce backfill sur l'env **courant** : on figerait 10 ans, sous hash, une identité vendeur qui n'est pas celle de la facture. Violation directe de la reconstituabilité (Art. L102 B LPF) et divergence PDF régénéré ↔ hash archivé. Aucune des 12 n'est morte : `buildSellerInfo` les lit toutes.
- **Condition de réouverture** : `SELECT count(*) FROM "Order" WHERE "invoiceNumber" IS NOT NULL AND "invoiceDataSnapshot" IS NULL` = 0 **de façon durable**. Même alors, le gain (12 colonnes nullable sur ~240 lignes/an) ne pèse pas lourd face à l'invariant — à ne rouvrir que si le modèle `Order` devient un problème mesuré.
- **Effort** : instruction faite. **Verdict : GARDER.** `Décision : ✅ GARDER — instruit le 2026-08-03, motif ci-dessus`

### S3.7 — Purge des sessions expirées (c'est un ajout, pas un retrait)

- **Quoi** : la table `Session` n'est plus purgée depuis le retrait du cron `cleanup-sessions` — elle grossit sans borne. Ajouter un `deleteMany({ expiresAt: { lt: now } })` comme passe supplémentaire de `cleanup-pending-orders` (~20 lignes), pas un cron de plus.
- **Effort** : S. **Reco : faire.** `Décision : ✅ reco validée (2026-08-03)`

### S3.8 — Machine à états commandes : 11 transitions → **INSTRUIT, verdict : GARDER**

- **Quoi** : `orders/actions/` porte 11 transitions (`mark-as-paid`, `mark-as-processing`, `mark-as-shipped`, `mark-as-delivered`, `mark-as-returned`, `mark-as-fully-refunded`, `revert-to-processing`, `undo-return`, `cancel-order`, `delete-order`, `update-tracking`). Le doc proposait de fusionner les plus rares dans une action générique « corriger le statut ».
- **Ce que l'instruction a montré (2026-08-03)** :
  1. **aucune n'est morte** — les 11 ont au moins un déclencheur UI (contrairement aux 3 actions discount de S3.9d, retirées le même jour) ;
  2. le garde-fou de l'invariant 8 (`no-manual-paid-order.regression.test.ts`) raisonne sur une **allowlist de FICHIERS** — `expect(writers).toEqual(PAID_WRITER_ALLOWLIST)`, qui contient exactement `mark-as-paid.ts` + le service webhook.
- **Pourquoi la fusion est rejetée** : une action `updateOrderStatus(statut)` devrait soit entrer dans cette allowlist — et alors elle autoriserait implicitement **toutes** les transitions, PAID comprise, sous un nom anodin qui échapperait au tripwire de nommage (`recordCashSale`/`createManualOrder`) — soit rester dehors, auquel cas `mark-as-paid` reste isolé de toute façon et le gain tombe à ~150 lignes sur 2 transitions rares. **La granularité EST le garde-fou** (NF 525, Art. 286/289-I). Second motif : chaque action écrit une `OrderAction` distincte dans `OrderHistory` (immuable, 10 ans) ; une action générique devrait mapper statut → OrderAction, déplaçant la complexité vers un point de défaillance silencieux.
- **Effort** : instruction faite. **Verdict : GARDER**, motif inscrit dans le JSDoc de l'allowlist elle-même (celui qui voudra fusionner touchera forcément ce test). `Décision : ✅ GARDER — instruit le 2026-08-03`

### S3.9 — Divers courts

| #     | Quoi                                                                                                                                                                                          | Reco                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Décision             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| S3.9a | Deux implémentations fuzzy coexistent (`modules/products/data/fuzzy-search.ts`, ~11 Ko, et `shared/lib/fuzzy-search.ts`, ~5 Ko)                                                               | unifier — ou moot si S4.2 retient la suppression                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ 2026-08-03        |
| S3.9b | 4 sous-pages d'édition de commande (`[id]/adresse-facturation`, `adresse-livraison`, `client`, `notes`) + 6 pages admin par variante (`skus` : liste, détail, modifier, nouveau, prix, stock) | fusionner en dialogs / regrouper — opportuniste, pas prioritaire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ 2026-08-03        |
| S3.9c | `StoreSettings.orphanMediaScanOffset` (state de cron squatté dans le singleton de config)                                                                                                     | déplacer ou supprimer avec le cron correspondant (§ 8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | ✅ 2026-08-03        |
| S3.9d | Discounts : les 3 actions `extend-discount-validity` / `reset-discount-counter` / `restore-discount`                                                                                          | **Retirées le 2026-08-03** — aucun déclencheur UI (3 endpoints RPC publics sans surface) ; prolonger/corriger passe par `update-discount`, et « supprimer n'est pas réversible » est déjà la doctrine produit. ⚠️ `maxUsagePerUser` n'est PAS concerné : le Lot 0 l'a rebranché sur l'email de commande, il a retrouvé son sens                                                                                                                                                                                                                                                                               | ✅ fait 2026-08-03   |
| S3.9e | `modules/addresses` : autocomplétion à deux fournisseurs (BAN + Geoapify)                                                                                                                     | **INSTRUIT 2026-08-03 → GARDER LES DEUX.** Ce ne sont pas deux fournisseurs redondants mais deux COUVERTURES : `search-address.ts` route `country === "FR"` vers la BAN (gratuite, sans clé, plus précise sur le territoire) et tout le reste vers Geoapify. Retirer Geoapify = plus d'autocomplétion pour les 26 autres États UE que la boutique livre (cf. BUSINESS.md) ; retirer la BAN = payer Geoapify pour la France. Ne redeviendrait supprimable (avec `GEOAPIFY_API_KEY`, aujourd'hui requis au boot) que si le périmètre de livraison se limitait à la France — décision commerciale, pas technique | ✅ GARDER 2026-08-03 |
| S3.9f | 34 hooks partagés, 27 fichiers `animations/`, 7 stores Zustand                                                                                                                                | ne pas dégraisser à la main : **passe knip après chaque lot** — beaucoup deviendront morts mécaniquement quand leurs consommateurs partiront                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅ 2026-08-03        |

## 7. Rang 4 — Features visibles par les clientes (arbitrage produit)

> **⚠️ Mesures et statut au 2026-08-03 — à lire avant d'exécuter ce rang.**
>
> Les trois cibles sont **bloquées** par une session de travail concurrente (323 fichiers non commités) : quick-search **16 de ses 17 fichiers ouverts**, la bannière de file offline ouverte, et `wishlist-button.tsx` — le composant central de S4.1 — ouvert lui aussi. Supprimer ces fichiers détruirait du travail non sauvegardé, sans récupération.
>
> **Deux chiffres du doc étaient périmés** (même défaut de méthode que S3.1) : la wishlist fait **26 fichiers / 2 058 L** (annoncé 39) et le quick-search **17 fichiers / 2 398 L** (annoncé ~41).
>
> **Surtout — ces trois surfaces viennent d'être auditées ET remédiées** : `quick-search-dialog` (3ᵉ passe, 82/100, remédiée le 2026-08-03), `media-upload` (83/100, remédié le 2026-08-03), `wishlist` (72/100, remédiée le 2026-08-01). Ce rang propose donc de **supprimer ce qui vient d'être poli**. Ce n'est pas une objection technique mais un arbitrage produit : le faire reste légitime (l'audit ne crée pas de dette d'engagement), à condition que ce soit décidé en connaissance de cause et pas par inertie de la liste.
>
> **Ordre de sûreté si le rang est confirmé**, une fois la session voisine commitée : **S4.4** d'abord (offline-queue + ETA, 855 L sur 5 fichiers, admin-only, zéro impact cliente), puis S4.1, puis S4.2.

### S4.1 — Favoris / wishlist

- **Quoi** : 2 tables (`Wishlist`, `WishlistItem`), 39 fichiers, purge RGPD dédiée, contexte optimiste, swipe, badge — pour des favoris par **cookie de session** que la cliente perd déjà en changeant d'appareil.
- **Options** : (a) **localStorage pur** : la feature reste visible, ~5 fichiers, plus aucune table ni purge RGPD serveur ; (b) suppression totale ; (c) garder tel quel.
- **Impact cliente** : (a) = identique à aujourd'hui du point de vue cliente (les favoris étaient déjà volatils) ; (b) = perte visible.
- **Effort** : M. **Reco initiale : (a) localStorage** — ⛔ **NON RETENUE.** `Décision : ✅ GARDER LA WISHLIST TELLE QUELLE (Adrien, 2026-08-03)` — la surface vient d'être auditée et remédiée (72/100, 2026-08-01) ; on ne défait pas un investissement frais pour ~2 000 lignes.

### S4.2 — Quick-search (⌘K, fuzzy, synonymes, correction orthographique, recherches récentes)

- **Quoi** : ~41 fichiers pour un moteur de recherche à tolérance de fautes sur un catalogue artisanal qui tient sur quelques pages.
- **Options** : (a) input simple + `ILIKE`/trigram basique (~5 fichiers) ; (b) suppression (la nav par collections/types suffit) ; (c) garder.
- **Impact cliente** : recherche moins tolérante aux fautes ; sur un petit catalogue, l'effet réel est faible.
- **Effort** : M. **Reco initiale : (a) input + ILIKE** — ⛔ **NON RETENUE.** `Décision : ✅ GARDER LE QUICK-SEARCH (Adrien, 2026-08-03)` — 3ᵉ passe d'audit remédiée le 2026-08-03 (82/100) ; la feature est visible côté boutique et vient d'être polie.

### S4.3 — Support vidéo des galeries produit

- **Quoi** : `SkuMedia.mediaType` polymorphe, génération de thumbnails vidéo côté client, et toute la famille d'invariants « une vidéo ne doit jamais atteindre un champ image » (`pickPrimaryImage`, filtres de selects, test `catalogue-selects-media-filter`).
- **Pourquoi envisager le retrait** : le support vidéo impose une classe entière de garde-fous ; s'il y a **0 vidéo en base**, c'est du coût pur.
- **Préalable** : compter les `SkuMedia` VIDEO en prod. Si Léane en publie, garder.
- **Effort** : M. **Reco : conditionnel à l'usage réel.** `Décision : ✅ GARDER (Adrien, 2026-08-03) — les vidéos restent disponibles dans l'app ; item retiré du Lot 5`

### S4.4 — Upload admin : file hors-ligne + ETA

- **Quoi** : `use-offline-upload-queue`, bannière de file hors-ligne, estimation du temps restant (~10 fichiers) — conçus pour un upload en masse depuis un mobile en 3G.
- **Impact** : Léane uniquement (admin). **Garder** en revanche le réencodage HEIC (photos iPhone = besoin réel) et les thumbhash si le coût de retrait dépasse le gain.
- **Effort** : S-M. **Reco : retirer file hors-ligne + ETA.** `Décision : ✅ FAIT le 2026-08-03` — file IndexedDB (plafond 50 Mo, rejeu auto) et estimation temps/débit retirées ; sur échec réseau l'erreur est rendue telle quelle, l'admin relance depuis la bannière d'erreur existante. ⚠️ `format-eta.ts` **n'a pas été supprimé en bloc** : il mêlait l'ETA et `formatBytesShort` (9 call sites vivants) — ce dernier est extrait dans `modules/media/utils/format-bytes.ts`. Ancien statut : ⏸ exécution en attente : les 5 fichiers pèsent 855 L, mais leurs **consommateurs** (`use-media-upload.ts`, `pending-uploads-grid.tsx`, `upload-progress.tsx`, `offline-queue-banner.tsx`) sont tous ouverts par la session concurrente — ce sont précisément les fichiers de son audit media-upload remédié le 2026-08-03. À exécuter dès son commit.

## 8. Crons : de 9 jobs à un noyau minimal + page « Maintenance » ⭐ cap n°2

Proposition : **3 crons automatiques conservés** (légal/RGPD, où un oubli humain coûte cher), tout le reste devient des **boutons** sur une nouvelle page `admin/configuration/maintenance` qui appelle les services existants.

| Cron actuel                | Rôle                                                               | Proposition                      | Justification                                                                         |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------- |
| `reconcile-invoices`       | DLQ factures/avoirs (Art. 286/289-I) + intégrité PDF               | **garder automatique**           | Obligation légale ; seul cron monitoré Sentry — cohérent avec le plan à 1 monitor     |
| `hard-delete-retention`    | Purge PII à `paidAt + 10 ans` (RGPD 5.1.e)                         | **garder automatique** (mensuel) | Personne ne se souviendra d'un bouton à horizon 10 ans                                |
| `cleanup-pending-orders`   | Purge PENDING + paniers + wishlists (RGPD) + purge sessions (S3.7) | **garder automatique**           | Garde RGPD quotidienne ; devient l'unique job « hygiène »                             |
| `retry-webhooks`           | Rejoue les webhooks FAILED                                         | **bouton**                       | Stripe retente déjà lui-même pendant 3 jours ; le bouton couvre le reliquat           |
| `reconcile-refunds`        | Finalise les refunds pending + emails                              | **bouton**                       | Le nominal passe par le webhook (S3.3) ; le bouton rattrape                           |
| `sync-async-payments`      | Filet paiements asynchrones                                        | **bouton, voire retrait**        | Checkout card-only : quasi jamais utile — vérifier en base qu'aucun PI async n'existe |
| `retry-post-webhook-tasks` | Rejoue la file PostWebhookTask                                     | **disparaît avec S3.4**          | —                                                                                     |
| `reopen-store`             | Efface les `reopensAt` échus                                       | **supprimer**                    | Déjà sans effet visible : la lecture traite un `reopensAt` échu comme ouvert          |
| `cleanup-orphan-media`     | Purge médias UploadThing orphelins                                 | **bouton**                       | Hygiène pure, aucun enjeu légal ; libère `orphanMediaScanOffset` (S3.9c)              |

**Points techniques à respecter au passage en boutons** :

- Un bouton = une Server Action → l'invalidation de cache passe de `revalidateTag(..., { expire: 0 })` à `updateTag` (matrice contexte→API de CLAUDE.md). Les services concernés retournent déjà leurs tags (pattern `finalize-refund`) — c'est l'appelant qui invalide, donc le changement est localisé.
- Garde `assertAdminPage()` + `requireAdmin()` + rate limit (preset admin), comme toute page/action admin.
- Les tests `cron-schedules-match-vercel`, `cron-hobby-plan-daily-limit` et `cron-wakeup-budget` se mettent à jour en même temps que `vercel.json` et `schedules.ts` — moins de crons = budget de réveils Neon encore plus confortable.

**Gain** : 9 → 3 crons, ~4 fenêtres de réveil → 2, plusieurs services cron et leurs routes supprimés ou déplacés derrière la page Maintenance. **Effort** : M. **Reco : faire.** `Décision : ✅ reco validée (2026-08-03)`

## 9. Rang 5 — Décisions re-confirmées : on ne touche pas

| Sujet                                                                                                          | Pourquoi ça reste                                                                            |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Session` / `Account` / `Verification`                                                                         | Structure imposée par Better Auth (hash mdp, tokens reset)                                   |
| `WebhookEvent`                                                                                                 | Idempotence Stripe = protection revenue critique                                             |
| `StockMovement` write-only                                                                                     | Ledger d'inventaire assumé et testé — 1 table, coût quasi nul, valeur d'audit réelle         |
| `Order.paymentFailureCode` / `paymentFailureMessage` write-only                                                | Diagnostic d'échec de paiement, assumé et documenté dans le schéma — 2 colonnes              |
| KI-005 (double SSOT `creditNote*` Order/Refund)                                                                | Déjà arbitré dans KNOWN-ISSUES.md avec conditions de réouverture                             |
| Invariants facturation 1-10 (CLAUDE.md)                                                                        | Art. 286 / 289-I / 272-I CGI, L102 B LPF, L123-22 — **ils priment sur toute simplification** |
| `OrderHistory` immuable, snapshots `OrderItem`/adresses, numérotation gap-free, PDF immuable, purge PII 10 ans | Socle légal du modèle micro-entreprise                                                       |
| `0_init`                                                                                                       | Ne jamais l'éditer (checksum) ; toute évolution = nouvelle migration + `down.sql`            |

## 10. Tests — chapitre prudent

Règle : **un test ne se retire jamais seul, il part avec le code qu'il garde.**

- **À retirer maintenant** : la garde orpheline S1.6 (scanne un modèle supprimé).
- **Partent mécaniquement avec les features** : ~16 k LOC de tests taxonomies (S3.1), ~10 k refunds (S3.3), ~3 k quick-search (S4.2), ~3 k wishlist (S4.1), régressions PostWebhookTask (S3.4), tests crons retirés (§ 8) — et leurs **specs e2e** (69 au total aujourd'hui, CI sharded ×4 ≈ 15 min : chaque feature retirée raccourcit aussi la CI et les minutes GitHub Actions).
- **On ne touche pas** : gardes légales/revenus/sécurité (no-manual-invoice, gap-free, purge PII, `cache-invalidation-context`, `admin-page-auth-guard`, `server-actions-rate-limited`, parité schéma/migrations, selects catalogue…).
- **Gardes de ton/design** (tutoiement, tokens, px-media-query) : coût de maintenance quasi nul, elles ne rougissent que sur régression réelle → **garder**, pas un gisement.
- Vigilance héritée des audits : plusieurs garde-fous fonctionnent sur des **listes figées de chemins** — chaque déplacement de fichier des lots ci-dessus impose de re-justifier ces listes (re-grep, pas copier-coller).

## 11. Dépendances

| Dépendance                                         | Condition de retrait                                            | Reco                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@types/color`, `@better-auth/cli`                 | Aucune (mortes)                                                 | retirer (S1.7)                                                                      |
| `jspdf` (+ profil ICC embarqué)                    | Refonte du rendu PDF facture                                    | **garder** — le rendu déterministe sert l'immutabilité (hash)                       |
| `heic-to`                                          | Retrait du réencodage HEIC                                      | **garder** (photos iPhone)                                                          |
| `thumbhash`, `yet-another-react-lightbox`          | Simplification galerie (doublon partiel avec la galerie maison) | à instruire avec S4.3                                                               |
| `@dnd-kit/*` (×3)                                  | Réordonnancement par boutons ↑/↓                                | opportuniste                                                                        |
| `motion`                                           | Réduction du design-system d'animations (27 fichiers)           | non prioritaire                                                                     |
| `pino` + `pino-pretty`                             | `console` + Sentry suffisent                                    | opportuniste                                                                        |
| `zustand`                                          | Stores = overlays UI uniquement                                 | non prioritaire                                                                     |
| `react-phone-number-input` + `libphonenumber-js`   | —                                                               | **garder** : `phoneSchema` normalise en E.164 avant de borner (contrat Zod↔VarChar) |
| `@sentry/nextjs`                                   | —                                                               | **garder** : c'est l'alerte qui rend les boutons manuels (§ 8) viables              |
| Outillage dev : `size-limit` (+`@size-limit/file`) | Cassé avec Turbopack (mémoire projet)                           | retirer ou réparer — ne pas laisser un gate mort                                    |
| `commitlint` ×3, `react-doctor`, lighthouse CI     | Confort solo                                                    | à l'appréciation d'Adrien — pas un enjeu                                            |

## 12. Synthèse d'impact si tout est accepté (estimations arrondies)

| Métrique             | Avant | Après (réel au 2026-08-03, post-Lot 6)                                                                                                                                                                                |
| -------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modèles Prisma       | 30    | **27** (−PostWebhookTask au Lot 2 ; −Wishlist ×2 par la session concurrente, migration `20260803210000` — la surface favoris reste visible côté boutique). Audit Lot 6 : plus AUCUN modèle entier candidat au retrait |
| Enums                | 20    | **19** (−PostWebhookTaskStatus) + 12 valeurs purgées (PDP_* ×6, PENDING_DELETION au Lot 0 ; EXPIRED, REJECTED, WRONG_ITEM, LOST_IN_TRANSIT, SYSTEM au Lot 6)                                                          |
| Colonnes/index morts | —     | Lot 0 : −1 colonne User, −2 OrderNote/DiscountUsage, −6 index. Lot 6 : −`Refund.deletedAt`, −`RefundItem.restock`, −FK `Refund.createdBy`→User                                                                        |
| Crons                | 9     | **3** (+ 1 page Maintenance à boutons)                                                                                                                                                                                |
| Presets rate-limit   | ~80   | **~6** (−1 100 lignes)                                                                                                                                                                                                |
| Pages admin          | 51    | **~35** (taxonomies fusionnées, refunds en consultation, sous-pages regroupées)                                                                                                                                       |
| Fichiers source      | —     | de l'ordre de **−400** (taxonomies −200, refunds −55, dashboard −40, quick-search −35, wishlist −35, PostWebhookTask −15, upload −10…)                                                                                |
| LOC                  | —     | de l'ordre de **−19 k src / −25 k tests** + réduction e2e/CI                                                                                                                                                          |
| Dépendances          | —     | −2 immédiates, jusqu'à ~8 selon arbitrages                                                                                                                                                                            |

Ces chiffres reprennent les estimations item par item ; ils se raffineront lot par lot. Ce qui ne bouge pas : le socle légal (§ 9) et le tunnel d'achat.

## 13. Ordre d'exécution suggéré (après arbitrage)

| Lot                                            | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Préalable |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Lot 0 — ✅ fait (2026-08-03)**               | Rang 1 complet (S1.1-S1.9) + S3.7 (purge sessions) + enums sûrs du Rang 2 (S2.1, S2.5) — migration `20260803120000_lot0_drop_customer_account_residues` + `down.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | aucun     |
| **Lot 1 — ✅ fait (2026-08-03)**               | § 8 crons → noyau (reconcile-invoices, cleanup-pending-orders, hard-delete-retention) + page Maintenance (5 boutons, action `run-maintenance-task`) ; `reopen-store` supprimé                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —         |
| **Lot 2 — ✅ fait (2026-08-03)**               | S3.3 remboursements Stripe-first (workflow in-app supprimé, webhook = chemin nominal, badge « à rattraper », lien Stripe sur la page commande ; restock partiel = manuel via l'édition de stock SKU) + S3.4 PostWebhookTask (exécution directe, migration `20260803150000`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —         |
| **Lot 3 — ✅ SANS OBJET (constat 2026-08-03)** | S3.1 fusion taxonomies : **déjà réalisée** — `modules/taxonomies` porte 1 267 L de générique, 17 wrappers de ≤15 L délèguent déjà, le reste est de la spécificité métier. Reliquat = 6 formulaires create/edit (~1 225 L), ouverts par une session concurrente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —         |
| **Lot 4 — ✅ fait (2026-08-03)**               | S3.2 rate-limits : ~55 presets admin → `ADMIN_LIMIT` partagé (120/min) + 4 dédiés (export, maintenance, search, invoice-download) ; publics/auth/checkout/webhook conservés granulaires (leçons KI-004) ; presets morts purgés (PDP_WEBHOOK, USER_REFRESH, refunds workflow). **S3.5 dashboard ✅ fait (2026-08-03)** : mois en cours fixe, plus de sélecteur de période/sheets mobiles, sparklines, évolutions %, ni délai moyen d'expédition — restent CA net, commandes, panier moyen, à expédier, finalisation, nouveaux clients, TVA, URSSAF, alertes, commandes récentes                                                                                                                                                                                                                                                                                                                                                                                                                                   | —         |
| **Lot 5 — ✅ fait (2026-08-03)**               | **Arbitrage Adrien** : wishlist, quick-search et vidéo **GARDÉS** (surfaces auditées + remédiées les 01 et 03/08). **S4.4 exécuté** : file d'upload hors-ligne + ETA retirées (−1 866 lignes), `formatBytesShort` extrait dans `format-bytes.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —         |
| **Lot 6 — ✅ fait (2026-08-03)**               | **Audit schéma v1.1** (« reste-t-il des modèles à supprimer ? » → **non**, vérifié writers+lecteurs modèle par modèle) + résidus du Lot 2 : drop `Refund.deletedAt` (0 writer depuis Lot 2), `RefundItem.restock` (+ bloc restock inatteignable de `finalize-refund`, restock post-refund = manuel), FK `Refund.createdBy`→User (relation 0 lecteur, colonne String gardée) ; enums purgés `RefundStatus.REJECTED`, `RefundReason.WRONG_ITEM`/`LOST_IN_TRANSIT`, `PaymentStatus.EXPIRED` (+ 6 lecteurs de recovery simplifiés), `StockMovementSource.SYSTEM` — comptages tous à 0 (arbitrage Adrien : « pas de données réelles en prod ») ; 7 sujets `EMAIL_SUBJECTS` morts purgés ; bloc schéma orphelin PostWebhookTask retiré ; **S2.2 et S2.4 inversés → GARDER** (émetteurs vivants, cf. § 5) ; faux positif consigné : `Cart.discountAmountCache` est VIVANT (lu par `cart-sheet.tsx`, l'affichage du montant remis au panier). Migration `20260803180000_lot6_refund_residues_and_enum_debt` + `down.sql` | —         |

Chaque lot = une PR, gates verts (`typecheck`, `lint`, `test`, e2e smoke), migrations toujours accompagnées de leur `down.sql`, jamais d'édition de `0_init`.

---

_Doc à mettre à jour au fil des arbitrages : cocher les décisions, dater, et reporter les choix actés dans BUSINESS.md § « Choix de périmètre assumés »._
