/**
 * Helpers de rendu pour pastille couleur — mono, bi ou tricolore.
 *
 * Convention Synclune (multi-couleurs M2M `ProductSkuColor`, depuis 2026-05-15) :
 * - 0 couleur  → fond muted (variante sans teinte renseignée)
 * - 1 couleur  → pastille pleine (mono-couleur, cas dominant)
 * - 2 couleurs → linear-gradient 135° mi-mi (bicolore : or rose + argent)
 * - 3+ couleurs → conic-gradient en secteurs égaux (tricolore, dégradé)
 *
 * L'ordre du tableau d'entrée reflète la priorité métier (position=0 = principale),
 * conservée dans le rendu.
 */

import type { CSSProperties } from "react";

/**
 * Fabrique le style CSS pour une pastille (mono / bi / multi couleur).
 *
 * @example
 * buildSwatchStyle(["#FFD700"])
 * // { backgroundColor: "#FFD700" }
 *
 * @example
 * buildSwatchStyle(["#E5C9B3", "#C0C0C0"])
 * // { background: "linear-gradient(135deg, #E5C9B3 0% 50%, #C0C0C0 50% 100%)" }
 *
 * @example
 * buildSwatchStyle(["#FFD700", "#E5C9B3", "#FFFFFF"])
 * // { background: "conic-gradient(from 0deg, #FFD700 0deg 120deg, #E5C9B3 120deg 240deg, #FFFFFF 240deg 360deg)" }
 */
export function buildSwatchStyle(hexes: ReadonlyArray<string>): CSSProperties {
	if (hexes.length === 0) {
		return { backgroundColor: "var(--muted)" };
	}
	if (hexes.length === 1) {
		return { backgroundColor: hexes[0] };
	}
	if (hexes.length === 2) {
		return {
			background: `linear-gradient(135deg, ${hexes[0]} 0% 50%, ${hexes[1]} 50% 100%)`,
		};
	}
	const step = 360 / hexes.length;
	const stops = hexes
		.map((hex, i) => `${hex} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`)
		.join(", ");
	return { background: `conic-gradient(from 0deg, ${stops})` };
}

/**
 * Construit le libellé aria-label combinant les noms de couleurs.
 * « Or rose », « Or rose et Argent », « Or rose, Argent et Or blanc ».
 */
export function getSwatchAriaLabel(names: ReadonlyArray<string>): string {
	if (names.length === 0) return "Sans couleur";
	if (names.length === 1) return names[0] ?? "Sans couleur";
	if (names.length === 2) return `${names[0]} et ${names[1]}`;
	const last = names[names.length - 1];
	const head = names.slice(0, -1).join(", ");
	return `${head} et ${last}`;
}

/**
 * Vrai si TOUTES les couleurs sont claires (luminance > threshold) — utile pour
 * décider d'afficher une ring de contraste autour de la pastille (sinon invisible
 * sur fond clair).
 */
export function areAllColorsLight(
	hexes: ReadonlyArray<string>,
	isLight: (hex: string) => boolean,
): boolean {
	if (hexes.length === 0) return false;
	return hexes.every((hex) => isLight(hex));
}
