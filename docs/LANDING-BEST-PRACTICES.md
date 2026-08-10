# Landing page — état de l'art et grille d'audit

> ✅ **Référentiel vivant** — établi le 2026-08-06, revérifié le **2026-08-06**. Nom **sans date**
> par construction : ce n'est pas une note d'audit (celles-ci se datent dans leur nom, cf.
> `FONTS-AUDIT-2026-08-05.md`), c'est un document qu'on met à jour. La datation vit **par section**,
> § 0.4.

> Il ne décrit **pas** la landing Synclune et ne porte **aucun verdict** sur elle : un verdict périme
> à la refonte suivante, une grille non. Le § 9 est la partie opératoire — les § 0 à 8 existent pour
> qu'un critère coché ne se re-discute pas.
>
> Le besoin : jusqu'ici chaque audit de landing (14/20, 15/20, 76/100, 83/100…) ré-inventait ses
> critères, et un critère ré-inventé peut s'inverser d'une session à l'autre. Ceux-ci sont fixés,
> sourcés, et datés.

> ⚠️ **En cas de désaccord entre ce document et un test du dépôt, le test gagne.** Ce référentiel
> agrège de la recherche sur le grand commerce ; un test de régression encode une décision déjà prise
> pour CE dépôt, souvent contre la règle générale et pour une raison écrite. Quand les deux divergent,
> la bonne sortie n'est jamais de faire taire le test : c'est d'écrire ici **pourquoi** la règle
> générale ne s'applique pas. Trois divergences sont déjà instruites — § 6.1 (polices), § 6.1
> (mesure de terrain), § 6.3 (`FAQPage`).

## Sommaire

| §                                                                            | Ce qu'on y trouve                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [0. Mode d'emploi](#0-mode-demploi)                                          | Convention de preuve 🟢🟡🔴, biais de la littérature, ce qui ne s'applique pas |
| [1. Le premier écran](#1-le-premier-écran)                                   | Flottaison, 10 secondes, périmètre catalogue, grille-hero, carrousels          |
| [2. Copie et hiérarchie](#2-copie-et-hiérarchie)                             | Concision, clarté, niveau de lecture, CTA, rôles titre/chapô                   |
| [3. Structure et ordre](#3-structure-et-ordre-des-sections)                  | Coût d'une section, ordre canonique, place du récit d'atelier                  |
| [4. La confiance](#4-la-confiance-quand-on-na-pas-davis)                     | Abandon de panier, effet fait-main, avis, obligations légales françaises       |
| [5. Mécanique de conversion](#5-mécanique-de-conversion)                     | Cartes produit, pièces vendues, favoris, capture email, rareté                 |
| [6. Perf · a11y · SEO · mobile](#6-performance-accessibilité-seo-mobile)     | Core Web Vitals, WCAG 2.2, données structurées, mobile                         |
| [7. Mesurer sans tester](#7-mesurer-quand-tester-est-impossible)             | Pourquoi l'A/B est indisponible, et par quoi le remplacer                      |
| [8. Anti-patterns](#8-anti-patterns-avec-leur-preuve)                        | 12 anti-patterns, chacun avec sa preuve ou son absence de preuve               |
| [**9. La grille d'audit**](#9-la-grille-daudit)                              | **La partie opératoire** — critères, méthode de vérification, barème /100      |
| [10. Ce que la recherche invalide](#10-annexe--ce-que-la-recherche-invalide) | Constats datés qui retirent des règles de la circulation                       |
| [11. Sources](#11-sources)                                                   | Bibliographie                                                                  |

## 0. Mode d'emploi

### 0.1 La convention de preuve, et pourquoi elle est le cœur du document

**La moitié de ce qui circule sous le nom de « best practice landing page » n'a aucune source
traçable.** Des chiffres très cités — « un mot changé sur un CTA fait +10 à 30 % de conversion »,
« le hero doit occuper 60 à 100 % du viewport », « les zones du pouce » — remontent soit à rien,
soit à une étude de 2013 sur des téléphones de moins de 5 pouces. Les mélanger à de la recherche
réelle est le seul vrai risque de ce genre de document. D'où le marquage, systématique :

| Marque | Sens                                                                                             | Usage                                                |
| ------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 🟢     | Recherche primaire — NN/g, Baymard, revue à comité de lecture, régulateur, W3C, doc Google datée | Actionnable tel quel                                 |
| 🟡     | Gros jeu de données éditeur, méthodologie annoncée                                               | Direction fiable, chiffre à prendre avec prudence    |
| 🔴     | Folklore : aucune source traçable, ou source qui ne dit pas ce qu'on lui fait dire               | **Cité pour être désamorcé.** Ne jamais agir dessus. |

Un point 🔴 n'est pas forcément faux — il est **non établi**. La différence compte : on peut suivre
une intuition, on ne peut pas la citer comme argument d'autorité contre une décision de design.

### 0.2 Le biais de toute cette littérature

Presque aucune recherche publiée n'étudie une boutique à ~20 commandes/mois. Baymard mesure les
334 sites les plus vendeurs US/UE ; Contentsquare agrège 99 milliards de sessions sur 6 500 sites ;
Spiegel a travaillé sur 13 500 références. **Tout ce qui suit est de la donnée de grand commerce**,
et le transfert d'échelle est signalé partout où il casse.

### 0.3 Ce qui ne s'applique PAS ici — à lire avant le reste

Contexte : micro-entreprise française, une personne, bijoux colorés faits main, B2C France + UE,
français et EUR, ~20 commandes/mois (SSOT `shared/constants/brand.ts` + `CLAUDE.md`). À ce format, une part importante du
canon CRO est inapplicable — pas « difficile », **inapplicable**.

| Conseil standard                           | Verdict ici                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| « Testez tout en A/B »                     | **Arithmétiquement indisponible** — 3,5 ans pour détecter +20 %. Démonstration au § 7.1                          |
| « Une seule variable à la fois »           | Inversé : seuls les gros effets sont détectables ⇒ **livrer des refontes cohérentes**, pas des micro-variantes   |
| « Laissez la donnée trancher »             | Il n'y a pas de donnée. Les heuristiques Baymard/NN/g **empruntent la puissance statistique des autres** (§ 7.3) |
| Popup de capture email                     | 2,1 % de conversion 🟡 ⇒ ~21 adresses/mois, contre un risque de pénalité Google sur mobile (§ 8.4)               |
| Exit-intent                                | **Pire déclencheur mesuré** (1,8 %) et inopérant au tactile — donc sur la majorité du trafic (§ 5.5)             |
| Session replay (Hotjar, Clarity)           | Exige le consentement en France ⇒ **réintroduit la bannière cookies** qu'on peut sinon supprimer (§ 7.4)         |
| Google Analytics 4                         | **Hors exemption CNIL** en France, y compris en mode « anonymisé » (§ 7.4)                                       |
| Avis produits                              | Le seuil utile est **5 avis par produit** ; en dessous, un « 5,0 ★ (1 avis) » est **contre-productif** (§ 4.3)   |
| Blog SEO                                   | Surface la plus exposée aux AI Overviews, et un coût éditorial permanent pour une personne seule (§ 6.3)         |
| `llms.txt`                                 | Aucun moteur ni fournisseur d'IA ne documente le lire. Google dit explicitement ne pas l'utiliser (§ 6.3)        |
| Annuaires / citations payantes             | La doc Google sur la proéminence locale ne cite que **liens et avis** — ni annuaires, ni citations (§ 6.3)       |
| Audit RGAA, déclaration d'accessibilité    | Le RGAA privé vise **250 M€ de CA**. L'European Accessibility Act **exempte les micro-entreprises** (§ 6.2)      |
| Personnalisation, moteur de recommandation | Pas assez de données comportementales pour que le modèle soit autre chose que du bruit                           |
| « Empilement 8 sections »                  | La section 5 est vue par moins de 10 % des visiteurs (§ 3.1). Trois à quatre sections, pas huit                  |

### 0.4 Ce qui périme, et à quelle vitesse

Ce document mêle deux natures de faits, et **elles ne vieillissent pas au même rythme** — les
confondre est la façon dont un référentiel devient faux sans que personne s'en aperçoive.

| Nature                                                   | Espérance de vie        | Exemples                                                          |
| -------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| **Recherche sur le comportement humain**                 | Des décennies           | § 1.1 flottaison · § 2.1 concision · § 4.3 avis · § 7 statistique |
| **Politiques d'un éditeur** (Google, navigateurs)        | **Des mois**            | § 6.3 rich results · § 6.1 seuils Web Vitals · § 6.4 unités       |
| **Droit** (UE, France)                                   | Des années, par à-coups | § 5.6 · § 6.2 EAA · § 4.6 médiation                               |
| **Chiffres de panel** (Baymard, Contentsquare, Omnisend) | 1 à 2 ans               | § 3.1 · § 4.1 · § 5.5                                             |

**Dernière vérification générale : 2026-08-06.** Les six points à re-vérifier en premier, parce
qu'ils ont déjà bougé au moins une fois :

1. **Dépréciations de données structurées** (§ 6.3) — `FAQPage` est tombé le 2026-05-07 ; la liste
   des rich results vivants est la première chose à relire.
2. **Digital Fairness Act** (§ 5.6) — en cours de négociation ; il nomme explicitement les comptes à
   rebours factices et les faux niveaux de stock.
3. **Recommandation CNIL sur le session replay** (§ 7.4) — consultation close en avril 2026, texte
   final attendu.
4. **Seuils Core Web Vitals** (§ 6.1) — stables depuis mars 2024, mais c'est le sujet où circule le
   plus de faux (§ 10.7).
5. **Transposition française de l'EAA** (§ 6.2) — la réserve n'est levée qu'à moitié.
6. **AI Overviews** (§ 6.3) — lancés en France le 2026-07-22, effets encore non mesurés.

> **Et la règle qui prime sur toutes les dates** : si ce document ne correspond plus à ce qui est
> lisible dans le dépôt, **le dépôt gagne** — puis on corrige ce document. Un référentiel qu'on
> croit sur parole contre le code est pire qu'un référentiel absent.

---

## 1. Le premier écran

### 1.1 La ligne de flottaison n'a pas disparu, elle a descendu 🟢

Eye-tracking NN/g, 120 participants, 130 000+ fixations, comparé à leur mesure de 2010 :

| Mesure                                      | 2010 | Récent                                               |
| ------------------------------------------- | ---- | ---------------------------------------------------- |
| Temps de lecture au-dessus de la flottaison | 80 % | **57 %**                                             |
| Deux premiers écrans                        | —    | **74 %**                                             |
| Trois premiers écrans                       | —    | **81 %**                                             |
| Premier cinquième de la page                | —    | 42 %+                                                |
| Moitié haute du premier écran               | —    | **> 65 % de l'attention au-dessus de la flottaison** |

Lecture correcte : les gens **scrollent réellement**, mais l'attention décroît toujours aussi
brutalement. Un premier écran entièrement décoratif achète l'espace le plus cher de la page pour
n'y rien mettre.

### 1.2 Les 10 secondes — et ce que « le test des 5 secondes » veut vraiment dire

- 🟢 NN/g : ce sont les **10 premières secondes** qui décident du maintien. Les pages présentent un
  « vieillissement négatif » — les mauvaises échouent vite, les bonnes retiennent 2 minutes et plus.
  « Pour gagner plusieurs minutes d'attention, il faut communiquer clairement sa proposition de
  valeur en 10 secondes. »
- 🔴 « La plupart des sorties se décident en 5 secondes » est une compression de ce résultat. **Le
  test des 5 secondes est un instrument de mesure**, pas une loi comportementale : on montre la
  maquette 5 s, on la masque, on demande ce qui a été retenu.

**La question qui vaut le test** : _« Qu'est-ce que cette boutique vend ? »_ Si « des bijoux
colorés faits main » ne revient pas spontanément, le premier écran a échoué — quelle que soit sa
note esthétique.

### 1.3 Le périmètre du catalogue est le travail nº 1 d'une page d'accueil 🟢

Baymard : la home doit donner à voir **40 à 50 % des _types_ de produits**. 22 % des sites en
montrent trop peu — et les utilisateurs qui ne voient pas le type qu'ils cherchent **supposent à
tort qu'il n'est pas vendu** et partent. Entre une liste de catégories textuelle et des produits,
**les produits gagnent** : l'image capte plus vite que le texte.

### 1.4 Le cas « la grille de produits EST la hero »

Une home sans bandeau, dont le premier écran est directement la marchandise, est un cas particulier
bien traité par la recherche — et le verdict est **globalement favorable** :

- 🟢 Elle fait nativement le travail du § 1.3 : montrer la marchandise, c'est montrer le périmètre.
- 🟢 **33 % des visiteurs** commencent par scroller la page d'accueil dans les catégories à forte
  charge visuelle. Le bijou en est une.
- 🟢 **59 % des sites** laissent du contenu promotionnel écraser le haut de la page d'accueil (37 %
  en 2018 — le défaut **empire**). Une grille-hero y est structurellement immunisée.

**Le piège, précis, et c'est le seul** 🟢 : **58 à 59 % des sites** échouent à donner la **portée**
de leurs liens sur mobile. Verbatim d'un testeur : _« il n'y a que deux paires de chaussures sur ce
site »_. Les utilisateurs ne relient pas un titre de section aux boutons qui suivent : **ils lisent
la grille comme étant le catalogue entier**.

Les deux remèdes Baymard : (1) n'afficher que des catégories de premier niveau, ou (2) **mettre la
portée dans le texte du lien** — « Voir les 48 créations », jamais « Voir tout ». Et : **« le lien
ne doit jamais être un mot unique. »**

Corollaire pour une grille-hero : les pièces affichées doivent être choisies pour leur **étalement**
(couvrir les types), pas pour leur performance.

### 1.5 L'illusion de complétude — et pourquoi la réponse n'est pas une flèche 🟢

NN/g, étude _The Illusion of Completeness_ : **6 utilisateurs sur 8** n'ont pas compris qu'une page
défilait. Causes identifiées : grande image ou vidéo de hero, filet horizontal marqué, blanc
généreux, fondu au scroll.

**Le remède recommandé est géométrique, pas iconographique** : laisser le contenu suivant
**déborder sous la ligne de flottaison** (principe de clôture). L'article **déconseille
explicitement** de compter sur une flèche seule — souvent non remarquée sans appui visuel.

> Reformulation utile du folklore « le hero doit faire 60-100 % du viewport » 🔴 (aucune source dans
> toute la chaîne de citation) : **la hauteur du hero est libre, à condition que la section suivante
> soit visiblement coupée par la flottaison.** C'est la contrainte établie ; le pourcentage est de
> la décoration.

### 1.6 Carrousels : dossier clos 🟢

33 % des grands sites desktop en ont un ; 46 % d'entre eux ont des défauts d'utilisabilité ; la
**première diapositive prend ~50 % des clics** ; le mouvement déclenche la cécité aux bannières.
NN/g : _« nous avons testé les offres rotatives de nombreuses fois et c'est une mauvaise façon de
présenter le contenu d'une page d'accueil »_ — cas documenté d'une remise de 100 £ visible **20 %
du temps**, que le testeur a conclu inexistante. Conclusion de Baymard eux-mêmes : **des blocs
statiques sont une alternative supérieure.**

Règle NN/g : ne changer de panneau **que sur demande de l'utilisateur**. Jamais d'auto-défilement,
et **jamais de contenu accessible uniquement depuis une diapositive**.

### 1.7 L'aperçu social est un premier écran avant le premier écran

Pour un visiteur qui arrive par un lien partagé — messagerie, réseau social, capture d'écran envoyée
à une amie — **la carte d'aperçu est vue avant la page**, et parfois à la place. Elle relève donc du
§ 1.2 (« qu'est-ce que cette boutique vend ? ») exactement comme le hero, et du § 4.4 (photographie
authentique) exactement comme une photo de section.

Elle est pourtant absente de la quasi-totalité des grilles d'audit de landing, parce qu'elle ne
s'affiche pas dans le navigateur. Ici elle est **générée** : `app/opengraph-image.tsx`
(`ImageResponse`, 1200 × 630), sur le socle partagé `shared/components/og/og-shell.tsx`.

Deux conséquences opératoires :

- ce qu'on corrige dans le titre et le chapô de la page **ne se propage pas** à l'aperçu : ce sont
  deux surfaces distinctes, à vérifier séparément ;
- le rendu Satori n'est pas un rendu navigateur — il ignore silencieusement `oklch()` et `var(--…)`.
  Un aperçu peut donc être gris alors que la page est polychrome, **sans aucune erreur**.

---

## 2. Copie et hiérarchie

### 2.1 Le seul chiffre solide de la rédaction web 🟢

Morkes & Nielsen, 51 utilisateurs expérimentés, 5 versions du même site, mesure sur temps de tâche,
erreurs, mémorisation et satisfaction :

| Version                           | Utilisabilité vs témoin promotionnel |
| --------------------------------- | ------------------------------------ |
| Concise (≈ moitié des mots)       | **+58 %**                            |
| Mise en page scannable            | **+47 %**                            |
| Langage objectif (sans marketese) | **+27 %**                            |
| **Les trois combinés**            | **+124 %**                           |

**79 % des testeurs scannent toujours ; 16 % seulement lisent mot à mot.** Mécanisme énoncé : le
langage promotionnel **impose une charge cognitive** — il faut filtrer l'hyperbole pour extraire le
fait.

> **Nuance décisive pour une marque artisanale** : le bras « objectif » est le **plus faible** des
> trois (+27 %), et il porte sur le **marketese** — les superlatifs invérifiables (« nos créations
> exceptionnelles vous émerveilleront »). Un récit factuel à la première personne sur la façon dont
> une pièce est faite **n'est pas** du marketese : c'est exactement le contenu porteur d'information
> que l'étude récompense. **Couper les adjectifs, garder la voix.**

Renfort 🟢 : une réécriture a fait passer la mémorisation des caractéristiques produit de **33 % à
65 %**.

### 2.2 Clarté avant habileté 🟡

Étude eye-tracking CXL sur les propositions de valeur : **la clarté bat la persuasion** ; un titre
retient **moins d'une seconde** en moyenne, donc les premiers mots portent la charge ; et,
contre-intuitivement, **plus le bloc de texte est court, plus il met de temps à être remarqué** (un
petit élément attire l'attention plus lentement). Un titre ultra-laconique en petit corps n'est
donc **pas** le choix sûr : la brièveté se paie en poids typographique.

### 2.3 Niveau de lecture 🟢

Viser le niveau **CM2 – 4ᵉ** pour un public grand public. Les lecteurs peu à l'aise **« labourent »**
le texte au lieu de le scanner, avec un champ de vision plus étroit : **le point principal doit être
tout en haut**, pour qu'un lecteur qui abandonne après deux lignes l'ait quand même reçu. La
simplification profite mesurablement à **tous** les niveaux de littératie, pas seulement aux plus
faibles.

### 2.4 CTA — une seule règle a de la recherche derrière elle

- 🔴 **« Changer un mot fait +10 à 30 % »** : aucune source traçable. Folklore.
- 🔴 Les classements de « formules de titres qui convertissent » : aucune étude contrôlée en
  e-commerce.
- 🟡 Le principe défendable : **accorder le verbe au niveau d'intention.** Un trafic chaud tolère
  l'impératif d'achat ; une découverte froide répond mieux à un verbe peu engageant.
- 🟢 **La règle qui prime sur tout le reste** (§ 1.4) : **un lien porte sa portée et n'est jamais un
  mot unique.** « Découvrir » seul échoue au test. « Voir les 48 créations » le passe.

À ~20 commandes/mois, la formulation d'un CTA **ne peut pas être testée** (§ 7). On choisit par la
règle de portée, et on arrête d'en discuter.

### 2.5 Répartition des rôles 🟡

Aucune recherche dédiée. L'allocation défendable, dérivée du bras « scannable » (+47 %) et des
résultats sur la littératie : **titre = ce que c'est · chapô = pour qui, et en quoi c'est différent
· sur-titre = catégorie ou contexte seulement.** Un sur-titre qui porte la proposition de valeur est
une erreur : c'est le plus petit corps de la page, et les petits éléments sont remarqués en dernier
(§ 2.2).

---

## 3. Structure et ordre des sections

### 3.1 Le coût réel d'une section supplémentaire

Deux mesures, à croiser :

- 🟢 **Attention** (NN/g, § 1.1) : écran 1 = 57 %, écrans 1-2 = 74 %, écrans 1-3 = 81 %. Les écrans
  4 et suivants se partagent donc **~19 %** de l'attention totale.
- 🟡 **Sessions** (Contentsquare 2026, 99 milliards de sessions / 6 500 sites) : taux de scroll
  **50,5 % desktop, 45,2 % mobile** — soit _environ la moitié des visiteurs ne scrolle pas du tout_.
  Et la tendance est baissière : scroll −2 %, temps sur site −7 %, pages/session −1 % en un an.

**Hypothèse de travail** (🟡 — synthèse, pas un chiffre publié) : ~100 % voient la section 1 · 45-50 %
atteignent la 2 · 25-30 % la 3 · ~15 % la 4 · **< 10 % la 5**.

> **Conséquence** : chaque section après la troisième coûte un **ordre de grandeur** d'audience.
> Une landing à 4 sections dont la dernière touche ~15 % des visiteurs est un design défendable ;
> une landing à 9 sections écrit surtout pour personne. Il n'existe **aucune recherche** soutenant
> un nombre de sections précis — les « 8 blocs canoniques » sont du contenu d'éditeur 🔴.

### 3.2 L'ordre canonique, et ses deux cases vides

Séquence type publiée 🔴 : hero → bandeau de valeur → produits mis en avant → preuve sociale →
collections → réassurance → contenu éducatif/FAQ → capture email.

Deux cases sont **vides** pour une boutique à ce format : la **capture email** (à supprimer, pas à
laisser vide) et, largement, la **preuve sociale** faute de système d'avis. Et la séquence suppose un
hero-bandeau : une grille-hero fusionne les deux premières cases — c'est une **simplification
légitime**, pas un écart à corriger.

### 3.3 Où placer le récit d'atelier 🟢

NN/g (_About Us_, 70+ utilisateurs, 100 sites, 85 recommandations) prescrit une structure à quatre
niveaux : **accroche brève sur la page d'accueil** → un à deux paragraphes scannables sur la page
dédiée → sous-pages thématiques → liens de pied de page en secours.

Autres résultats de la même étude : commencer à raconter **dès l'arrivée** ; utiliser des **faits
concrets**, éviter les mots comme « révolutionnaire » ; l'effet de halo fait que l'impression laissée
par le récit **colore tout le site**.

**Placement** : le récit vient **après** le périmètre catalogue. Déterminer ce qui est vendu est le
travail primaire de la page (§ 1.3) et concerne 100 % des visiteurs ; le récit convertit les ~45 %
qui scrollent. Précieux, mais deuxième.

### 3.4 Une section sans CTA est-elle une impasse ?

Aucune preuve dans un sens ou dans l'autre — la formulation est une heuristique d'éditeur 🔴. La
version défendable : une section sans **chemin de sortie** est un endroit où les 45 % qui ont scrollé
ne peuvent que s'arrêter. Mais la sortie peut être **le bord visible de la section suivante** (§ 1.5)
plutôt qu'un bouton. Une section de récit qui se referme proprement, suivie d'une section dont le
haut dépasse sous la flottaison, n'est pas une impasse.

### 3.5 Répéter le CTA ?

Aucune recherche. Le raisonnement dérivé des taux de scroll : un CTA en section 5 atteint moins de
10 % des visiteurs — **ce n'est donc pas un filet de sécurité** pour un CTA faible en section 1. Un
CTA répété ne mérite sa place que là où il est **le terminus naturel** de la section qu'il ferme.

---

## 4. La confiance quand on n'a pas d'avis

### 4.1 Le registre d'abandon, lu comme un brief de landing 🟢

Baymard, moyenne de 50 études : **70,22 %** d'abandon de panier. Motifs, hors « je regardais
seulement » (42 %, non adressable) :

| Motif                                           | %        |
| ----------------------------------------------- | -------- |
| Frais supplémentaires trop élevés (port, taxes) | **40 %** |
| Livraison trop lente                            | **20 %** |
| **Pas confiance pour donner sa carte**          | **19 %** |
| **Création de compte obligatoire**              | **18 %** |
| Tunnel trop long / compliqué                    | 17 %     |
| Erreurs ou plantages                            | 17 %     |
| **Politique de retour insatisfaisante**         | **13 %** |
| Coût total non visible en amont                 | 12 %     |

**Deux conséquences fortes.**

1. Les deux plus gros postes — frais et délai — sont de l'**information**, pas de la réassurance
   graphique. Une page qui écrit en clair le coût de port, le seuil de franco et le délai
   d'expédition fait mieux qu'une rangée de pictogrammes de bouclier. C'est un appui direct au refus
   déjà acté du bandeau de réassurance à icônes.
2. **18 % abandonnent sur l'obligation de créer un compte.** Une architecture 100 % invité est donc
   un avantage **mesuré** — et qu'il faut _dire_ (« commande sans compte »), pas seulement
   implémenter.

> **Où vivent ces valeurs, pour que la page ne les ré-écrive pas à la main** : SSOT
> `modules/orders/constants/shipping-rates.ts` — `PREPARATION_DELAY_LABEL` (délai de préparation) et
> `SHIPPING_RATES.FR` / `.EU` (montant + `estimatedDays`). Une page d'accueil qui affiche « expédié
> sous 48 h » en littéral pendant que le tunnel facture autre chose fabrique exactement le motif
> d'abandon nº 1. Les zones non desservies sont dans `UNSHIPPABLE_ZONES`
> (`modules/orders/services/shipping.service.ts`).

### 4.2 L'effet « fait main » est un résultat académique, pas un argument de vendeur 🟢

Fuchs, Schreier & van Osselaer, _The Handmade Effect: What's Love Got to Do with It?_ (_Journal of
Marketing_) : un produit **décrit comme fait main** est préféré et obtient une **prime de
disposition à payer** face à un produit industriel identique. Le médiateur mesuré est l'**amour
perçu** — l'« essence » du fabricant est perçue comme transférée dans l'objet.

Modérateur négatif documenté 🟡 : en situation de **privation de contrôle**, les consommateurs se
détournent du fait main (Song et al., _Psychology & Marketing_, 2023). Et l'effet est plus fort pour
le **cadeau** que pour l'usage personnel — ce qui compte, la part cadeau étant élevée en bijou.

> **Là où « une seule personne » devient un risque, ce n'est jamais la fabrication, c'est la
> logistique.** Rien dans les données d'abandon n'indique que la petitesse effraie ; ce qui effraie,
> c'est _est-ce que ça part, quand, et puis-je le renvoyer_. Le traitement correct est donc :
> **chaleur maximale sur le geste, précision maximale sur l'exploitation.** « Fait main à Nantes » +
> « expédié sous 48 h · retours 14 jours » est exactement l'appariement que la recherche soutient.
> Le flou sur la livraison est ce qui transforme le charme artisanal en risque perçu.

### 4.3 Les avis : pourquoi peu d'avis est pire que pas d'avis 🟢

Spiegel Research Center (Northwestern Medill), 57 000 avis + 65 000 avis d'acheteurs vérifiés sur
~13 500 produits, un an de données de vente :

- **5 avis → +270 % de probabilité d'achat** face à 0 avis.
- Le bénéfice marginal **s'effondre après les cinq premiers**.
- L'effet croît avec le prix : produits peu chers +190 %, plus chers +380 %.
- **L'intention d'achat culmine entre 4,0 et 4,7 étoiles et redescend vers 5,0** — un score parfait
  éveille le soupçon, **d'autant plus qu'il repose sur peu d'avis**.
- Le badge « acheteur vérifié » améliore les chances d'achat d'environ **15 %**.
- Les avis négatifs **établissent la crédibilité** plutôt qu'ils ne détruisent les ventes.

**Lecture honnête pour une boutique de ce format.** Le saut 0 → 5 avis est le plus gros levier de
conversion documenté accessible à une petite boutique — le dire autrement serait malhonnête. **Mais
le seuil est de 5 avis _par produit_** : sur des dizaines de références à ~20 commandes/mois, c'est
une accumulation en années. Et un produit affichant **« 5,0 ★ (1 avis) »** tombe précisément dans la
zone que la recherche identifie comme génératrice de scepticisme. **Un système d'avis partiel peut
être pire que pas de système du tout.**

### 4.4 Les substituts qui ont une base 🟢

- **Vérification externe** : les utilisateurs recoupent désormais les affirmations d'un site avec des
  sources tierces. Une preuve hébergée ailleurs transfère de la confiance **sans** exposer un
  compteur d'avis famélique.
- **Photographie authentique** : NN/g liste la photo de stock parmi les **destructeurs** de confiance,
  et les photos de produits et de **vraies personnes** parmi les contenus **scrutés**. 19 % des sites
  échouent encore sur « investir dans une photographie propre et contextuelle ». _Une illustration
  dessinée n'est pas une photo de stock_ — elle ne déclenche pas ce défaut, mais elle ne produit pas
  non plus le gain de confiance d'un visage réel.
- **Identité et joignabilité** : explication en langage clair de ce qu'on fait, canaux de contact
  réels, présence sociale nommée. Gratuit pour une personne seule.
- **Ce qu'il ne faut pas faire** : avis inventés, logos « vu dans » non mérités, notifications
  d'achat en direct — qui seraient fausses, ou publieraient le faible volume de commandes.

### 4.5 Logos de presse et sceaux de confiance

- 🔴 Les rangées « vu dans » n'ont aucune base de preuve indépendante. Les substituts locaux
  **vérifiables** ont la même fonction : marchés et salons faits, mention de presse locale réelle,
  affiliation artisanale. Ce sont des faits contrôlables — ce que le bras « objectif » récompense.
- 🟡 Sceaux de paiement : les acheteurs font confiance aux **marques grand public reconnaissables**
  bien plus qu'à un sceau inconnu, et **un badge non reconnu crée le doute** plutôt qu'il ne le lève.
  ⚠️ Ces chiffres sont de seconde main. Surtout : **la preuve porte sur le tunnel de paiement**, là
  où la carte est saisie — pas sur la page d'accueil. Des badges sur la home répondent à une peur que
  le visiteur n'a pas encore.

### 4.6 Ce que la loi française impose d'atteindre depuis `/` 🟢

Section absente des grilles anglophones, et **c'est la seule partie de ce document qui n'est pas
optionnelle** : les points ci-dessus optimisent, celui-ci est opposable. Le pied de page est la
surface qui les porte, donc une surface de conformité autant que de navigation.

- **Médiateur de la consommation** — depuis 2016, tout professionnel vendant à des particuliers doit
  garantir l'accès **gratuit** à un médiateur agréé (art. L612-1 s. du Code de la consommation). Ses
  **coordonnées** doivent figurer de façon **visible et lisible** sur le site, dans les CGV et dans
  les mentions légales. Ce n'est pas une clause à recopier dans les CGV seules.
- ⚠️ **La plateforme européenne de règlement en ligne des litiges (RLL / ODR) a fermé
  définitivement le 2025-07-20** — la Commission l'a jugée inefficace (moins de 2 % de plaintes
  aboutissant). **Tout lien ou mention `ec.europa.eu/consumers/odr` est désormais un lien mort à
  supprimer** des CGV, des mentions légales et des emails transactionnels. C'est le défaut de
  conformité le plus répandu du e-commerce français en 2026, précisément parce qu'il consiste à
  **ne rien faire** : la mention avait été ajoutée une fois, par obligation, et rien ne la retire.
  L'obligation de médiation, elle, **demeure** — seule l'orientation européenne disparaît.
- **Mentions légales, CGV, droit de rétractation de 14 jours** : atteignables depuis `/`.

> **Pourquoi c'est aussi un point de conversion, et pas seulement de conformité** : le motif
> d'abandon nº 7 est « politique de retour insatisfaisante » (13 %, § 4.1), et le § 6.3 rappelle
> qu'un évaluateur Google note **Low** une page de paiement offrant « trop peu d'informations de
> service client ou de contact ». Les trois exigences pointent au même endroit — un pied de page
> qui dit qui vend, comment le joindre, et comment renvoyer.

---

## 5. Mécanique de conversion

### 5.1 Ce qu'une carte produit doit porter 🟢

Baymard : **~50 % des sites** n'affichent pas assez d'information dans leurs listes, ce qui fait
écarter des produits pertinents. Les cinq attributs universels : **prix visible en permanence**,
titre descriptif, vignette, notes, et **variantes** (couleur / taille / matière) visibles **dans la
liste**, pas derrière un clic. Les produits sans image sont _« souvent complètement ignorés »_.

Pour une grille de bijoux, le sous-ensemble actionnable est : **prix toujours visible** et
**variantes de couleur exposées dans la carte** — les testeurs disent explicitement que voir les
variantes leur évite d'ouvrir des fiches qu'ils rejetteront.

### 5.2 Le coût total avant le panier 🟢

**67 %** des sites ne donnent pas d'estimation de coût total près du bouton d'achat, forçant à entrer
dans le panier pour découvrir le vrai prix. À rapprocher du motif d'abandon nº 1 (§ 4.1). Deux
défauts adjacents, particulièrement coûteux en bijou : **37 %** n'ont pas de photo « à l'échelle » et
**23 %** pas de photo portée — l'échelle absolue d'une pièce est très difficile à juger sur fond
blanc.

### 5.3 Les pièces vendues sur une grille — une porte, jamais un mur 🟢

C'est le point le mieux établi de cette section, et il est contre-intuitif :

- **30 % des utilisateurs quittent le site entièrement** quand ils tombent sur un produit
  indisponible, pour aller chercher ailleurs.
- Un simple « épuisé » est une **impasse d'expérience** : sans alternative, l'utilisateur part.
- **« Prévenez-moi du retour en stock » est faible** : les utilisateurs le lisent comme un signal
  d'aller voir la concurrence, et la plupart ignorent purement ces boutons.
- Le motif recommandé pour un article **définitivement** parti : marquer clairement, et **promouvoir
  agressivement des remplaçants** en haut de page.

**Appliqué à une grille de pièces uniques**, deux conceptions défendables :

1. **Exclure les pièces vendues de la grille d'accueil** — sa fonction est de convertir, une pièce
   vendue y convertit à 0 % et fait courir le risque des 30 %. Les garder accessibles par une page
   « déjà parties ».
2. **Les inclure, clairement marquées, mais uniquement si chaque carte vendue mène quelque part** —
   vers une pièce disponible proche, ou vers un parcours de commande personnalisée, qui pour une
   créatrice est un **meilleur** dénouement qu'un visiteur perdu.

En l'absence d'avis, une pièce partie est d'ailleurs une des rares preuves sociales disponibles —
_« celle-ci est partie »_ dit que d'autres ont acheté. **Mais seulement si c'est une porte.**

### 5.4 Les favoris sans compte : un avantage déjà acquis 🟢

**75 % des sites exigent la création d'un compte** pour utiliser une fonction « sauvegarder » ou une
liste d'envies, et les tests montrent des utilisateurs **refusant explicitement** de donner des
informations personnelles juste pour mettre un produit de côté. Un système de favoris en cookie, sans
compte, échappe entièrement à ce mode d'échec documenté.

🔴 En revanche, les taux de conversion des listes d'envies (« 5 à 20 % ») viennent tous d'éditeurs de
modules et n'ont aucune méthodologie publiée. Le mécanisme à croire est simple : **une liste d'envies
transforme « acheter ou partir » en « acheter, garder, ou partir »**.

### 5.5 Capture d'email et exit-intent 🟡

Meilleur jeu de données disponible : Omnisend 2025, **1,24 milliard d'affichages / 26,4 millions
d'adresses**.

| Déclencheur           | Conversion |
| --------------------- | ---------- |
| Moyenne toutes popups | **2,1 %**  |
| Délai 6-10 s          | 2,4 %      |
| Au scroll             | ~2,1 %     |
| **Exit-intent**       | **1,8 %**  |
| Immédiat (0-1 s)      | 1,9 %      |
| Avec remise           | 2,4 %      |
| Sans remise           | 1,7 %      |

Traduit à ~1 000 sessions/mois : **~21 adresses par mois**, ~24 avec remise. Il faut un an pour bâtir
une liste de 250 personnes.

**Exit-intent est le pire déclencheur mesuré**, et mécaniquement il repose sur la sortie de la souris
vers le chrome du navigateur : **il ne fonctionne pas au tactile**, donc pas sur la majorité du
trafic. Le récit « l'exit-intent est magique » vient des popups d'**abandon de panier** — un contexte
entièrement différent. Face à un formulaire en clair dans le pied de page, il achète environ **une
adresse de plus par mois**, contre le motif d'interaction le plus détesté du web.

⚠️ Le coût est bien plus mal documenté que le bénéfice : « +35 % de rebond », « −60 % de conversion
après la 3ᵉ impression » sont des chiffres d'éditeurs de popups sans méthodologie 🔴. Ce qui est
**certain**, en revanche, c'est le coût SEO (§ 8.4).

### 5.6 Rareté et urgence — le test de la ligne claire

**La recherche** 🟢 : quand le produit annoncé comme rare n'est pas obtenu, on mesure une **intention
accrue de passer à la concurrence, médiée par la colère** (_Psychology & Marketing_). Une étude 2025
du _Journal of Retailing_ montre que la rareté affecte directement la **sincérité perçue** du
marchand. Le mécanisme est la **réactance psychologique** : à mesure que la littératie promotionnelle
augmente, la tromperie perçue monte et l'intention d'achat **baisse**.

**Le cadre légal français** 🟢, et il se durcit :

- La directive sur les pratiques commerciales déloyales **interdit d'affirmer faussement** qu'un
  produit ne sera disponible que très peu de temps — c'est la base des poursuites sur les faux
  comptes à rebours. Le **Digital Fairness Act** nomme explicitement les comptes à rebours factices
  et les niveaux de stock trompeurs.
- La **DGCCRF applique** : **80 sites** ont fait l'objet de mesures de blocage au **S1 2025** (87 en
  2024), avec parmi les motifs cités _la manipulation des niveaux de stock pour pousser à l'achat_.
- **Art. L. 112-1-1 du Code de la consommation** : toute annonce de réduction doit référencer le
  **prix le plus bas des 30 jours précédents**, et des remises successives ne réinitialisent pas la
  référence. Sanctions récentes : **SHEIN 40 M€** (juillet 2025), **PrettyLittleThing 1,3 M€**
  (septembre 2025). La **loi 2025-594** du 30 juin 2025 permet aux agents d'exiger l'accès aux
  algorithmes de prix.

> **Le test de la ligne claire : la phrase serait-elle encore vraie si la visiteuse revenait
> demain ?**
>
> - **Oui** → c'est une **description**, elle est légitime et elle porte le récit artisanal :
>   « pièce unique », « série de 6 », « il en reste 2 » **lu en base**, « prochaine fournée en
>   septembre ».
> - **Non** → c'est un dark pattern : compte à rebours qui se réinitialise, « X personnes regardent
>   cet article », compteur de stock déconnecté du stock réel, « offre valable 15 minutes », prix
>   barré dont la référence n'est pas le vrai plus-bas sur 30 jours.

---

## 6. Performance, accessibilité, SEO, mobile

### 6.1 Performance

**Les seuils Core Web Vitals n'ont pas changé** 🟢 — mesurés au **75ᵉ centile**, segmentés
mobile/desktop :

| Métrique | Bon          | À améliorer  | Mauvais  |
| -------- | ------------ | ------------ | -------- |
| **LCP**  | ≤ **2,5 s**  | 2,5 – 4,0 s  | > 4,0 s  |
| **INP**  | ≤ **200 ms** | 200 – 500 ms | > 500 ms |
| **CLS**  | ≤ **0,1**    | 0,1 – 0,25   | > 0,25   |

> 🔴 **Démenti explicite** : « l'INP resserré à 150 ms en 2026 » et « la nouvelle métrique 2026 »
> circulent sur des blogs SEO. **Aucune source primaire ne les mentionne.** Le dernier changement
> structurel est le remplacement de FID par INP en mars 2024. La seule évolution réelle est l'API
> _Soft Navigations_ (essai d'origine Chrome 147→149), dont Google dit explicitement que
> l'intégration à CrUX **n'est pas décidée** — rien à faire aujourd'hui.

> ⚠️ **Le 75ᵉ centile n'existe pas à ce volume — et c'est la même impasse qu'au § 7.** 🟢 Les seuils
> ci-dessus sont définis sur des **données de champ** (CrUX), qui n'apparaissent qu'au-dessus d'un
> seuil d'éligibilité **non publié par Google**, estimé à quelques centaines de visites Chrome
> éligibles sur 28 jours — et seuls comptent les visiteurs sous Chrome ayant activé le partage de
> données. À ~20 commandes/mois, **PageSpeed Insights et la Search Console répondront « pas assez de
> données »**, indéfiniment. Ce n'est pas un défaut du site à corriger : c'est l'absence d'un
> instrument.
>
> **Conséquence sur la grille** (§ 9) : « LCP ≤ 2,5 s au p75 mobile » n'est pas un critère
> auditable ici. Il se remplace par deux critères qui le sont :
>
> 1. **Budget de laboratoire**, reproductible à volonté — `e2e/performance.spec.ts` (LCP < 3000 ms,
>    ×1,5 en CI ; CLS < 0,15 ; INP < 200 ms, **et l'identité de l'élément LCP**, qui est le vrai
>    garde-fou) et `.size-limit.json` (`Homepage` ≤ 80 kB gzip).
> 2. **Terrain, collecté soi-même** — la bibliothèque `web-vitals` n'a **aucun seuil de trafic** ;
>    elle est déjà branchée ici (`app/_components/web-vitals-reporter.tsx`). C'est la seule source
>    de p75 réel accessible à une boutique de ce format.
>
> ⚠️ Ne pas confondre avec un gate Lighthouse : il n'existe **aucune configuration LHCI** dans ce
> dépôt, seulement des artefacts (`.lighthouseci/`, `.lh-baseline/`). Un audit qui suppose un gate
> Lighthouse en CI se trompe d'outillage.

État du web 🟡 (Web Almanac 2025) : 48 % des origines passent les trois sur mobile, 56 % sur desktop.
**Le LCP est la contrainte mordante sur mobile** (62 % de bons contre 77 % pour l'INP et 81 % pour le
CLS).

**Images** — le levier dominant : elles sont **76 % des éléments LCP mobile** et 85 % desktop 🟢.

- **Ne jamais lazy-loader l'image LCP.** Coût mesuré : **3 546 ms contre 2 922 ms** de LCP au p75.
  17 % des pages le font encore, chiffre stable depuis 2024.
- `fetchpriority="high"` sur **une ou deux images au maximum** — au-delà le signal ne signifie plus
  rien. Le `preload` ne se justifie que si la ressource LCP est référencée depuis du CSS ou du JS
  externe, pas depuis le HTML.
  > **Ici, c'est UNE**, pas deux : la règle « un seul candidat LCP par page » est chiffrée pour ce
  > dépôt et fait de `preload` +
  > `fetchPriority="high"` une **paire indissociable**. Deux images en priorité haute sur une grille
  > de vignettes, c'est deux candidats LCP qui se disputent le même budget. La règle générale
  > tolère ; la décision locale tranche — et c'est elle qui s'applique.
- Lazy-loader **tout** ce qui est sous la flottaison : les seuils de distance Chrome sont de
  **1250 px en 4G / 2500 px en 3G** depuis juillet 2020 — le chargement part donc bien avant la
  visibilité (97,5 % des images lazy sont prêtes dans les 10 ms suivant leur apparition en 4G).
  Économie : 50 à 70 % du poids d'images.
- **Toujours des `width`/`height` (ou `aspect-ratio`)** : 62 % des pages mobiles ont au moins une
  image sans dimensions, première source de CLS.
- ⚠️ **Il n'existe aucun « budget d'images au-dessus de la ligne » officiel.** La seule règle sourcée
  est qualitative : charger avidement le premier viewport, lazy-loader le reste. Un budget chiffré
  est une convention locale, pas un standard.

**CLS, mécanique exacte** 🟢 : score = fraction d'impact × fraction de distance, cumulé par **fenêtres
de session** (décalages espacés de moins d'**1 s**, fenêtre plafonnée à **5 s**) ; le CLS retenu est
la **plus grande** fenêtre. Les décalages dans les **500 ms suivant une entrée utilisateur** sont
exclus — **mais le scroll et le pincement ne comptent pas comme entrée.** Animables sans risque :
`transform` (translate / scale / rotate / skew). À proscrire : `top`, `left`, `box-shadow`,
`box-sizing`.

**Polices** 🟢 : **WOFF2 uniquement** (~30 % de mieux que WOFF). Temporisations exactes de
`font-display` :

| Valeur     | Blocage    | Échange |
| ---------- | ---------- | ------- |
| `block`    | 2-3 s      | infini  |
| `swap`     | 0 ms       | infini  |
| `fallback` | **100 ms** | **3 s** |
| `optional` | **100 ms** | aucun   |

`optional` est le choix sûr pour le CLS (pas d'échange tardif). Le vrai correctif reste les
**overrides de métriques** (`size-adjust`, `ascent-override`, `descent-override`,
`line-gap-override`) qui font occuper au fallback la même boîte que la police web. Un `preload` de
police exige `crossorigin`, **même auto-hébergée**.

> ⚠️ **Divergence instruite — l'override de métriques n'est pas toujours disponible.** Next dérive
> `adjustFontFallback` d'une table de métriques embarquée
> (`node_modules/next/dist/server/capsize-font-metrics.json`) ; **une police absente de cette table ne peut pas
> avoir de fallback compensé**, quel que soit le soin apporté. C'est le cas de la display de ce
> dépôt, établi et daté à l'audit typo du 2026-08-05 — d'où
> le choix assumé de `display: "swap"` partout (`shared/styles/fonts.ts`) plutôt que d'`optional`.
> Le critère auditable n'est donc pas « les overrides sont là » mais **« ils sont là, ou leur
> impossibilité est documentée et datée »**. Auditer contre la règle générale ici fabrique un faux
> défaut sur un arbitrage déjà tranché.

**Vitesse → conversion : les chiffres, avec leur fragilité.** Classés par solidité méthodologique :

- 🟢 **Farfetch** : **−1,3 % de conversion par +100 ms de LCP**, −3,1 % de taux de sortie par 0,01 de
  CLS gagné. Analyse de corrélation RUM **validée par des A/B tests** — le design le plus solide du
  lot.
- 🟢 **Vodafone Italie** : LCP −31 % → **+8 % de ventes**, par **A/B test côté serveur**. Une vraie
  expérience.
- 🟡 **Nuvemshop** : +8,9 % de commandes par session sur 180 000 boutiques — mais comparaison d'une
  année sur l'autre, pas une expérience contrôlée.
- 🔴 **Deloitte, « 0,1 s = +8,4 % de conversion »** — le chiffre que tout le monde cite. **À ne
  jamais utiliser ici** : commandé par Google, observationnel (l'étude cherche explicitement « une
  vraie corrélation »), fenêtre de 4 semaines, ni taille d'échantillon ni nombre de marques publiés.

> Google le dit lui-même : seul l'A/B côté serveur est propre, et les corrélations d'autres
> entreprises **ne se transfèrent pas** — « chaque site a une finalité différente ». **Optimiser le
> LCP parce que c'est peu coûteux, correct, et que ça sert de vraies visiteuses — pas parce qu'on
> pourrait en mesurer le revenu.** À ce format, on ne le peut pas (§ 7).

### 6.2 Accessibilité

**La position légale d'abord, parce qu'elle change la priorisation** 🟢 :

- **European Accessibility Act** : l'e-commerce est bien dans le champ (art. 3(30)), applicable
  depuis le **28 juin 2025**. **Mais l'art. 4(5) exempte les micro-entreprises de services**, et
  l'art. 3(23) définit la micro-entreprise comme **moins de 10 personnes ET (CA ≤ 2 M€ OU bilan
  ≤ 2 M€)** — l'effectif est un ET dur. Transposition française : loi 2023-171 → décret 2023-931 du
  9 octobre 2023, codifié aux art. D. 412-49 à D. 412-62 du Code de la consommation.
- **RGAA** : le seuil du secteur privé est un **chiffre d'affaires de 250 M€**. Régime distinct (il
  transpose la directive 2016/2102 secteur public), et les confondre est l'erreur classique.
- **WCAG 3.0 n'a aucun statut normatif** — brouillon incomplet. Ignorer toute exigence citant
  Bronze/Argent/Or.

> ✅ **Réserve levée pour moitié (revérifié le 2026-08-06).** Le texte des art. 4(5) et 3(23) est
> maintenant corroboré **mot pour mot par plusieurs sources indépendantes** qui le citent
> verbatim : 4(5) — « les micro-entreprises fournissant des **services** sont exemptées du respect
> des exigences d'accessibilité » ; 3(23) — « moins de 10 personnes **et** un chiffre d'affaires
> annuel n'excédant pas 2 M€ **ou** un bilan annuel n'excédant pas 2 M€ ». L'exemption vaut pour
> les **services** et non pour les produits fabriqués, ce qui est bien le cas d'espèce.
>
> ⚠️ **Ce qui reste ouvert** : la lecture s'est faite sur des sources secondaires, EUR-Lex restant
> inaccessible à la vérification automatisée, et la phrase française exacte de la transposition
> (décret 2023-931) n'a toujours pas pu être isolée. **Assez solide pour prioriser** — la
> conformité est volontaire, donc arbitrable — **pas encore pour s'en prévaloir par écrit face à un
> tiers.** Cette dernière étape demande la lecture du Journal officiel, pas une recherche web.

**Conséquence : la conformité est ici volontaire — donc priorisable.** Ce qui suit est classé par
rendement réel, pas par niveau WCAG.

> **Trois de ces critères sont devenus des règles d'interface du dépôt**, parce qu'ils se décident
> en écrivant un composant et pas en auditant une page : **2.5.8 (cible 24 × 24)**, **1.4.10 (reflow
> 320 px)** et le trio mobile du § 6.4 (`svh`/`dvh`, `inputmode`, plancher 16 px). Ils vivent
> désormais dans `CLAUDE.md` § Conventions UI, qui est la section lue **avant de toucher à un
> composant**. Ce qui suit en reste la source et la justification — pas le lieu où on va les
> chercher.

Les critères qui mordent vraiment sur une landing 🟢 :

- **2.4.11 _Focus Not Obscured (Minimum)_, AA, nouveau en 2.2** — le composant focalisé ne doit pas
  être _entièrement_ masqué par du contenu de l'auteur. **Défaut le plus probable** : barre de
  navigation collante **plus** barre basse. Le correctif est du CSS, pas du JS : `scroll-padding-top`
  / `scroll-padding-bottom` sur la racine de défilement.
- **2.5.8 _Target Size (Minimum)_, AA, nouveau en 2.2 — 24 × 24 px CSS**, avec cinq exceptions dont
  deux très mal lues : (a) l'exception d'**espacement** est un **cercle de 24 px de diamètre centré**
  sur chaque cible trop petite, les cercles ne devant pas se croiser — deux icônes de 20 px dont les
  _centres_ sont à 24 px **passent**, malgré 4 px d'écart visible ; (b) l'exception **en ligne** met
  les liens dans une phrase **entièrement hors champ**. Les surfaces réellement concernées sont les
  affordances **en icône seule**.
- **1.4.10 _Reflow_, AA — le plancher est 320 px de large et 256 px de haut**, pas 400. Le « 400 »
  est le **niveau de zoom** : 320 px CSS équivalent à un viewport de 1280 px zoomé à 400 %. Une
  grille de produits **n'est pas exemptée** : elle doit se replier sur une colonne.
- **1.4.3 _Contraste_, AA — 4,5:1**, ou **3:1 pour le grand texte**, défini normativement comme
  **≥ 18 pt, ou 14 pt gras** (soit **24 px**, ou **18,66 px gras** à 96 dpi). Exempts : texte
  incident, décoration pure, **logotypes**. ⚠️ La taille seule suffit à qualifier — mais 3:1 sur une
  graisse fine est exactement le cas où le plancher légal et la lisibilité réelle divergent.
- **1.4.11 _Non-text Contrast_, AA — 3:1**, avec une exemption décisive : les graphiques
  **purement décoratifs** et ceux dont une présentation particulière est essentielle sont **hors
  champ**. **De l'encre dessinée qui ne porte aucune information n'est pas à repeindre.** En champ :
  bordures de champs de formulaire, anneaux de focus, et toute icône porteuse de sens sans libellé
  adjacent.
- **1.4.12 _Text Spacing_, AA** — la mise en page doit survivre à interligne **1,5×**, espacement de
  paragraphe **2×**, interlettrage **0,12×**, inter-mots **0,16×**. C'est une exigence de
  **résilience**, pas de rédaction. Sites à risque : interlettrage négatif sur les titres, cartes à
  hauteur fixe, badges dimensionnés sur leur texte actuel.
- **2.4.4 _Link Purpose (In Context)_, niveau A** — le contexte admis est une **liste fermée** :
  phrase, paragraphe, élément de liste, cellule ou en-tête de tableau, `title`. Conséquence pour une
  carte marketing : « En savoir plus » à la fin d'un paragraphe descriptif **passe** ; le même texte
  en CTA nu dans une carte dont le titre est un **frère** et non un ancêtre peut **échouer au niveau
  A**. Correctifs par ordre : texte auto-descriptif → lien enveloppant toute la carte → span masqué
  visuellement. ⚠️ `aria-label` fonctionne mais **écrase silencieusement le texte visible**, cassant
  **2.5.3 _Label in Name_** pour le pilotage vocal.

**Deux mythes à retirer de la circulation :**

- 🔴 **Sauter un niveau de titre n'est pas un échec WCAG.** Aucun critère, à aucun niveau, n'exige
  des rangs séquentiels. 1.3.1 exige seulement que les titres visuels _soient balisés comme titres_.
  Le W3C le formule comme un conseil (« devrait être évité quand c'est possible ») et autorise
  explicitement à **remonter** de plusieurs niveaux en refermant une sous-section. Un outil
  automatique qui le signale émet un **avertissement, pas un échec** — ne pas restructurer la
  sémantique pour le faire taire.
- 🔴 **Aucun critère de succès ne nomme `prefers-reduced-motion`.** C'est une technique suffisante,
  pas une exigence. Précisément : **2.2.2 _Pause, Stop, Hide_ (niveau A)** ne s'applique qu'au
  mouvement qui **démarre seul ET dure plus de 5 s ET coexiste avec d'autres contenus** ; **2.3.3**
  est **AAA** et ne couvre que le mouvement déclenché par interaction. **Une animation d'entrée
  unique de 800 ms est hors champ ; une boucle infinie ne l'est pas.** Le correctif proportionné pour
  une boucle décorative est d'en **borner le nombre d'itérations** — rendre la condition (2) fausse —
  pas d'ajouter un bouton « mettre en pause les animations ». `prefers-reduced-motion` reste à faire
  par ailleurs : une media query, et _reduce_ signifie **moins de mouvement, pas zéro animation**.

**Le lot 2.2 en entier** — 9 critères ajoutés, 1 retiré. Pertinence landing :

| Critère                         | Niveau | Pertinence                                            |
| ------------------------------- | ------ | ----------------------------------------------------- |
| 2.4.11 Focus Not Obscured (Min) | **AA** | **Haute** — nav collante + barre basse                |
| 2.4.12 Focus Not Obscured (Enh) | AAA    | Moyenne                                               |
| 2.4.13 Focus Appearance         | AAA    | Moyenne — exigence d'**aire**, et 3:1 **entre états** |
| 2.5.7 Dragging Movements        | **AA** | Basse — un carrousel avec boutons préc./suiv. passe   |
| 2.5.8 Target Size (Min)         | **AA** | **Haute**                                             |
| 3.2.6 Consistent Help           | **A**  | Moyenne — point d'entrée d'aide à place constante     |
| 3.3.7 Redundant Entry           | **A**  | Basse                                                 |
| 3.3.8 / 3.3.9 Accessible Auth   | AA/AAA | Sans objet sans compte client                         |

**Retiré : 4.1.1 _Parsing_.** Les `id` dupliqués et les balises non fermées ne sont plus des échecs
de conformité en soi. Un outil qui le signale teste WCAG 2.0/2.1.

⚠️ **Piège de mesure** : `getComputedStyle().color` renvoie le token `oklch()` **verbatim** — on
mesure le token, pas la couleur peinte. Peindre dans un canvas et relire le pixel.

### 6.3 SEO et données structurées

**La moitié de ce qu'une page d'accueil de 2022 émettait est morte** 🟢 :

| Type                       | Rich result en 2026 ?                                                        | Statut                                        |
| -------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| **Organization**           | ✅ oui — panneau de connaissance / profil marchand                           | Vivant, doc mise à jour 2026-04-15            |
| **BreadcrumbList**         | ✅ oui — **mais ≥ 2 `ListItem` requis**                                      | Vivant                                        |
| **Product**                | ✅ oui — **pages mono-produit uniquement**                                   | Vivant                                        |
| **LocalBusiness**          | ✅ oui                                                                       | Vivant                                        |
| **ItemList**               | ⚠️ carrousel réservé à Course/Movie/Recipe/Restaurant — **pas aux produits** | Vivant, mais sans effet ici                   |
| **WebSite / SearchAction** | ❌ **retiré**                                                                | Doc supprimée 2024-11-29                      |
| **FAQPage**                | ❌ **retiré**                                                                | Restreint en 2023, **déprécié le 2026-05-07** |
| **HowTo**                  | ❌ **retiré**                                                                | 2023-09-14, desktop et mobile                 |

⚠️ **Retirer un balisage mort ne retire pas la section visible.** Une FAQ visible reste une bonne
FAQ ; c'est le `FAQPage` qui ne rapporte plus rien.

> **« Ne rapporte plus rien » n'est pas « il faut le supprimer » — et la confusion des deux est un
> piège coûteux.** Calendrier confirmé (revérifié le 2026-08-06) : avis de dépréciation posé sur la
> doc `FAQPage` le **2026-05-07**, filtre d'apparence + rapport Search Console + Rich Results Test
> retirés en **juin 2026**, données de l'API Search Console en **août 2026**. Mais Google est
> explicite sur les deux points qui décident ici : **le type schema.org reste valide**, et **un
> balisage inexploité ne nuit pas** à la recherche.
>
> Le bon critère n'est donc pas « aucun `FAQPage` émis », c'est :
>
> 1. **ne pas ajouter** un nœud pour un rich result retiré — n'en attendre aucun gain ;
> 2. **ne pas fabriquer de section** dont la seule justification serait le balisage ;
> 3. **ne pas émettre un second `<script>`** — c'est le vrai défaut, et il est structurel (deux
>    `BreadcrumbList` ou deux `ItemList` divergentes sur une URL laissent Google en choisir une au
>    hasard).
>
> Appliqué ici, cela veut dire **ne toucher à rien** : le nœud `HowTo` de la section atelier est
> verrouillé par un test qui exige la correspondance mot-à-mot entre le titre visible et le `name`
> du nœud (`app/(shop)/(home)/_components/atelier/__tests__/atelier-section.test.tsx`). Un audit qui
> coche « supprimer le balisage mort » casse un invariant écrit et un test vert, pour zéro gain.
> **Retirer un nœud coûte un risque ; le garder coûte quelques octets.**
>
> ⚠️ **Le `FAQPage` faisait partie de cette démonstration jusqu'au 2026-08-08.** Il n'a PAS été
> retiré au titre de la dépréciation Google — la section « Des questions ? » a été supprimée de la
> landing (à refaire), et un `FAQPage` doit pointer du contenu réellement VISIBLE. C'est la
> distinction que ce paragraphe défend, dans l'autre sens : on ne supprime pas un nœud parce qu'il
> est inerte, on le supprime parce que **son contenu n'existe plus**. Quand la FAQ revient, le nœud
> revient **dans le `@graph` unique**, jamais en second `<script>`.

**Deux règles précises à ne pas rater :**

- Un `BreadcrumbList` à **un seul item** ne peut pas s'afficher : Google en exige au moins deux et
  dit explicitement qu'il **n'est pas nécessaire** d'inclure le niveau racine ni la page elle-même.
  Un fil d'Ariane à un item contient donc exactement le seul élément que Google demande d'omettre.
- **`Organization` est ce sur quoi investir**, et la page d'accueil est le bon endroit : _« nous
  recommandons de placer cette information sur votre page d'accueil… inutile de la mettre sur chaque
  page. »_ Aucune propriété obligatoire. Sous-type **`OnlineStore`** pour l'e-commerce. Logo
  ≥ 112 × 112, explorable.

**🆕 Le meilleur rapport effort/valeur de tout ce document** : depuis **novembre 2025**, les
politiques de **livraison et de retour** se déclarent **une seule fois sur `Organization`**
(`hasShippingService`, `hasMerchantReturnPolicy`) au lieu d'être répétées par produit. Jusqu'à
50 pays ISO 3166-1 alpha-2 — ce qui couvre exactement un périmètre France + UE. Quelques lignes,
écrites une fois, à partir d'un texte de CGV qui existe déjà.

⚠️ **`LocalBusiness` exige une `address`.** Si l'adresse déclarée est le domicile de la créatrice, le
JSON-LD **publie une adresse résidentielle privée** dans un champ moissonnable. Dans ce cas :
supprimer `LocalBusiness` et garder `Organization`, qui n'a pas d'adresse obligatoire. **C'est une
décision de vie privée déguisée en balisage** — vérifier la constante avant toute autre chose.

> **La constante à vérifier, nommément** : `shared/constants/seo-config.ts` construit l'`address` du
> nœud `LocalBusiness` depuis `BUSINESS_INFO.location`, et ce nœud est émis par
> `shared/components/structured-data.tsx` **sur toutes les pages**, pas seulement sur `/`. Deux
> conséquences : la question ne se règle pas page par page, et une réponse « c'est le domicile »
> impose de retirer le nœud entier — `Organization` n'exige aucune adresse. C'est le seul point de
> ce document dont la mauvaise réponse ne coûte pas des ventes mais **publie une donnée personnelle
> dans un champ conçu pour être moissonné**.

⚠️ Ne pas réintroduire d'avis en espérant des étoiles : les avis **auto-hébergés** sur une
`Organization` (ou tout sous-type) sont **inéligibles** aux rich results, widgets tiers embarqués
compris.

**Titre et méta-description** 🟢 : Google **réécrit les deux** et **ne publie aucune longueur**. La
génération de titre est _« entièrement automatisée »_ et puise dans `<title>`, `<h1>`, `og:title`, le
texte proéminent et les ancres. La méta-description **n'est pas un facteur de classement** — c'est un
levier de clic. Les **« 60 » et « 155 » caractères sont des heuristiques communautaires** 🔴. La
balise `keywords` ne sert à rien depuis 2009.

**E-E-A-T** 🟢 : **ce n'est pas un facteur de classement**, Google le dit — et les données des
évaluateurs _« ne sont pas utilisées directement dans les algorithmes »_. Correction utile : **le
bijou n'est pas YMYL** (les guidelines classent « acheter des crayons » en _non-YMYL_). En revanche
une règle **binaire** frappe les pages transactionnelles : une page offrant le paiement doit être
notée **Low** s'il y a _« trop peu d'informations de service client ou de contact »_ — et pour une
boutique, les évaluateurs commencent **par la page d'accueil**.

> **Deux axes indépendants : exigence faible sur les citations, exigence forte sur la confiance
> opérationnelle.** Ce qu'il faut atteindre depuis `/` : un moyen de contact, la politique de retour,
> et l'identité du vendeur.

**L'expérience est l'avantage structurel d'une créatrice** : les guidelines citent en qualité haute
_« des photos ou vidéos originales produites par le créateur du contenu »_ et _« une perspective
personnelle fondée sur une expérience vécue »_ ; en qualité basse, les photos sourcées ailleurs. Et,
explicitement : _« de nombreux petits sites ont peu d'informations de réputation disponibles ; une
page peut recevoir une note High sans information de réputation. »_ **Pas besoin de presse.** Le
piège est symétrique : est noté **Low** _« une revendication d'expérience ou d'expertise qui paraît
exagérée »_.

**Référencement local** 🟢 : le test d'éligibilité à une fiche Google Business Profile est _« soit un
local physique que les clients peuvent visiter, soit un déplacement chez le client »_. **Expédier un
colis n'est ni l'un ni l'autre.** Une créatrice qui ne reçoit jamais n'est pas éligible — et tenter
la validation vidéo d'un local inexistant risque une suspension définitive. Si elle reçoit
occasionnellement (rendez-vous, portes ouvertes, retrait), c'est éligible, ~2 h une fois, avec le
**nom de l'entreprise seul** (ajouter des mots-clés au nom expose à la suspension). La proéminence
locale, telle que Google la documente, ne cite que **liens et avis** — ni annuaires, ni citations 🔴 :
cohérence gratuite du nom/adresse entre site, fiche et bio sociale, oui ; contrat d'annuaire payant,
non.

**Spécificités 2026** :

- **AI Overviews et AI Mode ont été lancés en France le 22 juillet 2026.** Toute base de comparaison
  organique antérieure n'est **plus comparable** — une baisse sur les mois qui suivent est la forme
  attendue du changement, pas une régression du site.
- **Rien à construire pour eux** : Google, deux fois et daté — _« aucune exigence supplémentaire ni
  optimisation spéciale »_, _« les données structurées ne sont pas requises pour la recherche
  générative, et il n'y a pas de balisage schema.org spécial à ajouter »_. À savoir tout de même :
  `nosnippet` / `data-nosnippet` / `max-snippet` **suppriment l'éligibilité aux AI Overviews**.
- Impact sur les clics, les deux versions : Google annonce un volume _« relativement stable »_ ; Pew
  Research (68 879 recherches réelles) mesure **8 % de clic vers un résultat classique quand un
  résumé IA est présent, contre 15 % sans**. **Pour une boutique, l'enjeu est faible** : les AI
  Overviews mangent les requêtes **informationnelles**. La surface exposée serait un **blog** — une
  raison de plus de ne pas en ouvrir un.
- 🔴 **`llms.txt` : à ignorer.** Proposé en septembre 2024, **aucun moteur ni fournisseur d'IA ne
  documente le lire**, et Google écrit explicitement ne pas l'utiliser. Le piège de circularité :
  plusieurs éditeurs d'IA publient un `/llms.txt` **pour leur propre documentation**, ce que des
  fermes de contenu citent comme « support » — publier un fichier n'est pas en consommer un. L'action
  légitime est l'inverse : vérifier que `robots.txt` ne bloque pas les robots d'IA si l'on veut être
  citable.
- **Contenu généré par IA** : _« un contenu utile est un contenu utile, quelle que soit sa
  production »_ — la violation est l'**abus de contenu à grande échelle**. Une boutique de quelques
  dizaines de références n'est pas concernée. ⚠️ Mais quand il n'y a **pas** de champs
  `metaTitle`/`metaDescription` en base, **la copie vitrine EST la méta-description** : un texte
  produit rédigé par IA est directement la surface SEO. Règle : assistant de rédaction, toujours
  réécrit dans la voix de la créatrice, **jamais généré en lot**.

### 6.4 Mobile

- 🟢 Le mobile pèse **~75 %** des visites de commerce de détail. Et **75 % des sites e-commerce
  mobiles** sont notés « médiocres » par Baymard (2026, 71 000+ éléments revus à la main sur 150+
  sites) : un seul site noté « bon », aucun « parfait ».
- 🟢 **`svh` ou `dvh`, jamais `vh`, pour une hauteur de hero.** `100vh` est _« trop haut au
  chargement »_ : il suppose les barres du navigateur rétractées. `lvh` = rétractées, `svh` =
  déployées, `dvh` = suit en direct. Disponible partout (Chrome 108+, Firefox 101+, Safari 15.4+).
  Deux réserves de la même source : la mise à jour de `dvh` est **throttlée**, et **les claviers
  virtuels n'affectent pas les unités de viewport**.
- 🟢 **Cibles tactiles** : le seul nombre **normatif** est **24 × 24 px CSS** (WCAG 2.5.8, § 6.2).
  ⚠️ Les 44 pt d'Apple et les 48 dp de Material restent **corroborés par des sources secondaires
  seulement** — la documentation primaire est rendue en JS et échappe à la vérification automatisée
  (revérifié le 2026-08-06 : les deux chiffres sont constants d'une source à l'autre, mais aucune
  n'est l'éditeur). Concevoir avec 24 comme plancher **opposable** et ~44-48 comme confort **non
  opposable** : la distinction compte le jour où il faut arbitrer une densité.
- 🔴 **Zones du pouce : folklore jusqu'à nouvel ordre.** Toutes les cartes d'atteignabilité en
  circulation remontent à une étude de **2013**, menée sur des téléphones de **moins de 5 pouces** —
  problème méthodologique que l'écosystème des blogs de design ne signale jamais. Aucune étude
  récente trouvée.
- 🟢 **Formulaires** : `inputmode` (`numeric`, `decimal`, `tel`, `email`, `search`…) et les `type`
  correspondants **suggèrent** le clavier, avec un comportement dépendant de l'appareil.
- 🟢 **16 px minimum sur un champ iOS** — ✅ **réserve levée (2026-08-06)** : le déclencheur est la
  taille **rendue** du texte du champ ; **strictement sous 16 px, iOS Safari zoome au focus**, et le
  zoom ne se défait pas seul. Ce qui compte est la taille effective après héritage et `rem`, pas la
  valeur écrite dans la feuille de style.
  > ⚠️ **Le contournement le plus cité est un défaut d'accessibilité.** `maximum-scale=1` (ou
  > `user-scalable=no`) dans le `viewport` supprime bien le zoom automatique — en supprimant **le
  > zoom tout court**, ce qui casse **WCAG 1.4.4 _Resize Text_ (AA)**. `-webkit-text-size-adjust`
  > est un pansement au comportement inégal. **Le seul correctif propre est de porter le champ à
  > 16 px** ; si le design exige plus petit, la voie documentée est `font-size: 16px` + une
  > compensation en `transform: scale()`, jamais une restriction du viewport.

> Ces trois règles (`svh`/`dvh`, `inputmode`, plancher 16 px) sont **appliquées** depuis
> `CLAUDE.md` § Conventions UI — c'est là qu'un développeur les rencontre au bon moment. Ici vit
> leur justification.

---

## 7. Mesurer quand tester est impossible

La partie la plus utile de ce document, et la plus contre-intuitive.

### 7.1 Le calcul, posé

Test de deux proportions, bilatéral, horizon fixe, α = 0,05 et puissance 80 % :

```
                (z₀,₉₇₅ + z₀,₈₀)² · [p₁(1−p₁) + p₂(1−p₂)]        (1,960 + 0,842)² = 7,849
n par bras  =  ───────────────────────────────────────────
                                (p₂ − p₁)²
```

Cas de référence — base 2 %, hausse **relative** de 20 % (2,0 % → 2,4 %) :

```
p₁(1−p₁) = 0,0196   ·   p₂(1−p₂) = 0,023424   ·   somme = 0,043024
δ = 0,004  ⇒  δ² = 0,000016
n = 7,849 × 0,043024 / 0,000016 ≈ 21 100 par bras   ⇒   ≈ 42 200 sessions au total
```

| Hausse relative | n par bras | Total       |
| --------------- | ---------- | ----------- |
| +10 %           | 80 679     | **161 400** |
| **+20 %**       | 21 106     | **42 200**  |
| +50 %           | 3 822      | **7 645**   |
| +100 %          | 1 138      | **2 276**   |

### 7.2 Le résultat qui tranche la question

En substituant p₂ = p₁(1 + r) et en notant que sessions/mois = commandes/mois ÷ p₁, **le taux de
conversion s'annule** :

```
                15,7 × (2 + r)
mois  ≈  ───────────────────────────
          r²  ×  commandes par mois
```

> **La durée d'un test ne dépend que de la hausse relative visée et du NOMBRE DE COMMANDES — pas du
> taux de conversion.**

Trois conséquences :

1. **On ne peut pas améliorer sa capacité à tester en améliorant sa conversion.** Doubler le taux
   divise par deux les sessions nécessaires pour le même nombre de commandes. Gain net : zéro.
2. Le seul levier est le **volume de commandes**. Détecter +20 % **en un mois** demanderait ~864
   commandes/mois.
3. À **20 commandes/mois** : détecter +20 % prend **3,5 ans** ; en **3 mois** on ne détecte qu'un
   **+87 %** ; **une année entière de trafic n'achète que la détection d'un +40 %** — et avec encore
   20 % de chances de le rater s'il est réel.

Aucun changement de landing page ne produit +40 %. **L'A/B testing n'est pas « difficile » à cette
échelle : il est arithmétiquement indisponible.**

### 7.3 Les deux pièges qui rendent un test sous-dimensionné pire que pas de test

- 🟢 **Le _peeking_.** Si l'on regarde le résultat en continu et qu'on s'arrête au premier p < 0,05,
  le vrai taux de faux positifs est de **26,1 %** — cinq fois ce qu'on croit. Or à 20 commandes/mois,
  **tout test est un test avec peeking** : personne n'attend 3,5 ans sans regarder. Un « gagnant » sur
  quatre serait donc du bruit pur.
- 🟢 **La malédiction du vainqueur.** Sous faible puissance, les effets qui franchissent le seuil sont
  **systématiquement surestimés**. Un test à faible trafic ne risque donc pas seulement un faux
  gagnant : quand il trouve un effet réel, il en **exagère l'ampleur**.

### 7.4 Le programme de remplacement, par ordre de rendement

CXL l'écrit noir sur blanc : à faible volume, on n'arrête pas d'expérimenter, **on change de
méthode** — _« nous pouvons toujours faire du test utilisateur, de l'analyse heuristique et des
entretiens clients. Ils ne demandent pas de trafic. »_

1. **Appliquer les heuristiques Baymard / NN/g.** C'est **emprunter la puissance statistique des
   autres** : des milliers de sessions de test déjà payées par quelqu'un d'autre. Corriger un défaut
   documenté à 50-67 % d'échec ne demande aucune preuve locale.
2. **Test des 5 secondes** (§ 1.2) sur 5 à 8 personnes qui ne connaissent pas la marque.
3. 🟢 **Test du premier clic** — le meilleur rapport effort/information de la liste. Quand le premier
   clic est correct, la réussite de tâche est de **87 %** ; quand il est faux, **46 %**. C'est le
   meilleur prédicteur isolé connu, il ne demande **aucun trafic**, et **il se mène sur une simple
   capture d'écran**, avant même que le code existe.
4. 🟢 **Tests modérés à 5 utilisateurs, en rounds répétés.** Le modèle de Nielsen (31 % des problèmes
   trouvés par utilisateur, ~85 % à 5) a une **critique substantielle** : Faulkner (2003) a montré
   qu'en tirant des groupes de 5 dans un vivier de 60, la détection s'étalait de **55 % à 99 %** selon
   le tirage. Lecture honnête : 5 utilisateurs donnent une **médiane** de ~85 % mais un **plancher**
   de 55 % ⇒ **trois rounds de 5 battent un round de 15.**
5. **Lire toutes les commandes.** À 20/mois, c'est ~240 observations qualitatives par an qu'une
   personne seule peut tenir en tête — un luxe que les grandes enseignes paient des analystes pour
   approcher.
6. **Analytics respectueuse, mais descriptive.** Profondeur de scroll, pages d'entrée, sorties sur
   pièce vendue : ce sont des **questions de structure**, qui n'ont pas besoin de significativité.

**Le cadre CNIL, parce qu'il décide de l'outil** 🟢. Pour se passer de consentement (art. 82), un
traceur doit : (1) avoir une finalité **strictement limitée à la mesure d'audience** du site ;
(2) être **exclusivement pour le compte de l'éditeur** ; (3) ne produire que des **statistiques
anonymes**. Interdits : recoupement avec d'autres traitements, identifiants partagés entre sites,
mesure de couverture inter-domaines. Durées : cookie **13 mois** non renouvelé, données **25 mois**.
Depuis la délibération du **4 juillet 2025**, une grille d'auto-évaluation permet à un éditeur de
**déclarer** son outil exempté — ⚠️ **c'est une auto-déclaration, pas une certification**. Matomo
dispose d'un guide de configuration publié par la CNIL elle-même ; **GA4 reste hors exemption en
France**, y compris en configuration « anonymisée ».

> ⚠️ **Le session replay est un animal juridique différent, et ça vient de changer.** La CNIL a
> ouvert une consultation publique (close en avril 2026) sur un projet de recommandation visant
> explicitement Hotjar et Microsoft Clarity : _l'optimisation UX, le dépannage technique et le
> support client **ne sont pas** « strictement nécessaires »_ ⇒ **consentement préalable
> obligatoire**, masquage par défaut des mots de passe et données de paiement, échantillonnage plutôt
> qu'enregistrement systématique.
>
> **Conséquence** : le session replay est précisément la méthode qu'on recommande partout aux petits
> sites en substitut de l'A/B testing — et c'est **la seule qui oblige à réintroduire la bannière
> cookies** qu'une analytique exemptée permet sinon de supprimer. Et comme le taux de consentement
> est loin de 100 %, on n'observerait qu'une minorité auto-sélectionnée, donc non représentative.
> **Préférer le test modéré à 5 utilisateurs** : pas d'infrastructure de consentement, données plus
> riches, et on peut demander _« pourquoi avez-vous fait ça ? »_.

---

## 8. Anti-patterns, avec leur preuve

| #    | Anti-pattern                         | Preuve                                                                                                                                                                                                                                                                                                                                |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | **Carrousel / hero rotatif**         | 🟢 § 1.6. Le mieux documenté de la liste. Personne n'argumente _pour_                                                                                                                                                                                                                                                                 |
| 8.2  | **Navigation cachée sur desktop**    | 🟢 179 participants, 6 sites : usage de la nav **27 % (cachée) vs 48 % (visible)** ; découvrabilité **−20 %** ; desktop **39 % plus lent**                                                                                                                                                                                            |
| 8.3  | **Marketese**                        | 🟢 § 2.1. Le langage promotionnel coûte 27 % d'utilisabilité                                                                                                                                                                                                                                                                          |
| 8.4  | **Interstitiels intrusifs**          | 🟢 **Signal de classement Google.** Pénalisés : popup couvrant le contenu à l'arrivée depuis la recherche, ou pendant la lecture. Exemptés : obligations légales (consentement, âge), et les popups déclenchés à la **sortie**                                                                                                        |
| 8.5  | **Bannière cookies en accueil**      | 🟡/🔴 Mécanisme solide (elle bloque le contenu et décale le LCP), **chiffres non fiables** (« +10-20 % de rebond », « −70 % de conversion » : aucune méthodologie). Voir § 7.4 : elle peut souvent être **supprimée**                                                                                                                 |
| 8.6  | **Scroll infini sur un catalogue**   | 🟢 **−22 % de trouvabilité** pour un visiteur qui cherche ; **footer inatteignable** — or les liens légaux y sont obligatoires en France ; bouton retour cassé (**> 90 %** des sites testés n'implémentent pas `history.pushState()`). « Charger plus » teste mieux                                                                   |
| 8.7  | **Photo de stock**                   | 🟢 Eye-tracking : les photos génériques de personnes sont **ignorées**, les grandes images purement décoratives **complètement ignorées** — alors que produits et vraies personnes sont **scrutés comme du contenu**                                                                                                                  |
| 8.8  | **Animation qui retarde le contenu** | 🟢 Pour qu'une animation exprime une causalité, l'effet doit démarrer **sous 0,1 s**. Une animation répétée devient _« un obstacle au contenu »_. ⚠️ Recoupe un piège déjà payé ici : une animation d'entrée avec `fill-mode: both` **maintient le LCP à `opacity: 0`** — c'est un défaut **mesuré en LCP**, pas une question de goût |
| 8.9  | **Texte à faible contraste**         | 🟢 § 6.2. Version opposable : WCAG 1.4.3 et 1.4.4                                                                                                                                                                                                                                                                                     |
| 8.10 | **Vidéo en lecture auto avec son**   | 🟡 Réglé par la norme plutôt que par le CRO : **WCAG 1.4.2 est de niveau A** — tout son démarrant seul au-delà de 3 s exige un moyen de l'arrêter. Et tous les navigateurs le bloquent par défaut                                                                                                                                     |
| 8.11 | **« Trop de CTA »**                  | 🔴 **Le point le plus faible de la liste, et il faut le dire.** Aucune étude ne l'établit pour des CTA de landing ; le renfort habituel (loi de Hick, surcharge de choix) transfère mal et a des difficultés de réplication. Le résultat adjacent défendable est la scannabilité (§ 2.1)                                              |

### 8.12 La bannière cookies est le premier écran réel, quand elle s'affiche

Le § 8.5 la traite en coût de performance. C'est vrai, et incomplet : **quand elle est là, c'est
elle que la visiteuse lit en premier** — avant le titre, avant la marchandise, avant tout ce que
règlent les § 1 et 2. Elle relève donc aussi du § 1.2 (les 10 secondes), et un audit de landing qui
ne la regarde pas audite une page que personne ne voit dans cet état.

Trois exigences se cumulent :

- **CNIL** 🟢 — refuser doit être **aussi simple qu'accepter** : même nombre de clics, même niveau
  de mise en avant. Un « Tout accepter » plein contraste face à un « Paramétrer » en lien gris est
  la configuration sanctionnée.
- **Performance** 🟢 — elle se superpose au contenu, donc au candidat LCP (§ 6.1). Une bannière
  rendue côté serveur au premier octet décale la mesure ; chargée après coup, elle produit du CLS
  si elle pousse le contenu au lieu de le recouvrir.
- **§ 7.4** — la vraie question est en amont : **une analytique exemptée de consentement rend la
  bannière inutile**, et c'est le seul levier qui la supprime au lieu de l'optimiser. Le session
  replay est précisément ce qui la réintroduit.

---

## 9. La grille d'audit

À passer en une session. Chaque ligne renvoie au § qui l'explique — **ne pas trancher un critère sans
l'avoir relu**. Un critère 🔴 n'est pas dans la grille : on n'audite pas contre du folklore.

### 9.0 Périmètre, méthode, barème

**Ce qu'on audite.** « La landing » n'est pas un fichier. C'est :

| Couche                        | Ce qu'elle apporte                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `app/(shop)/(home)/page.tsx`  | Les 2 sections propres : hero, atelier — plus le `@graph` JSON-LD ⚠️ cf. note sous la table                |
| `app/(shop)/layout.tsx`       | Navbar et méga-menus, pied de page, barre basse mobile, bannière cookies, recherche rapide, panneau panier |
| `shared/components/` (racine) | Lien d'évitement, bannière de maintenance, remontée Web Vitals                                             |
| `app/opengraph-image.tsx`     | L'aperçu social — vu avant la page par qui arrive d'un lien partagé (§ 1.7)                                |
| `StoreClosurePage`            | **Remplace intégralement** la landing quand la boutique est fermée                                         |

⚠️ **La landing est passée de 4 sections à 2 le 2026-08-08** : « Choisis ton univers » (collections)
et « Des questions ? » (FAQ) ont été supprimées à la demande de Léane, pour être refaites. Un audit
mené aujourd'hui doit donc noter ce qui EST rendu, pas ce que ce document décrivait — et deux
familles de critères tombent forcément : l'**orientation** (§ 3, la page n'offre plus de chemin
autre que l'étal) et la **réassurance** (§ 4, la FAQ portait les motifs d'abandon livraison /
retours / entretien). Ce sont des P0 attendus, pas des découvertes ; les signaler comme tels, sans
re-instruire leur cause.

⚠️ Le piège de périmètre est réel : pied de page, navbar et barre basse **vivent dans le dossier
`(home)/_components/`** mais sont montés par le layout de la boutique. Les auditer comme des sections
d'accueil conduit à recommander des changements qui frappent tout le storefront. Symétriquement, les
oublier laisse hors champ la moitié des critères de confiance (§ 4) et toutes les obligations légales
(§ 4.6), qui vivent dans le pied de page.

**Comment on tranche une ligne.** Chaque case porte une colonne « Vérification ». Trois régimes :

| Régime         | Sens                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| **`test`**     | Un test du dépôt le verrouille. La case se coche en le lançant — et **le test gagne** sur ce document (§ 0) |
| **`inspect`**  | Vérifiable mécaniquement, mais sans test dédié : commande, lecture de fichier, HTML servi, DevTools         |
| **👁 `humain`** | Aucun juge automatique possible — jugement, ou test utilisateur. **Ce n'est pas un manque d'outillage**     |

⚠️ Vérifier dans le **HTML servi**, pas dans le DOM inspecté : les attributs de chargement d'image
sont réécrits à l'hydratation, et une console montre l'état final, pas celui qui a décidé du LCP.

**Barème.** La grille sort une **note /100** et un backlog **P0-P3**, pour être comparable aux autres
audits du dépôt.

| Bloc               | Points | Pourquoi ce poids                                                                |
| ------------------ | ------ | -------------------------------------------------------------------------------- |
| Premier écran      | **18** | 57 % de l'attention, et le seul écran vu par ~100 % des visiteurs (§ 1.1, § 3.1) |
| Copie et liens     | **12** | +124 % d'utilisabilité mesurés, et la règle de portée des liens (§ 2.1, § 1.4)   |
| Structure          | **8**  | Décide de l'audience de tout ce qui suit (§ 3.1)                                 |
| Confiance et légal | **18** | Adresse les motifs d'abandon 1, 2, 3, 7 — et le seul bloc opposable (§ 4)        |
| Cartes et grille   | **12** | ~50 % des sites échouent ; c'est là que la marchandise se juge (§ 5.1)           |
| Rareté et loyauté  | **6**  | Faible fréquence, mais une infraction est une sanction, pas une baisse (§ 5.6)   |
| Performance        | **10** | Levier réel, mais non mesurable en revenu à ce format (§ 6.1, § 7)               |
| Accessibilité      | **10** | Conformité **volontaire** ici (§ 6.2) — donc arbitrée, pas maximisée             |
| SEO                | **8**  | Beaucoup d'items sont devenus inertes ; le vivant est concentré (§ 6.3)          |
| Mobile             | **8**  | ~75 % des visites, et 75 % des sites notés médiocres (§ 6.4)                     |

Priorités : **P0** = illégal, cassé, ou perte de vente documentée · **P1** = défaut mesuré par une
source 🟢 · **P2** = 🟡 ou friction · **P3** = confort. ⚠️ **Une case cochée « conforme » n'est pas
un point acquis à vie** : elle porte la date de la passe.

### Premier écran — 18 pts

| ✓   | Critère                                                                                 | Vérification                                                                             | §   |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --- |
| ☐   | Un inconnu répond « ce site vend des bijoux colorés faits main » après 5 s d'exposition | 👁 **humain** — 5 à 8 personnes hors marque (§ 7.4). Aucun substitut automatique          | 1.2 |
| ☐   | Le premier écran laisse voir **40-50 % des types de produits** du catalogue             | `inspect` — types distincts affichés ÷ types actifs en base                              | 1.3 |
| ☐   | La section suivante est **visiblement coupée** par la flottaison (pas de faux fond)     | `test` `e2e/shop-mobile.spec.ts` (titre + 1ʳᵉ création au-dessus de la ligne) ; puis 👁   | 1.5 |
| ☐   | Aucun chevron ni flèche ne sert de substitut à ce débord                                | `inspect` — refus déjà acté, cf. mémoire « chevron scroll-cue Hero »                     | 1.5 |
| ☐   | Aucun carrousel, aucun contenu accessible uniquement depuis une diapositive             | `inspect` — `grep -rn "embla\|carousel" app/(shop)/(home)/`                              | 1.6 |
| ☐   | Le haut de page n'est pas occupé par de la promotion au détriment de la marchandise     | 👁 — la bannière de maintenance et la bannière cookies comptent (§ 8.12)                  | 1.4 |
| ☐   | Les pièces mises en avant sont choisies pour leur **étalement** de types                | `inspect` — l'ordre du hero est-il un tri de performance ou un choix de couverture ?     | 1.4 |
| ☐   | **L'aperçu social** dit ce que vend la boutique et n'est pas gris                       | `inspect` — ouvrir `/opengraph-image` ; Satori ignore `oklch()` et `var(--…)` en silence | 1.7 |

### Copie et liens — 12 pts

| ✓   | Critère                                                                                  | Vérification                                                                                   | §   |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- |
| ☐   | Aucun superlatif invérifiable dans le titre et le chapô ; les faits vérifiables restent  | `test` `test/contract/brand-lexicon.contract.test.ts` (mots bannis, formules interchangeables) | 2.1 |
| ☐   | Le point principal est en **tête**, lisible par qui abandonne après deux lignes          | 👁                                                                                              | 2.3 |
| ☐   | **Aucun lien de sortie n'est un mot unique**                                             | `inspect` — relever tous les libellés de `<Link>` de la page                                   | 2.4 |
| ☐   | Chaque lien de sortie porte sa **portée** (« Voir les 48 créations », pas « Voir tout ») | `inspect` — c'est la règle qui prime sur toute autre question de formulation                   | 1.4 |
| ☐   | Le sur-titre ne porte pas la proposition de valeur                                       | `inspect` — ⚠️ le sur-titre a été **retiré** des 5 routes boutique le 2026-08-06               | 2.5 |
| ☐   | Le texte des CTA de carte est auto-descriptif, ou la carte entière est le lien           | `test` `e2e/accessibility.spec.ts` (axe-core) + 👁 pour 2.4.4 en contexte                       | 6.2 |
| ☐   | Aucun `aria-label` ne contredit le texte visible d'un lien (2.5.3)                       | `inspect` — `getByRole(…, { name })` échoue là où l'étiquette diverge du visible               | 6.2 |
| ☐   | La copie **tutoie** (exception : messages d'erreur Stripe)                               | `test` `checkout-voice-tutoiement.regression.test.ts` pour le tunnel ; 👁 ailleurs              | —   |

### Structure — 8 pts

| ✓   | Critère                                                                                 | Vérification                                                        | §   |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --- |
| ☐   | Quatre sections ou moins ; aucune ne compte sur une audience > 15 % au-delà de la 4ᵉ    | `inspect` — compter les sections de `app/(shop)/(home)/page.tsx`    | 3.1 |
| ☐   | Le récit d'atelier vient **après** le périmètre catalogue                               | `inspect` — ordre de rendu dans `page.tsx`                          | 3.3 |
| ☐   | Sur la page d'accueil, le récit est une **accroche**, pas l'histoire complète           | 👁 — la copie longue vit dans `shared/constants/atelier-content.ts`  | 3.3 |
| ☐   | Aucune section ne se termine sans chemin de sortie **ni** débord visible de la suivante | 👁 — le débord compte comme sortie ; un bouton n'est pas obligatoire | 3.4 |
| ☐   | Aucun CTA n'est répété là où il n'est pas le terminus naturel de sa section             | 👁                                                                   | 3.5 |

### Confiance et légal — 18 pts

⚠️ Les quatre dernières lignes sont **opposables**, pas optimisables : elles se traitent en P0.

| ✓   | Critère                                                                                | Vérification                                                                                   | §    |
| --- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---- |
| ☐   | Le **coût de livraison** est lisible depuis `/`, en texte                              | `inspect` — doit dériver de `SHIPPING_RATES` (`modules/orders/constants/shipping-rates.ts`)    | 4.1  |
| ☐   | Le **délai d'expédition** est lisible, chiffré                                         | `inspect` — doit dériver de `PREPARATION_DELAY_LABEL`, jamais d'un littéral                    | 4.1  |
| ☐   | La **politique de retour** est atteignable depuis `/`                                  | `test` `e2e/navigation.spec.ts` (liens légaux du pied de page)                                 | 4.1  |
| ☐   | « Commande sans compte » est **écrit**, pas seulement implémenté                       | `inspect` — 18 % d'abandon sur ce motif : l'avantage existe, il faut le dire                   | 4.1  |
| ☐   | Un moyen de **contact** est atteignable depuis `/`                                     | `test` `e2e/navigation.spec.ts` (bloc contact du pied de page)                                 | 6.3  |
| ☐   | Le caractère fait main est **affirmé explicitement**, pas seulement suggéré            | 👁 — c'est le médiateur mesuré de l'effet fait-main                                             | 4.2  |
| ☐   | Aucune photo de stock nulle part                                                       | 👁 — une illustration dessinée n'est pas une photo de stock, mais ne la remplace pas non plus   | 4.4  |
| ☐   | Une photo authentique de la créatrice ou de ses mains existe, ou son absence est datée | `inspect` — vérifier la constante de portrait avant de conclure                                | 4.4  |
| ☐   | Aucun avis affiché sur moins de 5 avis pour un produit                                 | `inspect` — sans objet tant qu'il n'y a pas de système d'avis (retiré le 2026-07-30)           | 4.3  |
| ☐   | Aucun logo « vu dans » non mérité, aucune notification d'achat fabriquée               | 👁                                                                                              | 4.4  |
| ☐   | Aucun badge de sécurité sur la page d'accueil (leur place est le tunnel)               | `inspect`                                                                                      | 4.5  |
| ☐   | **Coordonnées du médiateur de la consommation** visibles et lisibles (art. L612-1)     | `inspect` — dans les mentions légales **et** les CGV, pas dans les seules CGV                  | 4.6  |
| ☐   | **Aucun lien vers la plateforme RLL/ODR européenne** (fermée le 2025-07-20)            | `inspect` — `grep -rni "ec.europa.eu/consumers/odr\|litiges en ligne" app/ modules/ shared/`   | 4.6  |
| ☐   | Mentions légales, CGV et droit de rétractation 14 jours atteignables depuis `/`        | `test` `e2e/navigation.spec.ts` — ⚠️ vérifier qu'aucune page légale du sitemap n'est orpheline | 4.6  |
| ☐   | La bannière cookies laisse **refuser aussi simplement qu'accepter**                    | 👁 + `inspect` — même nombre de clics, même poids visuel                                        | 8.12 |

### Cartes et grille — 12 pts

| ✓   | Critère                                                                 | Vérification                                                                         | §   |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --- |
| ☐   | Le **prix** est visible en permanence sur chaque carte                  | `inspect` — jamais au survol seul                                                    | 5.1 |
| ☐   | Les **variantes de couleur** sont visibles dans la carte                | `inspect` — évite d'ouvrir des fiches qui seront rejetées                            | 5.1 |
| ☐   | Chaque carte a une image                                                | `test` — `pickPrimaryImage()` doit être la seule source ; un `.mp4` ne s'affiche pas | 5.1 |
| ☐   | Une pièce vendue est **exclue de la grille**, ou **mène quelque part**  | `inspect` — 30 % quittent le site sur une impasse d'indisponibilité                  | 5.3 |
| ☐   | Aucun « prévenez-moi du retour en stock » présenté comme la seule issue | `inspect`                                                                            | 5.3 |
| ☐   | Les favoris fonctionnent **sans compte**                                | `inspect` — cookie `wishlist` ; avantage déjà acquis, à ne pas régresser             | 5.4 |
| ☐   | Aucune photo produit ne laisse l'échelle de la pièce indéterminable     | 👁 — 37 % des sites échouent ; critique en bijou                                      | 5.2 |

### Rareté et loyauté — 6 pts

| ✓   | Critère                                                                                     | Vérification                                                                 | §   |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --- |
| ☐   | **Test de la ligne claire** : chaque mention de rareté serait encore vraie demain           | 👁 — la seule question à poser, et elle suffit                                | 5.6 |
| ☐   | Aucun compte à rebours, aucun « X personnes regardent », aucun compteur déconnecté du stock | `inspect` — motif cité par la DGCCRF dans ses mesures de blocage             | 5.6 |
| ☐   | Tout prix barré référence le **plus bas des 30 derniers jours** (art. L. 112-1-1)           | `inspect` — sanctions récentes à 7 chiffres ; P0 dès qu'un prix barré existe | 5.6 |

### Performance — 10 pts

⚠️ **Aucune ligne ne cite le p75 de terrain** : il n'existe pas à ce volume (§ 6.1). Les deux
premières lignes le remplacent — budget de laboratoire, puis RUM collecté par le site lui-même.

| ✓   | Critère                                                                                                | Vérification                                                                                       | §   |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --- |
| ☐   | Le budget de laboratoire passe : LCP, CLS, INP **et l'identité de l'élément LCP**                      | `test` `e2e/performance.spec.ts` — l'identité est le vrai garde-fou, pas la valeur                 | 6.1 |
| ☐   | Le poids de la route reste sous budget                                                                 | `test` `pnpm size` — `.size-limit.json`, entrée `Homepage`                                         | 6.1 |
| ☐   | Le p75 de terrain est **regardé** là où il existe : le RUM maison                                      | `inspect` `app/_components/web-vitals-reporter.tsx` — CrUX restera vide, ce n'est pas un défaut    | 6.1 |
| ☐   | **L'image LCP n'est pas lazy-loadée** — vérifié dans le **HTML servi**                                 | `inspect` `curl -s localhost:3000 \| grep -o 'loading="[a-z]*"' \| head` — pas la console          | 6.1 |
| ☐   | **Une seule** image en priorité haute, et son `preload` va avec                                        | `inspect` — la règle générale ; la décision locale plus stricte a disparu avec la carte collection | 6.1 |
| ☐   | Toutes les images sous la flottaison sont en `lazy`                                                    | `inspect` — le seuil Chrome charge à 1250 px en 4G, bien avant la visibilité                       | 6.1 |
| ☐   | Toute image porte `width`/`height` ou `aspect-ratio`                                                   | `inspect` — 1ʳᵉ source de CLS                                                                      | 6.1 |
| ☐   | Aucune animation d'entrée ne maintient le contenu LCP invisible                                        | `inspect` — ⚠️ `fill-mode: both` tient le LCP à `opacity: 0` ; défaut **mesuré**, pas de goût      | 8.8 |
| ☐   | Les seules propriétés animées au chargement sont `transform` et `opacity`                              | `inspect` — `top`, `left`, `box-shadow` déclenchent du CLS                                         | 6.1 |
| ☐   | Le fallback de police porte des overrides de métriques, **ou l'impossibilité est documentée et datée** | `inspect` — display hors table capsize ⇒ compensation impossible, cf. § 6.1                        | 6.1 |

### Accessibilité — 10 pts

Rappel § 6.2 : la conformité est ici **volontaire** (exemption micro-entreprise). Ces lignes sont
classées par rendement réel, pas par niveau WCAG — et deux mythes ont été retirés de la grille
(saut de niveau de titre, `prefers-reduced-motion` comme critère de succès).

| ✓   | Critère                                                                                         | Vérification                                                                                        | §   |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --- |
| ☐   | Aucune violation axe-core AA sur `/`, y compris panneaux ouverts                                | `test` `e2e/accessibility.spec.ts` — couvre déjà le panier ouvert                                   | 6.2 |
| ☐   | Aucun élément focalisé **entièrement masqué** par une barre collante (2.4.11)                   | `inspect` — nav collante **+** barre basse ; correctif CSS `scroll-padding-*`, pas JS               | 6.2 |
| ☐   | Toute affordance en icône seule fait **≥ 24 × 24 px** ou passe l'exception d'espacement (2.5.8) | `inspect` — cercles de 24 px **non sécants**, mesurés de centre à centre                            | 6.2 |
| ☐   | La page se replie proprement à **320 px** / zoom 400 % (1.4.10)                                 | `test` `e2e/a11y/zoom-a11y.spec.ts` — ⚠️ 320 px, pas 375 : sous le plus petit breakpoint            | 6.2 |
| ☐   | La mise en page survit aux **espacements de texte** de 1.4.12                                   | `inspect` — cartes à hauteur fixe et badges dimensionnés sur leur texte sont les suspects           | 6.2 |
| ☐   | Contraste **4,5:1**, ou **3:1** au-delà de 24 px / 18,66 px gras (1.4.3)                        | `inspect` — ⚠️ peindre en canvas et relire le pixel : `getComputedStyle` rend l'`oklch()`           | 6.2 |
| ☐   | Bordures de champs et anneaux de focus à **3:1** (1.4.11)                                       | `inspect` — l'encre purement décorative est **hors champ**, ne pas la repeindre                     | 6.2 |
| ☐   | **Aucune boucle d'animation infinie** coexistant avec du contenu (2.2.2, niveau A)              | `inspect` — le correctif proportionné est de **borner les itérations**                              | 6.2 |
| ☐   | `prefers-reduced-motion` honoré — moins de mouvement, pas zéro animation                        | `test` `e2e/a11y/` + `inspect` `app/styles/animations.css` (le killswitch ne coupe que `animation`) | 6.2 |
| ☐   | Parcours clavier complet **après le dernier changement**                                        | `test` `e2e/a11y/keyboard-navigation.spec.ts` + 👁                                                   | 6.2 |

### SEO — 8 pts

| ✓   | Critère                                                                                     | Vérification                                                                                       | §   |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| ☐   | `Organization` (sous-type `OnlineStore`) présent sur la page d'accueil                      | `test` `shared/components/__tests__/structured-data.test.tsx`                                      | 6.3 |
| ☐   | `hasShippingService` + `hasMerchantReturnPolicy` déclarés **une fois** sur `Organization`   | `inspect` — meilleur rapport effort/valeur du document ; source = les CGV existantes               | 6.3 |
| ☐   | **Un seul `<script>` JSON-LD**, et aucun `BreadcrumbList` ni `ItemList` en double sur l'URL | `test` `shared/components/__tests__/catalogue-single-breadcrumb.regression.test.ts`                | 6.3 |
| ☐   | Aucun nœud **ajouté** pour un rich result retiré (`FAQPage`, `HowTo`, `SearchAction`)       | `inspect` — ⚠️ **ne pas supprimer l'existant** : valide, inerte, et verrouillé par un test         | 6.3 |
| ☐   | Aucun nœud **survivant** à la section qu'il décrit (balisage sans contenu visible)          | `test` `catalogue-single-breadcrumb.regression.test.ts` — le `FAQPage` est parti avec la FAQ       | 6.3 |
| ☐   | Aucun `BreadcrumbList` à **un seul item**                                                   | `inspect` — Google exige ≥ 2 items et demande d'omettre racine et page courante                    | 6.3 |
| ☐   | Si `LocalBusiness` est émis, son `address` **n'est pas un domicile privé**                  | `inspect` `shared/constants/seo-config.ts` → `BUSINESS_INFO.location` — **décision de vie privée** | 6.3 |
| ☐   | Le titre porte le territoire distinctif (coloré, Nantes), pas seulement le générique        | `test` `e2e/seo.spec.ts` — ⚠️ vérifier que le repli global dit la même chose que la page           | 6.3 |
| ☐   | Aucun texte produit généré en lot (la copie vitrine **est** la méta-description)            | 👁 — pas de `metaTitle`/`metaDescription` en base : c'est la même chaîne                            | 6.3 |
| ☐   | Aucune fiche Google Business Profile créée sans local réellement visitable                  | 👁 — expédier un colis n'ouvre pas le droit ; la validation vidéo d'un local absent suspend         | 6.3 |

### Mobile — 8 pts

| ✓   | Critère                                                                   | Vérification                                                                   | §   |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --- |
| ☐   | Aucune hauteur de hero en `vh` (utiliser `svh`/`dvh`)                     | `inspect` — `grep -rn "100vh\|\[100vh\]" app/ shared/ modules/`                | 6.4 |
| ☐   | Aucun champ de saisie sous **16 px** rendus                               | `inspect` — ⚠️ **jamais** corriger par `maximum-scale=1` : casse WCAG 1.4.4    | 6.4 |
| ☐   | `inputmode` correct sur chaque champ                                      | `inspect`                                                                      | 6.4 |
| ☐   | Aucun popup au chargement pour un visiteur venant de la recherche         | `inspect` — signal de classement Google ; le consentement est exempté          | 8.4 |
| ☐   | Navigation principale **visible** sur desktop, pas seulement en hamburger | `test` `e2e/navigation.spec.ts` — 27 % vs 48 % d'usage, desktop 39 % plus lent | 8.2 |
| ☐   | Pas de scroll infini sur un catalogue ; le pied de page reste atteignable | `inspect` — les liens légaux y sont obligatoires en France (§ 4.6)             | 8.6 |
| ☐   | Les 5 onglets de la barre basse restent atteignables et annoncés          | `test` `e2e/shop-mobile.spec.ts`                                               | 6.4 |

---

## 10. Annexe — ce que la recherche invalide

Constats **factuels et datés** — pas des verdicts de design, et **aucune correction n'est appliquée
par ce document**. L'annexe existe pour que la correction soit décidée sciemment.

1. **L'`ItemList` d'une page d'accueil ne donne pas « l'éligibilité au carrousel produit ».** Google
   restreint les rich results `Product` aux pages **mono-produit** — _« "les chaussures de notre
   boutique" n'est pas un produit spécifique »_ — et les carrousels `ItemList` sont réservés à
   Course / Movie / Recipe / Restaurant. ⚠️ **L'invariant anti-doublon reste juste** (deux `ItemList`
   aux `numberOfItems` divergents sur une même URL laissent Google en choisir une arbitrairement) :
   c'est le **motif** qui est erroné, pas la règle.
2. **`FAQPage`, `HowTo` et `WebSite`/`SearchAction` n'ouvrent plus aucun rich result.** Pour
   `FAQPage`, calendrier daté : avis de dépréciation le **2026-05-07**, filtre et Rich Results Test
   retirés en juin 2026, données d'API en août 2026. Émettre ces nœuds n'est pas nocif, mais ne
   rapporte rien — **et le type schema.org reste valide**, ce qui rend la suppression inutile autant
   que l'ajout. ⚠️ **Retirer le balisage ne retire pas la section visible** — une FAQ visible reste
   une bonne FAQ, et c'est même la réponse à 13 % des motifs d'abandon (§ 4.1). Le seul défaut réel
   est le **second `<script>`** (§ 6.3).
3. **Un `BreadcrumbList` à un seul item ne peut pas s'afficher** : Google en exige au moins deux et
   demande explicitement d'omettre le niveau racine et la page courante — un fil à un item ne contient
   donc que l'élément à omettre.
4. **Le seuil de reflow WCAG est 320 px**, pas 400. Le 400 est le **niveau de zoom**.
5. **Sauter un niveau de titre n'est pas un échec WCAG** — c'est un avertissement d'outil.
6. **Aucun critère WCAG ne nomme `prefers-reduced-motion`** ; en revanche une **boucle** d'animation
   infinie coexistant avec du contenu relève de 2.2.2, **niveau A**.
7. **Les seuils Core Web Vitals n'ont pas bougé.** Toute source annonçant un INP à 150 ms ou une
   nouvelle métrique 2026 est à écarter, elle et le reste de son contenu.
8. **Les « 60 / 155 caractères » de titre et méta-description ne viennent pas de Google**, qui ne
   publie aucune longueur et réécrit les deux.
9. **`llms.txt` n'est lu par personne**, Google inclus, et le dit explicitement.
10. **La base de comparaison du référencement organique français a été remise à zéro le 22 juillet
    2026** par le lancement des AI Overviews. Ne pas lire une baisse des mois suivants comme une
    régression du site.
11. **Le p75 des Core Web Vitals n'est pas mesurable sous le seuil d'éligibilité CrUX** (non publié,
    estimé à quelques centaines de visites Chrome éligibles sur 28 jours). Un critère d'audit formulé
    « au p75 mobile » est donc **inapplicable** à une boutique de ce format — non pas difficile à
    tenir, mais impossible à lire. Le remplacement est un budget de laboratoire plus un RUM collecté
    par le site (§ 6.1). ⚠️ Corollaire : « pas de données » dans la Search Console n'est **pas** un
    signal négatif, et rien ne se corrige en le poursuivant.
12. **La plateforme européenne RLL/ODR a fermé le 2025-07-20.** Toute mention ou lien vers elle — CGV,
    mentions légales, emails — est désormais mort et doit être retiré. ⚠️ L'obligation de **médiation
    de la consommation**, elle, demeure entièrement (§ 4.6) : c'est la mention européenne qui
    disparaît, pas le droit du consommateur. Confondre les deux fait supprimer la mauvaise clause.

---

## 11. Sources

**Attention, structure, premier écran**
NN/g — [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/) ·
[The Fold Manifesto](https://www.nngroup.com/articles/page-fold-manifesto/) ·
[The Illusion of Completeness](https://www.nngroup.com/articles/illusion-of-completeness/) ·
[How Long Do Users Stay on Web Pages?](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/) ·
[5-Second Usability Test](https://www.nngroup.com/videos/5-second-usability-test/)
Baymard — [Homepage UX](https://baymard.com/blog/ecommerce-homepage-ux) ·
[Homepage & Category Usability](https://baymard.com/blog/ecommerce-homepage-and-category-usability-report) ·
[Full Scope for Links on Mobile Homepages](https://baymard.com/blog/mobile-homepage-provide-full-scope) ·
[Navigation Best Practices](https://baymard.com/blog/ecommerce-navigation-best-practice) ·
[10 UX Requirements for Homepage Carousels](https://baymard.com/blog/homepage-carousel)
Contentsquare — [2026 Digital Experience Benchmark](https://contentsquare.com/guides/digital-experience-benchmark/engagement/)

**Copie**
NN/g — [Concise, SCANNABLE, and Objective](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/) ·
[How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/) ·
[Writing for Lower-Literacy Users](https://www.nngroup.com/articles/writing-for-lower-literacy-users/) ·
[Legibility, Readability, Comprehension](https://www.nngroup.com/articles/legibility-readability-comprehension/) ·
[About Us Information](https://www.nngroup.com/articles/about-us-information-on-websites/) ·
[Great Summaries on About Us Pages](https://www.nngroup.com/articles/about-us-summaries/)
CXL — [Value Proposition Study](https://cxl.com/research-study/value-proposition-study/)

**Confiance, avis, effet fait-main**
Baymard — [Cart Abandonment Rate & Reasons](https://baymard.com/lists/cart-abandonment-rate)
Spiegel Research Center — [How Online Reviews Influence Sales](https://spiegel.medill.northwestern.edu/how-online-reviews-influence-sales/)
Fuchs, Schreier & van Osselaer — [The Handmade Effect](https://www.wu.ac.at/fileadmin/wu/d/i/mm/paper/2015_CF_MS_SO_The_Handmade_Effect_Whats_Love_Got_to_Do_with_It.pdf)
Song et al. — [The negative handmade effect](https://onlinelibrary.wiley.com/doi/full/10.1002/mar.21812)
NN/g — [Photos as Web Content](https://www.nngroup.com/articles/photos-as-web-content/)

**Mécanique de conversion**
Baymard — [Product Listing Information](https://baymard.com/blog/product-listing-information) ·
[Handling Out-of-Stock Products](https://baymard.com/blog/handling-out-of-stock-products) ·
[Product Page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
Omnisend — [Email popup performance 2025](https://www.omnisend.com/blog/email-popup-statistics/)
Wisepops — [Popup statistics](https://wisepops.com/blog/popup-stats)

**Rareté, dark patterns, droit français**
[Psychology & Marketing — Scarcity appeals, anger, brand switching](https://onlinelibrary.wiley.com/doi/full/10.1002/mar.21489) ·
[Journal of Retailing — When product scarcity backfires (2025)](https://www.sciencedirect.com/science/article/abs/pii/S0022435925001022) ·
[Réactance psychologique](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11037426/)
[EPRS — Regulating dark patterns in the EU](https://epthinktank.eu/2025/01/14/regulating-dark-patterns-in-the-eu-towards-digital-fairness/) ·
[Osborne Clarke — Digital Fairness Act](https://www.osborneclarke.com/insights/digital-fairness-act-unpacked-dark-patterns) ·
[FashionNetwork — DGCCRF, 80 blocages S1 2025](https://us.fashionnetwork.com/news/-dark-patterns-what-lies-ahead-for-deceptive-e-commerce-practices-,1824463.html) ·
[DGCCRF — Annonces de réduction de prix](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/annonces-de-reduction-de-prix-ce-que-vous-devez-savoir)

**Médiation de la consommation et fermeture de la plateforme RLL** (§ 4.6, vérifié 2026-08-06)
[Fermeture définitive de la plateforme RLL/ODR au 20 juillet 2025](https://sasmediationsolution-conso.fr/actualites/20-juillet-2025-fermeture-definitive-de-la-plateforme-europeenne-de-reglement-en-ligne-des-litiges-rll-odr) ·
[Chambre de consommation d'Alsace — suppression de la plateforme](https://cca.asso.fr/suppression-de-la-plateforme-europeenne-de-reglement-en-ligne-des-litiges/) ·
[CDMF Avocats — e-commerce : ne pas oublier de mentionner le médiateur](https://www.cdmf-avocats.fr/e-commerce-ne-pas-oublier-de-mentionner-le-mediateur/)

**Performance**
[web.dev — Web Vitals](https://web.dev/articles/vitals) ·
[Google Search Central — Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) ·
[web.dev — Optimize LCP](https://web.dev/articles/optimize-lcp) ·
[web.dev — LCP and lazy-loading](https://web.dev/articles/lcp-lazy-loading) ·
[web.dev — Browser-level lazy-loading](https://web.dev/articles/browser-level-image-lazy-loading) ·
[web.dev — CLS](https://web.dev/articles/cls) · [Optimize CLS](https://web.dev/articles/optimize-cls) ·
[web.dev — Font best practices](https://web.dev/articles/font-best-practices) ·
[web.dev — Optimize web fonts](https://web.dev/learn/performance/optimize-web-fonts) ·
[web.dev — Viewport units](https://web.dev/blog/viewport-units) ·
[Web Almanac 2025 — Performance](https://almanac.httparchive.org/en/2025/performance) ·
[web.dev — Farfetch](https://web.dev/case-studies/farfetch) ·
[web.dev — Vitals business impact](https://web.dev/case-studies/vitals-business-impact) ·
[web.dev — Nuvemshop](https://web.dev/case-studies/nuvemshop) ·
[web.dev — Site speed and business metrics](https://web.dev/site-speed-and-business-metrics/) ·
[Deloitte — Milliseconds Make Millions](https://www.deloitte.com/ie/en/services/consulting/research/milliseconds-make-millions.html) ⚠️ 🔴
[Google — Mesurer les Core Web Vitals via l'API CrUX](https://developers.google.com/codelabs/chrome-web-vitals-psi-crux) ·
[Search Console — rapport Core Web Vitals et seuil de données](https://support.google.com/webmasters/answer/9205520) (§ 6.1, seuil d'éligibilité CrUX)

**Accessibilité**
W3C — [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) ·
[Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) ·
[Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) ·
[Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) ·
[Headings tutorial](https://www.w3.org/WAI/tutorials/page-structure/headings/) ·
[WCAG 3 intro](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/) ·
[EU policies](https://www.w3.org/WAI/policies/european-union/)
[Légifrance — décret 2023-931](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048178349) ·
[RGAA — champ d'application](https://accessibilite.numerique.gouv.fr/obligations/champ-application/)
[MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
[EAA — exigences pour les services e-commerce et exemption micro-entreprise](https://accessible.org/eaa-ecommerce-services-requirements/) ·
[EAA — exemptions, art. 4(5) et 3(23)](https://www.webyes.com/blogs/eaa-exemptions/) ⚠️ sources secondaires, cf. § 6.2
[CSS-Tricks — 16px or larger text prevents iOS form zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/) (§ 6.4)

**SEO**
Google Search Central — [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization) ·
[Return policy](https://developers.google.com/search/docs/appearance/structured-data/return-policy) ·
[Shipping policy](https://developers.google.com/search/docs/appearance/structured-data/shipping-policy) ·
[Ecommerce structured data](https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce) ·
[Search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) ·
[Updates changelog](https://developers.google.com/search/updates) ·
[Title links](https://developers.google.com/search/docs/appearance/title-link) ·
[Snippets](https://developers.google.com/search/docs/appearance/snippet) ·
[Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) ·
[AI features](https://developers.google.com/search/docs/appearance/ai-features) ·
[AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) ·
[Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) ·
[GBP eligibility](https://support.google.com/business/answer/3038177) ·
[Local prominence](https://support.google.com/business/answer/7091) ·
[FAQPage — page portant l'avis de dépréciation du 2026-05-07](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
[Pew Research — clics et résumés IA](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)

**Mesure et statistique**
[Evan Miller — How Not To Run an A/B Test](https://www.evanmiller.org/how-not-to-run-an-ab-test.html) ·
[Evan Miller — Sample size](https://www.evanmiller.org/ab-testing/sample-size.html)
[CXL — A/B Testing Alternatives for Low-Traffic Websites](https://cxl.com/blog/ab-testing-alternatives/)
NN/g — [Why You Only Need to Test with 5 Users](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)
[Faulkner (2003) — Beyond the five-user assumption](https://link.springer.com/article/10.3758/BF03195514)
[Lyssna — First-click testing](https://www.lyssna.com/guides/first-click-testing/) ·
[MeasuringU — Do click tests predict live clicks?](https://measuringu.com/do-click-tests-predict-live-site-clicks/)
CNIL — [Mesure d'audience exemptée](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience) ·
[Programme d'évaluation (juillet 2025)](https://www.cnil.fr/fr/solutions-de-mesure-daudience-exemptees-de-consentement-la-cnil-lance-un-programme-devaluation) ·
[Guide Matomo](https://www.cnil.fr/sites/cnil/files/atoms/files/matomo_analytics_-_exemption_-_guide_de_configuration.pdf)
[Clifford Chance — CNIL et session replay (2026)](https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2026/03/session-replay-tools-under-scrutiny--cnil-launches-public-consul.html)

**Anti-patterns**
NN/g — [Auto-Forwarding Carousels](https://www.nngroup.com/articles/auto-forwarding/) ·
[Designing Effective Carousels](https://www.nngroup.com/articles/designing-effective-carousels/) ·
[Hamburger Menus Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/) ·
[Infinite Scrolling](https://www.nngroup.com/articles/infinite-scrolling-tips/) ·
[Animation for Attention and Comprehension](https://www.nngroup.com/articles/animation-usability/)
[Smashing — Pagination vs Infinite Scroll vs Load More](https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/)
[Bruce Clay — Intrusive interstitials](https://www.bruceclay.com/blog/page-experience-intrusive-interstitials/)
