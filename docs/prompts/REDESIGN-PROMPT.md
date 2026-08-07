# Prompt — Refonte UI/UX d'une surface ciblée

Prompt générique à copier-coller pour auditer puis refondre **un seul composant, une seule page ou une seule
section** de Synclune.

**Usage** : copie le bloc `text` entier, colle-le, puis renseigne les champs **en fin de bloc** — au minimum
`CIBLE`, avec le chemin exact (ex. `modules/products/components/product-card.tsx`,
`modules/cart/components/cart-sheet-footer.tsx`, `app/paiement/confirmation/`). Ils sont à la fin exprès :
collé en ligne de commande, le curseur y atterrit tout seul.

> Positionnement vs les autres catalogues : [`AUDIT-PROMPTS.md`](AUDIT-PROMPTS.md) couvre des **missions
> larges** par domaine (26 missions prédéfinies : 21 + 5 du Track Croissance — ⚠️ fichier restauré depuis
> HEAD le 2026-08-05, marqué incomplet en tête) ; [`prompts-audit-synclune.md`](prompts-audit-synclune.md)
> couvre des **audits notés /100** (rapport, pas de refonte) ; [`DESIGN-ARTIFACT-PROMPT.md`](DESIGN-ARTIFACT-PROMPT.md)
> **maquette 3-4 directions** sur une page publiée, pour arbitrer AVANT d'écrire du code. Ce fichier comble
> l'entre-deux : une refonte complète et implémentée, scopée à **une surface que tu désignes toi-même**.
>
> **Il se place en aval de l'artifact de design** : si une direction a déjà été arbitrée là-bas, remplis les
> cinq entrées en fin de bloc (`CIBLE` + les quatre recopiées de l'artifact) et le prompt bascule en mode
> « implémente cette direction » au lieu d'en chercher une.
>
> Le prompt est volontairement **court sur le quoi et long sur les faits** : la direction artistique est
> laissée au modèle, seuls l'ancrage factuel et les garde-fous sont prescrits. Un prompt qui dicte le design
> plafonne le résultat à ce que le rédacteur avait déjà en tête.

---

```text
Refonds ce que je vais te désigner — audit puis implémentation, dans la même session. Cette surface uniquement.
La cible, et la direction si elle a déjà été arbitrée, sont EN FIN DE MESSAGE.

### 0 — Ce que j'attends
Que cette surface devienne la plus belle du site — et qu'elle ressemble à **Synclune**, pas à une boutique de
bijoux en général : créative, colorée, faite main, avec quelqu'un derrière (§1). Tu as carte blanche sur la
direction : je ne veux pas d'options à arbitrer, je veux une conviction, implémentée. Le seul plafond est le
goût et les garde-fous plus bas. Si l'audit conclut que la surface est déjà juste, dis-le et fais une
restauration ciblée : une refonte qui n'améliore rien est un échec, pas une livraison.

**Bascule si `DIRECTION RETENUE` est remplie.** La direction a déjà été arbitrée sur maquettes ; ne la
re-litige pas et n'en propose pas d'autre. Trois choses changent :
- le §3 devient « **confirme-la ou conteste-la en 3 lignes** », puis implémente-la. Contester est permis —
  mais seulement sur un fait que la maquette ignorait (un invariant, un contenu réel, une contrainte
  technique), jamais sur un goût qui a déjà été tranché ;
- le §2 reprend `NOTE AVANT` comme note de départ au lieu de refaire le diagnostic à zéro, et n'audite que
  ce que les lots touchent ;
- `REFUS ET INVARIANTS HÉRITÉS` s'ajoute aux garde-fous plus bas, et les `LOTS` fixent l'ordre de
  livraison — un lot 0 se livre en premier et **dans son propre commit** (ce sont des bugs, pas du design).

### 1 — Ancrage factuel (avant toute critique)
Lis la cible, ses imports, ses voisins — puis le vocabulaire visuel déjà écrit dans le projet :
- `CLAUDE.md` : conventions, invariants React 19, § Voix, § Conventions UI (Breakpoints · Largeurs de
  contenu · Survol vs focus · Overlays · `render` vs `asChild` · `data-*` booléens)
- `app/globals.css` **et les 7 feuilles qu'il importe** (`app/styles/{pwa,scroll-fade,utilities,
  section-accents,animations,entrance,components}.css`). Attention à qui porte quoi : les **classes** sont
  dans les feuilles — `.enter-inview` et `.hand-draw-inview` (`entrance.css`), `.animate-shimmer` et
  `.product-item` (`animations.css`), `[data-accent]` (`section-accents.css`) — les **utilitaires et
  tokens** sont dans `globals.css` lui-même : `@utility focus-ring`, `@utility hover-halo`,
  `@utility shimmer-text`, `--z-*`, `--duration-*`
- `shared/components/animations/motion.config.ts` (`MOTION_CONFIG` : 7 durées — `fast .15` · `normal .2` ·
  `collapse .28` · `slow .3` · `medium .35` · `emphasis .4` · `slower .5`), `shared/styles/fonts.ts`,
  `shared/components/ui/`, `shared/constants/breakpoints.ts`
- le **vocabulaire visuel courant**, extrait en SSOT et déjà employé : `shared/components/squiggle-underline.tsx`,
  `masking-tape.tsx`, `CARD_SURFACE_POLAROID` (`card-surface.constants.ts`), `.polaroid-paper`
  (`components.css`). Une refonte qui les ignore fabrique un îlot — mais ne ressuscite pas une classe
  retirée : `.polaroid-hover` a été supprimée faute de consommateur, le commentaire à son ancien
  emplacement fait foi
- les données et contenus RÉELS de la cible — jamais de lorem, de faux avis ni de prix inventés
- `CLAUDE.md` § Direction artistique et `shared/constants/brand.ts` (SSOT du brief de marque) ;
  `shared/constants/atelier-content.ts` si la surface porte de la copie éditoriale

Puis `grep -rn "@regression" <dossier-cible> <dossiers-voisins>` — ciblé, pas le repo entier
(**382 fichiers de test** le portent).
Liste ce que chacun protège : un `@regression` verrouille un bug déjà payé une fois.

Puis liste `~/.claude/projects/-Users-adrienpoirier-Projets-synclune/memory/` et grep par sujet. La liste de
refus du §3 est un résumé ; `memory/` porte le MOTIF, et un refus exprimé il y a deux mois n'est pas rejouable.

⚠️ **Jamais de `grep`/`find` depuis la racine sans exclure `.claude/worktrees/`** : ce dossier contient une
copie périmée du repo et fait « exister » tous les chemins morts.

**Faits du projet — vérifiés le 2026-08-05. Si l'un d'eux ne correspond plus à ce que tu lis dans le repo,
LE REPO GAGNE** : corrige-toi, applique ce que tu as trouvé, et signale la dérive dans ta Restitution (§6).
C'est le seul bloc de ce prompt qui pourrit — un catalogue voisin s'est retrouvé avec ~25 % de chemins morts
faute de cette règle.
- **Qui vend** : une petite **micro-entreprise française** en franchise de TVA, **une seule personne**
  (Léane, la créatrice), qui livre en **France et dans l'UE**, ~20 commandes/mois. Ni équipe, ni gros
  trafic : une proposition qui suppose l'un ou l'autre est hors sujet.
- **Ce qu'elle vend** : des bijoux **créatifs, colorés, faits main** — des pièces uniques, pas une gamme.
  Léane décrit elle-même son point de départ ainsi : « une couleur dans la rue, un motif sur un tissu, un
  rêve », et ses bijoux comme une extension de sa passion, où « chaque couleur, forme, ligne est pensée et
  choisie avec soin ». C'est ÇA le produit : de la couleur, de la main, de la joie, une personne.
  ⚠️ Corollaire, et pas l'inverse : **ce n'est PAS de la joaillerie précieuse** — ni or, ni pierres, ni
  « luxe discret ». Une direction bâtie sur le métal précieux, la gravure, le noir et or ou le minimalisme
  froid est le **contre-pied du brief** (erreur déjà commise et jetée). Vise le soin artisanal et la joie,
  jamais le prestige.
- Polices (SSOT `shared/styles/fonts.ts`) : **Winky Sans** (`--font-display`), **Onest** (`--font-sans`),
  **Kalam** (`--font-cursive`) — cette dernière est RÉSERVÉE au décoratif : jamais un prix, un libellé de
  formulaire, de la nav ou du body ; ni `font-bold` ni `italic`. Caveat et Bricolage n'existent pas ici.
- **Aucun thème sombre dans l'application** : pas de bloc `.dark`, pas de `next-themes`, aucun variant
  `dark:`. N'en invente pas un. **Deux exceptions réelles** : le client e-mail, qui impose l'inversion ; et
  le **Payment Element Stripe**, qui bascule pour de bon (`stripeAppearanceDark` dans
  `modules/payments/constants/stripe-appearance.ts`, sélectionné par `use-stripe-appearance.ts` sur
  `prefers-color-scheme: dark`). Si ta cible touche le tunnel de paiement, ce rendu existe.
- Le rose se référence par `--primary`, jamais en hex.
- Pas de `useMemo` / `useCallback` / `React.memo` / `forwardRef`, et pas de `setState` dans un `useEffect`
  (dérive pendant le rendu).

**🎨 La couleur et la main sont le sujet, pas la décoration.** C'est la partie du brief la plus souvent
sous-jouée : à force d'éviter le « pas de luxe », on livre du rose pâle sur du blanc, propre et sans
personne dedans. Une boutique de bijoux COLORÉS faits main qui ressemble à un template neutre a raté le
brief aussi sûrement qu'une qui ferait de la haute joaillerie.
- **La palette existe et n'est pas décorative.** Quatre accents de marque, avec un récit :
  `[data-accent="rose|lavender|mint|sun"]` (`app/styles/section-accents.css`) exposent
  `--section-accent` / `--section-glow` / `--section-soft`. Le rose EST `--primary` (jamais dupliqué) ; les
  trois autres sont `--color-brand-{lavender,mint,sun}`, doublés de halos translucides
  `--color-glow-{pink,lavender,mint,yellow}`. Une surface a le droit d'être franchement colorée. Si tu
  n'utilises que `--primary` et des gris, demande-toi si c'est de la retenue ou de la timidité.
- **Le geste à la main est la signature.** `HandDrawnAccent` (cercle tracé à la main),
  `HandDrawnUnderline`, `SquiggleUnderline`, `MaskingTape`, `CARD_SURFACE_POLAROID`, `.polaroid-paper` —
  ce vocabulaire dit « fait par quelqu'un » mieux que n'importe quel adjectif. Il est déjà en SSOT :
  réemploie-le plutôt que d'inventer un dialecte à côté. Une ligne parfaitement droite là où le reste du
  site trace à la main est une rupture, pas une sobriété.
- **La voix est à la première personne.** Léane parle d'elle (« je », « mon atelier ») ; la copie tutoie la
  cliente. Un ton corporate impersonnel (« nos artisans », « notre maison ») est faux : il n'y a qu'elle.
- **Le test** : si ta surface pouvait servir telle quelle à n'importe quelle boutique de bijoux, elle est
  ratée — pas parce qu'elle est laide, parce qu'elle ne raconte personne.

Si la cible touche l'un de ces 5 points, relis la puce correspondante de **`CLAUDE.md` § Conventions UI** — ce
sont les pièges qui ont produit le plus de P0 sur ce projet, pas des risques théoriques :
- un seuil responsive en JS ou en CSS → **Breakpoints** (rem partout, jamais px) ;
- un panneau modal ou latéral → **Overlays** (quelle primitive, et jamais `<SheetClose render={<Link/>}>` —
  la syntaxe est `render`, plus `asChild` : les 4 familles sont passées à Base UI) ;
- une affordance porteuse d'information révélée au survol → **Survol vs focus** (jamais de règle de focus
  derrière `can-hover:` — et c'est le **masquage** qu'on gate, pas la révélation, sinon le CTA reste
  cliquable en `opacity-0` sur iPad) ;
- **une animation de SORTIE** → § « Un `animate-out` sans `fill-mode-forwards` est un bug ». Les keyframes
  `exit` de tw-animate-css n'ont qu'un `to` et `fill-mode: none` : un élément encore monté **redevient
  pleinement visible** à la fin de sa sortie. Corollaire : un scrim déclare une durée EXPLICITE égale à celle
  de son popup, sinon il retombe sur le défaut 150 ms. Les 4 scrims sont partis avec ce défaut ;
- une région annoncée dynamiquement → elle ne doit pas être montée avec son contenu déjà présent, sinon aucun
  lecteur d'écran ne la vocalise.

**⚠️ Tu ne pourras peut-être pas VOIR la surface — sache-le avant de planifier, pas à la fin.** C'est le vrai
plafond de qualité de ce prompt, pas sa rédaction.
- La base de dev **n'a aucun produit `PUBLIC`**. Toute surface catalogue (PDP, `/produits`, `ProductCard`,
  collections, recherche) se rend donc **vide**. Une capture d'état vide ne prouve rien sur la refonte.
- **Ne lance JAMAIS `pnpm seed` de toi-même** : il fait un wipe complet et refuse de tourner sans
  `SEED_ALLOW="true"`. Cette garde est délibérée. Si tu as besoin de données, **demande-les**.
- **Ce qui se rend quand même**, et qui suffit souvent : les pages de `app/(legal)/` (`/cgv`,
  `/mentions-legales`, `/confidentialite`, `/cookies`, `/accessibilite`, `/retractation`,
  `/informations-legales`), `/connexion`, et
  les **états vides** de `/panier` et `/favoris`. Un composant partagé — navbar, footer, overlay, bouton,
  champ de formulaire — se juge parfaitement sur `/cgv`, qui ne dépend d'aucun produit. Cherche l'hôte le
  moins exigeant avant de conclure que c'est impossible.
- Pour l'admin, le projet Playwright **`authenticated-admin`** existe (state `e2e/.auth/admin.json`, produit
  par le projet `setup`).
- `playwright.config.ts` déclare `webServer` avec `reuseExistingServer` hors CI : lance `pnpm dev`, puis tes
  captures réutilisent ce serveur.
- **Si vraiment rien ne se rend**, le repli est le CSS COMPILÉ, pas le JSX. ⚠️ Piège : le CSS compilé échappe
  les crochets **et les points** — chercher `lg:[&_>_div]:size-12` littéralement ne trouve rien et fait
  conclure à tort « la classe n'a pas compilé ».
- Et un scope `"use cache"` peut te servir du **HTML périmé en dev** : si tes éditions semblent sans effet,
  redémarre le serveur avant de chercher un bug qui n'existe pas.

### 1bis — Identifie la NATURE de la cible, et adapte-toi
Une refonte ne se vérifie pas de la même façon selon ce qu'on refond. Prends la ligne qui correspond ; elle
fixe tes largeurs de capture pour le §Vérification et te dit où tu vas te tromper.

| Nature de la cible | Ce que « refondre » veut dire ici | Largeurs / passes | Le piège propre à cette nature |
|---|---|---|---|
| Composant storefront | Dans son contexte réel, avec ses voisins | 1280 · 768 · 390 | Le juger seul : il ne vit jamais seul |
| Page ou section | + ce qui la précède et la suit | 1280 · 768 · 390 | Le hors-champ. Une section réussie qui casse le rythme de la page est un échec |
| Parcours (checkout, suivi de commande) | Les N écrans **et les branches d'échec** | 390 d'abord, puis 1280 · **+ sombre si le Payment Element est à l'écran** | Ne traiter que le happy path. En card-only, le refus de carte est le chemin le plus fréquent |
| Overlay (sheet, drawer, dialog, popover, menu) | Ouvert **sur son hôte**, scrim compris, jamais détouré | 390 **et** 1280 (la primitive change de forme) | Le juger seul sur fond blanc. Montre au moins une fois l'état empilé — et vérifie la sortie, pas seulement l'entrée |
| Surface admin | Densité réelle, 30+ lignes, grille sans `mx-auto` | **1680** (montre le plafond) · 1280 | Viser la beauté : c'est un **outil de travail**, on compte les clics et les allers-retours de l'œil. ⚠️ À 1280, `max-w-[100rem]` est plafonné par le viewport — le plafond ne se voit **jamais** |
| E-mail transactionnel | Tables, largeur 600, pas de flex/grid, pas de `@media` fiable | 600 · 320, **clair ET sombre** | Gmail et Apple Mail **imposent** l'inversion sombre. Non testé en sombre = à moitié vérifié |
| PDF facture / avoir | Une page A4 à l'échelle, mentions légales réelles | A4 | Le rendu est **déterministe et hashé SHA-256** (Art. L102 B LPF) : toute évolution ne vaut que pour les documents **FUTURS**, jamais pour un archivé |
| Copie éditoriale (CGV, mentions, FAQ de la landing, atelier) | Mesure, rythme vertical, ancrages — avec le VRAI texte | 1280 · 390 | Traiter la mise en page sans écrire le texte : ici la copie EST le design. Et une page légale se **scanne** pour trouver une clause, elle ne se lit pas au fil |
| Système transverse (design system, motion, icônes) | Une planche de spécimens, avant/après en regard | selon le système | N'en montrer qu'un exemplaire : la cohérence ne se juge qu'en série |
| Matrice d'états (vide, chargement, erreur, succès) | La matrice complète, pas un écran | celles de l'hôte | Un skeleton sans la géométrie exacte du contenu réel produit un saut de layout |

Si la cible relève de plusieurs lignes (« le panier » = composant + parcours + états), **traite-les toutes**.

**Le registre change avec la surface.** Le §0 dit « la plus belle du site » : c'est vrai pour la vitrine. En
admin, la mesure est la **densité et le nombre de gestes**, pas l'élégance — une surface admin plus jolie et
plus lente est une régression.

**Un axe de note peut être substitué**, une fois, quand il est sans objet : pour un PDF, `Responsive` devient
`Impression & conformité` ; pour un e-mail, `Compatibilité clients`. Dis-le si tu le fais.

### 2 — Diagnostic (court, concret)
Ce que la surface réussit — nomme-le explicitement, c'est la liste de ce que la refonte devra **préserver** ·
3 à 5 défauts, chacun ancré sur un `fichier:ligne` ou un choix de composition précis (rien de générique),
classés P0 (casse) / P1 (dessert) / P2 (perfectible) · une note /20 · et ce qui l'empêche d'atteindre 20,
parmi : direction artistique, hiérarchie & composition, UX, responsive, accessibilité, technique.

Calibrage, pour que la note veuille dire quelque chose : **20** = rien à ajouter ni retrancher · **17** =
juste, sans signature · **14** = correct, avec un défaut qu'on remarque · **11** = ça fonctionne et ça
dessert · **8** = un utilisateur y renonce ou s'y trompe.

⚠️ Si `NOTE AVANT` est vide ou marquée « sans objet » (surface neuve, ou vidée en attente de refonte), **n'en
invente pas une** : dis que la note de départ est sans objet, et remplace le diagnostic par les
**contraintes** de la surface et la **référence** dont tu pars.

### 3 — Direction (une seule, assumée, 5 lignes max)
Idée directrice · émotion visée · nouvelle hiérarchie · et **l'ancrage Synclune**, qui doit pointer un artefact
réel du repo (une valeur de `globals.css`, un timing de `MOTION_CONFIG`, un pattern déjà validé ailleurs sur le
site) — pas une liste d'adjectifs qui décrirait n'importe quelle boutique.

Trois exigences qui séparent une direction d'une ambiance :
- **Un concept falsifiable.** Une phrase qui pourrait être fausse. Test : remplace « Synclune » par n'importe
  quelle autre boutique — si elle tient encore, elle est vide. « Épuré et chaleureux » est vide ; « la barre
  devient la tranche d'un tirage photo : tout ce qui est cliquable est posé dessus, rien n'est dedans » est
  un concept.
- **Des nombres.** Le ratio de l'échelle typo et les 3-4 tailles réellement utilisées · la base du rythme
  d'espacement · l'épaisseur des traits · le rayon · la durée et la courbe des transitions, **prises dans
  `MOTION_CONFIG`**, pas inventées.
- **Ce qui la tuerait.** Une ligne : le critère d'échec. « Si Léane trouve que ça fait fouillis, elle
  tombe » · « si le catalogue passe à 200 pièces, elle ne tient plus ». Tu le vérifieras au §Vérification.

**Les mots sont du design.** Écris la copie réelle — titres, libellés de boutons, états vides — au tutoiement.
« Découvrez notre collection » n'est pas de la copie, c'est un emplacement de copie. Un bouton se nomme par ce
qu'il fait pour la cliente.

Sois audacieux : casse une symétrie, contraste l'échelle typographique, sors de la grille, **ose la couleur**.
**Un seul geste fort, tenu jusqu'au bout, bat trois effets tièdes.** Ce qui n'aide ni à lire, ni à comprendre,
ni à désirer : coupe-le, même si c'est joli.

Le risque réel sur ce projet n'est pas d'aller trop loin, c'est de livrer du **propre et vide**. Je peux
refuser une direction trop vive ; je ne peux pas deviner celle que tu n'as pas osée. Si ta proposition est
plus sage que ce que je t'aurais demandé spontanément, tu as sous-livré.

**Déjà proposé et refusé sur ce projet — ne le repropose pas :**
- **Mouvement** : View Transition sur une fermeture Vaul, sur l'ouverture d'un sheet, sur `onSelect` d'Embla,
  ou du hero flottant vers la PDP · hook `useMotionAllowed` · micro-animation sans fonction.
- **Overlays** : `Drawer` pour une confirmation (c'est `AlertDialog`) · `handleOnly` par défaut.
- **Storefront** : curseur qui suit dans le hero · chevron de scroll dans le hero · CTA sticky mobile sur la
  PDP · icônes dans le bandeau réassurance **du hero** · troisième entrée dans la nav desktop.
- **Admin** : double bouton retour en mobile · bouton Cancel sur les formulaires de création.
- **Formulaires** : `autoFocus` · persistance du formulaire de paiement (KI-002, refusé deux fois).
- **Haptique** : jamais sur une action passive ni un simple affichage.

Et une préférence, qui n'est pas un refus : **patterns natifs plutôt que rustines cosmétiques**.

La liste fait foi dans `docs/prompts/DESIGN-ARTIFACT-PROMPT.md` §8, adossée à `memory/` — où figure le motif
de chacun. Si tu en trouves un de plus là-bas, il compte : applique-le et signale-le.

### 4 — Comment tu mènes l'implémentation
- **Le lot 0 d'abord, et dans son propre commit.** Tout défaut que tu trouves et qui est indépendant de la
  direction (un bug, un `opacity-0` cliquable, un contraste raté) se livre AVANT la refonte et séparément :
  ce sont des bugs, pas du design, et les mêler rend le diff illisible.
- ⚠️ **L'index git est PARTAGÉ avec d'autres sessions.** Jamais de `git add -A` : tu committerais le travail
  en cours de quelqu'un d'autre. Ajoute tes fichiers nommément. Trois pertes de fichiers non commités sont
  déjà documentées sur ce projet.
- **Si le vrai défaut est HORS de la cible, dis-le, ne l'élargis pas en silence.** Plusieurs audits ont
  trouvé leurs P0 chez un voisin. Le bon geste : traiter la cible, nommer le défaut extérieur dans les
  Arbitrages, et proposer un ticket — pas refondre trois modules sans qu'on l'ait demandé.
- **Une refonte crée ses PROPRES bugs, systématiquement.** Ce n'est pas une possibilité, c'est le mode de
  panne observé : la `ProductCard` refondue sur un audit à 79 a été ré-auditée **72**, avec 7 lots de
  correctifs — dont un CTA en `opacity-0` resté **cliquable** sur iPad, et un `overflow` qui clippait la
  carte sur `/favoris`. Les bugs se logent dans les angles morts de la direction que tu viens d'adopter,
  là où tu ne regardes plus. Avant de rendre, **relis ton propre diff en cherchant ce que ta direction
  t'empêche de voir**, et vérifie explicitement le critère d'échec que tu as déclaré au §3.

### Garde-fous
- **Tokens** — aucune couleur, ombre, durée ou rayon en dur. Les familles existent, sers-t'en :
  `--duration-{fast,normal,slow,slower}` · `--ease-{spring,smooth-out,premium}` · `--shadow-{2xs…2xl}` +
  `--shadow-{header,paper}` · `--radius{,-sm,-md,-lg,-xl,-full}` · `--tracking-{tighter…widest}` · `--z-*`.
  **Ne forke jamais un token.**
- **Dépendances** — pas une de plus pour un effet mineur. Si tu en ajoutes une (ou un asset, ou une police),
  `pnpm size` : ⚠️ **il est déjà rouge sur `main`** (chunks plats Turbopack), juge ton **delta**, pas le vert
  absolu.
- **Frontières** — ne touche ni à la logique métier, ni aux contrats de Server Actions, ni aux frontières
  `"use cache"`.
- **Voix** — copie en français, au **tutoiement** (seule exception documentée : les messages d'erreur Stripe).
- **Mouvement** — toute animation ajoutée a un fallback `prefers-reduced-motion`, et `forced-colors` si un
  état ne se distingue que par la couleur.
- **A11y** — cibles tactiles ≥ 44px · **contraste AA : 4,5:1 sur le texte, 3:1 sur les éléments d'interface
  et les états de focus** · le halo de focus passe par `@utility focus-ring`, jamais par un `ring-*` refait
  à la main.
- **Composant partagé** — propage la cohérence à TOUS ses usages, ou reste strictement local. Pas d'entre-deux.
- **Tests verrouillés** — un `@regression` ne se modifie qu'avec la raison écrite dans les Arbitrages.

**Tiens sur le contenu le plus laid, pas sur le plus beau.** La refonte doit survivre, et tu dois le montrer :
un titre à 60 caractères · un prix à quatre chiffres · l'état vide · l'état chargement · l'erreur · la rupture
de stock ET la promo en même temps · une seule ligne, et quarante. Une surface qui ne marche qu'avec
« Collier Aurore — 38 € » n'est pas livrable. Un skeleton qui n'a pas la géométrie exacte du contenu réel
produit un saut de layout. Si la surface est commerciale, elle gère l'état **boutique fermée**
(`assertStoreOpen()`), elle ne le contourne pas.

**Ne tombe pas dans tes propres défauts.** Ces réflexes-là sont les tiens, pas ceux du projet, et ils sont
interdits ici : dégradé violet/bleu · glassmorphism décoratif · « héro + trois cartes à icônes » · tout
centrer · emoji en guise d'icône · `box-shadow: 0 4px 6px rgba(0,0,0,.1)` posée partout · un rayon unique sur
toutes les surfaces · le « premium » signifié par le noir et l'or (contre-brief absolu) · la police display
employée pour le corps de texte · un espacement uniforme (le rythme plat est l'ennemi de la hiérarchie) · une
micro-animation sans fonction · un « badge de confiance » inventé.

⚠️ **Deux échecs de build invisibles au lint ET au typecheck** : un enum/type Prisma atteint depuis un graphe
client (importe depuis `@/app/generated/prisma/enums`), et un `createContext` atteint depuis un Server Component. Si tu ajoutes
un provider, un contexte ou un import Prisma, lance `pnpm build` en entier — un `| tail` masque l'échec.

### Vérification (aucun point laissé « à confirmer »)
`pnpm validate` (= lint + typecheck + format:check + vitest) — et `pnpm test:critical` si la cible est dans
cart, orders, payments, webhooks, auth, refunds, invoices, `app/api/webhooks/stripe` ou
`test/contract`. Si tu as supprimé des composants, `pnpm knip` : les exports morts qu'une refonte laisse
derrière elle ne sont visibles par rien d'autre.

Puis **regarde vraiment le résultat**. L'outillage existe, pars de lui plutôt que de re-dériver des largeurs :
les projets de `playwright.config.ts` (`tablet-portrait` force déjà 768×1024, plus `mobile-chrome`,
`tablet-landscape`, `authenticated-admin` pour une cible admin) et la SSOT `VIEWPORTS` de `e2e/constants.ts`.
Un script jetable reste permis — mais il **consomme** ces constantes. Capture aux largeurs de la ligne que tu
as retenue au §1bis, plus une passe `prefers-reduced-motion: reduce`, et **rouvre les captures pour les
juger**. Le JSX ne dit rien du rythme d'espacement, du contraste réel ni du feel d'une animation. 768px (iPad
portrait) est le point mort documenté du projet, pas un intermédiaire décoratif.

À chaque largeur, assert `document.documentElement.scrollWidth <= window.innerWidth` : un débordement
horizontal ne se voit pas sur une capture déjà rognée. Fais un passage clavier seul (Tab) sur tous les
interactifs de la cible, et passe `expectNoA11yViolations` (`e2e/helpers/axe.ts`) sur la surface.

Tout défaut que tu corriges au passage repart avec **le test qui l'aurait attrapé** — sinon il reviendra.

Si tu ne peux pas rendre la page (base indisponible, quota, build cassé), écris-le noir sur blanc et dis ce que
tu n'as donc pas pu juger. Ne présente jamais une vérification visuelle que tu n'as pas faite.

### Restitution finale (uniquement ça)
1. **Verdict** — note avant / note après / défaut principal corrigé / direction retenue. La note après se
   justifie critère par critère, sur le calibrage du §2 ; si elle n'atteint pas 20, dis ce qui manque et
   pourquoi tu l'as laissé. Le /20 note **la surface** ; ne le convertis jamais dans le /100 de
   `prompts-audit-synclune.md`, qui mesure la même chose à une autre échelle, et ne les affiche pas ensemble.
2. **Fichiers modifiés**
3. **Améliorations** — UI, UX, responsive, a11y, technique
4. **Arbitrages** — ce que tu as volontairement écarté et pourquoi, y compris tout `@regression` touché
5. **Validation** — la sortie réelle de chaque commande, et ce que les captures ont montré
6. **Dérives constatées** — tout fait de ce prompt qui ne correspondait plus au repo. Vide si rien. C'est ce
   point qui empêche ce fichier de pourrir ; ne le saute pas parce qu'il paraît vide.
7. **Pour le ré-audit** — ce que tu regarderais en premier si tu devais casser ton propre travail : la
   décision la plus fragile, l'état que tu as le moins vérifié, le viewport où tu es le moins serein. Le
   ré-audit en session fraîche n'est pas optionnel sur ce projet (cf. `docs/prompts/README.md`) ; ces trois lignes sont
   son point de départ. Et si tu as découvert un refus, un piège ou un invariant qui n'était écrit nulle
   part, dis-le explicitement pour qu'il rejoigne `memory/` — c'est ce cliquet qui fait que personne ne
   repropose deux fois la même chose.

═══════════════════════════════════════════════════════════════════════════════
CIBLE, ET DIRECTION SI DÉJÀ ARBITRÉE
═══════════════════════════════════════════════════════════════════════════════
Seule `CIBLE` est obligatoire. Les quatre autres entrées ne servent QUE si la direction a déjà été arbitrée
sur un artifact de design (cf. DESIGN-ARTIFACT-PROMPT.md) : laisse-les vides sinon, et ignore la règle de
bascule du §0.

CIBLE : <CIBLE>
DIRECTION RETENUE : <lettre + nom + concept + les nombres et le critère d'échec, recopiés de #directions>
NOTE AVANT : <note /20 + les 6 jauges + l'encadré « ce qui est déjà juste », recopiés de #verdict>
REFUS ET INVARIANTS HÉRITÉS : <section #gardefous, recopiée telle quelle>
LOTS : <tableau Lot | Contenu | Dépend de, recopié de #reco>
```
