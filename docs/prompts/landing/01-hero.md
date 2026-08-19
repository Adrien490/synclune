# Tour 1 — Hero

Travaille dans `01-hero/desktop` et `01-hero/mobile`. Utilise les composants et les variables déjà
présents dans le fichier. Respecte l'univers déjà chargé.

## D'abord : la piste retenue du tour 1a

Si `ETAT.md` porte une **piste retenue du tour 1a** (« Piste retenue du tour 1a : … »), elle est
ton **brief de forme** : exécute sa direction — motif, composition, place de la marchandise —
greffes listées comprises. Les contraintes ci-dessous s'appliquent à elle, elles ne la remplacent
pas.

⚠️ Si les frames `01a-divergence/*` sont **dessinées** mais que la ligne d'`ETAT.md` est absente ou
dit **« EN ATTENTE »**, **arrête-toi et dis-le** : l'arbitrage n'est pas pris, et il n'est pas à
toi — choisir ici referait exactement ce que le tour 1a existe pour empêcher. Ce n'est pas une question à poser en
fin de tour : c'est le seul cas de blocage légitime de la série.

Si les frames `01a-divergence/*` sont vides ou absentes (rejeu sans divergence), ce prompt seul
fait foi.

## Le test que ce hero doit passer

Montre la maquette 5 secondes à quelqu'un, masque-la, demande : **« qu'est-ce que cette boutique
vend ? »** Si « des bijoux colorés faits main » ne revient pas spontanément, le hero a échoué —
quelle que soit sa note esthétique. Ce sont les **10 premières secondes** qui décident du maintien.

C'est aussi ici que le **motif unique** s'installe pour toute la page.

## Répartition des rôles

- **sur-titre** = catégorie ou contexte, **rien d'autre**. C'est le plus petit corps de la page,
  donc le dernier remarqué : y mettre la proposition de valeur est une erreur.
- **titre** = ce que c'est.
- **chapô** = pour qui, et en quoi c'est différent.

## Matière

- Sur-titre : `ATELIER À NANTES`
- Titre : **« Des bijoux colorés, faits un par un »** — un mot peut être surligné d'une touche de
  pinceau. Le titre est du **texte**, jamais une image.
- Chapô : **« Je peins et j'assemble chaque pièce à la main. Aucune n'est identique à une autre. »**
- CTA principal : **« Voir les 14 créations »** — 14 est le nombre réel au catalogue
  aujourd'hui. En code, ce chiffre sera **dynamique** (compté en base, comme les valeurs de
  livraison de la FAQ) : note-le dans `NOTES.md` pour le passage en code.

⚠️ **Le CTA ne peut pas être « Découvrir la boutique ».** 58 à 59 % des sites échouent à donner la
**portée** de leurs liens, et les visiteuses lisent alors ce qu'elles voient comme le catalogue
entier — verbatim d'un testeur : « il n'y a que deux paires de chaussures sur ce site ». **Un lien
porte sa portée et n'est jamais un mot unique.** « Voir les 48 créations » passe, « Voir tout » et
« Découvrir » échouent. Cette règle vaut pour tous les liens de sortie de toutes les sections.

## Deux libertés, deux contraintes

**Libre** : la composition, la place et la nature du visuel, le décor dessiné, le rythme, la hauteur.

**Contraint** :

1. La hauteur du hero est libre **à condition que le premier écran porte un signal de continuation
   géométrique** : quelque chose de la suite déborde sous la ligne de flottaison. 6 utilisateurs
   sur 8 n'ont pas compris qu'une page défilait — le remède établi est géométrique, pas
   iconographique : **pas de flèche « scroll »**.
   ⚠️ **Ce signal ne peut PAS être la coupe des photos de la frise** — tranché le 2026-08-18,
   après qu'Adrien l'a demandé deux fois : les tuiles du hero sont **entières** sur les deux
   formats. C'est une décision, pas une régression, et la grille § 9 en retire sciemment 1 pt.
   Cherche le signal ailleurs : l'en-tête de la section suivante qui dépasse sous le pli, un
   débord de la chaîne seule (l'encre, pas les tuiles), un élément de décor traversant.
2. Sur mobile 390 × 844, entre la barre haute et la barre basse de 56 px, on doit voir le bloc titre
   **entier**, et de la marchandise entamée — le haut d'une pièce si la grille monte dans le hero,
   le haut de la section 2 sinon. Si la copie s'allonge, c'est elle qui cède, pas ce budget.

## Un point à trancher toi-même

La marchandise peut monter dans le hero (grille-hero) ou rester en section 2. Les deux se
défendent : montrer la marchandise, c'est montrer le périmètre, et une grille-hero est
structurellement immunisée contre le contenu promotionnel qui écrase le haut de page — défaut
présent sur 59 % des sites, en aggravation. **Propose ce que ton motif sert le mieux, et dis-moi
pourquoi.**

## Sortie

Le bloc de contrôle commun est joint plus bas dans ce prompt ; ajoute-lui ces points :

```
- [ ] le test des 5 secondes est passable sur la maquette mobile seule
- [ ] un signal de continuation déborde sous la flottaison, sans flèche — et ce n'est PAS
      la coupe des tuiles de la frise (arbitrage du 2026-08-18 : elles restent entières)
- [ ] le CTA porte une portée chiffrée
```
