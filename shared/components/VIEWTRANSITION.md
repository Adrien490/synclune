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

| Classe | Usage | Durée |
|--------|-------|-------|
| `vt-product-image` | Images produits (morphing) | 400ms |
| `vt-title` | Titres et noms | 250ms |
| `vt-badge` | Badges de statut | 200ms |
| `vt-table-link` | Liens dans tableaux | 150ms |
| `vt-color-preview` | Aperçus couleurs | 300ms |

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

1. **Noms uniques** : Chaque `name` doit être unique sur la page. Deux ViewTransition avec le même `name` montés simultanément causent une erreur.

2. **Transition partagée** : Pour un morphing entre pages, les deux ViewTransition (source et destination) doivent avoir le même `name`.

3. **Première image seulement** : Dans les galeries, seule la première image a une ViewTransition pour éviter les conflits.

4. **Server Components** : ViewTransition fonctionne mieux avec les Server Components pour les transitions de page.

---

## Références

- [React ViewTransition API](https://react.dev/reference/react/ViewTransition)
- [View Transitions API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
