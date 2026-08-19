# Tour 9 — Améliorations

Ce tour est différent des autres : il ne dessine rien de neuf, il **solde le backlog** que les
tours 1 à 8 ont consigné dans `NOTES.md` sans avoir le droit d'y toucher. Il est donc le seul
tour autorisé à modifier des frames déjà dessinées — mais UNIQUEMENT celles que les tâches
ci-dessous nomment, et uniquement pour ce qu'elles décrivent. Tout le reste de la conduite
s'applique : pas de rangement, pas de refonte d'opportunité, chaque affirmation vérifiée par
un appel d'outil.

Relis d'abord `NOTES.md` en entier : chaque tâche ci-dessous en vient, avec ses mesures.

## 1. Les deux faux fonds mobiles (le défaut le plus grave)

Le tour 8 a mesuré deux plis vides sur l'assemblage mobile (`j9QGj`, plis de 844 px) :

- **types → atelier** : ~136 px de vide traversent le pli 7 ;
- **atelier → FAQ** : ~128 px de vide au pli 9, deux sections papier de part et d'autre.

Corrige **dans les frames de section** (`04-types/mobile`, `05-atelier/mobile`,
`06-faq/mobile`), pas dans l'assemblage : réduis les paddings verticaux aux frontières et/ou
fais déborder un élément (le remède est géométrique — un débord visible — pas une flèche).
Garde l'alternance d'accents intacte. Un vide de respiration est bienvenu ; ce qui est
interdit, c'est un écran de 844 px où RIEN de la section suivante n'apparaît.

## 2. Le signal faible du pli 8

Toujours sur mobile : l'étape 1 de l'atelier n'émerge que de ~9 px au-dessus d'un pli — un
débord invisible vaut un faux fond. En retouchant les hauteurs de la tâche 1, vérifie que
chaque pli de l'assemblage recalculé coupe la suite d'au moins ~40 px visibles.

## 3. ~~Le franco de port, remonté~~ — CADUC (franco abandonné le 2026-08-18)

Le bloc « En pratique » de la FAQ est la seule surface qui porte le franco — or c'est la
dernière section, la moins vue. Ajoute la ligne à la **barre haute** (composants
`chrome/barre-haute` ET `chrome/barre-haute-mobile`) : un bandeau fin au-dessus ou intégré,
une seule ligne, texte `Livraison offerte dès {franco}` — placeholder `{franco}` OBLIGATOIRE,
jamais un montant en dur (⚠️ correction post-série, audit du 2026-08-17 : la « source unique
côté code » annoncée ici n'existe PAS — aucun seuil de franco dans `shipping-rates.ts` ; l'offre
elle-même est un arbitrage Léane en attente, cf. tour 6). Sobre : fond `$papier` ou
`$gris`, texte `$encre` en `sans/small` — pas d'aplat d'accent, la barre n'est pas une section.
⚠️ Ces composants sont référencés par toutes les frames : vérifie sur le hero desktop ET mobile
que le bandeau ne casse ni le sticky ni le budget du premier écran (le bloc titre entier doit
rester visible au-dessus de la marchandise entamée, tour 1).

## 4. Les libellés de bouton mono-ligne (limite notée aux tours 1-2)

Les trois composants `bouton/*` sont en `textGrowth: auto` : un libellé long déborde au lieu
de passer à la ligne, et la checklist de la série exige que tout libellé survive à deux lignes
(le texte grossit chez les visiteuses qui zooment). Corrige les trois composants pour que le
libellé puisse se replier sans casser la pilule (hauteur en fit_content, padding conservé),
puis vérifie en capture qu'aucune instance existante n'a bougé d'un pixel en usage normal.

## 5. Re-monter l'assemblage

L'assemblage du tour 8 est un instantané par copies : tes corrections des tâches 1 à 4 ne s'y
propagent pas (sauf le pied de page et les barres, qui sont des refs). Re-copie les sections
retouchées dans `08-assemblage/desktop` (`fb42R`) et `08-assemblage/mobile` (`j9QGj`), puis
refais les deux vérifications du tour 8 qui ont bougé : la chaîne des débords écran par écran
(tâches 1-2 tenues ?) et l'alternance d'accents (aucune contamination introduite).

## Ce que ce tour ne fait PAS

- Ne touche ni à la carte de partage ni à la bannière cookies (tour 7, aucun défaut relevé).
- Ne remplace aucune valeur inventée (prix, comptes par collection) : c'est du ressort du
  passage en code, pas de la maquette.
- Ne tranche pas les arbitrages réservés à Léane (rose/or vs rotation d'accents, « avec
  amour » de l'étape 4) — ils restent dans le carnet.

## Sortie

`get_screenshot` des frames modifiées et des deux assemblages, puis :

```
- [ ] plus aucun pli mobile de 844 px sans ≥ ~40 px visibles de la suite — relevé pli par pli
- [x] ~~le bandeau franco~~ → le bandeau porte « Livraison {frais} · expédié sous {délai} » (franco abandonné le 2026-08-18)
- [ ] le premier écran du hero (desktop et mobile) survit au bandeau — budget du tour 1 tenu
- [ ] les trois boutons survivent à un libellé sur deux lignes, les instances existantes sont intactes
- [ ] l'assemblage re-monté passe les contrôles d'accents et de débords du tour 8
- [ ] aucune frame hors des tâches 1 à 5 n'a été modifiée
```

Ajoute ton entrée `## Tour 9 — Améliorations` à `NOTES.md` : ce qui a été corrigé (avec les
nouvelles mesures), ce qui a résisté, et ce qui reste.
