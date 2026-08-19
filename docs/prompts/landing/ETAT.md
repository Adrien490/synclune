# État courant — landing.pen

> **Réécrit** à chaque passe, ≤ 80 lignes — le script l'injecte aux tours avec les deux dernières
> entrées de `NOTES.md` ; le carnet, lui, ne se réécrit jamais (le *pourquoi* est là-bas, ici on
> lit *ce qui est vrai aujourd'hui*). Dernière mise à jour : **2026-08-19** (navbar + mark,
> collections et **pied de page 10,5→20/20** — TOUS appliqués, `AUDIT-PIED-DE-PAGE-….md`).

## Statut

Maquette complète et figée : système, 6 sections, carte OG, cookies, assemblages, états, motion,
chrome re-vérifiée contre le CODE + volet et méga-menu DESSINÉS (audit navbar). Code : ANNULÉ par Adrien
le 2026-08-19 — le HANDOFF reste la porte. ⚠️ **Cmd+S à faire** pour écrire les passes du jour.

## Le motif et les accents

- **La goutte reste le motif directeur et EST DOSÉE** (passe 20/20) : chaque placeholder photo
  annonce désormais son SUJET — anneau, cabochon, grappe, cascade, volute, porte-clés, cadre de
  musée, goutte longue — la goutte garde le hero (tuiles 1 et 5, pampilles), la pluie et l'état
  vide. Le **cœur** ponctue l'atelier (portrait + note « 3 h ») ; les **empreintes de doigt**
  roses (#f7a8d8, trio absolu) ferment l'étape 4 aux 4 exemplaires — détails, jamais sujets.
- **Alternance** : hero rose · créations or · collections rose · types or · atelier rose-pale ·
  FAQ or · carte de partage rose · cookies rose. Jamais deux voisines dans la même couleur.
- **Pied de page sur `rose-pale` `#fdf0f8`** ; filet `#06070b24` — seule valeur non tokenisée
  tolérée hors carte OG ; accent UNIQUE rose ; lockup mark + réassurance + légal 8 entrées.
- **Transitions en dégradé** : papier→or avant les types · or→rose-pale puis rose-pale→papier
  autour de l'atelier · papier→rose-pale avant le pied — desktop 64, mobile 16.

## Mesures qui font autorité

- Barres hautes **64 desktop / 56 mobile** (rangée seule, bandeau RETIRÉ `enabled:false`) ; barre
  basse 56. Mobile = burger + lockup centré (colonnes fixes 96) + NOM DE SALLE au scroll ; desktop
  = lockup + nav avec caret + pilule « Rechercher ⌘K ». Lockup = MARK du code + « Synclune ».
- Assemblages : desktop **6 974**, mobile **10 120** (croissance passe pied SOUS le pli 11 ;
  réserve barre basse du pied 72 = barre 56 + 16) — relevé **11/11 plis** valide (pli 7 titre
  atelier à 9 px, pli 11 recoupe « Lien Les collections » ; pas de pli 12 : 10 120 < 10 128).
  Pli 1 VISUEL : mobile, la barre RECOUVRE 4 px de la tuile 2 (bas 792 / barre 788) ; desktop,
  SÉRIE de gouttes traversantes, enfants ABSOLUS de `fb42R` (les frames de section clippent) :
  `t57T4y` 786→818 · `AMKoS` 1584→1616 · `EXUUp` ROSE 2384→2416. Bloc titre 64/24 D, 64/12 M.
- Tuiles frise hero : desktop 148×185, mobile 168×210 — ENTIÈRES, fonds bonbon LITTÉRAUX (rose
  dominant + menthe/soleil/lavande, placeholders de shooting) ; attache-03 mobile SANS tuile
  (x381, chaîne seule) ; les tuiles sont des LIENS vers leur fiche (contexts posés, § 5.3).
- Puce-type : hauteur FIXE **44 px** (le « 41 px à relever en code » est soldé dans la maquette).
- Contrastes en vigueur : encre/papier 19,59 · encre/or 15,97 · encre/rose-pale 18,21 ·
  rose-encre/papier 5,36 · rose-encre/gris 4,62 · rose-encre/rose-pale 4,99 · or-encre/papier 4,72.
- Côté code : `or` #ffe2a2 = **exactement** `--secondary` ; à créer : `or-encre`, `rose-pale` ; `rose-encre` assombri #a8428a → re-dériver `--color-brand-rose-strong`.

## Décisions verrouillées — ne pas « corriger » par réflexe

1. **Tuiles du hero ENTIÈRES** (2026-08-18, Adrien ×2) — jamais de coupe dessinée ; signaux du
   pli 1 : mobile la barre recouvre la tuile 2, desktop la goutte traversante (audit hero).
2. **Franco ABANDONNÉ** (2026-08-18) ; **bandeau livraison RETIRÉ** (2026-08-19, Adrien) — frais
   et délai vivent en FAQ (« En pratique ») et pied de page, `{frais}`/`{frais-ue}`/`{délai}`.
3. **`{délai}` hors du hero** (pression pour la créatrice) — FAQ et pied seulement.
4. Survol de carte (produit ET collection) et de lien de nav = **squiggle** ; focus = squiggle +
   anneau encre 2 px ; jamais d'anneau rose (planches états). **Flèche du discret STATIQUE au repos.**
5. **Pastilles de variantes RONDES** (gouttes REJETÉES — ne pas re-proposer) ; **badge du panier
   ROND 18×18** (pilule au-delà de 9 ; goutte archivée). **Étincelles « escaping » = navbar SEULE.**
6. **Bicolore rose/or** · SIX sections · sur-titres PARTOUT · « les doigts encore pleins de
   peinture » (étape 4) ; **pastilles d'étapes $rose UNIFORMES — `STEP_ACCENTS` meurt** (context).
7. **Filigrane** : desktop 5 formes (D, 2 colorées, encre à 15 % `#06070b26`) ; **mobile 2
   formes colorées** — PREMIER enfant partout (sous le texte), statique réduit, pas de boucle.
8. **Liens sans cible = JAMAIS rendus** (histoire → `/a-propos`, messages → mailto, `context`
   ×12) ; **même règle pour le PORTRAIT : la refonte ATTEND la vraie photo** (SHOOTING P1, context).
9. **État vide de collection = rendez-vous** (« bientôt ! », cursive = ponctuation) ; **grappe :
   trou à 4 cartes ASSUMÉ · cellules $rose = placeholders · chapô ÉDITORIAL vivant** (audit coll.).

## Arbitrages ouverts — AUCUN · vérif restante : satori OG (au passage en code)

## Pièges d'outillage — tous constatés

- **App et CLI tiennent chacun leur copie** : le dernier qui sauve écrase l'autre. **Cmd+S seul
  écrit le fichier** (le save() du shell écrit `~/.pencil/backup/`) — vérifier le mtime avant commit.
- **Un sous-arbre neuf sort BLANC à l'Export** tant qu'il n'a pas été copié (re-constaté sur les
  empreintes — remède : Copy, supprimer l'original). `TakeScreenshot` sert du périmé.
  `Export(ids, "png", "x.png")` crée un DOSSIER `x.png/` avec un fichier par nœud — re-plaquer.
- **Bounds post-mutation MENTENT dans le même appel** — re-mesurer à part ; l'app fait foi.
- `Replace` échoue sur un enfant de composant via le MCP de l'app — mais la **surcharge de
  propriétés** (`Update("instance/enfant")`) marche, y compris `geometry` (35 posées, passe 20/20).
- Avertissements bénins : touche-de-pinceau, tracé-flèche, note-manuscrite, bandeaux désactivés,
  « Collapsed size » des copies atelier. Un `ref` anonyme vide traîne à la racine (`GH7Z7`).
