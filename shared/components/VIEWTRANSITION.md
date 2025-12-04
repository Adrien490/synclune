# Guide ViewTransition - Synclune

Ce guide documente l'utilisation de React ViewTransition dans l'application Synclune.

## Vue d'ensemble

ViewTransition permet des transitions fluides entre les pages en animant les éléments partagés (images, titres, badges). L'application utilise des classes CSS spécifiques pour différencier les durées d'animation par type d'élément.

## Configuration

### Next.js (`next.config.ts`)

```typescript
experimental: {
  viewTransition: true,
}
```

### CSS Globales (`app/globals.css`)

Les animations sont définies avec des classes spécifiques et respectent `prefers-reduced-motion`.

---

## Convention de Nommage

Format : `{scope}-{type}-{identifier}`

### Scopes

| Scope | Description |
|-------|-------------|
| `product` | Storefront - pages produits |
| `admin-product` | Admin - gestion produits |
| `admin-order` | Admin - gestion commandes |
| `admin-sku` | Admin - gestion variantes |
| `admin-collection` | Admin - gestion collections |
| `admin-color` | Admin - gestion couleurs |
| `admin-material` | Admin - gestion matériaux |
| `admin-user` | Admin - gestion utilisateurs |
| `admin-discount` | Admin - gestion remises |
| `admin-subscriber` | Admin - newsletter |

### Types

| Type | Description |
|------|-------------|
| `image` | Image principale du produit |
| `title` | Titre/nom de l'élément |
| `name` | Nom (couleur, matériau, etc.) |
| `preview` | Aperçu visuel (couleur) |
| `status` | Badge de statut |
| `payment` | Badge paiement |
| `fulfillment` | Badge traitement |

---

## Classes CSS

| Classe | Usage | Durée | Animation |
|--------|-------|-------|-----------|
| `vt-product-image` | Images produits (morphing) | 400ms | Cross-fade avec easing |
| `vt-title` | Titres et noms | 250ms | Cross-fade |
| `vt-badge` | Badges de statut | 200ms | Cross-fade |
| `vt-table-link` | Liens dans tableaux | 150ms | Cross-fade |
| `vt-color-preview` | Aperçus couleurs | 300ms | Scale bounce |
| `vt-slide-in` | Entrées avec slide | 300ms | Slide up |
| `vt-slide-out` | Sorties avec slide | 300ms | Slide down |

### Structure CSS (selon doc officielle)

Chaque classe définit 3 pseudo-sélecteurs :
```css
::view-transition-group(.class-name)   /* Position et taille */
::view-transition-old(.class-name)     /* Animation sortante */
::view-transition-new(.class-name)     /* Animation entrante */
```

---

## Exemples d'utilisation

### Image avec transition partagée

```tsx
import { ViewTransition } from "react";
import Image from "next/image";

// Dans la liste (product-card.tsx)
<ViewTransition
  name={`product-image-${slug}`}
  default="vt-product-image"
  share="vt-product-image"
>
  <Image src={url} alt={alt} fill />
</ViewTransition>

// Sur la page détail (media-renderer.tsx)
<ViewTransition
  name={`product-image-${productSlug}`}
  default="vt-product-image"
  share="vt-product-image"
>
  <Image src={url} alt={alt} fill />
</ViewTransition>
```

### Titre

```tsx
<ViewTransition name={`product-title-${slug}`} default="vt-title">
  <h1>{title}</h1>
</ViewTransition>
```

### Badge de statut

```tsx
<ViewTransition name={`admin-order-${order.id}-status`} default="vt-badge">
  <Badge variant={statusVariant}>
    {statusLabel}
  </Badge>
</ViewTransition>
```

### Lien dans tableau

```tsx
<ViewTransition name={`admin-order-${order.id}`} default="vt-table-link">
  <Link href={`/admin/ventes/commandes/${order.id}`}>
    {order.orderNumber}
  </Link>
</ViewTransition>
```

### Aperçu couleur

```tsx
<ViewTransition name={`admin-color-preview-${color.id}`} default="vt-color-preview">
  <div
    className="w-8 h-8 rounded-full"
    style={{ backgroundColor: color.hex }}
  />
</ViewTransition>
```

### Titre dans PageHeader (avec titleSlot)

```tsx
import { ViewTransition } from "react";
import { PageHeader } from "@/shared/components/page-header";

<PageHeader
  title={`Commande ${order.orderNumber}`}
  titleSlot={
    <ViewTransition name={`order-${order.id}`} default="vt-title">
      <h1
        id="page-title"
        className="text-2xl sm:text-3xl font-display font-semibold text-foreground tracking-normal break-words"
      >
        Commande {order.orderNumber}
      </h1>
    </ViewTransition>
  }
  description="Détails de votre commande"
/>
```

---

## Props disponibles

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Identifiant unique pour la transition partagée |
| `default` | `string` | Classe CSS pour l'animation par défaut |
| `share` | `string` | Classe CSS pour le morphing entre pages |
| `enter` | `string` | Classe CSS pour l'entrée |
| `exit` | `string` | Classe CSS pour la sortie |
| `update` | `string` | Classe CSS pour les mises à jour DOM |

---

## Accessibilité

Toutes les animations respectent `prefers-reduced-motion: reduce` :

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(.vt-product-image),
  ::view-transition-group(.vt-title),
  ::view-transition-group(.vt-badge),
  ::view-transition-group(.vt-table-link),
  ::view-transition-group(.vt-color-preview) {
    animation: none !important;
  }
}
```

---

## Fichiers concernés

### Storefront

- `modules/products/components/product-card.tsx` - Image, Titre
- `modules/products/components/product-info.tsx` - Titre
- `modules/media/components/media-renderer.tsx` - Image (première uniquement)
- `modules/orders/components/customer/customer-orders-table.tsx` - Lien commande
- `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` - Titre commande

### Admin

- `modules/products/components/admin/products-data-table.tsx` - Image, Titre
- `modules/products/components/admin/edit-product-form.tsx` - Titre
- `modules/skus/components/admin/skus-data-table.tsx` - Image, Nom
- `modules/skus/components/admin/inventory-data-table.tsx` - Image, Lien
- `modules/orders/components/admin/orders-data-table.tsx` - N° commande
- `modules/orders/components/admin/order-detail/order-header.tsx` - Titre
- `modules/orders/components/admin/order-detail/order-status-badges.tsx` - Badges
- `modules/refunds/components/admin/refunds-data-table.tsx` - Lien commande
- `modules/payments/components/admin/stripe-payments-data-table.tsx` - Lien commande
- `modules/collections/components/admin/collections-data-table.tsx` - Nom
- `modules/product-types/components/admin/product-types-data-table.tsx` - Nom
- `modules/colors/components/admin/colors-data-table.tsx` - Preview, Nom
- `modules/materials/components/admin/materials-data-table.tsx` - Nom
- `modules/discounts/components/admin/discounts-data-table.tsx` - Code
- `modules/newsletter/components/admin/subscribers-data-table.tsx` - Email
- `modules/users/components/admin/users-data-table.tsx` - Nom, Email
- `modules/stock-notifications/components/admin/stock-notifications-data-table.tsx` - Lien produit

---

## Bonnes pratiques

### Règles essentielles (documentation officielle)

1. **Placement avant DOM nodes** : `<ViewTransition>` doit envelopper directement l'élément DOM, pas être à l'intérieur.
   ```tsx
   // ✅ Correct
   <ViewTransition><div>...</div></ViewTransition>

   // ❌ Incorrect - ViewTransition ne s'activera pas pour les updates
   <div><ViewTransition>...</ViewTransition></div>
   ```

2. **Noms uniques** : Chaque `name` doit être unique dans toute l'application. Deux ViewTransition avec le même `name` montés simultanément causent une erreur.
   ```tsx
   // ✅ Correct - ID unique
   <ViewTransition name={`product-${id}`}>

   // ❌ Incorrect - nom dupliqué possible
   <ViewTransition name="product">
   ```

3. **Transition partagée (share)** : Pour un morphing entre pages, les deux ViewTransition (source et destination) doivent avoir le même `name` et une classe `share`.

4. **Première image seulement** : Dans les galeries, seule la première image a une ViewTransition pour éviter les conflits de noms.

5. **Accessibilité** : Toujours respecter `prefers-reduced-motion`. Défini dans `globals.css`.

### Types d'activation

| Type | Déclencheur | Usage |
|------|-------------|-------|
| `enter` | ViewTransition monté | Apparition d'élément |
| `exit` | ViewTransition démonté | Disparition d'élément |
| `update` | Mutation DOM interne | Changement de contenu |
| `share` | Paire mount/unmount avec même `name` | Morphing entre pages |

### Props recommandées

```tsx
// Transition partagée (morphing)
<ViewTransition
  name={`unique-${id}`}    // Obligatoire pour share
  default="vt-title"       // Classe par défaut
  share="vt-title"         // Classe pour le morphing
/>

// Animations enter/exit personnalisées
<ViewTransition
  enter="vt-slide-in"      // Animation d'entrée
  exit="vt-slide-out"      // Animation de sortie
  default="vt-title"       // Fallback
/>
```

### Éviter les conflits de noms

Si le même produit peut apparaître plusieurs fois sur la même page (ex: dans la page de détail + produits similaires), utilisez un préfixe de contexte :

```tsx
// ProductCard supporte viewTransitionContext pour éviter les conflits
<ProductCard
  slug={product.slug}
  viewTransitionContext="related"  // Génère: related-product-image-{slug}
  ...
/>

// Sans contexte (défaut) : product-image-{slug}
// Avec contexte "related" : related-product-image-{slug}
```

**Cas d'usage :**
- `RelatedProducts` utilise `viewTransitionContext="related"` pour éviter les conflits avec `ProductInfo` et `MediaRenderer` sur la page de détail produit.

---

## Références

- [React ViewTransition API](https://react.dev/reference/react/ViewTransition)
- [View Transitions API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
