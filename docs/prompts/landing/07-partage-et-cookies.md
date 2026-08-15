# Tour 7 — Les deux premiers écrans qu'on oublie

Travaille dans `07-partage/carte` (1200 × 630) et `07-partage/cookies` (390 × 844).

Ces deux surfaces sont absentes de la quasi-totalité des grilles d'audit de landing, parce qu'elles
ne s'affichent pas dans le navigateur au moment où on regarde la page. Ce sont pourtant, l'une comme
l'autre, **ce qui est vu avant le hero**.

---

## A. La carte de partage — `07-partage/carte`

Pour une visiteuse qui arrive par un lien partagé — messagerie, réseau social, capture d'écran
envoyée à une amie — **la carte d'aperçu est vue avant la page, et parfois à la place**. Elle doit
donc passer le même test que le hero : **« qu'est-ce que cette boutique vend ? »**

Contraintes :

- **1200 × 630**, un seul cadre, aucun scroll, aucune interaction.
- Elle est **rendue à part** : rien de ce qui est corrigé dans le titre ou le chapô de la page ne s'y
  propage. Traite-la comme une surface autonome.
- **C'est la scène idéale pour le motif dessiné** : il n'y a aucune photo de bijou en face d'elle,
  donc le critère « on ne dessine pas ce qui est photographié 40 px plus loin » ne s'applique pas
  ici. C'est même le seul endroit de la série où le dessin peut être le **sujet**.
- Le nom de la marque doit y être lisible sans être le seul contenu.

⚠️ Contrainte technique à connaître, parce qu'elle borne le design : cette carte est générée par un
moteur qui **ignore silencieusement `oklch()` et les variables CSS**. Un aplat peut sortir gris sans
qu'aucune erreur ne soit levée. Donne donc les couleurs **en hexadécimal explicite** dans cette
frame, et évite tout effet qui dépendrait d'un calcul de couleur.

---

## B. La bannière cookies — `07-partage/cookies`

Quand elle s'affiche, **c'est elle que la visiteuse lit en premier** : avant le titre, avant la
marchandise. Un design de landing qui ne la dessine pas conçoit une page que personne ne voit dans
cet état.

Dessine `01-hero/mobile` **avec la bannière posée dessus**, et vérifie que le hero reste lisible et
que la promesse du premier écran survit.

Contraintes :

- ⚠️ **Refuser doit être aussi simple qu'accepter** : même nombre de clics, même niveau de mise en
  avant, même poids visuel. Un « Tout accepter » plein contraste face à un « Paramétrer » en lien
  gris est exactement la configuration sanctionnée par la CNIL. Les deux boutons sont des pairs.
- Elle **recouvre** le contenu, elle ne le **pousse pas** : pousser le contenu produit un décalage de
  mise en page à l'affichage.
- Trois actions au plus : Accepter · Refuser · Personnaliser.
- Texte court, tutoyé, sans jargon.

---

## Sortie

`get_screenshot` des deux frames, puis :

```
- [ ] la carte de partage passe le test « qu'est-ce que cette boutique vend ? » seule
- [ ] ses couleurs sont en hexadécimal explicite
- [ ] Accepter et Refuser ont le même poids visuel et le même nombre de clics
- [ ] le hero reste lisible sous la bannière
```
