# État courant — landing.pen

> **Réécrit** à chaque passe, ≤ 80 lignes. C'est ce que le script injecte aux tours, avec les deux
> dernières entrées de `NOTES.md`. Le carnet, lui, ne se réécrit jamais : on y va chercher
> *pourquoi* une décision a été prise, ici on lit *ce qui est vrai aujourd'hui*.
> Dernière mise à jour : **2026-08-19** (audit du dossier).

## Statut

Maquette complète et figée : système, 6 sections, carte de partage, bannière cookies, deux
assemblages, états d'interaction, planche motion. **Conformité 82/100** (grille § 9, 0 P0) ·
**signature : non notée** (grille `_signature.md` posée le 2026-08-19, à passer). Le passage en
code n'a pas commencé et reste bloqué par l'arbitrage nº 2 ci-dessous.

## Le motif et les accents

- **Motif unique : la goutte**, du hero au pied — raisin, pluie, larme, rosée, arc-en-ciel ;
  la grappe est une accumulation de gouttes. Le **cœur** est en ponctuation à deux endroits
  motivés (atelier, favori), jamais en sujet. Aucun autre glyphe de marque.
- **Alternance** : hero rose · créations or · collections rose · types or · atelier rose ·
  FAQ or · carte de partage rose · cookies rose. Jamais deux voisines dans la même couleur.
- **Pied de page sur `rose-pale` `#fdf0f8`** (teinte du rose, surfaces seulement, n'écrit
  jamais) ; filet interne `#06070b24` — seule valeur non tokenisée tolérée hors carte OG.
- **Transitions en dégradé** entre sections : papier↔or autour des types, papier→rose-pale avant
  le pied — desktop 64 px, **mobile 16 px**. Le papier→rose-pale est à 1,08:1, invisibilité
  assumée (raccord de surface).

## Mesures qui font autorité

- Barres hautes **91 px desktop / 83 mobile** (bandeau + rangée) ; barre basse 56 ; le bandeau
  porte « Livraison {frais} · expédié sous {délai} ».
- Assemblages : desktop ~6 393 px, mobile **9 828 px** — **11/11 plis coupent du contenu**.
- Tuiles de la frise hero : desktop **148 × 185**, mobile **168 × 210** — toutes **entières**.
- Contrastes en vigueur : encre/papier 19,59 · encre/or 15,97 · encre/rose-pale 18,21 ·
  rose-encre/papier 5,15 · or-encre/papier 4,72. Zéro texte encré en `$rose` ou `$or`.

## Décisions verrouillées — ne pas « corriger » par réflexe

1. **Les tuiles du hero sont ENTIÈRES** (2026-08-18, demandé deux fois par Adrien). Cela déroge
   sciemment au critère « la section suivante est visiblement coupée » : −1 pt accepté. Si un
   signal de continuation doit revenir, il vient d'**ailleurs** que de la coupe des photos.
2. **Le franco de port est ABANDONNÉ** (2026-08-18). `{franco}` n'avait aucune source dans
   `shipping-rates.ts`. Ne pas le réintroduire sans que l'offre existe en base.
3. **`{délai}` reste hors du hero** (décision Adrien : pression pour la créatrice) — il vit au
   bandeau et dans la FAQ.
4. Survol de carte produit = **squiggle** (`SQUIGGLE_PATH` du code) ; focus = le même squiggle +
   anneau encre 2 px sur la carte entière. Jamais d'anneau rose, jamais d'ombre floue.

## Arbitrages ouverts — cinq questions fermées pour Léane

Chacune se tranche sur pièce, en une phrase. Elles bloquent le passage en code.

1. **Accents** — bicolore rose/or de la maquette, ou rotation lavande/menthe/soleil déjà dans le
   code (`[data-accent]`) ? *Décider sur les deux planches `00-systeme/accents-*`.*
   ⚠️ C'est le seul arbitrage **bloquant** : il décide s'il faut créer les tokens `or`/`or-encre`
   ou adapter la maquette.
2. **Nombre de sections** — garder les six, ou fusionner collections + types en un bloc
   d'orientation unique (la grille § 9 recommande ≤ 4) ?
3. **Sur-titres** — la maquette les réintroduit alors qu'ils ont été retirés des 5 routes
   boutique le 2026-08-06. On les garde partout, ou on les retire partout ?
4. **« avec amour »** (étape 4 de l'atelier) — c'est la voix de Léane et on l'assume, ou c'est
   une formule interchangeable (elle est dans les ⛔ de `synclune-univers.md`) et on la remplace ?
5. **Gouttes de ponctuation en marge du hero desktop** — le desktop est très aéré : on en pose
   2-3, ou on laisse le blanc ?

## Pièges d'outillage — tous constatés

- **App Pen et CLI tiennent chacun leur copie du `.pen`** : le dernier qui sauve écrase l'autre.
  App fermée avant tout `./landing.sh` (le préflight refuse sinon) ; **Cmd+S avant tout commit**
  après une session MCP.
- **`TakeScreenshot` sert des rendus périmés** ; vérifier à l'`Export` png. Un sous-arbre
  fraîchement créé peut sortir **blanc** même à l'Export tant qu'il n'a pas été **copié** —
  remède : `Copy` du frame, supprimer l'original, garder la copie.
- **Un balayage de copie sans `resolveInstances: true` ment** : il a renvoyé 0 occurrence de
  « franco » alors que la FAQ l'affichait encore par override d'instance.
- Les bounds lus dans le même appel qu'une mutation sont à moitié recalculés — re-mesurer à part.
- L'outil `browser` n'a **jamais** fonctionné (deux tentatives) : la description de
  `00-bootstrap.md` est de fait la source de la chrome, et le code gagne sur elle en cas d'écart.
- Avertissements bénins connus : `touche-de-pinceau`, `tracé-flèche`, `note-manuscrite`,
  bandeaux désactivés en `fill_container` — de l'encre qui déborde à dessein. Ne pas « corriger ».
