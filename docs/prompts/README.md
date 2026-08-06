# Prompts Synclune — mode d'emploi

Quatre catalogues de prompts à copier-coller, et la manière de les enchaîner pour obtenir les meilleures
interfaces possibles. Ce fichier est le point d'entrée : les quatre autres sont les prompts eux-mêmes.

| Fichier                                                  | Ce qu'il produit                                                 | Touche au repo ? | Taille    |
| -------------------------------------------------------- | ---------------------------------------------------------------- | ---------------- | --------- |
| [`prompts-audit-synclune.md`](prompts-audit-synclune.md) | **159 audits ciblés** — un rapport noté /100 + P0-P3             | non (rapport)    | 3 556 l.  |
| [`AUDIT-PROMPTS.md`](AUDIT-PROMPTS.md)                   | **26 missions larges** par domaine — audit, conception, merge    | oui, largement   | 571 l. ⚠️ |
| [`DESIGN-ARTIFACT-PROMPT.md`](DESIGN-ARTIFACT-PROMPT.md) | **3-4 directions MAQUETTÉES** sur une page publiée, pour choisir | **non**          | 578 l.    |
| [`REDESIGN-PROMPT.md`](REDESIGN-PROMPT.md)               | **Une refonte implémentée** d'une seule surface                  | oui, sur 1 cible | 351 l.    |

> **Raccourci** : `DESIGN-ARTIFACT` s'invoque aussi par la commande **`/design-artifact <cible>`**
> (`.claude/commands/design-artifact.md`), qui charge la SSOT et branche la cible — plus de
> copier-coller. Le wrapper est volontairement mince : le prompt lui-même ne vit QU'ICI.

---

## Comment on colle un prompt

1. **Ouvre une session fraîche.** Un contexte déjà chargé dégrade la qualité de façon invisible : le modèle
   croit avoir lu ce qu'il a lu 200 messages plus tôt. Une session par étape, sans exception.
2. **Copie le bloc ` ```text ` entier**, pas la prose autour — elle est de la documentation pour toi.
3. **Renseigne les champs en FIN de bloc.** `CIBLE` au minimum. Ils sont à la fin exprès : collé en ligne de
   commande, le curseur y atterrit tout seul, sans avoir à remonter dans ce que tu viens de coller.
4. Envoie.

**Donne un dossier, pas un fichier**, quand la surface a des voisins
(`app/(shop)/(home)/_components/navbar/` plutôt que `navbar.tsx`). Les prompts insistent sur le fait qu'un
composant « ne vit jamais seul » — encore faut-il lui donner de quoi voir les voisins.

---

## La chaîne

```
prompts-audit-synclune  →  DESIGN-ARTIFACT  →  REDESIGN  →  ré-audit
   (où ça fait mal)         (quoi faire)       (le faire)   (ce qui a cassé)
```

Tu ne les fais pas tous à chaque fois :

- **Tu sais que la surface est moche, pas quoi en faire** → `DESIGN-ARTIFACT` directement. Cas nominal.
- **Tu ne sais pas si elle est moche** → un prompt de `prompts-audit-synclune.md` d'abord, dix fois moins cher.
- **La direction est évidente** (un espacement, un état manquant, un contraste) → `REDESIGN` seul. Payer un
  artifact pour ça, c'est quarante minutes pour apprendre ce que tu savais déjà.
- **Un domaine entier à durcir** (perf, a11y, SEO, sécurité) → `AUDIT-PROMPTS.md`, qui va jusqu'au merge.

### Le passage de relais est câblé

La section `#reco` de l'artifact se recopie **telle quelle** dans les cinq champs en fin de
`REDESIGN-PROMPT.md` :

```
CIBLE / DIRECTION RETENUE / NOTE AVANT / REFUS ET INVARIANTS HÉRITÉS / LOTS
```

Quand `DIRECTION RETENUE` est remplie, `REDESIGN` bascule : son §3 devient « confirme-la ou conteste-la en
3 lignes » au lieu d'en chercher une, et son §2 reprend la note de l'artifact au lieu de refaire le
diagnostic. `LOTS` est en dernier parce que c'est le seul champ multi-ligne.

### Le ré-audit final n'est pas optionnel

C'est l'étape que tout le monde saute. La ProductCard a été refondue le 2026-08-03 sur un audit à 79 — le
ré-audit qui a suivi l'a notée **72**, avec 7 lots de correctifs, dont un CTA en `opacity-0` **cliquable**
sur iPad et un `overflow` qui clippait la carte sur `/favoris`. Une refonte crée ses propres bugs, dans les
angles morts de la direction qu'elle vient d'adopter. Compte cette passe dans le budget dès le départ.

### Un « artifact de design » n'est pas « Claude Design »

Deux choses différentes qui portent presque le même nom. La confusion coûte une session à chaque fois qu'on
la refait — d'où cette section.

|              | **Artifact de design**                             | **Claude Design**                                                        |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Ce que c'est | une page web publiée, une par surface auditée      | un catalogue **permanent** de composants, hébergé sur `claude.ai/design` |
| Produit par  | `DESIGN-ARTIFACT-PROMPT.md` + l'outil `Artifact`   | l'outil `DesignSync` + la skill `/design-sync`                           |
| Sert à       | **arbitrer** entre 3-4 directions, puis on archive | **référencer** — montrer les vrais composants                            |
| On en a      | 4 (ProductCard, CollectionCard, navbar, footer)    | **0, et c'est délibéré**                                                 |

**Claude Design n'est PAS adopté** (décision du 2026-08-04, motif complet dans `memory/`). Trois raisons :

1. `/design-sync` synchronise **une bibliothèque de composants locale**. Il n'y en a pas ici : ni Storybook,
   ni Ladle, aucun preview HTML. L'adopter n'est pas une édition de prompt, c'est un harnais de rendu à
   construire **et à maintenir** — hors budget pour une opératrice unique.
2. Le vrai plafond est celui décrit juste en dessous : le modèle ne peut pas voir le site. Un jeu de données
   de dev réaliste rend plus, pour beaucoup moins.
3. **Les maquettes d'un artifact ne peuvent pas servir de cartes de référence** : le §6 leur demande d'être
   approximatives exprès — hex littéraux au lieu des tokens, variables `--a-*`, Georgia à la place de
   Winky Sans (la CSP d'un artifact bloque tout hôte externe), plaques `inert`, et des classes `.mk--bug` qui
   reproduisent l'état cassé. Excellent pour arbitrer, disqualifiant comme référence.

**Condition de réouverture, et une seule** : un groupe **Fondations** isolé (~8-10 previews générés depuis
`app/globals.css`, `shared/styles/fonts.ts`, `motion.config.ts` et les 3 primitives Atelier), qui retirerait
du §6 le tableau hex dérivé à la main — celui qui était faux **à 4/6** le 2026-08-04. N'y revenir que s'il
redérive une **seconde** fois. Et si un catalogue voit le jour, c'est la sortie de `REDESIGN-PROMPT.md` (le
composant réel) qui l'alimente, jamais les plaques de l'artifact.

---

## Ce qui fait vraiment la qualité

### Le plus gros levier n'est pas le prompt

**Le modèle ne peut pas voir le site.** La base dev n'a **aucun produit `PUBLIC`**, et `pnpm seed` est
destructif (wipe complet, gate `SEED_ALLOW` — ne jamais le lancer sans accord). Conséquence : sur la
ProductCard, le rendu a été validé « par maquette artifact + grep du CSS compilé », pas en regardant la
vraie carte.

Un jeu de données de dev réaliste et non destructif — dix produits publics, un en rupture, un en promo, un
titre à 60 caractères — améliorerait chaque refonte future plus que n'importe quelle réécriture de prompt.
C'est exactement le « contenu le plus laid » que `DESIGN-ARTIFACT` §4.6 exige et que personne ne peut
vérifier aujourd'hui.

### Obtenir de l'audace plutôt que du tiède

`DESIGN-ARTIFACT` exige **une direction plus risquée que ce que tu demanderais spontanément**. Si tu prends
systématiquement la sage, tu paies quatre directions pour en utiliser une.

- **Dis laquelle tu veux voir dessinée à fond.** Le volume est plafonné (une direction complète, les autres
  au format principal) sinon c'est trente plaques bâclées. Si tu as une intuition, nomme-la : « dessine C à
  fond ». Sinon le modèle choisit sa préférée, pas forcément la plus utile à ton arbitrage.
- **Refuse explicitement, et dis pourquoi.** Chaque refus motivé devient un fichier dans `memory/`, qui
  remonte dans la section `#gardefous` de l'artifact, qui passe dans `REDESIGN`. C'est un cliquet : la liste
  des refus est passée de 7 à ~15 entrées, et c'est la raison pour laquelle personne ne te repropose le CTA
  sticky mobile pour la quatrième fois. Un « non » vague ne s'écrit nulle part.

### Les pièges d'environnement

- ⚠️ **Jamais de `grep`/`find` depuis la racine sans exclure `.claude/worktrees/`** : ce dossier contient une
  copie périmée du repo et fait « exister » tous les chemins morts.
- L'index git est **partagé avec les sessions voisines** : jamais de `git add -A`.
- `prisma.config.ts` ne charge que `.env`, jamais `.env.local`.

---

## Entretien : ces fichiers pourrissent

C'est leur mode de panne principal, et il est documenté. En juillet 2026, `prompts-audit-synclune.md` citait
des chemins morts sur **~25 %** de son catalogue après trois vagues de retraits — un prompt périmé produit
des audits faux, en silence.

Deux règles qui en découlent :

1. **Chaque prompt porte une date de vérification** sur ses valeurs figées (tokens, chemins, comptes), et la
   consigne « si ça ne correspond plus à ce que tu lis dans le repo, **le repo gagne** — corrige-toi et
   signale la dérive ».
2. **Après tout gros retrait**, re-vérifier les chemins : extraire les backticks commençant par un root connu
   (`app/`, `modules/`, `shared/`, `docs/`, `prisma/`), expandre les `{a,b}`, tester l'existence.

**La liste des refus fait foi dans [`DESIGN-ARTIFACT-PROMPT.md`](DESIGN-ARTIFACT-PROMPT.md) §8**, adossée à
`memory/`. Les autres fichiers en portent des copies : si tu en ajoutes un, mets-le d'abord là, puis
propage. Les trois copies avaient divergé sans qu'aucune ne contienne les autres — et c'est le fichier qui
écrivait du code qui portait la liste la plus courte.

---

## État connu

⚠️ **`AUDIT-PROMPTS.md` est une restauration incomplète.** Sa copie de travail a été supprimée du disque le
2026-08-04 sans jamais avoir été indexée ; le fichier présent vient de `git HEAD` et a perdu ~45 lignes de
modifications dont le contenu est inconnu. Il porte un bandeau en tête. À relire en entier avant de retirer
l'avertissement.

Audit du 2026-08-04 : `DESIGN-ARTIFACT-PROMPT.md` noté **71/100** puis remédié (4 équivalents hex faux issus
d'une conversion CIE Lab au lieu d'OKLab, handoff non branché, aucune bascule pour une surface qui n'existe
pas encore, `data-theme` jamais vérifié). Le détail vit dans `memory/`.

Seconde passe le 2026-08-04 (477 → 578 l.), qui corrige le **P0 hérité de son voisin** : le §3 envoyait
encore lire les sections Breakpoints / Overlays / Survol vs focus dans `CLAUDE.md`, alors qu'elles avaient
été extraites dans [`../UI-CONVENTIONS.md`](../UI-CONVENTIONS.md) — un modèle lisait dix puces au lieu de
262 lignes. `REDESIGN-PROMPT.md` avait été remédié le 05/08, pas celui-ci : les entrées
`DOC_SECTION_REFERENCES` du contract test couvrent désormais **les deux** (34 assertions, contre 26).
Ajouté dans la foulée : le brief de marque réécrit **en positif** (palette des 4 accents, vocabulaire
dessiné à la main, voix à la première personne), le bloc « tu ne pourras peut-être pas voir la surface »,
le **banc d'essai** qui rend les directions comparables à géométrie constante, une table de tokens portée
de 7 à 16 lignes avec la règle de contraste qui débloque les directions colorées, et la mise hors-jeu
explicite des capacités runtime d'un artifact (MCP, AI-powered, stockage persistant).

Prochaine cible naturelle : **la landing**, vidée le 2026-08-03 et en attente de refonte
(`app/(shop)/(home)/page.tsx`). C'est aussi le seul moyen d'éprouver la bascule « surface neuve » de
`DESIGN-ARTIFACT`, écrite mais jamais exercée.
