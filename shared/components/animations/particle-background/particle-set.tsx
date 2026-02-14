"use client";

import { type MotionValue, motion, useMotionValue, useTransform } from "motion/react";
import { ANIMATION_PRESETS } from "./constants";
import type { Particle, ParticleSetProps } from "./types";
import { getShapeStyles, getSvgConfig, getTransition, isSvgShape } from "./utils";

function particleStyle(p: Particle) {
	return {
		width: p.size,
		height: p.size,
		left: `${p.x}%`,
		top: `${p.y}%`,
		filter: `blur(${p.blur}px)`,
		zIndex: Math.round((1 - p.depthFactor) * 10),
	};
}

/**
 * Animated particle with mouse parallax.
 * Uses an outer motion.span for the mouse offset (transforms driven by MotionValues)
 * and an inner motion.span for the looping keyframe animation, avoiding conflicts.
 */
function AnimatedParticle({
	p,
	animationStyle,
	mouseX,
	mouseY,
}: {
	p: Particle;
	animationStyle: ParticleSetProps["animationStyle"];
	mouseX: MotionValue<number>;
	mouseY: MotionValue<number>;
}) {
	const isSvg = isSvgShape(p.shape);
	const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
	const shapeStyles = getShapeStyles(p.shape, p.size, p.color);
	const style = particleStyle(p);

	// Close particles (low depthFactor) move more, far ones move less
	const strength = 1 - p.depthFactor;
	const px = useTransform(mouseX, (v) => v * strength);
	const py = useTransform(mouseY, (v) => v * strength);

	const content = isSvg && svgConfig ? (
		<motion.span
			className="block w-full h-full"
			style={{ opacity: p.opacity }}
			animate={ANIMATION_PRESETS[animationStyle](p)}
			transition={getTransition(p)}
		>
			<svg viewBox={svgConfig.viewBox} className="w-full h-full" fill={p.color} aria-hidden="true" role="presentation">
				<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
			</svg>
		</motion.span>
	) : (
		<motion.span
			className="block w-full h-full"
			style={{ ...shapeStyles, opacity: p.opacity }}
			animate={ANIMATION_PRESETS[animationStyle](p)}
			transition={getTransition(p)}
		/>
	);

	return (
		<motion.span className="absolute" style={{ ...style, x: px, y: py }}>
			{content}
		</motion.span>
	);
}

/** Static particle for reduced motion */
function StaticParticle({ p }: { p: Particle }) {
	const isSvg = isSvgShape(p.shape);
	const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
	const shapeStyles = getShapeStyles(p.shape, p.size, p.color);
	const style = particleStyle(p);

	if (isSvg && svgConfig) {
		return (
			<span className="absolute" style={{ ...style, opacity: p.opacity }}>
				<svg viewBox={svgConfig.viewBox} className="w-full h-full" fill={p.color} aria-hidden="true" role="presentation">
					<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
				</svg>
			</span>
		);
	}

	return (
		<span
			className="absolute"
			style={{ ...style, opacity: p.opacity, ...shapeStyles }}
		/>
	);
}

/**
 * Composant interne pour rendre un ensemble de particules
 * Gere le rendu statique (reduced motion) et anime
 */
export function ParticleSet({
	particles,
	isInView,
	reducedMotion,
	animationStyle,
	mouseX,
	mouseY,
}: ParticleSetProps) {
	// Single fallback MotionValue shared by all particles when no mouse tracking (mobile)
	const fallback = useMotionValue(0);
	const resolvedX = mouseX ?? fallback;
	const resolvedY = mouseY ?? fallback;

	if (!isInView) return null;

	if (reducedMotion) {
		return <>{particles.map((p) => <StaticParticle key={p.id} p={p} />)}</>;
	}

	return (
		<>
			{particles.map((p) => (
				<AnimatedParticle
					key={p.id}
					p={p}
					animationStyle={animationStyle}
					mouseX={resolvedX}
					mouseY={resolvedY}
				/>
			))}
		</>
	);
}
