 L'audit complet est disponible dans le fichier plan. Voici les sources Baymard principales utilisées:

  Sources:
  - https://baymard.com/blog/jewelry-and-watches-2025-benchmark
  - https://baymard.com/blog/current-state-of-checkout-ux
  - https://baymard.com/blog/current-state-ecommerce-product-page-ux
  - https://baymard.com/research/ecommerce-product-lists
  - https://baymard.com/lists/cart-abandonment-rate
  - https://baymard.com/blog/truncating-product-gallery-thumbnails
  - https://baymard.com/blog/user-ratings-distribution-summary
  - https://baymard.com/blog/autocomplete-design
  - https://baymard.com/blog/ecommerce-navigation-best-practice
  - https://baymard.com/research/mcommerce-usability

⏺ User approved Claude's plan
  ⎿  Plan saved to: ~/.claude/plans/idempotent-humming-diffie.md · /plan to edit
     Audit UX Baymard Institute - Synclune E-commerce Bijoux

     Sources Baymard Analysées

     - https://baymard.com/blog/jewelry-and-watches-2025-benchmark - 470+ guidelines spécifiques bijouterie
     - https://baymard.com/blog/current-state-of-checkout-ux - 65% des sites ont une performance "médiocre"
     - https://baymard.com/blog/current-state-ecommerce-product-page-ux - 51% des sites sont "médiocres"
     - https://baymard.com/research/ecommerce-product-lists - 78% des sites mobiles sont "médiocres"
     - https://baymard.com/research/mcommerce-usability - 400+ guidelines mobiles
     - https://baymard.com/lists/cart-abandonment-rate - Taux moyen 70.19%
     - https://baymard.com/blog/truncating-product-gallery-thumbnails - 30% tronquent mal les thumbnails
     - https://baymard.com/blog/user-ratings-distribution-summary - 43% n'affichent pas la distribution

     ---
     RÉSUMÉ EXÉCUTIF

     Score Global Estimé: 72/100 (Décent)

     Points forts de Synclune:
     - Architecture moderne avec bonne accessibilité (skip links, ARIA, keyboard nav)
     - Galerie avec zoom et lightbox fonctionnels
     - Distribution des notes présente (recommandation Baymard respectée)
     - Guest checkout supporté
     - Thumbnails visibles (non tronquées) sur mobile
     - Filtres bien implémentés avec badges actifs

     Axes d'amélioration prioritaires:
     - Pas d'autocomplete sur la recherche (81% des sites en ont un)
     - Pas d'images sur modèle humain visibles (critique pour bijoux)
     - Checkout en 2 étapes au lieu de flux continu
     - Pas de filtre "En promotion" visible
     - Pas de galerie d'images clients dans les avis

     ---
     1. PAGE PRODUIT (Score: 75/100)

     ✅ Conforme Baymard

     | Guideline                        | Synclune                          | Référence Baymard                         |
     |----------------------------------|-----------------------------------|-------------------------------------------|
     | Galerie avec thumbnails visibles | ✅ Mobile: flex-wrap horizontal   | 76% des sites mobile échouent             |
     | Zoom disponible                  | ✅ GalleryZoomButton + Lightbox   | 25% des sites n'ont pas de zoom suffisant |
     | Navigation clavier galerie       | ✅ ArrowLeft/Right/Home/End       | WCAG 2.1.1                                |
     | Support vidéo                    | ✅ mediaType === "VIDEO" supporté | Recommandé pour bijoux                    |
     | Schema.org Product               | ✅ JSON-LD complet avec reviews   | Rich snippets Google                      |
     | Avis clients avec distribution   | ✅ ReviewSummary avec barres %    | 43% n'en ont pas                          |
     | Stock urgency badge              | ✅ "Plus que X !" si stock ≤ 3    | Baymard recommande urgency                |

     ⚠️ À Améliorer

     | Problème                          | Impact   | Fichier                  | Recommandation Baymard
            |
     |-----------------------------------|----------|--------------------------|-----------------------------------------------------------------
     -------|
     | Pas d'images sur modèle humain    | CRITIQUE | gallery.tsx              | "Products designed to be worn require human model context"
            |
     | Pas de guide de taille visuel     | ÉLEVÉ    | N/A                      | 82% des sites bijoux échouent sur le sizing
            |
     | Pas de galerie images clients     | MOYEN    | reviews-list.tsx         | "Allow users to navigate via reviewer-submitted images" (90%
     échouent) |
     | Pas de réponses aux avis négatifs | MOYEN    | review-card.tsx          | 80% des sites ne répondent pas aux avis négatifs
            |
     | Compteur "X personnes consultent" | FAIBLE   | Déjà cartsCount récupéré | Afficher le social proof
            |

     Fichiers Concernés

     - /modules/media/components/gallery/gallery.tsx
     - /modules/reviews/components/reviews-list.tsx
     - /modules/reviews/components/review-card.tsx
     - /app/(boutique)/creations/[slug]/page.tsx

     ---
     2. GALERIE IMAGES (Score: 80/100)

     ✅ Conforme Baymard

     | Guideline                     | Synclune                              | Référence                     |
     |-------------------------------|---------------------------------------|-------------------------------|
     | Thumbnails non-tronquées      | ✅ flex-wrap sans carousel sur mobile | 30% tronquent mal             |
     | Zoom type "Double-tap"        | ✅ Lightbox avec zoom                 | Baymard recommande ce pattern |
     | Prefetch intelligent          | ✅ usePrefetchImages connection-aware | Performance                   |
     | Indicateur position (counter) | ✅ GalleryCounter                     | UX navigation                 |
     | Respect reduced-motion        | ✅ useReducedMotion                   | WCAG 2.3.3                    |

     ⚠️ À Améliorer

     | Problème                                  | Impact | Recommandation                                               |
     |-------------------------------------------|--------|--------------------------------------------------------------|
     | Pas d'images texture/close-up séparées    | MOYEN  | "Textural images are extreme closeups" - ajouter tag TEXTURE |
     | Pas d'indication "glisser pour voir plus" | FAIBLE | Ajouter hint swipe sur mobile                                |
     | Pas de badge video sur thumbnail          | FAIBLE | Indiquer visuellement les vidéos dans thumbnails             |

     ---
     3. CATALOGUE & FILTRES (Score: 70/100)

     ✅ Conforme Baymard

     | Guideline                  | Synclune                  |
     |----------------------------|---------------------------|
     | Filtres appliqués affichés | ✅ FilterBadges           |
     | Filtres en accordéon       | ✅ Sections collapsibles  |
     | Reset des filtres          | ✅ clearAllFilters()      |
     | Compteur par filtre        | ✅ color._count?.skus     |
     | Filtre prix avec range     | ✅ PriceRangeInputs       |
     | Filtre notes clients       | ✅ ratingMin avec étoiles |

     ⚠️ À Améliorer

     | Problème                          | Impact | Référence Baymard                             |
     |-----------------------------------|--------|-----------------------------------------------|
     | Pas de filtre "En promotion"      | ÉLEVÉ  | "Always provide a Sale/Deal filter type"      |
     | Pas de filtre "En stock"          | ÉLEVÉ  | Filtre disponibilité manquant                 |
     | Pas de sorting par "Nouveautés"   | MOYEN  | Option tri populaire                          |
     | Pas de "View All" dans nav mobile | MOYEN  | 76% des sites l'omettent (Baymard recommande) |

     Fichiers Concernés

     - /modules/products/components/product-filter-sheet.tsx
     - /modules/products/components/product-list.tsx
     - /shared/constants/navigation.ts

     ---
     4. RECHERCHE (Score: 55/100)

     ✅ Conforme Baymard

     | Guideline              | Synclune                      |
     |------------------------|-------------------------------|
     | Icône loupe visible    | ✅ Search icon                |
     | Bouton clear           | ✅ Bouton X animé             |
     | Live search disponible | ✅ Mode live avec debounce    |
     | ARIA label             | ✅ aria-label + role="search" |

     ❌ NON Conforme (Critique)

     | Problème                       | Impact   | Référence Baymard                                                            |
     |--------------------------------|----------|------------------------------------------------------------------------------|
     | Pas d'autocomplete/suggestions | CRITIQUE | "81% des sites ont autocomplete" - seulement 19% l'implémentent correctement |
     | Pas de recherches récentes     | ÉLEVÉ    | Pattern mobile recommandé                                                    |
     | Pas de suggestions produits    | ÉLEVÉ    | Afficher produits dans dropdown                                              |
     | Pas de correction fautes       | MOYEN    | "69% risquent confusion catalogue par fautes"                                |

     Fichiers Concernés

     - /shared/components/search-input.tsx
     - Nouveau: /modules/search/components/search-autocomplete.tsx

     ---
     5. CHECKOUT (Score: 78/100)

     ✅ Conforme Baymard

     | Guideline                    | Synclune                                       | Référence                               |
     |------------------------------|------------------------------------------------|-----------------------------------------|
     | Guest checkout supporté      | ✅ isGuest flow                                | 26% abandonnent si compte requis        |
     | Champ nom unique             | ✅ fullName                                    | Réduit friction (Baymard best practice) |
     | Complément adresse optionnel | ✅ showAddressLine2 progressive disclosure     | Moins de champs affichés                |
     | Explication téléphone        | ✅ Texte "Utilisé uniquement par transporteur" | 70% hésitent à donner téléphone         |
     | Pays défaut France           | ✅ showCountrySelect = false par défaut        | Réduit friction                         |
     | CGV avec lien externe        | ✅ target="_blank"                             | Best practice                           |
     | Bouton sticky mobile         | ✅ sticky bottom-0                             | Pattern mobile recommandé               |
     | Indication sécurité Stripe   | ✅ Badge Shield + texte SSL                    | 25% abandonnent par peur sécurité       |

     ⚠️ À Améliorer

     | Problème                                  | Impact | Recommandation Baymard                  |
     |-------------------------------------------|--------|-----------------------------------------|
     | Checkout en 2 étapes                      | MOYEN  | Flux continu préféré (moins d'abandons) |
     | Pas de pré-remplissage adresse            | MOYEN  | Auto-complétion Google Places           |
     | Pas d'estimation livraison avant checkout | ÉLEVÉ  | 48% abandonnent pour coûts cachés       |
     | Pas de "même adresse billing" visible     | FAIBLE | Déjà géré par Stripe Embedded           |
     | Pas de sauvegarde brouillon auto          | MOYEN  | Déjà implémenté pour login, généraliser |

     Fichiers Concernés

     - /modules/payments/components/checkout-form.tsx
     - /modules/payments/components/checkout-container.tsx

     ---
     6. PANIER (Score: 82/100)

     ✅ Conforme Baymard

     | Guideline                    | Synclune                       |
     |------------------------------|--------------------------------|
     | Sheet drawer au lieu de page | ✅ CartSheet                   |
     | Modification quantité inline | ✅ Selector dans cart          |
     | Images produits visibles     | ✅ Thumbnails                  |
     | Prix total visible           | ✅ Subtotal + shipping preview |
     | CTA checkout proéminent      | ✅ Bouton principal            |
     | Alertes stock                | ✅ stockIssues détection       |

     ⚠️ À Améliorer

     | Problème                              | Impact |
     |---------------------------------------|--------|
     | Pas de "Continue shopping" proéminent | FAIBLE |
     | Pas de cross-sell                     | MOYEN  |
     | Pas de code promo visible dans cart   | MOYEN  |

     ---
     7. NAVIGATION & HOMEPAGE (Score: 70/100)

     ✅ Conforme Baymard

     | Guideline               | Synclune                       |
     |-------------------------|--------------------------------|
     | Menu hamburger mobile   | ✅ MenuSheet                   |
     | Logo centré             | ✅ Pattern mobile              |
     | Icônes panier/favoris   | ✅ Badges avec compteurs       |
     | Collections accessibles | ✅ Navigation desktop + mobile |

     ⚠️ À Améliorer

     | Problème                         | Impact | Référence Baymard                         |
     |----------------------------------|--------|-------------------------------------------|
     | Pas de highlight scope actuel    | ÉLEVÉ  | 95% ne highlight pas (Baymard recommande) |
     | Pas de hover delay menu dropdown | MOYEN  | 61% n'en ont pas                          |
     | Pas de "View All" par niveau     | MOYEN  | 76% l'omettent                            |
     | Ads/hero trop proéminent         | FAIBLE | 55% ont des hero trop grands              |

     ---
     8. MOBILE UX (Score: 75/100)

     ✅ Conforme Baymard

     | Guideline                | Synclune                                   |
     |--------------------------|--------------------------------------------|
     | Touch targets ≥ 44px     | ✅ Boutons h-11/h-12                       |
     | Filter sheet full-height | ✅ FilterSheetWrapper                      |
     | Sticky CTA produit       | ✅ StickyCartCTA                           |
     | Scroll top après filtres | ✅ window.scrollTo({ behavior: "smooth" }) |
     | Reduced motion respect   | ✅ useReducedMotion partout                |

     ⚠️ À Améliorer

     | Problème                                | Impact |
     |-----------------------------------------|--------|
     | Formulaire checkout non optimisé mobile | MOYEN  |
     | Pas de bottom nav persistante           | FAIBLE |

     ---
     PLAN D'AMÉLIORATION PRIORISÉ

     Phase 1: Quick Wins (Impact élevé, effort faible)

     1. Ajouter filtre "En promotion" dans ProductFilterSheet
       - Fichier: modules/products/components/product-filter-sheet.tsx
       - Ajouter checkbox "Articles en promotion" basé sur compareAtPrice > price
     2. Ajouter filtre "En stock uniquement"
       - Fichier: modules/products/components/product-filter-sheet.tsx
       - Filtrer SKUs avec inventory > 0
     3. Afficher estimation livraison sur page produit
       - Fichier: modules/products/components/product-details.tsx
       - Ajouter "Livraison estimée: X-Y jours" basé sur Colissimo
     4. Ajouter social proof "X personnes consultent"
       - Fichier: app/(boutique)/creations/[slug]/page.tsx
       - Utiliser cartsCount déjà récupéré

     Phase 2: Améliorations Moyennes

     5. Implémenter Search Autocomplete
       - Nouveau fichier: modules/search/components/search-autocomplete.tsx
       - Suggestions produits + recherches récentes + correction typos
     6. Ajouter images clients dans avis
       - Fichier: modules/reviews/components/reviews-list.tsx
       - Galerie d'images cliquables depuis les avis
     7. Highlight scope navigation actuel
       - Fichier: app/(boutique)/(accueil)/_components/navbar/desktop-nav.tsx
       - Ajouter aria-current="page" + style actif
     8. Ajouter guide taille bijoux
       - Nouveau composant: modules/products/components/size-guide.tsx
       - Comparaison visuelle avec pièce de monnaie

     Phase 3: Améliorations Avancées

     9. Images sur modèle humain
       - Recommandation: ajouter photos portées dans galerie
       - Tag ON_MODEL dans ProductMedia
     10. Réponses aux avis négatifs
       - Fichier: modules/reviews/components/review-card.tsx
       - Afficher réponses admin
     11. Checkout flux continu (optionnel)
       - Fusionner CheckoutForm et paiement Stripe

     ---
     MÉTRIQUES DE SUCCÈS

     | KPI                      | Baseline Estimé | Cible                      |
     |--------------------------|-----------------|----------------------------|
     | Taux d'abandon panier    | ~70%            | < 60%                      |
     | Conversion recherche     | -               | Mesurer après autocomplete |
     | Temps moyen checkout     | -               | Réduire 20%                |
     | Taux rebond page produit | -               | Réduire 15%                |

     ---
     RÉFÉRENCES COMPLÈTES

     - https://baymard.com/research/jewelry-and-watches
     - https://baymard.com/research/checkout-usability
     - https://baymard.com/research/product-page
     - https://baymard.com/research/mcommerce-usability
     - https://baymard.com/research/ecommerce-search
     - https://baymard.com/research/homepage-and-category-usability
