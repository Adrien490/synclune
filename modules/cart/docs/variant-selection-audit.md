# Audit : Sélection de variantes sur ProductCard

> **Date** : Décembre 2024
> **Scope** : `ProductCard` + `AddToCartCardButton`
> **Status** : Audit technique - Recommandations

---

## Table des matières

1. [Contexte et problème](#contexte-et-problème)
2. [Architecture actuelle](#architecture-actuelle)
3. [Analyse des impacts](#analyse-des-impacts)
4. [Solutions comparées](#solutions-comparées)
5. [Recommandation](#recommandation)
6. [Architecture cible](#architecture-cible)
7. [Spécifications techniques](#spécifications-techniques)
8. [Références e-commerce](#références-e-commerce)

---

## Contexte et problème

### Problème identifié

Le composant `ProductCard` affiche un bouton d'ajout au panier via `AddToCartCardButton`, mais celui-ci ajoute **toujours le SKU primaire** sans permettre à l'utilisateur de choisir une variante (couleur, matière, taille).

### Comportement actuel

```
Utilisateur voit ProductCard
    ↓
Image : Bague Or Rose
    ↓
Click "Ajouter au panier"
    ↓
Ajout du SKU primaire (Or Rose, Taille 52)
    ↓
L'utilisateur voulait peut-être Argent, Taille 54
```

### Impact utilisateur

- L'utilisateur ne sait pas que d'autres variantes existent
- L'utilisateur ajoute un SKU qu'il n'a pas consciemment choisi
- L'utilisateur doit modifier son panier ou aller sur la page produit

---

## Architecture actuelle

### Flux de données

```
ProductList / LatestCreations / Collections
        │
        ▼
getPrimarySkuForList(product)
  ├── Priorité 1: isDefault = true
  ├── Priorité 2: En stock + prix le plus bas
  └── Priorité 3: Premier SKU actif
        │
        ▼
ProductCard(primarySkuId: string)
        │
        ▼
AddToCartCardButton(skuId: primarySkuId)
        │
        ▼
addToCart({ skuId, quantity: 1 })
```

### Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `modules/products/components/product-card.tsx` | Composant ProductCard |
| `modules/cart/components/add-to-cart-card-button.tsx` | Bouton simplifié (skuId uniquement) |
| `modules/cart/components/add-to-cart-button.tsx` | Bouton complet (page produit) |
| `modules/products/services/product-list-helpers.ts` | Sélection du SKU primaire |
| `modules/skus/services/filter-compatible-skus.ts` | Filtrage des variantes |
| `modules/skus/services/extract-sku-info.ts` | Extraction des variantes disponibles |

### Code source du problème

```typescript
// product-card.tsx:202-207
{primarySkuId && stockStatus === "in_stock" && (
  <AddToCartCardButton
    skuId={primarySkuId}  // ← Toujours le SKU primaire
    productTitle={title}
  />
)}
```

### Sélection du SKU primaire

```typescript
// product-list-helpers.ts - getPrimarySkuForList()
export function getPrimarySkuForList(product: ProductWithSkus): ProductSku | null {
  const activeSkus = product.skus.filter(sku => sku.isActive);

  // Priorité 1: SKU marqué comme défaut
  const defaultSku = activeSkus.find(sku => sku.isDefault);
  if (defaultSku) return defaultSku;

  // Priorité 2: SKU en stock avec prix le plus bas
  const inStockSkus = activeSkus.filter(sku => sku.inventory > 0);
  if (inStockSkus.length > 0) {
    return inStockSkus.reduce((min, sku) =>
      sku.priceInclTax < min.priceInclTax ? sku : min
    );
  }

  // Priorité 3: Premier SKU actif
  return activeSkus[0] || null;
}
```

---

## Analyse des impacts

### Impact UX / Conversion

| Impact | Sévérité | Description |
|--------|----------|-------------|
| **Perte de conversion** | Haute | L'utilisateur veut le rose, voit l'or, abandonne ou navigue ailleurs |
| **Friction utilisateur** | Haute | 2 étapes pour ajouter la bonne variante (page produit puis retour) |
| **Image trompeuse** | Moyenne | Montre une couleur mais d'autres existent (découverte tardive) |
| **Panier incorrect** | Moyenne | L'utilisateur ajoute un SKU qu'il n'a pas choisi consciemment |
| **Wishlist** | Faible | Le bouton wishlist a le même problème (ajoute SKU primaire) |

### Métriques à surveiller

- **Taux de modification au panier** : Indicateur de friction si élevé
- **Taux d'abandon sur listings** : Comparé aux pages produit
- **Ratio produits multi-SKU** : Si >50%, impact significatif
- **Temps sur page produit** : Si élevé après listing, peut indiquer navigation forcée

---

## Solutions comparées

### Option A : Modale/Drawer de sélection rapide

**Flow** :
1. Click sur "Ajouter" → ouvre un Drawer (Sheet mobile-friendly)
2. Affiche image + sélecteurs couleur/matière/taille
3. L'utilisateur choisit → "Ajouter au panier"
4. Fermeture + toast succès

**Pour produits mono-SKU** : Ajout direct sans drawer.

| Critère | Score |
|---------|-------|
| Conversion | ⭐⭐⭐⭐⭐ |
| UX mobile | ⭐⭐⭐⭐⭐ |
| Complexité dev | ⭐⭐⭐ |
| Maintenabilité | ⭐⭐⭐⭐ |

**Avantages** :
- Reste sur le listing (pas de perte de contexte)
- UX complète avec stock/prix par variante
- Pattern e-commerce prouvé (Zalando, ASOS, Nike)
- Mobile-friendly avec Sheet natif

**Inconvénients** :
- Développement moyen (~3-5 fichiers)
- Fetch des données SKU supplémentaires

---

### Option B : Redirection vers page produit

**Flow** :
1. Si multi-SKU : bouton devient "Voir les options"
2. Click → redirection `/creations/[slug]`
3. Sélection sur page produit existante

| Critère | Score |
|---------|-------|
| Conversion | ⭐⭐⭐ |
| UX mobile | ⭐⭐⭐⭐ |
| Complexité dev | ⭐⭐⭐⭐⭐ |
| Maintenabilité | ⭐⭐⭐⭐⭐ |

**Avantages** :
- Très simple à implémenter
- Utilise l'existant à 100%
- Plus de pageviews produit (SEO indirect)

**Inconvénients** :
- UX interrompue, perte de scroll/contexte
- Conversion potentiellement plus basse
- L'utilisateur doit naviguer back

---

### Option C : Sélection inline au hover

**Flow** :
1. Hover sur card → pastilles couleur apparaissent
2. Click sur pastille → change l'image + le SKU sélectionné
3. Click "Ajouter" → ajoute le SKU affiché

| Critère | Score |
|---------|-------|
| Conversion | ⭐⭐⭐⭐ |
| UX mobile | ⭐⭐ |
| Complexité dev | ⭐⭐ |
| Maintenabilité | ⭐⭐⭐ |

**Avantages** :
- Très rapide, zéro navigation
- Visuellement attractif (pattern Nike, Zara)

**Inconvénients** :
- Pas de hover sur mobile → besoin d'un fallback
- Limité pour combinaisons (couleur + taille + matière)
- Espace contraint sur card
- Complexité pour combinaisons multi-attributs

---

### Option D : Modification dans le panier

**Flow** :
1. Ajout du SKU primaire (comportement actuel)
2. Dans le panier, dropdown pour changer la variante

| Critère | Score |
|---------|-------|
| Conversion | ⭐⭐ |
| UX mobile | ⭐⭐⭐ |
| Complexité dev | ⭐⭐⭐⭐⭐ |
| Maintenabilité | ⭐⭐⭐⭐ |

**Avantages** :
- Effort minimal
- Le panier devient "workspace" de personnalisation

**Inconvénients** :
- Ne résout pas le problème à la source
- UX frustrante (2 étapes obligatoires)
- L'utilisateur ne sait pas qu'il peut changer

---

## Recommandation

### Solution recommandée : Drawer de sélection rapide + Pastilles couleur

Cette approche combine :
1. **Pastilles couleur sur la card** → indique visuellement les variantes disponibles
2. **Drawer au click** → sélection complète sans quitter la page
3. **Ajout direct pour mono-SKU** → pas de friction inutile

### Justification

| Critère | Drawer | Alternatives |
|---------|--------|--------------|
| **Conversion** | Élevée - utilisateur reste sur listing | Moyenne à faible |
| **Mobile** | Natif avec Sheet bottom | Hover impossible |
| **Complexité** | Moyenne - réutilise composants existants | Variable |
| **Scalabilité** | Gère couleur + taille + matière | Limité |

### Références marché

- **Zalando** : Drawer taille obligatoire
- **ASOS** : Quick view avec sélection
- **Nike** : Drawer couleur + taille
- **Etsy (bijoux)** : Drawer personnalisation
- **Mejuri (bijoux)** : Drawer taille bague

---

## Architecture cible

### Diagramme de flux

```
ProductCard
  │
  ├── ColorSwatches (nouveau)
  │     └── Pastilles couleur sous l'image
  │     └── Max 4 + badge "+N" si plus
  │
  └── AddToCartCardButton (modifié)
        │
        ▼
    [hasMultipleSkus ?]
        │       │
       Non     Oui
        │       │
        ▼       ▼
    Ajout    openDrawer()
    direct      │
        │       ▼
        ▼   AddToCartDrawer (nouveau)
    Toast     ├── ProductImage (SKU sélectionné)
    succès    ├── ColorSelector (existant)
              ├── MaterialSelector (existant)
              ├── SizeSelector (existant)
              ├── PriceDisplay
              ├── StockStatus
              └── AddToCartButton
                     │
                     ▼
                 addToCart(selectedSkuId)
                     │
                     ▼
                 closeDrawer + Toast
```

### Composants à créer

| Composant | Emplacement | Description |
|-----------|-------------|-------------|
| `AddToCartDrawer` | `modules/cart/components/` | Sheet avec sélection variantes |
| `ColorSwatches` | `modules/products/components/` | Pastilles couleur sur card |
| `useAddToCartDrawer` | `modules/cart/hooks/` | Hook état drawer + SKU |

### Composants à modifier

| Composant | Modification |
|-----------|--------------|
| `ProductCard` | Intégrer ColorSwatches + logique drawer |
| `AddToCartCardButton` | Conditionnel mono/multi-SKU |
| `product-list-helpers.ts` | Ajouter `hasMultipleSkus()`, `getAvailableColors()` |

---

## Spécifications techniques

### Props ProductCard étendues

```typescript
interface ProductCardProps {
  // ... props existantes

  /** Variantes disponibles pour le drawer */
  variants?: {
    colors: Array<{
      slug: string;
      hex: string;
      name: string;
      skuId: string;
      inStock: boolean;
    }>;
    materials: Array<{
      slug: string;
      name: string;
      skuId: string;
      inStock: boolean;
    }>;
    sizes: Array<{
      value: string;
      skuId: string;
      inStock: boolean;
    }>;
    hasMultipleVariants: boolean;
  };
}
```

### Hook useAddToCartDrawer

```typescript
interface UseAddToCartDrawerReturn {
  isOpen: boolean;
  product: ProductForDrawer | null;
  selectedSkuId: string | null;

  openDrawer: (product: ProductForDrawer) => void;
  closeDrawer: () => void;
  selectSku: (skuId: string) => void;
  addToCart: () => Promise<ActionState>;
}
```

### AddToCartDrawer Component

```typescript
interface AddToCartDrawerProps {
  product: {
    id: string;
    slug: string;
    title: string;
    skus: Array<{
      id: string;
      priceInclTax: number;
      inventory: number;
      isActive: boolean;
      color?: { slug: string; hex: string; name: string };
      material?: { slug: string; name: string };
      size?: string;
      images: Array<{ url: string; alt: string | null }>;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (skuId: string) => void;
}
```

### ColorSwatches Component

```typescript
interface ColorSwatchesProps {
  colors: Array<{
    slug: string;
    hex: string;
    name: string;
    inStock: boolean;
  }>;
  maxVisible?: number; // Défaut: 4
  size?: "sm" | "md";  // Défaut: "sm"
  className?: string;
}
```

### Logique de sélection

```typescript
// Nouveau helper dans product-list-helpers.ts
export function hasMultipleVariants(product: ProductWithSkus): boolean {
  const activeSkus = product.skus.filter(sku => sku.isActive);
  if (activeSkus.length <= 1) return false;

  const uniqueColors = new Set(activeSkus.map(s => s.colorId).filter(Boolean));
  const uniqueMaterials = new Set(activeSkus.map(s => s.materialId).filter(Boolean));
  const uniqueSizes = new Set(activeSkus.map(s => s.size).filter(Boolean));

  return uniqueColors.size > 1 || uniqueMaterials.size > 1 || uniqueSizes.size > 1;
}

export function getAvailableColors(product: ProductWithSkus): ColorSwatch[] {
  const activeSkus = product.skus.filter(sku => sku.isActive && sku.color);
  const colorMap = new Map<string, ColorSwatch>();

  for (const sku of activeSkus) {
    if (!sku.color || colorMap.has(sku.color.slug)) continue;
    colorMap.set(sku.color.slug, {
      slug: sku.color.slug,
      hex: sku.color.hex,
      name: sku.color.name,
      inStock: sku.inventory > 0,
    });
  }

  return Array.from(colorMap.values());
}
```

---

## Considérations

### Performance

- Les SKUs sont déjà fetchés dans la plupart des contextes (`GET_PRODUCTS_SELECT`)
- Le drawer charge les images via le cache Next.js existant
- Utiliser `cacheLife("products")` pour les données drawer

### Accessibilité

- Drawer avec `role="dialog"` et focus trap
- Pastilles avec `aria-label` ("Couleur or rose")
- Sélecteurs keyboard-navigable (existants)
- États disabled visuellement distincts

### Mobile

- Sheet depuis le bas (pattern mobile standard)
- Touch targets >= 44px pour pastilles
- Scroll interne si beaucoup de variantes

### États edge

- **Produit avec 1 seul SKU** : Ajout direct sans drawer
- **Toutes variantes en rupture** : Bouton désactivé ou masqué
- **SKU sélectionné en rupture** : Message + suggestion alternative

---

## Références e-commerce

### Benchmarks analysés

| Site | Pattern | Notes |
|------|---------|-------|
| Zalando | Drawer obligatoire | Taille requise avant ajout |
| ASOS | Quick view modal | Image + tous attributs |
| Nike | Drawer couleur + taille | Animation fluide |
| Zara | Inline hover | Pastilles + change image |
| Etsy | Drawer | Personnalisation bijoux |
| Mejuri | Drawer | Taille bague, gravure |
| Catbird | Drawer | Métal + taille |

### Patterns validés

1. **Pastilles couleur visibles** → Indique variantes sans clic
2. **Drawer mobile-first** → UX cohérente mobile/desktop
3. **Ajout direct mono-SKU** → Pas de friction inutile
4. **Prix dynamique** → Afficher prix du SKU sélectionné
5. **Stock par variante** → Éviter frustration "rupture" après sélection

---

## Estimation effort

| Tâche | Complexité | Temps estimé |
|-------|------------|--------------|
| ColorSwatches component | Faible | 2h |
| AddToCartDrawer component | Moyenne | 4h |
| useAddToCartDrawer hook | Faible | 1h |
| Modifier ProductCard | Faible | 2h |
| Modifier product-list-helpers | Faible | 1h |
| Tests unitaires | Moyenne | 2h |
| Tests E2E | Moyenne | 2h |
| **Total** | | **~14h (2 jours)** |

---

## Conclusion

Le **Drawer de sélection rapide** combiné aux **pastilles couleur** est la solution optimale pour Synclune :

- **UX moderne** validée par les leaders e-commerce bijoux
- **Mobile-first** compatible avec le Sheet existant
- **Effort raisonnable** en réutilisant les composants existants
- **Amélioration conversion** significative attendue

La **redirection vers page produit** reste une alternative valide pour une implémentation minimale, mais au prix d'une UX moins fluide et d'une potentielle baisse de conversion.
