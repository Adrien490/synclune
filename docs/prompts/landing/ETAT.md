# État courant — landing.pen

> **Réécrit** à chaque passe, ≤ 80 lignes — le script l'injecte aux tours avec les deux dernières
> entrées de `NOTES.md` ; le carnet, lui, ne se réécrit jamais (le *pourquoi* est là-bas, ici on
> lit *ce qui est vrai aujourd'hui*). Dernière mise à jour : **2026-08-19** (passe « 20/20 »,
> demandée par Adrien après l'annulation du passage en code).

## Statut

Maquette complète et figée : système, 6 sections, carte OG, cookies, assemblages, états, motion.
Passage en code : **lancé puis ANNULÉ par Adrien le 2026-08-19** (« je continuerai à taffer la
landing avant de l'implémenter ») — le dépôt de code est revenu à son état d'avant, le HANDOFF
reste la porte d'entrée. ⚠️ **Cmd+S à faire dans l'app** pour écrire la passe « 20/20 » au fichier.

## Le motif et les accents

- **La goutte reste le motif directeur et EST DOSÉE** (passe 20/20) : chaque placeholder photo
  annonce désormais son SUJET — anneau, cabochon, grappe, cascade, volute, porte-clés, cadre de
  musée, goutte longue — la goutte garde le hero (tuiles 1 et 5, pampilles), la pluie et l'état
  vide. Le **cœur** ponctue l'atelier (portrait + note « 3 h par bijou ») — détail, jamais sujet.
- **Alternance** : hero rose · créations or · collections rose · types or · atelier rose-pale ·
  FAQ or · carte de partage rose · cookies rose. Jamais deux voisines dans la même couleur.
- **Pied de page sur `rose-pale` `#fdf0f8`** ; filet interne `#06070b24` — seule valeur non
  tokenisée tolérée hors carte OG.
- **Transitions en dégradé** : papier→or avant les types · or→rose-pale puis rose-pale→papier
  autour de l'atelier · papier→rose-pale avant le pied — desktop 64, mobile 16.

## Mesures qui font autorité

- Barres hautes **64 px desktop / 56 mobile** (rangée seule — **bandeau livraison RETIRÉ**,
  décision Adrien 2026-08-19, nœuds conservés `enabled:false`) ; barre basse 56.
- Assemblages : desktop **6 785**, mobile **9 874** — les cadres hero sont FIXES (800/844), le
  retrait du bandeau n'a bougé que leur intérieur : le relevé **11/11 plis reste valable**.
  Frange mobile re-posée sur la barre basse (bas 789 / barre 788 — signal du pli 1 restauré) ;
  frise desktop bas 797 dans le cadre de 800. Paddings du bloc titre redistribués (desktop
  haut 64 bas 24, mobile haut 64 bas 12).
- Tuiles de la frise hero : desktop **148 × 185**, mobile **168 × 210** — toutes **entières**.
- Puce-type : hauteur FIXE **44 px** (le « 41 px à relever en code » est soldé dans la maquette).
- Contrastes en vigueur : encre/papier 19,59 · encre/or 15,97 · encre/rose-pale 18,21 ·
  rose-encre/papier 5,15 · or-encre/papier 4,72. Zéro texte encré en `$rose` ou `$or`.
- Côté code (constat du passage avorté) : `or` #ffe2a2 = **exactement** `--secondary` existant ;
  seuls `or-encre` et `rose-pale` seront à créer.

## Décisions verrouillées — ne pas « corriger » par réflexe

1. **Tuiles du hero ENTIÈRES** (2026-08-18, Adrien ×2) — dérogation assumée ; le signal de
   continuation mobile est la frange posée sur la barre basse, pas une coupe.
2. **Franco ABANDONNÉ** (2026-08-18) ; **bandeau livraison RETIRÉ** (2026-08-19, Adrien) — frais
   et délai vivent en FAQ (« En pratique ») et pied de page, placeholders `{frais}`/`{délai}`.
3. **`{délai}` hors du hero** (pression pour la créatrice) — FAQ et pied seulement.
4. Survol de carte = **squiggle** ; focus = squiggle + anneau encre 2 px. Jamais d'anneau rose.
5. **Pastilles de variantes RONDES** (gouttes REJETÉES par Adrien — ne pas re-proposer) ;
   **badge du panier ROND** (tranché 2026-08-19, la goutte de la planche motion est archivée).
6. **Bicolore rose/or** · SIX sections · sur-titres PARTOUT (5 routes boutique au handoff) ·
   « les doigts encore pleins de peinture » (étape 4).
7. **Filigrane** : desktop 5 formes (D, 2 colorées) ; **mobile 2 formes, les deux colorées**
   (passe 20/20) — même pose, réduit = statique, jamais de boucle.
8. **Liens sans cible = JAMAIS rendus** : « Lire l'histoire de l'atelier » attend `/a-propos` ;
   « Commander une pièce comme elle » et « Écris-moi un message » → mailto (contexts posés).
9. **État vide de collection = rendez-vous** : note manuscrite « bientôt ! » (composant
   sans-visuel) — la cursive est de la ponctuation, la ligne « En préparation » reste le porteur.

## Arbitrages ouverts — AUCUN

Vérif restante : le rendu satori réel de la carte OG (au passage en code).

## Pièges d'outillage — tous constatés

- **App et CLI tiennent chacun leur copie** : le dernier qui sauve écrase l'autre. **Cmd+S seul
  écrit le fichier** (le save() du shell écrit `~/.pencil/backup/`) — vérifier le mtime avant commit.
- **Un sous-arbre neuf sort BLANC à l'Export** tant qu'il n'a pas été copié (re-constaté sur le
  filigrane mobile — remède : Copy, supprimer l'original). `TakeScreenshot` sert du périmé.
- **Les bounds lus après une mutation dans le même appel MENTENT** (re-constaté : puce lue à 41
  après passage à 44) — re-mesurer dans un appel séparé, et l'app fait foi contre le headless.
- `Replace` échoue sur un enfant de composant via le MCP de l'app — mais la **surcharge de
  propriétés** (`Update("instance/enfant")`) marche, y compris `geometry` (35 posées, passe 20/20).
- Avertissements bénins : touche-de-pinceau, tracé-flèche, note-manuscrite, bandeaux désactivés,
  « Collapsed size » des copies atelier. Un `ref` anonyme vide traîne à la racine (`GH7Z7`).
