# Prompt — Refonte UI/UX d'une surface ciblée

Prompt générique à copier-coller pour auditer puis refondre **un seul composant, une seule page ou une seule
section** de Synclune. Remplace `<CIBLE>` par le chemin exact avant de coller (ex.
`app/(shop)/(home)/_components/atelier-section/`, `modules/cart/components/cart-sheet-footer.tsx`,
`app/(account)/commandes/[orderNumber]/page.tsx`).

> Positionnement vs les autres catalogues : [`AUDIT-PROMPTS.md`](AUDIT-PROMPTS.md) couvre des **missions
> larges** par domaine (24 missions prédéfinies) ; [`prompts-audit-synclune.md`](prompts-audit-synclune.md)
> couvre des **audits en lecture** (rapport /100, pas de refonte). Ce fichier comble l'entre-deux : une refonte
> complète et implémentée, scopée à **une surface que tu désignes toi-même**.
>
> Le prompt est volontairement **court sur le quoi et long sur les faits** : la direction artistique est
> laissée au modèle, seuls l'ancrage factuel et les garde-fous sont prescrits. Un prompt qui dicte le design
> plafonne le résultat à ce que le rédacteur avait déjà en tête.

---

```text
Refonds ce que je vais te désigner — audit puis implémentation, dans la même session. Cette surface uniquement.

### 0 — Ce que j'attends
Que cette surface devienne la plus belle du site. Tu as carte blanche sur la direction : je ne veux pas
d'options à arbitrer, je veux une conviction, implémentée. Le seul plafond est le goût et les garde-fous plus bas.
Si l'audit conclut que la surface est déjà juste, dis-le et fais une restauration ciblée : une refonte qui
n'améliore rien est un échec, pas une livraison.

### 1 — Ancrage factuel (avant toute critique)
Lis la cible, ses imports, ses voisins — puis le vocabulaire visuel déjà écrit dans le projet :
- `CLAUDE.md` : conventions, invariants React 19, et les sections Breakpoints / Overlays / Survol vs focus / Voix
- `app/globals.css` **et les 6 feuilles qu'il importe** (`app/styles/{utilities,animations,entrance,components,
  section-accents,pwa}.css`) — c'est là que vivent `.enter-inview`, `.hand-draw-inview`, `.animate-shimmer`,
  `.product-item`, `[data-accent]`, `@utility hover-halo`, `@utility focus-ring`
- `shared/components/animations/motion.config.ts` (`MOTION_CONFIG`), `shared/styles/fonts.ts`,
  `shared/components/ui/`, `shared/constants/breakpoints.ts`
- les données et contenus RÉELS de la cible — jamais de lorem, de faux avis ni de prix inventés
- `docs/KNOWN-ISSUES.md` si la cible touche le panier ou le checkout

Puis `grep -rn "@regression" <dossier-cible> <dossiers-voisins>` — ciblé, pas le repo entier (251 fichiers).
Liste ce que chacun protège : un `@regression` verrouille un bug déjà payé une fois.

**Faits du projet — ne les réinvente pas, ne les contredis pas :**
- Polices (SSOT `shared/styles/fonts.ts`) : **Fraunces** (`--font-display`), **Figtree** (`--font-sans`),
  **Sacramento** (`--font-cursive`) — cette dernière est RÉSERVÉE au décoratif : jamais un prix, un libellé de
  formulaire, de la nav ou du body ; ni `font-bold` ni `italic`. Caveat n'existe plus dans ce projet.
- **Aucun thème sombre** : pas de bloc `.dark`, pas de `next-themes`. N'en invente pas un.
- Le rose se référence par `--primary`, jamais en hex.
- Pas de `useMemo` / `useCallback` / `React.memo` / `forwardRef`, et pas de `setState` dans un `useEffect`
  (dérive pendant le rendu).

Si la cible touche l'un de ces 4 points, relis la section correspondante de `CLAUDE.md` — ce sont les pièges
qui ont produit le plus de P0 sur ce projet, pas des risques théoriques :
- un seuil responsive en JS ou en CSS → **Breakpoints** (rem partout, jamais px) ;
- un panneau modal ou latéral → **Overlays** (quelle primitive, et jamais `<SheetClose asChild><Link>`) ;
- une affordance porteuse d'information révélée au survol → **Survol vs focus** (jamais de règle de focus
  derrière `can-hover:`) ;
- une région annoncée dynamiquement → elle ne doit pas être montée avec son contenu déjà présent, sinon aucun
  lecteur d'écran ne la vocalise.

### 2 — Diagnostic (court, concret)
Ce que la surface réussit · 3 à 5 défauts, chacun ancré sur un `fichier:ligne` ou un choix de composition
précis (rien de générique) · une note /20 · et ce qui l'empêche d'atteindre 20, parmi : direction artistique,
hiérarchie & composition, UX, responsive, accessibilité, technique.

### 3 — Direction (une seule, assumée, 5 lignes max)
Idée directrice · émotion visée · nouvelle hiérarchie · et **l'ancrage Synclune**, qui doit pointer un artefact
réel du repo (une valeur de `globals.css`, un timing de `MOTION_CONFIG`, un pattern déjà validé ailleurs sur le
site) — pas une liste d'adjectifs qui décrirait n'importe quelle boutique.

Sois audacieux : casse une symétrie, contraste l'échelle typographique, sors de la grille. **Un seul geste fort, tenu
jusqu'au bout, bat trois effets tièdes.** Ce qui n'aide ni à lire, ni à comprendre, ni à désirer : coupe-le,
même si c'est joli.

Déjà proposé et refusé sur ce projet — ne le repropose pas : View Transition sur une fermeture Vaul, `Drawer`
pour une confirmation, `handleOnly` par défaut, curseur qui suit dans le hero, chevron de scroll dans le hero,
CTA sticky mobile sur la PDP, `autoFocus` dans un formulaire.

### Garde-fous
Réutilise en priorité les tokens, composants et dépendances déjà présents — aucune couleur, ombre ou durée en
dur. Pas de nouvelle dépendance pour un effet mineur ; si tu en ajoutes une (ou un asset, ou une police),
`pnpm size`. Ne touche ni à la logique métier, ni aux contrats de Server Actions, ni aux frontières
`"use cache"`. Copie en français au **tutoiement** (seule exception documentée : les messages d'erreur Stripe).
Toute animation ajoutée a un fallback `prefers-reduced-motion` — et `forced-colors` si un état ne se distingue
que par la couleur. Cibles tactiles ≥ 44px. Si la cible est un composant partagé : propage la cohérence à tous
ses usages, ou reste strictement local — mais ne forke jamais un token. Un test `@regression` ne se modifie
qu'avec la raison écrite dans les Arbitrages.

⚠️ **Deux échecs de build invisibles au lint ET au typecheck** : un enum/type Prisma atteint depuis un graphe
client (importe depuis `prisma/enums`), et un `createContext` atteint depuis un Server Component. Si tu ajoutes
un provider, un contexte ou un import Prisma, lance `pnpm build` en entier — un `| tail` masque l'échec.

### Vérification (aucun point laissé « à confirmer »)
`pnpm typecheck` · `pnpm lint` · `pnpm format:check` · `pnpm test <périmètre>` — et `pnpm test:critical` si la
cible est dans cart, orders, payments, webhooks, auth, discounts, refunds ou invoices.

Puis **regarde vraiment le résultat** : écris un script Playwright jetable qui capture la cible à 375, 768 et
1280 px, plus une passe `prefers-reduced-motion: reduce`, et **rouvre les captures pour les juger**. Le JSX ne
dit rien du rythme d'espacement, du contraste réel ni du feel d'une animation. 768px (iPad portrait) est le
point mort documenté du projet, pas un intermédiaire décoratif. Fais aussi un passage clavier seul (Tab) sur
tous les interactifs de la cible.

Si tu ne peux pas rendre la page (base indisponible, quota, build cassé), écris-le noir sur blanc et dis ce que
tu n'as donc pas pu juger. Ne présente jamais une vérification visuelle que tu n'as pas faite.

### Restitution finale (uniquement ça)
1. **Verdict** — note avant / note après / défaut principal corrigé / direction retenue. La note après se
   justifie critère par critère ; si elle n'atteint pas 20, dis ce qui manque et pourquoi tu l'as laissé.
2. **Fichiers modifiés**
3. **Améliorations** — UI, UX, responsive, a11y, technique
4. **Arbitrages** — ce que tu as volontairement écarté et pourquoi, y compris tout `@regression` touché
5. **Validation** — la sortie réelle de chaque commande, et ce que les captures ont montré
```
