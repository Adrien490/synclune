import type { CSSProperties } from "react";

import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "./motion.config";

export type HandDrawnVariant = "underline" | "circle" | "star" | "heart" | "arrow";

/** Opacité de remplissage pour les variants pleins (star, heart) après dessin du contour. */
const FILLED_VARIANT_OPACITY = 0.15;

export interface HandDrawnAccentProps {
	/** Type d'accent dessiné */
	variant?: HandDrawnVariant;
	/** Couleur de l'accent (CSS color value) */
	color?: string;
	/** Épaisseur du trait */
	strokeWidth?: number;
	/** Largeur du SVG */
	width?: number;
	/** Hauteur du SVG */
	height?: number;
	/** Durée de l'animation de dessin (en secondes) */
	duration?: number;
	/** Délai avant le début de l'animation (en secondes, mode load uniquement) */
	delay?: number;
	/** Déclencher le dessin au scroll (true) ou au montage (false). Défaut: true. */
	inView?: boolean;
	/** Classe CSS personnalisée */
	className?: string;
}

/**
 * Paths SVG pour chaque variante d'accent dessiné à la main.
 * Tendance 2026: Hand-drawn aesthetic + artisanal authenticity.
 */
const svgPaths: Record<
	HandDrawnVariant,
	{ path: string; viewBox: string; defaultWidth: number; defaultHeight: number }
> = {
	underline: {
		path: "M2 15 Q30 8, 60 12 Q90 16, 118 10",
		viewBox: "0 0 120 20",
		defaultWidth: 120,
		defaultHeight: 20,
	},
	circle: {
		path: "M40 5 Q75 2, 90 25 Q105 50, 85 70 Q65 90, 35 85 Q5 80, 5 50 Q5 20, 40 5",
		viewBox: "0 0 100 95",
		defaultWidth: 100,
		defaultHeight: 95,
	},
	star: {
		path: "M25 2 L30 18 L48 18 L34 28 L40 45 L25 35 L10 45 L16 28 L2 18 L20 18 Z",
		viewBox: "0 0 50 50",
		defaultWidth: 50,
		defaultHeight: 50,
	},
	heart: {
		path: "M25 45 Q5 30, 5 18 Q5 5, 15 5 Q25 5, 25 15 Q25 5, 35 5 Q45 5, 45 18 Q45 30, 25 45",
		viewBox: "0 0 50 50",
		defaultWidth: 50,
		defaultHeight: 50,
	},
	arrow: {
		path: "M2 25 Q50 20, 90 25 M75 12 L90 25 L75 38",
		viewBox: "0 0 95 50",
		defaultWidth: 95,
		defaultHeight: 50,
	},
};

/**
 * Composant SVG décoratif "fait main" avec animation de dessin.
 *
 * Universal component (no "use client"): le tracé est dessiné via une
 * animation CSS `stroke-dashoffset` (`hand-draw`). Le `<path>` porte
 * `pathLength="1"` — la longueur est normalisée, aucune mesure JS requise.
 * Zéro motion-react.
 *
 * `inView` (défaut true) lie le dessin au scroll (`animation-timeline: view()`) ;
 * `inView=false` le joue au montage. Reduced motion + Safari <= 18 affichent
 * l'accent fini, sans animation.
 *
 * @example
 * ```tsx
 * <h2>Nos créations</h2>
 * <HandDrawnAccent variant="underline" color="var(--primary)" />
 * ```
 */
export function HandDrawnAccent({
	variant = "underline",
	color = "currentColor",
	strokeWidth = 2,
	width,
	height,
	duration = MOTION_CONFIG.duration.slower,
	delay = 0,
	inView = true,
	className,
}: HandDrawnAccentProps) {
	const config = svgPaths[variant];
	const finalWidth = width ?? config.defaultWidth;
	const finalHeight = height ?? config.defaultHeight;

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
				d={config.path}
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
 */
export function HandDrawnUnderline({
	color = "var(--primary)",
	className,
	...props
}: Omit<HandDrawnAccentProps, "variant">) {
	return <HandDrawnAccent variant="underline" color={color} className={className} {...props} />;
}
