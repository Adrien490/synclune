# État courant — landing.pen

> **Réécrit** à chaque passe, ≤ 80 lignes — le script l'injecte aux tours avec les deux dernières
> entrées de `NOTES.md` ; le carnet, lui, ne se réécrit jamais (le *pourquoi* est là-bas, ici on
> lit *ce qui est vrai aujourd'hui*). Dernière mise à jour : **2026-08-19** (propositions
> appliquées + arbitrages nº 1-4 tranchés).

## Statut

Maquette complète et figée : système, 6 sections, carte OG, cookies, assemblages, états, motion.
**Conformité 82/100** (§ 9, 0 P0) · **signature 12/20 AVANT propositions** — les trois prises et
appliquées le 2026-08-19, à re-noter sur pièce (`AUDIT-DOSSIER-2026-08-19b.md`).
Passage en code non commencé — **DÉBLOQUÉ le 2026-08-19** (nº 1-4 tranchés par Adrien).

## Le motif et les accents

- **La goutte reste le motif directeur mais SE DOSE** (Adrien, 2026-08-19 : « trop de gouttes » —
  une partie est un artefact des placeholders) ; le **cœur** est bienvenu en ponctuation au-delà
  de l'atelier et du favori (Léane les aime) — toujours en détail, jamais en sujet.
- **Alternance** : hero rose · créations or · collections rose · types or · atelier rose ·
  FAQ or · carte de partage rose · cookies rose. Jamais deux voisines dans la même couleur.
- **Pied de page sur `rose-pale` `#fdf0f8`** (teinte du rose, surfaces seulement, n'écrit
  jamais) ; filet interne `#06070b24` — seule valeur non tokenisée tolérée hors carte OG.
- **Transitions en dégradé** : papier↔or autour des types, papier→rose-pale avant le pied —
  desktop 64 px, **mobile 16 px** ; le papier→rose-pale (1,08:1) est un raccord de surface assumé.

## Mesures qui font autorité

- Barres hautes **91 px desktop / 83 mobile** (bandeau + rangée) ; barre basse 56 ; le bandeau
  porte « Livraison {frais} · expédié sous {délai} ».
- Assemblages : desktop **6 721 px**, mobile **9 890 px** (mesurés après propositions, +90/+67) —
  le « 11/11 plis coupent du contenu » est à **re-vérifier** depuis ce décalage.
- Tuiles de la frise hero : desktop **148 × 185**, mobile **168 × 210** — toutes **entières**.
- Contrastes en vigueur : encre/papier 19,59 · encre/or 15,97 · encre/rose-pale 18,21 ·
  rose-encre/papier 5,15 · or-encre/papier 4,72. Zéro texte encré en `$rose` ou `$or`.

## Décisions verrouillées — ne pas « corriger » par réflexe

1. **Les tuiles du hero sont ENTIÈRES** (2026-08-18, demandé deux fois par Adrien) — dérogation
   assumée, −1 pt ; un signal de continuation, s'il revient, vient d'**ailleurs** que de la coupe.
2. **Le franco de port est ABANDONNÉ** (2026-08-18). `{franco}` n'avait aucune source dans
   `shipping-rates.ts`. Ne pas le réintroduire sans que l'offre existe en base.
3. **`{délai}` reste hors du hero** (décision Adrien : pression pour la créatrice) — bandeau et FAQ.
4. Survol de carte produit = **squiggle** (`SQUIGGLE_PATH` du code) ; focus = le même squiggle +
   anneau encre 2 px sur la carte entière. Jamais d'anneau rose, jamais d'ombre floue.
5. **Les trois propositions sont PRISES et APPLIQUÉES** (2026-08-19, délégué par Adrien — Léane
   peut défaire) : grille 0·24·8·32 desktop · réponse FAQ en bulle signée · pastilles gouttes.
6. **Nº 1-4 tranchés par Adrien le 2026-08-19** : accents BICOLORE rose/or (créer `or`/`or-encre`
   en code, retirer la rotation `[data-accent]`) · SIX sections · sur-titres PARTOUT (à
   réintroduire sur les 5 routes boutique) · « avec amour » remplacé par « les doigts encore
   pleins de peinture » — sans purge systématique de la formule (elle peut réapparaître ponctuellement).

## Arbitrage ouvert — un seul

**Fond et formes du hero desktop** (reformulation du nº 5 par Adrien — pas seulement de la
couleur : des formes, statiques ou animées) — planche `proposition/hero-fonds`, export
`apercus/arbitrages/proposition-hero-fonds.png` : **A** bain rose-pale · **B** filigrane
cœurs + gouttes · **C** lavis sous la frise · **D** les formes de B animées à la pose
(une fois au chargement, grammaire du micro-balancement) · ou rester au blanc.

## Pièges d'outillage — tous constatés

- **App Pen et CLI tiennent chacun leur copie du `.pen`** : le dernier qui sauve écrase l'autre.
  App fermée avant tout `./landing.sh` (le préflight refuse sinon) ; **Cmd+S avant tout commit**
  après une session MCP.
- **`TakeScreenshot` sert des rendus périmés** ; vérifier à l'`Export` png. Un sous-arbre neuf
  peut sortir **blanc** à l'Export tant qu'il n'a pas été **copié** (remède : `Copy`, supprimer
  l'original) ; un balayage de copie sans `resolveInstances: true` **ment** (0 « franco » alors
  qu'un override d'instance l'affichait) ; les bounds lus dans l'appel d'une mutation sont à
  moitié recalculés — re-mesurer à part.
- L'outil `browser` n'a **jamais** fonctionné (deux tentatives) : `00-bootstrap.md` est de fait
  la source de la chrome, et le code gagne sur elle en cas d'écart.
- **`Replace` échoue sur un enfant de COMPOSANT via le MCP de l'app** (TypeError systématique) —
  contourner par Delete + Insert ; le même Replace passe en headless et sur une copie détachée.
- ⚠️ **Le `save()` du shell `--app` ne sauve PAS le `.pen`** — il écrit `~/.pencil/backup/<hash>` ;
  seul **Cmd+S** écrit le fichier. Vérifier le **mtime avant tout commit** (2026-08-19 : deux
  commits partis périmés, réparés depuis le backup).
- Avertissements bénins : `touche-de-pinceau`, `tracé-flèche`, `note-manuscrite`, bandeaux
  désactivés en `fill_container` — encre qui déborde à dessein, ne pas « corriger ». Un `ref`
  anonyme vide traîne à la racine (`GH7Z7`) — origine inconnue, non touché, à trier.
