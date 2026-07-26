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

## Coût de possession (TCO) — à chiffrer réellement

Services externes utilisés (à compléter avec les factures réelles) :

| Service                               | Rôle                     | Plan visé (volume actuel)                                                                                                                             |
| ------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel                                | Hosting + crons          | Hobby/Pro — surveiller l'usage crons                                                                                                                  |
| Neon                                  | PostgreSQL               | Free/Launch suffit à ce volume                                                                                                                        |
| Stripe                                | Paiements                | 1,5 % + 0,25 € (CB EU) — variable                                                                                                                     |
| Resend                                | E-mails transactionnels  | Free (3k mails/mois) suffit                                                                                                                           |
| UploadThing                           | Médias produits/factures | Pay-as-you-go (volume images)                                                                                                                         |
| **Sentry**                            | Suivi erreurs            | **Free tier (5k erreurs/mois)** — suffit largement. **Conservé** (audit) : seule visibilité sur les échecs paiement/webhook pour une opératrice solo. |
| ~~Vercel Analytics + Speed Insights~~ | Métriques web            | **Retiré** (audit) — le dashboard Vercel suffit.                                                                                                      |

**Objectif** : coût récurrent < 1 % du CA. À recalculer chaque trimestre (CA = commandes × panier moyen).

## Choix de périmètre assumés (≠ manques)

- **Langue : français uniquement.** Pas de framework i18n. Le site, les communications et les contrats (CGV) sont en français — cible « France + UE francophone ». Réévaluer (`next-intl`) seulement si un volume UE non-francophone réel apparaît. (Décision audit §4.9 / G4.)
- **Devise : EUR uniquement.** Correct pour un vendeur FR/UE ; les acheteurs hors zone euro paient en EUR (conversion par leur banque). Pas de sélecteur multi-devise.
- **e-reporting DGFiP : en standby.** Machinerie construite mais `INVOICE_ENABLE_EREPORTING=false`, aucune Plateforme Agréée branchée. Go-live planifié **T1 2027** (obligation 1ᵉʳ sept. 2027). Voir RUNBOOK.
- **Pas de relance panier abandonné / cross-sell / rappel d'avis / click&collect.** Scaffolding retiré (audit §4.4). À reconstruire proprement (avec consentement RGPD) si un besoin marketing émerge.

## Dépendance plateforme (lock-in)

L'app repose sur Vercel (SSR/ISR + crons) + Neon. Migration hors Vercel = chantier non trivial. Acceptable au lancement ; réévaluer si la facture Vercel/Neon dérive ou si une alternative clé-en-main (Shopify, etc.) devient plus rentable au volume.
