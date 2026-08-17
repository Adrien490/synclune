# Tour 6 — FAQ et réassurance

Travaille dans `06-faq/desktop` et `06-faq/mobile`. Réutilise le composant `accordeon-question`.

## L'intention

C'est la section de **réassurance**, et elle a un brief chiffré. Sur 70,22 % d'abandon de panier, les
motifs adressables sont, dans l'ordre :

| Motif                                    | %        |
| ---------------------------------------- | -------- |
| Frais supplémentaires trop élevés (port) | **40 %** |
| Livraison trop lente                     | **20 %** |
| Pas confiance pour donner sa carte       | 19 %     |
| **Création de compte obligatoire**       | **18 %** |
| Politique de retour insatisfaisante      | 13 %     |

**Deux conséquences directes :**

1. Les deux plus gros postes sont de l'**information**, pas de la réassurance graphique. Une page qui
   écrit en clair **le coût de port, le seuil de franco et le délai d'expédition** fait mieux qu'une
   rangée de pictogrammes de bouclier. ⛔ Pas de bandeau d'icônes de confiance.
2. **18 % abandonnent sur l'obligation de créer un compte.** Synclune est 100 % invité : c'est un
   avantage **mesuré**, et il faut le **dire** — « Commande sans créer de compte » — pas seulement
   l'implémenter. Même chose pour les favoris : 75 % des sites exigent un compte pour sauvegarder un
   produit, ici non.

⛔ **Pas de sceau de paiement sur cette page.** La preuve porte sur le tunnel de paiement, là où la
carte est saisie ; sur une page d'accueil, un badge répond à une peur que la visiteuse n'a pas
encore, et un badge non reconnu **crée** le doute au lieu de le lever.

## Contenu

Accordéon, **une seule question ouverte par défaut, ou aucune**. Prends **cinq à six** questions
parmi celles-ci — ce sont les vraies :

- Les bijoux sont-ils vraiment faits main ?
- Pourquoi y a-t-il si peu d'exemplaires de chaque pièce ?
- Comment entretenir mes bijoux faits main ?
- Comment choisir la bonne taille (bague, bracelet, collier) ?
- Quel est le délai de livraison en France ?
- Comment fonctionnent les retours ?
- Puis-je personnaliser une création ?

⚠️ **Les valeurs de livraison sont des placeholders `{frais}`, `{délai}`, `{franco}`.** Ne les écris
pas en dur dans la maquette : une page d'accueil qui annonce un délai différent de celui du tunnel
fabrique exactement le motif d'abandon nº 1. `{frais}` et `{délai}` ont leur source unique côté
code (`SHIPPING_RATES` et `PREPARATION_BUSINESS_DAYS`,
`modules/orders/constants/shipping-rates.ts`). ⚠️ **`{franco}`, lui, n'a AUCUNE source** — aucun
seuil de livraison offerte n'existe dans le code (constaté à l'audit du dossier, 2026-08-17) :
c'est une offre que Léane doit créer ou abandonner avant le passage en code, pas une valeur à
brancher.

Sortie humaine en fin de section : **« Une autre question ? Écris-moi. »**

⚠️ **Dernière section de la page** : elle ne peut pas être la seule porteuse d'une information
critique. Si le franco de port ne vit qu'ici, il ne vit nulle part — remonte-le, ou dis-moi où il
devrait vivre en plus.

## Chaleur et précision

Le bon appariement, celui que la recherche soutient : **chaleur maximale sur le geste, précision
maximale sur l'exploitation.** « Fait main à Nantes » d'un côté, « expédié sous {délai} · retours 14
jours » de l'autre. Ce qui inquiète chez une créatrice seule, ce n'est jamais la fabrication — c'est
_est-ce que ça part, quand, et puis-je le renvoyer_. Le flou sur la livraison est ce qui transforme
le charme artisanal en risque perçu.

## Sortie

Le bloc de contrôle commun est joint plus bas dans ce prompt ; ajoute-lui ces points :

```
- [ ] « Commande sans créer de compte » est écrit quelque part, visiblement
- [ ] aucun pictogramme de bouclier, aucun sceau de paiement
- [ ] les valeurs de livraison sont des placeholders, pas des chiffres en dur
- [ ] la section se scanne sans être dépliée
```
