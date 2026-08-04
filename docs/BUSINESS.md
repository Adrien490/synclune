# BUSINESS.md — Modèle, coûts & périmètre

> Doc créée suite à l'audit de right-sizing (2026-06). Objectif : rendre explicites le besoin réel, le coût de possession et les choix de périmètre, pour piloter une activité **solo** sans sur-ingénierie. À relire/mettre à jour chaque trimestre.

## Profil de l'activité

- **Statut** : entrepreneur individuel, **petite micro-entreprise en franchise de TVA** (art. 293 B CGI / futur art. L.223-3 CIBS).
- **Produit** : **bijoux créatifs et colorés, faits main**, vendus à l'unité (vente de **biens**), B2C exclusivement.
- **Volume cible** : ~**20 commandes/mois** (~240/an).
- **Clientèle** : **France + Union Européenne** (livraison 27 États UE + Monaco), en français et en euros.
- **Opération** : **1 personne** (Léane, la créatrice), pas d'équipe technique.

### ⚠️ Positionnement : bijoux colorés, PAS joaillerie précieuse

C'est la donnée de marque la plus souvent mal comprise, et elle a déjà produit des propositions à
jeter. La marque exprime la **créativité colorée** de la créatrice — joyeux, personnel, artisanal.
Elle ne vend ni or, ni pierres précieuses, ni « luxe discret ».

Toute direction artistique bâtie sur le métal précieux, la gravure, le sérif de haute joaillerie ou
le minimalisme froid est le **contre-pied exact** du brief. « Bijoux » ≠ « joaillerie ». La SSOT
est `shared/constants/brand.ts` + `BUSINESS_INFO` (`shared/constants/seo-config.ts`), dont la
description dit déjà : « Bijoux artisanaux **colorés et originaux** pour le quotidien et les
occasions spéciales. »

Conséquence pratique pour les prompts de design : viser le **soin artisanal et la joie**, pas le
prestige. Un ton « maison de joaillerie premium » désaligne la copie, la palette et la typo d'un
coup.

## Seuils fiscaux à surveiller (SSOT : `shared/constants/vat-franchise.ts`)

| Seuil                                   | Montant                                          | Conséquence si dépassé                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Franchise TVA — ventes de biens         | **85 000 €/an** (majoré 93 500 €)                | Sortie de franchise → facturation avec TVA, régime réel.                                                                                                                                      |
| Franchise TVA — prestations de services | 37 500 €/an (majoré 41 250 €)                    | Ne s'applique QUE si une part de l'activité bascule en service (ex. `/personnalisation` sur-mesure → arbitrage comptable).                                                                    |
| **Ventes à distance intra-UE (OSS)**    | **10 000 €/an** (cumul tous pays UE hors France) | Au-delà : TVA du **pays de destination** due via le guichet **OSS**. ⚠️ **Non géré par l'app** (voir RUNBOOK § OSS). En-dessous : règle française (franchise = 0 TVA) → conforme aujourd'hui. |

> À ~7-20k€ de CA total, les ventes intra-UE sont quasi certainement **< 10 000 €** : l'application est **conforme** en facturant 0 TVA. Le risque est latent, pas actuel. **Le suivi se fait au niveau comptable** (pas dans le code) tant que l'app n'intègre pas de calcul TVA-destination.

## Coût de possession (TCO)

> Chiffré par l'audit « Coûts, quotas & limites fournisseurs » (2026-07-26). À confronter aux factures réelles chaque trimestre.

| Service                               | Rôle                     | Plan                                     | €/mois     | Limite qui mord / au dépassement                                                              |
| ------------------------------------- | ------------------------ | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| **Vercel**                            | Hosting + crons          | **Pro — obligatoire**                    | **20**     | Transformations d'images, bande passante → **facturation à l'usage, sans plafond par défaut** |
| Neon                                  | PostgreSQL               | Free (0,25 CU, ~191,9 CU-h/mois, 0,5 Go) | 0          | Compute-hours → **compute SUSPENDU jusqu'au mois suivant = site KO**                          |
| Stripe                                | Paiements                | Standard                                 | ~20 (var.) | Aucune — 1,5 % + 0,25 € (CB EEE), purement variable                                           |
| Resend                                | E-mails                  | Free                                     | 0          | **3 000/mois ET 100/jour** → rejet 429 (pas de facturation)                                   |
| UploadThing                           | Médias produits/factures | Free (2 Go)                              | 0          | Stockage → pay-as-you-go                                                                      |
| **Sentry**                            | Suivi erreurs            | Developer/Free                           | 0          | 5k erreurs, 50 replays, **1 cron monitor** → événements droppés (pas de facturation)          |
| GitHub Actions                        | CI                       | Free (2 000 min/mois)                    | 0–12       | Minutes → 0,008 $/min                                                                         |
| ~~Vercel Analytics + Speed Insights~~ | Métriques web            | **Retiré**                               | 0          | Le dashboard Vercel suffit.                                                                   |

**Total ≈ 40–52 €/mois**, dont **20 € de fixe** (Vercel Pro) et ~20 € de variable (Stripe).

### Pourquoi Vercel Pro n'est pas un choix

_(Réconcilié 2026-08-03 — l'ancienne version parlait de « 11 crons dont trois en demi-horaire », état antérieur au right-sizing.)_

Le dépôt est aujourd'hui **compatible avec la contrainte de rythme Hobby** : les **3 crons** restants (Lot 1 de [`SIMPLIFICATION.md`](SIMPLIFICATION.md) exécuté le 2026-08-03 — le reste est devenu des boutons sur `/admin/configuration/maintenance`) sont tous quotidiens ou moins fréquents, verrouillé par `cron-hobby-plan-daily-limit.regression.test.ts` (une expression infra-journalière fait refuser le déploiement entier — cf. CLAUDE.md § Cron Jobs). Deux points continuent néanmoins de plaider pour Pro : (1) le ToS Hobby interdit l'usage commercial ; (2) le plafond Hobby en **nombre** de crons (2 d'après la doc Vercel) reste sous les 3 jobs actuels. Le test `app/api/cron/__tests__/max-duration.test.ts` verrouille par ailleurs `maxDuration ≥ 60`. **À vérifier au dashboard : le plan effectivement actif.**

### Objectif de coût

**~5 % du CA** à 20 commandes/mois (~1 000 € de CA). L'ancienne cible « < 1 % » était **inatteignable** : Vercel Pro seul pèse 2 % à ce volume. Le ratio s'améliore mécaniquement avec le CA (à 100 commandes/mois il retombe sous 1 %). S'il reste durablement > 5 % **et** que le volume stagne, c'est le signal pour réévaluer une plateforme clé-en-main plutôt que pour raboter l'infra.

### Garde-fous — à vérifier au dashboard

Le dépôt ne peut pas configurer ces protections ; elles vivent dans les consoles fournisseurs.

- [ ] **Vercel → Spend Management** : plafond de dépense avec **pause automatique du projet**. C'est le SEUL vrai coupe-circuit contre une facture surprise — sans lui, le pire cas d'une journée d'abus se chiffre en centaines/milliers d'euros. **Priorité absolue.**
- [ ] **Neon → alerte d'usage** sur les compute-hours (l'épuisement coupe la base, donc la boutique).
- [x] **Sentry → Crons** : arbitré au Lot 1 (2026-08-03). Le code ne déclare plus qu'**un seul** monitor (`SENTRY_MONITORED_CRONS` = `reconcile-invoices`), exactement ce que le plan Developer inclut — plus aucun check-in n'est rejeté. Les deux autres jobs gardent la capture d'exception + l'alerte admin, mais pas la détection de run manqué. Ne rouvrir que si le plan change.
- [ ] **GitHub → quota Actions** : alerte à 75 % des minutes incluses.

## Choix de périmètre assumés (≠ manques)

- **Langue : français uniquement.** Pas de framework i18n. Le site, les communications et les contrats (CGV) sont en français — cible « France + UE francophone ». Réévaluer (`next-intl`) seulement si un volume UE non-francophone réel apparaît. (Décision audit §4.9 / G4.)
- **Devise : EUR uniquement.** Correct pour un vendeur FR/UE ; les acheteurs hors zone euro paient en EUR (conversion par leur banque). Pas de sélecteur multi-devise.
- **e-reporting DGFiP : retiré du code (2026-07-26).** La machinerie était en dry-run intégral (flag jamais activé, aucune Plateforme Agréée branchée) et écrite contre une spec non figée : ~7 200 lignes maintenues 18 mois pour une réécriture certaine au go-live. À reconstruire en **T1 2027** contre l'arrêté définitif (obligation 1ᵉʳ sept. 2027). Voir RUNBOOK.
- **Pas d'avis produits.** Le système entier (4 tables, dépôt client, modération admin, notes en JSON-LD, filtre et tri par note) a été retiré le 2026-07-30 : la surface client de dépôt n'avait jamais été montée, donc le levier de conversion ne s'est jamais matérialisé. Migration `20260730120000_drop_reviews_system` (`down.sql` recrée la structure, pas les données).
- **Pas de relance panier abandonné / cross-sell / click&collect.** Scaffolding retiré (audit §4.4). À reconstruire proprement (avec consentement RGPD) si un besoin marketing émerge.

## § Conditions de réouverture — adresse de facturation et identité vendeur

_Déporté de `CLAUDE.md` (invariants 5 et 10), qui garde l'énoncé de la règle. Ici : le motif du
retrait et ce qui déclencherait la réouverture. Ce sont des **échéances**, pas des idées._

### Adresse de facturation (invariant 5)

Les 9 colonnes `Order.billing*` ont été retirées le 2026-08-04. Motif : leur seul writer était une
action admin verrouillée dès `invoiceNumber != NULL`, or la facture est émise **dans les secondes**
qui suivent le paiement (webhook → `ensureInvoiceNumberPersisted`). Sur une commande réelle, elles
restaient donc NULL à jamais — des colonnes que rien ne remplissait, pas une fonctionnalité.

L'art. 242 nonies A ann. II CGI demande l'adresse du **client** (1°) **et** celle de livraison si
elle diffère (7° bis). Tant que l'acheteuse se fait livrer chez elle, les deux coïncident et une
seule adresse suffit.

**Deux déclencheurs de réouverture** :

1. le jour où les commandes **cadeau** cessent d'être marginales ;
2. au plus tard pour l'**émission structurée du 1ᵉʳ septembre 2027**, où l'adresse de livraison est
   un bloc séparé (BT-75→79) que la Plateforme Agréée ne peut pas dériver.

⚠️ La réouverture consiste à **capter l'adresse de l'acheteuse au checkout** — surtout pas à
ré-ajouter des colonnes que rien ne remplit.

### Identité vendeur (invariant 10)

Les 12 colonnes `Order.vendor*` sont parties le 2026-08-05. Leur écrivain était
`persistInvoiceNumber` ; leur seul lecteur en base, la Passe 0 de `reconcile-invoices`
(`backfillInvoiceDataSnapshot`), qui reconstruisait le snapshot des factures **antérieures** à son
introduction — cas devenu impossible, puisque numéro et `invoiceDataSnapshot` sont posés par le
**même** `UPDATE`. Les deux autres chemins vers `buildSellerInfo` (route facture, avoir de commande)
chargeaient en `GET_ORDER_SELECT_CUSTOMER`, qui ne portait pas ces colonnes : ils retombaient déjà
silencieusement sur l'env.

⚠️ Le verdict « garder » rendu par un audit antérieur tenait sur une prémisse fausse (il supposait
le snapshot écrit dans une transaction distincte). **La condition de réouverture est exactement
celle-là** : si `invoiceDataSnapshot` cessait d'être écrit dans la même transaction que
`invoiceNumber`, un snapshot vendeur redeviendrait nécessaire.

## Dépendance plateforme (lock-in)

L'app repose sur Vercel (SSR/ISR + crons) + Neon. Migration hors Vercel = chantier non trivial. Acceptable au lancement ; réévaluer si la facture Vercel/Neon dérive ou si une alternative clé-en-main (Shopify, etc.) devient plus rentable au volume.

## Postes qui grossissent tout seuls — invariants de coût

Ces bornes sont verrouillées par des tests de régression. Les desserrer, c'est accepter une hausse de facture : le justifier explicitement.

| Poste                           | Borne                                                                                     | Verrouillé par                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Transformations d'images Vercel | Hôtes épinglés sur les app-ids Synclune ; 2 paliers de qualité                            | `image-remote-patterns.regression.test.ts`, `image-config.constants.test.ts`                 |
| Compute Neon                    | Aucune cadence infra-journalière (plafond Hobby) ; réveils groupés — ~2/jour aujourd'hui  | `cron-wakeup-budget.regression.test.ts`, `cron-hobby-plan-daily-limit.regression.test.ts`    |
| Quota e-mail Resend             | 0 envoi marketing (émetteurs supprimés 2026-07-30) ; 100/jour entièrement transactionnels | — (tout futur émetteur marketing devra re-créer le budget partagé, cf. `CLAUDE.md` § Emails) |
| Stockage UploadThing            | 224 Mo max par upload (< 1/8 du quota gratuit)                                            | `upload-size-limits.regression.test.ts`                                                      |

Deux d'entre eux sont des risques de **coupure de service**, pas seulement de facture : l'épuisement du compute Neon suspend la base (site KO), et l'épuisement du quota Resend journalier fait perdre les e-mails de confirmation de commande.
