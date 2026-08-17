# Série pen.dev — landing Synclune

> Série de design de la landing, menée du 2026-08-16 au 2026-08-17. **Statut : TERMINÉE.**
> Le livrable est `landing.pen` (versionné) ; le journal des décisions est `NOTES.md` ;
> ce README dit ce qui est rejouable, ce qui ne l'est pas, et les pièges d'outillage.

## La carte du dossier

| Fichier | Rôle |
| --- | --- |
| `landing.pen` | **Le livrable** — maquette complète (système, 6 sections, carte OG, cookies, assemblages, états). Versionné depuis le 2026-08-17. |
| `NOTES.md` | Carnet de bord : décisions, mesures, erratums, arbitrages en attente. La mémoire inter-tours de la série. |
| `SHOOTING.md` | Checklist de shooting pour Léane — 9 photos, toutes 4:5. |
| `HANDOFF.md` | Consignes de passage en code, consolidées depuis le carnet. |
| `AUDIT-MAQUETTE-2026-08-17.md` | Passe de la grille § 9 sur la maquette : 79/100, backlog statué. |
| `_conduite.md` · `synclune-univers.md` · `synclune-systeme.md` | Contexte injecté au début de chaque tour (comportement, marque, système). |
| `_checklist.md` | Bloc de sortie commun des tours de section (1 à 6). |
| `00-bootstrap.md` … `10-etats.md` | Les prompts des 11 tours. |
| `landing.sh` | Orchestration CLI : contexte + prompt + checklist + carnet, un tour = un appel `pen`. |

## Rejouable, pas rejouable

- **Tours 00 à 08** : rejouables par `./landing.sh <tour>` — mais un re-lancement produit un
  NOUVEAU design (ids, compositions et mesures différents), pas une restauration.
- **Tours 09 et 10** : one-shot — leurs prompts référencent des ids de nœuds et des mesures
  (plis, bounds) d'une exécution précise. Sans objet sur un fichier régénéré.
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

La liste à jour vit dans `NOTES.md`, entrée « Audit du dossier — 2026-08-17 ». Le point
prioritaire : **le franco de port** — « Livraison offerte dès {franco} » est affiché sur
toutes les frames alors qu'aucun seuil d'offre n'existe dans le code (`shipping-rates.ts`).
