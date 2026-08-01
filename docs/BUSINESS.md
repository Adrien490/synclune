# BUSINESS.md — Modèle, coûts & périmètre

> Doc créée suite à l'audit de right-sizing (2026-06). Objectif : rendre explicites le besoin réel, le coût de possession et les choix de périmètre, pour piloter une activité **solo** sans sur-ingénierie. À relire/mettre à jour chaque trimestre.

## Profil de l'activité

- **Statut** : entrepreneur individuel, **micro-entreprise en franchise de TVA** (art. 293 B CGI / futur art. L.223-3 CIBS).
- **Activité** : vente de bijoux artisanaux (vente de **biens**), B2C exclusivement.
- **Volume cible** : ~**20 commandes/mois** (~240/an).
- **Clientèle** : France + Union Européenne (livraison 27 États UE + Monaco).
- **Opération** : **1 personne** (la créatrice), pas d'équipe technique.

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

Le plan Hobby est **structurellement impossible** : (1) son ToS interdit l'usage commercial ; (2) il plafonne à **2 crons en déclenchement quotidien** alors que le projet en a 11, dont trois en demi-horaire. Le test `app/api/cron/__tests__/max-duration.test.ts` verrouille d'ailleurs déjà `maxDuration ≥ 60`, « the Pro plan ceiling we rely on ».

### Objectif de coût

**~5 % du CA** à 20 commandes/mois (~1 000 € de CA). L'ancienne cible « < 1 % » était **inatteignable** : Vercel Pro seul pèse 2 % à ce volume. Le ratio s'améliore mécaniquement avec le CA (à 100 commandes/mois il retombe sous 1 %). S'il reste durablement > 5 % **et** que le volume stagne, c'est le signal pour réévaluer une plateforme clé-en-main plutôt que pour raboter l'infra.

### Garde-fous — à vérifier au dashboard

Le dépôt ne peut pas configurer ces protections ; elles vivent dans les consoles fournisseurs.

- [ ] **Vercel → Spend Management** : plafond de dépense avec **pause automatique du projet**. C'est le SEUL vrai coupe-circuit contre une facture surprise — sans lui, le pire cas d'une journée d'abus se chiffre en centaines/milliers d'euros. **Priorité absolue.**
- [ ] **Neon → alerte d'usage** sur les compute-hours (l'épuisement coupe la base, donc la boutique).
- [ ] **Sentry → Crons** : vérifier combien de monitors le plan autorise réellement. Le code n'en déclare plus que 5 (`SENTRY_MONITORED_CRONS`) au lieu de 11 ; si le plan n'en inclut qu'un, arbitrer entre payer ~0,78 $/monitor et se limiter à `reconcile-invoices`.
- [ ] **GitHub → quota Actions** : alerte à 75 % des minutes incluses.

## Choix de périmètre assumés (≠ manques)

- **Langue : français uniquement.** Pas de framework i18n. Le site, les communications et les contrats (CGV) sont en français — cible « France + UE francophone ». Réévaluer (`next-intl`) seulement si un volume UE non-francophone réel apparaît. (Décision audit §4.9 / G4.)
- **Devise : EUR uniquement.** Correct pour un vendeur FR/UE ; les acheteurs hors zone euro paient en EUR (conversion par leur banque). Pas de sélecteur multi-devise.
- **e-reporting DGFiP : retiré du code (2026-07-26).** La machinerie était en dry-run intégral (flag jamais activé, aucune Plateforme Agréée branchée) et écrite contre une spec non figée : ~7 200 lignes maintenues 18 mois pour une réécriture certaine au go-live. À reconstruire en **T1 2027** contre l'arrêté définitif (obligation 1ᵉʳ sept. 2027). Voir RUNBOOK.
- **Pas d'avis produits.** Le système entier (4 tables, dépôt client, modération admin, notes en JSON-LD, filtre et tri par note) a été retiré le 2026-07-30 : la surface client de dépôt n'avait jamais été montée, donc le levier de conversion ne s'est jamais matérialisé. Migration `20260730120000_drop_reviews_system` (`down.sql` recrée la structure, pas les données).
- **Pas de relance panier abandonné / cross-sell / click&collect.** Scaffolding retiré (audit §4.4). À reconstruire proprement (avec consentement RGPD) si un besoin marketing émerge.

## Dépendance plateforme (lock-in)

L'app repose sur Vercel (SSR/ISR + crons) + Neon. Migration hors Vercel = chantier non trivial. Acceptable au lancement ; réévaluer si la facture Vercel/Neon dérive ou si une alternative clé-en-main (Shopify, etc.) devient plus rentable au volume.

## Postes qui grossissent tout seuls — invariants de coût

Ces bornes sont verrouillées par des tests de régression. Les desserrer, c'est accepter une hausse de facture : le justifier explicitement.

| Poste                           | Borne                                                                                     | Verrouillé par                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Transformations d'images Vercel | Hôtes épinglés sur les app-ids Synclune ; 2 paliers de qualité                            | `image-remote-patterns.regression.test.ts`, `image-config.constants.test.ts`                 |
| Compute Neon                    | Aucun cron sous 30 min ; réveils alignés (≤ 2/heure)                                      | `cron-wakeup-budget.regression.test.ts`                                                      |
| Quota e-mail Resend             | 0 envoi marketing (émetteurs supprimés 2026-07-30) ; 100/jour entièrement transactionnels | — (tout futur émetteur marketing devra re-créer le budget partagé, cf. `CLAUDE.md` § Emails) |
| Stockage UploadThing            | 224 Mo max par upload (< 1/8 du quota gratuit)                                            | `upload-size-limits.regression.test.ts`                                                      |

Deux d'entre eux sont des risques de **coupure de service**, pas seulement de facture : l'épuisement du compute Neon suspend la base (site KO), et l'épuisement du quota Resend journalier fait perdre les e-mails de confirmation de commande.
