import type { CSSProperties } from "react";

import {
	ATELIER_THREAD_PATHS,
	type HandDrawnPathConfig,
} from "@/shared/components/hand-drawn/paths";
import { cn } from "@/shared/utils/cn";

/**
 * Graisse d'encre du fil, en PIXELS RENDUS — pas en unités de viewBox.
 *
 * ⚠️ C'est la correction d'une classe entière de bugs : un `scale()` SVG met
 * l'ENCRE à l'échelle, donc une graisse déclarée en unités de tracé rend une
 * épaisseur différente à chaque échelle d'appel. Le fil rendait ainsi 1,67 px
 * pour un segment (16/24) et 2,08 px pour une vignette (40/48), et la pampille
 * portait sa propre constante de rattrapage (`trait ÷ (22/40)`). Ici la valeur
 * est la cible VUE, et c'est le composant qui la reconvertit.
 *
 * 2 px = le cran `trait` de `HAND_DRAWN_STROKES`, celui des soulignés.
 */
const ATELIER_INK_PX = 2;

/**
 * Un tracé du fil de l'atelier — perle, vignette de geste, nœud ou goutte.
 *
 * @description
 * Rendu d'UNE entrée de la SSOT des tracés (`shared/components/hand-drawn/paths.ts`),
 * quelle que soit sa collection : le fil (`ATELIER_THREAD_PATHS`), les glyphes
 * partagés (`ACCENT_SHAPE_PATHS.circle` pour la perle) ou le présentoir du
 * héros (`CREATION_PATHS.drop` pour la pampille). Un `<svg>` par tracé, SANS
 * exception — deux paths sous un même `<svg>` partageraient la timeline
 * `view()` et se dessineraient d'un seul geste. La hauteur est DÉRIVÉE du
 * ratio natif (un couple width×height désaccordé letterboxe l'encre en
 * silence).
 *
 * - `pathLength={1}` est OBLIGATOIRE : `hand-draw-inview` pose
 *   `stroke-dasharray: 1` — sans normalisation, le trait serait un pointillé.
 *   Sur un `d` multi-sous-paths (étincelle, chaleur), le dash se déroule
 *   séquentiellement à travers les sous-paths : un seul geste par vignette,
 *   c'est voulu.
 * - `fill` : **l'accent PEINT, l'encre TRACE** (audit du 2026-08-06). Les
 *   quatre accents de marque valent 1,5 à 2,6:1 en trait — inutilisables pour
 *   porter une forme — mais 7,8 à 13,4:1 en APLAT sous l'encre. Les pièces qui
 *   représentent un OBJET (la perle, les gouttes de la pampille) sont donc
 *   remplies de leur accent ; les GESTES (fil, vignettes) restent des traits.
 *   Le remplissage arrive après le contour : les keyframes `hand-draw`
 *   interpolent `fill-opacity` sur 60→100 % de la plage.
 * - Replis : `hand-draw-inview` est déjà sec sous reduced-motion et
 *   Safari ≤ 18 (défaut d'`entrance.css`) ; `contrast-more`/`forced-colors`
 *   retirent le tracé — l'ornement s'efface, l'encre du texte suffit (même
 *   philosophie que le surligneur du h1).
 *
 * Pas une extension de `HandDrawnAccent` : le remplissage plein, la graisse en
 * pixels rendus et les tracés hors `ACCENT_SHAPE_PATHS` pollueraient le
 * composant partagé pour une section qui a sa propre grammaire.
 */
export function AtelierThreadStroke({
	path,
	width,
	color = "var(--section-accent)",
	fill = false,
	className,
	style,
}: {
	path: HandDrawnPathConfig;
	width: number;
	color?: string;
	/** Remplir le tracé de `color` (objets), au lieu de ne le tracer que (gestes). */
	fill?: boolean;
	className?: string;
	/**
	 * Position dans un conteneur en `absolute` — les morceaux d'une PIÈCE
	 * (`STEP_PIECES`) sont posés à des coordonnées en px, donc arbitraires :
	 * une classe Tailwind interpolée ne serait pas compilée.
	 */
	style?: CSSProperties;
}) {
	const height = (width * path.height) / path.width;
	// Graisse demandée en pixels VUS → reconvertie en unités du viewBox.
	const strokeWidth = Math.round(((ATELIER_INK_PX * path.width) / width) * 100) / 100;

	return (
		<svg
			aria-hidden="true"
			width={width}
			height={height}
			viewBox={path.viewBox}
			className={cn("contrast-more:hidden forced-colors:hidden", className)}
			style={style}
		>
			<path
				d={path.d}
				pathLength={1}
				className="hand-draw-inview"
				fill={fill ? color : "none"}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={fill ? ({ "--hand-fill-opacity": 1 } as CSSProperties) : undefined}
			/>
		</svg>
	);
}

/** Largeur rendue du rail, en px — l'échelle des anciens segments (16 sur 24 natifs). */
const RAIL_WIDTH_PX = 16;

const RAIL_TILE = ATELIER_THREAD_PATHS.tile;

/** Hauteur d'une répétition à `RAIL_WIDTH_PX` — dérivée, jamais saisie (letterboxing). */
const RAIL_TILE_HEIGHT_PX = (RAIL_WIDTH_PX * RAIL_TILE.height) / RAIL_TILE.width;

/**
 * Le masque du rail : la tuile en data-URI, encre NOIRE.
 *
 * `mask-image` ne lit que l'alpha de sa source — un `stroke` noir sur fond
 * transparent découpe donc exactement le tracé, et la couleur vient du
 * `background-color` de l'élément. C'est la raison d'être du détour : une
 * data-URI ne voit pas `var(--…)`, un `stroke="var(--primary)"` y serait
 * simplement ignoré.
 *
 * `encodeURIComponent` plutôt qu'un échappement à la main : `#`, `<`, `>` et
 * les guillemets doivent tous être encodés, et un seul oubli rend la data-URI
 * invalide EN SILENCE (masque vide → fil invisible, sans erreur console).
 */
const RAIL_MASK = `url("data:image/svg+xml,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${RAIL_TILE.viewBox}"><path d="${RAIL_TILE.d}" fill="none" stroke="#000" stroke-width="${
		Math.round(((ATELIER_INK_PX * RAIL_TILE.width) / RAIL_WIDTH_PX) * 100) / 100
	}" stroke-linecap="round"/></svg>`,
)}")`;

/**
 * LE FIL — un seul élément continu, du bas de la confidence jusqu'au nœud.
 *
 * @description
 * Remplace les cinq `<svg>` de segments logés dans les gaps de l'`<ol>`
 * (refonte du 2026-08-06, audit au rendu réel). Mesuré avant : le fil n'était
 * de l'encre que sur **44 % de son axe à 390 px et 55 % à 1280**, avec quatre
 * trous de 63 à 130 px — un le long de chaque note, puisque le fil n'existait
 * QUE dans les gaps —, et le ratio se DÉGRADAIT en rétrécissant le viewport,
 * exactement là où la métaphore doit tenir. Le plus grand trou (84 px à 1280,
 * 124 px à 390) tombait entre la dernière perle et le nœud : le payoff était
 * orphelin.
 *
 * Le montage : la tuile `ATELIER_THREAD_PATHS.tile` est répétée en
 * `mask-repeat: repeat-y` (`app/styles/atelier-thread.css`). Le fil est donc
 * **indépendant de la hauteur des notes PAR CONSTRUCTION** — le critère
 * d'échec de la direction (« si une retouche de copie oblige à retoucher un
 * segment, le montage est mauvais ») devient insatisfiable, là où il n'était
 * jusqu'ici que respecté. C'est aussi ce qui a permis de supprimer le clip
 * `top-20`, une constante MESURÉE sur la pile « h3 d'une seule ligne ».
 *
 * Le dessin redevient UN geste : une seconde couche de masque en dégradé,
 * pilotée par `animation-timeline: view()`, découvre le fil de haut en bas —
 * on enfile. Chaque segment se dessinait pour lui-même auparavant, ce qui
 * faisait lire des tirets plutôt qu'un fil.
 *
 * Décoratif : c'est l'`<ol>` qui porte l'ordre, et le fil est `aria-hidden`.
 */
export function AtelierThreadRail({
	color = "var(--section-accent)",
	className,
}: {
	color?: string;
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			className={cn("atelier-thread-rail contrast-more:hidden forced-colors:hidden", className)}
			style={
				{
					"--atelier-thread-ink": color,
					"--atelier-thread-tile": RAIL_MASK,
					"--atelier-thread-tile-height": `${RAIL_TILE_HEIGHT_PX}px`,
					width: `${RAIL_WIDTH_PX}px`,
				} as CSSProperties
			}
		/>
	);
}
