# Tour 2 — Les dernières créations

Travaille dans `02-creations/desktop` et `02-creations/mobile`. Réutilise le composant
`carte-produit` du fichier — ne le redessine pas.

## L'intention

C'est la section qui fait le chiffre d'affaires, et c'est le **travail nº 1 d'une page d'accueil** :
donner à voir le périmètre du catalogue. Une visiteuse qui ne voit pas le type de bijou qu'elle
cherche **suppose qu'il n'est pas vendu** et part. L'image capte plus vite que le texte : sur ce
point, les produits battent une liste de catégories.

## Contenu

**8 cartes**, choisies pour leur **étalement** de types — **pas** pour leur performance
commerciale. Le catalogue en compte 14, sur 8 types ; huit cartes peuvent donc en couvrir la
quasi-totalité, et c'est la cible. (Le « 40 à 50 % des types » de la grille § 9 est un critère de
**premier écran**, pas le plafond de cette grille.) Prends de quoi montrer qu'on ne vend pas que
des colliers.

Les noms sont ceux du catalogue, pas des inventions. Les voici, avec leur type :

| Pièce                              | Type            | Pièce                             | Type             |
| ---------------------------------- | --------------- | --------------------------------- | ---------------- |
| Collier goutte arc-en-ciel         | Collier         | Collier lune peinte               | Collier          |
| Collier Water Lilies               | Collier         | Bague Nuit étoilée                | Bague            |
| Bague cabochon abricot             | Bague           | Créoles grappe de raisin          | Boucles          |
| Boucles gouttes de rosée           | Boucles         | Boucles asymétriques soleil-nuage | Boucles          |
| Bracelet pluie joyeuse             | Bracelet        | Bracelet bonbons acidulés         | Bracelet         |
| Chaîne de cheveux étoile filante   | Chaîne cheveux  | Chaîne de corps goutte de pluie   | Chaîne de corps  |
| Papillou tourbillon violet         | Papillou        | Porte-clés nénuphar               | Porte-clés       |

**Au moins une carte montre la pièce PORTÉE**, et une autre donne l'**échelle** (à côté d'une main,
d'une oreille). 37 % des sites n'ont aucune photo à l'échelle et 23 % aucune photo portée — sur du
bijou, l'échelle absolue est très difficile à juger sur fond blanc, et c'est un motif de rejet.

Lien de sortie : **« Voir les 14 créations »**, jamais « Voir tout ».

## Les pièces vendues — une porte, jamais un mur

30 % des visiteuses **quittent le site entièrement** en tombant sur un produit indisponible. Deux
conceptions sont défendables, choisis-en une et assume-la :

1. **Exclure les pièces vendues de cette grille** — sa fonction est de convertir, une pièce vendue y
   convertit à 0 %. Elles restent accessibles par une page « déjà parties ».
2. **Les inclure, clairement marquées, à condition que chaque carte vendue mène quelque part** :
   vers une pièce disponible proche, ou vers la commande personnalisée — qui pour une créatrice est
   un meilleur dénouement qu'une visiteuse perdue.

⚠️ **« Prévenez-moi du retour en stock » est le mauvais choix** : les utilisateurs le lisent comme
un signal d'aller voir ailleurs, et l'ignorent le plus souvent.

En l'absence d'avis, une pièce partie est une des rares preuves sociales disponibles — « celle-ci
est partie » dit que d'autres ont acheté. **Mais seulement si c'est une porte.**

## Rareté : le test de la ligne claire

**La phrase serait-elle encore vraie si la visiteuse revenait demain ?**

- Oui → c'est une **description**, légitime : « pièce unique », « série de 6 », « il en reste 2 »
  (lu en base), « prochaine fournée en septembre ».
- Non → c'est un dark pattern : compte à rebours, « X personnes regardent cet article », compteur
  déconnecté du stock réel. La DGCCRF a bloqué 80 sites au premier semestre 2025, dont plusieurs
  pour manipulation des niveaux de stock.

## Sortie

Colle ici le bloc `_checklist.md`, et ajoute :

```
- [ ] les 8 pièces étalent les types de bijoux, elles ne se ressemblent pas
- [ ] prix et variantes de couleur visibles sur chaque carte, sans clic
- [ ] au moins une pièce portée et une pièce à l'échelle
- [ ] chaque carte `vendu` mène quelque part
```
