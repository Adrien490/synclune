# `docs/` — index

Point d'entrée du dossier. Chaque document a une **autorité différente** : certains fixent des
règles qu'un test verrouille, d'autres racontent une décision passée. La colonne « Autorité » est
la seule chose à lire avant de citer un de ces fichiers comme argument.

> Créé le 2026-08-06. Motif : **5 des 10 documents n'étaient référencés depuis aucun point
> d'entrée** — ni `README.md`, ni `CONTRIBUTING.md`, ni `CLAUDE.md`. Le plus gros document du dépôt
> était invisible, donc jamais consulté, donc réinventé à chaque passe.

## Règles et référentiels — ça fait autorité

| Fichier                                                  | Ce qu'il porte                                                                     | Autorité                                                | Taille   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md)                 | Base UI, breakpoints, overlays, icônes, cibles tactiles, reflow, saisie mobile     | **Forte** — chaque règle nomme son test                 | 463 l.   |
| [`LANDING-BEST-PRACTICES.md`](LANDING-BEST-PRACTICES.md) | État de l'art landing page **+ la grille d'audit de `/`** (§ 9, note /100 + P0-P3) | **Forte** — sourcée 🟢🟡🔴, mais le test du dépôt gagne | 1 522 l. |
| [`BUSINESS.md`](BUSINESS.md)                             | Modèle d'activité, seuils fiscaux, périmètre assumé — SSOT du positionnement       | **Forte**                                               | 153 l.   |
| [`BRAND-DA.md`](BRAND-DA.md)                             | Lexique de marque : six territoires, palette, ton, mots interdits                  | **Forte** — `brand-lexicon.contract.test.ts`            | 394 l.   |
| [`COLLECTION-CARD.md`](COLLECTION-CARD.md)               | Doctrine de la carte collection, et les règles d'image LCP chiffrées pour ce dépôt | **Forte**                                               | 551 l.   |
| [`KNOWN-ISSUES.md`](KNOWN-ISSUES.md)                     | Défauts reproduits, localisés et **délibérément non corrigés**                     | **Forte** — à lire avant de « redécouvrir »             | 185 l.   |

## Notes d'audit et décisions — c'est de l'histoire

Ces fichiers disent ce qui a été décidé et pourquoi. Ils **périment** : en cas de désaccord avec le
code, le code gagne.

| Fichier                                                            | Ce qu'il raconte                                                           | Taille |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------ |
| [`FONTS-AUDIT-2026-08-05.md`](FONTS-AUDIT-2026-08-05.md)           | Choix des polices, et pourquoi la display n'a **pas** de fallback métrique | 355 l. |
| [`LANDING-SECTION-COLLECTIONS.md`](LANDING-SECTION-COLLECTIONS.md) | La section « Choisis ton univers » — décision et invariants                | 184 l. |
| [`LANDING-SECTION-ETAL-DECOR.md`](LANDING-SECTION-ETAL-DECOR.md)   | ⚠️ Document d'histoire du décor du hero, plus d'état courant               | 489 l. |
| [`LANDING-SECTION-FAQ.md`](LANDING-SECTION-FAQ.md)                 | La section « Des questions ? » — direction « Le nuancier », AVANT refonte  | 401 l. |
| [`atelier-story.md`](atelier-story.md)                             | La copie longue de l'atelier (⚠️ au vouvoiement, contrairement au site)    | 108 l. |

## Sous-dossiers

| Dossier                         | Contenu                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| [`prompts/`](prompts/README.md) | 4 catalogues de prompts (audit, design, refonte) + leur mode d'emploi            |
| `stripe/`                       | Miroir local de la doc Stripe, **généré** par `pnpm docs:stripe` — ne pas éditer |

## Deux conventions du dossier

1. **La date est dans le corps, pas dans le nom** — sauf pour une note d'audit ponctuelle
   (`FONTS-AUDIT-2026-08-05.md`). Un référentiel qu'on met à jour porte sa date de vérification en
   tête ; un instantané la porte dans son nom.
2. **Un document de règles nomme le test qui verrouille chaque règle.** Sans test, c'est une
   intention — utile, mais qui ne tranche pas un désaccord. Les exceptions sont signalées sur place.

⚠️ Six fichiers seulement sont sous `test/contract/claude-md-accuracy.contract.test.ts` (chemins
cités existants, liens markdown vivants) : `CLAUDE.md`, `docs/UI-CONVENTIONS.md`,
`docs/LANDING-BEST-PRACTICES.md`, les deux prompts de design et le wrapper `/design-artifact`.
**Les autres peuvent contenir des chemins morts sans que rien ne le signale** — c'est ainsi que
`docs/LANDING-SECTION-ATELIER.md`, supprimé, est resté cité depuis six fichiers de code.
