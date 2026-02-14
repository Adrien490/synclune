"use client";

import { type MotionValue, motion, useMotionValue, useTransform } from "motion/react";
import { ANIMATION_PRESETS } from "./constants";
import type { Particle, ParticleSetProps } from "./types";
import { getShapeStyles, getSvgConfig, getTransition, isSvgShape } from "./utils";

function particleStyle(p: Particle, highContrast: boolean) {
	const blur = highContrast ? p.blur * 1.5 : p.blur;
	return {
		width: p.size,
		height: p.size,
		left: `${p.x}%`,
		top: `${p.y}%`,
		filter: `blur(${blur}px)`,
		zIndex: Math.round((1 - p.depthFactor) * 10),
	};
}

/** Resolve effective opacity for a particle, halved when high contrast is active */
function effectiveOpacity(p: Particle, highContrast: boolean) {
	return highContrast ? p.opacity * 0.5 : p.opacity;
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
	highContrast,
	scrollOpacity,
}: {
	p: Particle;
	animationStyle: ParticleSetProps["animationStyle"];
	mouseX: MotionValue<number>;
	mouseY: MotionValue<number>;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
}) {
	const isSvg = isSvgShape(p.shape);
	const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
	const shapeStyles = isSvg ? undefined : getShapeStyles(p.shape, p.size, p.color);
	const style = particleStyle(p, highContrast);

	// Build a particle copy with adjusted opacity for the animation preset
	const adjustedP = highContrast ? { ...p, opacity: p.opacity * 0.5 } : p;

	// Close particles (low depthFactor) move more, far ones move less
	const strength = 1 - p.depthFactor;
	const px = useTransform(mouseX, (v) => v * strength);
	const py = useTransform(mouseY, (v) => v * strength);

	// Opacity is handled by the animation preset via adjustedP — no need for style.opacity
	const content = isSvg && svgConfig ? (
		<motion.span
			className="block w-full h-full"
			animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
			transition={getTransition(p)}
		>
			<svg viewBox={svgConfig.viewBox} className="w-full h-full" fill={p.color} aria-hidden="true" role="presentation">
				<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
			</svg>
		</motion.span>
	) : (
		<motion.span
			className="block w-full h-full"
			style={shapeStyles}
			animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
			transition={getTransition(p)}
		/>
	);

	return (
		<motion.span className="absolute" style={{ ...style, x: px, y: py, opacity: scrollOpacity }}>
			{content}
		</motion.span>
	);
}

/** Static particle for reduced motion */
function StaticParticle({
	p,
	highContrast,
	scrollOpacity,
}: {
	p: Particle;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
}) {
	const isSvg = isSvgShape(p.shape);
	const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
	const shapeStyles = isSvg ? undefined : getShapeStyles(p.shape, p.size, p.color);
	const style = particleStyle(p, highContrast);
	const opacity = effectiveOpacity(p, highContrast);

	const inner = isSvg && svgConfig ? (
		<span className="block w-full h-full" style={{ opacity }}>
			<svg viewBox={svgConfig.viewBox} className="w-full h-full" fill={p.color} aria-hidden="true" role="presentation">
				<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
			</svg>
		</span>
	) : (
		<span
			className="block w-full h-full"
			style={{ opacity, ...shapeStyles }}
		/>
	);

	if (scrollOpacity) {
		return (
			<motion.span className="absolute" style={{ ...style, opacity: scrollOpacity }}>
				{inner}
			</motion.span>
		);
	}

	return (
		<span className="absolute" style={{ ...style }}>
			{inner}
		</span>
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
	highContrast = false,
	scrollOpacity,
}: ParticleSetProps) {
	// Single fallback MotionValue shared by all particles when no mouse tracking (mobile)
	const fallback = useMotionValue(0);
	const resolvedX = mouseX ?? fallback;
	const resolvedY = mouseY ?? fallback;

	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{particles.map((p) => (
					<StaticParticle key={p.id} p={p} highContrast={highContrast} scrollOpacity={scrollOpacity} />
				))}
			</>
		);
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
					highContrast={highContrast}
					scrollOpacity={scrollOpacity}
				/>
			))}
		</>
	);
}
