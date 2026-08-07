/**
 * Les signes dessinés de la marque, sérialisés pour les OG images.
 *
 * @description
 * Une `ImageResponse` est rendue par Satori, pas par un navigateur : le chemin
 * sans ambiguïté pour y faire entrer un SVG est un `<img>` dont la `src` est un
 * data-URI. C'est ce que produisent les fonctions de ce fichier.
 *
 * ⚠️ **Aucune géométrie n'est écrite ici.** Tous les tracés viennent de la SSOT
 * `shared/components/hand-drawn/paths.ts` — c'est la règle de ce dépôt (« changer
 * la main doit être UN fichier »), et une carte de partage qui redessinerait le
 * rail à la main dériverait du site au premier ajustement.
 *
 * ⚠️ Les tracés sont rendus **déjà secs** : pas de `stroke-dasharray`, pas de
 * `pathLength`. Sur le site ils se dessinent (`hand-draw-load` / `hand-draw-inview`),
 * ici l'image est fixe — un dash hérité ne produirait qu'un trait pointillé.
 *
 * ⚠️ Les couleurs sont des HEX, jamais des `var(--…)` ni des `oklch()` : Satori ne
 * les parse pas et les ignore en silence. Les marques du présentoir portent DÉJÀ
 * leurs hex (les couleurs des bijoux photographiés, `creations.ts`) — seule l'encre
 * de liaison lavande est projetée ici via `BRAND_HEX`.
 */

import {
	BRUSH_STROKE_PATH,
	BRUSH_VIEWBOX,
	CREATION_PATHS,
	RAIL_STROKE_PATHS,
	RAIL_VIEWBOX,
} from "@/shared/components/hand-drawn/paths";
import {
	CREATION_SCENE,
	CREATION_SCENE_BOX,
	type CreationMark,
} from "@/shared/components/hand-drawn/creations";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { BRAND_HEX, OG_ACCENTS } from "@/shared/constants/brand-colors";

/**
 * `Buffer` plutôt que `btoa` : ces routes tournent sur le runtime Node (aucune
 * ne déclare `runtime = "edge"`), et `btoa` casserait sur tout caractère non
 * Latin-1 — ce que les accents d'un futur libellé introduiraient.
 */
function toDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/**
 * Les quatre touches de pinceau — le geste d'ouverture du bloc titre du site,
 * et le seul signe de marque qui soit polychrome à lui tout seul.
 */
export function ogRailMark(): string {
	const strokes = RAIL_STROKE_PATHS.map(
		(d, index) =>
			`<path d="${d}" fill="none" stroke="${OG_ACCENTS[index]}" stroke-width="${HAND_DRAWN_STROKES.pinceau}" stroke-linecap="round"/>`,
	).join("");

	return toDataUri(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${RAIL_VIEWBOX}">${strokes}</svg>`,
	);
}

/**
 * Le surligneur du mot « colorés » — le coup de pinceau du `h1`, avec le même
 * dégradé aux quatre accents que `BrandBrushGradient`.
 *
 * `preserveAspectRatio="none"`, comme `brush-highlight.tsx` : l'épaisseur suit
 * la boîte, c'est ce qui fait que la peinture épouse le corps du texte.
 */
export function ogBrushMark(): string {
	const stops = OG_ACCENTS.map(
		(hex, index) =>
			`<stop offset="${(index / (OG_ACCENTS.length - 1)).toFixed(4)}" stop-color="${hex}"/>`,
	).join("");

	return toDataUri(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRUSH_VIEWBOX}" preserveAspectRatio="none">` +
			`<defs><linearGradient id="og-brush" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient></defs>` +
			`<path d="${BRUSH_STROKE_PATH}" fill="none" stroke="url(#og-brush)" stroke-width="22" stroke-linecap="round"/>` +
			`</svg>`,
	);
}

/**
 * Ratio natif de la scène — pour que l'appelant ne le recalcule pas de tête.
 *
 * ⚠️ La boîte vient de `creations.ts` (sa SSOT), et ce n'est PAS
 * `CREATION_PATHS.cord.viewBox` : le cordon n'occupe que le bandeau du
 * haut, les pièces PENDENT en dessous. Rendue dans la boîte du cordon, la scène
 * sortirait rognée à y = 32, sans la moindre erreur — c'est arrivé à la version
 * guirlande, qui recopiait ces valeurs à la main.
 */
export const OG_CREATIONS_ASPECT = CREATION_SCENE_BOX.width / CREATION_SCENE_BOX.height;

/**
 * ⚠️ QUATRE décimales : la graisse rendue d'une trace est le produit de
 * `stroke-width` par le `scale()` qui la porte, et deux arrondis indépendants à deux
 * décimales la font dériver du cran nommé. L'échelle est donc arrondie À LA SOURCE
 * puis réutilisée pour diviser le cran — la règle vient du composant du premier écran
 * (`hero-creations.tsx`, supprimé le 2026-08-07), ce module en est le dernier
 * porteur.
 */
const round = (value: number) => Math.round(value * 10000) / 10000;

/**
 * Une trace de pièce, sérialisée — le SEUL rendu de la scène depuis que le décor a
 * quitté le premier écran (2026-08-07).
 *
 * ⚠️ Un `scale()` SVG met l'ENCRE à l'échelle : la graisse est donc divisée par le
 * facteur.
 *
 * ⚠️ L'EMPILEMENT des transformations est celui qu'avait le composant, au mot près —
 * `translate(pose) scale() rotate(angle, ancre)`. Une composition « équivalente à
 * l'œil » (rotation d'abord, ancrage par une translation négative) a été essayée et
 * rendue : elle produit des motifs minuscules et décalés, parce que la rotation sans
 * centre s'applique à l'origine du repère et non au point d'accroche. Ne pas la
 * ré-écrire « plus proprement ».
 */
function ogMark(mark: CreationMark, pieceX: number, pieceY: number): string {
	const scale = mark.native ? round(mark.size! / mark.native.width) : 1;

	let transform: string;
	if (!mark.native) {
		transform = `translate(${round(pieceX)} ${round(pieceY)})`;
	} else {
		const [anchorX, anchorY] = mark.anchor ?? [mark.native.width / 2, mark.native.height / 2];
		transform =
			`translate(${round(pieceX + (mark.x ?? 0) - scale * anchorX)} ${round(pieceY + (mark.y ?? 0) - scale * anchorY)}) ` +
			`scale(${scale})` +
			(mark.rotate ? ` rotate(${mark.rotate} ${anchorX} ${anchorY})` : "");
	}

	// La transparence du verre est ici un ATTRIBUT : sur le site elle passe par
	// `--hand-fill-opacity`, que la phase fill de `hand-draw` consomme — une
	// variable CSS que Satori ignorerait en silence, rendant toutes les gouttes
	// opaques et supprimant les chevauchements qui font lire le verre.
	const fill = mark.fill
		? `fill="${mark.fill}" fill-opacity="${mark.fillOpacity ?? 1}"`
		: `fill="none"`;
	// L'encre de matière est un hex porté par la marque ; sans elle, c'est l'encre
	// de liaison lavande — la même projection que la classe côté site.
	const stroke = mark.ink
		? `stroke="${mark.inkColor ?? BRAND_HEX.lavender}" ` +
			`stroke-width="${round(HAND_DRAWN_STROKES[mark.ink] / scale)}"`
		: `stroke="none"`;

	return (
		`<path d="${mark.d}" transform="${transform}" ${fill} ${stroke} ` +
		// Les arches peintes du cabochon ont des angles rentrants : sans jointure
		// arrondie, elles rendraient des pointes vives.
		`stroke-linecap="round" stroke-linejoin="round"/>`
	);
}

/**
 * Le présentoir du premier écran — cordon lavande et les QUATRE créations réelles
 * suspendues : le ras-de-cou aux raisins verts, la bague Nuit étoilée, la créole aux
 * raisins orange, et le collier arc-en-ciel tendu d'un bout à l'autre.
 *
 * La scène est IMPORTÉE de `shared/components/hand-drawn/creations.ts`, pas recopiée :
 * la guirlande d'avant dupliquait ses cinq poses ici faute d'export, et la carte de
 * partage pouvait donc dériver du site au premier ajustement. Elle ne le peut plus.
 */
export function ogCreationsMark(): string {
	const cord =
		`<path d="${CREATION_PATHS.cord.d}" fill="none" stroke="${BRAND_HEX.lavender}" ` +
		`stroke-width="${HAND_DRAWN_STROKES.fin}" stroke-linecap="round"/>`;

	const hung = CREATION_SCENE.map((piece) =>
		piece.marks.map((mark) => ogMark(mark, piece.x, piece.y)).join(""),
	).join("");

	return toDataUri(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CREATION_SCENE_BOX.width} ${CREATION_SCENE_BOX.height}">${cord}${hung}</svg>`,
	);
}
