# Audit Design & Suggestions Créatives - Homepage Synclune 2026

## Contexte

La homepage Synclune comporte 8 sections (Hero → Nouvelles Créations → Collections → Avis → Histoire Atelier → Processus Créatif → FAQ → Newsletter) avec un design system riche : système de particules, esthétique hand-drawn/polaroid, parallax multi-couches, typographie 3 polices, palette OKLCH rose/or. L'objectif est d'identifier les faiblesses et proposer des améliorations créatives pour 2026.

---

## PARTIE 1 : AUDIT DESIGN

### Hiérarchie visuelle — B+

**Forces :**
- Arc narratif solide : désir (Hero) → découverte (Produits/Collections) → confiance (Avis) → connexion (Atelier/Processus) → utilité (FAQ) → conversion (Newsletter)
- Hero impactant : `SplitText` + `RotatingWord` + images flottantes avec parallax

**Faiblesses :**
- **Section Atelier Story** : le h2 est `sr-only`, pas de `SectionTitle` visible. Seul un petit badge "Depuis mon atelier" sert d'ancre visuelle → **rupture du pattern** utilisé par les 6 autres sections
- **Transition Reviews → Atelier** : la plus abrupte. Après les avis, on tombe sur une grande photo sans titre visible
- **3 CTA pointent vers `/produits`** : Hero ("Découvrir la boutique"), Reviews ("Découvrir nos créations"), Atelier ("Découvrir les créations Synclune") → dilution du funnel
- **8 sections = scroll très long sur mobile** : FAQ + Newsletter risquent de ne jamais être vus

### Consistance — A-

**Forces :** Header pattern identique partout (SectionTitle + HandDrawnUnderline + subtitle), CTA uniformes, timing via `MOTION_CONFIG`, skeletons pour chaque section.

**Incohérences :**
- Atelier Story casse le header pattern (pas de SectionTitle, pas de HandDrawnUnderline visible)
- Spacing : Atelier utilise `SECTION_SPACING.spacious` (py-24/py-36) vs `SECTION_SPACING.section` (py-20/py-28) partout ailleurs → delta de 8rem sur desktop
- Background : FAQ et Newsletter ont `bg-muted/20`, mais Atelier (section la plus distinctive) reste sur `bg-background` pur

### Couleur — B+

**Forces :** Palette OKLCH cohérente, 4 glow colors (pink/lavender/mint/yellow) tissent un fil chromatique à travers les sections.

**Faiblesses :**
- **Monotonie du milieu de page** : de Latest Creations à Creative Process, le fond reste `bg-background` blanc. Beaucoup d'espace négatif, page "lavée"
- **Or (secondary) sous-exploité** : n'apparaît que dans les HandDrawnUnderline et la scroll progress line. Jamais en fond de section ou gradient proéminent
- **Pas de transition colorimétrique au scroll** : la palette ne change pas avec la narration émotionnelle

### Animations — B+

**Forces :** Budget animation bien géré (dynamic imports, CSS containment, pause hors viewport), `prefers-reduced-motion` respecté partout.

**Faiblesses :**
- **Vocabulaire d'entrée répétitif** : quasi toutes les entrées sont `Fade` + offset Y. Après la section 3, l'effet devient prévisible
- **Pas d'animations de sortie** : tout est `once: true`, aucune transformation quand une section quitte le viewport
- **Parallax Creative Process sous-dimensionné** : distances faibles (50-150px) + opacités très basses → beaucoup de JS pour un résultat quasi invisible

### Mobile — B

- Images flottantes hero masquées < md ✓, particules réduites ✓, carousels avec dots ✓, touch targets 44px+ ✓
- **Mais** : 8 sections avec `py-20` = scroll excessif, pas d'indicateur de scroll sur mobile (caché `hidden sm:block`), polaroids 2-col potentiellement à l'étroit sur 375px

### Parcours émotionnel — B+

- Arc narratif bien pensé, mais **le climax est mal placé** : la confession personnelle de Léane (section 5/8) mérite une mise en scène plus cinématique
- **Fin plate** : FAQ utilitaire + Newsletter fonctionnel → pas de "moment d'au revoir" émotionnel

---

## PARTIE 2 : 15 SUGGESTIONS CRÉATIVES

### Classement par impact recommandé

| # | Nom | Impact | Difficulté | Description |
|---|-----|--------|------------|-------------|
| 1 | **Aurora Veil** | 5/5 | Medium | Background gradient qui shift subtilement au scroll (rose → or → lavande → neutre) |
| 2 | **Fil d'Or** | 5/5 | Hard | Fil doré vertical connectant les sections, avec "noeuds" SVG décoratifs |
| 3 | **Mise en Lumière** | 5/5 | Medium | View Transitions API pour navigation produit (image qui "vole" vers la page détail) |
| 4 | **Confession Cinématique** | 5/5 | Hard | Scroll-snap story reveal pour la section Atelier (paragraphe par paragraphe) |
| 5 | **Carte Postale** | 4/5 | Easy | Titre visible pour Atelier Story en style carte postale/tampon vintage |
| 6 | **Bijoux en Mouvement** | 4/5 | Medium | 3D tilt sur cartes produit avec reflet lumineux qui suit le curseur |
| 7 | **Signature Reveal** | 4/5 | Easy | Signature "— Léane" dessinée stroke-by-stroke au scroll avec traînée dorée |
| 8 | **Vitrine Vivante** | 4/5 | Medium | Images flottantes hero draggables (spring back à la release) |
| 9 | **Newsletter Enchantée** | 4/5 | Medium | Animation enveloppe/cachet de cire + coeurs au submit newsletter |
| 10 | **Reflet Précieux** | 3/5 | Easy | Shimmer doré pour remplacer les `animate-pulse` des skeletons |
| 11 | **Palette Vivante** | 3/5 | Easy | Bordure gradient animée (4 glow colors) sur les FAQ accordion items ouverts |
| 12 | **Pluie de Confettis** | 3/5 | Easy | Burst de confettis pastels au clic wishlist |
| 13 | **Magnetic CTA** | 3/5 | Medium | Boutons CTA attirés magnétiquement par le curseur (2-4px) |
| 14 | **Typewriter Léane** | 3/5 | Medium | Effet machine à écrire sur le sous-titre hero |
| 15 | **Atelier Sonore** | 3/5 | Hard | Toggle son ambiant optionnel (boîte à musique, carillons au hover) |

---

### Détail des suggestions

#### 1. Aurora Veil — Gradient scroll-linked (Impact 5/5, Medium)
**Où :** Background global page, `position: fixed; z-index: -1`
**Quoi :** Un div fixe dont le background OKLCH change de teinte au scroll : rose (hero) → blush (produits) → or (atelier) → lavande (processus) → neutre (FAQ/newsletter). Opacité 3-6% max pour ne pas gêner la lisibilité.
**Tech :** `useScroll` + `useTransform` mappant `scrollYProgress` → hue OKLCH. `will-change: background`. Reduced-motion : fond neutre statique.
**Fichiers :** `app/(boutique)/(accueil)/page.tsx`, nouveau composant `aurora-veil.tsx`

#### 2. Fil d'Or — Connecteur doré (Impact 5/5, Hard)
**Où :** Marge gauche desktop, entre toutes les sections
**Quoi :** Ligne SVG dorée progressivement révélée au scroll, avec petites boucles décoratives aux frontières de sections. Mobile : petits points dorés entre sections.
**Tech :** SVG `stroke-dashoffset` + `motion.pathLength` via `useScroll`. Couleur `var(--secondary)` à 40%.
**Fichiers :** Nouveau composant `golden-thread.tsx`, `page.tsx`

#### 3. Mise en Lumière — View Transitions (Impact 5/5, Medium)
**Où :** Navigation Latest Creations / Collections → pages détail
**Quoi :** L'image produit effectue une transition morphing fluide vers la page de destination.
**Tech :** View Transitions API avec `view-transition-name` unique par produit. CSS `animation-duration: 0.35s ease-out`. Fallback : navigation standard.
**Fichiers :** Cards produit, pages détail, potentiellement wrapper router

#### 4. Confession Cinématique — Scroll-snap story (Impact 5/5, Hard)
**Où :** Section Atelier Story, zone texte confession
**Quoi :** Chaque paragraphe révélé un par un au scroll (scroll-snap), avec animations texte différentes et crossfade de photos d'atelier en arrière-plan.
**Tech :** CSS `scroll-snap-type: y mandatory`. Desktop uniquement, mobile reste layout actuel empilé.
**Fichiers :** `atelier-story.tsx`, nouveau wrapper scroll-snap

#### 5. Carte Postale — Titre Atelier visible (Impact 4/5, Easy)
**Où :** Section Atelier Story header
**Quoi :** Remplacer le h2 `sr-only` par un vrai titre visible style carte postale avec bordure en tirets, tampon postal SVG, léger tilt. Rétablit le pattern `SectionTitle` + `HandDrawnUnderline`.
**Tech :** HTML/CSS pur. `border: 2px dashed var(--primary)/30`, `rotate: -2deg`, tagline en Petit Formal Script.
**Fichiers :** `atelier-story.tsx`

#### 6. Bijoux en Mouvement — 3D tilt cards (Impact 4/5, Medium)
**Où :** Cartes produit Latest Creations (et optionnellement Collections)
**Quoi :** Tilt 3D subtil (max 4°) au survol curseur + reflet lumineux qui suit le mouvement, simulant un bijou qui capte la lumière.
**Tech :** Hook `use3DTilt` avec `onMouseMove`, `perspective: 1000px`, overlay `linear-gradient` dont l'angle suit le tilt. Désactivé sur touch + reduced-motion.
**Fichiers :** Nouveau hook, composant ProductCard

#### 7. Signature Reveal — Écriture animée (Impact 4/5, Easy)
**Où :** Signature "— Léane" dans Atelier Story
**Quoi :** Signature dessinée stroke-by-stroke au scroll, avec traînée lumineuse dorée (`feGaussianBlur` sur clone SVG).
**Tech :** Extension du pattern `HandDrawnAccent` existant. SVG `pathLength` + `useInView`. Glow `var(--secondary)` à 0.6.
**Fichiers :** `atelier-story.tsx`, potentiellement extension de `hand-drawn-accent.tsx`

#### 8. Vitrine Vivante — Images draggables (Impact 4/5, Medium)
**Où :** Images flottantes hero (desktop)
**Quoi :** Images devenues draggables avec spring-back à la release. Cursor `grab`/`grabbing`. Wiggle hint au premier hover.
**Tech :** `drag` + `dragConstraints` + `dragElastic: 0.3` sur la couche Motion existante. Spring `MOTION_CONFIG.spring.bouncy` au retour.
**Fichiers :** `floating-image.tsx`

#### 9. Newsletter Enchantée — Animation succès (Impact 4/5, Medium)
**Où :** Newsletter section, état post-soumission
**Quoi :** Form se transforme en enveloppe dorée qui se scelle avec un cachet de cire, burst de coeurs, texte "Bienvenue dans la famille !" en Petit Formal Script.
**Tech :** `AnimatePresence mode="wait"`, SVG animation séquencée (enveloppe + cachet + coeurs). Réutilise `HandDrawnAccent` heart.
**Fichiers :** `newsletter-section.tsx`, nouveau composant success

#### 10. Reflet Précieux — Shimmer doré (Impact 3/5, Easy)
**Où :** Tous les skeletons
**Quoi :** Remplacer `animate-pulse` gris par un shimmer diagonal doré (`var(--secondary)` à 8% opacité).
**Tech :** CSS `@keyframes shimmer` avec gradient `transparent → oklch(0.92 0.08 86 / 0.08) → transparent`, `background-size: 200%`, 1.5s infinite.
**Fichiers :** `globals.css`, tous les fichiers `*-skeleton.tsx`

#### 11. Palette Vivante — FAQ gradient border (Impact 3/5, Easy)
**Où :** FAQ accordion items ouverts
**Quoi :** Bordure gauche qui devient un gradient animé cyclant les 4 glow colors (pink → lavender → mint → yellow).
**Tech :** CSS `@property --faq-hue` + `@keyframes` rotation 8s. Fallback : bordure primary statique.
**Fichiers :** `faq-accordion.tsx`, `globals.css`

#### 12. Pluie de Confettis — Wishlist celebration (Impact 3/5, Easy)
**Où :** Bouton wishlist sur ProductCard
**Quoi :** Burst de 15-20 confettis pastels (peach, lavender, mint, blush, sky, cream) au clic coeur.
**Tech :** CSS `@keyframes` avec offsets aléatoires (pattern seededRandom existant). Cleanup auto après animation.
**Fichiers :** Nouveau composant `confetti-burst.tsx`, intégration dans HeartIcon/wishlist button

#### 13. Magnetic CTA — Boutons magnétiques (Impact 3/5, Medium)
**Où :** CTA hero, CTA Creative Process, submit Newsletter
**Quoi :** Bouton attiré de 2-4px vers le curseur quand il est à < 100px. Spotlight `radial-gradient` qui suit la position.
**Tech :** Hook `useMagneticButton` avec `useMotionValue`. Media query `can-hover`. Mobile : ripple `:active` CSS.
**Fichiers :** Nouveau hook, composants CTA concernés

#### 14. Typewriter Léane — Kinetic subtitle (Impact 3/5, Medium)
**Où :** Sous-titre hero
**Quoi :** Caractères apparaissent un par un façon machine à écrire, curseur clignotant, coeur bounce à la fin.
**Tech :** `motion.span` avec `staggerChildren` au niveau caractère. Texte dans le DOM pour SSR/LCP. First-visit only (localStorage).
**Fichiers :** Nouveau composant `typewriter-text.tsx`, `hero-section.tsx`

#### 15. Atelier Sonore — Son ambiant (Impact 3/5, Hard)
**Où :** Toggle global, sons contextuels
**Quoi :** Boîte à musique douce, carillons au hover produits, "ping" ajout wishlist. OFF par défaut.
**Tech :** Web Audio API, audio sprites < 50KB. Zustand store. `localStorage` pour préférence.
**Fichiers :** Nouveau module son, FAB toggle

---

## Ordre d'implémentation recommandé

**Phase 1 — Quick wins (Easy, 1-2h chacun) :**
1. Carte Postale (#5) — Fix le plus gros problème de hiérarchie
2. Reflet Précieux (#10) — Polish loading instantané
3. Signature Reveal (#7) — Extension du pattern existant
4. Palette Vivante (#11) — CSS pur, colore la FAQ

**Phase 2 — Impact moyen (Medium, 3-5h chacun) :**
5. Aurora Veil (#1) — Plus gros impact single-feature
6. Bijoux en Mouvement (#6) — Métaphore bijou parfaite
7. Vitrine Vivante (#8) — Wow factor interactif
8. Newsletter Enchantée (#9) — Micro-moment conversion

**Phase 3 — Ambitieux (Medium-Hard, 5-8h chacun) :**
9. Mise en Lumière (#3) — Game-changer navigation
10. Pluie de Confettis (#12) — Joie micro-interaction
11. Magnetic CTA (#13) — Polish premium

**Phase 4 — Expérimental (Hard) :**
12. Confession Cinématique (#4) — Storytelling immersif
13. Fil d'Or (#2) — Connecteur narratif ultime
14. Typewriter (#14) + Atelier Sonore (#15) — Nice-to-have

---

## Vérification

- Tester chaque effet avec `prefers-reduced-motion: reduce` dans DevTools
- Vérifier les performances avec Lighthouse (objectif : pas de régression TBT/CLS)
- Tester sur mobile 375px et tablette 768px pour chaque suggestion
- Valider le contrast ratio WCAG AA sur les nouvelles couleurs/gradients
- `pnpm build` + `pnpm test` après chaque phase
