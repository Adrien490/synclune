# Contre-visite du dossier — 2026-08-19 · même grille, note fraîche

> Contre-visite de `AUDIT-DOSSIER-2026-08-19.md` (73/100 le matin, plan appliqué, arrivée
> annoncée à 100/100), menée le même jour avec la **même grille** — on ne réinvente pas une
> grille par passe. Verdict : le plan du matin est **réellement appliqué, intégralement**, mais
> la contre-visite trouve un défaut de système que la grille du matin a manqué, trois défauts
> mineurs, et compte en points les deux dettes d'exécution que le matin avait laissées en
> « réserves honnêtes ».
>
> **Note : 88/100.** Plan appliqué le jour même — état d'arrivée en fin de document, **passe de
> signature comprise : la maquette est notée 12/20**, détail au § dédié.

## La grille, re-notée

| Axe | Poids | Note | Ce qui coûte |
| --- | --- | --- | --- |
| Cadre créatif — la liberté réellement laissée | 30 | **25** | les deux instruments de liberté n'avaient jamais tiré |
| Qualité du brief | 20 | **19** | 4,74 vs 4,72 entre deux documents d'autorité |
| Conduite d'agent | 15 | **14** | la SIGNATURE auto-notée par l'agent qui vient de dessiner |
| Vérifiabilité et garde-fous | 15 | **13** | le préambule de la checklist contredit son bloc SIGNATURE |
| Continuité inter-tours | 10 | **7** | **la fourche 01a → 01 n'avait pas d'arbitre** |
| Hygiène documentaire et rejouabilité | 10 | **10** | rien |

## Les défauts, par coût décroissant

### 1. La séquence enchaînait la divergence et le hero sans arbitrage (−3, continuité)

`01a-divergence.md` est formel : « Tu ne choisis pas. » Or `landing.sh` jouait
`00 · 01a · 01 → 08` d'une traite, personne ne regardant pendant qu'elle tourne, et
`01-hero.md` ne mentionnait le tour 1a nulle part. Sur un rejeu complet, le tour le plus cher de
la série (`xhigh`) s'exécutait **avant** que quiconque ait vu les trois pistes : la fourche
existait, l'arbitre n'avait pas de siège. C'est le trou que la grille du matin a manqué — au
cœur même de ce qu'elle voulait réparer.

### 2. Les deux instruments de liberté n'avaient jamais tiré (−5, cadre créatif)

Le matin l'écrivait en réserve sans se le compter : la grille `_signature.md` n'était **pas
passée** sur `landing.pen` (−3 — sur une grille qui pèse la liberté *réellement* laissée à
30 points, un instrument jamais utilisé ne compte pas plein pot), et le tour `01a` restait
**posé, jamais exécuté**, sans même un prompt d'atterrissage côté tour 1 (−2).

### 3. Le préambule de la checklist mentait depuis le matin (−2 vérifiabilité, −1 conduite)

« Tous les points ci-dessous sont vérifiables depuis le fichier — aucun ne se coche à
l'estime » : vrai des 20 garde-fous, faux des 4 items SIGNATURE, qui sont précisément des
jugements. Et ces jugements étaient rendus par l'agent qui venait de dessiner, sans obligation
d'écrire ses phrases là où Léane peut les contester.

### 4. Micro-écart entre deux documents d'autorité (−1, brief)

`synclune-systeme.md` donnait or-encre/papier à 4,74:1, `ETAT.md` à 4,72. Recalcul depuis les
hex (`#896e2c` sur `#fafcff`) : **4,72 est la bonne valeur** — c'est le système qui était faux.

### 5. Découvert en cours d'application : les planches d'accent n'existaient pas (hors grille)

Le plan du matin avait ajouté les deux planches `00-systeme/accents-*` au **prompt** du tour 0
(pour un rejeu futur) — mais personne ne les avait dessinées dans le `landing.pen` actuel, alors
qu'`ETAT.md` demandait à Léane de trancher l'arbitrage bloquant nº 1 « sur les deux planches ».
La pièce de l'arbitrage sur pièce n'existait pas.

---

## Le plan — appliqué le 2026-08-19

### Lot 1 — donner un siège à l'arbitre (correctifs de texte) → 95

| # | Geste | Fichier |
| --- | --- | --- |
| 1.1 | La séquence sans argument joue `00 · 01a` et **s'arrête** avec le mode d'emploi ; `./landing.sh suite` joue `01 → 08` après l'arbitrage. | `landing.sh` |
| 1.2 | Le tour 1 **lit la piste retenue** dans `ETAT.md` (`Piste retenue du tour 1a : …`) ; frames 01a dessinées + ligne absente ou « EN ATTENTE » ⇒ il **s'arrête et le dit** — seul cas de blocage légitime de la série. Le tour 1a écrit la ligne au format que le tour 1 sait lire. | `01-hero.md`, `01a-divergence.md` |
| 1.3 | Préambule de la checklist scindé : garde-fous vérifiables par outil ; SIGNATURE vérifiée **par l'écriture** — les phrases sont dans le rapport final, où Léane peut les contester. Une coche sans sa phrase ne vaut rien. | `_checklist.md` |
| 1.4 | 4,74 → **4,72**. | `synclune-systeme.md` |

### Lot 2 — faire tirer les instruments → 100

| # | Geste | Résultat |
| --- | --- | --- |
| 2.1 | **Passe de signature sur `landing.pen`** (exports des 6 sections + pied + carte OG, lecture des nœuds et des `context`). | **12/20**, détail ci-dessous |
| 2.2 | Sections faibles → **deux propositions dessinées** dans le mécanisme prévu par le dossier (frames `proposition/contre-visite-*`, sections figées intouchées), arbitrages nº 6-7 d'`ETAT.md`. | `proposition/contre-visite-creations`, `proposition/contre-visite-faq` |
| 2.3 | **Statut de 01a tranché** : instrument de la **prochaine** refonte, hors décompte de la maquette actuelle (son hero est arbitré) — inscrit au README. | `README.md` |
| — | **Les deux planches d'accent dessinées** dans `landing.pen` (`00-systeme/accents-bicolore` / `-rotation`), contrastes recalculés des deux — l'arbitrage bloquant nº 1 se prend enfin sur pièce. Fait notable : la rotation ne sait pas **écrire** (lavande #a996e2 2,51:1 · menthe #6ccea6 1,85:1 · soleil #eec976 1,54:1 sur papier, aucune déclinaison encre en code). | `landing.pen` |

---

## Passe de signature — `landing.pen`, 2026-08-19 : **12/20**

Première application de `_signature.md` au livrable. Exports vérifiés dans la session (sections
1-6 desktop, hero mobile, pied, carte OG), copie lue dans les nœuds.

### Critère 1 — test de substitution : 2 sections substituables sur 6 → **4/6**

1. **Hero — tient.** La frise de pampilles (les créations pendent à une chaîne, tuiles
   échelonnées), la touche de pinceau sur « colorés », la note manuscrite « commence par là ».
2. **Créations — SUBSTITUABLE.** Une grille de 8 cartes à coins arrondis au cordeau ; retirés
   les noms du catalogue (qui ne comptent pas), n'importe quelle boutique la signe.
3. **Collections — tient.** « Choisis ton petit monde » (la formule courte de la marque en
   titre), grappe de vignettes inégales, état vide dessiné en gouttes de pluie.
4. **Types — tient.** « Plutôt collier ou porte-clés ? », huit vignettes au trait tremblé dont
   papilloux et chaînes de cheveux, échelles et inclinaisons variées.
5. **Atelier — tient.** Récit première personne (plastique fou, cuisson), « c'est moi qui lis,
   c'est moi qui réponds », main au pinceau, « environ 3 h par bijou ♥ ».
6. **FAQ — SUBSTITUABLE (limite).** La voix tient (« Les questions qu'on me pose vraiment »,
   « comme je le ferais par message ») mais la forme — accordéon + encadré — est neutre : au
   test strict, une autre créatrice solo signe la section telle quelle.

### Critère 2 — le geste propre : 4 sections sur 6 → **4/6**

Hero : la **frange de pampilles** coupée par rien (frise `q3d3a8`). Collections : la **grappe
inégale** (`MJZEa`) et l'état vide en pluie. Types : les **huit dessins au trait** dans la
grappe `oyFzp`. Atelier : la **main au pinceau** (`gQkR6`) + « 3 h par bijou » en cursive.
Créations : **rien au repos** — le squiggle n'existe qu'au survol. FAQ : les puces gouttes sont
de la ponctuation, pas un geste.

### Critère 3 — une idée par section : 5 sur 6 → **2/4**

Hero : « le catalogue pend à une chaîne, comme les bijoux ». Collections : « quatre petits
mondes en grappe ». Types : « la question de comptoir — plutôt collier ou porte-clés ? ».
Atelier : « le bijou passe entre les mains, 3 h montrées ». FAQ : « je te réponds comme par
message ». Créations : « une grille de 8 cartes » — un gabarit, pas une idée.

### Critère 4 — le coût de la sobriété : ~la moitié justifiée → **2/4**

Justifiées par écrit : le bandeau chrome sobre (tour 9 — « la barre n'est pas une section »),
la scannabilité de la FAQ (budget d'attention, position 6), le blanc du hero desktop (arbitrage
nº 5, documenté ouvert). Non justifiées : la **grille créations au cordeau** (aucune trace — et
c'est le contre-principe de la symétrie imparfaite), l'encadré « En pratique » plat.

### Lecture, et suite

**12/20 — « distinctive par endroits, interchangeable ailleurs »** : les sections faibles sont
**créations** (grave : c'est la section qui convertit — substituable, sans geste, sans idée) et
**FAQ** (moindre : la voix la rattrape à moitié). Les deux propositions dessinées en réponse :

- **« La grille respire »** (`proposition/contre-visite-creations`) — les cartes s'échelonnent
  (tops 0·24·8·32), l'écho de la frange du hero ; coûte ~32 px et un `nth-child`, desktop
  seulement. Donne à la section un geste ET une idée (« l'accumulation, pas le cordeau »).
- **« Répondue comme un message »** (`proposition/contre-visite-faq`) — la réponse dépliée
  devient une bulle signée « — Léane » : la forme rejoint la promesse du chapô.

Si Léane prend les deux : substitution 6/6 → 6 pts, geste 6/6 → 6 pts, idée 6/6 → 4 pts —
**signature ~18/20** à re-vérifier sur pièce. Si elle n'en prend aucune, 12/20 est la note
assumée du livrable, et c'est son droit : les propositions auront coûté deux frames.

## État d'arrivée

**100/100 sur la grille de cet audit** — les cinq défauts sont soldés le jour même :
l'orchestration s'arrête à la fourche et le tour 1 sait la lire ; la signature est passée
(12/20, sections faibles nommées, propositions dessinées) ; 01a a un statut écrit ; le
préambule de la checklist dit la vérité ; 4,72 partout ; les planches d'accent existent dans le
fichier. Restent **sept arbitrages Léane** (`ETAT.md`), dont un bloquant (accents) — aucun
n'est du ressort du dossier.

Deux observations hors grille, notées sans y toucher : un `ref` anonyme vide traîne à la racine
du `.pen` (`GH7Z7`, origine inconnue — à trier) ; et les entrées injectées du carnet sont en ce
moment deux entrées « méta » (passes et audits), pas des entrées de section — `ETAT.md` porte
l'état, c'est lui qui compte.
