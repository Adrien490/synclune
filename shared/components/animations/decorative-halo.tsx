"use client";

import "./decorative-halo.css";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";

export interface DecorativeHaloProps {
	/**
	 * Taille du halo principal
	 */
	size?: "sm" | "md" | "lg" | "xl";
	/**
	 * Variante de couleur
	 */
	variant?: "rose" | "gold" | "mixed";
	/**
	 * Position du halo (pour les particules autour)
	 */
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom";
	/**
	 * Classe CSS personnalisée pour la position
	 */
	className?: string;
	/**
	 * Intensité du blur
	 */
	blur?: "sm" | "md" | "lg" | "xl";
	/**
	 * Opacité
	 */
	opacity?: "light" | "medium" | "strong";
	/**
	 * Animation
	 */
	animate?: "float" | "pulse" | "none";
	/**
	 * Délai d'animation (en secondes)
	 */
	animationDelay?: number;
}

const sizeClasses = {
	sm: "size-6",
	md: "size-8",
	lg: "size-12",
	xl: "size-16",
};

// Le rose = --primary (SSOT), l'or = token brand (globals.css). Les anciens
// `--rose-300`/`--gold-400` n'étaient définis nulle part : halos transparents.
const variantClasses = {
	rose: "bg-primary",
	gold: "bg-(--color-brand-sun)",
	mixed: "from-primary to-(--color-brand-sun)",
};

const positionClasses = {
	"top-left": "-top-4 -left-4",
	"top-right": "-top-4 -right-4",
	"bottom-left": "-bottom-4 -left-4",
	"bottom-right": "-bottom-4 -right-4",
	custom: "",
};

const blurClasses = {
	sm: "blur-sm",
	md: "blur-md",
	lg: "blur-lg",
	xl: "blur-xl",
};

const opacityClasses = {
	light: "opacity-30",
	medium: "opacity-50",
	strong: "opacity-70",
};

const animationClasses = {
	float: "animate-float",
	pulse: "animate-pulse",
	none: "",
};

export function DecorativeHalo({
	size = "md",
	variant = "mixed",
	position = "custom",
	className = "",
	blur = "sm",
	opacity = "medium",
	animate = "float",
	animationDelay = 0,
}: DecorativeHaloProps) {
	const shouldReduceMotion = useReducedMotion();

	const style =
		animationDelay > 0 && !shouldReduceMotion
			? {
					animationDelay: `${animationDelay}s`,
				}
			: undefined;

	// Désactive les animations si prefers-reduced-motion est activé
	const effectiveAnimate = shouldReduceMotion ? "none" : animate;

	return (
		<div
			className={cn(
				"absolute rounded-full",
				sizeClasses[size],
				variantClasses[variant],
				position !== "custom" && positionClasses[position],
				blurClasses[blur],
				opacityClasses[opacity],
				animationClasses[effectiveAnimate],
				className,
			)}
			style={style}
			aria-hidden="true"
		/>
	);
}
