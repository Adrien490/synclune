# Troisième passe du dossier — 2026-08-19 · même grille, après les arbitrages du jour

> Troisième application de la grille d'`AUDIT-DOSSIER-2026-08-19.md` (73 le matin → 88 à la
> contre-visite → plans appliqués), menée après la séance d'arbitrage d'Adrien (nº 1-4 tranchés,
> piste D appliquée, pastilles rejetées après essai, signature re-notée 18/20). On ne réinvente
> pas de grille par passe. Verdict : **le travail de design est soldé, la documentation ne l'a
> pas suivi** — trois fichiers injectés à chaque tour affirmaient encore que des arbitrages
> tranchés étaient ouverts, et le README annonçait en tête un état faux depuis le matin même.
>
> **Note : 89/100.** Plan appliqué le jour même — état d'arrivée en fin de document.

## La grille, re-notée

| Axe | Poids | Note | Ce qui coûte |
| --- | --- | --- | --- |
| Cadre créatif — la liberté réellement laissée | 30 | **29** | le point critère-4 de la signature reste « à constater à la prochaine passe » |
| Qualité du brief | 20 | **17** | trois contradictions vivantes dans des fichiers injectés ou rejouables |
| Conduite d'agent | 15 | **14** | la re-notation 18/20 rendue par la session qui venait d'appliquer les gestes |
| Vérifiabilité et garde-fous | 15 | **13** | deux vérifications dues (plis, satori) ; les pièces du veto Léane hors git sans recette pointée |
| Continuité inter-tours | 10 | **9** | double « 6. » dans `ETAT.md`, le fichier injecté |
| Hygiène documentaire et rejouabilité | 10 | **7** | README faux sur son statut, HANDOFF en contradiction interne, total des coûts inexact |

## Ce qui tient — et qui est nouveau depuis la contre-visite

Les deux instruments de liberté ont tiré **des deux côtés** : la signature est passée deux fois
(12/20 → propositions → 18/20 sur pièce), et le droit de proposition a produit un cycle complet
avec un **rejet après essai** (pastilles gouttes : appliquées, montrées, rejetées, frame annotée
« ne pas re-proposer ») — la preuve que le mécanisme est réversible, pas un tampon. La fourche
01a a son arbitre, `ETAT.md` tient ses 80 lignes, la re-notation documente sa propre réserve de
conduite et note le critère 4 à la lettre plutôt qu'à son avantage. Le piège du `save()` fantôme
a été attrapé, réparé et généralisé en règle (mtime avant tout commit).

## Les défauts, par coût décroissant

### 1. Trois contradictions vivantes — la classe de défaut déjà payée deux fois (−3, brief)

Le défaut nº 5 de l'audit du matin, recréé par les arbitrages du jour :

- **`synclune-univers.md`** disait « avec amour » « en attente d'arbitrage … jusqu'à ce que
  Léane tranche » — faux depuis le matin (nº 4 tranché, formule remplacée). Fichier injecté à
  **chaque** tour.
- **`05-atelier.md`** imposait toujours « avec amour » en copie verbatim « assumée jusqu'à
  arbitrage » : un rejeu du tour 05 (rejouable par `./landing.sh 05`) réintroduisait mot pour
  mot ce qu'Adrien a fait remplacer — le scénario exact du rejeu-du-tour-01 corrigé la veille
  pour les tuiles.
- **`synclune-systeme.md`** § Écarts présentait bicolore vs rotation comme « à faire arbitrer
  avant le passage en code » (« la décision se prend avant d'écrire le moindre token ») —
  tranché le matin, sur pièce. Écho dans `00-bootstrap.md` (« il bloque le passage en code »).
- Résidu de la même famille dans **`06-faq.md`** (rejouable) : le franco encore décrit comme
  « une offre que Léane doit créer ou abandonner » (abandonnée le 2026-08-18), et le ⚠️
  « Dernière section » instruisait toujours de **remonter le franco**.

### 2. README et HANDOFF n'avaient pas suivi la journée (−3, hygiène)

- **`README.md`** en tête : « il reste 7 arbitrages Léane, dont un bloquant » · « 12/20 en
  signature » · « deux propositions en attente d'arbitrage » — trois affirmations fausses. Le
  § « En attente d'arbitrage Léane » décrivait encore cinq questions ouvertes (et contredisait
  son propre en-tête : cinq vs sept).
- **`HANDOFF.md`** : l'en-tête annonçait « 12/20 … deux propositions à arbitrer » quand son
  propre arbitrage nº 4 disait « plus AUCUN arbitrage ouvert » — contradiction **interne** au
  premier document que lira la session d'implémentation.
- Total des coûts du README : **73,36 $** annoncés, la colonne somme à **73,34 $** (même
  famille que le 4,74/4,72 de la contre-visite).

### 3. Deux vérifications dues, déclarées mais non faites (−2, vérifiabilité)

`ETAT.md` les déclare (« Vérifs restantes : plis · satori OG ») — comptées quand même, comme la
contre-visite avait compté les « réserves honnêtes » du matin : le relevé « 11/11 plis coupent
du contenu » date d'AVANT les propositions (+90/+67 px) et l'insertion du filigrane ; le rendu
satori réel de la carte OG n'a jamais été vérifié depuis le tour 7.

### 4. Le veto Léane reposait sur des pièces hors git, sans recette pointée (−1, vérifiabilité)

`ETAT.md` concluait « veto Léane sur pièce (`apercus/`) » — un dossier intégralement gitignoré,
local à cette machine. Résolution retenue : **documenter la régénération plutôt que versionner
les binaires** (~4 Mo de PNG, tous régénérables du `.pen` committé), d'autant qu'un carrousel
d'envoi à Léane est apparu en parallèle de cette passe (`apercus/pour-leane/`, auto-documenté,
généré depuis le `.pen` avec sa recette `python3 deck.py && node shoot.mjs`).

### 5. Défauts de forme (−1 continuité, −1 cadre créatif, reste hors décompte)

Deux décisions verrouillées numérotées « 6. » dans `ETAT.md` (le doublon exact des deux « 3. »
de HANDOFF comptés au premier audit, dans le fichier injecté) · le point critère-4 de la
signature reste à constater à la prochaine passe (dette d'exécution, comme en 19b) · le barème
du critère 4 saute de « toutes → 4 » à « la moitié → 2 » — la re-notation (toutes sauf une) est
tombée dans le trou et a payé 2 pts pour un défaut documentaire d'une ligne · `./landing.sh
suite` ne vérifiait pas la ligne « EN ATTENTE » avant de payer l'amorce d'un tour xhigh (la
garde vivait dans le prompt seul).

---

## Le plan — appliqué le 2026-08-19

### Lot 1 — solder les contradictions vivantes → les rejeux redeviennent sûrs

| # | Geste | Fichier |
| --- | --- | --- |
| 1.1 | L'exception « avec amour » réécrite en **décision soldée** (remplacée par « les doigts encore pleins de peinture », sans purge systématique — précision d'Adrien conservée). | `synclune-univers.md` |
| 1.2 | Étape 4 du récit : verbatim remplacé, l'avertissement documente la décision au lieu d'imposer l'ancienne copie. | `05-atelier.md` |
| 1.3 | § Écarts retitré « TRANCHÉ le 2026-08-19 : bicolore rose/or », consigne de code (créer `or`/`or-encre`, retirer la rotation) et fait décisif (la rotation ne sait pas écrire) inscrits. | `synclune-systeme.md` |
| 1.4 | Planches d'accent : le livrable reste (un rejeu du tour 0 est un NOUVEAU design, l'arbitrage doit rester re-prenable sur pièce), le « bloque le passage en code » est daté et soldé. | `00-bootstrap.md` |
| 1.5 | Franco : « à créer ou abandonner » → **abandonné le 2026-08-18, ne rien réintroduire** ; le ⚠️ « Dernière section » parle désormais de `{frais}`/`{délai}` et du bandeau, plus du franco. | `06-faq.md` |

### Lot 2 — rattraper l'état annoncé

| # | Geste | Fichier |
| --- | --- | --- |
| 2.1 | Statut de tête : passage en code DÉBLOQUÉ, 18/20, plus aucun arbitrage ; § arbitrages réécrit (tout tranché, pastilles rejetées, veto sur pièce avec recette de régénération) ; ligne 19c ajoutée à la carte ; total 73,34 $. | `README.md` |
| 2.2 | En-tête aligné sur son propre corps : 18/20, plus aucun arbitrage ouvert. | `HANDOFF.md` |
| 2.3 | Renumérotation 6/6 → 6/7 ; la ligne veto pointe les pièces ET leur statut (hors git, régénérables) — le fichier reste ≤ 80 lignes. | `ETAT.md` |

### Lot 3 — outillage et barème

| # | Geste | Fichier |
| --- | --- | --- |
| 3.1 | Garde gratuite du mode `suite` : `grep` de « Piste retenue du tour 1a … EN ATTENTE » dans `ETAT.md`, refus avant de payer le tour 01 ; ligne absente = rejeu sans divergence, on laisse passer (c'est le cas prévu par `01-hero.md`). | `landing.sh` |
| 3.2 | Cran « toutes sauf une → 3 » ajouté au barème du critère 4, daté APRÈS la re-notation — le 18/20 reste noté à l'ancien barème : on ne re-note pas une passe en changeant sa grille derrière elle. | `_signature.md` |

## État d'arrivée

**100/100 sur la grille de cette passe** — les défauts documentaires sont soldés le jour même.
Restent, hors du ressort du dossier et déjà déclarés dans `ETAT.md` : re-vérifier les 11 plis
(contenu décalé de +90/+67 px + filigrane), tester le rendu satori réel de la carte OG, le veto
Léane sur pièce (le carrousel `apercus/pour-leane/` est prêt à partir), le shooting
(`SHOOTING.md`, 9 photos), puis le passage en code (`HANDOFF.md` + `11-livraison-au-code.md`)
et la re-notation des deux grilles sur le **site rendu** — 82/100 et 18/20 valent pour la
maquette sur placeholders, pas pour la page servie.

Observation hors grille, notée sans y toucher : `apercus/pour-leane/` (deck Instagram pour le
veto Léane) est apparu **pendant** cette passe, auto-documenté — référencé depuis le README et
`ETAT.md`, contenu non modifié. Le `ref` anonyme `GH7Z7` à la racine du `.pen` reste à trier.
