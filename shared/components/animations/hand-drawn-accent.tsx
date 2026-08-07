import type { CSSProperties } from "react";

import {
	HAND_DRAWN_DURATIONS_MS,
	HAND_DRAWN_STROKES,
} from "@/shared/components/hand-drawn/constants";
import { ACCENT_SHAPE_PATHS, UNDERLINE_PATHS } from "@/shared/components/hand-drawn/paths";
import { cn } from "@/shared/utils/cn";

type HandDrawnVariant = "underline" | "arrow" | "circle" | "star" | "heart";
type HandDrawnLength = keyof typeof UNDERLINE_PATHS;

/** Opacité de remplissage pour les variants pleins (star, heart) après dessin du contour. */
const FILLED_VARIANT_OPACITY = 0.15;

interface HandDrawnAccentBaseProps {
	/** Type d'accent dessiné */
	variant?: HandDrawnVariant;
	/**
	 * Longueur du GESTE pour `underline` : trois tracés dessinés à leur ratio
	 * (`s` 60×12 · `m` 120×20 · `l` 176×16), pas un path étiré. Ignorée par les
	 * autres variants. Défaut : `m`.
	 */
	length?: HandDrawnLength;
	/**
	 * Couleur du tracé. Défaut : l'accent de section (`--section-accent`, posé
	 * par `data-accent` — cf. app/styles/section-accents.css), repli sur le rose
	 * signature hors section accentuée.
	 */
	color?: string;
	/**
	 * Épaisseur du trait — un cran de l'échelle `HAND_DRAWN_STROKES`
	 * (fin 1,5 · trait 2 · marqueur 2,5 · pinceau 5), pas une valeur au juger.
	 */
	strokeWidth?: number;
	/**
	 * Largeur rendue. La hauteur est TOUJOURS dérivée du ratio du tracé — un
	 * couple width×height désaccordé letterboxait l'encre en silence
	 * (`preserveAspectRatio` par défaut : tracé rétréci ET centré, payé sur
	 * 7 appelants — audit 2026-08-05).
	 */
	width?: number;
	/** Durée de l'animation de dessin (en secondes) */
	duration?: number;
	/** Classe CSS personnalisée */
	className?: string;
}

/**
 * `delay` n'est lu que par `.hand-draw-load` (entrance.css) : en mode `inView`,
 * le dessin est piloté par `animation-timeline: view()`, où un délai n'a aucun
 * sens — la prop y était un réglage fantôme (deux sites en prod). Le type ne
 * l'accepte donc qu'avec `inView={false}`.
 */
type HandDrawnTriggerProps =
	| {
			/** Dessin au scroll (`animation-timeline: view()`). Défaut. */
			inView?: true;
			delay?: never;
	  }
	| {
			/**
			 * Dessin au montage — OBLIGATOIRE pour tout contenu above-fold ou
			 * portalisé (dialog, panneau) : une timeline `view()` ne joue pas sans
			 * traversée du viewport, et ne rejoue pas au montage.
			 */
			inView: false;
			/** Délai avant le début du dessin (en secondes). */
			delay?: number;
	  };

export type HandDrawnAccentProps = HandDrawnAccentBaseProps & HandDrawnTriggerProps;

/**
 * `Omit` non distributif APLATIRAIT l'union de déclenchement (`delay`
 * redeviendrait acceptable sans `inView={false}`) — la garde de type du
 * raccourci passe par cette variante distributive.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Composant SVG décoratif "fait main" avec animation de dessin.
 *
 * Universal component (no "use client"): le tracé est dessiné via une
 * animation CSS `stroke-dashoffset` (`hand-draw`). Le `<path>` porte
 * `pathLength="1"` — la longueur est normalisée, aucune mesure JS requise.
 * Zéro motion-react. Les tracés vivent dans la SSOT
 * `shared/components/hand-drawn/paths.ts`.
 *
 * `inView` (défaut true) lie le dessin au scroll (`animation-timeline: view()`) ;
 * Safari ≤ 18 (sans `view()`) et reduced-motion affichent alors l'accent fini.
 * `inView=false` joue le dessin au montage — c'est une animation CSS classique,
 * qui joue sur TOUS les navigateurs ; seul reduced-motion l'affiche fini.
 *
 * @example
 * ```tsx
 * <h2>Nos créations</h2>
 * <HandDrawnAccent variant="underline" />
 * ```
 */
export function HandDrawnAccent({
	variant = "underline",
	length = "m",
	color = "var(--section-accent, var(--primary))",
	strokeWidth = HAND_DRAWN_STROKES.trait,
	width,
	duration = HAND_DRAWN_DURATIONS_MS.trait / 1000,
	delay = 0,
	inView = true,
	className,
}: HandDrawnAccentProps) {
	const config = variant === "underline" ? UNDERLINE_PATHS[length] : ACCENT_SHAPE_PATHS[variant];
	const finalWidth = width ?? config.width;
	// Hauteur DÉRIVÉE du ratio natif — jamais fournie par l'appelant (letterbox).
	const finalHeight = Math.round((finalWidth * config.height * 100) / config.width) / 100;

	const isFilledVariant = variant === "star" || variant === "heart";
	const fillValue = isFilledVariant ? color : "none";
	const fillOpacity = isFilledVariant ? FILLED_VARIANT_OPACITY : 0;

	return (
		<svg
			width={finalWidth}
			height={finalHeight}
			viewBox={config.viewBox}
			fill="none"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d={config.d}
				pathLength={1}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill={fillValue}
				className={inView ? "hand-draw-inview" : "hand-draw-load"}
				style={
					{
						"--hand-duration": `${Math.round(duration * 1000)}ms`,
						"--hand-delay": `${Math.round(delay * 1000)}ms`,
						"--hand-fill-opacity": fillOpacity,
					} as CSSProperties
				}
			/>
		</svg>
	);
}

/**
 * Composant raccourci pour souligner un titre.
 *
 * Hérite du défaut cascadé du composant : accent de section
 * (`--section-accent`), repli rose signature hors section accentuée.
 */
export function HandDrawnUnderline(props: DistributiveOmit<HandDrawnAccentProps, "variant">) {
	return <HandDrawnAccent variant="underline" {...props} />;
}
