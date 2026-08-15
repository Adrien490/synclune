# Synclune — le système

> Créé **une fois** au tour de bootstrap sous forme de **variables et de composants nommés** dans le
> `.pen`. Les tours suivants n'écrivent aucune valeur libre : ils consomment ces variables.

## Couleurs

**Synclune a deux couleurs de marque : le rose (primary) et le doré (secondary).** Tout le reste est
du papier, de l'encre et du gris.

| Variable     | Hex       | Rôle                                                                |
| ------------ | --------- | ------------------------------------------------------------------- |
| `papier`     | `#fafcff` | Fond de page, unique                                                |
| `encre`      | `#06070b` | Texte, tracés, anneau de focus                                      |
| `rose`       | `#fdb8e4` | **primary** — aplats : boutons, halos, taches, traits épais         |
| `rose-encre` | `#ac448d` | Le rose quand il doit être **lu** : petit texte accentué, badge     |
| `or`         | `#ffe2a2` | **secondary** — aplats : bandeaux, fonds de section, tracés remplis |
| `or-encre`   | `#896e2c` | Le doré quand il doit être **lu**                                   |
| `gris`       | `#e8ebf2` | Séparateurs, survols, fonds de champ                                |

**Trois règles dures :**

1. **`rose` et `or` ne portent jamais de texte ni de glyphe.** À 1,55:1 et 1,22:1 sur le papier, ils
   peignent des aplats, des traits et des motifs — ils n'écrivent pas. Pour écrire : `rose-encre`
   (5,15:1) et `or-encre` (4,74:1). L'encre sur un aplat rose ou or, elle, passe largement
   (12,6:1 et 16:1).
2. **Une seule couleur d'accent par section**, en alternance rose → or → rose → or. Pas les deux
   dans la même section.
3. **Pas de troisième couleur d'interface.** La polychromie de la marque arrive par les **photos** et
   par les tracés dessinés, pas par de nouveaux tokens.

### Écarts avec le code actuel — à faire arbitrer avant le passage en code

`papier`, `encre`, `rose` et `rose-encre` sont les conversions hex **exactes** des tokens
`--background`, `--foreground`, `--primary` et `--color-brand-rose-strong` de `app/globals.css`
(vérifié le 2026-08-15 par conversion oklch → sRGB).

La famille **or**, elle, est entièrement neuve : `or` (`#ffe2a2`) ne correspond à aucun token
(`--color-brand-sun` vaut `#eec976`) et `or-encre` (`#896e2c`) n'existe pas non plus. Surtout,
le système bicolore rose → or **remplace** la rotation d'accents actuelle lavande / menthe /
soleil (`[data-accent]`, `app/styles/section-accents.css`) : c'est un **choix de design à faire
valider par Léane**, pas un état de fait. Si la maquette est retenue, le passage en code devra
créer les tokens `or` / `or-encre` et retirer la rotation — ou, si Léane tient à la rotation,
c'est la maquette qui devra être adaptée. Dans les deux cas, la décision se prend **avant**
d'écrire le moindre token.

## Typographie

| Style          | Police     | Taille        | Graisse | Détails                         |
| -------------- | ---------- | ------------- | ------- | ------------------------------- |
| `display/h1`   | Winky Sans | clamp 40 → 64 | 300     | tracking −0.02em · leading 1.02 |
| `display/h2`   | Winky Sans | 32 → 40       | 300     | tracking −0.015em · leading 1.1 |
| `display/h3`   | Winky Sans | 24            | 300     | leading 1.2                     |
| `display/prix` | Winky Sans | 20            | 400     | leading 1.2                     |
| `sans/body`    | Onest      | 17            | 400     | leading 1.65                    |
| `sans/small`   | Onest      | 15            | 400     | leading 1.5                     |
| `sans/label`   | Onest      | 13            | 500     | tracking 0.09em · majuscules    |
| `cursive/note` | Kalam      | 17            | 400     | ponctuation seule               |

**Un titre display est grand et léger, jamais gras.** Winky Sans 300 tient par la taille.

⚠️ **La brièveté se paie en poids typographique.** Un petit élément est remarqué **plus lentement**
qu'un grand : un titre laconique en petit corps n'est pas le choix sûr. Un titre retient moins d'une
seconde — les premiers mots portent la charge.

⚠️ **16 px est le plancher absolu d'un champ de saisie** : strictement en dessous, iOS Safari zoome
au focus et ne se dézoome pas. Ne jamais corriger ça par `maximum-scale=1` — ça casse WCAG 1.4.4.

## Espacement, grille, formes

```
Espacement (base 4) : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128
Grille desktop 1440 : 12 colonnes · gouttière 24 · marge 64 · contenu max 1152
Grille mobile   390 : 4 colonnes  · gouttière 16 · marge 20
Breakpoints         : 390 · 768 · 1024 · 1440
Rayons              : 8 · 12 (défaut) · 16 · 20 · 32 · pilule
```

**Toute valeur d'espacement ou de typo vient de ces variables. Aucune valeur libre.**

Hauteur de section : jamais en `vh` — en `svh`/`dvh`, sinon un hero est trop haut au chargement.

## États et interaction

- **Bouton principal** : pilule, fond `rose`, texte `encre`, hauteur min 48.
- **Focus** : `outline 2px solid encre`, offset 2. Jamais un anneau rose seul (1,55:1 ne signale
  rien).
- **Cibles tactiles** : 24 × 24 est le plancher **opposable** (WCAG 2.5.8) ; 44 × 48 est le confort
  visé. Espacement ≥ 8 entre deux cibles.
- **Survol ⇒ focus** : toute affordance qui porte de l'information au survol doit la porter aussi au
  clavier.
- **Animation** : l'effet démarre sous 0,1 s, sinon elle est lue comme un obstacle. Aucune animation
  d'entrée ne laisse un élément à `opacity: 0` — c'est un défaut mesuré en LCP, pas une question de
  goût.

## Le trait dessiné

Trait à **1,5 px**, franc, un peu tremblé. Formes disponibles : goutte, grappe, feuille, anneau,
créole, cabochon peint, volute, touche de peinture, cœur, étoile, cercle, flèche, étincelle, nœud.

**Un seul critère : on dessine ce qu'on ne peut pas photographier.** L'atelier, le geste, une
catégorie, un état vide, un fond de section — jamais un bijou posé à 40 px d'une photo de bijou : le
dessin perd toujours contre la photo.

## Les images — stratégie de placeholder

**Tu n'as aucune photo de Léane.** Chaque emplacement photo est donc un **placeholder assumé** :

- un aplat de la couleur d'accent de la section + un tracé au trait 1,5 du motif retenu,
- **au ratio final exact**,
- **calque nommé `photo/<sujet>`** : `photo/creation-01`, `photo/creation-porte-01`,
  `photo/portrait-leane`, `photo/atelier-etabli`…

Cette liste de calques est la **checklist de shooting** de Léane — c'est le livrable secondaire du
design, prends-la au sérieux.

⚠️ **Le décor dessiné, lui, n'est pas un placeholder : il est final.**
⚠️ **Le portrait de Léane doit rester une VRAIE photo.** Une illustration n'est pas une photo de
stock — elle ne déclenche pas ce défaut — mais elle ne produit pas non plus le gain de confiance
d'un visage réel. Ne le remplace pas par un dessin dans la version finale.
⛔ Ne génère et ne référence **aucune image de banque**.
