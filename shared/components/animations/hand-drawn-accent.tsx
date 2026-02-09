"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { cn } from "@/shared/utils/cn";

export interface HandDrawnAccentProps {
	/**
	 * Type d'accent dessiné
	 */
	variant?: "underline" | "circle" | "star" | "heart" | "arrow";
	/**
	 * Couleur de l'accent (CSS color value)
	 */
	color?: string;
	/**
	 * Épaisseur du trait
	 */
	strokeWidth?: number;
	/**
	 * Largeur du SVG
	 */
	width?: number;
	/**
	 * Hauteur du SVG
	 */
	height?: number;
	/**
	 * Durée de l'animation de dessin (en secondes)
	 */
	duration?: number;
	/**
	 * Délai avant le début de l'animation (en secondes)
	 */
	delay?: number;
	/**
	 * Déclencher l'animation quand visible dans le viewport
	 */
	inView?: boolean;
	/**
	 * Classe CSS personnalisée
	 */
	className?: string;
}

/**
 * Paths SVG pour chaque variante d'accent dessiné à la main
 * Tendance 2026: Hand-drawn aesthetic + artisanal authenticity
 */
const svgPaths: Record<string, { path: string; viewBox: string; defaultWidth: number; defaultHeight: number }> = {
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
 * Composant SVG décoratif "fait main" avec animation de dessin
 *
 * Utilise stroke-dashoffset pour créer un effet de dessin au scroll.
 * Respecte prefers-reduced-motion.
 *
 * @example
 * ```tsx
 * // Sous un titre de section
 * <h2>Nos créations</h2>
 * <HandDrawnAccent variant="underline" color="var(--primary)" inView />
 *
 * // Autour d'un CTA
 * <div className="relative">
 *   <HandDrawnAccent variant="circle" className="absolute -inset-4" />
 *   <Button>Découvrir</Button>
 * </div>
 * ```
 */
export function HandDrawnAccent({
	variant = "underline",
	color = "currentColor",
	strokeWidth = 2,
	width,
	height,
	duration = 0.5,
	delay = 0,
	inView = true,
	className,
}: HandDrawnAccentProps) {
	const ref = useRef<SVGSVGElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.5 });
	const shouldReduceMotion = useReducedMotion();

	const config = svgPaths[variant];
	const finalWidth = width ?? config.defaultWidth;
	const finalHeight = height ?? config.defaultHeight;

	// Si reduced motion, afficher directement sans animation
	if (shouldReduceMotion) {
		return (
			<svg
				ref={ref}
				width={finalWidth}
				height={finalHeight}
				viewBox={config.viewBox}
				fill="none"
				className={cn("pointer-events-none", className)}
				aria-hidden="true"
			>
				<path
					d={config.path}
					stroke={color}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill={variant === "star" || variant === "heart" ? color : "none"}
					fillOpacity={variant === "star" || variant === "heart" ? 0.15 : 0}
				/>
			</svg>
		);
	}

	// Animation trigger: soit au scroll (inView), soit immédiatement
	const shouldAnimate = inView ? isInView : true;

	return (
		<svg
			ref={ref}
			width={finalWidth}
			height={finalHeight}
			viewBox={config.viewBox}
			fill="none"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
		>
			<motion.path
				d={config.path}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill={variant === "star" || variant === "heart" ? color : "none"}
				initial={{
					pathLength: 0,
					fillOpacity: 0,
				}}
				animate={
					shouldAnimate
						? {
								pathLength: 1,
								fillOpacity: variant === "star" || variant === "heart" ? 0.15 : 0,
							}
						: {
								pathLength: 0,
								fillOpacity: 0,
							}
				}
				transition={{
					pathLength: {
						duration,
						delay,
						ease: "easeOut",
					},
					fillOpacity: {
						duration: duration * 0.5,
						delay: delay + duration * 0.5,
						ease: "easeIn",
					},
				}}
			/>
		</svg>
	);
}

/**
 * Composant raccourci pour souligner un titre
 */
export function HandDrawnUnderline({
	color = "var(--primary)",
	className,
	...props
}: Omit<HandDrawnAccentProps, "variant">) {
	return (
		<HandDrawnAccent
			variant="underline"
			color={color}
			className={cn("mt-1", className)}
			{...props}
		/>
	);
}

/**
 * Composant raccourci pour entourer un élément
 */
export function HandDrawnCircle({
	color = "var(--secondary)",
	className,
	...props
}: Omit<HandDrawnAccentProps, "variant">) {
	return (
		<HandDrawnAccent
			variant="circle"
			color={color}
			className={cn("absolute -inset-2", className)}
			{...props}
		/>
	);
}
