# AUDIT UX BAYMARD COMPLET - SYNCLUNE

## Methodologie

**Source** : Baymard Institute - 200 000+ heures de recherche UX, 4 400+ sessions de tests utilisateurs, 325 sites e-commerce benchmarkes, 18 000+ scores d'usabilite.

**Contexte** : Baymard possede 470+ guidelines specifiques pour le secteur Jewelry & Watches.

---

# PARTIE 1 : PAGES PRODUIT

## 1.1 Galerie d'Images

### Guidelines Baymard - 7 Types d'Images Essentiels

| Type | Description | Importance Bijoux |
|------|-------------|-------------------|
| **Textural** | Gros plans extremes montrant textures et qualite d'assemblage | CRITIQUE |
| **Lifestyle** | Produit dans son contexte d'utilisation | HAUTE |
| **In-Scale** | Produit avec objet de reference pour taille | CRITIQUE |
| **Human Model** | Sur mannequin main/poignet/cou | CRITIQUE pour bijoux |
| **Angles** | Face, arriere, cote, 3/4 | HAUTE |
| **Customer** | Photos soumises par clients (preuve sociale) | HAUTE |
| **Variations** | Toutes les couleurs/finitions | MOYENNE |

### Statistiques Baymard

| Metrique | Valeur |
|----------|--------|
| Sites sans images "In-Scale" | 28% |
| Sites sans thumbnails mobile | 76% |
| Utilisateurs ignorant images sans vignettes | 50-80% |
| Sites avec zoom insuffisant | 25% |
| Sites sans gestes touch (pinch/zoom) | 40% |
| Sites avec troncature mal indiquee | 40% |

### Audit Synclune - Galerie

| Critere | Recommandation Baymard | Etat Synclune | Ecart |
|---------|------------------------|---------------|-------|
| Vignettes desktop | Toujours visibles | Presentes | OK |
| Vignettes mobile | Scrollables horizontalement | Dots seulement | **HAUT** |
| Swipe gesture | Navigation par defaut mobile | Embla carousel | OK |
| Pinch-to-zoom | Geste attendu sur mobile | Non implemente | **MOYEN** |
| Double-tap zoom | Alternatif au pinch | Non implemente | MOYEN |
| Troncature visible | Indicateur "+X images" clair | Counter "1/8" | OK |
| Hover zoom desktop | Details visibles | Implemente | OK |
| Lightbox | Vue agrandie | Implemente | OK |
| Lazy loading | Performance | Preload 4 premieres | OK |
| Hit areas thumbnails | Min 7mm x 7mm | A verifier | MOYEN |

### Recommandations Galerie

1. **PRIORITE HAUTE** : Remplacer dots par vignettes scrollables sur mobile
2. Implementer pinch-to-zoom natif
3. Creer checklist photo pour chaque produit (8-12 images min)
4. Ajouter images "In-Scale" (bijou sur main/doigt)

---

## 1.2 Videos Produit

### Guidelines Baymard

- 35% des sites gerent MAL le placement des videos
- Videos doivent etre **integrees dans la galerie** (pas separees)
- Icone "play" obligatoire sur thumbnails video
- Permettre replay ailleurs sur la page

### Audit Synclune - Videos

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Videos dans galerie | Melangees aux images | Supporte | OK |
| Badge "play" visible | Sur thumbnail | Pas de badge distinct | **MOYEN** |
| Indicateur video sur card | Dans liste produits | Absent | BAS |

---

## 1.3 Descriptions Produit - Structure par Highlights

### Guidelines Baymard

**78% des sites echouent** a structurer leurs descriptions correctement.

**Pattern "Highlights"** recommande :
```
[ICONE/IMAGE] + [TITRE FEATURE] + [TEXTE DESCRIPTIF]
```

**Avantages prouves** :
- Scan plus efficace
- Exploration plus profonde
- Engagement superieur
- Users lisent plus sans s'en rendre compte

### Audit Synclune - Descriptions

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Structure highlights | Feature + icone/image | ProductCharacteristics basique | **HAUT** |
| Chunking visuel | Sections avec images intercalees | Bloc texte | **HAUT** |
| Materiaux visibles | Or 18k, Argent 925 affiche | Via SKU attributes | OK |
| Provenance | "Fait main a..." | Non exploite | CONTENU |
| Certifications | GIA, labels visibles | Non exploite | CONTENU |

### Recommandations Descriptions

1. **PRIORITE HAUTE** : Refactorer en composant "Highlights" avec icones
2. Ajouter section storytelling "Fabrication artisanale"
3. Mettre en avant provenance et ethique

---

## 1.4 Selection de Variantes

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites sans boutons pour tailles | 28% |
| Sites ne mettant pas a jour image sur couleur | 54% |
| Sites sans synchronisation donnees cross-variantes | 28% |

**Recommandations** :
- Utiliser **BOUTONS** pour les tailles (pas dropdowns)
- Mise a jour dynamique de l'image principale au hover/selection couleur
- Synchroniser ratings/avis entre variantes du meme produit

### Audit Synclune - Variantes

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Swatches couleur visuels | Apercu hex visible | ColorSwatches | OK |
| Boutons pour tailles | Pas de dropdown | A verifier | MOYEN |
| Update image sur selection | Changer image principale | Pas d'update | **HAUT** |
| Update image sur hover | Preview avant selection | Absent | **HAUT** |
| Prix dynamique | Mise a jour animee | Animation | OK |
| Stock par variante | Disponibilite visible | Via SKU | OK |
| Sync donnees variantes | Ratings combines | Non applicable (pas d'avis) | N/A |

### Recommandations Variantes

1. **PRIORITE HAUTE** : Hover sur swatch -> preview image de cette couleur
2. Sur ProductCard dans liste : hover couleur -> change thumbnail

---

## 1.5 Prix et Promotions

### Guidelines Baymard

| Probleme | % Sites |
|----------|---------|
| Prix difficile a trouver | 18% desktop, 11% mobile |
| Promotions loin du prix | 14% |
| Descriptions promotions confuses | 19% |

**4 Erreurs a eviter** :
1. Confusion sur le montant economise
2. Placement eloigne du prix principal
3. Descriptions multiples de la meme promo
4. Masquage dans bannieres (banner blindness)

### Audit Synclune - Prix

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Prix barre visible | Strike-through lisible | compareAtPrice | OK |
| Badge promotion | "-X%" affiche | Badge promo | OK |
| Montant economise | "Economisez X" | Pas affiche | BAS |
| Urgence stock | "Plus que X en stock" | Amber badge | OK |
| Message positif | "En stock" visible | Non affiche si disponible | BAS |
| Promo proche du prix | Groupees ensemble | OK | OK |

---

## 1.6 Social Proof - Avis et Ratings

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites sans images soumises par clients | 67% |
| Sites sans distribution des ratings | 43% |
| Sites avec distribution non cliquable | 39% |

**Elements essentiels** :
- Score moyen + NOMBRE de ratings (contexte crucial)
- Distribution visuelle (barres 5, 4, 3...)
- Photos clients (preuve sociale visuelle)
- Images reseaux sociaux (Instagram, etc.)

### Audit Synclune - Avis

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Systeme d'avis | Avec upload photos | Absent | **HAUT** |
| Score + nombre | "4.5/5 (127 avis)" | N/A | - |
| Distribution ratings | Barres visuelles | N/A | - |
| Photos clients | Sur page produit | N/A | - |
| Images Instagram | Integration sociale | Absent | MOYEN |

---

## 1.7 Cross-sell et Recommandations

### Guidelines Baymard

**58% des sites offrent seulement 1 type** de recommandations (severe limitation).

**2 Types necessaires** :
1. **Produits alternatifs** : Autres options similaires
2. **Produits supplementaires** : Accessoires complementaires

| Metrique | Valeur |
|----------|--------|
| Sites mal implementes | 58% |
| Cross-sells sans thumbnail | Ignores par users |
| Sites avec infos manquantes sur cross-sells | 68% |

**Informations requises sur cross-sells** :
- Thumbnail/image
- Titre produit
- Prix
- Rating
- Stock status
- Quick action (add to cart)

### Audit Synclune - Cross-sell

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Produits alternatifs | Section dediee | RelatedProducts existe | OK |
| Produits complementaires | "Complete le look" | Absent | MOYEN |
| Cross-sell dans panier | Suggestions | Absent | **MOYEN** |
| Infos completes | Image, prix, rating, stock | Partiel | MOYEN |

---

## 1.8 Bouton Add-to-Cart et CTA

### Guidelines Baymard

- **Styling unique** distinct des autres boutons
- **Sticky sur mobile** pour rester visible au scroll
- Min hit area **7mm x 7mm**
- Feedback visuel apres ajout

### Audit Synclune - CTA

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Styling distinctif | Bouton unique | Primary button | OK |
| Sticky mobile | Visible au scroll | StickyCartCTA | OK |
| Hit area suffisant | Min 44px | 44px | OK |
| Feedback apres ajout | Animation/toast | Toast + animation | OK |
| Etat dynamique | Transformer en quantite | Non implemente | BAS |

---

## 1.9 Free Shipping et Livraison

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites avec "Free shipping" seulement en banniere | 32% |
| Users manquant l'info (banner blindness) | 27% |
| Sites sans estimation frais visibles | 43% |

**Placement recommande** : Dans la section "Buy" pres du bouton Add-to-Cart, PAS seulement en header.

### Audit Synclune - Livraison

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Info livraison sur page produit | Pres du CTA | A verifier | MOYEN |
| Estimation frais | Avant checkout | "Au paiement" | **HAUT** |
| Seuil franco de port | "Livraison offerte des X" | A verifier | MOYEN |

---

## 1.10 Produits Out of Stock

### Guidelines Baymard

- "Out of Stock" simple = UX dead end
- 30% des users abandonnent vers concurrents
- **Recommandation** : Permettre commandes avec delai augmente

### Audit Synclune - Stock

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Alerte rupture visible | Message clair | Badge visible | OK |
| Notification retour stock | CTA "M'alerter" | StockNotificationForm existe mais peu visible | MOYEN |
| Commande en precommande | Delai augmente | Non implemente | BAS |

---

## 1.11 Layout Page Produit

### Guidelines Baymard

**A eviter** : Horizontal Tabs (28% des sites les utilisent)
- 27% des users overlooked le contenu cache en tabs
- Contenu souvent manque : reviews, specs, FAQs, cross-sells

**Layouts recommandes** :
1. One Long Page (scroll tout)
2. Sticky TOC (table des matieres)
3. Collapsed Sections (accordion)

### Audit Synclune - Layout

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Pas de horizontal tabs | Eviter ce pattern | Layout scrollable | OK |
| Contenu accessible | Pas cache en tabs | Visible | OK |
| Galerie sticky desktop | Visible au scroll | Implemente | OK |
| Sections collapsibles | Si contenu long | Partiel | BAS |

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

**Filtres specifiques bijoux** :
- Materiau (or 18k, argent 925, plaque, acier)
- Couleur metal (or jaune, or rose, argent)
- Type (bague, collier, boucles)
- Taille bague (avec guide international)
- Prix

### Audit Synclune - Filtres

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Filtre Prix | Obligatoire avec custom range | Min/Max | OK |
| Filtre Couleur | Avec swatches visuels | ColorSwatches | OK |
| Filtre Materiau | Pour bijoux | Present | OK |
| Filtre Taille | Pour bagues | A verifier | MOYEN |
| Multi-selection | OR entre valeurs meme type | Multi-select | OK |
| Truncate > 8 options | "Afficher plus" | Non verifie | MOYEN |
| Search dans filtres | Pour listes longues | Absent | MOYEN |

---

## 2.2 Slider de Prix

### Guidelines Baymard

**50%+ des test subjects** misinterpretent les dual-thumb sliders.

**5 Exigences pour sliders** :
1. **Guidance au clic** : Message explicatif si clic sans drag
2. **Text input fallback** : TOUJOURS accompagner d'inputs texte
3. **Echelle non-lineaire** : Linear scales "tres souvent inappropriees"
4. **Affichage valeurs clair** : Feedback immediat min/max
5. **Touch targets** : Handles suffisamment grands

**Pattern recommande** :
```
[Input Min] --------------- [Input Max]
      |-------- SLIDER --------|
```

### Audit Synclune - Slider Prix

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Slider dual-thumb | Visual intuitif | Inputs seulement | **MOYEN** |
| Text inputs | Fallback precis | Presents | OK |
| Echelle adaptee | Non-lineaire si skewed | N/A | - |
| Feedback valeurs | Immediat | Via inputs | OK |

---

## 2.3 Affichage des Resultats

### Guidelines Baymard

**68% desktop + 69% mobile** n'offrent pas tous les 4 tris essentiels :
1. Prix (asc/desc)
2. User Rating / Avis
3. Best-Selling
4. Newest

**80% des sites** n'affichent pas minimum 3 thumbnails en liste.

### Audit Synclune - Resultats

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Nombre de resultats | "X produits" visible | Pas affiche | **HAUT** |
| 4 options de tri | Prix, Rating, Bestsellers, Nouveaux | Partiel (pas de rating/bestsellers) | MOYEN |
| Tri actif visible | Montrer selection courante | Select non explicite | BAS |
| Loading state | Skeleton/blur | Blur basique | BAS |
| Badges filtres actifs | Chips supprimables | ProductFilterBadges | OK |
| "Clear All" button | Reset tous filtres | A verifier | MOYEN |

---

## 2.4 Cartes Produit

### Audit Synclune - Cards

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Quick add-to-cart | Visible hover/always | Hover desktop, toujours mobile | OK |
| Wishlist | Accessible | Optimistic UI | OK |
| Hover couleur -> image | Update dynamique | Image statique | **MOYEN** |
| Badge video | Indicateur si video | Absent | BAS |
| "X couleurs" | Lien vers produit | Affiche | OK |
| Min 3 thumbnails | Apercu variantes | 1 image | MOYEN |
| Badges stock | "Plus que X", "Rupture" | Implementes | OK |
| Badge promo | "-X%" | Implemente | OK |

---

## 2.5 Filtres Appliques

### Guidelines Baymard

**32% des sites** n'utilisent pas les best practices pour afficher les filtres appliques.

**Elements requis** :
- Overview visible des filtres actifs
- Bouton "X" sur chaque filtre
- "Clear All" pour reset
- Position originale conservee (97% des sites OK)

### Audit Synclune - Filtres Appliques

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Badges visibles | Chips supprimables | ProductFilterBadges | OK |
| Bouton X individuel | Sur chaque filtre | Present | OK |
| "Clear All" | Reset global | A verifier | MOYEN |
| Position originale | Filtre reste en place | OK | OK |

---

## 2.6 Filtres Mobile

### Guidelines Baymard

**78% des sites mobile** = "mediocre ou pire" pour filtres.

**15% des sites** ne permettent pas de selectionner plusieurs options du MEME type de filtre.

**Pattern recommande** : Sheet/Modal avec bouton "Apply"

### Audit Synclune - Filtres Mobile

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Interface Sheet/Modal | Separee de la liste | ProductFilterSheet | OK |
| Multi-selection meme type | OR entre valeurs | Implemente | OK |
| Bouton Apply | Confirmation des choix | Present | OK |
| Filtres promus | Inline sur liste | Tous dans sheet | MOYEN |
| Scroll horizontal badges | Espace optimise | A verifier | BAS |

---

# PARTIE 3 : PANIER & CHECKOUT

## 3.1 Guest Checkout

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites cachant guest checkout | 62% |
| Sites rendant navigation difficile | 44% |
| Users abandonnant si forced account | 19% |
| Users mobile avec difficulte a identifier | 60% |

**Recommandations** :
- **BOUTON** visible (pas lien texte)
- Etiquetage explicite : "Guest Checkout" ou "Continuer sans compte"
- Positionner AU-DESSUS ou A COTE de l'option connexion
- Ne JAMAIS redemander creation compte pendant le flow

**Pattern mobile** : Effondrer tout le contenu, montrer 3 en-tetes cliquables (Sign-in, Create, Guest)

### Audit Synclune - Guest Checkout

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Option visible | Bouton proéminent | Flow implicite | **HAUT** |
| Libelle explicite | "Continuer sans compte" | Pas de CTA clair | **HAUT** |
| Position | Au-dessus ou a cote connexion | Non structure | **HAUT** |
| Pas de redemande | Une seule fois | A verifier | MOYEN |

---

## 3.2 Nombre de Champs

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Nombre optimal | 6-8 champs |
| Moyenne actuelle (2024) | 11.3 champs |
| Users abandonnant pour complexite | 18% |
| Users intimides par 10-15+ champs | 31% |
| Reduction possible | 20-60% |

**Champs essentiels** :
1. Email
2. Prenom
3. Nom
4. Adresse
5. Ville/CP
6. Numero carte
7. Expiration
8. CVV

**Techniques de reduction** :
- Masquer champs optionnels derriere "Afficher plus"
- Auto-completion d'adresses
- Pre-remplir pays par defaut (IP)
- Billing = Shipping par defaut (masquer, pas pre-remplir)

### Audit Synclune - Champs Checkout

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Nombre de champs | Max 8 | A compter precisement | MOYEN |
| Champs optionnels masques | Derriere lien | A verifier | MOYEN |
| Billing = Shipping | Checkbox par defaut + masquage | A verifier | MOYEN |
| Auto-completion adresse | Google Places ou similaire | Non implemente | MOYEN |
| Pre-remplissage pays | Via IP ou profil | A verifier | BAS |

---

## 3.3 Validation des Formulaires

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites sans validation inline | 31% |
| Sites avec messages adaptatifs | 2% |
| Sites avec messages generiques | 92% |
| Sites ne marquant pas requis/optionnel | 86% |

**Timing de validation** :
- Ne PAS valider avant fin de saisie
- Validation inline APRES completion du champ
- Feedback immediat positif

**Messages adaptatifs** (exemples) :
- "Cette adresse email manque le domaine (comme '.com')"
- "Cette adresse email manque le caractere @"

### Audit Synclune - Validation

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Validation inline | Apres completion champ | onChange validator | OK |
| Messages adaptatifs | Specifiques a l'erreur | Zod generiques | MOYEN |
| Champs requis marques | Asterisque + legende | * rouge | OK |
| Champs optionnels marques | "(Optionnel)" | Pas explicite | BAS |
| Focus premier champ invalide | Scroll automatique | Non implemente | MOYEN |
| Email avec + accepte | jean+test@gmail.com | A verifier | MOYEN |
| Validation Luhn (carte) | Check numero valide | Via Stripe | OK |

---

## 3.4 Trust Signals et Securite

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites avec mauvaise distinction visuelle carte | 89% |
| Users abandonnant pour manque confiance | 18% |

**Badges les plus fiables** :
- Norton : Top choix
- McAfee : ~23% confiance
- TRUSTe / BBB : ~13% chacun

**Placement critique** : A PROXIMITE IMMEDIATE des champs de carte

**Elements de reassurance** :
- Bordure/fond distinct autour champs carte
- Texte "Vos informations sont securisees"
- Icone cadenas
- "Securise par [Provider]"
- Mention SSL/TLS

### Audit Synclune - Trust Signals

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Message securite | Pres des champs carte | Message Stripe | OK |
| Badge securite | A cote des champs | Stripe embedded | OK |
| Distinction visuelle | Fond/bordure unique | Via Stripe embedded | OK |
| Icone cadenas | Visible | Via Stripe | OK |
| Trust badges globaux | Dans panier | Uniquement footer | MOYEN |

---

## 3.5 Progress Indicators

### Guidelines Baymard

**Best practice** : Toujours effondrer les etapes completees en resumes.

**Etapes typiques** :
1. Cart
2. Shipping Address
3. Shipping Methods
4. Payment
5. Order Review

**Probleme mobile** : Confusion "Confirm Order" vs "Order Confirmation" -> jusqu'a 10% d'abandons

### Audit Synclune - Progress

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Etapes visibles | Timeline/breadcrumbs | 2 etapes (adresse -> paiement) | OK |
| Resumes etapes completees | Effondrer en compact | Partiel | MOYEN |
| Distinction confirm/confirmation | Visuellement different | A verifier | MOYEN |

---

## 3.6 Gestion des Erreurs

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites perdant donnees carte apres erreur | 34% |
| Ventes recuperables avec alternative paiement | 30% |

**Strategies** :
- Offrir alternative (PayPal) si carte declinee
- CONSERVER donnees saisies apres erreur
- Stocker temporairement en localStorage
- Messages d'erreur clairs et actionnables

### Audit Synclune - Erreurs

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Donnees conservees apres erreur | Pas de reset | A verifier | MOYEN |
| Alternative paiement | PayPal, Apple Pay | A verifier options Stripe | MOYEN |
| Message erreur actionnable | Clair et specifique | Via Stripe | OK |

---

## 3.7 Order Summary

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites mobile sans total avant paiement | 33% |

**Elements a afficher DES LE DEBUT** :
- Nombre d'articles
- Subtotal
- Frais d'expedition (estimes)
- Taxes
- Total final
- Adresse de livraison (une fois saisie)

### Audit Synclune - Summary

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Recapitulatif visible | Sticky sur desktop | CheckoutSummary | OK |
| Total avant paiement | Visible des le debut | Affiche | OK |
| Frais port estimes | Avant saisie adresse | "Au paiement" | **HAUT** |
| Details articles | Images, quantites, prix | Presents | OK |

---

## 3.8 Panier (CartSheet)

### Audit Synclune - Panier

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Quantite totale visible | Badge bold | Petit "(n) articles" | BAS |
| Warnings stock position | En HAUT | En bas apres scroll | **HAUT** |
| Estimation frais port | Avant checkout | Absent | **HAUT** |
| Cross-sell | "Complete ta commande" | Absent | MOYEN |
| Trust badges | Livraison, retours, securite | Uniquement footer | MOYEN |
| Message positif | "En stock" visible | Seulement negatifs | BAS |
| Edition quantite | +/- ou input | Present | OK |
| Suppression item | Bouton visible | Optimistic UI | OK |
| Image produit | Visible pour chaque item | Present | OK |
| Details variante | Couleur, taille, etc. | Affiche | OK |

---

## 3.9 Code Promo

### Audit Synclune - Promo

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Champ code promo | Visible au checkout | Absent | MOYEN |
| Application automatique | Meilleur code applique | N/A | - |
| Integration Stripe | Coupons Stripe | Non implemente | MOYEN |

---

# PARTIE 4 : MOBILE UX

## 4.1 Navigation Mobile

### Guidelines Baymard

**24% seulement** des sites gerent correctement la navigation mobile multi-niveaux.

**"View All" obligatoire** :
- A chaque niveau hierarchique
- Placer AU TOP de la liste (pas en bas)
- Permet acces listes completes sans naviguer dans sous-menus

### Audit Synclune - Navigation

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Menu hamburger | Clair et accessible | MenuSheet | OK |
| "View All" chaque niveau | Au top des listes | A verifier | MOYEN |
| Breadcrumbs mobile | Visibles | hidden sm:block | **HAUT** |
| Sous-categories | Drill-down fluide | Modal-based | MOYEN |

---

## 4.2 Touch Targets

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites avec problemes touch sizing | 84% |
| Sites "tres mauvais" performance | 48% |
| Users abandonnant pour usability issues | 63% |
| Minimum hit area | 7mm x 7mm (~44px) |

### Audit Synclune - Touch

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Boutons 44px minimum | WCAG 2.5.5 | Respecte | OK |
| Espacement boutons | Eviter taps accidentels | A verifier | BAS |
| Icons touch targets | Zone cliquable etendue | Certains icons petits | MOYEN |

---

## 4.3 Touch Keyboards

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites sans touch keyboards optimises | 54% |
| Sites inconsistants dans checkout | 25% |
| Sites sans desactivation autocorrect | 87% |
| Sites sans bon keyboard layout | 63% |

**Specifications HTML5** :

```html
<!-- Email -->
<input type="email" autocapitalize="off" autocorrect="off" />

<!-- Telephone -->
<input type="tel" inputmode="tel" />

<!-- Numerique (ZIP, carte, CVV) -->
<input inputmode="decimal" pattern="[0-9]*" />

<!-- Nom/Adresse -->
<input autocorrect="off" />
```

### Audit Synclune - Keyboards

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| type="email" | Clavier avec @ | A verifier | MOYEN |
| type="tel" | Clavier numerique | A verifier | MOYEN |
| inputmode="decimal" | Pour ZIP, CVV | A verifier | MOYEN |
| autocorrect="off" | Noms, adresses | A verifier | MOYEN |
| autocomplete | Attributs HTML5 | A verifier | BAS |

---

## 4.4 Galerie Mobile

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites sans thumbnails mobile | 76% |
| Sites sans gestes pinch/zoom | 40% |

**Problemes avec dots** :
- Hit areas tiny et proches
- Users tappent le mauvais dot
- Taps accidentels sur image -> overlay desorientant
- "Highly frustrating and inefficient"

**Comportement attendu** :
1. Swipe gesture par defaut
2. Thumbnails comme indicators (grands hit areas)
3. Support pinch-to-zoom
4. Enlarge overlay on request (pas accidentel)

### Audit Synclune - Galerie Mobile

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Vignettes mobile | Scrollables horizontalement | Dots seulement | **HAUT** |
| Swipe gesture | Navigation par defaut | Embla carousel | OK |
| Pinch-to-zoom | Geste attendu | Non implemente | MOYEN |
| Double-tap zoom | Alternatif | Non implemente | MOYEN |
| Hit areas | Assez grands | Dots petits | MOYEN |

---

## 4.5 Performance Percue

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Users quittant si > 3 secondes | 40% |
| Users moins engages si images lentes | 39% |
| Users quittant app pour poor performance | 90% |

**Strategies** :
- Lazy-loading images
- Skeleton screens pendant chargement
- Afficher contenu critique en premier
- Feedback visuel pour toutes interactions

### Audit Synclune - Performance

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Lazy loading | Images below-fold | Implemente | OK |
| Skeleton screens | Pendant chargement | Blur basique | BAS |
| Loading indicators | Feedback interactions | Presents | OK |
| Preload critical | Images above-fold | 4 premieres | OK |

---

# PARTIE 5 : FORMULAIRES

## 5.1 Labels et Structure

### Guidelines Baymard

| Metrique | Valeur |
|----------|--------|
| Sites avec labels peu clairs | 92% |
| Sites ne marquant pas requis ET optionnel | 86% |

**Recommandations** :
- Labels contextuels ("Numero de telephone de livraison" vs "Telephone")
- Marquer EXPLICITEMENT requis (*) ET optionnels
- Descriptions sous les labels pour aide contextuelle
- Single column sur mobile (eviter multi-colonnes)

### Audit Synclune - Labels

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| Labels contextuels | Specifiques au contexte | Generiques | MOYEN |
| Required marque | Asterisque visible | * rouge | OK |
| Optional marque | "(Optionnel)" | Non explicite | BAS |
| Descriptions | Aide sous labels | Peu utilise | BAS |
| Single column mobile | Pas multi-colonnes | Form components | OK |
| Labels au-dessus | Jamais a gauche mobile | Respecte | OK |

---

# PARTIE 6 : ACCESSIBILITE

### Audit Synclune - Accessibilite

| Critere | Recommandation | Etat Synclune | Ecart |
|---------|----------------|---------------|-------|
| ARIA attributes | aria-label, aria-live | Bien implemente | OK |
| Focus visible | ring-2 visible | focus-visible:ring | OK |
| Skip links | Sauter au contenu | Present | OK |
| Reduced motion | Respecter preference | useReducedMotion | OK |
| Focus trap modals | Confinement focus | Non mentionne | MOYEN |
| Lightbox keyboard | Escape, fleches | A verifier | MOYEN |
| Color contrast | Ratio suffisant | Design system | OK |
| Alt text images | Descriptifs | IMAGE_SIZES config | OK |

---

# SYNTHESE DES ECARTS

## Ecarts HAUTS (Impact Conversion Direct)

| # | Probleme | Impact Baymard | Fichier Principal |
|---|----------|----------------|-------------------|
| 1 | Guest checkout pas proéminent | 24% abandons | `checkout-form.tsx` |
| 2 | Estimation frais port absente | 23% abandons | `cart-sheet.tsx` |
| 3 | Pas d'indicateur nombre resultats | Feedback filtres | `product-list.tsx` |
| 4 | Warnings stock mal positionnes | Visibilite critique | `cart-sheet.tsx` |
| 5 | Vignettes mobile absentes | 50-80% ignorent images | `gallery.tsx` |
| 6 | Breadcrumbs mobile caches | Navigation | `page-header.tsx` |
| 7 | Pas d'update image sur hover couleur | 54% sites echouent | `product-card.tsx` |
| 8 | Structure highlights absente | 78% sites echouent | `product-details.tsx` |

## Ecarts MOYENS (Bonnes Pratiques)

- Slider prix dual-thumb
- Cross-sell dans panier
- Trust badges dans panier
- Focus trap dans modals
- Pinch-zoom galerie
- Code promo checkout
- Search dans filtres
- Edition inline checkout
- Messages validation adaptatifs
- Touch keyboards optimises
- Badge video sur thumbnails
- "View All" dans navigation

## Ecarts BAS (Polish)

- Message "En stock" positif
- Skeleton screens
- Tri par defaut visible
- Autocomplete attributes
- Descriptions sous labels
- Champs optionnels marques

---

# STATISTIQUES BAYMARD CLES

| Metrique | Valeur |
|----------|--------|
| Taux abandon panier moyen | **70%** |
| Gain potentiel optimisation checkout | **+35%** conversion |
| Abandons si guest checkout cache | **24%** |
| Users intimides par 10-15+ champs | **31%** |
| Sites avec filtres mal implementes (mobile) | **78%** |
| Utilisateurs ignorant images sans vignettes | **50-80%** |
| Sites ne mettant pas a jour image sur couleur | **54%** |
| Sites avec mauvaise structure descriptions | **78%** |
| Sites avec messages validation generiques | **92%** |
| Sites perdant donnees apres erreur | **34%** |
| Sites mobile avec UX "excellente" | **0%** |
| Users quittant si > 3 sec chargement | **40%** |

---

# RECOMMANDATIONS SPECIFIQUES BIJOUX

Baymard possede 470+ guidelines specifiques pour Jewelry & Watches :

## Visuels (CRITIQUE)
- **8-12 images minimum** par produit
- **Mannequin main/poignet/cou** obligatoire
- Zoom haute resolution pour texture et details
- Images "portees" par clients (preuve sociale)
- Images "In-Scale" avec reference taille

## Filtres Bijoux
- Materiau (or 18k, argent 925, plaque, acier)
- Couleur metal (or jaune, or rose, argent)
- Prix (slider avec inputs)
- Type (bague, collier, boucles)
- Taille bague (avec guide international)

## Descriptions
- Processus artisanal visible ("Fait main")
- Certifications (GIA, etc.)
- Provenance ethique
- Materiaux detailles avec icones

## Checkout Petit Panier
- Taux panier moyen plus faible -> **chaque friction compte**
- Guest checkout PRIORITAIRE
- Packaging premium mentionne
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
