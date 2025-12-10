"use client";

import { motion } from "framer-motion";
import { ANIMATION_PRESETS } from "./constants";
import type { ParticleSetProps } from "./types";
import { getShapeStyles, getTransition } from "./utils";

/**
 * Composant interne pour rendre un ensemble de particules
 * Gère à la fois le rendu statique (reduced motion) et animé
 */
export const ParticleSet = ({
	particles,
	shape,
	isInView,
	reducedMotion,
	animationStyle,
	rotation,
	intensity,
	glow,
	glowIntensity,
	springPhysics,
}: ParticleSetProps) => {
	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{particles.map((p) => {
					const shapeStyles = getShapeStyles(shape, p.size, p.color);
					return (
						<span
							key={p.id}
							className="absolute"
							style={{
								width: p.size,
								height: p.size,
								left: `${p.x}%`,
								top: `${p.y}%`,
								opacity: p.opacity,
								filter: `blur(${p.blur}px)`,
								...shapeStyles,
							}}
						/>
					);
				})}
			</>
		);
	}

	return (
		<>
			{particles.map((p) => {
				const shapeStyles = getShapeStyles(shape, p.size, p.color);
				const animation = ANIMATION_PRESETS[animationStyle](p, intensity, rotation);
				const transition = getTransition(p, springPhysics);

				// Glow effect (boxShadow)
				const glowStyle = glow
					? { boxShadow: `0 0 ${p.size * glowIntensity}px ${p.color}` }
					: {};

				return (
					<motion.span
						key={p.id}
						className="absolute will-change-transform"
						style={{
							width: p.size,
							height: p.size,
							left: `${p.x}%`,
							top: `${p.y}%`,
							filter: `blur(${p.blur}px)`,
							transform: "translateZ(0)",
							...shapeStyles,
							...glowStyle,
						}}
						animate={animation}
						transition={transition}
					/>
				);
			})}
		</>
	);
};
