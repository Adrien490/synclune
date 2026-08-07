import type { CSSProperties, ReactNode } from "react";

import { BrandBrushGradient } from "@/shared/components/hand-drawn/brand-brush-gradient";
import { BRUSH_STROKE_PATH, BRUSH_VIEWBOX } from "@/shared/components/hand-drawn/paths";
import {
	RAIL_STROKE_COUNT,
	STROKE_DURATION_MS,
	STROKE_STAGGER_MS,
} from "@/shared/components/storefront-heading";

/**
 * Le trait est le 5ᵉ temps du stagger du rail : les quatre touches partent à
 * 0/120/240/360 ms (`HandDrawnRail`), lui à 480 — même famille de gestes, un
 * seul fil chronologique. Dérivé de la SSOT du rail, pas recopié : une
 * retouche du tempo là-bas se propage ici.
 */
const BRUSH_DURATION_MS = STROKE_DURATION_MS;
const BRUSH_DELAY_MS = RAIL_STROKE_COUNT * STROKE_STAGGER_MS;

/**
 * Le surligneur du mot d'accent — direction B de l'artifact « mot colorés »
 * (2026-08-05), en remplacement de `.text-gradient-multicolor`.
 *
 * @description
 * La couleur quitte l'ENCRE et passe sur la SURFACE : une touche de pinceau
 * balayant les quatre accents de marque (soleil inclus — impossible en encre,
 * où un jaune ramené à 3:1 n'est plus un jaune) passe DERRIÈRE le mot, et
 * l'encre redevient `--foreground` (19,5:1 sur le fond, ≥ 7,85:1 sur le pire
 * pastel du trait). C'est la règle générale des accents — des surfaces, jamais
 * du texte — appliquée au dernier endroit qui y échappait : plus de tokens
 * assombris dédiés, plus de halo, plus de calibration de course de dégradé.
 *
 * Server Component, zéro JS client. Le trait vit DANS la boîte de ligne du mot
 * (hauteur 58 % du corps, ancré en bas) : zéro coût vertical — le budget mobile
 * du bloc titre (13,1 px de marge, cf. `hero-heading.tsx`) ne bouge pas.
 *
 * ⚠️ Le span racine est `inline-block`, donc une boîte ATOMIQUE pour la césure :
 * le moteur a le droit de couper entre cette boîte et la ponctuation qui la
 * suit — à 320 px, la virgule de « colorés, » passait seule en tête de ligne
 * (audit 2026-08-06), une coupe impossible en texte nu. Tout call site qui fait
 * suivre le mot d'une ponctuation DOIT envelopper « mot + ponctuation » dans un
 * `whitespace-nowrap` (cf. `hero-heading.tsx`, verrouillé par
 * `hero-h1-silhouette.regression.test.tsx`).
 *
 * ⚠️ `preserveAspectRatio="none"` est ici VOULU au sens inverse de
 * `squiggle-underline.tsx` : la hauteur rendue ne vaut pas celle du viewBox,
 * donc l'échelle Y varie et l'épaisseur du trait suit le corps du texte —
 * c'est le comportement recherché (un surligneur proportionnel au mot),
 * là où le squiggle voulait une épaisseur constante.
 *
 * ⚠️ `stroke-dasharray: 1 2` en inline, et non le `1` posé par
 * `hand-draw-load` : avec une période de 2 (`1 1` implicite), le dash suivant
 * commence exactement en fin de tracé et son cap arrondi peint un POINT
 * parasite (rayon ~8 px ici, le trait est épais) pendant tout le délai.
 * Période 3 : rien n'est visible à l'offset 1, la course 1 → 0 est identique.
 *
 * Replis : le trait est décoratif (`aria-hidden`) — `forced-colors:hidden`
 * (un SVG inline n'est PAS soumis au forçage de couleurs, on le retire donc
 * nous-mêmes) et `contrast-more:hidden` (même philosophie que l'ancienne
 * bascule de l'utility : pour qui demande plus de contraste, la sortie
 * honnête est l'encre seule). Sous `prefers-reduced-motion`, `hand-draw-load`
 * rend le trait déjà sec (entrance.css) — pas de second repli à écrire.
 */
export function BrushHighlight({ children }: { children: ReactNode }) {
	return (
		<span data-slot="brush-highlight" className="relative inline-block">
			{/* Le SVG précède le texte : tous deux positionnés, l'ordre DOM suffit
			    à peindre l'encre au-dessus du trait — pas de z-index.

			    Calibrage (réglé à l'œil sur le rendu Winky Sans, corps 40 et 64) :
			    h-[58%] couvre la bande baseline → mi-hauteur d'x d'une minuscule
			    sans toucher les ascendantes ni l'accent du « é » ; bottom-[4%]
			    laisse le trait mordre à peine sous la baseline (« colorés » n'a
			    aucune descendante) ; w-[106%]/-left-[3%] = 3 % de débord par côté,
			    le geste dépasse du mot comme un vrai surligneur ; strokeWidth 17
			    sur un viewBox de 26 ≈ les 2/3 de la hauteur — l'échelle Y de
			    `preserveAspectRatio="none"` fait le reste. */}
			<svg
				viewBox={BRUSH_VIEWBOX}
				preserveAspectRatio="none"
				fill="none"
				aria-hidden="true"
				focusable="false"
				className="pointer-events-none absolute bottom-[4%] -left-[3%] h-[58%] w-[106%] contrast-more:hidden forced-colors:hidden"
			>
				<defs>
					{/* L'id est passé au dégradé partagé, plus fixé dans son corps. La
					    valeur est celle d'origine — le rendu du h1 est inchangé.

					    ⚠️ Ce montage est le SEUL du dépôt à peindre ce dégradé : le CTA
					    du hero l'a partagé quelques heures le 2026-08-06 (« le bouton
					    peint », rendu à son aplat le jour même — deux coups de pinceau
					    dans le même bloc titre se lisaient comme une redite). Ne pas en
					    conclure que la prop `id` a cessé de servir : deux
					    `<linearGradient>` de même id ne lèvent aucune erreur, le second
					    est ignoré en silence. C'est le filet du prochain doublon. */}
					<BrandBrushGradient id="hero-brush-gradient" />
				</defs>
				<path
					d={BRUSH_STROKE_PATH}
					pathLength={1}
					stroke="url(#hero-brush-gradient)"
					strokeWidth={17}
					strokeLinecap="round"
					className="hand-draw-load"
					style={
						{
							strokeDasharray: "1 2",
							"--hand-duration": `${BRUSH_DURATION_MS}ms`,
							"--hand-delay": `${BRUSH_DELAY_MS}ms`,
						} as CSSProperties
					}
				/>
			</svg>
			<span className="relative">{children}</span>
		</span>
	);
}
