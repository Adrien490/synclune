/**
 * SSOT des tracés « fait main » — la même main pour tous les gestes du dépôt.
 *
 * Avant l'audit du 2026-08-05, quatre implémentations cousines
 * (`HandDrawnAccent`, `SquiggleUnderline`, `HandDrawnRail`, `DrawnChevron`) se
 * citaient en commentaire sans partager une ligne de path. Changer la main
 * (direction C « La main appuyée », restée au chaud) doit être UN fichier :
 * celui-ci.
 *
 * Chaque entrée déclare son viewBox ET ses width/height natifs — toujours au
 * même ratio, c'est ce que verrouille
 * `hand-drawn-accent-aspect-ratio.regression.test.ts` : un couple désaccordé
 * letterboxe le tracé en silence (`preserveAspectRatio` par défaut =
 * `xMidYMid meet`, encre rétrécie et centrée — payé sur 7 appelants).
 */

/**
 * La forme d'une entrée de ce fichier — le contrat que
 * `hand-drawn-accent-aspect-ratio.regression.test.ts` vérifie sur CHAQUE
 * collection (width/height natifs === ratio du viewBox).
 *
 * Exporté pour que `AtelierThreadStroke` puisse rendre n'importe quel tracé de
 * la SSOT (fil, glyphe d'accent, création du présentoir) au lieu d'être
 * enfermé dans `ATELIER_THREAD_PATHS` : c'est ce qui a permis de supprimer le
 * `<svg>` recopié à la main de la pampille — viewBox, `pathLength`,
 * `hand-draw-inview` et conversion de graisse y étaient dupliqués.
 */
export interface HandDrawnPathConfig {
	readonly d: string;
	readonly viewBox: string;
	readonly width: number;
	readonly height: number;
}

/**
 * Le souligné, en trois longueurs de GESTE — trois tracés dessinés à leur
 * ratio, pas un path étiré. L'appelant choisit la longueur la plus proche du
 * mot ; la hauteur est toujours dérivée (cf. `HandDrawnAccent`).
 * - `s` (5:1) : dialogs, petits titres (« Créations », titre de variante) ;
 * - `m` (6:1) : le tracé historique — signatures, mots soulignés ;
 * - `l` (11:1) : les grands h1 (404).
 */
export const UNDERLINE_PATHS = {
	s: { d: "M2 8.5 Q16 5, 32 7.5 Q46 9.5, 58 6.5", viewBox: "0 0 60 12", width: 60, height: 12 },
	m: { d: "M2 15 Q30 8, 60 12 Q90 16, 118 10", viewBox: "0 0 120 20", width: 120, height: 20 },
	l: {
		d: "M2 11 Q30 6, 58 9 Q90 12.5, 122 9 Q150 6.5, 174 10",
		viewBox: "0 0 176 16",
		width: 176,
		height: 16,
	},
} as const;

/**
 * Les glyphes : cercle d'annotation, étoile et cœur remplis à 15 % (admin),
 * et la flèche d'annotation.
 *
 * `arrow` avait été PURGÉ (lot 0, audit 2026-08-05 : zéro call site) puis
 * RÉ-INTRODUIT le 2026-08-06 avec son premier consommateur — l'indication
 * « Mes dernières créations » de `HeroHeading`, où il remplace une flèche
 * Phosphor géométrique au milieu d'un bloc entièrement dessiné main. Tracé
 * horizontal → droite (l'appelant tourne en CSS) : hampe légèrement ondulée
 * puis tête en V ouverte, même famille de geste que les chevrons de la
 * galerie (léger décrochage au coude).
 */
export const ACCENT_SHAPE_PATHS = {
	arrow: {
		d: "M2 11.5 Q11 9, 20 10.2 Q26.5 11.2, 32.5 10 M26.8 4.6 Q30.2 7.4, 33.4 10 Q30 12.8, 26.4 15.4",
		viewBox: "0 0 36 20",
		width: 36,
		height: 20,
	},
	circle: {
		d: "M40 5 Q75 2, 90 25 Q105 50, 85 70 Q65 90, 35 85 Q5 80, 5 50 Q5 20, 40 5",
		viewBox: "0 0 100 95",
		width: 100,
		height: 95,
	},
	star: {
		d: "M25 2 L30 18 L48 18 L34 28 L40 45 L25 35 L10 45 L16 28 L2 18 L20 18 Z",
		viewBox: "0 0 50 50",
		width: 50,
		height: 50,
	},
	heart: {
		d: "M25 45 Q5 30, 5 18 Q5 5, 15 5 Q25 5, 25 15 Q25 5, 35 5 Q45 5, 45 18 Q45 30, 25 45",
		viewBox: "0 0 50 50",
		width: 50,
		height: 50,
	},
} as const;

/**
 * Les quatre touches de pinceau du rail (StorefrontHeading / HeroHeading),
 * dans l'ordre de `RAIL_ACCENTS` (rose → lavande → menthe → soleil).
 * Longueurs inégales (33/45/27/39) et inclinaisons alternées — la régularité
 * est ce que la direction « Les quatre touches » remplace.
 * Repère : viewBox 176×12, l'encre (trait 5, arrondi) reste dans [2.5, 9.5].
 */
export const RAIL_STROKE_PATHS = [
	"M1 6.8 Q17 5.4 34 6.2",
	"M44 5.8 Q66.5 7.2 89 5.9",
	"M99 6.9 Q112.5 5.6 126 7.1",
	"M136 6.3 Q155.5 7.8 175 5.6",
] as const;

/** La touche unique d'une page fille — plus longue, même registre. */
export const RAIL_MONO_STROKE_PATH = "M2 6.6 Q88 5.2 174 6.8";

export const RAIL_VIEWBOX = "0 0 176 12";

/**
 * Le coup de pinceau — même main que le rail, en un seul geste plus long.
 *
 * UN seul consommateur aujourd'hui — le surligneur du mot « colorés »
 * (`brush-highlight.tsx`), où ce tracé vivait en constante locale. Il est monté
 * ici le 2026-08-06 pour un seconde consommateur (le « bouton peint » du CTA)
 * qui a été retiré le jour même, et il RESTE ici : ce fichier est la SSOT des
 * tracés, pas un registre des tracés partagés — `SQUIGGLE_PATH` et
 * `RAIL_MONO_STROKE_PATH` n'ont pas davantage de second appelant. C'est
 * « changer la main doit être UN fichier » qui décide, pas le nombre d'appels.
 *
 * ⚠️ Exporté en CHAÎNE NUE, comme {@link SQUIGGLE_PATH} et
 * {@link RAIL_MONO_STROKE_PATH}, et non en objet `{ d, viewBox, width, height }`
 * comme {@link UNDERLINE_PATHS} : ses deux consommateurs le rendent en
 * `preserveAspectRatio="none"` sur une boîte dont le ratio varie avec le texte
 * — l'épaisseur SUIT le corps, c'est le comportement recherché. Lui déclarer un
 * couple width/height le ferait entrer dans le périmètre de
 * `hand-drawn-accent-aspect-ratio.regression.test.ts`, qui exigerait un ratio
 * que ce tracé n'a précisément pas vocation à tenir.
 *
 * Repère : dessiné pour un viewBox `0 0 200 26`, l'encre oscille entre y=10 et
 * y=14 — c'est cette ondulation qui donne ses bords irréguliers à la surface
 * peinte, et elle disparaît si l'épaisseur atteint la hauteur du viewBox.
 */
export const BRUSH_STROKE_PATH = "M5 14 Q52 10 100 13 T195 12";

/** Le viewBox natif du coup de pinceau ci-dessus — cf. le repère de sa JSDoc. */
export const BRUSH_VIEWBOX = "0 0 200 26";

/**
 * Le fil de l'atelier (direction « Le fil », 2026-08-06 — le document qui la
 * portait a été supprimé ; le montage vivant est `atelier-thread.tsx` +
 * `app/styles/atelier-thread.css`)
 * — les tracés de la colonne enfilée de la section atelier, et EUX SEULS : la
 * plaque « sans photo » du portrait réutilise `ACCENT_SHAPE_PATHS` (pas de
 * tracé neuf sans besoin).
 *
 * - `tile` : LA TUILE DU FIL — le fil n'est plus une suite de segments logés
 *   dans les gaps, mais **un seul rail continu** obtenu en répétant cette
 *   tuile (`mask-repeat: repeat-y`, cf. `app/styles/atelier-thread.css` et
 *   `AtelierThreadRail`). Elle remplace `segmentA`/`segmentB`, dont
 *   l'alternance survit ici sous forme de DEUX périodes d'ondulation
 *   opposées dans un même tracé (24×192 = 2 × 96, la hauteur d'un segment).
 *
 *   Deux propriétés à ne pas casser en la retouchant, sinon le fil
 *   redevient des tirets :
 *   1. elle commence en `x 12, y 0` et finit en `x 12, y 192` — le raccord
 *      entre deux tuiles tombe donc pile, sans trou (l'empilement naïf des
 *      anciens segments, qui démarraient à `y 2` et mouraient à `y 94`,
 *      laissait 4 unités de vide toutes les 96) ;
 *   2. ses tangentes de raccord sont SYMÉTRIQUES (dernier point de contrôle
 *      `17 176` ↔ premier `7 16`, soit ±4 en x pour +16 en y) — la jointure
 *      est C1, le fil ne casse pas d'angle à chaque répétition.
 *
 *   ⚠️ Elle est consommée comme MASQUE (data-URI, encre noire) et non rendue
 *   en `<svg>` : l'encre vient du `background-color`, un `stroke="var(--…)"`
 *   ne traverse pas une data-URI.
 * - `sparkle` : l'étincelle, redensifiée au lot 0 de l'audit 14/20 du
 *   2026-08-06 (8 sous-traits aux rayons allongés de ~40 % ; les 6 courts
 *   d'origine tombaient à ~1,6:1 en rose sur carte blanche et disparaissaient
 *   au rendu). Seule rescapée des vignettes de geste, et son consommateur n'est
 *   plus la liste d'étapes mais la note en marge du tirage
 *   (`atelier-portrait.tsx`).
 *
 *   ⚠️ **`drop`, `heat` et `bow` ont été RETIRÉS le 2026-08-06** (direction
 *   « La pièce en cours », audit 13/20). C'étaient les timbres de geste des
 *   quatre étapes — étincelle = l'idée, goutte = la matière, chaleur = la
 *   cuisson, nœud-ruban = la finition —, c'est-à-dire **un pictogramme par
 *   étape** : le patron « comment ça marche » le plus répandu du web, tracé à
 *   la main. Ils sont remplacés par la PIÈCE à chaque étape, prise dans
 *   `CREATION_PATHS` (cf. `STEP_PIECES` dans `atelier-section.tsx`) — même
 *   arbitrage que le héros, qui a démoté le trio cœur·étoile·lune parce qu'il
 *   ne disait rien de ce que Synclune fabrique. Ne pas les réintroduire : la
 *   goutte vit déjà en `CREATION_PATHS.drop`, et les deux autres n'ont plus
 *   d'emploi qui ne soit pas une icône.
 * - `knot` : le nœud du fil après la quatrième note — devenu l'ATTACHE de la
 *   pampille (direction B « Le pendentif », audit 14/20 du 2026-08-06).
 * - `pendantStrings` : la BARRE de la pampille et ses 4 attaches, en UN tracé
 *   multi-sous-paths — un seul geste, comme l'étincelle ; hauteurs INÉGALES
 *   (10/18/9/12) voulues, symétrie imparfaite du lexique. Les gouttes
 *   suspendues, elles, sont `CREATION_PATHS.drop` (le présentoir du héros) :
 *   pas de tracé neuf quand la SSOT a déjà la forme.
 *
 *   ⚠️ **La barre n'est pas décorative, elle RACCROCHE.** Sans elle (état
 *   d'avant le 2026-08-06), les quatre attaches étaient quatre traits
 *   verticaux commençant dans le vide, à 36 unités de part et d'autre de l'axe
 *   du fil : le nœud pendait d'un côté, la pampille flottait de l'autre, et
 *   « l'attache » n'attachait rien — vérifié au zoom ×3. La barre culmine à
 *   `y 2` en `x 48,5`, soit **sur l'axe, juste sous l'encre du nœud** : c'est
 *   ce point-là que le nœud vient toucher. Les ordonnées de départ des quatre
 *   attaches sont MESURÉES sur la quadratique de la barre (2,2 · 2,3 · 4,4) —
 *   les reprendre au juger ferait décoller les brins de leur barre.
 *
 * Consommés par `atelier-thread.tsx` en `pathLength={1}` + `hand-draw-inview`
 * — un SVG par tracé (deux paths dans un même SVG se dessineraient d'un seul
 * geste ; un `d` multi-sous-paths est le geste unique ASSUMÉ, cf.
 * sparkle/heat). Seule `tile` fait exception : elle est un MASQUE, pas un
 * `<svg>`.
 */
export const ATELIER_THREAD_PATHS = {
	tile: {
		d: "M12 0 C7 16, 7 32, 12 48 C17 64, 17 80, 12 96 C7 112, 7 128, 12 144 C17 160, 17 176, 12 192",
		viewBox: "0 0 24 192",
		width: 24,
		height: 192,
	},
	sparkle: {
		d: "M24 4 Q24.8 11, 24 17 M24 31 Q23.2 38, 24 44.5 M4 24 Q11 23.2, 17 24 M31 24 Q38 24.8, 44.5 24 M9.5 9.5 Q13.5 13, 17.5 17 M30.5 30.5 Q34 34, 38.5 38.5 M30.5 17.5 Q34 14, 38 10 M9.8 38 Q13.5 34.5, 17.3 30.7",
		viewBox: "0 0 48 48",
		width: 48,
		height: 48,
	},
	knot: {
		d: "M5 9 Q15 3.5, 21.5 9 Q27 14, 21 19 Q15 23.5, 11.5 18.5 Q8.5 13.5, 15.5 11.5 Q23 9.5, 27 16.5",
		viewBox: "0 0 32 32",
		width: 32,
		height: 32,
	},
	pendantStrings: {
		d: "M12 4 Q48 0, 86 4 M12 4.4 Q11.3 9, 12 14 M38 2.2 Q38.7 11, 38 20 M62 2.3 Q61.4 6.5, 62 11 M86 4.4 Q86.6 9, 86 16",
		viewBox: "0 0 96 26",
		width: 96,
		height: 26,
	},
} as const;

/**
 * Le présentoir de l'étal — les QUATRE créations principales de Synclune, redessinées
 * à la main. Écrite pour le décor du premier écran (`hero-creations.tsx`, supprimé le
 * 2026-08-07), la collection sert aujourd'hui la carte de partage
 * (`app/opengraph-image.tsx`) et, tracé par tracé, l'atelier et la FAQ — les surfaces
 * où il n'y a rien à photographier.
 *
 * ## Pourquoi cette collection existe, et ce qu'elle représente
 *
 * Refonte du 2026-08-06 (audit de fidélité produit, photos Etsy en main) : la version
 * précédente suspendait une grappe pastel, une cascade verticale, un médaillon lunaire,
 * un œil et un cœur — deux créations inventées, et les vraies rendues méconnaissables
 * (la bague peinte réduite à un médaillon, le collier arc-en-ciel à une pampille).
 * Cette collection décrit les VRAIS produits, relus sur leurs photos :
 *
 * - le ras-de-cou aux raisins verts (ruban de velours sombre, grand anneau doré
 *   ovale, grappe de poires vertes irisées, feuille de verre côtelée) ;
 * - les boucles aux raisins orange (créole dorée, grappe longue de gouttes de verre
 *   translucides, feuille verte) ;
 * - le collier arc-en-ciel (chaîne câble dorée à maillons ronds, bordée de petites
 *   gouttes multicolores sur ses deux tiers inférieurs) ;
 * - la bague Nuit étoilée (monture dorée fine, cabochon ovale vertical peint :
 *   architecture bleue, porte sombre en arche, rosette tourbillonnante).
 *
 * Le motif tenu reste **la goutte** — elle est le raisin ({@link berry} n'est qu'une
 * goutte mûrie), la pampille et l'arc-en-ciel ; le cabochon est le pôle « peinture ».
 * L'œil, le croissant et l'étoile molle sont partis avec les créations inventées
 * qu'ils composaient (leurs tracés restent dans l'historique git).
 *
 * ## Contrat de boîte
 *
 * Sauf `cord`, ces tracés sont posés par `transform="translate(…) scale(…) rotate(…)"`
 * DANS le `<svg>` de la scène, jamais rendus en SVG autonome : leurs width/height sont
 * la BOÎTE que l'encre occupe à l'échelle 1, et le calcul de pose lit l'ancre en
 * coordonnées natives avant de la mettre à l'échelle. Une boîte au ratio faux ne
 * letterboxe donc pas, elle DÉCALE — et l'erreur est multipliée par les 9 réemplois
 * d'une même goutte. `hand-drawn-accent-aspect-ratio.regression.test.ts` scanne cette
 * collection comme les autres.
 *
 * ⚠️ `cord` est de la DONNÉE pour le call site, au même titre que l'ex-`thread` :
 * chaque pièce y est accrochée par une ordonnée MESURÉE sur le tracé. Le retoucher
 * sans reprendre les points d'accroche ferait pendre les pièces dans le vide — c'est
 * ce que vérifie `shared/components/hand-drawn/__tests__/creations-scene.test.ts`,
 * qui ré-évalue les quadratiques.
 * Son `d` doit donc rester `M x y` suivi de groupes `Q cx cy x y` à abscisse
 * strictement croissante : le parseur du test avance par pas de 4, un `T` ou un `C`
 * s'y découperait en segments fantaisistes et « prouverait » n'importe quoi.
 *
 * ⚠️ Il y avait un `cordCompact` (108 × 20) pour la scène compacte du premier
 * écran : retiré le 2026-08-07 avec le décor, faute de consommateur. Le délai
 * d'entrée dérivé de la fraction d'abscisse est parti avec lui — la carte OG, seul
 * consommateur restant, est une image FIXE.
 */
export const CREATION_PATHS = {
	/**
	 * Le cordon de présentation — attaché hors champ des deux côtés, creux vers
	 * x 210. Un cordon d'étal, pas une guirlande de fanions. Plus tendu que sa
	 * version d'avant (creux à 26, pas 30) : la rivière de gouttes du collier
	 * arc-en-ciel a besoin de ces unités de hauteur en bas de scène.
	 */
	cord: {
		d: "M6 8 Q114 24 210 26 Q306 28 414 5",
		viewBox: "0 0 420 32",
		width: 420,
		height: 32,
	},
	/**
	 * LA goutte — le signe transversal de la marque. Pointe en haut (elle pend, et
	 * c'est aussi par là qu'un grain s'attache à sa rafle), ventre bas et plein.
	 * Réemployée en poire de la grappe verte, en goutte de verre orange et en
	 * pampille du collier arc-en-ciel.
	 */
	drop: {
		d: "M20 2 Q29 16 34.5 27 Q39.5 40 20 47 Q0.5 40 5.5 27 Q11 16 20 2 Z",
		viewBox: "0 0 40 48",
		width: 40,
		height: 48,
	},
	/**
	 * La goutte étirée — la goutte TERMINALE d'une grappe, nettement plus longue que
	 * ses voisines (lu sur la photo des boucles orange : la dernière goutte pend
	 * seule, allongée). Une goutte standard agrandie ne suffit pas : elle grossit en
	 * largeur autant qu'en longueur et cesse de se distinguer.
	 */
	dropLong: {
		d: "M17 2 Q23.5 16 27 29 Q30.5 44 17 50 Q3.5 44 7 29 Q10.5 16 17 2 Z",
		viewBox: "0 0 34 52",
		width: 34,
		height: 52,
	},
	/**
	 * La goutte mûrie en grain — même famille, contour volontairement bancal (aucun
	 * de ses quatre quadrants n'a le même rayon). Mélangée aux poires ({@link drop})
	 * dans la grappe verte : les perles de la photo n'ont pas toutes la même forme.
	 */
	berry: {
		d: "M17 2 Q27 3.5 30.5 13 Q33 23 23.5 29.5 Q13 35 5.5 27 Q0.5 19 4 10 Q7.5 2.5 17 2 Z",
		viewBox: "0 0 34 34",
		width: 34,
		height: 34,
	},
	/**
	 * La feuille de verre pressé — la MÊME pièce sur les deux grappes (photos : olive
	 * translucide sur le ras-de-cou, vert vif sur la créole), donc UN tracé décliné
	 * par la couleur et la pose, jamais deux silhouettes. Base large à gauche, pointe
	 * effilée à droite ; ses côtes vivent dans {@link leafRibs}, même boîte.
	 */
	leaf: {
		d: "M2 12.5 Q5.5 4 15 2.4 Q27 1 38 4.2 Q29.5 14 16.5 17.2 Q5.5 19 2 12.5 Z",
		viewBox: "0 0 40 20",
		width: 40,
		height: 20,
	},
	/**
	 * Les côtes de la feuille — une nervure d'épine et QUATRE côtes parallèles, le
	 * relief moulé du verre pressé (très lisible sur les deux photos, où la feuille
	 * est striée comme une plume). Même boîte que {@link leaf} : les deux tracés se
	 * posent avec la même transformation, ou les côtes sortent de la feuille.
	 */
	leafRibs: {
		d: "M4 12 Q16 10 35 5 M10 4.5 Q11.5 8.5 10.5 13.5 M16 3.4 Q18 7.5 17 14.8 M22.5 2.6 Q24.5 6.5 23.5 13.2 M29 2.2 Q30.5 5.5 30 10.5",
		viewBox: "0 0 40 20",
		width: 40,
		height: 20,
	},
	/**
	 * L'anneau de suspension — OUVERT, comme un vrai anneau de bijoutier. C'est le
	 * détail qui distingue « suspendu » de « posé sur une courbe », et il sert aussi
	 * d'anneau de raccord entre créole et grappe.
	 */
	ring: {
		d: "M8 14.5 Q2 12 1.5 7.5 Q1 2.5 7 1.5 Q13.5 1 14.5 6 Q15.2 10.5 10 13.5",
		viewBox: "0 0 16 16",
		width: 16,
		height: 16,
	},
	/**
	 * Le grand anneau du ras-de-cou — l'ovale doré VERTICAL qui relie le ruban de
	 * velours à la grappe (photo : une vraie pièce de métal, bien plus grande qu'un
	 * anneau d'assemblage). Presque fermé, jamais parfait.
	 */
	ovalRing: {
		d: "M8 2.2 Q13.6 3.4 14 11 Q14.2 18.6 8 19.8 Q1.9 18.4 2 10.8 Q2.2 3.4 8 2.2",
		viewBox: "0 0 16 22",
		width: 16,
		height: 22,
	},
	/**
	 * La créole — le fin cercle de fil d'or par lequel la boucle d'oreille EST une
	 * boucle d'oreille. Le second sous-chemin est le décroché de la charnière, seul
	 * indice qu'elle s'ouvre.
	 */
	hoop: {
		d: "M11 2.3 Q19.6 3.6 20.2 12.4 Q20.4 20.8 11 21.8 Q1.7 20.7 1.8 12 Q1.9 3.9 9.4 2.4 M5.9 4.3 Q7.4 3.2 9.2 2.7",
		viewBox: "0 0 22 24",
		width: 22,
		height: 24,
	},
	/**
	 * L'anneau de la bague — la monture vue de face, un rond tracé d'un geste (donc
	 * pas rond). Dessiné AVANT le cabochon, qui recouvre son arc inférieur : c'est ce
	 * chevauchement qui fait lire « le métal passe derrière la pierre ».
	 */
	bandRing: {
		d: "M15 1.8 Q26.4 3.4 28.1 15 Q28.4 26.2 15.4 28.3 Q3.2 26.8 2 15 Q1.8 4 15 1.8",
		viewBox: "0 0 30 30",
		width: 30,
		height: 30,
	},
	/**
	 * Le cabochon — un ovale de guingois, le cadre du tableau miniature. Ni cercle
	 * ni ellipse : un sertissage fait main n'a pas d'axe de symétrie.
	 */
	cabochon: {
		d: "M22 3 Q36 5.5 40 20 Q43.5 37 28 50.5 Q16.5 56.5 8 45 Q1 33 4.5 18.5 Q8.5 5 22 3 Z",
		viewBox: "0 0 44 56",
		width: 44,
		height: 56,
	},
	/**
	 * La rosette peinte — le soleil-tourbillon de la Nuit étoilée, une spirale de
	 * deux tours qui s'enroule vers son centre (haut-gauche du cabochon sur la
	 * photo). Ouverte, jamais remplie : c'est de la peinture posée sur le ciel.
	 */
	rosette: {
		d: "M12.5 3.5 Q19.5 4.5 20.5 11.5 Q21 18.5 13.5 19.8 Q6.5 20.5 5.2 13.5 Q4.2 7.5 10.5 6.5 Q16 5.8 16.5 11 Q16.8 15 12.5 15.6",
		viewBox: "0 0 24 24",
		width: 24,
		height: 24,
	},
	/**
	 * La volute peinte — deux coups de pinceau du ciel, filiation Van Gogh / Monet.
	 * Le complément diagonal de la rosette, jamais rempli.
	 */
	swirl: {
		d: "M1.5 18 Q6 6 15.5 8 Q24 10 21 16 Q17.5 21.5 12.5 17 Q9.5 14 13.5 11.5 M23 20 Q27 15 30.5 17",
		viewBox: "0 0 32 24",
		width: 32,
		height: 24,
	},
	/**
	 * Le corps de la chapelle — la façade peinte, un quadrilatère qui ne s'emboîte
	 * pas parfaitement : de la peinture naïve, pas de l'architecture isométrique.
	 */
	chapel: {
		d: "M3.4 3.2 Q12 1.4 20.6 3 L21.2 20.4 Q12 21.6 2.9 20.6 Z",
		viewBox: "0 0 24 22",
		width: 24,
		height: 22,
	},
	/**
	 * Le toit — un triangle mou au dessous concave, posé de guingois sur la façade.
	 */
	chapelRoof: {
		d: "M2 12.6 Q14 0.9 26 11.8 Q14 7.6 2 12.6 Z",
		viewBox: "0 0 28 14",
		width: 28,
		height: 14,
	},
	/**
	 * La porte en arche — le repère essentiel de la bague (photo : deux ouvertures
	 * presque noires, une par volume). Fermée pour recevoir son aplat bleu nuit.
	 */
	archDoor: {
		d: "M1.7 13.2 L1.5 6.6 Q4.9 0.9 8.4 6.4 L8.6 13.2 Q5.1 13.9 1.7 13.2 Z",
		viewBox: "0 0 10 14",
		width: 10,
		height: 14,
	},
	/**
	 * Le second volume — le petit bâtiment au toit arrondi, à droite de la chapelle.
	 */
	annex: {
		d: "M2.3 13.5 L2.1 6.9 Q8 1 13.9 6.7 L14.2 13.3 Q8.1 14.5 2.3 13.5 Z",
		viewBox: "0 0 16 15",
		width: 16,
		height: 15,
	},
	/**
	 * Les vagues du bas du tableau — deux lignes ondulées superposées, le sol-nuage
	 * qui court sous les bâtiments de la photo.
	 */
	waves: {
		d: "M1.5 6.2 Q8 2.6 15.5 5.6 Q23 8.6 30.5 4.6 M4 10 Q12 7 20 9.2 Q25.5 10.6 29.5 8.8",
		viewBox: "0 0 32 12",
		width: 32,
		height: 12,
	},
	/**
	 * La touche de peinture — un point de pinceau rond et bancal, rendu SANS contour
	 * (à 3 px, un cerne mangerait la forme). Les « étoiles » de la Nuit étoilée sont
	 * exactement ça : des touches, pas des glyphes d'étoile.
	 */
	dab: {
		d: "M4.2 1.1 Q6.9 1.7 7 4.1 Q6.8 6.7 4 7 Q1.3 6.5 1.2 4 Q1.5 1.7 4.2 1.1 Z",
		viewBox: "0 0 8 8",
		width: 8,
		height: 8,
	},
	/**
	 * Le reflet — l'arc de lumière posé sur une matière translucide. C'est le seul
	 * élément qui respire en boucle (`sky-twinkle`), et ça suffit : « un reflet qui
	 * traverse ponctuellement une goutte » plutôt qu'un décor qui clignote.
	 */
	glint: {
		d: "M1.5 10 Q3 3.5 9.5 1.5 Q13 0.8 14.5 3",
		viewBox: "0 0 16 12",
		width: 16,
		height: 12,
	},
} as const;

/**
 * Le squiggle des cartes — l'AFFORDANCE de lien (hover/focus), pas un ornement
 * de titre : il garde son déclencheur et son dash en unités utilisateur dans
 * `squiggle-underline.tsx` ; seul le tracé vit ici.
 */
export const SQUIGGLE_PATH = "M2 7 Q 16 2, 30 6 T 56 5 T 82 6";

/**
 * Les chevrons de la galerie — tracés volontairement irréguliers (léger
 * décrochage au coude), la seule « reprise de trait » du vocabulaire avant la
 * direction C.
 */
export const CHEVRON_LEFT_PATH =
	"M16.1 4.4 Q10.1 7.6 8.5 11.2 Q8 12.5 8.9 13.6 Q11.4 17.1 15.4 19.7";
export const CHEVRON_RIGHT_PATH =
	"M7.9 4.4 Q13.9 7.6 15.5 11.2 Q16 12.5 15.1 13.6 Q12.6 17.1 8.6 19.7";
