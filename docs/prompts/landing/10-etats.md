# Tour 10 — États d'interaction

Deux petits chantiers, tous deux nés du constat que la maquette est complète mais STATIQUE :
l'élément le plus cliqué de la page n'a pas d'état, et la barre sticky n'a pas d'état scrollé.
Ce tour ne touche à rien d'autre — ni aux sections, ni aux assemblages, ni aux autres
composants.

## 1. Les états `survol` et `focus` de `carte-produit`

Le composant `carte-produit` (`Trd6e`) a quatre variantes de disponibilité mais AUCUN état
d'interaction — les boutons en ont quatre. **Ajoute** (jamais modifier l'existant, règle de
conduite) de quoi montrer au développeur ce que fait la carte au survol et au clavier :

- **`survol`** : une affordance visible mais dans la DA — pas de paillettes, pas de dégradé,
  pas de voile. Pistes légitimes : soulignement du nom, légère élévation (ombre douce encre),
  ou léger grossissement de la photo dans son cadre. Choisis-en UNE et assume-la.
  ⚠️ Le survol ne RÉVÈLE aucune information nouvelle : tout ce que la carte sait (prix,
  variantes, favori) est déjà visible au repos — c'est un acquis du tour 0, ne le défais pas.
- **`focus`** : l'anneau du système — `outline 2px solid encre, offset 2` — sur la carte
  entière. Jamais un anneau rose seul (1,55:1 ne signale rien).
- **Survol ⇒ focus** : tout ce que montre `survol` doit se montrer aussi en `focus` (WCAG
  2.4.7). Si tu soulignes le nom au survol, il est souligné au focus.

Rends les deux états dans la planche `00-systeme/composants`, à côté des variantes
existantes, avec leur libellé. Vérifie par comparaison de bounds qu'AUCUNE instance existante
(tour 2, assemblages) n'a bougé d'un pixel.

## 2. L'état scrollé de la barre haute

Depuis le tour 9, la chrome desktop fait 91 px (bandeau franco 27 + rangée 64) et la mobile
83 — plus la barre basse de 56, c'est un budget d'écran cher sur 844 px si TOUT reste collé.
**Décision prise : le bandeau défile avec la page, seule la rangée principale reste sticky.**

Dessine une frame `00-systeme/chrome-scrollee` montrant les deux barres (desktop 1440 et
mobile 390) dans leur état scrollé : rangée principale seule, sans le bandeau, telle qu'elle
flotte sur du contenu (pose-la sur un fragment neutre — un aplat `$gris` suffit à figurer le
contenu qui défile dessous). Si la rangée seule a besoin d'un liseré ou d'une ombre pour se
détacher du contenu, c'est ici que ça se décide — dans la DA (trait encre 1 px plutôt
qu'ombre portée floue, si tu hésites).

⚠️ Ne modifie PAS les composants `chrome/barre-haute` / `chrome/barre-haute-mobile` : l'état
scrollé est une COMPOSITION de la rangée existante, pas un nouveau composant. Le code fera ça
en CSS (le bandeau hors du sticky), pas avec deux barres.

## Sortie

`get_screenshot` de la planche composants et de la frame `chrome-scrollee`, puis :

```
- [ ] `survol` et `focus` de carte-produit sont dessinés, et focus montre tout ce que montre survol
- [ ] le focus est l'anneau encre du système, pas un anneau rose
- [ ] aucune instance existante de carte-produit n'a bougé (bounds comparés)
- [ ] la frame chrome-scrollee montre la rangée seule, desktop et mobile, sans le bandeau
- [ ] aucun composant chrome n'a été modifié
```

Ajoute ton entrée `## Tour 10 — États d'interaction` à `NOTES.md`, avec la consigne pour le
code : bandeau hors du bloc sticky, et la recette exacte de l'état survol retenu.
