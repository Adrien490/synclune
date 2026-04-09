"use client";

import { twMerge } from "tailwind-merge";

type ColorSwatchProps = {
	color: string;
	/** Nom accessible de la couleur (utilise comme aria-label) */
	colorName?: string;
	className?: string;
	"aria-label"?: string;
};

/**
 * ColorSwatch - Composant de previsualisation de couleur accessible
 *
 * Affiche un motif damier pour les couleurs avec transparence.
 */
export function ColorSwatch({
	color,
	colorName,
	className,
	"aria-label": ariaLabel,
}: ColorSwatchProps) {
	return (
		<span
			role="img"
			aria-label={ariaLabel ?? colorName}
			className={twMerge(
				"border-border/50 box-border inline-block size-8 rounded-full border",
				className,
			)}
			style={{
				background: `linear-gradient(${color}, ${color}),
          repeating-conic-gradient(#CCC 0% 25%, white 0% 50%) 50% / 16px 16px`,
			}}
		/>
	);
}
