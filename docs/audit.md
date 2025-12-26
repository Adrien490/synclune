# AUDIT UX BAYMARD COMPLET - SYNCLUNE

## Méthodologie

**Source** : Baymard Institute - 200 000+ heures de recherche UX, 4 400+ sessions de tests utilisateurs, 325 sites e-commerce benchmarkés, 18 000+ scores d'usabilité.

**Contexte** : Baymard possède 470+ guidelines spécifiques pour le secteur Jewelry & Watches.

---

# PARTIE 1 : PAGES PRODUIT

## 1.1 Galerie d'Images

### Guidelines Baymard - 7 Types d'Images Essentiels

| Type | Description | Importance Bijoux |
|------|-------------|-------------------|
| **Textural** | Gros plans extrêmes montrant textures et qualité d'assemblage | CRITIQUE |
| **Lifestyle** | Produit dans son contexte d'utilisation | HAUTE |
| **In-Scale** | Produit avec objet de référence pour taille | CRITIQUE |
| **Human Model** | Sur mannequin main/poignet/cou | CRITIQUE pour bijoux |
| **Angles** | Face, arrière, côté, 3/4 | HAUTE |
| **Customer** | Photos soumises par clients (preuve sociale) | HAUTE |
| **Variations** | Toutes les couleurs/finitions | MOYENNE |

### Statistiques Baymard

| Métrique | Valeur |
|----------|--------|
| Sites sans images "In-Scale" | 28% |
| Sites sans thumbnails mobile | 76% |
| Utilisateurs ignorant images sans vignettes | 50-80% |
| Sites avec zoom insuffisant | 25% |
| Sites sans gestes touch (pinch/zoom) | 40% |
| Sites avec troncature mal indiquée | 40% |

### Audit Synclune - Galerie

| Critère | Recommandation Baymard | État Synclune | Écart |
|---------|------------------------|---------------|-------|
| Vignettes desktop | Toujours visibles | ✅ Présentes | OK |
| Vignettes mobile | Scrollables horizontalement | ❌ Dots seulement | **HAUT** |
| Swipe gesture | Navigation par défaut mobile | ✅ Embla carousel | OK |
| Pinch-to-zoom | Geste attendu sur mobile | ❌ Non implémenté | **MOYEN** |
| Double-tap zoom | Alternatif au pinch | ❌ Non implémenté | MOYEN |
| Troncature visible | Indicateur "+X images" clair | ✅ Counter "1/8" | OK |
| Hover zoom desktop | Détails visibles | ✅ Implémenté | OK |
| Lightbox | Vue agrandie | ✅ Implémenté | OK |
| Lazy loading | Performance | ✅ Preload 4 premières | OK |
| Hit areas thumbnails | Min 7mm × 7mm | ⚠️ À vérifier | MOYEN |

### Recommandations Galerie

1. **PRIORITÉ HAUTE** : Remplacer dots par vignettes scrollables sur mobile
2. Implémenter pinch-to-zoom natif
3. Créer checklist photo pour chaque produit (8-12 images min)
4. Ajouter images "In-Scale" (bijou sur main/doigt)

---

## 1.2 Vidéos Produit

### Guidelines Baymard

- 35% des sites gèrent MAL le placement des vidéos
- Vidéos doivent être **intégrées dans la galerie** (pas séparées)
- Icône "play" obligatoire sur thumbnails vidéo
- Permettre replay ailleurs sur la page

### Audit Synclune - Vidéos

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Vidéos dans galerie | Mélangées aux images | ✅ Supporté | OK |
| Badge "play" visible | Sur thumbnail | ❌ Pas de badge distinct | **MOYEN** |
| Indicateur vidéo sur card | Dans liste produits | ❌ Absent | BAS |

---

## 1.3 Descriptions Produit - Structure par Highlights

### Guidelines Baymard

**78% des sites échouent** à structurer leurs descriptions correctement.

**Pattern "Highlights"** recommandé :
```
[ICÔNE/IMAGE] + [TITRE FEATURE] + [TEXTE DESCRIPTIF]
```

**Avantages prouvés** :
- Scan plus efficace
- Exploration plus profonde
- Engagement supérieur
- Users lisent plus sans s'en rendre compte

### Audit Synclune - Descriptions

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Structure highlights | Feature + icône/image | ❌ ProductCharacteristics basique | **HAUT** |
| Chunking visuel | Sections avec images intercalées | ❌ Bloc texte | **HAUT** |
| Matériaux visibles | Or 18k, Argent 925 affiché | ✅ Via SKU attributes | OK |
| Provenance | "Fait main à..." | ❌ Non exploité | CONTENU |
| Certifications | GIA, labels visibles | ❌ Non exploité | CONTENU |

### Recommandations Descriptions

1. **PRIORITÉ HAUTE** : Refactorer en composant "Highlights" avec icônes
2. Ajouter section storytelling "Fabrication artisanale"
3. Mettre en avant provenance et éthique

---

## 1.4 Sélection de Variantes

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites sans boutons pour tailles | 28% |
| Sites ne mettant pas à jour image sur couleur | 54% |
| Sites sans synchronisation données cross-variantes | 28% |

**Recommandations** :
- Utiliser **BOUTONS** pour les tailles (pas dropdowns)
- Mise à jour dynamique de l'image principale au hover/sélection couleur
- Synchroniser ratings/avis entre variantes du même produit

### Audit Synclune - Variantes

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Swatches couleur visuels | Aperçu hex visible | ✅ ColorSwatches | OK |
| Boutons pour tailles | Pas de dropdown | ⚠️ À vérifier | MOYEN |
| Update image sur sélection | Changer image principale | ❌ Pas d'update | **HAUT** |
| Update image sur hover | Preview avant sélection | ❌ Absent | **HAUT** |
| Prix dynamique | Mise à jour animée | ✅ Animation | OK |
| Stock par variante | Disponibilité visible | ✅ Via SKU | OK |
| Sync données variantes | Ratings combinés | ⚠️ Non applicable (pas d'avis) | N/A |

### Recommandations Variantes

1. **PRIORITÉ HAUTE** : Hover sur swatch → preview image de cette couleur
2. Sur ProductCard dans liste : hover couleur → change thumbnail

---

## 1.5 Prix et Promotions

### Guidelines Baymard

| Problème | % Sites |
|----------|---------|
| Prix difficile à trouver | 18% desktop, 11% mobile |
| Promotions loin du prix | 14% |
| Descriptions promotions confuses | 19% |

**4 Erreurs à éviter** :
1. Confusion sur le montant économisé
2. Placement éloigné du prix principal
3. Descriptions multiples de la même promo
4. Masquage dans bannières (banner blindness)

### Audit Synclune - Prix

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Prix barré visible | Strike-through lisible | ✅ compareAtPrice | OK |
| Badge promotion | "-X%" affiché | ✅ Badge promo | OK |
| Montant économisé | "Économisez X€" | ❌ Pas affiché | BAS |
| Urgence stock | "Plus que X en stock" | ✅ Amber badge | OK |
| Message positif | "En stock" visible | ❌ Non affiché si disponible | BAS |
| Promo proche du prix | Groupées ensemble | ✅ OK | OK |

---

## 1.6 Social Proof - Avis et Ratings

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites sans images soumises par clients | 67% |
| Sites sans distribution des ratings | 43% |
| Sites avec distribution non cliquable | 39% |

**Éléments essentiels** :
- Score moyen + NOMBRE de ratings (contexte crucial)
- Distribution visuelle (barres 5★, 4★, 3★...)
- Photos clients (preuve sociale visuelle)
- Images réseaux sociaux (Instagram, etc.)

### Audit Synclune - Avis

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Système d'avis | Avec upload photos | ❌ Absent | **HAUT** |
| Score + nombre | "4.5/5 (127 avis)" | ❌ N/A | - |
| Distribution ratings | Barres visuelles | ❌ N/A | - |
| Photos clients | Sur page produit | ❌ N/A | - |
| Images Instagram | Intégration sociale | ❌ Absent | MOYEN |

---

## 1.7 Cross-sell et Recommandations

### Guidelines Baymard

**58% des sites offrent seulement 1 type** de recommandations (sévère limitation).

**2 Types nécessaires** :
1. **Produits alternatifs** : Autres options similaires
2. **Produits supplémentaires** : Accessoires complémentaires

| Métrique | Valeur |
|----------|--------|
| Sites mal implémentés | 58% |
| Cross-sells sans thumbnail | Ignorés par users |
| Sites avec infos manquantes sur cross-sells | 68% |

**Informations requises sur cross-sells** :
- Thumbnail/image
- Titre produit
- Prix
- Rating
- Stock status
- Quick action (add to cart)

### Audit Synclune - Cross-sell

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Produits alternatifs | Section dédiée | ⚠️ RelatedProducts existe | OK |
| Produits complémentaires | "Complète le look" | ❌ Absent | MOYEN |
| Cross-sell dans panier | Suggestions | ❌ Absent | **MOYEN** |
| Infos complètes | Image, prix, rating, stock | ⚠️ Partiel | MOYEN |

---

## 1.8 Bouton Add-to-Cart et CTA

### Guidelines Baymard

- **Styling unique** distinct des autres boutons
- **Sticky sur mobile** pour rester visible au scroll
- Min hit area **7mm × 7mm**
- Feedback visuel après ajout

### Audit Synclune - CTA

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Styling distinctif | Bouton unique | ✅ Primary button | OK |
| Sticky mobile | Visible au scroll | ✅ StickyCartCTA | OK |
| Hit area suffisant | Min 44px | ✅ 44px | OK |
| Feedback après ajout | Animation/toast | ✅ Toast + animation | OK |
| État dynamique | Transformer en quantité | ❌ Non implémenté | BAS |

---

## 1.9 Free Shipping et Livraison

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites avec "Free shipping" seulement en bannière | 32% |
| Users manquant l'info (banner blindness) | 27% |
| Sites sans estimation frais visibles | 43% |

**Placement recommandé** : Dans la section "Buy" près du bouton Add-to-Cart, PAS seulement en header.

### Audit Synclune - Livraison

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Info livraison sur page produit | Près du CTA | ⚠️ À vérifier | MOYEN |
| Estimation frais | Avant checkout | ❌ "Au paiement" | **HAUT** |
| Seuil franco de port | "Livraison offerte dès X€" | ⚠️ À vérifier | MOYEN |

---

## 1.10 Produits Out of Stock

### Guidelines Baymard

- "Out of Stock" simple = UX dead end
- 30% des users abandonnent vers concurrents
- **Recommandation** : Permettre commandes avec délai augmenté

### Audit Synclune - Stock

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Alerte rupture visible | Message clair | ✅ Badge visible | OK |
| Notification retour stock | CTA "M'alerter" | ⚠️ StockNotificationForm existe mais peu visible | MOYEN |
| Commande en précommande | Délai augmenté | ❌ Non implémenté | BAS |

---

## 1.11 Layout Page Produit

### Guidelines Baymard

**À éviter** : Horizontal Tabs (28% des sites les utilisent)
- 27% des users overlooked le contenu caché en tabs
- Contenu souvent manqué : reviews, specs, FAQs, cross-sells

**Layouts recommandés** :
1. One Long Page (scroll tout)
2. Sticky TOC (table des matières)
3. Collapsed Sections (accordion)

### Audit Synclune - Layout

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Pas de horizontal tabs | Éviter ce pattern | ✅ Layout scrollable | OK |
| Contenu accessible | Pas caché en tabs | ✅ Visible | OK |
| Galerie sticky desktop | Visible au scroll | ✅ Implémenté | OK |
| Sections collapsibles | Si contenu long | ⚠️ Partiel | BAS |

---

# PARTIE 2 : CATALOGUE & FILTRES

## 2.1 Filtres Essentiels

### Guidelines Baymard

**51% des sites n'offrent pas les 5 filtres essentiels**.

**Filtres universels** :
- **Prix** (88% des sites l'ont) - MUST avec custom range
- **Brand/Marque**
- **Category/Type**
- **Color** (critique pour bijoux)
- **Size/Dimensions**

**Filtres spécifiques bijoux** :
- Matériau (or 18k, argent 925, plaqué, acier)
- Couleur métal (or jaune, or rose, argent)
- Type (bague, collier, boucles)
- Taille bague (avec guide international)
- Prix

### Audit Synclune - Filtres

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Filtre Prix | Obligatoire avec custom range | ✅ Min/Max | OK |
| Filtre Couleur | Avec swatches visuels | ✅ ColorSwatches | OK |
| Filtre Matériau | Pour bijoux | ✅ Présent | OK |
| Filtre Taille | Pour bagues | ⚠️ À vérifier | MOYEN |
| Multi-sélection | OR entre valeurs même type | ✅ Multi-select | OK |
| Truncate > 8 options | "Afficher plus" | ⚠️ Non vérifié | MOYEN |
| Search dans filtres | Pour listes longues | ❌ Absent | MOYEN |

---

## 2.2 Slider de Prix

### Guidelines Baymard

**50%+ des test subjects** misinterprètent les dual-thumb sliders.

**5 Exigences pour sliders** :
1. **Guidance au clic** : Message explicatif si clic sans drag
2. **Text input fallback** : TOUJOURS accompagner d'inputs texte
3. **Échelle non-linéaire** : Linear scales "très souvent inappropriées"
4. **Affichage valeurs clair** : Feedback immédiat min/max
5. **Touch targets** : Handles suffisamment grands

**Pattern recommandé** :
```
[Input Min €] ─────────────── [Input Max €]
      └──────── SLIDER ────────────┘
```

### Audit Synclune - Slider Prix

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Slider dual-thumb | Visual intuitif | ❌ Inputs seulement | **MOYEN** |
| Text inputs | Fallback précis | ✅ Présents | OK |
| Échelle adaptée | Non-linéaire si skewed | ❌ N/A | - |
| Feedback valeurs | Immédiat | ✅ Via inputs | OK |

---

## 2.3 Affichage des Résultats

### Guidelines Baymard

**68% desktop + 69% mobile** n'offrent pas tous les 4 tris essentiels :
1. Prix (asc/desc)
2. User Rating / Avis
3. Best-Selling
4. Newest

**80% des sites** n'affichent pas minimum 3 thumbnails en liste.

### Audit Synclune - Résultats

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Nombre de résultats | "X produits" visible | ❌ Pas affiché | **HAUT** |
| 4 options de tri | Prix, Rating, Bestsellers, Nouveaux | ⚠️ Partiel (pas de rating/bestsellers) | MOYEN |
| Tri actif visible | Montrer sélection courante | ⚠️ Select non explicite | BAS |
| Loading state | Skeleton/blur | ⚠️ Blur basique | BAS |
| Badges filtres actifs | Chips supprimables | ✅ ProductFilterBadges | OK |
| "Clear All" button | Reset tous filtres | ⚠️ À vérifier | MOYEN |

---

## 2.4 Cartes Produit

### Audit Synclune - Cards

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Quick add-to-cart | Visible hover/always | ✅ Hover desktop, toujours mobile | OK |
| Wishlist | Accessible | ✅ Optimistic UI | OK |
| Hover couleur → image | Update dynamique | ❌ Image statique | **MOYEN** |
| Badge vidéo | Indicateur si vidéo | ❌ Absent | BAS |
| "X couleurs" | Lien vers produit | ✅ Affiché | OK |
| Min 3 thumbnails | Aperçu variantes | ❌ 1 image | MOYEN |
| Badges stock | "Plus que X", "Rupture" | ✅ Implémentés | OK |
| Badge promo | "-X%" | ✅ Implémenté | OK |

---

## 2.5 Filtres Appliqués

### Guidelines Baymard

**32% des sites** n'utilisent pas les best practices pour afficher les filtres appliqués.

**Éléments requis** :
- Overview visible des filtres actifs
- Bouton "X" sur chaque filtre
- "Clear All" pour reset
- Position originale conservée (97% des sites OK)

### Audit Synclune - Filtres Appliqués

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Badges visibles | Chips supprimables | ✅ ProductFilterBadges | OK |
| Bouton X individuel | Sur chaque filtre | ✅ Présent | OK |
| "Clear All" | Reset global | ⚠️ À vérifier | MOYEN |
| Position originale | Filtre reste en place | ✅ OK | OK |

---

## 2.6 Filtres Mobile

### Guidelines Baymard

**78% des sites mobile** = "médiocre ou pire" pour filtres.

**15% des sites** ne permettent pas de sélectionner plusieurs options du MÊME type de filtre.

**Pattern recommandé** : Sheet/Modal avec bouton "Apply"

### Audit Synclune - Filtres Mobile

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Interface Sheet/Modal | Séparée de la liste | ✅ ProductFilterSheet | OK |
| Multi-sélection même type | OR entre valeurs | ✅ Implémenté | OK |
| Bouton Apply | Confirmation des choix | ✅ Présent | OK |
| Filtres promus | Inline sur liste | ❌ Tous dans sheet | MOYEN |
| Scroll horizontal badges | Espace optimisé | ⚠️ À vérifier | BAS |

---

# PARTIE 3 : PANIER & CHECKOUT

## 3.1 Guest Checkout

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites cachant guest checkout | 62% |
| Sites rendant navigation difficile | 44% |
| Users abandonnant si forced account | 19% |
| Users mobile avec difficulté à identifier | 60% |

**Recommandations** :
- **BOUTON** visible (pas lien texte)
- Étiquetage explicite : "Guest Checkout" ou "Continuer sans compte"
- Positionner AU-DESSUS ou À CÔTÉ de l'option connexion
- Ne JAMAIS redemander création compte pendant le flow

**Pattern mobile** : Effondrer tout le contenu, montrer 3 en-têtes cliquables (Sign-in, Create, Guest)

### Audit Synclune - Guest Checkout

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Option visible | Bouton proéminent | ❌ Flow implicite | **HAUT** |
| Libellé explicite | "Continuer sans compte" | ❌ Pas de CTA clair | **HAUT** |
| Position | Au-dessus ou à côté connexion | ❌ Non structuré | **HAUT** |
| Pas de redemande | Une seule fois | ⚠️ À vérifier | MOYEN |

---

## 3.2 Nombre de Champs

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Nombre optimal | 6-8 champs |
| Moyenne actuelle (2024) | 11.3 champs |
| Users abandonnant pour complexité | 18% |
| Users intimidés par 10-15+ champs | 31% |
| Réduction possible | 20-60% |

**Champs essentiels** :
1. Email
2. Prénom
3. Nom
4. Adresse
5. Ville/CP
6. Numéro carte
7. Expiration
8. CVV

**Techniques de réduction** :
- Masquer champs optionnels derrière "Afficher plus"
- Auto-complétion d'adresses
- Pré-remplir pays par défaut (IP)
- Billing = Shipping par défaut (masquer, pas pré-remplir)

### Audit Synclune - Champs Checkout

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Nombre de champs | Max 8 | ⚠️ À compter précisément | MOYEN |
| Champs optionnels masqués | Derrière lien | ⚠️ À vérifier | MOYEN |
| Billing = Shipping | Checkbox par défaut + masquage | ⚠️ À vérifier | MOYEN |
| Auto-complétion adresse | Google Places ou similaire | ❌ Non implémenté | MOYEN |
| Pré-remplissage pays | Via IP ou profil | ⚠️ À vérifier | BAS |

---

## 3.3 Validation des Formulaires

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites sans validation inline | 31% |
| Sites avec messages adaptatifs | 2% |
| Sites avec messages génériques | 92% |
| Sites ne marquant pas requis/optionnel | 86% |

**Timing de validation** :
- Ne PAS valider avant fin de saisie
- Validation inline APRÈS complétion du champ
- Feedback immédiat positif

**Messages adaptatifs** (exemples) :
- "Cette adresse email manque le domaine (comme '.com')"
- "Cette adresse email manque le caractère @"

### Audit Synclune - Validation

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Validation inline | Après complétion champ | ✅ onChange validator | OK |
| Messages adaptatifs | Spécifiques à l'erreur | ⚠️ Zod génériques | MOYEN |
| Champs requis marqués | Astérisque + légende | ✅ * rouge | OK |
| Champs optionnels marqués | "(Optionnel)" | ⚠️ Pas explicite | BAS |
| Focus premier champ invalide | Scroll automatique | ❌ Non implémenté | MOYEN |
| Email avec + accepté | jean+test@gmail.com | ⚠️ À vérifier | MOYEN |
| Validation Luhn (carte) | Check numéro valide | ⚠️ Via Stripe | OK |

---

## 3.4 Trust Signals et Sécurité

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites avec mauvaise distinction visuelle carte | 89% |
| Users abandonnant pour manque confiance | 18% |

**Badges les plus fiables** :
- Norton : Top choix
- McAfee : ~23% confiance
- TRUSTe / BBB : ~13% chacun

**Placement critique** : À PROXIMITÉ IMMÉDIATE des champs de carte

**Éléments de réassurance** :
- Bordure/fond distinct autour champs carte
- Texte "Vos informations sont sécurisées"
- Icône cadenas
- "Sécurisé par [Provider]"
- Mention SSL/TLS

### Audit Synclune - Trust Signals

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Message sécurité | Près des champs carte | ✅ Message Stripe | OK |
| Badge sécurité | À côté des champs | ⚠️ Stripe embedded | OK |
| Distinction visuelle | Fond/bordure unique | ⚠️ Via Stripe embedded | OK |
| Icône cadenas | Visible | ⚠️ Via Stripe | OK |
| Trust badges globaux | Dans panier | ❌ Uniquement footer | MOYEN |

---

## 3.5 Progress Indicators

### Guidelines Baymard

**Best practice** : Toujours effondrer les étapes complétées en résumés.

**Étapes typiques** :
1. Cart
2. Shipping Address
3. Shipping Methods
4. Payment
5. Order Review

**Problème mobile** : Confusion "Confirm Order" vs "Order Confirmation" → jusqu'à 10% d'abandons

### Audit Synclune - Progress

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Étapes visibles | Timeline/breadcrumbs | ⚠️ 2 étapes (adresse → paiement) | OK |
| Résumés étapes complétées | Effondrer en compact | ⚠️ Partiel | MOYEN |
| Distinction confirm/confirmation | Visuellement différent | ⚠️ À vérifier | MOYEN |

---

## 3.6 Gestion des Erreurs

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites perdant données carte après erreur | 34% |
| Ventes récupérables avec alternative paiement | 30% |

**Stratégies** :
- Offrir alternative (PayPal) si carte déclinée
- CONSERVER données saisies après erreur
- Stocker temporairement en localStorage
- Messages d'erreur clairs et actionnables

### Audit Synclune - Erreurs

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Données conservées après erreur | Pas de reset | ⚠️ À vérifier | MOYEN |
| Alternative paiement | PayPal, Apple Pay | ⚠️ À vérifier options Stripe | MOYEN |
| Message erreur actionnable | Clair et spécifique | ⚠️ Via Stripe | OK |

---

## 3.7 Order Summary

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites mobile sans total avant paiement | 33% |

**Éléments à afficher DÈS LE DÉBUT** :
- Nombre d'articles
- Subtotal
- Frais d'expédition (estimés)
- Taxes
- Total final
- Adresse de livraison (une fois saisie)

### Audit Synclune - Summary

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Récapitulatif visible | Sticky sur desktop | ✅ CheckoutSummary | OK |
| Total avant paiement | Visible dès le début | ✅ Affiché | OK |
| Frais port estimés | Avant saisie adresse | ❌ "Au paiement" | **HAUT** |
| Détails articles | Images, quantités, prix | ✅ Présents | OK |

---

## 3.8 Panier (CartSheet)

### Audit Synclune - Panier

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Quantité totale visible | Badge bold | ⚠️ Petit "(n) articles" | BAS |
| Warnings stock position | En HAUT | ❌ En bas après scroll | **HAUT** |
| Estimation frais port | Avant checkout | ❌ Absent | **HAUT** |
| Cross-sell | "Complète ta commande" | ❌ Absent | MOYEN |
| Trust badges | Livraison, retours, sécurité | ❌ Uniquement footer | MOYEN |
| Message positif | "En stock" visible | ❌ Seulement négatifs | BAS |
| Édition quantité | +/- ou input | ✅ Présent | OK |
| Suppression item | Bouton visible | ✅ Optimistic UI | OK |
| Image produit | Visible pour chaque item | ✅ Présent | OK |
| Détails variante | Couleur, taille, etc. | ✅ Affiché | OK |

---

## 3.9 Code Promo

### Audit Synclune - Promo

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Champ code promo | Visible au checkout | ❌ Absent | MOYEN |
| Application automatique | Meilleur code appliqué | ❌ N/A | - |
| Intégration Stripe | Coupons Stripe | ❌ Non implémenté | MOYEN |

---

# PARTIE 4 : MOBILE UX

## 4.1 Navigation Mobile

### Guidelines Baymard

**24% seulement** des sites gèrent correctement la navigation mobile multi-niveaux.

**"View All" obligatoire** :
- À chaque niveau hiérarchique
- Placer AU TOP de la liste (pas en bas)
- Permet accès listes complètes sans naviguer dans sous-menus

### Audit Synclune - Navigation

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Menu hamburger | Clair et accessible | ✅ MenuSheet | OK |
| "View All" chaque niveau | Au top des listes | ⚠️ À vérifier | MOYEN |
| Breadcrumbs mobile | Visibles | ❌ hidden sm:block | **HAUT** |
| Sous-catégories | Drill-down fluide | ⚠️ Modal-based | MOYEN |

---

## 4.2 Touch Targets

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites avec problèmes touch sizing | 84% |
| Sites "très mauvais" performance | 48% |
| Users abandonnant pour usability issues | 63% |
| Minimum hit area | 7mm × 7mm (≈44px) |

### Audit Synclune - Touch

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Boutons 44px minimum | WCAG 2.5.5 | ✅ Respecté | OK |
| Espacement boutons | Éviter taps accidentels | ⚠️ À vérifier | BAS |
| Icons touch targets | Zone cliquable étendue | ⚠️ Certains icons petits | MOYEN |

---

## 4.3 Touch Keyboards

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites sans touch keyboards optimisés | 54% |
| Sites inconsistants dans checkout | 25% |
| Sites sans désactivation autocorrect | 87% |
| Sites sans bon keyboard layout | 63% |

**Spécifications HTML5** :

```html
<!-- Email -->
<input type="email" autocapitalize="off" autocorrect="off" />

<!-- Téléphone -->
<input type="tel" inputmode="tel" />

<!-- Numérique (ZIP, carte, CVV) -->
<input inputmode="decimal" pattern="[0-9]*" />

<!-- Nom/Adresse -->
<input autocorrect="off" />
```

### Audit Synclune - Keyboards

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| type="email" | Clavier avec @ | ⚠️ À vérifier | MOYEN |
| type="tel" | Clavier numérique | ⚠️ À vérifier | MOYEN |
| inputmode="decimal" | Pour ZIP, CVV | ⚠️ À vérifier | MOYEN |
| autocorrect="off" | Noms, adresses | ⚠️ À vérifier | MOYEN |
| autocomplete | Attributs HTML5 | ⚠️ À vérifier | BAS |

---

## 4.4 Galerie Mobile

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites sans thumbnails mobile | 76% |
| Sites sans gestes pinch/zoom | 40% |

**Problèmes avec dots** :
- Hit areas tiny et proches
- Users tappent le mauvais dot
- Taps accidentels sur image → overlay désorientant
- "Highly frustrating and inefficient"

**Comportement attendu** :
1. Swipe gesture par défaut
2. Thumbnails comme indicators (grands hit areas)
3. Support pinch-to-zoom
4. Enlarge overlay on request (pas accidentel)

### Audit Synclune - Galerie Mobile

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Vignettes mobile | Scrollables horizontalement | ❌ Dots seulement | **HAUT** |
| Swipe gesture | Navigation par défaut | ✅ Embla carousel | OK |
| Pinch-to-zoom | Geste attendu | ❌ Non implémenté | MOYEN |
| Double-tap zoom | Alternatif | ❌ Non implémenté | MOYEN |
| Hit areas | Assez grands | ⚠️ Dots petits | MOYEN |

---

## 4.5 Performance Perçue

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Users quittant si > 3 secondes | 40% |
| Users moins engagés si images lentes | 39% |
| Users quittant app pour poor performance | 90% |

**Stratégies** :
- Lazy-loading images
- Skeleton screens pendant chargement
- Afficher contenu critique en premier
- Feedback visuel pour toutes interactions

### Audit Synclune - Performance

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Lazy loading | Images below-fold | ✅ Implémenté | OK |
| Skeleton screens | Pendant chargement | ⚠️ Blur basique | BAS |
| Loading indicators | Feedback interactions | ✅ Présents | OK |
| Preload critical | Images above-fold | ✅ 4 premières | OK |

---

# PARTIE 5 : FORMULAIRES

## 5.1 Labels et Structure

### Guidelines Baymard

| Métrique | Valeur |
|----------|--------|
| Sites avec labels peu clairs | 92% |
| Sites ne marquant pas requis ET optionnel | 86% |

**Recommandations** :
- Labels contextuels ("Numéro de téléphone de livraison" vs "Téléphone")
- Marquer EXPLICITEMENT requis (*) ET optionnels
- Descriptions sous les labels pour aide contextuelle
- Single column sur mobile (éviter multi-colonnes)

### Audit Synclune - Labels

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| Labels contextuels | Spécifiques au contexte | ⚠️ Génériques | MOYEN |
| Required marqué | Astérisque visible | ✅ * rouge | OK |
| Optional marqué | "(Optionnel)" | ⚠️ Non explicite | BAS |
| Descriptions | Aide sous labels | ⚠️ Peu utilisé | BAS |
| Single column mobile | Pas multi-colonnes | ✅ Form components | OK |
| Labels au-dessus | Jamais à gauche mobile | ✅ Respecté | OK |

---

# PARTIE 6 : ACCESSIBILITÉ

### Audit Synclune - Accessibilité

| Critère | Recommandation | État Synclune | Écart |
|---------|----------------|---------------|-------|
| ARIA attributes | aria-label, aria-live | ✅ Bien implémenté | OK |
| Focus visible | ring-2 visible | ✅ focus-visible:ring | OK |
| Skip links | Sauter au contenu | ✅ Présent | OK |
| Reduced motion | Respecter préférence | ✅ useReducedMotion | OK |
| Focus trap modals | Confinement focus | ❌ Non mentionné | MOYEN |
| Lightbox keyboard | Escape, flèches | ⚠️ À vérifier | MOYEN |
| Color contrast | Ratio suffisant | ✅ Design system | OK |
| Alt text images | Descriptifs | ✅ IMAGE_SIZES config | OK |

---

# SYNTHÈSE DES ÉCARTS

## Écarts HAUTS (Impact Conversion Direct)

| # | Problème | Impact Baymard | Fichier Principal |
|---|----------|----------------|-------------------|
| 1 | Guest checkout pas proéminent | 24% abandons | `checkout-form.tsx` |
| 2 | Estimation frais port absente | 23% abandons | `cart-sheet.tsx` |
| 3 | Pas d'indicateur nombre résultats | Feedback filtres | `product-list.tsx` |
| 4 | Warnings stock mal positionnés | Visibilité critique | `cart-sheet.tsx` |
| 5 | Vignettes mobile absentes | 50-80% ignorent images | `gallery.tsx` |
| 6 | Breadcrumbs mobile cachés | Navigation | `page-header.tsx` |
| 7 | Pas d'update image sur hover couleur | 54% sites échouent | `product-card.tsx` |
| 8 | Structure highlights absente | 78% sites échouent | `product-details.tsx` |

## Écarts MOYENS (Bonnes Pratiques)

- Slider prix dual-thumb
- Cross-sell dans panier
- Trust badges dans panier
- Focus trap dans modals
- Pinch-zoom galerie
- Code promo checkout
- Search dans filtres
- Édition inline checkout
- Messages validation adaptatifs
- Touch keyboards optimisés
- Badge vidéo sur thumbnails
- "View All" dans navigation

## Écarts BAS (Polish)

- Message "En stock" positif
- Skeleton screens
- Tri par défaut visible
- Autocomplete attributes
- Descriptions sous labels
- Champs optionnels marqués

---

# STATISTIQUES BAYMARD CLÉS

| Métrique | Valeur |
|----------|--------|
| Taux abandon panier moyen | **70%** |
| Gain potentiel optimisation checkout | **+35%** conversion |
| Abandons si guest checkout caché | **24%** |
| Users intimidés par 10-15+ champs | **31%** |
| Sites avec filtres mal implémentés (mobile) | **78%** |
| Utilisateurs ignorant images sans vignettes | **50-80%** |
| Sites ne mettant pas à jour image sur couleur | **54%** |
| Sites avec mauvaise structure descriptions | **78%** |
| Sites avec messages validation génériques | **92%** |
| Sites perdant données après erreur | **34%** |
| Sites mobile avec UX "excellente" | **0%** |
| Users quittant si > 3 sec chargement | **40%** |

---

# RECOMMANDATIONS SPÉCIFIQUES BIJOUX

Baymard possède 470+ guidelines spécifiques pour Jewelry & Watches :

## Visuels (CRITIQUE)
- **8-12 images minimum** par produit
- **Mannequin main/poignet/cou** obligatoire
- Zoom haute résolution pour texture et détails
- Images "portées" par clients (preuve sociale)
- Images "In-Scale" avec référence taille

## Filtres Bijoux
- Matériau (or 18k, argent 925, plaqué, acier)
- Couleur métal (or jaune, or rose, argent)
- Prix (slider avec inputs)
- Type (bague, collier, boucles)
- Taille bague (avec guide international)

## Descriptions
- Processus artisanal visible ("Fait main")
- Certifications (GIA, etc.)
- Provenance éthique
- Matériaux détaillés avec icônes

## Checkout Petit Panier
- Taux panier moyen plus faible → **chaque friction compte**
- Guest checkout PRIORITAIRE
- Packaging premium mentionné
- Emballage cadeau option visible

---

# SOURCES BAYMARD

## Pages Produit
- [Product Page UX 2025](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
- [7 Types of Product Images](https://baymard.com/blog/ux-product-image-categories)
- [Structuring Descriptions by Highlights](https://baymard.com/blog/structure-descriptions-by-highlights)
- [Always Use Thumbnails for Additional Images](https://baymard.com/blog/always-use-thumbnails-additional-images)
- [Dynamic Color Thumbnails](https://baymard.com/blog/color-and-variation-searches)
- [In-Scale Product Images](https://baymard.com/blog/in-scale-product-images)
- [Product Page Recommendations](https://baymard.com/blog/product-page-suggestions)
- [Social Media Images on Product Pages](https://baymard.com/blog/integrate-social-media-visuals-on-product-page)

## Checkout
- [Checkout UX 2025](https://baymard.com/blog/current-state-of-checkout-ux)
- [Make Guest Checkout Prominent](https://baymard.com/blog/make-guest-checkout-prominent)
- [Checkout Form Fields Optimization](https://baymard.com/blog/checkout-flow-average-form-fields)
- [Adaptive Validation Error Messages](https://baymard.com/blog/adaptive-validation-error-messages)
- [Visually Reinforce Credit Card Fields](https://baymard.com/blog/visually-reinforce-sensitive-fields)
- [Accordion Checkout Usability](https://baymard.com/blog/accordion-checkout-usability)
- [Recoup Card Declined Abandonments](https://baymard.com/blog/credit-card-declined)

## Filtres
- [Product List & Filtering 2025](https://baymard.com/blog/current-state-product-list-and-filtering)
- [5 Essential Filter Types](https://baymard.com/blog/5-essential-filters)
- [Slider Interface Requirements](https://baymard.com/blog/slider-interfaces)
- [Applied Filters Display](https://baymard.com/blog/how-to-design-applied-filters)

## Mobile
- [Mobile E-Commerce UX](https://baymard.com/research/mcommerce-usability)
- [Mobile Touch Keyboards](https://baymard.com/blog/mobile-touch-keyboards)
- [Mobile Image Gestures](https://baymard.com/blog/mobile-image-gestures)
- [View All in Mobile Navigation](https://baymard.com/blog/mobile-main-nav-view-all)

## Formulaires
- [Form Design Best Practices](https://baymard.com/learn/form-design)
- [Required vs Optional Fields](https://baymard.com/blog/required-optional-form-fields)
- [Inline Form Validation](https://baymard.com/blog/inline-form-validation)

## Bijoux
- [Jewelry & Watches Research](https://baymard.com/research/jewelry-and-watches)
