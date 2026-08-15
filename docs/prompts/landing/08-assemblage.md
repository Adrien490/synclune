# Tour 8 — Assemblage et recette

Travaille dans `08-assemblage/desktop` et `08-assemblage/mobile`. Ce tour ne dessine aucune
section nouvelle : il pose bout à bout ce que les tours 0 à 6 ont produit, parce que trois
contraintes de la série ne sont vérifiables QUE sur la page assemblée — aucun tour de section
ne pouvait les tenir seul.

## Monter la page

Copie dans les deux frames, dans l'ordre : barre haute → hero → créations → collections →
types → atelier → FAQ → pied de page (plus la barre basse sur mobile). Tu **copies** : les
frames de section restent intouchées. Si l'assemblage révèle un défaut dans l'une d'elles,
tu le signales à la fin **sans y toucher** — c'est la règle de conduite.

## Les trois vérifications qui n'existaient pas encore

1. **L'alternance d'accents.** La checklist de chaque tour vérifiait « une seule couleur par
   section » ; personne n'a encore vérifié la SÉQUENCE. Relève la couleur d'accent de chaque
   section dans l'ordre, et confirme l'alternance rose → or → rose → or — jamais deux sections
   voisines dans la même couleur.
2. **La chaîne des débords.** Sur mobile, parcours l'assemblage écran par écran (pas de
   844 px) : à chaque ligne de flottaison, le haut de la section suivante doit être
   **visiblement coupé**. Un « faux fond » entre deux sections est exactement ce que ce
   montage existe pour attraper.
3. **L'unité du motif.** Le motif retenu au tour 0 (relis `NOTES.md`) doit se lire du hero au
   pied de page — même vocabulaire de forme, même trait 1,5. Relève chaque endroit où un
   AUTRE motif s'est glissé.

## Re-contrôle de conformité du pied de page

Le tour 0 l'a dessiné, personne ne l'a revérifié depuis. Confirme, en lisant les nœuds :
coordonnées du **médiateur de la consommation** · CGV · mentions légales · **rétractation
14 jours** · « TVA non applicable, art. 293 B du CGI » · « Fait main à Nantes » — tous
présents et lisibles. ⛔ Et toujours **aucun lien vers la plateforme européenne de règlement
des litiges** (fermée le 20 juillet 2025).

## Le livrable pour Léane : la checklist de shooting

Parcours toutes les frames et relève chaque calque `photo/<sujet>` : nom du calque, section,
ratio, sujet à photographier. Écris le tout dans `SHOOTING.md`, à côté de `NOTES.md` — c'est
le document que Léane emporte pour faire les photos. Une ligne par photo, triée par section.

## Sortie

`get_screenshot` des deux assemblages, puis :

```
- [ ] l'alternance rose → or est tenue sur toute la page, relevée section par section
- [ ] chaque écran mobile de 844 px coupe visiblement la section suivante
- [ ] un seul motif du hero au pied de page ; les écarts sont listés
- [ ] le pied de page porte les six mentions de conformité, sans lien RLL/ODR
- [ ] `SHOOTING.md` existe et liste tous les calques `photo/*` avec leur ratio
- [ ] aucune frame de section n'a été modifiée — les défauts trouvés sont listés, pas corrigés
```
