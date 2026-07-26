"use client";

import { cn } from "@/shared/utils/cn";
import { m, useReducedMotion } from "motion/react";
import { bgColorClass, loaderAnimations, sizeClasses } from "./constants";
import { type MiniDotsLoaderProps } from "./types";

export function MiniDotsLoader({ size = "sm", color = "primary", className }: MiniDotsLoaderProps) {
	/*
	 * `repeat: Infinity` sans garde `prefers-reduced-motion` : c'était le seul
	 * indicateur de chargement du projet à ignorer le réglage (contrairement à
	 * `Skeleton` en `motion-safe:` et à `Spinner`), et une animation infinie est
	 * précisément ce que WCAG 2.3.3 / le réglage système visent.
	 *
	 * Sous reduced-motion : trois points statiques à pleine opacité. Le `role="status"`
	 * porte déjà l'information de chargement, l'animation n'était que décorative.
	 */
	const prefersReducedMotion = useReducedMotion();

	return (
		<m.div
			role="status"
			aria-label="Chargement en cours"
			className={cn("inline-flex gap-0.5", className)}
			{...(prefersReducedMotion
				? {}
				: {
						variants: loaderAnimations.container,
						initial: "initial",
						animate: "animate",
					})}
		>
			{[0, 1, 2].map((i) => (
				<m.span
					key={i}
					className={cn("inline-block rounded-full", sizeClasses.dots[size], bgColorClass[color])}
					{...(prefersReducedMotion
						? {}
						: {
								variants: loaderAnimations.dot,
								transition: {
									duration: 0.6,
									repeat: Infinity,
									ease: "easeInOut",
									delay: i * 0.1,
									repeatDelay: 0.1,
								},
							})}
				/>
			))}
		</m.div>
	);
}
