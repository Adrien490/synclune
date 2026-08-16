# Tour 3 — Collections

Travaille dans `03-collections/desktop` et `03-collections/mobile`. Réutilise le composant
`carte-collection`.

## L'intention

L'entrée par **le monde** d'où sort la pièce. C'est le bloc d'orientation de la page : celle qui a
scrollé jusqu'ici sait ce qui est vendu, elle cherche maintenant par quoi entrer.

## Contenu

Quatre collections — ce sont quatre **territoires de la marque**, pas des rayons :

| Nom                     | Description (verbatim du catalogue)                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Jardin fantastique**  | « Raisins, grappes, feuilles et nénuphars — le jardin qui pousse en bijoux, une perle à la fois. »  |
| **Ciel cosmique**       | « Lunes, constellations et tourbillons peints à la main — le ciel de nuit tient dans un cabochon. » |
| **Arc-en-ciel liquide** | « Des gouttes en séquence, du rose au bleu nuit — la pluie qui a décidé d'être une fête. »          |
| **Tableaux à porter**   | « Peinture miniature sur cabochon, filiation Van Gogh et Monet — des musées de 2 centimètres. »     |

Les descriptions sont longues pour une carte : tu peux les tronquer à l'affichage, **pas les
réécrire**. Elles portent la voix.

Lien de sortie : **« Voir les 4 collections »** — la portée, toujours.

## La contrainte structurelle

**Une carte produit montre UN objet ; une carte collection doit montrer un ENSEMBLE.** Ce n'est pas
ornemental : `Collection` n'a **aucun champ image** en base, elle emprunte ses visuels à ses
produits. Donc :

- **2 à 4 visuels par carte**, montés (pile, éventail, grappe, mosaïque — à toi de voir),
- **plafond dur de 4** : la requête qui alimente ces visuels est partagée avec le méga-menu,
- l'état **`sans-visuel` doit tenir debout** : une collection sans photo est un cas normal, et c'est
  là que le trait dessiné a toute sa place — une collection vide, ça ne se photographie pas.

## Le piège à éviter

Quatre cartes alignées en quatre quarts égaux, c'est la **section tiède** : beaucoup d'espace pour
peu de contenu, et le contre-pied exact de la marque, qui vit d'accumulation et de symétrie
imparfaite. Une composition qui assume les quatre — tailles inégales, décalages — sert mieux le
propos que la bande régulière. À toi de trouver laquelle.

⚠️ **Quatre aujourd'hui, potentiellement neuf demain** (la boutique Etsy en a neuf). La composition
doit **ne pas casser** à 6 ou 9 cartes ; dis-moi comment elle se comporte.

## Sortie

Le bloc de contrôle commun est joint plus bas dans ce prompt ; ajoute-lui ces points :

```
- [ ] chaque carte montre 2 à 4 visuels, jamais un seul
- [ ] l'état `sans-visuel` est dessiné et tient debout
- [ ] la composition survit à 6 et 9 cartes
```
