# Audit du dossier — 2026-08-19 · la liberté créative laissée à l'IA

> Audit de `docs/prompts/landing/` **comme système de prompts**, pas comme documentation.
> Grille pondérée sur la demande d'Adrien — « je veux laisser la liberté créative à l'IA pour
> utiliser son plein potentiel » : **la liberté réellement laissée pèse 30 des 100 points**.
> Ce n'est pas la grille de l'audit du 2026-08-17 (qualité documentaire, 16/20 → 20/20) : c'est
> une autre question, et elle donne une autre note.
>
> **Note : 73/100.** Plan appliqué le même jour — état d'arrivée en fin de document.

## La grille

| Axe | Poids | Note | Ce qui manquait |
| --- | --- | --- | --- |
| Cadre créatif — la liberté réellement laissée | 30 | **17** | zéro divergence, zéro critère de distinctivité, système pré-décidé |
| Qualité du brief (marque, contenu, vérité) | 20 | **17** | une contradiction interne assumée mais non résolue |
| Conduite d'agent | 15 | **13** | l'échappatoire est un rapport, jamais une proposition |
| Vérifiabilité et garde-fous | 15 | **13** | 20 items de checklist, 0 sur la désirabilité |
| Continuité inter-tours | 10 | **7** | le carnet grossit sans compaction |
| Hygiène documentaire et rejouabilité | 10 | **6** | dérive README/HANDOFF, un fichier hors git |

## Ce qui était déjà remarquable — et n'a pas été touché

Le **brief de substance** est meilleur que ce qu'on voit habituellement : chaque ⛔ correspond à
une proposition réellement produite et jetée, les chiffres portent leur source, la copie est du
verbatim catalogue et pas de l'invention. `_conduite.md` est un modèle (pas de question bloquante,
tranche et note, vérifie avant d'affirmer, le rapport final est écrit pour quelqu'un qui n'a rien
vu). `_checklist.md` était déjà le meilleur objet du dossier : chaque item vérifiable depuis le
fichier, « écris *non vérifié* plutôt que de cocher ».

## Les six défauts, par coût décroissant

### 1. Le corpus ne demandait **jamais** d'alternative — 11 tours, 0 divergence (−8)

`grep` sur « deux propositions | trois directions | variantes de direction | alternative » sur les
16 fichiers de prompt : **zéro occurrence**. Chaque tour produisait **un** résultat, verrouillé
aussitôt par la checklist et par « ne touche qu'à ce que le tour nomme ». Adrien n'a jamais eu de
fourche à arbitrer — il a eu une exécution à valider.

Preuve dans le carnet lui-même : les seuls gestes vraiment créatifs de la série — **frange de
pampilles** (tour 1), **squiggle** de survol (tour 10), **planche motion**, **cœur** de l'atelier
— viennent tous soit d'une invitation explicite (« un point à trancher toi-même », « choisis-en
UNE et assume-la »), soit d'une passe hors série commandée à la main (« implémentations créatives
dans la DA »). Trois invitations sur onze tours ; la production créative les suit exactement.

### 2. La checklist n'avait aucun critère de désirabilité — 20 items, tous défensifs (−5)

Système, mise en page, copie, calques : 20 **garde-fous**. Le seul item de style était négatif
(« aucun superlatif »). Rien ne demandait : *est-ce que cette section n'aurait pas pu être signée
par n'importe quelle boutique de bijoux ?* Or `synclune-univers.md` pose que « c'est la sobriété
qui doit se justifier, pas l'audace » — sans dispositif qui fasse **payer** la tiédeur, rien ne la
faisait payer. Ce qui est coché est ce qui est optimisé.

### 3. Le système était livré fini — l'IA ne concevait rien, elle consommait (−4)

`synclune-systeme.md` fixait les 8 hex, l'échelle typo, l'espacement, les rayons, la grille, le
trait à 1,5 px, l'alternance rose→or, et `_checklist.md` verrouillait « aucune valeur libre ». Le
tour 0, « le tour le plus important de la série », ne faisait que **transcrire** un système déjà
écrit. Coût matérialisé : l'arbitrage bicolore **vs** rotation d'accents était toujours ouvert
trois jours après la fin de la série, alors qu'il suffisait de demander les deux planches.

### 4. Le carnet écrasait le budget créatif (−3)

`landing.sh` injectait `NOTES.md` **en entier** : 66 413 caractères de journal pour 16 922 de
contexte de marque. Un rejeu du tour 05 partait sur ~89 Ko dont 75 % d'historique. Le carnet est
la meilleure idée du dossier (c'est lui qui empêche le tour 5 de changer de motif), mais monotone
croissant et injecté brut, il oriente le modèle vers la reproduction du passé au moment précis où
on lui demande de créer.

### 5. Deux contradictions vivantes dans le corpus (−2)

- **`01-hero.md` contrainte nº 1** exigeait que la section suivante soit *visiblement coupée par
  la flottaison* — alors que `HANDOFF.md` arbitrage nº 2 a tranché le 2026-08-18 : tuiles
  **entières**, coupe interdite. Un rejeu du tour 01 réintroduisait exactement ce qu'Adrien avait
  demandé deux fois de retirer.
- **`05-atelier.md`** imposait « … dans sa pochette, **avec amour** » en verbatim, alors que
  `synclune-univers.md` liste « avec amour » dans les ⛔ formules interchangeables.

### 6. Dérive documentaire et rejouabilité (−4)

Carte du dossier ignorant `11-livraison-au-code.md` et `AUDIT-MAQUETTE-2026-08-17b.md` · note
annoncée 79/100 pour 82 effectifs · « série terminée le 2026-08-17 » suivie de trois passes ·
`11-livraison-au-code.md` **untracked dans git** · deux items numérotés « 3. » dans `HANDOFF.md` ·
`landing.sh` acceptant sans broncher les tours 09 et 10, dont les prompts citent des ids de nœuds
(`j9QGj`, `Trd6e`, `fb42R`) morts sur tout fichier régénéré.

---

## Le plan — appliqué le 2026-08-19

### Lot 1 — rendre l'audace vérifiable et divergente → 85 (+12)

| # | Geste | Fichier |
| --- | --- | --- |
| 1.1 | **Bloc SIGNATURE** en tête de la checklist : test de substitution, geste propre nommé, une idée par section, coût de la sobriété justifié. C'est le seul bloc qui peut faire **refaire** une section. | `_checklist.md` |
| 1.2 | **Tour de divergence `01a`** : trois pistes de premier écran, trois vocabulaires de forme, deux phrases par piste (« signable par nous seuls » / « ce qu'elle sacrifie »), ⛔ pas de piste de sécurité. L'agent recommande, il ne choisit pas. | `01a-divergence.md`, `landing.sh`, `00-bootstrap.md` |
| 1.3 | **Droit de proposition** — une extension du système par tour, dans une frame `proposition/<tour>-<sujet>`, décrite en trois lignes au carnet. « Une proposition refusée ne coûte rien ; une proposition jamais faite ne se voit pas. » | `_conduite.md` |
| 1.4 | **Deux planches d'accent** au tour 0 (bicolore **et** rotation du code), contrastes recalculés des deux : l'arbitrage bloquant se prend sur pièce. | `00-bootstrap.md` |
| — | **Grille de signature /20** : contrepoids de la grille § 9. Toute passe d'audit produit désormais deux notes, et aucune ne se paie sur l'autre. | `_signature.md` |

### Lot 2 — libérer le budget d'attention du modèle → 94 (+9)

| # | Geste | Fichier |
| --- | --- | --- |
| 2.1 | **Scission de la mémoire** : `ETAT.md` (état courant, ≤ 80 lignes, réécrit) injecté avec les **deux dernières entrées** du carnet. Injection mesurée : **66 413 → 4 689 caractères** de journal. Le carnet reste lisible via `--repo`. | `ETAT.md`, `landing.sh`, `_conduite.md` |
| 2.2 | **Contradiction hero résolue** : la contrainte devient « un signal de continuation géométrique », avec l'interdit explicite de le chercher dans la coupe des photos et trois pistes de remplacement. | `01-hero.md` |
| 2.2 | **Contradiction « avec amour » rendue visible des deux côtés** plutôt que tranchée en solo : l'interdit porte son exception, la copie imposée porte son statut d'arbitrage. Elle n'ouvre aucun droit ailleurs. | `synclune-univers.md`, `05-atelier.md` |
| 2.3 | **Les 5 arbitrages Léane réécrits en questions fermées**, tranchables en une phrase et sur pièce, avec le bloquant identifié. | `ETAT.md` |

### Lot 3 — hygiène et rejouabilité → 100 (+6)

| # | Geste | Fichier |
| --- | --- | --- |
| 3.1 | `11-livraison-au-code.md` ajouté à l'index git. | — |
| 3.2 | Carte du dossier complétée (6 fichiers manquants), note **82/100**, statut « livrable figé, passage en code non commencé », plage de dates corrigée, rejouabilité à jour. | `README.md` |
| 3.3 | Renumérotation (deux « 3. ») + compagnons à jour. | `HANDOFF.md` |
| 3.4 | **Garde one-shot** sur 09/10 : le script refuse, `PEN_FORCE=1` pour passer outre ; séquence complète = `00 · 01a · 01 → 08`. | `landing.sh` |
| 3.5 | Deux notes séparées pour toute passe future (conformité /100, signature /20). | `_signature.md`, `HANDOFF.md`, `README.md` |
| — | Commentaire `.prettierignore` corrigé : il affirmait « non trackés », faux depuis le 2026-08-17. | `.prettierignore` |

## État d'arrivée

**100/100 sur la grille de cet audit** — les six défauts sont soldés, aucun n'était bloqué par un
tiers. Deux réserves honnêtes, qui ne sont pas des points perdus mais des faits à connaître :

- Le tour `01a` est **posé, jamais exécuté**. Sa valeur est nulle tant qu'il n'a pas tourné
  (~8-10 $ en `xhigh`), et il ne sert que si la landing est re-designée depuis le tour 0 : sur la
  maquette actuelle, la direction du hero est déjà fixée.
- La grille `_signature.md` **n'a pas encore été passée** sur `landing.pen`. La maquette est notée
  82/100 en conformité et **non notée** en signature. C'est la première passe à faire — et la
  seule qui dira si le diagnostic de tiédeur de cet audit vaut aussi pour le livrable, ou
  seulement pour le système qui l'a produit.
