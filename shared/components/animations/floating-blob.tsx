"use client";

import { cn } from "@/shared/utils/cn";

interface FloatingBlobProps {
	/** Couleur du blob (supporte oklch, hex, rgb) */
	color?: string;
	/** Taille du blob en pixels */
	size?: number;
	/** Position en pourcentage depuis le haut */
	top?: string;
	/** Position en pourcentage depuis la gauche */
	left?: string;
	/** Position en pourcentage depuis la droite */
	right?: string;
	/** Position en pourcentage depuis le bas */
	bottom?: string;
	/** Intensité du blur en pixels */
	blur?: number;
	/** Opacité (0-1) */
	opacity?: number;
	/** Durée de l'animation en secondes */
	duration?: number;
	/** Délai avant le début de l'animation */
	delay?: number;
	/** Index du blob pour varier l'animation */
	index?: number;
	className?: string;
}

/**
 * Blob organique flottant pour arrière-plans.
 * Forme amorphe qui se déplace doucement.
 *
 * @example
 * ```tsx
 * <FloatingBlob
 *   color="oklch(0.85 0.12 350)"
 *   size={300}
 *   top="10%"
 *   left="20%"
 *   blur={80}
 *   opacity={0.4}
 * />
 * ```
 */
export function FloatingBlob({
	color = "oklch(0.85 0.12 350)",
	size = 200,
	top,
	left,
	right,
	bottom,
	blur = 60,
	opacity = 0.3,
	duration = 20,
	delay = 0,
	index = 0,
	className,
}: FloatingBlobProps) {
	// Varier l'animation selon l'index
	const animations = [
		"animate-[blob-float-1_var(--duration)_ease-in-out_infinite]",
		"animate-[blob-float-2_var(--duration)_ease-in-out_infinite]",
		"animate-[blob-float-3_var(--duration)_ease-in-out_infinite]",
	];

	return (
		<div
			className={cn(
				"absolute rounded-full pointer-events-none",
				"motion-safe:" + animations[index % animations.length],
				className
			)}
			style={{
				width: size,
				height: size,
				top,
				left,
				right,
				bottom,
				background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
				filter: `blur(${blur}px)`,
				opacity,
				"--duration": `${duration}s`,
				animationDelay: `${delay}s`,
			} as React.CSSProperties}
			aria-hidden="true"
		/>
	);
}

interface FloatingBlobsProps {
	className?: string;
}

/**
 * Groupe de blobs flottants avec configuration par défaut.
 * Idéal pour le hero ou les sections décoratives.
 */
export function FloatingBlobs({ className }: FloatingBlobsProps) {
	return (
		<div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)} aria-hidden="true">
			{/* Blob rose en haut à gauche */}
			<FloatingBlob
				color="oklch(0.85 0.12 350)"
				size={400}
				top="-10%"
				left="-5%"
				blur={100}
				opacity={0.25}
				duration={25}
				index={0}
			/>

			{/* Blob lavande en haut à droite */}
			<FloatingBlob
				color="oklch(0.82 0.10 300)"
				size={350}
				top="5%"
				right="-8%"
				blur={90}
				opacity={0.2}
				duration={30}
				delay={5}
				index={1}
			/>

			{/* Blob pêche au centre-bas */}
			<FloatingBlob
				color="oklch(0.88 0.10 80)"
				size={300}
				bottom="10%"
				left="30%"
				blur={80}
				opacity={0.18}
				duration={22}
				delay={10}
				index={2}
			/>

			{/* Petit blob menthe */}
			<FloatingBlob
				color="oklch(0.85 0.08 160)"
				size={200}
				top="40%"
				right="15%"
				blur={70}
				opacity={0.15}
				duration={18}
				delay={3}
				index={0}
			/>
		</div>
	);
}
