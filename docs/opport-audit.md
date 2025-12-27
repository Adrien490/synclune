# Audit UX/UI Synclune - Tendances E-commerce Bijoux 2025

> Analyse stratégique pour une boutique artisanale féminine

---

## Résumé exécutif

Synclune possède une base solide (structure homepage, storytelling artisan, positionnement "fait main à Nantes"). Cet audit identifie les opportunités d'amélioration basées sur les tendances 2025 du e-commerce bijoux féminin, notamment la philosophie **Feminine 2.0**: un design intentionnel où chaque gradient, animation et photo sert à la fois l'émotion ET la conversion.

---

## 1. Analyse de l'existant

### 1.1 Structure Homepage actuelle

| Section | Composant | État |
|---------|-----------|------|
| Hero | Titre + 2 CTA + particules | ✅ Fonctionnel |
| Dernières créations | Grille produits | ✅ Fonctionnel |
| Collections | Cards catégories | ✅ Fonctionnel |
| Atelier Story | Storytelling Léane | ✅ Fonctionnel |
| Processus créatif | Étapes fabrication | ✅ Fonctionnel |
| FAQ | Accordion questions | ✅ Fonctionnel |

### 1.2 Points forts identifiés

- ✅ Structure homepage solide (Hero → Produits → Collections → Story → FAQ)
- ✅ Storytelling artisan authentique avec Léane
- ✅ Positionnement "fait main à Nantes" différenciant
- ✅ Typographie serif élégante (Crimson Pro)
- ✅ Palette rose gold cohérente

### 1.3 Animations existantes

```
shared/components/animations/
├── fade.tsx              ✅ Utilisé
├── slide.tsx             ✅ Utilisé
├── stagger.tsx           ✅ Utilisé
├── reveal.tsx            ✅ Utilisé
├── glitter-sparkles.tsx  ✅ Utilisé (Hero)
├── particle-system.tsx   ✅ Utilisé (Hero)
├── floating-blob.tsx     ✅ Ajouté récemment
├── cursor-sparkle.tsx    ✅ Ajouté récemment
└── magnetic-wrapper.tsx  ✅ Ajouté récemment
```

### 1.4 Palette couleurs

Couleurs oklch définies dans `globals.css`:
- **Primary**: Rose gold (bien utilisé)
- **Secondary**: Lavande (bien utilisé)
- **Pastels**: Rose, Lavande, Doré, Menthe (sous-exploités)

### 1.5 Typographie

- **Titres**: Crimson Pro (serif) ✅ Conforme tendance 2025
- **Corps**: System sans-serif ✅ Performant
- **Accent**: Dancing Script (défini mais peu utilisé)

---

## 2. Gaps critiques identifiés

### 2.1 Sections manquantes

| Section | Priorité | Justification |
|---------|----------|---------------|
| **Bestsellers** | 🔴 Haute | 65% des visiteurs cherchent les "meilleures ventes" |
| **Social proof** | 🔴 Haute | Avis clients = +270% conversion (Spiegel Research) |
| **Instagram feed** | 🟡 Moyenne | UGC authentique, preuve sociale visuelle |
| **Sustainability** | 🟡 Moyenne | 80% Gen Z vérifie avant achat |

### 2.2 Hero - Charge cognitive élevée

**Constat actuel**:
- Titre + sous-titre (2 éléments texte)
- 2 CTA (dilution de l'attention)
- Particules + glitter (distraction potentielle)

**Best practice 2025**:
- Image lifestyle full-screen unique
- 1-2 lignes de texte max
- 1 CTA principal proéminent
- Moins d'éléments décoratifs

**Impact potentiel**: Réduction de 40% du taux de rebond (Baymard Institute)

### 2.3 Mobile-First insuffisant

Le trafic mobile représente **60%+** du e-commerce bijoux.

| Critère | Standard WCAG | État Synclune |
|---------|---------------|---------------|
| Touch targets | 44×44px min | ⚠️ À vérifier |
| Sticky CTA | Visible au scroll | ❌ Absent |
| Bottom nav | Actions principales | ❌ Absent |
| Swipe gestures | Carousels | ⚠️ Partiel |

### 2.4 Quick-View absent

**Tendance**: Aperçu rapide au survol (+40% impulsions d'achat avec vue 360°)

**État actuel**: Hover basique (scale + shadow)
**Recommandé**: Image secondaire + bouton "Aperçu rapide" → Modal

### 2.5 Différenciation artisan sous-exploitée

| Signal d'authenticité | État actuel | Potentiel |
|----------------------|-------------|-----------|
| Photos Léane | 2 dans Atelier Story | + header, about, produits |
| Mains au travail | ❌ Absent | Vidéo loop 5-8s |
| Process visible | Section étapes (icônes) | + photos réelles |
| Behind-the-scenes | ❌ Absent | Stories, reels intégrés |

---

## 3. Tendances 2025 applicables

### 3.1 Palette "Warm Neutrals"

Pantone 2025 **Mocha Mousse** et shift vers:
- Pastels **crémeux** (pas vifs)
- Neutrals **chauds** (sandy, blush muted)
- **Rose gold** comme signifiant luxe ✅ Déjà en place
- **Berry** pour accents audacieux

**Application recommandée**:
```
Fond sections: Crème chaud (#FDF8F5) ou soft blush muted
Accents: Rose gold métallique (existant)
Texte: Noir doux ou gris chaud
Highlights: Berry doux pour CTA secondaires
```

### 3.2 Typographie - Serif Renaissance

- **Serifs haut-contraste** dominent (Playfair, Cormorant Garamond)
- Formule: **Serif élégant (titres) + Sans-serif clean (corps)** ✅ Synclune OK
- Scripts calligraphiques **sparingly** (moments de marque)
- Ratio recommandé: 80% serif/sans, 20% script max

**Opportunité**: Utiliser Dancing Script pour "fait main", signature Léane

### 3.3 Product Grid optimisé

**Ordre sections recommandé 2025**:
1. Hero + CTA unique
2. **Bestsellers** (manquant)
3. New Arrivals / Dernières créations
4. Shop by Category / Collections
5. **Social proof / Instagram** (manquant)
6. Featured Story / Atelier
7. **Newsletter**
8. FAQ

### 3.4 Tech stratégique

| Technologie | Adoption 2025 | Recommandation Synclune |
|-------------|---------------|-------------------------|
| AR Try-On | 75% des consommateurs le veulent | Phase 2 (mirrAR, Banuba) |
| AI Personalization | 31% revenus e-commerce | Possible via Next.js cookies |
| Video loops | Standard luxury | 5-8s muted autoplay hero |
| Shoppable video | Émergent | Évaluer (Videowise, Tolstoy) |

---

## 4. Améliorations déjà implémentées

### 4.1 Animations "Girly" créées

| Composant | Description | Fichier |
|-----------|-------------|---------|
| FloatingBlobs | Blobs organiques flottants | `shared/components/animations/floating-blob.tsx` |
| CursorSparkle | Trail de sparkles au curseur | `shared/components/animations/cursor-sparkle.tsx` |
| MagneticWrapper | Effet magnétique boutons | `shared/components/animations/magnetic-wrapper.tsx` |
| SparklesDivider | Séparateur avec étoiles | `shared/components/ui/section-divider.tsx` |
| PolaroidFrame | Cadres polaroid + washi tape | `shared/components/ui/polaroid-frame.tsx` |
| LogoSparkles | Easter egg clic logo | `shared/components/logo-sparkles.tsx` |

### 4.2 ProductCard enrichie

```tsx
// Glow pastel au hover
"hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35)]"

// Tilt 3D subtil
"hover:[transform:perspective(1000px)_rotateX(2deg)_translateY(-8px)]"
```

### 4.3 CSS Animations ajoutées

```css
@keyframes blob-float-1 { /* Mouvement organique */ }
@keyframes blob-float-2 { /* Variation */ }
@keyframes blob-float-3 { /* Variation */ }
@keyframes gradient-shift { /* Dégradé animé */ }
@keyframes sparkle-fade { /* Scintillement */ }
.animate-shimmer-girly { /* Shimmer rose-gold skeletons */ }
```

---

## 5. Recommandations prioritaires

### 🔴 Priorité 1: Conversion immédiate

| Action | Effort | Impact | Fichier concerné |
|--------|--------|--------|------------------|
| Simplifier Hero (1 CTA) | Faible | Élevé | `hero.tsx` |
| Sticky "Ajouter au panier" mobile | Faible | Élevé | Page produit |

### 🟠 Priorité 2: Trust & Social Proof

| Action | Effort | Impact | Fichier concerné |
|--------|--------|--------|------------------|
| Intégrer avis clients homepage | Moyen | Élevé | Nouveau composant |
| Feed Instagram shoppable | Moyen | Moyen | Nouveau composant |
| Badges garantie/retours | Faible | Moyen | Footer ou hero |

### 🟡 Priorité 3: Authenticité artisan

| Action | Effort | Impact | Fichier concerné |
|--------|--------|--------|------------------|
| Vidéo loop atelier (5-8s) | Moyen | Élevé | Hero ou Atelier Story |
| Photos Léane prominentes | Faible | Moyen | Header, produits |
| Messaging durabilité | Faible | Moyen | Footer, pages |

### 🟢 Priorité 4: Tech avancée (Phase 2)

| Action | Effort | Impact | Notes |
|--------|--------|--------|-------|
| Quick-view modal | Élevé | Moyen | ProductCard + Modal |
| AR try-on | Très élevé | Potentiellement élevé | mirrAR, Banuba |
| AI recommendations | Élevé | Élevé | Next.js + cookies |

---

## 6. Plan d'implémentation suggéré

### Phase 1: Fondations stratégiques (1-2 semaines)
1. Réorganiser sections homepage (ordre conversion)
2. Simplifier Hero (1 CTA, moins de texte)
3. Créer section "Bestsellers"
4. Renforcer photos Léane/atelier

### Phase 2: Mobile & Conversion (2-3 semaines)
5. Sticky CTA mobile pages produit
6. Quick-view hover desktop
7. Badges "Nouveau" / "Dernières pièces"
8. Section social proof (avis + Instagram)

### Phase 3: Authenticité artisan (2 semaines)
9. Video loop atelier (5-8s) dans hero ou story
10. Affiner palette warm neutrals
11. Limiter grille produits (12 max homepage)
12. Sustainability messaging visible

### Phase 4: Tech avancée (évaluer ROI)
13. AR try-on (phase exploratoire)
14. AI recommendations
15. Shoppable video

---

## 7. Fichiers clés

### Homepage
- `app/(boutique)/(accueil)/page.tsx` - Structure sections
- `app/(boutique)/(accueil)/_components/hero.tsx` - Hero à simplifier

### Composants créés (prêts à l'emploi)
- `shared/components/animations/floating-blob.tsx`
- `shared/components/animations/cursor-sparkle.tsx`
- `shared/components/animations/magnetic-wrapper.tsx`
- `shared/components/ui/section-divider.tsx`
- `shared/components/ui/polaroid-frame.tsx`
- `shared/components/logo-sparkles.tsx`

### À créer
- `app/(boutique)/(accueil)/_components/bestsellers.tsx`
- `app/(boutique)/(accueil)/_components/social-proof.tsx`
- `app/(boutique)/(accueil)/_components/instagram-feed.tsx`
- `shared/components/ui/video-loop.tsx`
- `shared/components/product/quick-view-modal.tsx`

---

## 8. Métriques de succès

| Métrique | Baseline actuelle | Objectif |
|----------|-------------------|----------|
| Taux de rebond | À mesurer | -20% |
| Temps sur page | À mesurer | +30% |
| Taux ajout panier | À mesurer | +25% |
| Conversion mobile | À mesurer | +40% |
| Pages/session | À mesurer | +15% |

---

## 9. Sources

- Baymard Institute - E-commerce UX Research 2024
- Jewel360 - Jewelry E-commerce Best Practices
- 99designs - Web Design Trends 2025
- ColorWhistle - Feminine Design Trends
- Pantone Color of the Year 2025 - Mocha Mousse
- Spiegel Research Center - Impact of Reviews on Sales
- Article "Feminine 2.0" - Design féminin intentionnel 2025

---

## 10. Références marques artisan inspirantes

| Marque | Ce qu'elle fait bien |
|--------|---------------------|
| **Lulu Designs** | Philosophie avant produits |
| **Moonrise Jewelry** | Inspiration locale + impact communauté |
| **Catbird** | Évolution narrative (225 sq ft Brooklyn → brand) |
| **Abby Seymour** | Gallery flow (pas grille rigide) |

---

*Audit réalisé le 26/12/2024 pour Synclune - E-commerce bijoux artisanaux*
