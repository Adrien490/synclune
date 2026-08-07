# La section « Des questions ? » — direction

> **Écrit le 2026-08-06 AVANT toute modification de code**, à la demande de l'user (« revoir
> l'UI/UX/DA de `faq-section.tsx` »), puis **audité et repris deux fois le même jour**. La direction
> retenue n'est **ni** « B — Le nuancier » (calibre trop bas) **ni** « E — L'échantillonnier »
> (lavis de famille sur les onze rangées, **essayée, implémentée, puis jugée trop forte par Léane**)
> mais **« F — Le nuancier, au bon calibre »** — c'est-à-dire B à 20 px au lieu de 10. Elle est
> **implémentée** (§ 6, § 7). C'est exactement l'arbitrage que le § 5 laissait ouvert entre E et F,
> et le seul qui l'était : « à préférer à E si le lavis sur onze rangées est jugé trop fort ».
> Ce document tranche **la direction** et fixe les invariants et les lots ; il ne
> remplace ni `docs/UI-CONVENTIONS.md` (les règles) ni `docs/LANDING-BEST-PRACTICES.md` § 9 (la
> grille d'audit de `/`, note /100 + P0-P3), qui restent l'autorité. Les règles citées nomment leur
> test : **c'est le test, pas ce fichier, qui tranche**.
>
> Nom de fichier **sans date** — c'est un référentiel de direction, comme
> `LANDING-SECTION-COLLECTIONS.md` (convention `docs/README.md` § 2).
>
> ⚠️ Ce fichier n'est **pas** sous `test/contract/claude-md-accuracy.contract.test.ts` : ses chemins
> peuvent mourir sans que rien ne le signale. Ils ont été vérifiés un par un le 2026-08-06.
>
> ⚠️ **Ce que l'audit du 2026-08-06 a trouvé, et qu'il faut savoir avant de relire le § 5** : la
> direction « B — Le nuancier » posait la bonne thèse (la couleur reprend le rôle des intertitres
> supprimés) mais la sous-dosait d'un ordre de grandeur. Sa touche de 10 px portait ≈ 42 px² d'encre
> quand la plus petite pièce peinte de la section VOISINE en fait 22 px — et l'audit de l'atelier du
> même soir avait mesuré les quatre accents à 1,58 · 1,60 · 1,91 · 2,58:1, donc
> « **inutilisables pour porter une forme** ». Onze touches de 10 px auraient porté la métrique du
> § 3 (« 0,17 % de la section est dessiné ») à ≈ 0,30 % : le défaut D1 serait resté entier.
>
> ⚠️ **Ce que la reprise du soir a tranché** : le calibre était le SEUL reproche fait à B — sa thèse
> (« la couleur reprend le rôle des intertitres supprimés »), son mécanisme (la rotation d'accents)
> et son coût étaient justes. E a répondu au calibre en changeant de registre (peindre la rangée
> entière au lieu de marquer la question) ; F y répond en gardant le registre et en corrigeant la
> seule taille. C'est F qui est en place. **Ne pas relire le § 5 comme si B avait été écartée sur
> le fond : elle ne l'a jamais été.**

---

## 1. Ce que la section porte

Quatrième et dernière section de `/` : **étal → collections → atelier → FAQ → pied de page**.
Son rôle est la **réassurance** — le dernier obstacle avant l'achat, et la seule surface d'aide du
site depuis l'absorption de `/aide` le 2026-08-05 (redirection 308 vers `/#faq`,
`next.config.ts` ; `ROUTES.SHOP.HELP` vaut `/#faq`).

Elle sert donc **deux publics** avec un seul meuble :

| Public                                                                          | Ce qu'il fait                                     | Ce dont il a besoin                                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Celui qui **hésite** (il vient de `/`)                                          | Il balaie la liste, il ne clique pas forcément    | Voir d'un coup d'œil que ses angoisses (délai, retours, fait main) sont traitées |
| Celui qui **cherche** (il vient de `/#faq`, du pied de page, du panneau mobile) | Il vise une réponse précise, souvent par `Ctrl+F` | Que le texte soit dans le DOM et trouvable — d'où `hiddenUntilFound`             |

Le second est la raison pour laquelle il n'y a **pas** de champ de recherche : `hidden="until-found"`
rend les onze réponses trouvables par le navigateur, et Base UI rouvre le panneau au `beforematch`.
⚠️ Retirer `hiddenUntilFound` remettrait le champ de recherche à l'ordre du jour — c'est le même
arbitrage, pas deux.

---

## 2. État des lieux — mesuré au rendu réel

**Méthode** (à rejouer telle quelle après implémentation, cf. § 9) : serveur dev `:3000` (celui
d'une session voisine — Next 16.3 refuse un second serveur sur le même dossier), base seedée
48 produits, Chromium via `@playwright/test` importé **par chemin absolu**. Captures à
`deviceScaleFactor: 2`, mesures à 1. Contrastes calculés en **peignant la couleur dans un canvas
1×1 puis en relisant le pixel** — `getComputedStyle()` rend l'`oklch()` verbatim, il n'est pas
comparable directement.

⚠️ **Les mesures du § 2.1 ont été prises SANS `reducedMotion: "reduce"`** — l'audit de l'atelier du
même soir a prouvé que toute géométrie mesurée sans lui est fausse (les timelines `view()` laissent
`--enter-y` à 20 px et des `stroke-dashoffset` intermédiaires), et le bloc titre de cette section
est justement en `.enter-inview`. Re-mesurée avec, la section fait **1 038,4 px** à 1280 et non
1 041,7. L'écart est petit ici ; il ne l'est pas partout. Le § 9 le prescrit désormais.

### 2.1 Géométrie (2026-08-06)

| Mesure                                 | 1280 px                       | 390 px         |
| -------------------------------------- | ----------------------------- | -------------- |
| Hauteur totale de la section           | **1 041,7 px**                | **1 231,3 px** |
| Largeur de contenu (`CONTAINER_CLASS`) | 1 088 px                      | 358 px         |
| Colonne des questions                  | 768 px (`max-w-3xl`)          | 358 px         |
| Colonne de droite (≥ `lg`)             | **256 px**                    | — (flux)       |
| Carte « Écris-moi »                    | 256 × **219 px**              | 358 × 194,8 px |
| Vide sous la carte en fin de liste     | **≈ 450 px**                  | —              |
| Hauteur d'une question au repos        | 61 px                         | 57 px          |
| Note ouverte (3ᵉ question)             | 800 × 137 px                  | 382 × 209 px   |
| Rail dessiné sous le `h2`              | 176 × 12 px                   | 128 × 12 px    |
| **SVG dans la section**                | **12** — 11 chevrons + 1 rail | idem           |

### 2.2 Couleurs et contrastes — **aucun défaut**

| Élément                       | Valeur mesurée                                    | Verdict                  |
| ----------------------------- | ------------------------------------------------- | ------------------------ |
| Question au repos sur la page | **19,59:1**                                       | ✅                       |
| Chapô (`muted-foreground`)    | **7,25:1**                                        | ✅                       |
| Réponse sur la note ouverte   | **18,67:1**                                       | ✅                       |
| Fond de la note ouverte       | `#fcf6e7` (`--section-wash-strong`, accent `sun`) | ✅ conforme à la cascade |

Le P1 de l'audit du 2026-08-05 (encre de lien à 1,55:1) **est corrigé** : `ANSWER_LINK_CLASS` est
passée à `--color-brand-rose-strong`. Rien à reprendre côté contraste — **ne pas rouvrir ce sujet**.

### 2.3 Ce que ça donne à l'œil

⚠️ **Ce paragraphe décrit l'état AVANT la refonte** — il est conservé parce qu'il est le diagnostic
qui l'a déclenchée. L'état courant est au § 6.

- **Au repos, la section est grise.** Onze lignes identiques, un chevron à droite, un filet 1 px
  entre chacune. Les seules couleurs permanentes sont le rail soleil (176 × 12 px), le lien
  « écris-moi » et le ruban rose de la carte.
- **La couleur n'existe qu'après un clic** — la note soleil est superbe, mais c'est l'état d'**un
  item sur onze**, et d'aucun tant que le visiteur n'a rien ouvert.
- **Le tiers droit** porte une carte de 219 px de haut puis 450 px de blanc, à côté d'une liste qui
  en fait 670.

---

## 3. Diagnostic — **15/20**

DA 11 · Hiérarchie 16 · UX 15 · Responsive 17 · A11y 18 · Technique 18.
(Jugement, pas mesure — la note /100 de la page entière appartient à
`docs/LANDING-BEST-PRACTICES.md` § 9.)

La section est **techniquement la plus propre des quatre** : Server Component intégral, zéro fetch,
zéro état client, accessible, responsive, testée. Tout l'écart est en **direction artistique**.

| #      | Défaut                                                                                                                                                               | Gravité | Comment le re-vérifier                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| **D1** | **Le repos est gris** — la marque n'apparaît qu'au clic                                                                                                              | P1      | Capture au viewport, sans interaction, aux 3 tailles                            |
| **D2** | **La section ne dessine rien** : 176 × 12 px de rail sur 1 152 × 1 042 = **0,17 %** de sa surface                                                                    | P1      | `document.querySelectorAll('#faq svg')` → 12, dont 11 chevrons d'accordéon      |
| **D3** | **Onze questions au même poids** ; le regroupement thématique est parti le 2026-08-06 et **rien n'a repris son rôle**                                                | P2      | Lecture — les 4 questions « bijoux » et les 3 « livraison » sont indiscernables |
| **D4** | **Le métronome des blocs titre** : 3ᵉ occurrence d'un gabarit strictement identique (filet, `h2` clamp, rail mono, chapô 46ch)                                       | P2      | Diff visuel des 3 `h2` de `/` — seule la couleur d'un trait de 12 px change     |
| **D5** | **Le tiers droit** : 256 × ≈450 px vides sous la carte en fin de liste                                                                                               | P3      | Mesuré § 2.1                                                                    |
| **D6** | **La sortie est l'élément le plus discret de la section** — carte 256 px, bouton `outline`, ruban `bg-primary/45` lu comme une tache à 2×                            | P3      | Capture 1280, colonne droite                                                    |
| **D7** | **Dérive de doc** : le JSDoc de `shared/components/masking-tape.tsx` affirme qu'il ne reste **UN** ruban sur `/` — il y en a **deux** (portrait atelier + carte FAQ) | P3      | `grep -rn "<MaskingTape" app/\(shop\)/\(home\)`                                 |

**État au 2026-08-06, après implémentation d'« E — L'échantillonnier »** (§ 6) :

| Défaut | État         | Par quoi                                                                                                             |
| ------ | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| **D1** | ✅ corrigé   | Les onze rangées portent le lavis de leur famille **au repos** — mesuré 4 encres distinctes à 1280 comme à 390       |
| **D2** | ⏸️ ouvert    | La direction retenue **ne dessine rien de plus** : toujours 12 SVG. Elle peint, elle ne trace pas — cf. « G » au § 5 |
| **D3** | ✅ corrigé   | Les blocs 4 · 3 · 2 · 2 se lisent d'un coup d'œil, sans un mot de titre                                              |
| **D4** | ⏸️ ouvert    | Transverse aux trois `h2` de `/` — hors périmètre d'une section (§ 10)                                               |
| **D5** | ⏸️ assumé    | Les ≈ 450 px de blanc sous la carte. « G » les remplirait ; non retenu (§ 5)                                         |
| **D6** | ⏸️ ouvert    | Le lot 0 (ruban retiré, bouton `default`) n'a **pas** été fait — il est indépendant, cf. § 7                         |
| **D7** | ⏸️ reformulé | Le JSDoc de `masking-tape.tsx` reste faux, mais **pas comme le disait ce document** : voir la note ci-dessous        |

⚠️ **Correction sur D7.** Retirer le ruban de la FAQ ne rendrait **pas** « le code conforme à sa
propre doc », comme l'affirmait la première version de ce fichier. Le JSDoc dit « il reste UN ruban
sur `/` » ; il y a **quatre sites d'appel** dans l'arbre de la home — `atelier-portrait.tsx`,
`faq-section.tsx`, `navbar/menu-sheet-nav-sections.tsx` et `hero/hero-empty-card.tsx`. Deux
rendent au repos sur une base seedée, les deux autres sont conditionnels (panneau fermé, état
vide). C'est le **JSDoc** qui est à reformuler (« un au repos, sur la landing seedée »), pas
seulement un appel à supprimer.

### Ce qui n'est **pas** un défaut — ne pas « corriger »

- Les contrastes (§ 2.2), la hiérarchie `h2 → h3` (11 questions + le titre de la carte = 12 `h3`),
  l'absence de champ de recherche, l'absence de date de mise à jour visible, l'absence de sticky
  mobile (refus documenté : CTA sticky PDP), le fait que le texte de la question **ne bouge pas d'un
  pixel** à l'ouverture (marge négative + padding égaux, `ring` et non `border`).
- Le **retrait des cinq intertitres** (2026-08-06) et le **maintien des questions mono-thème** :
  l'user a tranché « ne pas toucher » le 2026-08-05 puis a fait retirer les groupes le lendemain.
  ⚠️ La direction ci-dessous **ne les rouvre pas** — elle remplace leur rôle par de la couleur.

---

## 4. Ce qui ne bouge pas — invariants

| Invariant                                                            | Pourquoi                                                                                                                               | Verrou                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `id="faq"`                                                           | Cible de la 308 depuis `/aide`, de `ROUTES.SHOP.HELP`, du pied de page                                                                 | `shared/constants/__tests__/legal-urls-coherence.regression.test.ts` (lecture texte brut)        |
| Le `h2` contient « Des questions »                                   | Sélecteur E2E                                                                                                                          | `e2e/legal-pages.spec.ts`                                                                        |
| `FAQPage` = **nœud du `@graph`**, jamais un `<script>` séparé        | Un second script rouvrirait la double `BreadcrumbList` de `/aide`                                                                      | `shared/components/__tests__/catalogue-single-breadcrumb.regression.test.ts` · `e2e/seo.spec.ts` |
| `answerText` reste le décalque de `answer`                           | Google compare le balisage au visible ; un `answerText` qui dérive est une non-conformité muette                                       | JSDoc de `shared/constants/faq-items.tsx` (pas de test — vigilance)                              |
| Hiérarchie `h2` → `h3` (`headingLevel={3}`), zéro `h4`               | Le `h1` appartient à l'étal ; sans les groupes, un `h4` sauterait un cran                                                              | `app/(shop)/(home)/_components/faq/__tests__/faq-section.test.tsx`                               |
| `hiddenUntilFound` sur chaque panneau                                | C'est **lui** qui remplace le champ de recherche (§ 1)                                                                                 | idem (assertion `hidden="until-found"` ×11)                                                      |
| `multiple={false}` — une seule note ouverte                          | « Un seul papier posé à la fois » ; c'est l'intention même de la note                                                                  | idem                                                                                             |
| Un seul `Accordion`, onze `AccordionItem`, ordre de la SSOT          | Le retour de cinq accordéons signerait le retour des groupes                                                                           | idem                                                                                             |
| `data-accent="sun"` **sur la section**                               | La salle « Aide » ; et le fil de l'atelier est rose **parce que** la FAQ est dorée — deux salles dorées à la file n'en feraient qu'une | JSDoc `THREAD_INK` (`atelier-section.tsx`)                                                       |
| Le lavis des rangées vient de `--section-band`, pas d'un autre token | C'est le seul dont les quatre alphas sont **normalisés en ΔE** ; à alpha égal, rose et lavande pèsent d'un facteur 1,7 (§ 6.1)         | `app/styles/__tests__/section-band-contrast.regression.test.ts` · `faq-section.test.tsx`         |
| Tutoiement                                                           | CLAUDE.md § Voix                                                                                                                       | mécanique de `checkout-voice-tutoiement.regression.test.ts`                                      |
| Aucun séparateur entre sections (ni filet, ni bande)                 | Contre-pied de « L'étal continue » (2026-08-06)                                                                                        | —                                                                                                |
| Pas de `MaskingTape` **en série**                                    | Retiré du storefront le 2026-08-05/06 : la répétition saturait la page de rose                                                         | JSDoc `shared/components/masking-tape.tsx`                                                       |
| Pas de bandeau de réassurance à icônes, pas de signature « — Léane » | Refus mémorisés                                                                                                                        | —                                                                                                |
| Server Component, zéro état client                                   | Les accordéons sont le seul JS de la section ; elle tient dans le shell statique                                                       | —                                                                                                |

---

## 5. Les directions

Huit, en deux vagues. Les quatre premières sont celles de la version initiale de ce document
(2026-08-06, matin) ; les quatre suivantes sont issues de son audit (même jour). **B, C, F et H
sont exclusives entre elles** : elles occupent le même emplacement — la marque par question. **E**
occupe la _rangée_, **G** occupe le _tiers droit_ : ces deux-là se composent avec tout le reste.

| Direction                          | Note visée | Verdict                                                                       |
| ---------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| **A — « Le raccommodage »**        | 16/20      | ⏸️ Insuffisante seule — reste disponible en lot 0                             |
| **B — « Le nuancier »**            | 18/20      | ⚠️ **Dépassée** — bonne thèse, calibre d'un ordre de grandeur trop bas        |
| **C — « La pluie de questions »**  | 17/20      | ⚠️ Dessinée, **déconseillée** — voisinage, et il a empiré                     |
| **D — « Une réponse à la fois »**  | 18 ou rien | ❌ Tuée — casse la garantie `Ctrl+F` et ouvre un état client                  |
| **E — « L'échantillonnier »**      | 18/20      | ⚠️ Implémentée puis **remplacée** — lavis jugé trop fort (décision Léane)     |
| **F — « Le nuancier au calibre »** | 17/20      | ✅ **Retenue et implémentée** — B à 20 px, la structure de la liste inchangée |
| **G — « La palette »**             | 18/20      | ⏸️ Recevable en complément d'E — seule réponse à D2 et D5                     |
| **H — « Le surligneur »**          | 14/20      | ❌ N'existe qu'à l'état ouvert, donc ne traite pas D1                         |

### Une contrainte qui gouverne les huit : tout le vocabulaire est déjà dépensé

Le présentoir du premier écran mobilise à lui seul **goutte, goutte étirée, baie, feuille, côtes,
anneau, anneau ovale, créole, monture, cabochon, rosette, volute, chapelle, toit, porte, annexe,
vagues, touche et reflet** (`shared/components/hand-drawn/creations.ts`) ; l'atelier y ajoute son
rail tuilé, ses perles remplies, sa pampille de gouttes, son étincelle, son nœud et son ruban.

**Aucune direction ne peut donc se justifier par la nouveauté de la forme** — il n'en reste pas.
Elles se justifient toutes par le **registre** : l'échelle, la matière, le rôle. C'est exactement
ce qu'a fait l'atelier le 2026-08-06 en reprenant la goutte du hero pour en faire une pampille
remplie. ⚠️ Corollaire : la règle de voisinage ne peut pas être « ce tracé est déjà employé »,
sinon elle interdit tout. Elle est « ce tracé est employé **au même registre, à côté** ».

### A — « Le raccommodage » (sans vocabulaire neuf)

Élargir la colonne des questions, densifier la carte de sortie, remonter les deux questions
bloquantes (délai, retours) dans les cinq premières, retirer le ruban.
**Ce qu'elle ne règle pas : D1 et D2.** Son contenu reste disponible en lot 0 (§ 7), indépendant
de la direction retenue.

### B — « Le nuancier » ⚠️ dépassée par E

**Une phrase** : chaque question porte une touche de peinture (`CREATION_PATHS.dab`, 10 px,
remplie de `var(--section-accent)`), chaque famille de questions a sa couleur, et la note ouverte
prend le lavis de **sa** couleur au lieu du soleil pour tout le monde.

**Sa thèse est juste, et E la reprend intégralement** : la couleur rend son rôle au regroupement
supprimé sans rouvrir la décision ; elle emploie le mécanisme prescrit (la rotation d'accents, pas
un token de plus par couleur) ; elle est la grammaire de la marque (« maximalisme miniature —
répétition, accumulation, série »). Ce qui l'a écartée est son **calibre**, et rien d'autre :

- la touche de 10 px porte ≈ **42 px²** d'encre ; les onze ensemble, ≈ 462 px² — **moins qu'une
  seule perle de l'atelier** (38 px remplis, ≈ 865 px²), à une section de distance ;
- la plus petite pièce peinte de cette même section voisine fait **22 px** (la goutte de la
  pampille). B en proposait 10, soit un rapport d'aire de **1 à 7,6** ;
- les quatre accents valent **1,58 · 1,60 · 1,91 · 2,58:1** sur le fond (mesures de l'audit atelier
  du 2026-08-06). À ce contraste, une forme n'existe que par sa **surface** — c'est précisément la
  conclusion qui a fait passer l'atelier du filet à l'aplat rempli ;
- sur la métrique que ce document a lui-même posée (§ 3, D2), B fait passer la section de
  **0,17 % à ≈ 0,30 %** de surface dessinée. D1 (« le repos est gris ») serait resté entier.

⚠️ Le `dab` est par ailleurs **déjà rendu sur la même page** : quatre touches peintes dans le
cabochon de la bague Nuit étoilée du premier écran (`creations.ts`, `fill: PAINT_SUNNY`). Ce n'est
pas rédhibitoire — c'est un autre registre (peinture en HEX à l'intérieur d'un tableau, contre
accent tokenisé dans une liste) et trois sections de distance — mais **il fallait le dire** : sans
cet argument, la règle de voisinage qui tue C ci-dessous s'appliquerait aussi à B.

### C — « La pluie de questions » ⚠️ dessinée, déconseillée

Le motif serait **la goutte** — « le signe transversal » de la marque : une cascade de gouttes
descendrait le tiers droit à hauteurs inégales (territoire **D — pluie et larmes joyeuses**), et
chaque question porterait sa goutte. Elle règle D1, D2 **et** D5 d'un coup, avec un tracé existant.

**Pourquoi elle est écartée : le voisinage — et il a empiré depuis la première version de ce
document.** La section immédiatement au-dessus se termine par une pampille de quatre gouttes,
désormais **remplies** de leur accent, et la refonte de l'atelier du 2026-08-06 y a ajouté les
**puces-gouttes de « Sur la table »** (`atelier-worktable.tsx`, même `CREATION_PATHS.drop`) ; le
premier écran suspend par ailleurs une grappe et une rivière faites de la même goutte. Une
troisième pluie à la file ne se lirait plus comme un fil conducteur mais comme un tic.
⚠️ Elle redevient recevable **si** la pampille de l'atelier ET ses puces disparaissent — pas avant.

### D — « Une réponse à la fois » ❌ tuée

Plus d'accordéon : à gauche la liste des onze questions, à droite — dans le tiers aujourd'hui vide —
la réponse sélectionnée, en grand, sur son papier. C'est la seule direction qui remplit la colonne
droite **structurellement**, et la plus belle sur maquette.

Trois raisons de ne pas la faire, dans cet ordre :

1. **Elle casse la garantie `Ctrl+F`.** Une seule réponse dans le DOM (ou dix masquées autrement que
   par `hidden="until-found"`), et l'argument qui justifie l'absence de champ de recherche tombe.
2. **Elle ouvre un état client** dans la seule section 100 % statique de la page — pour une
   boutique tenue par une personne, c'est de la surface à maintenir sans contrepartie mesurable.
3. **Elle exige deux implémentations** du même contenu (le mobile retombe forcément sur un
   accordéon), donc deux chemins de rendu pour onze questions.

À ne rouvrir que si un signal réel arrive (analytics montrant que la FAQ est consultée comme une
documentation, pas balayée).

### E — « L'échantillonnier » ⚠️ implémentée, puis remplacée par F

**Une phrase** : ce n'est plus la question qui porte une marque, c'est la **rangée** qui porte le
lavis de sa famille — un aplat brossé depuis la marge et séché avant le chevron.

C'est la thèse de B, exécutée à l'amplitude que la couleur exige. Détail au § 6.

Pourquoi elle gagne :

1. **Elle traite D1 par construction.** La couleur n'attend plus un clic : elle est là à
   l'ouverture de la section, sur les onze rangées, à tous les viewports.
2. **Elle emploie le token dont c'est exactement le rôle**, et qui n'avait été convoqué par
   personne : `--section-band` — « fond d'une BANDE », mélangé vers `--background`, aux quatre
   alphas **normalisés en ΔE** (18 / 11 / 12 / 16 %) précisément parce qu'à alpha égal les accents
   ne pèsent pas pareil. B proposait `--section-wash-strong`, à 18 % **uniformes** : les quatre
   familles n'auraient pas eu le même poids visuel. Mesuré après implémentation : les quatre bandes
   valent **1,07 · 1,08 · 1,08 · 1,10:1** contre le fond de page — l'égalité tient.
3. **Elle ne coûte rien** : zéro SVG (la section reste à 12), zéro token neuf, zéro JS, zéro image.
   Un champ sur `FaqItem`, un `data-accent` sur l'item, une classe de dégradé.
4. **Elle rend son rôle au regroupement supprimé sans le rouvrir** — aucun intertitre, aucun
   regroupement DOM, aucun changement d'ordre.
5. **Elle est la grammaire de la marque** : un échantillonnier, c'est de la répétition, de
   l'accumulation, de la série — « maximalisme miniature », pas une grosse pierre centrale.

⚠️ **Ce qu'elle ne fait pas : dessiner.** Elle peint. D2 (« la section ne dessine rien ») reste
donc ouvert, et c'est la seule chose que G apporterait.

**Pourquoi elle n'est plus en place** : implémentée et vérifiée au rendu le 2026-08-06 (les quatre
bandes à 1,07–1,10 contre le fond, le texte à 17,86–18,33:1 — l'exécution était juste), elle a été
**jugée trop forte**. C'est le risque que ce document nommait lui-même : « onze rangées teintées,
c'est une décision de page, pas de section ». Ce qu'elle a laissé derrière elle et qu'il ne faut pas
défaire : le champ `accent`, le `data-accent` sur l'item, l'anneau dérivé et le retrait permanent —
F les reprend tous.

### F — « Le nuancier, au bon calibre » ✅ retenue et implémentée

B, avec la touche à **20 px** (16 px sous `sm`, pour ne pas manger une colonne de 358 px) au lieu
de 10, et le retrait du panneau réaligné en conséquence (`pl-7`, soit 28 px = touche + `gap-2`).
L'aire d'encre est multipliée par 4, la surface dessinée passe de 0,30 à **0,78 %**, et D2 est
partiellement traité.

C'est la **correction minimale** : elle ne change rien à la structure de la liste, et la rangée
redevient nue au repos. Détail au § 6.

### G — « La palette » ⏸️ recevable en complément d'E

Un objet dessiné dans le tiers droit, sous la carte : une palette de peintre — un
`CREATION_PATHS.cabochon` agrandi et retourné, dont le JSDoc dit littéralement « le cadre du
tableau miniature » — percée de son trou de pouce et chargée des onze touches, dans les quatre
encres.

Elle règle **D2** (rien n'est dessiné), **D5** (les ≈ 450 px vides) et **D6** (la sortie trop
discrète) d'un seul objet, et elle **referme le motif** : la palette est l'endroit d'où viennent
les couleurs de la liste. ≈ 3,0 % de surface dessinée, un fichier, sous `lg` elle passe sous la
carte.

⚠️ Son risque : c'est un quatrième objet illustré sur une page qui en porte déjà trois (le
présentoir, le fil de l'atelier, les tirages des collections), et le § 6.7 de la première version
de ce document avait **assumé** le tiers vide. À ne faire que sur décision explicite.

### H — « Le surligneur de famille » ❌

La question ouverte reçoit un trait de surligneur à l'encre de sa famille (`UNDERLINE_PATHS`,
`HandDrawnUnderline`) : le vocabulaire du site, zéro invention, le geste le plus « fait main »
disponible.

Écartée pour deux raisons : elle **n'existe qu'à l'état ouvert**, donc elle laisse D1 — le défaut
n°1 — intact ; et elle entre en collision avec le correctif transverse du métronome des trois `h2`
(§ 10), qui prévoit justement de surligner un mot par titre. À ne rouvrir que si ce chantier-là est
abandonné.

---

## 6. « Le nuancier, au bon calibre » — la direction en détail

### 6.1 La touche

- `CREATION_PATHS.dab` — le point de pinceau rond et bancal de la SSOT des tracés — en tête de
  chaque question, **rempli** de `var(--section-accent)` (attribut SVG, pas d'utilitaire : la
  variable est re-dérivée par le `data-accent` de l'item, aucune couleur n'est écrite au call site).
- **20 px, 16 px sous `sm`.** C'est LE point sur lequel B avait été écartée, et le seul :
  à 10 px la touche porte ≈ 42 px² d'encre, les onze ≈ 462 — moins qu'**une** perle du fil de
  l'atelier (≈ 865 px²), à une section de distance. Les quatre accents valent 1,54 à 2,51:1 sur le
  fond (re-mesuré au rendu, § 9) : à ce contraste une forme n'existe que par sa **surface**, et le
  plancher du voisin est **22 px**. Sous `sm` la colonne ne fait que 358 px — 20 px d'indentation y
  mangeraient la mesure du texte.
- `fill`, jamais `stroke` : **l'accent PEINT, l'encre TRACE**. Rendue sans contour, conformément au
  JSDoc du tracé (qui justifie cette absence à 3 px, donc a fortiori à 20).
- La touche et la question forment **un bloc** (`<span className="flex min-w-0 items-start gap-2">`),
  sinon le `gap-4` + `justify-between` du trigger les sépareraient d'un bout à l'autre de la rangée.
  `items-start` + `mt-1` : sur une question qui court sur deux lignes (le cas courant à 390 px), une
  marque centrée verticalement flotterait entre les deux — elle se pose sur la **première** ligne.
  Les 4 px valent pour les deux crans de texte : (24 − 16) / 2 sous `sm`, (28 − 20) / 2 au-dessus.
- `contrast-more:hidden forced-colors:hidden` : en contraste forcé l'ornement s'efface et l'encre du
  texte suffit — la touche ne porte aucune information indispensable (WCAG 1.4.1).
- **Le retrait de l'item reste permanent** (`-mx-3 px-3 sm:-mx-4 sm:px-4`), hérité d'E : au repos il
  ne se voit pas (il n'y a plus rien à peindre), mais l'invariant « le texte de la question ne bouge
  pas d'un pixel à l'ouverture » reste **structurel** au lieu de redevenir une arithmétique (marge
  négative + padding égaux) à maintenir. Vérifié au rendu : le trigger est à x = 96 px à 1280 et
  x = 16 px à 390, **avant comme après** ouverture.
- **La réponse s'aligne sur le TEXTE, pas sur la touche** : `px-0` neutralise le `px-3` par défaut
  du panneau, `pl-6 sm:pl-7` reprend exactement touche + `gap-2` (16 + 8 = 24 px, 20 + 8 = 28 px).
  Mesuré : `padding-left` 28 px à 1280, 24 px à 390, et le texte de la question à x = 124 / 40.

### 6.2 Les familles — la couleur remplace les intertitres

Onze questions, quatre encres, dans **l'ordre de la gamme** rose → lavande → menthe → soleil
(`app/styles/section-accents.css` : « la page traverse le dégradé du hero »). La section rejoue donc
la gamme de la page entière et **atterrit sur sa propre couleur**.

| #   | Question (SSOT `shared/constants/faq-items.tsx`)             | Famille               | `accent`   |
| --- | ------------------------------------------------------------ | --------------------- | ---------- |
| 1   | Les bijoux sont-ils vraiment faits main ?                    | Les bijoux            | `rose`     |
| 2   | Comment entretenir mes bijoux faits main ?                   | Les bijoux            | `rose`     |
| 3   | Pourquoi y a-t-il si peu d'exemplaires de chaque pièce ?     | Les bijoux            | `rose`     |
| 4   | Comment choisir la bonne taille (bague, bracelet, collier) ? | Les bijoux            | `rose`     |
| 5   | Quel est le délai de livraison en France ?                   | Livraison             | `lavender` |
| 6   | La livraison est-elle possible partout ?                     | Livraison             | `lavender` |
| 7   | Que faire si mon colis n'arrive pas ?                        | Livraison             | `lavender` |
| 8   | Comment fonctionnent les retours ?                           | Retours et annulation | `mint`     |
| 9   | Comment annuler ma commande ?                                | Retours et annulation | `mint`     |
| 10  | Puis-je personnaliser une création ?                         | Commander             | `sun`      |
| 11  | Mon code promo ne fonctionne pas, pourquoi ?                 | Commander             | `sun`      |

4 · 3 · 2 · 2 — les blocs décroissent, ce qui **se lit** comme un nuancier plutôt que comme une
alternance. Les deux dernières familles d'origine (« Personnalisation » et « Commandes », une
question chacune) fusionnent en une seule encre : c'est la fusion que l'ancienne grille de cinq
intertitres ne pouvait pas faire sans mentir sur ses propres titres.

**Mise en œuvre** : un champ `accent` (union locale à `faq-items.tsx`) sur `FaqItem`, rendu en `data-accent` sur
l'`AccordionItem`. ⚠️ **Ce n'est pas la résurrection du champ `section`** supprimé le 2026-08-06 :
aucun intertitre, aucun regroupement DOM, aucun changement d'ordre — la liste reste une liste unique
dans l'ordre de la SSOT. La table ci-dessus est verrouillée par `faq-section.test.tsx` : déplacer
une question sans reprendre son `accent` casserait les blocs sans qu'aucun autre test ne le voie.

### 6.3 La note prend le papier de sa famille

`--section-wash-strong` et `--section-accent` sont re-dérivés par **tout** ancêtre portant
`data-accent`. Poser l'accent sur l'item suffit donc : la note ouverte prend le papier de sa
famille, et l'anneau passe de `ring-brand-sun/40` à **`ring-(--section-accent)/40`** — sans quoi une
note menthe porterait un anneau doré. Vérifié au rendu : Tailwind 4.3.3 émet
`color-mix(in oklab, …, transparent)` pour l'alpha sur variable, et l'anneau rend bien
`oklab(… / 0.4) 0 0 0 1px`.

⚠️ **`--section-wash-strong`, jamais `--section-band`, pour le papier.** Les deux existent et ne
sont pas interchangeables : `--section-band` est mélangé vers `--background` et **normalisé en ΔE**
accent par accent (18 / 11 / 12 / 16 %) parce qu'à alpha égal les quatre accents ne pèsent pas
pareil ; `--section-wash-strong` est à 18 % uniformes, mélangé vers `--card`. Le premier est le
token d'une **bande posée sur la page** — c'est celui d'E, et il n'a plus rien à peindre ici ; le
second est celui du **papier**.

Le fond de la note est donc une simple couleur (`data-open:bg-(--section-wash-strong)`). ⚠️ Le
piège qui imposait à E deux dégradés — un `background-image` se peint PAR-DESSUS le
`background-color`, donc éteindre le lavis du repos en `bg-none` à l'ouverture laissait la rangée
**nue pendant les 200 ms** de fondu — n'a plus d'objet : le repos ne porte plus de fond du tout.
Il reste vrai, et à ressortir au premier retour d'un fond au repos.

⚠️ La couleur d'une famille ne doit **rien** signifier d'obligatoire (WCAG 1.4.1) : l'état ouvert
reste porté par le chevron pivoté et la présence du panneau. Elle **rappelle** une famille, elle
n'encode aucune information indispensable — et le pastel de marque n'écrit jamais de glyphe.

Contrastes mesurés, les quatre accents contre le fond de page : **1,55 (rose) · 2,51 (lavande) ·
1,85 (menthe) · 1,54 (soleil)**. C'est exactement pourquoi la touche est calibrée à 20 px et non à
10 : à ces valeurs, la surface est le seul levier.

### 6.4 La salle reste dorée

`data-accent="sun"` **ne bouge pas** sur la `<section>` : le `h2`, le rail et la carte de sortie
gardent le soleil. C'est la couleur de la salle (héritée de l'entrée « Aide » du méga-menu), et
c'est aussi ce qui justifie le rose du fil de l'atelier juste au-dessus. La rotation joue **à
l'intérieur** de la salle, exactement comme les quatre étapes du fil jouent à l'intérieur d'une
section rose.

### 6.5 L'entrée — rien à animer

Les onze touches sont **statiques**, et c'est un choix, pas une contrainte : `dab` est une forme
**pleine**, et la famille `hand-draw-*` **sait** l'animer — `entrance.css` interpole
`fill-opacity: var(--hand-fill-opacity, 0)`, c'est ce dont vivent les perles remplies de l'atelier
(la première version de ce document affirmait le contraire). Mais **sous une timeline `view()` le
stagger `--hand-delay` est ignoré** : les onze arriveraient ensemble, ce qui ne se lit pas comme un
geste. Le rail du titre garde son `inView` et reste le seul geste d'arrivée de la section.

⚠️ La bonne raison de ne pas y revenir n'est donc pas « on ne sait pas animer un `fill` » — c'est le
stagger. Si un jour le stagger devient possible sous `view()`, la question se rouvre.

### 6.6 Responsive

- **< `lg`** : colonne unique, carte après les onze questions — inchangé. La touche descend à 16 px
  (§ 6.1), et le lien « écris-moi » du chapô continue d'offrir la sortie dès l'entrée de section.
- **≥ `lg`** : grille inchangée (`minmax(0,48rem)` + `minmax(0,1fr)`, gap 16). D5 n'est **pas**
  traité : le bas de la colonne droite reste du blanc — assumé, sauf décision sur G (§ 5).
- Reflow : cible **320 px** (le 400 px est le zoom), aucun palier entre 320 et 375.

### 6.7 Ce que la direction **ne** fait pas

- Elle ne rouvre ni les intertitres, ni l'ordre des questions (§ 10), ni le champ de recherche.
- Elle ne touche pas au `h2`, ni à l'`id`, ni au JSON-LD.
- Elle n'ajoute **aucun** token CSS. Elle ajoute en revanche **onze SVG** (un par touche) : la
  section passe de 12 à **23** tracés — 11 chevrons + 1 rail + 11 touches. Aucun n'est un fichier
  ni une image : le `d` vient de la SSOT `CREATION_PATHS`, déjà dans le bundle de la page.

---

## 7. Les lots

| Lot    | Contenu                                                                                                        | Fichiers                                                           | État                       |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- |
| **0**  | Raccommodage indépendant : ruban retiré, bouton de la carte en `default`, JSDoc `masking-tape.tsx` reformulé   | `faq-section.tsx`, `shared/components/masking-tape.tsx`            | ⏸️ **non fait** (D6, D7)   |
| **1**  | `accent` sur `FaqItem` + les onze valeurs                                                                      | `shared/constants/faq-items.tsx`                                   | ✅ fait                    |
| **2**  | `data-accent` sur l'item + anneau dérivé + papier de famille + retrait permanent                               | `faq-section.tsx`                                                  | ✅ fait                    |
| **2b** | La touche `FamilyDab` à 20/16 px + le retrait du panneau réaligné (`pl-6 sm:pl-7`) — **remplace le lavis d'E** | `faq-section.tsx`                                                  | ✅ fait                    |
| **3**  | Tests : la table des familles, la touche au repos, son calibre, l'anneau, l'alignement de la réponse           | `app/(shop)/(home)/_components/faq/__tests__/faq-section.test.tsx` | ✅ fait (14 tests, verts)  |
| **4**  | Ré-audit au rendu réel                                                                                         | —                                                                  | ✅ fait (§ 9, 1280 et 390) |
| **5**  | Ancrer le document : `CONTRACTED_DOCS` + renvoi depuis `CLAUDE.md`                                             | `test/contract/claude-md-accuracy.contract.test.ts`, `CLAUDE.md`   | ⏸️ **non fait**            |

Les lots 1 à 3 tiennent dans **deux fichiers de code + une SSOT + une suite de tests** et ne
touchent aucun composant partagé — la refonte n'a pas eu de rayon de souffle hors de la landing.

---

## 8. Écarté — ne pas re-proposer sans signal neuf

| Idée                                           | Pourquoi non                                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Champ de recherche dans la FAQ                 | Onze questions déjà dans le DOM + `hiddenUntilFound` ; concurrence avec la recherche produits de la barre |
| Retour des cinq intertitres thématiques        | Retirés le 2026-08-06 ; ils pesaient plus lourd que les questions                                         |
| Date de dernière mise à jour visible           | Bruit sur une landing ; `dateModified` reste dans le JSON-LD                                              |
| Sommaire sticky des questions (« C » du 08-05) | Outillage de documentation surdimensionné à onze items                                                    |
| Direction « La permanence » (08-05)            | Rejoue l'arbitrage de voix du même jour ; sa moitié viable est déjà dans la carte                         |
| Bandeau de réassurance à icônes                | Refus mémorisé (2026-05)                                                                                  |
| Signature « — Léane » dans la section          | Le storefront ne signe plus nulle part depuis le 2026-08-06                                               |
| `MaskingTape` par item                         | Retiré du storefront ; la répétition saturait la page de rose                                             |
| Séparateur (filet ou bande) en tête de section | Contre-pied de « L'étal continue »                                                                        |
| Sticky mobile                                  | Refus documenté (CTA sticky PDP)                                                                          |
| CTA peint au pinceau                           | Refus mémorisé (hero, 2026-08-06)                                                                         |
| Une marque de 10 px à l'encre d'accent         | 1,58–2,58:1 : à ce contraste une forme n'existe que par sa SURFACE. Plancher du voisin : 22 px (§ 5, B)   |
| Le lavis de famille sur les onze rangées (E)   | **Essayé, implémenté, retiré le 2026-08-06** — jugé trop fort. C'est une décision de page, pas de section |
| `--section-wash-strong` pour une rangée        | 18 % **uniformes** — les quatre familles n'y pèsent pas pareil. C'est le token du papier, pas de la page  |
| Éteindre le lavis en `bg-none` à l'ouverture   | Laisse la rangée nue pendant les 200 ms de fondu (§ 6.3)                                                  |

---

## 9. Vérifier après implémentation

1. **Rendu réel, pas jsdom**, et **`reducedMotion: "reduce"` sur le contexte**. Rejouer la méthode
   du § 2 aux trois tailles (390 / 768 / 1280), au **viewport** et non en `fullPage` — une capture
   pleine page d'une section en `.enter-inview` revient à `opacity: 0` et fait diagnostiquer un
   vide qui n'existe pas.
   ⚠️ Sans `reducedMotion`, toute géométrie est fausse : les timelines `view()` laissent `--enter-y`
   à 20 px (leçon de l'audit atelier du 2026-08-06, qui mesurait 63,6 px là où le layout en fait
   47,5).
   ⚠️ La bannière de cookies monte tard en dev (~5-8 s) : l'attendre puis cliquer « Refuser » avant
   de capturer, sinon elle s'incruste (elle a masqué le bas de la liste sur les captures de ce
   document — et un `localStorage.setItem("cookie-consent", …)` en `addInitScript` **ne suffit
   pas** : la forme persistée du store ne se devine pas, la vérifier avant de s'y fier).
2. **Re-mesurer** : nombre de SVG dans `#faq` (attendu **23** — 11 chevrons + 1 rail + 11 touches),
   hauteur de section (**1 038,4 px** à 1280, **1 255,3 px** à 390 au 2026-08-06), taille rendue de
   la touche (**20 × 20** ≥ `sm`, **16 × 16** en dessous) et `padding-left` du panneau ouvert
   (**28 px** / **24 px**, soit touche + `gap-2`). Contraste des quatre accents contre le fond,
   peint en canvas 1×1 (`getComputedStyle()` rend l'`oklch()` verbatim) : **1,55 · 2,51 · 1,85 ·
   1,54:1** — c'est ce qui justifie le calibre, pas une préférence.
   ⚠️ Vérifier aussi que le trigger a le **même x avant et après ouverture** (96 px à 1280, 16 px à 390) : c'est l'invariant « le texte ne bouge pas d'un pixel », rendu structurel par le retrait
   permanent.
3. **Tests** : la suite `faq-section.test.tsx` (**14** tests) doit être étendue **dans le même
   commit** que toute reprise. ⚠️ RTL ne nettoie pas tout seul (`afterEach(cleanup)` est déjà là),
   et un panneau fermé est `hidden` → interroger le DOM
   (`querySelectorAll('[data-slot="accordion-content"] a')`), pas les rôles.
4. **`pnpm validate`** ⚠️ peut échouer sur des fichiers de sessions voisines : ne lire que les
   fichiers touchés. Le rouge de `footer.tsx` (`PREPARATION_DELAY_LABEL`) constaté en journée le
   2026-08-06 a été résorbé par la session voisine — `pnpm typecheck` est vert au moment de F.
5. **E2E** : `#faq` et le `h2` sont inchangés, donc `e2e/seo.spec.ts` et `e2e/legal-pages.spec.ts`
   restent verts sans intervention.

---

## 10. À trancher séparément (hors de cette refonte)

- **L'ordre éditorial des onze questions.** Les deux vraies questions bloquantes avant achat — le
  délai (5ᵉ) et les retours (8ᵉ) — sont sous la ligne de flottaison de la section, tandis que les
  quatre premières parlent des bijoux. Ce n'est pas un défaut d'UI mais un arbitrage éditorial : il
  change l'ordre de `mainEntity` dans le JSON-LD et appartient à Léane. **La direction ci-dessus
  fonctionne à l'identique quel que soit l'ordre retenu** — seule la table du § 6.2 serait à
  réécrire.
- **Le métronome des trois blocs titre (D4).** Le correctif proposé par l'audit de la landing
  entière (2026-08-06) est transverse — surligner un mot de chaque `h2` au pinceau mono et retirer
  les rails — donc il ne se décide pas dans une seule section. Tant qu'il n'est pas tranché, le rail
  soleil de la FAQ reste tel quel.
- **Les photos.** Aucune n'est nécessaire ici : la FAQ est la seule section de `/` qui n'attend
  aucun visuel. C'est aussi pourquoi elle peut absorber tout le motif dessiné sans budget d'image.
