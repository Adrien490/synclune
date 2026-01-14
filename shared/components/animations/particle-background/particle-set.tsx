"use client";

import { cn } from "@/shared/utils/cn";
import { motion } from "motion/react";
import { ANIMATION_PRESETS } from "./constants";
import type { Particle, ParticleSetProps } from "./types";
import { getShapeStyles, getSvgConfig, getTransition, isSvgShape } from "./utils";

/**
 * Rendu d'une particule unique
 *
 * Note: L'approche `animate` prop + `repeat: Infinity` est optimale ici car
 * Framer Motion utilise WAAPI (Web Animations API) sous le capot, évitant
 * les re-renders React. useMotionValue serait pertinent pour des animations
 * réactives (scroll/mouse) mais pas pour ces animations infinies décoratives.
 */
function renderParticle(
	p: Particle,
	animated: boolean,
	animationStyle: ParticleSetProps["animationStyle"]
) {
	const isSvg = isSvgShape(p.shape);
	const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
	const shapeStyles = getShapeStyles(p.shape, p.size, p.color);

	const baseStyle = {
		width: p.size,
		height: p.size,
		left: `${p.x}%`,
		top: `${p.y}%`,
		filter: `blur(${p.blur}px)`,
	};

	if (isSvg && svgConfig) {
		if (animated) {
			return (
				<motion.span
					key={p.id}
					className={cn("absolute", animated && "will-change-[transform,opacity]")}
					style={{ ...baseStyle, opacity: p.opacity, transform: "translateZ(0)" }}
					animate={ANIMATION_PRESETS[animationStyle](p)}
					transition={getTransition(p)}
				>
					<svg viewBox={svgConfig.viewBox} className="w-full h-full" fill={p.color} aria-hidden="true" role="presentation">
						<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
					</svg>
				</motion.span>
			);
		}
		return (
			<span key={p.id} className="absolute" style={{ ...baseStyle, opacity: p.opacity }}>
				<svg viewBox={svgConfig.viewBox} className="w-full h-full" fill={p.color} aria-hidden="true" role="presentation">
					<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
				</svg>
			</span>
		);
	}

	if (animated) {
		return (
			<motion.span
				key={p.id}
				className={cn("absolute", animated && "will-change-[transform,opacity]")}
				style={{ ...baseStyle, transform: "translateZ(0)", ...shapeStyles }}
				animate={ANIMATION_PRESETS[animationStyle](p)}
				transition={getTransition(p)}
			/>
		);
	}

	return (
		<span
			key={p.id}
			className="absolute"
			style={{ ...baseStyle, opacity: p.opacity, ...shapeStyles }}
		/>
	);
}

/**
 * Composant interne pour rendre un ensemble de particules
 * Gère le rendu statique (reduced motion) et animé
 */
export function ParticleSet({
	particles,
	isInView,
	reducedMotion,
	animationStyle,
}: ParticleSetProps) {
	if (!isInView) return null;
	const animated = !reducedMotion;
	return <>{particles.map((p) => renderParticle(p, animated, animationStyle))}</>;
}
