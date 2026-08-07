import type { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { CREATION_PATHS } from "@/shared/components/hand-drawn/paths";

/**
 * Le présentoir — les QUATRE créations principales de Synclune, la DONNÉE de la
 * carte de partage `app/opengraph-image.tsx`.
 *
 * ⚠️ **Ce module n'a plus qu'UN consommateur depuis le 2026-08-07**, et ce n'est
 * plus celui pour lequel il a été écrit : le décor a quitté le premier écran
 * (`hero-creations.tsx` supprimé — le § en bas de `hero-heading.tsx` dit
 * pourquoi : un dessin de bijoux à côté de PHOTOS de bijoux). La scène vit
 * désormais là où elle n'a aucune photo en face, sur la carte OG, et c'est là
 * qu'elle est juste. Conséquence pratique : plus aucun rendu navigateur ne la
 * montre au quotidien — sa seule surveillance est
 * `__tests__/creations-scene.test.ts` (données) et le rendu Satori.
 *
 * @description
 * Refonte du 2026-08-06, photos Etsy en main : la scène précédente suspendait deux
 * créations inventées (l'œil qui pleure, la breloque cœur) et travestissait les
 * vraies — la bague Nuit étoilée rendue en médaillon lunaire, le collier arc-en-ciel
 * en pampille verticale, la grappe en amas de pastilles pastel. Cette scène-ci
 * représente les produits RÉELS, chacun avec sa construction propre :
 *
 * - **le ras-de-cou aux raisins verts** — ruban de velours vert-noir tendu entre
 *   deux anneaux du cordon, grand anneau doré ovale, grappe compacte de poires
 *   vertes irisées, feuille de verre côtelée ;
 * - **la bague Nuit étoilée** — pendue par son propre anneau de monture, cabochon
 *   ovale vertical peint (architecture bleue, porte sombre en arche, rosette
 *   tourbillonnante, vagues) — le point focal : elle incarne « Je peins chaque
 *   pièce à la main » ;
 * - **les boucles aux raisins orange** — créole dorée accrochée à même le cordon,
 *   grappe longue de gouttes de verre translucides, feuille verte vive ;
 * - **le collier arc-en-ciel** — l'élément horizontal structurant : chaîne câble
 *   dorée tendue entre les deux extrémités du cordon, qui plonge en U SOUS les
 *   trois autres pièces, bordée de petites gouttes multicolores sur son ventre
 *   (les deux tiers inférieurs de la courbe, comme sur la photo).
 *
 * Ce module ne rend rien : il décrit OÙ chaque trace se pose. Il vit à côté de
 * `paths.ts`, dont il consomme les tracés — le rendu, lui, est sérialisé par
 * `shared/components/og/og-marks.ts`.
 *
 * ## Un repère par pièce, l'origine au POINT D'ACCROCHE
 *
 * Chaque pièce est décrite dans son propre repère, origine (0,0) = le point du cordon
 * où elle s'accroche, y vers le bas. Le composant n'a plus qu'à ajouter l'abscisse de
 * la pièce et l'ordonnée MESURÉE du cordon à cette abscisse. Les pièces à DEUX points
 * d'accroche (ruban, chaîne) posent leur second anneau en coordonnées relatives —
 * son ordonnée est elle aussi mesurée sur le cordon, et vérifiée par le test.
 *
 * ## La grammaire des matières — plus une seule encre pour tout
 *
 * L'audit de fidélité a nommé le défaut de la scène d'avant : « tout semble construit
 * dans le même aplat violet, les objets ressemblent à des pictogrammes ». Chaque
 * matière a désormais son registre :
 *
 * - **métal doré** (chaîne, anneaux, créole, monture) : trait d'encre OR, pas
 *   d'aplat, reflets ponctuels clairs ;
 * - **verre translucide** (gouttes orange, gouttes arc-en-ciel) : aplat coloré à
 *   opacité PARTIELLE (0,55–0,8) — les chevauchements foncent d'eux-mêmes, c'est le
 *   verre qui se voit à travers le verre — contour d'un ton plus profond ;
 * - **verre irisé nacré** (raisins verts) : aplats denses (0,88–1) de verts voisins,
 *   petits reflets jaune-vert et une touche dorée ;
 * - **velours** (ruban) : aplat mat plein, presque noir, aucun reflet dur, un seul
 *   liseré plus vert sur le bord ;
 * - **peinture** (cabochon) : traits et touches aux couleurs du tableau, jamais
 *   l'encre du décor.
 *
 * L'encre lavande du site ne subsiste que sur les éléments d'ÉDITORIAL — le cordon
 * du présentoir et le fil de suspension — exactement le rôle de « contour de
 * liaison » que la DA lui donne.
 *
 * ⚠️ **Toutes les couleurs sont des HEX sRGB, jamais des tokens.** Deux raisons qui
 * n'en font qu'une : Satori (la carte OG) ignore `var(--…)` et `oklch()` EN SILENCE,
 * et ces teintes sont celles des bijoux photographiés, pas celles de l'interface —
 * les rabattre sur la palette pastel des sections est précisément le défaut corrigé
 * ici (« les couleurs ne doivent pas être recouvertes par un filtre pastel
 * uniforme »). Valeurs décoratives mono-usage : le critère d'admission des tokens
 * (`CLAUDE.md`) les veut au call site, pas dans `globals.css`.
 *
 * ## Pourquoi `size` et pas `scale`
 *
 * Une trace déclare la largeur qu'elle doit OCCUPER en unités de scène ; l'échelle en
 * dérive. On ne peut pas écrire un facteur qui ne correspond à rien, et remplacer un
 * tracé par un autre de boîte différente ne change pas la taille rendue.
 *
 * ⚠️ Corollaire à ne jamais perdre : un `scale()` SVG met aussi l'ENCRE à l'échelle.
 * La graisse locale d'une trace est donc son cran NOMMÉ divisé par son facteur, pour
 * que l'épaisseur RENDUE vaille exactement le cran. C'était vérifié au RENDU par
 * `hero-creations.test.tsx` (supprimé avec le décor) ; côté OG, c'est `og-marks.ts`
 * qui applique la division — sa sortie est désormais surveillée par
 * `__tests__/creations-scene.test.ts`.
 */

type Ink = keyof typeof HAND_DRAWN_STROKES;

export type CreationMark = {
	/** Le `d` du tracé. */
	d: string;
	/**
	 * Boîte native du tracé — ce qui convertit `size` en facteur d'échelle.
	 * `null` : le `d` est DÉJÀ écrit dans le repère de la pièce (ruban, chaîne,
	 * fil, touches de ciel — les géométries propres à UNE pose), donc posé par une
	 * simple translation.
	 */
	native: { width: number; height: number } | null;
	/** Le point du tracé natif qui se pose en (`x`,`y`). Défaut : le centre de la boîte. */
	anchor?: readonly [number, number];
	/** Position du point d'ancrage, dans le repère de la pièce. */
	x?: number;
	y?: number;
	/** Largeur rendue voulue, en unités de scène. Requis dès que `native` existe. */
	size?: number;
	/** Balancement autour du point d'ancrage, en degrés. */
	rotate?: number;
	/** Cran de graisse. Absent = trace SANS contour (elle n'existe que par son aplat). */
	ink?: Ink;
	/**
	 * Couleur du contour, en HEX sRGB — le registre de MATIÈRE (or, encre de raisin,
	 * peinture…). Absent avec `ink` présent : l'encre lavande de liaison (classe côté
	 * site, `BRAND_HEX.lavender` côté OG) — réservée au cordon et aux fils.
	 */
	inkColor?: string;
	/** Teinte de l'aplat, en HEX sRGB. Absent = `fill="none"`. */
	fill?: string;
	/**
	 * Opacité de l'aplat (`--hand-fill-opacity`), défaut 1. C'est ICI que se joue la
	 * TRANSLUCIDITÉ du verre : une goutte à 0,65 laisse voir celle qu'elle chevauche
	 * et la chaîne qui passe derrière. Aucun CSS neuf — c'est la variable que la
	 * phase fill de `hand-draw` lit déjà.
	 */
	fillOpacity?: number;
	/** `data-slot`, pour les traces que les tests doivent retrouver. */
	slot?: string;
	/** Cette trace respire en boucle (`sky-twinkle`). Réservé aux REFLETS. */
	twinkle?: boolean;
};

export type CreationPiece = {
	key: string;
	/** Abscisse du PREMIER point d'accroche sur le cordon. */
	x: number;
	/**
	 * Ordonnée du CORDON à cette abscisse — mesurée sur `CREATION_PATHS.cord`, jamais
	 * choisie à l'œil. Une pièce dont l'ordonnée ne suit plus le cordon pend dans le
	 * vide, et c'est invisible sur une capture d'écran de 140 px de haut.
	 */
	y: number;
	marks: CreationMark[];
};

/**
 * La boîte de la scène — SSOT consommée par `og-marks.ts`. C'est en recopiant ces
 * valeurs à la main que la carte OG avait rendu une scène coupée à la hauteur du
 * CORDON (36) au lieu de celle de la SCÈNE.
 *
 * ⚠️ Il y en avait DEUX (`CREATION_COMPACT_BOX`, 108 × 140) : la scène compacte
 * qu'elle bornait est partie le 2026-08-07 avec le décor du premier écran, faute
 * de consommateur.
 */
export const CREATION_SCENE_BOX = { width: 420, height: 112 } as const;

const { drop, dropLong, berry, leaf, leafRibs, ring, ovalRing, hoop, bandRing, cabochon } =
	CREATION_PATHS;
const { rosette, swirl, chapel, chapelRoof, archDoor, annex, waves, dab, glint } = CREATION_PATHS;

// ---------------------------------------------------------------------------
// La palette des matières — HEX sRGB uniquement (cf. la JSDoc de module).
// Relevée sur les photos produit, pas sur les tokens de l'interface.
// ---------------------------------------------------------------------------

/** Le métal doré de TOUS les apprêts (chaîne, anneaux, créole, monture de la bague). */
const GOLD = "#b8892e";
/** Le reflet du métal — et la touche chaude qui irise un raisin vert. */
const GOLD_GLINT = "#ecd391";
/** Le sertissage du cabochon — un doré plus sombre, métal vieilli de la photo. */
const BRONZE = "#8a682a";

/** Le velours du ras-de-cou : vert forêt presque noir, mat, dense. */
const VELVET = "#1f2e21";
const VELVET_INK = "#131f15";
/**
 * Le liseré du ruban — « légèrement plus vert sur ses bordures », pas un reflet.
 * Un cran plus clair que la version d'origine (#4a6338) : sur l'aplat #1f2e21,
 * elle était illisible à 1× — le velours relisait « barre noire » (audit 2026-08-06).
 */
const VELVET_EDGE = "#6a8a52";

/** L'encre des raisins verts — plus sombre que la plus sombre des baies. */
const GRAPE_INK = "#1c3324";
/** Le reflet irisé jaune-vert des baies nacrées. */
const GRAPE_GLOW = "#b9d77d";
/**
 * Verts voisins, mais à VALEURS écartées : les six teintes d'origine vivaient
 * toutes entre L≈25 et 45 % et la grappe s'écrasait en masse sombre à 1,27
 * px/unité (audit 2026-08-06) — emerald, olive et moss remontent d'un cran,
 * bottle/forest/deep restent les ombres. Le relief est dans l'écart.
 */
const GRAPE = {
	bottle: "#3c6b4b",
	forest: "#2d5940",
	emerald: "#4da26e",
	olive: "#7d9048",
	moss: "#5c8153",
	deep: "#26422f",
} as const;

/** La feuille de verre pressé du ras-de-cou — olive, satinée. */
const LEAF_OLIVE = "#7c8f3a";
const LEAF_OLIVE_INK = "#46581f";
/** La même feuille sur la créole — vert vif, plus translucide. */
const LEAF_VIVID = "#4ca336";
const LEAF_VIVID_INK = "#2c6e23";

/**
 * L'encre unique des gouttes orange — les fills varient, le cerne est commun.
 * Un cran plus profond que la version d'origine (#a63c0c), trop proche de l'or
 * de la chaîne (#b8892e) : aux croisements rivière/grappe, les cernes se
 * confondaient (audit 2026-08-06).
 */
const ORANGE_INK = "#8f3208";
const ORANGE = {
	mandarin: "#f47a1f",
	red: "#e8500f",
	amber: "#f29e38",
	vermilion: "#dd3d10",
} as const;
/** Le reflet blanc-crème des gouttes juteuses (très marqué sur la photo). */
const ORANGE_GLINT = "#ffedd2";

/** Le fond du cabochon — le ciel bleu moyen sous les coups de pinceau. */
const RESIN_SKY = "#8fa8d6";
const PAINT_COBALT = "#31519f";
/** La porte en arche — presque noire, LE repère de la création. */
const PAINT_NIGHT = "#16223d";
/** Son contour « bleu plus clair » (photo : chaque arche est cerclée de pâle). */
const PAINT_NIGHT_EDGE = "#c4d3ea";
const PAINT_PALE = "#cfdcef";
/**
 * Le toit — un cran plus sombre que sa version d'origine (#b7c6e4) : sur la
 * façade #cfdcef posée sur le ciel #8fa8d6, la chapelle perdait son toit à 1×
 * et le tableau relisait « deux yeux » (audit 2026-08-06).
 */
const PAINT_ROOF = "#9db3dd";
/** Les vagues-nuages du bas — turquoise pâle. */
const PAINT_CLOUD = "#79aeb6";
/** La rosette et les herbes — le jaune-vert olive du tourbillon de la photo. */
const PAINT_MEADOW = "#8a9a3e";
const PAINT_SUNNY = "#d9c95e";
/** Le reflet de la résine bombée. */
const RESIN_GLINT = "#eef4fd";

/**
 * Les couleurs du collier arc-en-ciel — cycle VIVANT relevé sur la photo (rose,
 * turquoise, péridot, ambre, ciel, vert, jaune, lilas, orange), jamais l'ordre
 * spectral d'un arc-en-ciel scolaire. Chaque verre a son contour d'un ton plus
 * profond ; la répétition du cycle sur ~20 gouttes fait la « rivière ».
 */
const RAINBOW_GLASS = [
	{ fill: "#f6a9d0", ink: "#c9558f" },
	{ fill: "#5cc4b6", ink: "#2b8d80" },
	{ fill: "#b5c353", ink: "#7c8b26" },
	{ fill: "#eda63d", ink: "#b06f14" },
	{ fill: "#8fc0ea", ink: "#4a7fc0" },
	{ fill: "#8ecb72", ink: "#4f9440" },
	{ fill: "#f2d268", ink: "#bb9426" },
	{ fill: "#bfa5ec", ink: "#7d5cc4" },
	{ fill: "#ef7f34", ink: "#bc4f10" },
] as const;

// ---------------------------------------------------------------------------
// Géométrie de chaîne — calculée, jamais recopiée
// ---------------------------------------------------------------------------

type Quad = {
	from: readonly [number, number];
	via: readonly [number, number];
	to: readonly [number, number];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Points régulièrement espacés en LONGUEUR D'ARC le long d'une suite de
 * quadratiques — les centres des maillons. Un espacement en abscisse tasserait
 * les maillons dans les pentes du U ; l'abscisse curviligne les garde réguliers,
 * comme une vraie chaîne.
 */
function alongQuads(quads: readonly Quad[], spacing: number): (readonly [number, number])[] {
	const samples: [number, number][] = [];
	for (const { from, via, to } of quads) {
		for (let step = 0; step <= 64; step++) {
			const t = step / 64;
			const u = 1 - t;
			samples.push([
				u * u * from[0] + 2 * u * t * via[0] + t * t * to[0],
				u * u * from[1] + 2 * u * t * via[1] + t * t * to[1],
			]);
		}
	}

	const points: (readonly [number, number])[] = [];
	let travelled = 0;
	let next = spacing / 2;
	for (let index = 1; index < samples.length; index++) {
		const [x0, y0] = samples[index - 1]!;
		const [x1, y1] = samples[index]!;
		const step = Math.hypot(x1 - x0, y1 - y0);
		while (step > 0 && travelled + step >= next) {
			const f = (next - travelled) / step;
			points.push([round2(x0 + f * (x1 - x0)), round2(y0 + f * (y1 - y0))]);
			next += spacing;
		}
		travelled += step;
	}
	return points;
}

/**
 * La chaîne câble : un maillon = un petit anneau, posés bout à bout — le `d` est un
 * sous-chemin par maillon, donc `pathLength={1}` l'enfile maillon APRÈS maillon.
 *
 * ⚠️ Seule entorse assumée au « pas de cercle parfait » : les arcs `a` sont
 * géométriques, mais un maillon de chaîne est la seule chose MANUFACTURÉE du bijou
 * (la photo montre des maillons ronds identiques), il fait 5 unités, et le rayon
 * alterne d'un maillon à l'autre — la régularité est ici la fidélité, pas un défaut.
 */
function chainLinksPath(centers: readonly (readonly [number, number])[]): string {
	return centers
		.map(([x, y], index) => {
			const r = index % 2 === 0 ? 2.55 : 2.3;
			return `M${round2(x - r)} ${y}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0`;
		})
		.join("");
}

// ---------------------------------------------------------------------------
// LE COLLIER ARC-EN-CIEL — l'élément horizontal structurant
// ---------------------------------------------------------------------------

/**
 * La rivière de gouttes : chaîne câble dorée tendue entre deux anneaux du cordon,
 * qui plonge en U sous les autres pièces ; les gouttes ne bordent que son VENTRE
 * (`dropZone`) — « la moitié inférieure ou les deux tiers inférieurs de la courbe »,
 * jamais les épaules, qui restent en chaîne nue comme sur la photo.
 *
 * Les gouttes sont posées sur les CENTRES DE MAILLONS (un sur deux) : elles pendent
 * exactement de la chaîne, par construction — l'équivalent, pour la chaîne, de
 * l'ordonnée mesurée sur le cordon.
 *
 * ⚠️ Ordre des traces : anneau proche → chaîne → gouttes (gauche → droite) → reflets
 * → anneau LOINTAIN EN DERNIER. Son abscisse est à ~95 % du cordon : dessiné à son
 * rang naturel (index 2), il apparaîtrait ~350 ms AVANT que la pointe du cordon
 * l'atteigne — un anneau accroché dans le vide, le défaut exact que la chronologie
 * du test interdit aux pièces.
 */
function riviere(options: {
	farRing: readonly [number, number];
	quads: readonly Quad[];
	spacing: number;
	dropZone: readonly [number, number];
	maxDrops: number;
	ringSize: number;
}): CreationMark[] {
	const centers = alongQuads(options.quads, options.spacing);
	const carriers = centers
		.filter(([x]) => x >= options.dropZone[0] && x <= options.dropZone[1])
		.filter((_, index) => index % 2 === 0)
		.slice(0, options.maxDrops);

	// Tables de variation artisanale — cycles premiers entre eux (10 vs 9) : deux
	// gouttes de même couleur n'ont jamais ni la même taille ni la même inclinaison.
	const sizes = [6.8, 7.6, 6.3, 7.2, 6.6, 7.9, 6.4, 7.4, 6.9, 7.7];
	const tilts = [-9, 7, -5, 10, -11, 5, -7, 9, -4, 8];
	const opacities = [0.8, 0.68, 0.86, 0.72, 0.78, 0.65, 0.82, 0.7, 0.76, 0.66];

	return [
		{
			d: ring.d,
			native: ring,
			anchor: [8, 2],
			size: options.ringSize,
			ink: "fin",
			inkColor: GOLD,
			slot: "ring",
		},
		{
			d: chainLinksPath(centers),
			native: null,
			ink: "fin",
			inkColor: GOLD,
			slot: "chain",
		},
		...carriers.map(([x, y], index): CreationMark => ({
			d: drop.d,
			native: drop,
			// La pointe de la goutte — c'est par elle qu'elle pend au maillon.
			anchor: [20, 2],
			x,
			y: round2(y + 2),
			size: sizes[index % sizes.length]!,
			rotate: tilts[index % tilts.length]!,
			ink: "fin",
			inkColor: RAINBOW_GLASS[index % RAINBOW_GLASS.length]!.ink,
			fill: RAINBOW_GLASS[index % RAINBOW_GLASS.length]!.fill,
			fillOpacity: opacities[index % opacities.length]!,
		})),
		// « Des reflets sur une partie seulement des gouttes » — trois arcs posés sur
		// les gouttes du CREUX, les plus visibles. À 3,4–3,8 unités (≈ 4,5 px rendus),
		// la version d'origine n'existait qu'au zoom (audit 2026-08-06).
		...[4, 9, 14]
			.filter((index) => index < carriers.length)
			.map((index, order): CreationMark => ({
				d: glint.d,
				native: glint,
				x: round2(carriers[index]![0] - 1),
				y: round2(carriers[index]![1] + 5.4),
				size: 5 - order * 0.25,
				rotate: -14 + order * 3,
				ink: "fin",
				inkColor: "#fbf7ec",
			})),
		{
			d: ring.d,
			native: ring,
			anchor: [8, 2],
			x: options.farRing[0],
			y: options.farRing[1],
			size: options.ringSize,
			ink: "fin",
			inkColor: GOLD,
			slot: "ring",
		},
	];
}

// ---------------------------------------------------------------------------
// LE RAS-DE-COU AUX RAISINS VERTS — scène large uniquement
// ---------------------------------------------------------------------------

/**
 * Le ras-de-cou, tel que la photo le construit de haut en bas : un fragment de
 * ruban de velours tendu entre deux anneaux du cordon, le GRAND anneau doré ovale
 * enfilé en son centre (dessiné avant le ruban : le velours recouvre son arc
 * supérieur, c'est ce qui le fait lire « enfilé »), une poignée d'anneaux
 * d'assemblage, puis la grappe — dix perles POIRES et grains mêlés, quatre rangs
 * qui rétrécissent, une petite goutte terminale isolée, et la feuille de verre
 * côtelée posée par-dessus le haut droit de la grappe.
 *
 * Matière : verre irisé NACRÉ — verts voisins denses (aucune baie radicalement
 * d'une autre couleur), reflets jaune-vert, une seule touche dorée. Le pendant
 * exact, en plus sombre et plus opaque, des gouttes orange translucides.
 */
function rasDeCou(): CreationMark[] {
	return [
		{
			d: ring.d,
			native: ring,
			anchor: [8, 2],
			size: 8.5,
			ink: "fin",
			inkColor: GOLD,
			slot: "ring",
		},
		// Le grand anneau AVANT le ruban — cf. la JSDoc : enfilé, pas posé dessus.
		// Size 12,5 et non 9 : à 9, le ruban (y 15,4–20,9 à cette abscisse) n'en
		// laissait dépasser que ~6 unités — la pièce SIGNATURE de la photo relisait
		// « anneau d'assemblage de plus » (audit 2026-08-06).
		{
			d: ovalRing.d,
			native: ovalRing,
			anchor: [8, 2],
			x: 40,
			y: 17.5,
			size: 12.5,
			rotate: -4,
			ink: "marqueur",
			inkColor: GOLD,
		},
		// Le ruban — écrit dans le repère de la pièce : ses extrémités SONT les anneaux.
		{
			d: "M-1.5 3.8 Q40 20.5 81.4 10.8 L81.6 16.4 Q40 26.5 -1.7 9.4 Z",
			native: null,
			ink: "fin",
			inkColor: VELVET_INK,
			fill: VELVET,
			fillOpacity: 1,
			slot: "ribbon",
		},
		// Le liseré du bord — la seule « lumière » que le velours s'autorise.
		{ d: "M-1 8.4 Q40 24.8 80.6 15.4", native: null, ink: "fin", inkColor: VELVET_EDGE },
		{
			d: ring.d,
			native: ring,
			anchor: [8, 2],
			x: 80,
			y: 7.19,
			size: 8.5,
			ink: "fin",
			inkColor: GOLD,
			slot: "ring",
		},
		// La poignée d'anneaux d'assemblage — « le caractère assemblé à la main doit
		// se lire dans les raccords » ; la photo en montre toute une grappe.
		{ d: ring.d, native: ring, x: 39, y: 29.5, size: 5, rotate: -20, ink: "fin", inkColor: GOLD },
		{ d: ring.d, native: ring, x: 42, y: 31.8, size: 5.4, rotate: 22, ink: "fin", inkColor: GOLD },
		{ d: ring.d, native: ring, x: 40.2, y: 34.4, size: 4.6, ink: "fin", inkColor: GOLD },
		// Rang 1 — le plus large. Poires (drop) et grains (berry) mêlés.
		{
			d: berry.d,
			native: berry,
			x: 29,
			y: 45,
			size: 13,
			rotate: -8,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.bottle,
			fillOpacity: 0.95,
		},
		{
			d: drop.d,
			native: drop,
			x: 40.5,
			y: 44,
			size: 13,
			rotate: 4,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.forest,
			fillOpacity: 1,
		},
		{
			d: drop.d,
			native: drop,
			x: 51,
			y: 45.5,
			size: 12,
			rotate: 14,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.emerald,
			fillOpacity: 0.9,
		},
		// Rang 2 — le grain presque noir au centre, l'olive qui déborde à droite.
		{
			d: drop.d,
			native: drop,
			x: 33.5,
			y: 54,
			size: 12.5,
			rotate: -10,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.moss,
			fillOpacity: 1,
		},
		{
			d: berry.d,
			native: berry,
			x: 45.5,
			y: 54.5,
			size: 12,
			rotate: 7,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.deep,
			fillOpacity: 1,
		},
		{
			d: drop.d,
			native: drop,
			x: 56,
			y: 52,
			size: 10.5,
			rotate: 18,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.olive,
			fillOpacity: 0.88,
		},
		// Rang 3 — décalé, pour que la grappe ne soit pas un triangle isocèle.
		{
			d: drop.d,
			native: drop,
			x: 37.5,
			y: 63,
			size: 11,
			rotate: -5,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.forest,
			fillOpacity: 0.95,
		},
		{
			d: drop.d,
			native: drop,
			x: 48.5,
			y: 63.5,
			size: 10.5,
			rotate: 9,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.bottle,
			fillOpacity: 0.9,
		},
		// Rang 4 — la pointe.
		{
			d: berry.d,
			native: berry,
			x: 42,
			y: 70.5,
			size: 10,
			rotate: 5,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.emerald,
			fillOpacity: 1,
		},
		// La petite goutte terminale isolée.
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 43,
			y: 74,
			size: 8,
			rotate: 3,
			ink: "trait",
			inkColor: GRAPE_INK,
			fill: GRAPE.deep,
			fillOpacity: 0.95,
		},
		// L'iridescence : deux reflets jaune-vert, une touche DORÉE — le nacré.
		// Agrandis d'un cran et demi (7/5,5/5 → 8,5/7/6,5) : la promesse « irisé »
		// n'existait qu'au zoom (audit 2026-08-06).
		{
			d: glint.d,
			native: glint,
			x: 38,
			y: 40.5,
			size: 8.5,
			rotate: -14,
			ink: "fin",
			inkColor: GRAPE_GLOW,
			twinkle: true,
		},
		{
			d: glint.d,
			native: glint,
			x: 48,
			y: 58.5,
			size: 7,
			rotate: -10,
			ink: "fin",
			inkColor: GRAPE_GLOW,
		},
		{
			d: glint.d,
			native: glint,
			x: 31.5,
			y: 51,
			size: 6.5,
			rotate: -18,
			ink: "fin",
			inkColor: GOLD_GLINT,
		},
		// La feuille EN DERNIER, par-dessus le haut droit de la grappe (photo), la
		// pointe vers le bas-droit, dépassant de la silhouette des baies.
		{
			d: leaf.d,
			native: leaf,
			x: 56,
			y: 37,
			size: 24,
			rotate: 40,
			ink: "fin",
			inkColor: LEAF_OLIVE_INK,
			fill: LEAF_OLIVE,
			fillOpacity: 0.62,
		},
		{
			d: leafRibs.d,
			native: leafRibs,
			x: 56,
			y: 37,
			size: 24,
			rotate: 40,
			ink: "fin",
			inkColor: LEAF_OLIVE_INK,
		},
	];
}

// ---------------------------------------------------------------------------
// LA BAGUE NUIT ÉTOILÉE — le point focal
// ---------------------------------------------------------------------------

/**
 * La bague pend par son propre anneau de monture, passé dans un anneau du cordon —
 * comme au clou d'un présentoir. L'anneau de monture est dessiné AVANT le cabochon,
 * qui recouvre son arc inférieur : le métal passe derrière la pierre, c'est ce qui
 * fait lire « une bague » et non « un médaillon » (le défaut nommé de la version
 * précédente).
 *
 * Le tableau est celui de la photo : rosette jaune-vert qui tourbillonne en haut à
 * gauche, volute et touches cobalt dans le ciel, chapelle pâle au toit mou, PORTE
 * en arche presque noire cerclée de clair (le repère essentiel), second volume à
 * droite avec sa propre arche, vagues-nuages turquoise en bas. Aucun croissant,
 * aucune étoile-glyphe : les « étoiles » de la Nuit étoilée sont des TOUCHES de
 * peinture jaunes.
 *
 * La monture est DORÉE — le brief écrit disait « acier argenté », la photo montre
 * un métal chaud doré-bronze, et les photos priment (ordre de priorité du brief).
 */
function bagueNuitEtoilee(): CreationMark[] {
	return [
		{
			d: ring.d,
			native: ring,
			anchor: [8, 2],
			size: 8.5,
			ink: "fin",
			inkColor: GOLD,
			slot: "ring",
		},
		// Cabochon 36 et non 33 : le « point focal » était la plus PETITE pièce de
		// la scène (37,9 px contre 110 au ras-de-cou). L'ancre [22,3] épingle le
		// haut : le cadre s'élargit AUTOUR des touches peintes, qui gardent leurs
		// coordonnées — c'est aussi ce qui fait rentrer les vagues dans le tableau
		// (elles débordaient du bord bas-gauche, audit 2026-08-06).
		{
			d: bandRing.d,
			native: bandRing,
			y: 15.5,
			size: 25,
			rotate: 6,
			ink: "trait",
			inkColor: GOLD,
		},
		{
			d: cabochon.d,
			native: cabochon,
			anchor: [22, 3],
			y: 22.5,
			size: 36,
			rotate: -3,
			ink: "trait",
			inkColor: BRONZE,
			fill: RESIN_SKY,
			fillOpacity: 1,
			slot: "cabochon",
		},
		// Le ciel — rosette, cœur clair de la rosette, volute, touches cobalt.
		{
			d: rosette.d,
			native: rosette,
			x: -7,
			y: 30,
			size: 13,
			rotate: -10,
			ink: "fin",
			inkColor: PAINT_MEADOW,
		},
		{ d: dab.d, native: dab, x: -7.3, y: 28.6, size: 3.2, fill: PAINT_SUNNY, fillOpacity: 1 },
		{
			d: swirl.d,
			native: swirl,
			x: 5.5,
			y: 28,
			size: 13,
			rotate: 16,
			ink: "fin",
			inkColor: PAINT_COBALT,
		},
		{
			d: "M-12.5 40.5 Q-8.5 38 -4 37.6 M7.5 36.5 Q11 38 12.5 40.5",
			native: null,
			ink: "fin",
			inkColor: PAINT_COBALT,
		},
		{ d: dab.d, native: dab, x: 11, y: 33, size: 2.2, fill: PAINT_SUNNY, fillOpacity: 1 },
		{ d: dab.d, native: dab, x: -9.5, y: 26, size: 2, fill: PAINT_SUNNY, fillOpacity: 1 },
		// L'architecture — l'annexe d'abord (derrière), puis la chapelle, le toit,
		// et les DEUX arches sombres cerclées de clair.
		{
			d: annex.d,
			native: annex,
			x: 9,
			y: 47,
			size: 10.5,
			ink: "fin",
			inkColor: PAINT_COBALT,
			fill: PAINT_PALE,
			fillOpacity: 1,
		},
		{
			d: archDoor.d,
			native: archDoor,
			x: 9,
			y: 49.4,
			size: 3.6,
			ink: "fin",
			inkColor: PAINT_NIGHT_EDGE,
			fill: PAINT_NIGHT,
			fillOpacity: 1,
		},
		{
			d: chapel.d,
			native: chapel,
			x: -4.5,
			y: 48,
			size: 13,
			ink: "fin",
			inkColor: PAINT_COBALT,
			fill: PAINT_PALE,
			fillOpacity: 1,
		},
		{
			d: chapelRoof.d,
			native: chapelRoof,
			x: -4.5,
			y: 40.8,
			size: 15.5,
			ink: "fin",
			inkColor: PAINT_COBALT,
			fill: PAINT_ROOF,
			fillOpacity: 1,
		},
		{
			d: archDoor.d,
			native: archDoor,
			x: -4.5,
			y: 50.5,
			size: 5,
			ink: "fin",
			inkColor: PAINT_NIGHT_EDGE,
			fill: PAINT_NIGHT,
			fillOpacity: 1,
			slot: "door",
		},
		// Le sol — deux lignes de vagues, turquoise pâle puis jaune-vert, posées au
		// bas du cadre agrandi (le sol suit le tableau, jamais l'inverse).
		{ d: waves.d, native: waves, x: -2.5, y: 57.7, size: 15, ink: "fin", inkColor: PAINT_CLOUD },
		{ d: waves.d, native: waves, x: 1.5, y: 60.7, size: 10, ink: "fin", inkColor: PAINT_MEADOW },
		// Le reflet de la résine bombée — il respire. SUR le bombé : posé en
		// (6,5·25,5) il chevauchait le sertissage et relisait « rayure sur le
		// métal » (audit 2026-08-06).
		{
			d: glint.d,
			native: glint,
			x: 4.6,
			y: 28.2,
			size: 7.5,
			rotate: 10,
			ink: "fin",
			inkColor: RESIN_GLINT,
			twinkle: true,
		},
	];
}

// ---------------------------------------------------------------------------
// LES BOUCLES AUX RAISINS ORANGE
// ---------------------------------------------------------------------------

/**
 * UNE boucle, grande et lisible (le brief le préfère à deux boucles trop petites),
 * accrochée au cordon PAR SA CRÉOLE — c'est comme ça qu'une boucle se présente sur
 * une barre, et la créole est sa vraie suspension. Dessous : deux ou trois anneaux
 * de raccord, la feuille de verre vive (à gauche, comme la photo), puis la grappe —
 * plus LONGUE, plus conique et plus lumineuse que la verte, onze à douze gouttes
 * translucides qui se chevauchent fort, terminée par la longue goutte étirée.
 *
 * Matière : verre traversé par la lumière — opacités 0,62–0,8, les chevauchements
 * foncent d'eux-mêmes, reflets blanc-crème très marqués (photo : un par goutte ou
 * presque ; ici trois, le langage naïf ne supporte pas la répétition mécanique).
 */
function creoleRaisinsOrange(): CreationMark[] {
	return [
		{
			d: hoop.d,
			native: hoop,
			anchor: [11, 2],
			size: 16,
			rotate: 4,
			ink: "trait",
			inkColor: GOLD,
			slot: "ring",
		},
		{
			d: ring.d,
			native: ring,
			x: -1,
			y: 18.5,
			size: 5.5,
			rotate: -20,
			ink: "fin",
			inkColor: GOLD,
		},
		{ d: ring.d, native: ring, x: 2, y: 20.2, size: 5, rotate: 25, ink: "fin", inkColor: GOLD },
		{ d: ring.d, native: ring, x: 0.2, y: 23, size: 4.6, ink: "fin", inkColor: GOLD },
		// La feuille — accrochée au sommet, à GAUCHE, pointe vers le bas (photo).
		{
			d: leaf.d,
			native: leaf,
			x: -11,
			y: 30,
			size: 23,
			rotate: 142,
			ink: "fin",
			inkColor: LEAF_VIVID_INK,
			fill: LEAF_VIVID,
			fillOpacity: 0.55,
		},
		{
			d: leafRibs.d,
			native: leafRibs,
			x: -11,
			y: 30,
			size: 23,
			rotate: 142,
			ink: "fin",
			inkColor: LEAF_VIVID_INK,
		},
		// Rang 1 — large sous les anneaux ; les pointes s'enfilent vers le haut.
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: -7,
			y: 25.5,
			size: 11,
			rotate: -12,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.mandarin,
			fillOpacity: 0.72,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 3,
			y: 24.5,
			size: 12,
			rotate: 5,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.red,
			fillOpacity: 0.78,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 11.5,
			y: 26.5,
			size: 10.5,
			rotate: 15,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.amber,
			fillOpacity: 0.66,
		},
		// Rang 2 — le plus dense, une goutte déborde loin à gauche.
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: -12,
			y: 35,
			size: 9.5,
			rotate: -18,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.vermilion,
			fillOpacity: 0.72,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: -3,
			y: 36.5,
			size: 12.5,
			rotate: -4,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.mandarin,
			fillOpacity: 0.62,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 6.5,
			y: 37,
			size: 11.5,
			rotate: 10,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.red,
			fillOpacity: 0.75,
		},
		// Rang 3.
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: -7.5,
			y: 47.5,
			size: 9.5,
			rotate: -10,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.amber,
			fillOpacity: 0.8,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 1,
			y: 49,
			size: 12,
			rotate: -2,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.mandarin,
			fillOpacity: 0.68,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 9.5,
			y: 48,
			size: 10,
			rotate: 12,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.vermilion,
			fillOpacity: 0.7,
		},
		// Rang 4 — la grappe s'effile.
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: -3.5,
			y: 59.5,
			size: 9,
			rotate: -8,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.red,
			fillOpacity: 0.72,
		},
		{
			d: drop.d,
			native: drop,
			anchor: [20, 2],
			x: 4,
			y: 60,
			size: 10.5,
			rotate: 7,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.amber,
			fillOpacity: 0.64,
		},
		// La longue goutte terminale — clairement visible, comme sur la photo.
		{
			d: dropLong.d,
			native: dropLong,
			anchor: [17, 2],
			x: 0.5,
			y: 69,
			size: 10,
			rotate: 2,
			ink: "trait",
			inkColor: ORANGE_INK,
			fill: ORANGE.mandarin,
			fillOpacity: 0.78,
		},
		// Les reflets « juteux » — blanc-crème, un seul respire.
		{
			d: glint.d,
			native: glint,
			x: 2,
			y: 30.5,
			size: 6.5,
			rotate: -12,
			ink: "fin",
			inkColor: ORANGE_GLINT,
		},
		{
			d: glint.d,
			native: glint,
			x: -4,
			y: 41.5,
			size: 5,
			rotate: -16,
			ink: "fin",
			inkColor: ORANGE_GLINT,
		},
		{
			d: glint.d,
			native: glint,
			x: 1,
			y: 76,
			size: 5.5,
			rotate: -14,
			ink: "fin",
			inkColor: ORANGE_GLINT,
			twinkle: true,
		},
	];
}

// ---------------------------------------------------------------------------
// Les scènes
// ---------------------------------------------------------------------------

/**
 * LE PRÉSENTOIR — la scène large (`lg` et au-delà).
 *
 * Composition (rythme voulu par le brief : moyenne · importante · moyenne ·
 * horizontale) : le ras-de-cou à gauche, la bague au creux du cordon — la place
 * que la gravité donne au point focal —, la créole à droite, et le collier
 * arc-en-ciel tendu d'un bout à l'autre, dont le U passe SOUS les trois pièces :
 * la rivière encadre sans jamais les toucher (vérifié au rendu : la chaîne court
 * à ~5 unités sous le cabochon — le ventre du U a cédé 3 unités quand le
 * cabochon est passé de 33 à 36, audit 2026-08-06 ; les pointes des gouttes
 * restent ≤ 110 pour une boîte de 112).
 *
 * Les ordonnées sont MESURÉES sur `CREATION_PATHS.cord` (résolution des
 * quadratiques), jamais estimées : `__tests__/creations-scene.test.ts` ré-évalue le
 * tracé et refuse une pièce décrochée de 0,1 unité — y compris pour les SECONDS
 * anneaux du ruban et de la chaîne.
 *
 * L'ordre du tableau est l'ordre de PROFONDEUR : la rivière d'abord (derrière
 * tout), puis gauche → droite. ⚠️ C'était AUSSI l'ordre des délais du temps où la
 * scène se dessinait au premier écran (chaque pièce s'allumait au passage de la
 * pointe du cordon) ; la carte OG est une image fixe, il ne reste que la
 * profondeur.
 */
export const CREATION_SCENE: CreationPiece[] = [
	{
		key: "arc-en-ciel",
		x: 32,
		y: 11.67,
		marks: riviere({
			farRing: [360, -2.22],
			quads: [
				{ from: [0.3, 5.2], via: [86, 79], to: [178, 86.5] },
				{ from: [178, 86.5], via: [270, 92], to: [359.7, 3.9] },
			],
			spacing: 4.6,
			dropZone: [95, 270],
			maxDrops: 20,
			ringSize: 9,
		}),
	},
	{ key: "raisin-vert", x: 68, y: 16.14, marks: rasDeCou() },
	{ key: "nuit-etoilee", x: 210, y: 26, marks: bagueNuitEtoilee() },
	{ key: "raisin-orange", x: 330, y: 19.34, marks: creoleRaisinsOrange() },
];
