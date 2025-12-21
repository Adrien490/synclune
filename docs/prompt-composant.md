# Audit complet de composant React (Mobile & Desktop)

## Stack technique de référence
- **Framework** : Next.js 16 (App Router, Turbopack, Cache Components)
- **UI** : React 19.2
- **Styling** : Tailwind CSS v4
- **Standards** : WCAG 2.2 AA

## Scope de l'audit
⚠️ **L'audit doit couvrir** :
- Le composant principal
- **Tous ses sous-composants** (imports locaux, composants enfants, composants partagés utilisés)
- Les interactions entre composants (props, composition, contexte)

## Viewports à analyser
⚠️ **L'audit doit couvrir les deux contextes** :
- **Mobile** : 320px → 768px (touch, zones tactiles, navigation thumb-friendly)
- **Desktop** : 1024px+ (hover states, curseur, densité d'information)

## Périmètre de l'audit

### 1. Accessibilité (A11y)
- Sémantique HTML (landmarks, headings, listes)
- Navigation clavier (focus, tabindex, focus-visible)
- Attributs ARIA (labels, roles, états)
- Contrastes de couleurs (ratio WCAG)
- Textes alternatifs et liens explicites
- Support lecteurs d'écran

### 2. UX
- Hiérarchie visuelle et lisibilité
- Zones de clic/tap (min 44x44px sur mobile, 24x24px sur desktop)
- Feedback utilisateur (hover sur desktop, active/tap sur mobile)
- Cohérence des interactions selon le device
- Performance perçue

### 3. UI / Code
- Responsive design (mobile-first, breakpoints sm/md/lg/xl)
- Comportement adaptatif (layouts, typographie, espacements)
- Utilisation idiomatique de Tailwind v4 (CSS-first config, @theme, variantes)
- Patterns Next.js 16 (Cache Components, proxy.ts, Turbopack, Image, Link sans legacyBehavior)
- Patterns React 19.2 (Server Components, use(), View Transitions, useEffectEvent)
- React Compiler compatibility (éviter les patterns non-memoizables)
- DRY et maintenabilité

## Format de réponse attendu

### 🗂️ Arborescence analysée
Lister le composant principal et tous les sous-composants audités.

### ✅ Points conformes
Liste concise des bonnes pratiques déjà respectées (préciser le composant concerné si pertinent).

### ⚠️ Problèmes identifiés
Pour chaque problème :
- **Composant** : Nom du composant concerné
- **Catégorie** : A11y | UX | UI | Perf | Code
- **Sévérité** : Critique | Majeur | Mineur
- **Viewport** : 📱 Mobile | 🖥️ Desktop | 📱🖥️ Les deux
- **Description** : Explication factuelle
- **Ligne(s)** : Référence au code si applicable

### 💡 Recommandations
Pour chaque problème, proposer une solution concrète avec extrait de code si pertinent.

## Consignes
- ⚠️ **Analyser le composant ET tous ses sous-composants** — remonter l'arborescence si nécessaire
- ⚠️ **Analyser systématiquement mobile ET desktop** — signaler les problèmes spécifiques à chaque viewport
- Ne rien inventer : se baser uniquement sur le code fourni et les standards actuels
- Si le composant est conforme, le dire clairement
- Prioriser les problèmes par impact utilisateur

---

## Composant à analyser (avec ses sous-composants)
