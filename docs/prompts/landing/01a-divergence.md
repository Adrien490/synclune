# Tour 1a — Divergence

> Posé le 2026-08-19 à l'audit du dossier. Ce tour n'existait pas dans la série d'août : elle
> demandait **onze fois un résultat, jamais une fourche**. Résultat mesuré : les seuls gestes
> vraiment créatifs de la série viennent des trois endroits où un prompt invitait explicitement
> à créer. Ce tour est cette invitation, placée là où elle vaut le plus cher — avant le hero.

Travaille dans `01a-divergence/piste-a`, `piste-b` et `piste-c` (390 × 844 chacune). Tu ne touches
à **aucune** autre frame — ni `01-hero/*`, ni les planches système, ni les composants.

## Ce qu'on te demande

**Trois directions pour le premier écran, aussi différentes que le brief le permet.** Pas trois
variations de mise en page : trois façons de répondre à « qu'est-ce que cette boutique vend ? »
qui ne se ressemblent pas. Si les trois pistes se distinguent surtout par leurs marges, le tour a
échoué.

Format mobile uniquement, et c'est délibéré : 390 × 844 est le format qui **tranche** (le test des
5 secondes du tour 1 se joue sur la maquette mobile seule), et trois pistes desktop coûteraient
trois fois plus cher pour une décision identique.

## Ce qui reste dur, même ici

Les interdits de `synclune-univers.md` ne se négocient pas — aucun registre joaillerie, aucune
formule interchangeable, aucune preuve sociale inventée, aucune banque d'images, pas de compte
client. Le contenu est celui du tour 1 (sur-titre, titre, chapô, CTA à portée chiffrée) : c'est
la **forme** qui diverge, pas la vérité.

Le système (`synclune-systeme.md`) tient aussi — à une exception, ci-dessous.

## Ce qui est ouvert, et qui ne l'est nulle part ailleurs

- **Le motif.** La goutte est le signe transversal de la marque, et c'est un excellent défaut —
  mais une piste sur trois a le droit de tenir un **autre** vocabulaire de forme du lexique
  (grappe translucide, petit tableau peint, arc-en-ciel déconstruit, tourbillon peint, chaîne
  chargée de pampilles), à condition de le tenir **entièrement**. Un sac d'icônes reste interdit.
- **La composition, la hauteur, la place et la nature du visuel, le rythme, le décor dessiné.**
- **Une extension du système par piste** : si une piste réclame une variable ou un composant que
  le système n'a pas, dessine-le **dans la piste**, nomme-le, et décris-le en trois lignes au
  carnet. Une extension proposée coûte zéro si elle est refusée ; une extension jamais proposée
  ne se voit pas.
- **La marchandise monte ou ne monte pas** dans le premier écran : que les trois pistes ne
  répondent pas toutes pareil est un bon signe, pas un défaut de cohérence.

## Ce que chaque piste doit porter, écrit dans la frame

Sous chaque piste, en `sans/small`, deux lignes — elles sont ce qui rend la décision possible :

- **« Signable par nous seuls parce que… »** — une phrase. Si elle pourrait être écrite par une
  autre boutique de bijoux, la piste est tiède : refais-la avant de rendre la main.
- **« Ce qu'elle sacrifie… »** — une phrase. Toute direction paie quelque chose ; celle qui ne
  paie rien n'a rien choisi.

## Le seul interdit propre à ce tour

⛔ **Pas de piste de sécurité.** Trois pistes dont une est « la sage, au cas où » ne sont que deux
pistes. Chacune doit être défendable seule, et tu dois pouvoir dire laquelle tu défendrais si on ne
t'en laissait qu'une.

## Sortie

`get_screenshot` des trois frames, puis :

```
- [ ] trois pistes, trois vocabulaires de forme distincts — pas trois mises en page du même
- [ ] chaque piste porte ses deux phrases (« signable par nous seuls » / « ce qu'elle sacrifie »)
- [ ] test de substitution passé sur les trois : remplace « Synclune » par une autre boutique de
      bijoux — aucune des trois ne reste vraie telle quelle (grille `_signature.md`, critère 1)
- [ ] aucune piste n'est la version prudente d'une autre
- [ ] contenu (sur-titre, titre, chapô, CTA) identique aux trois : seule la forme diverge
- [ ] aucune frame hors de `01a-divergence/*` n'a été modifiée
- [ ] extensions de système proposées : listées, dessinées dans leur piste, jamais posées dans
      les planches système
```

Termine par **ta recommandation** : laquelle tu défendrais, en trois lignes, et ce que les deux
autres ont trouvé qui mériterait d'être greffé sur elle. Puis ajoute ton entrée
`## Tour 1a — Divergence` à `NOTES.md`, et reporte dans `ETAT.md` ce qui reste à trancher.

⚠️ **Tu ne choisis pas.** La piste retenue est un arbitrage d'Adrien et de Léane ; le tour 1
exécute celle qui a été retenue, en la traitant comme le brief de forme du hero.
