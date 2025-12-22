Analyse des Priorités - Audit UX/UI 2025

  Priorités Haute (Quick Wins - Impact maximal, effort minimal)

  | #   | Fonctionnalité          | Impact                 | Effort | Fichier                                                 |
  |-----|-------------------------|------------------------|--------|---------------------------------------------------------|
  | 1   | Apple Pay / Google Pay  | x2-3 conversion mobile | Faible | modules/payments/actions/create-checkout-session.ts:555 |
  | 2   | Date livraison estimée  | Confiance client       | Faible | modules/payments/components/checkout-summary.tsx        |

  Priorités Moyenne (ROI élevé, effort modéré)

  | #   | Fonctionnalité                        | Impact                    | Effort |
  |-----|---------------------------------------|---------------------------|--------|
  | 5   | Auto-complétion recherche avec images | +43% conversion recherche | Moyen  |
  | 6   | Recherche fuzzy/tolérance fautes https://neon.com/docs/extensions/pg_trgm       | Découvrabilité            | Moyen  |
  | 7   | Emails panier abandonné               | Récupération ventes       | Moyen  |

  Priorités Basse (Impact majeur, effort élevé)


  ---
  Ma Recommandation

  Commencer par les 4 quick wins - ils peuvent être implémentés rapidement avec un ROI immédiat :

  1. Apple/Google Pay → Changement d'une ligne dans Stripe
  2. Date livraison → Calcul simple basé sur les délais Colissimo
  3. "Ajouté ✓" → État temporaire 2s avec useState
  4. Récemment vus → localStorage + section sur fiche produit

  Ensuite prioriser la recherche (#5-6) car +43% conversion est significatif.
