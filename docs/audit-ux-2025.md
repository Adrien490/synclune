# Audit UX/UI E-commerce 2025 - Synclune

**Date**: 23 décembre 2025
**Méthodologie**: Baymard Institute (200 000+ heures de recherche, 325 sites benchmarkés) + Arounda Agency

---

## Résumé Exécutif

### Score Global: 78/100

| Catégorie | Score | Statut |
|-----------|-------|--------|
| Navigation & Homepage | 8.4/10 | Excellent |
| Checkout & Formulaires | 82% | Bon |
| Pages Produits | 60% | À améliorer |
| Recherche & Filtres | 50% | Insuffisant |
| Système d'Avis | 0% | **CRITIQUE** |
| Accessibilité WCAG | 75% | Bon |
| Mobile UX | 85% | Très bon |
| Performance | 88% | Très bon |

### Contexte Marché
- 70% des paniers abandonnés = 260 milliards $ récupérables (EU + Amérique du Nord)
- Amélioration design checkout = +35% conversions potentielles
- 81% des sites e-commerce ont une performance mobile "médiocre ou pire"

---

## 1. Navigation & Homepage

### Score: 8.4/10 - Excellent

#### Points Forts

**Navigation Desktop**
- Hover delay 200ms (recommandé 300-500ms)
- Utilisation de Radix UI NavigationMenu
- Images des collections dans dropdowns avec blur placeholders
- Badges sur items enfants
- `aria-current="page"` sur liens actifs

**Navigation Mobile**
- Hamburger menu avec Sheet direction="left"
- Scope complet des liens (`/produits/{type.slug}`)
- Règle des 4C respectée (Clarity, Consistency, Conciseness, Coherence)
- Animations stagger avec delays progressifs
- Max 6 productTypes, 3 collections affichés
- Accessibilité complète (aria-label, aria-labelledby, aria-current)

**Homepage**
- Répond aux 3 questions: "Quel site?", "Que faire?", "Que trouver?"
- 3 chemins présents: navigation catégories, recherche, chemins curatés
- Hero avec 2 CTAs clairs
- 12 dernières créations + 6 collections
- Carrousel sans auto-rotation (conforme UX 2025)

#### Points à Améliorer

| Problème | Impact | Fichier |
|----------|--------|---------|
| Position actuelle peu visible | 95% sites échouent | `desktop-nav.tsx` |
| Pas de progress indicator carrousel | UX polish | `collections.tsx` |
| En-têtes catégories non cliquables | Navigation exploratoire | `desktop-nav.tsx` |

**Fichiers clés**:
- `/app/(boutique)/(accueil)/_components/navbar/desktop-nav.tsx`
- `/app/(boutique)/(accueil)/_components/navbar/menu-sheet.tsx`
- `/app/(boutique)/(accueil)/page.tsx`
- `/shared/constants/navigation.ts`

---

## 2. Checkout & Formulaires

### Score: 82% - Bon

#### Points Forts

**Guest Checkout**
- Option visible et accessible
- Formulaire accepte invités via champ email
- Conservation données en localStorage (1h)
- Création automatique Stripe Customer pour invités

**Formulaires**
- 9-10 champs (optimal: 11-12)
- Validation inline live sur tous les champs
- Messages d'erreur spécifiques en français
- TanStack Form + useAppForm
- Conservation données après erreur de validation

**Paiement Stripe**
- Stripe Embedded Checkout (pas de redirect)
- 2-step flow: Adresse → Paiement
- Idempotency keys protègent contre double-clic
- Message "Je n'enregistre jamais tes coordonnées bancaires"
- Invoices PDF automatiques

**Progressive Disclosure**
- Adresse 2 cachée par défaut
- Pays caché si France (défaut)

#### Points à Améliorer

| Problème | Impact | Fichier |
|----------|--------|---------|
| Mot de passe trop strict (8 chars + 5 critères) | 18% abandon | `password-strength.ts` |
| Pas Apple Pay / Google Pay | 11% abandon | `create-checkout-session.ts` |
| Pas de création compte post-paiement explicite | Opportunité manquée | `confirmation/page.tsx` |
| Téléphone sans contexte suffisant | Friction | `checkout-form.tsx` |
| Pas de search pour liste pays (195+) | UX | `select-field.tsx` |

**Fichiers clés**:
- `/modules/payments/components/checkout-form.tsx`
- `/modules/payments/actions/create-checkout-session.ts`
- `/modules/auth/utils/password-strength.ts`
- `/shared/components/forms/`

---

## 3. Pages Produits

### Score: 60% - À améliorer

#### Points Forts

**Galerie**
- Embla carousel fluide
- Thumbnails verticales (desktop)
- Dots indicators (mobile)
- Zoom lightbox (desktop)
- Swipe hint indicator (mobile, 1ère visite)
- Touch targets 48px

**Product Cards**
- Image principale
- Swatches couleur (4 max)
- Prix + prix barré
- Badge stock/urgence
- Boutons wishlist + panier

**Structure**
- Sections verticales (bon)
- ProductDetails avec variantes URL-driven
- RecentlyViewedProducts + RelatedProducts en Suspense

#### Points Critiques

| Problème | Impact | Détail |
|----------|--------|--------|
| Images non catégorisées | 91% sites manquent "In Scale" | Seulement IMAGE/VIDEO |
| Pas de sections collapsibles | 27% manquent contenu | Pas d'accordéon mobile |
| Descriptions sans highlights | 78% ne structurent pas | Bloc texte brut |

**7 Types d'Images Requis (Baymard)**:
1. In Scale (référence taille) - MANQUANT
2. On Model (porté sur personne) - MANQUANT
3. Lifestyle (contexte utilisation) - MANQUANT
4. Closeup (détails/texture) - MANQUANT
5. Compatibility (avec autres bijoux) - MANQUANT
6. UGC (photos clients) - MANQUANT
7. Inspiration (ambiance/mood) - MANQUANT

**Fichiers clés**:
- `/app/(boutique)/creations/[slug]/page.tsx`
- `/modules/products/components/product-details.tsx`
- `/modules/media/components/gallery.tsx`
- `/modules/media/types/product-media.types.ts`

---

## 4. Recherche & Filtres

### Score: 50% - Insuffisant

#### Points Forts

**Filtres Présents**
- Prix (PriceRangeInputs)
- Couleur (CheckboxFilterItem avec swatches)
- Matériau/Type
- Sidebar verticale desktop
- Modal fullscreen mobile avec Accordion
- Badges filtres appliqués avec suppression individuelle
- "Effacer tous les filtres"

**Recherche**
- SearchInput avec debounce 300ms
- Mode "live" pour mise à jour URL
- Fuzzy search avec PostgreSQL pg_trgm (threshold 0.3)

#### Points Critiques

| Problème | Impact | Détail |
|----------|--------|--------|
| Autocomplétion manquante | 80% utilisent, 19% bien implémenté | Pas de dropdown suggestions |
| 3/5 filtres essentiels | 57% sites incomplets | Manque Avis, Taille |
| Pas de filtres thématiques | 20% n'en ont aucun | "Soirée", "Quotidien", etc. |
| Support 4/8 types requêtes | 41% sites ont problèmes | Pas synonymes, autocorrect |

**5 Filtres Essentiels (Baymard)**:
1. Prix - Présent
2. Couleur - Présent
3. Matériau/Marque - Présent
4. Avis/Note - MANQUANT (pas de système d'avis)
5. Taille - MANQUANT

**Fichiers clés**:
- `/modules/products/components/product-filter-sheet.tsx`
- `/shared/components/search-input.tsx`
- `/modules/products/services/fuzzy-search.ts`
- `/modules/products/data/get-products.ts`

---

## 5. Système d'Avis

### Score: 0% - CRITIQUE

#### État Actuel

**INEXISTANT** - Seulement un module `testimonials/` basique avec:
- `authorName`, `content`, `imageUrl`, `isPublished`
- Pas de rating, pas de filtrage, pas de réponses

#### Critères Baymard Non Respectés

| Critère | État | Impact |
|---------|------|--------|
| Résumé distribution notes | ABSENT | 43% sites l'omettent |
| Distribution cliquable pour filtrer | ABSENT | 39% non cliquables |
| Nombre total d'avis affiché | ABSENT | Confiance |
| Réponses aux avis négatifs | ABSENT | 87% ne répondent pas, 37% intègrent positivement |
| Sous-score "Fit" | ABSENT | 33% ne l'offrent pas |

#### Statistiques Clés
- 95% des utilisateurs s'appuient sur les avis
- 53% recherchent activement les avis négatifs
- Filtrage médiocre = 67-90% abandons vs 17-33% pour optimisé (4x différence)

**Module à créer**:
```
modules/reviews/
├── actions/create-review.ts
├── data/get-reviews.ts
├── components/
│   ├── review-list.tsx
│   ├── review-distribution.tsx
│   ├── review-form.tsx
│   └── star-rating.tsx
├── schemas/review.schema.ts
└── types/review.types.ts
```

---

## 6. Accessibilité WCAG 2.1 AA

### Score: 75% - Bon

#### Points Forts

**Navigation Clavier**
- Skip link fonctionnel (`shared/components/skip-link.tsx`)
- Focus visible 2px solid primary avec offset
- Tous les buttons supportent focus-visible
- Radix UI gère focus trap dans modales

**Formulaires**
- Labels `htmlFor` correctement associés
- `aria-invalid` + `aria-describedby` sur erreurs
- `aria-required` sur champs obligatoires
- `role="alert"` sur FieldError
- Fieldset + Legend pour groupes

**Texte & Contraste**
- OKLCH avec ratio > 7:1 (WCAG AAA)
- `leading-snug` (1.375em) et `leading-normal` (1.5em)
- Liens avec underline visible

**Screen Readers**
- `role="status"` sur Spinner
- Breadcrumb + Pagination avec aria-labels
- Éléments décoratifs avec `aria-hidden="true"`

#### Points à Améliorer

| Problème | Impact | Sévérité |
|----------|--------|----------|
| Audit images ALT manquant | 82% sites échouent | CRITIQUE |
| aria-live pour notifications | Non annoncées | MOYENNE |
| Boutons icône sans aria-label systématique | Inaccessibles | MOYENNE |
| Ordre tabulation non documenté | Modales/drawers | BASSE |

**Fichiers clés**:
- `/app/globals.css` - Focus styles, contraste
- `/shared/components/ui/field.tsx` - Architecture labels
- `/shared/components/skip-link.tsx`

---

## 7. Mobile UX

### Score: 85% - Très Bon

#### Points Forts

**Labels & Champs**
- Labels au-dessus (jamais à côté)
- Variant "vertical" par défaut
- Placeholders comme hints, pas labels

**Touch Targets**
- 44x44px (h-11, size-11) sur mobile
- Espacement approprié (gap-6 dans FieldGroup)
- Réduction à 32px sur desktop (acceptable)

**Input Field Props**
- Support `inputMode`, `enterKeyHint`, `autoComplete`
- `pattern`, `spellCheck`, `autoCapitalize` disponibles

#### Points à Améliorer

| Problème | Impact | Fichiers |
|----------|--------|----------|
| inputMode manquant sur emails auth | 63% sites échouent | `sign-in-email-form.tsx` |
| autoCorrect="off" manquant sur noms/adresses | Frustration | `checkout-form.tsx` |
| Viewport metadata incomplète | PWA | `layout.tsx` |
| Pas de haptic feedback | Micro-interaction | Buttons |

**Fichiers clés**:
- `/shared/components/forms/input-field.tsx`
- `/modules/auth/components/sign-in-email-form.tsx`
- `/modules/payments/components/checkout-form.tsx`

---

## 8. Performance

### Score: 88% - Très Bon

#### Points Forts

**Image Optimization**
- Next.js Image avec blur placeholder
- Formats WebP/AVIF configurés
- `loading="lazy"` pour images below-fold
- `priority` pour images above-fold (index < 4)

**Caching**
- cacheLife profiles configurés (products, cart, session, dashboard)
- "use cache" pattern dans data fetching
- Tag-based revalidation

**Loading States**
- Skeleton loaders reproduisant structure exacte
- 101 utilisations de Suspense
- Spinner avec `role="status"` + `aria-label`

**Animations**
- `prefers-reduced-motion` respecté partout
- `motion-safe:` prefix sur transitions
- Framer Motion avec MotionConfig global

#### Points à Améliorer

| Problème | Impact | Détail |
|----------|--------|--------|
| Pas de React.lazy() | Code-splitting | Modales lourdes |
| Images admin sans blur systématique | Admin UX | Tables |

**Fichiers clés**:
- `/next.config.ts` - Image formats, cacheLife
- `/app/(boutique)/(accueil)/loading.tsx` - Skeleton structure
- `/app/globals.css` - prefers-reduced-motion

---

## 9. Micro-Interactions

### Score: 90% - Très Bon

#### Points Forts

**Hover & Active States**
- `hover:scale-110` sur boutons mobile
- `active:scale-95` sur certains boutons
- `motion-safe:transition-all duration-200`
- Disabled states avec `cursor-not-allowed`

**Loading States**
- `isPending && "animate-pulse ring-2 ring-primary/30"`
- Texte "Ajout..." pendant loading
- `aria-busy={isPending}`

**Confirmations Actions Irréversibles**
- AlertDialog pour suppressions
- "Tu veux vraiment retirer {itemName}?"
- AlertDialogCancel + Button submit

**Optimistic UI**
- `useOptimistic` dans cart-item-quantity-selector
- `startTransition` pour updates

#### Points à Améliorer

| Problème | Impact |
|----------|--------|
| Pas de haptic feedback mobile | Confirmation tactile |
| `active:scale-95` non systématique | Cohérence |

---

## Recommandations Priorisées

### P0 - Critique (Impact maximal)

1. **Créer système d'avis complet**
   - Module `reviews/` avec rating 1-5
   - Distribution notes (barres horizontales)
   - Filtrage par note
   - Réponses admin
   - Estimation: 40-60h

2. **Autocomplétion recherche**
   - API endpoint `/api/search/suggestions`
   - Dropdown avec max 10 items desktop, 4-8 mobile
   - Estimation: 8-12h

3. **Catégoriser images produits**
   - Enum `ImageCategory` dans Prisma
   - Admin form pour catégoriser
   - Galerie priorise par type
   - Estimation: 15-20h

### P1 - Important

4. **Ajouter filtres manquants**
   - Taille, Avis (dépend P0.1), Thématiques
   - Estimation: 8-12h

5. **Apple Pay / Google Pay**
   - Modifier `payment_method_types`
   - Estimation: 2-4h

6. **Création compte post-paiement**
   - CTA sur page confirmation
   - Estimation: 2-4h

7. **Relaxer mot de passe**
   - 8 chars + 1-2 critères au lieu de 5
   - Estimation: 1-2h

### P2 - Moyen

8. **Navigation active visible**
   - `bg-primary/10 font-semibold`
   - Estimation: 30min

9. **aria-live notifications**
   - Vérifier Sonner ou créer LiveRegion
   - Estimation: 1-2h

10. **inputMode mobile complet**
    - Email, password, adresses
    - Estimation: 1-2h

11. **Accordéons produit mobile**
    - Caractéristiques, Entretien
    - Estimation: 2-4h

12. **Highlights descriptions**
    - Champ `highlights: string[]`
    - Estimation: 2-4h

### P3 - Polish

13. Progress indicator carrousels
14. aria-label boutons icône systématique
15. Viewport metadata complète
16. Code-splitting modales

---

## Estimation Effort Total

| Priorité | Heures | Pourcentage |
|----------|--------|-------------|
| P0 - Critique | 65-90h | 54% |
| P1 - Important | 15-25h | 17% |
| P2 - Moyen | 7-13h | 8% |
| P3 - Polish | 5-10h | 6% |
| **Total** | **92-138h** | **100%** |

---

## Métriques de Succès

Après implémentation complète:

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Score global | 78/100 | 90+ |
| Système d'avis | 0% | 85%+ |
| Recherche/filtres | 50% | 85%+ |
| Pages produits | 60% | 85%+ |
| Conformité WCAG | 75% | 95%+ |
| Taux abandon panier | ~70% | <50% |

---

## Annexes

### Fichiers Principaux par Module

**Navigation**:
- `/app/(boutique)/(accueil)/_components/navbar/`
- `/shared/constants/navigation.ts`
- `/shared/hooks/use-active-navbar-item.ts`

**Checkout**:
- `/modules/payments/components/checkout-form.tsx`
- `/modules/payments/actions/create-checkout-session.ts`
- `/shared/components/forms/`

**Produits**:
- `/app/(boutique)/creations/[slug]/page.tsx`
- `/modules/products/components/`
- `/modules/media/components/gallery.tsx`

**Auth**:
- `/modules/auth/components/`
- `/modules/auth/utils/password-strength.ts`
- `/modules/auth/schemas/auth.schemas.ts`

**UI Partagé**:
- `/shared/components/ui/`
- `/app/globals.css`

### Sources

- [Baymard Institute](https://baymard.com/) - 200 000+ heures de recherche UX
- [Arounda Agency](https://arounda.agency/) - 9+ ans d'expertise produit
- WCAG 2.1 AA Guidelines
- European Accessibility Act 2025
