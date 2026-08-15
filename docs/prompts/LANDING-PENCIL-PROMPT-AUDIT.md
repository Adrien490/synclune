# Audit — `LANDING-PENCIL-PROMPT.md`

> Note initiale : **9,5 / 20**. Excellent brief de marque, mauvais prompt Pencil.
> Le défaut tenait en une phrase : le document parlait de **Synclune** et jamais de **Pencil**.
>
> 🔁 **Second audit, 2026-08-15 (séquence complète, cible `claude-fable-5`) : 14,5 → 19,5/20.**
> Sept écarts corrigés — l'import navigateur absent, la continuité entre tours inexistante, la
> conduite non écrite, quatre points de dérive factuelle contre `prisma/seed.ts`, une case de
> checklist invérifiable, une contradiction dans le tour 1, et le budget d'attention répété trois
> fois. Détail dans la conversation ; l'état courant est le dossier `landing/`.
>
> ✅ **Plan exécuté le 2026-08-15.** Le monolithe est remplacé par la séquence de
> `docs/prompts/landing/` (point d'entrée : `LANDING-PENCIL-PROMPT.md`), enrichie du croisement avec
> `docs/LANDING-BEST-PRACTICES.md`. Les six territoires ont été retirés à la demande de Léane, et la
> palette d'interface ramenée à **rose (primary) + doré (secondary)**. Ce document reste la trace du
> raisonnement — il n'est plus la description de l'état courant.

---

## 1. Ce que dit la recherche

Sources : [docs.pencil.dev — AI integration](https://docs.pencil.dev/getting-started/ai-integration),
[docs.pencil.dev — pen CLI](https://docs.pencil.dev/for-developers/pen-cli),
[Prompt Gallery pen.dev](https://www.pen.dev/prompts),
[Better Stack — Pencil, agent-driven design](https://betterstack.com/community/guides/ai/pencil-ai/),
plus les instructions du serveur MCP `pencil` lui-même.

Huit constats qui gouvernent la note :

1. **Le schéma d'abord.** Le serveur MCP l'impose noir sur blanc : `get_app_state({ include_schema:
true, include_canvas_design: true, include_scripts_and_shaders: false })` est un **préalable à
   tout autre appel**. Un prompt qui ne le déclenche pas fait démarrer l'agent à l'aveugle.
2. **Pencil embarque ses propres guides.** `get_guidelines({ category: "guide", name: "Landing
Page" })` existe, ainsi que des **styles** (archétypes visuels paramétrables) et des **UI kits**
   (Shadcn UI, Lunaris, Halo, Nitro). Instructions écrites par l'éditeur, pour cette tâche exacte.
   Les ignorer, c'est réécrire moins bien ce qui est déjà fourni.
3. **Les prompts de référence sont COURTS.** Le Prompt Gallery officiel tient en une phrase :
   « Design a website for a specialty cafe in Haight Ashbury, San Francisco. » Le format natif est
   **conversationnel et itératif**, pas le cahier des charges.
4. **L'itération est la méthode documentée** : large → structure → détails → polish. Et l'un des
   trois anti-patterns explicitement listés est **« plusieurs demandes non liées dans un seul
   prompt »**.
5. **On cible une frame par son NOM** : « Design a dashboard in the 'Step 3 Frame' ». Le nommage
   est l'adressage.
6. **On référence le système, on ne le redécrit pas** : « Use our existing button component »,
   « Follow the spacing scale from our variables ». Les variables et composants se posent **une
   fois**, puis on y renvoie.
7. **La vérification fait partie de la boucle** : relire le canvas, l'arbre de calques, demander un
   `get_screenshot` sur les mises en page complexes. Troisième anti-pattern : ne pas vérifier.
8. **Le CLI est le vrai plan d'exécution** : `pen --out design.pen --prompt "…"`, modèle par défaut
   `claude-opus-4-6`, et `pen --tasks batch.json` pour enchaîner des tâches séquentielles — chacune
   avec son `in`, son `out`, son `prompt`. Une séquence de sections se scripte.

⚠️ Le nom exact du guide « Landing Page » vient de l'exemple de la doc CLI, **pas** d'un
`get_guidelines()` exécuté sur cette installation (le MCP ne répond pas : `failed to connect to
running Pencil app: desktop`). À confirmer une fois l'app lancée.

---

## 2. La grille et la note

| #   | Critère                                | Poids | Note    | Pourquoi                                                                                     |
| --- | -------------------------------------- | ----- | ------- | -------------------------------------------------------------------------------------------- |
| 1   | Cadrage de la tâche et du livrable     | 2     | 1,5     | Clair, mais « un design .pen complet » n'est pas un état vérifiable                          |
| 2   | **Intégration au protocole Pencil**    | 3     | 0       | Zéro mention de `get_app_state`, `get_guidelines`, styles, UI kits                           |
| 3   | **Décomposition et itération**         | 3     | 0,5     | 6 sections × 2 viewports + 3 composants en un seul tour = l'anti-pattern nº 2                |
| 4   | Système de design exécutable           | 3     | 1,5     | Couleurs et polices exactes ✓ — mais **ni échelle typo, ni échelle d'espacement, ni grille** |
| 5   | Contenu et matière réelle              | 2     | 2       | Copie verbatim, 3 collections, 7 types, 7 questions, nombre de cartes : rien à inventer      |
| 6   | Univers de marque et garde-fous        | 2     | 2       | Six territoires, motif transversal, interdits motivés, règle du pastel : c'est le point fort |
| 7   | **Stratégie d'images**                 | 2     | 0,5     | Interdit la banque d'images sans dire par quoi la remplacer — l'agent n'a aucune photo       |
| 8   | Vérification et critères d'acceptation | 2     | 0,5     | 7 garde-fous chiffrés, mais aucune boucle de contrôle ni `get_screenshot`                    |
| 9   | Économie du prompt                     | 1     | 0,5     | ~300 lignes, redites entre § 2, § 3 et § 5 ; le signal se dilue                              |
| 10  | Portabilité / exécution CLI            | 1     | 0,5     | Pas d'`--in`/`--out`, pas de frames nommées, pas de séquence rejouable                       |
|     | **Total**                              | 20    | **9,5** |                                                                                              |

**Lecture** : les points 5 et 6 (le contenu et la marque) sont pleins — c'est le travail difficile,
il est fait. Les points 2, 3, 7 et 10 sont à zéro ou presque, et ce sont **exactement** ceux qui
transforment un brief en prompt outil. On perd 10,5 points sur de la mécanique, pas sur du fond.

---

## 3. Les huit écarts, par rendement

### É1 — Le prompt ne fait pas charger à l'agent ce que Pencil lui offre `(+3)`

Rien ne déclenche `get_app_state` (obligatoire), rien ne renvoie au guide **Landing Page**, rien ne
mentionne les **styles** ni les **UI kits**. L'agent improvise une méthode là où l'éditeur en fournit
une.

**Correctif** — un préambule de six lignes en tête du prompt :

```
Avant de dessiner :
1. get_app_state({ include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false })
2. get_guidelines() puis charge le guide "Landing Page"
3. Liste-moi les styles et UI kits disponibles, et dis-moi lequel est le plus proche
   de l'univers décrit plus bas — on partira de là plutôt que de zéro.
N'écris aucun nœud avant d'avoir fait ces trois appels.
```

### É2 — Tout est demandé en un seul tour `(+3)`

6 sections × 2 viewports + 3 composants + une navigation + un pied de page. C'est l'anti-pattern
documenté, et le mode d'échec est connu : la section 1 est soignée, la section 6 est bâclée.

**Correctif** : découper en **8 tours** (bootstrap, puis une section par tour), chacun tenant en
20-40 lignes parce qu'il s'appuie sur ce qui existe déjà dans le fichier.

### É3 — Aucune frame n'est nommée `(+1,5 sur É2/É10)`

« Deux frames par section » ne donne à l'agent aucune adresse. Or on cible une frame par son nom.

**Correctif** : imposer la nomenclature au tour de bootstrap —
`01-hero/desktop`, `01-hero/mobile`, `02-creations/desktop`, … `06-faq/mobile`, plus
`00-systeme/styles` et `00-systeme/composants`. Chaque tour suivant s'ouvre par « Travaille dans la
frame `03-collections/desktop` ».

### É4 — Le système de design est décrit, pas construit `(+1,5)`

Les hex et les polices sont justes, mais trois choses manquent et l'agent va donc les inventer —
différemment à chaque section :

- **échelle typographique** : rien entre « display 300 » et « corps 17px » ; aucun h2, h3, small, label
- **échelle d'espacement** : aucune. Pencil sait suivre « the spacing scale from our variables » — encore faut-il qu'elle existe
- **grille** : aucune colonne, aucune gouttière, aucune marge, aucun breakpoint intermédiaire

**Correctif** — à poser au bootstrap, en variables nommées :

```
Espacement (base 4) : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128
Grille   : desktop 1440 → 12 colonnes, gouttière 24, marge 64, contenu max 1152
           mobile   390 → 4 colonnes,  gouttière 16, marge 20
Typo     : display/h1 clamp(40→64)/300/-0.02em/1.02
           display/h2 32→40/300/-0.015em/1.1
           display/h3 24/300/1.2
           sans/body 17/400/1.65 · sans/small 15/400/1.5
           sans/label 13/500/0.09em/uppercase
Breakpoints : 390 · 768 · 1024 · 1440
```

Et la consigne qui va avec : **« toute valeur d'espacement ou de typo vient de ces variables ;
aucune valeur libre »**.

### É5 — Les images n'ont aucune stratégie `(+2)`

Le prompt interdit la banque d'images — à raison, `docs/BRAND-DA.md` en fait l'erreur de brief la
plus coûteuse du projet. Mais l'agent **n'a aucune photo de Léane**. Interdire sans substituer, c'est
garantir soit du stock, soit un rectangle gris.

**Correctif** — nommer le remplaçant, et en faire un atout :

```
Tu n'as pas les photos de Léane. Chaque emplacement photo est un PLACEHOLDER assumé :
un aplat d'une couleur d'accent + un tracé au trait 1,5 du motif de la section,
au ratio final exact, et le calque nommé `photo/<sujet>` (ex. photo/creation-01,
photo/portrait-leane, photo/atelier-etabli).
Le décor DESSINÉ, lui, n'est pas un placeholder : il est final.
Ne génère ni ne référence aucune image de banque.
```

Bénéfice secondaire : les calques `photo/*` deviennent la checklist de shooting de Léane.

### É6 — Pas de boucle de vérification `(+1,5)`

Les 7 garde-fous chiffrés (budget mobile 390×844, 44 px, 200 % de zoom, 4,5:1) sont bons mais
personne ne les vérifie. `get_screenshot` existe.

**Correctif** — clore chaque tour par :

```
Termine par get_screenshot des deux frames, puis vérifie et rapporte :
- [ ] aucun texte sur un pastel
- [ ] contraste ≥ 4,5:1 pour tout texte
- [ ] cibles tactiles ≥ 44×44
- [ ] mobile 390×844 : le contenu clé tient dans le budget annoncé
- [ ] espacement et typo issus des variables uniquement
Si un point échoue, corrige avant de me rendre la main.
```

### É7 — 300 lignes qui se répètent `(+1)`

L'univers est dit trois fois : § 2 (territoires), § 3 (interdits), § 5 (rappels par section). Sur un
outil dont les prompts de référence tiennent en une phrase, la redondance ne renforce pas — elle
dilue.

**Correctif** : un `synclune-univers.md` de ~60 lignes, chargé **une fois** au bootstrap, puis
référencé (« respecte l'univers déjà chargé ») dans les tours suivants.

### É8 — Rien n'est rejouable `(+1)`

Pas d'`--in`/`--out`, pas de séquence, pas de modèle. Or `pen --tasks batch.json` enchaîne
exactement ce genre de série.

**Correctif** : un `landing.tasks.json` de 8 tâches séquentielles, chacune reprenant le `.pen`
produit par la précédente.

---

## 4. Le plan pour 20/20

### Étape 0 — Débloquer le MCP `(prérequis)`

L'app Pencil desktop doit tourner : le serveur répond `failed to connect to running Pencil app`.
Tant qu'il est muet, impossible de lire `get_guidelines()` — donc impossible de savoir quel guide
et quels styles existent réellement, ce qui conditionne les étapes 1 et 2.

À faire dès que c'est lancé :

```
get_app_state({ include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false })
get_guidelines()
get_guidelines({ category: "guide", name: "Landing Page" })
```

### Étape 1 — Éclater le document en quatre fichiers `(É7, É1)`

```
docs/prompts/
├── synclune-univers.md          ~60 l. — les 6 territoires, la goutte, les interdits, le ton
├── synclune-systeme.md          ~50 l. — couleurs, typo, espacement, grille, composants, images
├── landing/
│   ├── 00-bootstrap.md          le tour qui crée styles + composants + frames vides
│   ├── 01-hero.md
│   ├── 02-creations.md
│   ├── 03-collections.md
│   ├── 04-types.md
│   ├── 05-atelier.md
│   └── 06-faq.md
└── landing.tasks.json           la séquence rejouable
```

Chaque fichier de section : le nom des deux frames, l'intention en 3 lignes, la matière (copie et
données réelles), les composants à réutiliser, la checklist de sortie. 20-40 lignes, pas plus.

### Étape 2 — Écrire le tour de bootstrap `(É1, É3, É4)`

C'est le tour le plus important, et il ne dessine aucune section. Il doit :

1. faire les 3 appels de découverte (É1),
2. créer les **variables nommées** : 8 couleurs, 10 pas d'espacement, 6 styles de texte, la grille,
3. créer les **composants** avec leurs variants — `bouton` (3 × 4 états), `carte-produit`
   (4 états), `carte-collection` (2 états, dont **sans visuel** : une collection vide est un cas
   normal, elle n'a pas d'image propre et emprunte 2 à 4 visuels à ses produits),
4. créer les **14 frames vides** nommées, aux bonnes dimensions,
5. rendre la main avec une capture de `00-systeme/styles`.

### Étape 3 — Un tour par section, dans l'ordre `(É2)`

Chacun s'ouvre pareil : « Travaille dans `0X-…/desktop` et `0X-…/mobile`. Utilise les composants et
les variables déjà présents dans le fichier. » Et se ferme sur la checklist de l'É6.

Ordre imposé par le risque : **hero d'abord** (~100 % de l'audience, le plus coûteux à refaire),
FAQ en dernier.

### Étape 4 — Verrouiller la boucle de vérification `(É6)`

La checklist devient un bloc réutilisé tel quel dans les 7 tours. C'est ce qui fait la différence
entre « l'agent a dessiné » et « le design tient les contraintes ».

### Étape 5 — Scripter la séquence `(É8)`

```json
[
	{ "out": "landing.pen", "prompt": "@docs/prompts/landing/00-bootstrap.md" },
	{ "in": "landing.pen", "out": "landing.pen", "prompt": "@docs/prompts/landing/01-hero.md" }
]
```

Modèle : `claude-opus-4-6` (le défaut) sur le bootstrap et le hero ; `claude-sonnet-4-6` suffit
probablement sur les sections 4 et 6, qui sont les plus mécaniques.

### Étape 6 — Ce qui reste à trancher avec Léane

Ces deux points ne sont pas des défauts de prompt, mais ils changent le design et il vaut mieux les
fermer avant de dessiner :

- **Les collections** : le prompt en liste trois (celles du seed lean). La boutique Etsy en a neuf
  (Grands raisins, Mini raisins, Tableaux, Enfance, Pluie, Nuit étoilée, Nénuphar, Arc-en-ciel,
  Personnalisation). Trois cartes et neuf cartes ne se composent pas pareil.
- **Les photos** : la liste des calques `photo/*` produite à l'étape 3 est la liste de ce qu'il
  faudra shooter. Autant qu'elle soit réaliste avant de la figer.

---

## 5. Ce que devient la note

| Étape                             | Écarts couverts | Gain | Cumul   |
| --------------------------------- | --------------- | ---- | ------- |
| Départ                            | —               | —    | **9,5** |
| 2 — bootstrap + découverte Pencil | É1, É3, É4      | +4,5 | 14      |
| 3 — un tour par section           | É2              | +2,5 | 16,5    |
| 1 — éclatement en 4 fichiers      | É7              | +1   | 17,5    |
| 2 — stratégie d'images            | É5              | +1,5 | 19      |
| 4 — boucle de vérification        | É6              | +0,5 | 19,5    |
| 5 — séquence `--tasks`            | É8              | +0,5 | **20**  |

Le fond — l'univers, la copie, les données, les garde-fous chiffrés — se transporte tel quel. Ce
qui se refait, c'est l'emballage et le séquencement.
