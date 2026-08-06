import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { ATELIER_THREAD_PATHS } from "@/shared/components/hand-drawn/paths";
import { cn } from "@/shared/utils/cn";

export type AtelierThreadPathName = keyof typeof ATELIER_THREAD_PATHS;

/**
 * Un tracé du fil de l'atelier — segment, vignette de geste ou nœud.
 *
 * @description
 * Rendu d'UNE entrée de `ATELIER_THREAD_PATHS` (SSOT
 * `shared/components/hand-drawn/paths.ts`) : un `<svg>` par tracé, SANS
 * exception — deux paths sous un même `<svg>` partageraient la timeline
 * `view()` et se dessineraient d'un seul geste (corollaire du § Mouvement de
 * `docs/LANDING-SECTION-ATELIER.md`). La hauteur est DÉRIVÉE du ratio natif
 * du tracé (la discipline de `HandDrawnAccent` : un couple width×height
 * désaccordé letterboxe l'encre en silence).
 *
 * - `pathLength={1}` est OBLIGATOIRE : `hand-draw-inview` pose
 *   `stroke-dasharray: 1` — sans normalisation, le trait serait un pointillé.
 *   Sur un `d` multi-sous-paths (étincelle, chaleur), le dash se déroule
 *   séquentiellement à travers les sous-paths : un seul geste par vignette,
 *   c'est voulu.
 * - Graisse unique `marqueur` (2,5 en unités du viewBox) : aux échelles de
 *   rendu du fil (16/24 pour un segment, 40/48 pour une vignette), l'encre
 *   effective tombe à ~2 px — le trait des soulignés.
 * - Replis : `hand-draw-inview` est déjà sec sous reduced-motion et
 *   Safari ≤ 18 (défaut d'`entrance.css`) ; `contrast-more`/`forced-colors`
 *   retirent le tracé — l'ornement s'efface, l'encre du texte suffit (même
 *   philosophie que le surligneur du h1).
 *
 * Pas une extension de `HandDrawnAccent` : sept variants mono-consommateur
 * pollueraient le composant partagé pour une section qui a sa propre SSOT.
 */
export function AtelierThreadStroke({
	name,
	width,
	color = "var(--section-accent)",
	className,
}: {
	name: AtelierThreadPathName;
	width: number;
	color?: string;
	className?: string;
}) {
	const path = ATELIER_THREAD_PATHS[name];
	const height = (width * path.height) / path.width;

	return (
		<svg
			aria-hidden="true"
			width={width}
			height={height}
			viewBox={path.viewBox}
			className={cn("contrast-more:hidden forced-colors:hidden", className)}
		>
			<path
				d={path.d}
				pathLength={1}
				className="hand-draw-inview"
				fill="none"
				stroke={color}
				strokeWidth={HAND_DRAWN_STROKES.marqueur}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
