# Rapport d'Audit UX/UI - Synclune
## Basé sur les meilleures pratiques Baymard Institute & Arounda Agency 2025

**Date :** 24 décembre 2024
**Scope :** Checkout/Conversion, Pages produits, Mobile UX, Accessibilité
**Exclusions :** Système d'avis (reporté), Bottom navigation (garder hamburger)

---

## SYNTHÈSE EXÉCUTIVE

| Domaine | Score | Statut |
|---------|-------|--------|
| Navigation | 85% | Bon |
| Recherche & Filtres | 80% | Bon |
| Pages Produits | 70% | À améliorer |
| Checkout | 90% | Excellent |
| Mobile UX | 85% | Bon |
| Accessibilité | 75% | À améliorer |

**Score global : 81%** - Supérieur à la moyenne des sites e-commerce (67% échouent selon Baymard)

---

## 1. CHECKOUT & CONVERSION (Score: 90%)

### Points conformes

| Critère | Statut | Fichier |
|---------|--------|---------|
| Guest checkout supporté | OK | `checkout-form.tsx` |
| Nombre de champs optimal (8-10 vs 11-12 recommandés) | OK | `checkout-schema.ts` |
| Validation inline avec Zod | OK | `checkout-form.tsx:validation` |
| Messages d'erreur spécifiques | OK | Ex: "min 2 caractères" |
| Autocomplete HTML5 | OK | `given-name`, `address-line1`, etc. |
| Labels au-dessus des champs | OK | `FieldLabel` composant |
| Progressive disclosure | OK | Adresse ligne 2 + pays masqués |
| 2 étapes claires (Adresse → Paiement) | OK | `checkout-container.tsx` |
| Bouton CTA sticky mobile | OK | Footer fixe |
| Explication téléphone | OK | "Pour les problèmes de livraison" |
| Badge sécurité Stripe | OK | Shield + "Paiement sécurisé" |
| SSL mentionné | OK | "Informations protégées par SSL" |

### Points à améliorer

| Problème | Impact | Recommandation | Fichier |
|----------|--------|----------------|---------|
| **Input mask téléphone absent** | 64% des sites échouent | Formater avec espaces/tirets selon pays | `phone-field.tsx` |
| **Pas d'auto-détection type carte visible** | Stripe le gère en interne mais non visible | Afficher logo carte détectée avant Stripe | `checkout-summary.tsx` |
| **Méthodes de paiement non listées avant checkout** | 11% abandons si méthode absente | Icônes Visa/MC/Apple Pay sur page panier | `cart-sheet.tsx` |

### Recommandations prioritaires

1. **Ajouter icônes moyens de paiement sur la page panier**
   - Fichier: `modules/cart/components/cart-sheet.tsx`
   - Position: Avant le bouton "Aller au paiement"
   - Icônes: Visa, Mastercard, CB, Apple Pay, Google Pay

2. **Input mask téléphone international**
   - Fichier: `shared/components/forms/phone-field.tsx`
   - Utiliser: react-phone-number-input déjà installé
   - Formater selon le pays sélectionné

---

## 2. PAGES PRODUITS (Score: 70%)

### Points conformes

| Critère | Statut | Fichier |
|---------|--------|---------|
| Sections collapsibles (pas d'onglets) | OK | `product-care-info.tsx` (Accordéon) |
| Galerie avec vignettes verticales | OK | `gallery.tsx` |
| Zoom/Lightbox | OK | `media-lightbox.tsx` |
| Compteur images visible | OK | "4/12" |
| Swipe mobile + dots | OK | Embla Carousel |
| Variantes synchronisées URL | OK | `?color=rouge&size=55` |
| Stock warnings | OK | "Plus que X en stock" |
| Prix animé au changement | OK | Framer Motion |
| Sélecteurs visuels (swatches) | OK | Pas de dropdowns |

### Points manquants critiques

| Problème | Impact | Stat Baymard | Fichier concerné |
|----------|--------|--------------|------------------|
| **Image lifestyle absente** | Contexte d'utilisation manquant | Recommandé pour bijoux | Contenu à ajouter |
| **Highlights description** | Scanabilité réduite | 78% ne le font pas | `product-info.tsx` |
| **3+ vignettes sur liste produits** | Exploration limitée | 80% échouent | `product-card.tsx` |

### Points à améliorer

| Problème | Recommandation | Fichier |
|----------|----------------|---------|
| Descriptions non structurées | Ajouter bullet points "highlights" au-dessus | `product-info.tsx` |
| Pas de table de tailles | Ajouter modal/tooltip avec guide tailles | `size-selector.tsx` |
| Vignettes carousel masquent contenu | Montrer 3 images minimum sur ProductCard | `product-card.tsx` |

### Recommandations prioritaires

1. **Images "In Scale" - CRITIQUE**
   - Ajouter une image de bijou porté ou avec référence taille (pièce, main)
   - Type d'image à taguer dans le CMS/upload
   - Fichier: `modules/media/types/media.types.ts` (ajouter type IN_SCALE)
   - Afficher en priorité dans la galerie

2. **Highlights produit**
   - Fichier: `modules/products/components/product-info.tsx`
   - Extraire 3-5 points clés de la description
   - Afficher en bullet points avant la description complète
   - Format: icône + texte court (ex: "Argent 925", "Fait main")

3. **Guide des tailles**
   - Fichier: `modules/skus/components/size-selector.tsx`
   - Ajouter bouton "Guide des tailles" avec modal
   - Contenu: tableau tailles + instructions mesure

---

## 3. MOBILE UX (Score: 85%)

### Points conformes

| Critère | Statut | Fichier |
|---------|--------|---------|
| Touch targets 44x44px | OK | `size-11` partout |
| Safe areas iOS | OK | `env(safe-area-inset-*)` |
| Menu mobile scrollable | OK | `menu-sheet.tsx` |
| Drawer patterns | OK | Panier, Filtres, Menu |
| Navigation clavier recherche | OK | Arrow Up/Down, Escape |
| Labels au-dessus des champs | OK | Standard forms |
| Blur placeholders images | OK | `blurDataUrl` |

### Points à améliorer

| Problème | Impact | Fichier | Solution |
|----------|--------|---------|----------|
| **Keyboard numeric manquant** | Mauvais clavier affiché | `checkout-form.tsx` | `inputMode="numeric"` sur code postal |
| **Autocorrect non désactivé** | 87% échouent | `input-field.tsx` | `autoCorrect="off"` sur noms/adresses |
| **Scope contexte liens mobile** | Vision tunnel | `menu-sheet.tsx` | Préfixer liens avec catégorie parent |

### Recommandations prioritaires

1. **Optimiser inputMode par type de champ**
   - Code postal: `inputMode="numeric"` (pas "text")
   - Téléphone: `inputMode="tel"` (déjà OK via phone-field)
   - Email: `inputMode="email"` (déjà OK)
   - Fichier: `modules/payments/components/checkout-form.tsx`

2. **Désactiver autocorrect sur champs sensibles**
   - Prénom, Nom, Adresse, Code promo
   - Ajouter: `autoCorrect="off" autoCapitalize="words"`
   - Fichier: `shared/components/forms/input-field.tsx` (prop par défaut selon type)

3. **Améliorer contexte mobile**
   - "Bagues" → "Les créations > Bagues"
   - Fichier: `app/(boutique)/(accueil)/_components/navbar/menu-sheet.tsx`

---

## 4. ACCESSIBILITÉ (Score: 75%)

### Points conformes

| Critère | Statut | Fichier |
|---------|--------|---------|
| ARIA roles sur autocomplete | OK | `combobox`, `listbox`, `option` |
| Live regions | OK | `aria-live="polite"` |
| fieldset/legend radio groups | OK | Variantes produit |
| aria-describedby erreurs | OK | `${field.name}-error` |
| Focus visible styles | OK | Ring outlines |
| Breadcrumbs Schema.org | OK | JSON-LD SEO |
| Skip links | OK | Carousel collections |
| Reduced motion support | OK | `useReducedMotion()` |

### Points à auditer/améliorer

| Problème | Impact WCAG | Fichier | Solution |
|----------|-------------|---------|----------|
| **ALT text images** | 55% manquent d'ALT | `gallery.tsx` | Auditer chaque image, ALT descriptif |
| **Ordre de focus** | 30% échouent | Global | Tester navigation Tab |
| **Contraste couleurs** | Non vérifié | Tailwind config | Audit avec axe-core |
| **Texte 80 chars/ligne** | Lisibilité | `prose` classes | Vérifier `max-w-prose` |
| **Hauteur ligne 1.5em** | Lisibilité | Tailwind | `leading-relaxed` partout |

### Points critiques European Accessibility Act 2025

| Exigence | Statut | Action requise |
|----------|--------|----------------|
| Navigation clavier complète | À tester | Audit Tab navigation toutes pages |
| Compatibilité lecteurs d'écran | À tester | Test avec VoiceOver/NVDA |
| Text-to-speech | À valider | Vérifier order lecture logique |

### Recommandations prioritaires

1. **Audit ALT text systématique**
   - Toutes les images produits doivent avoir un ALT descriptif
   - Format: "[Type bijou] [Matériau] [Couleur] - Vue [angle]"
   - Fichier: `modules/media/components/gallery.tsx` (prop alt obligatoire)
   - Fichier: `modules/products/components/product-card.tsx`

2. **Test navigation clavier**
   - Parcourir tout le site avec Tab uniquement
   - Vérifier focus visible sur chaque élément interactif
   - Corriger l'ordre de focus si illogique
   - Outil: axe DevTools extension

3. **Contraste couleurs**
   - Audit avec Lighthouse Accessibility
   - Vérifier ratio 4.5:1 pour texte normal
   - Vérifier ratio 3:1 pour texte large
   - Fichier: `tailwind.config.ts` (couleurs theme)

---

## 5. RECHERCHE & FILTRES (Score: 80%)

### Points conformes

| Critère | Statut |
|---------|--------|
| 4/5 filtres essentiels (Prix, Couleur, Matériau, Type) | OK |
| Autocomplétion avec debounce 300ms | OK |
| Filtres appliqués visibles (badges) | OK |
| Suppression individuelle filtres | OK |
| Sidebar verticale (accordéon) | OK |
| URL state synchronisé | OK |
| Recherche fuzzy (pg_trgm) | OK |

### Points à améliorer

| Problème | Fichier | Solution |
|----------|---------|----------|
| **Pas de filtres thématiques** | `product-filter-sheet.tsx` | Ajouter "Occasions", "Style" |
| **Scope catégorie dans autocomplete** | `autocomplete.tsx` | Afficher type produit |

---

## 6. NAVIGATION (Score: 85%)

### Points conformes

| Critère | Statut |
|---------|--------|
| Touch targets 44px | OK |
| Breadcrumbs SEO | OK |
| Safe areas iOS | OK |
| Menu mobile scrollable | OK |

### Point à améliorer

| Problème | Fichier | Solution |
|----------|---------|----------|
| **Hover delay trop court (200ms)** | `desktop-nav.tsx:57` | Passer à 300-400ms |

---

## MATRICE DE PRIORISATION

### Impact élevé / Effort faible (Quick Wins)

| Action | Fichier | Temps estimé |
|--------|---------|--------------|
| Ajouter icônes paiement sur panier | `cart-sheet.tsx` | 15 min |
| Hover delay 200→300ms | `desktop-nav.tsx:57` | 2 min |
| inputMode="numeric" code postal | `checkout-form.tsx` | 5 min |
| autoCorrect="off" sur noms | `input-field.tsx` | 10 min |

### Impact élevé / Effort moyen

| Action | Fichier | Temps estimé |
|--------|---------|--------------|
| Highlights produit (bullet points) | `product-info.tsx` | 1h |
| Guide des tailles modal | `size-selector.tsx` | 2h |
| Input mask téléphone | `phone-field.tsx` | 1h |
| Audit ALT text images | `gallery.tsx`, `product-card.tsx` | 2h |

### Impact élevé / Effort élevé

| Action | Fichier | Temps estimé |
|--------|---------|--------------|
| Images "In Scale" | CMS + `gallery.tsx` | 4h+ (contenu) |
| Audit accessibilité complet | Global | 1 jour |
| Filtres thématiques | `product-filter-sheet.tsx` + DB | 4h |

---

## FICHIERS CLÉS PAR DOMAINE

### Checkout
- `modules/payments/components/checkout-form.tsx`
- `modules/payments/components/checkout-container.tsx`
- `modules/payments/components/checkout-summary.tsx`
- `modules/payments/schemas/checkout-schema.ts`
- `modules/cart/components/cart-sheet.tsx`
- `shared/components/forms/phone-field.tsx`

### Pages Produits
- `app/(boutique)/creations/[slug]/page.tsx`
- `modules/media/components/gallery.tsx`
- `modules/products/components/product-info.tsx`
- `modules/products/components/product-details.tsx`
- `modules/products/components/product-card.tsx`
- `modules/skus/components/size-selector.tsx`
- `modules/skus/components/sku-selector-dialog.tsx`

### Mobile UX
- `app/(boutique)/(accueil)/_components/navbar/menu-sheet.tsx`
- `shared/components/forms/input-field.tsx`
- `shared/components/autocomplete/autocomplete.tsx`

### Accessibilité
- `shared/components/forms/input-field.tsx`
- `modules/media/components/gallery.tsx`
- `tailwind.config.ts`
- Tous les composants interactifs

### Navigation
- `app/(boutique)/(accueil)/_components/navbar/desktop-nav.tsx`
- `shared/components/page-header.tsx`

---

## CONCLUSION

Synclune obtient un score de **81%**, supérieur à la moyenne du secteur. Les points forts sont :
- Checkout optimisé (90%) avec validation et UX soignée
- Mobile-first bien exécuté (85%)
- Recherche et filtres fonctionnels (80%)

Les axes d'amélioration prioritaires :
1. **Images produits** - Ajouter images "In Scale" et lifestyle
2. **Accessibilité** - Audit ALT text et navigation clavier
3. **Quick wins** - Icônes paiement, hover delay, inputMode

Le système d'avis clients, bien que critique (95% des utilisateurs s'y fient), est reporté à une phase ultérieure.

---

*Audit réalisé le 24 décembre 2024*
*Basé sur les meilleures pratiques UX/UI e-commerce 2025 (Baymard Institute, Arounda Agency)*
