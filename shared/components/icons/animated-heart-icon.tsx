"use client";

import { m, AnimatePresence, useReducedMotion } from "motion/react";
import type { HeartIconProps } from "@/shared/types/icons.types";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

const HEART_PATH =
	"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

const SPARKLES = [
	{ cx: 10, cy: 10, r: 1 },
	{ cx: 14, cy: 9, r: 0.8 },
	{ cx: 16, cy: 14, r: 0.9 },
] as const;

/**
 * Animated HeartIcon with SVG morphing between outline and filled states.
 * Uses motion/react for smooth fill/stroke transitions and sparkle animations.
 * Respects prefers-reduced-motion.
 *
 * Drop-in replacement for HeartIcon in client components.
 */
export function AnimatedHeartIcon({
	className = "",
	size = 24,
	ariaLabel,
	variant = "outline",
	decorative = false,
}: HeartIconProps) {
	const shouldReduceMotion = useReducedMotion();
	const safeSize = Math.max(size, 16);
	const isFilled = variant === "filled";

	const defaultLabel = isFilled ? "Retirer des favoris" : "Ajouter aux favoris";
	const accessibleLabel = ariaLabel ?? defaultLabel;

	// For reduced motion, render static SVG (same as HeartIcon)
	if (shouldReduceMotion) {
		return (
			<svg
				width={safeSize}
				height={safeSize}
				viewBox="0 0 24 24"
				fill="none"
				className={className}
				xmlns="http://www.w3.org/2000/svg"
				role={decorative ? "presentation" : "img"}
				aria-label={decorative ? undefined : accessibleLabel}
				aria-hidden={decorative ? "true" : undefined}
				data-testid="heart-icon"
				data-variant={variant}
			>
				{!decorative && <title>{accessibleLabel}</title>}
				<path
					d={HEART_PATH}
					fill={isFilled ? "var(--primary)" : "none"}
					stroke={isFilled ? "none" : "var(--primary)"}
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{isFilled && (
					<g data-testid="heart-sparkles">
						{SPARKLES.map((s) => (
							<circle key={`${s.cx}-${s.cy}`} cx={s.cx} cy={s.cy} r={s.r} fill="var(--secondary)" />
						))}
					</g>
				)}
			</svg>
		);
	}

	return (
		<svg
			width={safeSize}
			height={safeSize}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			role={decorative ? "presentation" : "img"}
			aria-label={decorative ? undefined : accessibleLabel}
			aria-hidden={decorative ? "true" : undefined}
			data-testid="heart-icon"
			data-variant={variant}
		>
			{!decorative && <title>{accessibleLabel}</title>}

			{/* Heart path with morphing fill/stroke transition */}
			<m.path
				d={HEART_PATH}
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={false}
				animate={{
					fill: isFilled ? "var(--primary)" : "rgba(0,0,0,0)",
					stroke: isFilled ? "rgba(0,0,0,0)" : "var(--primary)",
					strokeWidth: isFilled ? 0 : 1.5,
					scale: isFilled ? [1, 1.15, 1] : 1,
				}}
				transition={{
					fill: { duration: MOTION_CONFIG.duration.normal, ease: MOTION_CONFIG.easing.easeOut },
					stroke: { duration: MOTION_CONFIG.duration.fast },
					strokeWidth: { duration: MOTION_CONFIG.duration.fast },
					scale: { duration: MOTION_CONFIG.duration.normal, ease: MOTION_CONFIG.easing.easeOut },
				}}
				style={{ originX: "50%", originY: "50%" }}
			/>

			{/* Sparkles with AnimatePresence for enter/exit */}
			<AnimatePresence>
				{isFilled && (
					<m.g
						data-testid="heart-sparkles"
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0 }}
						transition={MOTION_CONFIG.spring.bouncy}
						style={{ originX: "50%", originY: "50%" }}
					>
						{SPARKLES.map((s, i) => (
							<m.circle
								key={`${s.cx}-${s.cy}`}
								cx={s.cx}
								cy={s.cy}
								r={s.r}
								fill="var(--secondary)"
								initial={{ opacity: 0, scale: 0 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0 }}
								transition={{
									...MOTION_CONFIG.spring.bouncy,
									delay: i * 0.05,
								}}
							/>
						))}
					</m.g>
				)}
			</AnimatePresence>
		</svg>
	);
}
