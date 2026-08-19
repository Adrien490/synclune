# Série pen.dev — landing Synclune

> Série de design de la landing, menée du 2026-08-16 au 2026-08-19.
> **Statut : livrable figé, passage en code non commencé** (il reste 7 arbitrages Léane, dont
> un bloquant — `ETAT.md`). Maquette notée **82/100 en conformité** (grille § 9) et **12/20 en
> signature** (grille `_signature.md`, passée à la contre-visite du 2026-08-19 — deux propositions
> en attente d'arbitrage pour les sections faibles). Le livrable est `landing.pen` (versionné) ;
> l'état courant est `ETAT.md`, le journal des décisions `NOTES.md` ; ce README dit ce qui est
> rejouable, ce qui ne l'est pas, et les pièges d'outillage.

## La carte du dossier

| Fichier | Rôle |
| --- | --- |
| `landing.pen` | **Le livrable** — maquette complète (système, 6 sections, carte OG, cookies, assemblages, états). Versionné depuis le 2026-08-17. |
| `ETAT.md` | **L'état courant**, ≤ 80 lignes, réécrit à chaque passe : motif, accents, mesures qui font autorité, décisions verrouillées, arbitrages ouverts, pièges. C'est lui que le script injecte. |
| `NOTES.md` | Carnet de bord, jamais réécrit : décisions, mesures, erratums, tour par tour. La mémoire **longue** — on y va chercher *pourquoi*, pas *ce qui est vrai*. |
| `SHOOTING.md` | Checklist de shooting pour Léane — 9 photos, toutes 4:5. |
| `HANDOFF.md` | Consignes de passage en code, consolidées depuis le carnet. |
| `11-livraison-au-code.md` | Les 24 critères Performance / SEO / Accessibilité qu'une maquette ne peut que **spécifier** — chacun avec sa méthode de vérification. |
| `AUDIT-MAQUETTE-2026-08-17.md` | 1ʳᵉ passe de la grille § 9 sur la maquette : 79/100, backlog statué. |
| `AUDIT-MAQUETTE-2026-08-17b.md` | Contre-visite après le tour 10 : 77/100 et 1 P0 → **82/100, 0 P0** après application du backlog. |
| `AUDIT-DOSSIER-2026-08-19.md` | Audit du dossier **comme système de prompts**, pondéré sur la liberté créative : 73/100 → plan appliqué le même jour. |
| `AUDIT-DOSSIER-2026-08-19b.md` | Contre-visite du même jour, même grille : 88/100 (fourche 01a→01 sans arbitre, dettes d'exécution) → plan appliqué — passe de signature **12/20** sur la maquette, planches d'accent dessinées, deux frames `proposition/*`. |
| `_conduite.md` · `synclune-univers.md` · `synclune-systeme.md` | Contexte injecté au début de chaque tour (comportement, marque, système). |
| `_checklist.md` | Bloc de sortie commun des tours de section (1 à 6) — garde-fous **et** bloc SIGNATURE. |
| `_signature.md` | Grille de **désirabilité /20**, contrepoids de la grille de conformité § 9. Toute passe d'audit produit les deux notes. |
| `00-bootstrap.md` · `01a-divergence.md` · `01-hero.md` … `10-etats.md` | Les prompts des 12 tours. |
| `landing.sh` | Orchestration CLI : contexte + prompt + checklist + état courant, un tour = un appel `pen`. |

## Rejouable, pas rejouable

- **Tours 00 à 08** (`01a` compris) : rejouables par `./landing.sh <tour>` — mais un
  re-lancement produit un NOUVEAU design (ids, compositions et mesures différents), pas une
  restauration. `./landing.sh` sans argument joue `00 · 01a` puis **s'arrête** : les trois pistes
  de la divergence sont un arbitrage d'Adrien et de Léane, pas un tour de plus — la piste retenue
  s'inscrit dans `ETAT.md`, puis `./landing.sh suite` joue `01 → 08` (contre-visite du
  2026-08-19 : la séquence enchaînait la fourche et le hero sans que personne ait vu les pistes).
- **Tours 09 et 10** : one-shot — leurs prompts référencent des ids de nœuds et des mesures
  (plis, bounds) d'une exécution précise. Sans objet sur un fichier régénéré, et **le script les
  refuse** depuis le 2026-08-19 (`PEN_FORCE=1 ./landing.sh 09` pour passer outre en connaissance
  de cause).
- **Les passes du 2026-08-17** (correction médiateur CNPM, passe correctifs de l'audit
  maquette, passe créative, tour 10) ont été menées **via le MCP de l'app desktop** et ne sont
  scriptées nulle part : le `.pen` committé est la SEULE source de l'état final. C'est la
  raison pour laquelle il est versionné — « régénérable » n'est plus vrai.

## Pièges d'outillage (tous constatés, aucun supposé)

- **App Pen et CLI `pen` tiennent chacun leur copie du `.pen`** : le dernier qui sauve écrase
  l'autre. Fermer l'app avant tout `./landing.sh` — le préflight du script le vérifie et
  refuse de tourner sinon. Corollaire : après une session MCP dans l'app, **Cmd+S avant tout
  commit** — les mutations MCP vivent en mémoire de l'app tant qu'elle n'a pas sauvé.
- **L'outil `browser` du CLI exige l'app desktop lancée, et a échoué même app lancée**
  (deux tentatives, tours 0 et 0bis) : l'import de la chrome réelle n'a jamais fonctionné.
  La description de `00-bootstrap.md` est donc de fait la source de la chrome — elle a été
  alignée sur le code le 2026-08-17 et doit le rester.
- **`TakeScreenshot` (MCP) sert des rendus périmés quand l'app est ouverte** ; vérifier les
  visuels avec `Export` png. Un sous-arbre fraîchement créé peut même rester BLANC à
  l'`Export` tant qu'il n'a pas été COPIÉ — remède : `Copy` du frame, supprimer l'original,
  garder la copie. Les bounds lus dans le même appel qu'une mutation sont à moitié
  recalculés — re-mesurer dans un appel séparé.
- **Les plafonds de session Claude Code coupent les tours CLI** (le reset est affiché dans
  l'erreur) : le tour retombe AVANT écriture — les `.bak-<tour>` n'ont jamais eu à servir.
- **Tours de reprise** : `0b` (reprise chrome après l'échec d'import) et `04b` (finition
  types) ont été lancés à la main, hors `effort_for` — le script ne connaît que `00` à `10`.
- **Édition concurrente** : quelqu'un peut éditer dans l'app pendant une session MCP —
  re-lire avant d'écrire, ne jamais « réparer » un nœud inattendu sans vérifier son origine.

## Coûts (CLI `pen`, claude-fable-5 — total : 73,36 $)

| Tour | Effort | Coût | Note |
| --- | --- | --- | --- |
| 00 bootstrap | max | 10,57 $ | variables, composants, chrome, frames |
| 0b reprise chrome | medium | 1,87 $ | import browser en échec, aucun nœud touché |
| 01a divergence | xhigh | — | **posé le 2026-08-19, jamais exécuté** — trois pistes de premier écran. **Statut tranché à la contre-visite : instrument de la PROCHAINE refonte**, hors décompte de la maquette actuelle (son hero est arbitré) — ne l'exécuter que si la landing se redessine depuis le tour 0 |
| 01 hero | xhigh | 7,18 $ | |
| 02 créations | high | 4,95 $ | |
| 03 collections | high | 5,57 $ | |
| 04 types | high | 11,28 $ | panne service pen.dev incluse (51 tours de boucle) |
| 04b finition types | medium | 6,55 $ | reprise après la panne |
| 05 atelier | high | 5,41 $ | |
| 06 faq | medium | 3,26 $ | |
| 07 partage + cookies | medium | 3,25 $ | |
| 08 assemblage | high | 4,74 $ | |
| 09 améliorations | high | 8,71 $ | |
| 10 états | medium | 0 $ | échec CLI (plafond de session) — exécuté ensuite via MCP |

Les passes MCP du 2026-08-17 (médiateur, correctifs, créative, tour 10) sont passées par des
sessions Claude Code, hors de ce compteur.

## En attente d'arbitrage Léane

**La liste à jour vit dans `ETAT.md`** — cinq questions fermées, chacune tranchable en une
phrase et sur pièce. La nº 1 (accents bicolore rose/or **vs** rotation lavande/menthe/soleil du
code) est la plus structurante : elle décide s'il faut créer les tokens `or`/`or-encre` ou
adapter la maquette — les deux planches `00-systeme/accents-*` sont dessinées, contrastes
recalculés des deux. Les trois propositions (grille respire · FAQ-message · pastilles gouttes)
ont été **prises et appliquées le 2026-08-19** sur délégation d'Adrien (frames
`proposition/* — PRISE`, Léane peut les défaire) ; le pack d'arbitrage vit dans
`apercus/arbitrages/`, les rendus après application dans `apercus/apres-propositions-*.png`.

⚠️ Le point qui était prioritaire — **le franco de port** — a été **tranché le 2026-08-18 :
abandonné**. `{franco}` n'avait aucune source dans `shipping-rates.ts` ; il est retiré de toute
la maquette et le bandeau porte « Livraison {frais} · expédié sous {délai} ».
