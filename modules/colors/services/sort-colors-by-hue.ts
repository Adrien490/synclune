/**
 * Tri chromatique d'une liste de couleurs — l'ordre d'un nuancier d'atelier.
 *
 * Un mur de pastilles trié A→Z se lit comme une liste aléatoire : « Argent,
 * Cristal, Noir, Or blanc, Or jaune… » ne dessine rien. Un nuancier se lit par
 * la teinte, et les neutres y vivent à part — c'est ce que fait cette fonction.
 *
 * Deux groupes, dans cet ordre :
 * 1. les teintes FRANCHES (saturation ≥ `CHROMATIC_SATURATION_THRESHOLD`),
 *    triées par teinte croissante à partir de `HUE_WHEEL_START` ;
 * 2. les QUASI-NEUTRES (blancs, gris, noirs, métalliques), triées par clarté
 *    décroissante — du plus clair au plus sombre.
 *
 * Départage final par `slug` : l'ordre doit être stable d'un rendu à l'autre,
 * sans quoi le mur se réarrangerait entre deux entrées de cache.
 *
 * Fonction PURE (couche `services/`) : aucune lecture DB, aucun effet de bord.
 */

/**
 * La roue ne démarre pas au rouge (0°) mais au ROSE DE MARQUE.
 *
 * Un nuancier doit bien commencer quelque part, et ce point de départ est un
 * choix de direction artistique, pas une constante physique : ouvrir sur la
 * teinte de `--primary` fait que la première pastille du mur est celle de la
 * boutique. Au rouge, le rose se retrouverait en DERNIER (337° sur 360) —
 * mécaniquement correct, et exactement l'inverse de l'intention.
 *
 * Valeur en tours (0-1), alignée sur la teinte HSL de `--primary` (#fdb8e4).
 */
const HUE_WHEEL_START = 337 / 360;

/**
 * Sous ce seuil de saturation HSL, une couleur ne porte plus de teinte lisible :
 * son angle de teinte est du bruit numérique (`#F5F5F5` et `#FDEEF4` sont tous
 * deux « blancs » à l'œil, mais à 0° et 340° d'écart sur la roue). Les ranger
 * par teinte les éparpillerait entre les couleurs franches.
 */
const CHROMATIC_SATURATION_THRESHOLD = 0.18;

export interface ColorLike {
	slug: string;
	hex: string;
}

/** Composantes HSL normalisées 0-1 (la teinte en tours, pas en degrés). */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
	let value = hex.replace("#", "");
	if (value.length === 3) {
		value = value
			.split("")
			.map((c) => c + c)
			.join("");
	}
	if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

	const r = parseInt(value.slice(0, 2), 16) / 255;
	const g = parseInt(value.slice(2, 4), 16) / 255;
	const b = parseInt(value.slice(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	const l = (max + min) / 2;

	if (delta === 0) return { h: 0, s: 0, l };

	const s = delta / (1 - Math.abs(2 * l - 1));

	let h: number;
	if (max === r) {
		h = ((g - b) / delta) % 6;
	} else if (max === g) {
		h = (b - r) / delta + 2;
	} else {
		h = (r - g) / delta + 4;
	}
	h /= 6;
	if (h < 0) h += 1;

	return { h, s, l };
}

/**
 * Rend une NOUVELLE liste, ordonnée en nuancier. L'entrée n'est pas mutée.
 *
 * Un hex illisible (donnée corrompue) est rangé avec les neutres les plus
 * sombres plutôt qu'écarté : une couleur du catalogue ne doit pas disparaître du
 * mur à cause de son code hexadécimal.
 */
export function sortColorsByHue<T extends ColorLike>(colors: readonly T[]): T[] {
	const decorated = colors.map((color) => {
		const hsl = hexToHsl(color.hex);
		return {
			color,
			isChromatic: hsl !== null && hsl.s >= CHROMATIC_SATURATION_THRESHOLD,
			// Distance angulaire depuis le point de départ de la roue, et non teinte
			// absolue : c'est ce qui fait tourner le nuancier au lieu de le couper.
			hue: hsl ? (hsl.h - HUE_WHEEL_START + 1) % 1 : 0,
			lightness: hsl?.l ?? 0,
		};
	});

	return decorated
		.sort((a, b) => {
			if (a.isChromatic !== b.isChromatic) return a.isChromatic ? -1 : 1;
			const primary = a.isChromatic ? a.hue - b.hue : b.lightness - a.lightness;
			if (primary !== 0) return primary;
			return a.color.slug.localeCompare(b.color.slug);
		})
		.map((entry) => entry.color);
}
