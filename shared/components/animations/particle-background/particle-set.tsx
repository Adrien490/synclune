"use client";

import { m } from "motion/react";
import { ANIMATION_PRESETS } from "./constants";
import type { Particle, ParticleSetProps } from "./types";
import { getEntranceTransition, getShapeStyles, getTransition } from "./utils";

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
 * Animated particle.
 *
 * The particle does NOT follow the cursor (no mouse parallax, no repulsion). All movement
 * comes from the looping keyframe animation — the particles are purely ambient.
 */
function AnimatedParticle({
	p,
	animationStyle,
	highContrast,
	gradient,
}: {
	p: Particle;
	animationStyle: ParticleSetProps["animationStyle"];
	highContrast: boolean;
	gradient?: boolean;
}) {
	const shapeStyles = getShapeStyles(p.shape, p.color, gradient);
	const style = particleStyle(p, highContrast);

	// Build a particle copy with adjusted opacity for the animation preset
	const adjustedP = highContrast ? { ...p, opacity: p.opacity * 0.5 } : p;

	return (
		<span className="absolute" style={style}>
			{/* Dedicated entrance wrapper: a short fade+scale in (~0.5s, lightly staggered),
			    decoupled from the loop's multi-second delay so particles never stay invisible
			    for seconds before popping in. Opacity composes multiplicatively with the loop. */}
			<m.span
				className="block h-full w-full"
				initial={{ opacity: 0, scale: 0.5 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={getEntranceTransition(p)}
			>
				{/* Looping keyframe animation (movement + opacity pulsing). Its long duration/delay
				    drive the organic motion — but must NOT gate the particle's first appearance. */}
				<m.span
					className="block h-full w-full"
					style={shapeStyles}
					animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
					transition={getTransition(p)}
				/>
			</m.span>
		</span>
	);
}

/** Static particle for reduced motion */
function StaticParticle({
	p,
	highContrast,
	gradient,
}: {
	p: Particle;
	highContrast: boolean;
	gradient?: boolean;
}) {
	const shapeStyles = getShapeStyles(p.shape, p.color, gradient);
	const style = particleStyle(p, highContrast);
	const opacity = effectiveOpacity(p, highContrast);

	return (
		<span className="absolute" style={style}>
			<span className="block h-full w-full" style={{ opacity, ...shapeStyles }} />
		</span>
	);
}

/**
 * Internal component for rendering a set of particles.
 * Handles both static (reduced motion) and animated rendering.
 */
export function ParticleSet({
	particles,
	isInView,
	reducedMotion,
	animationStyle,
	highContrast = false,
	gradient,
}: ParticleSetProps) {
	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{particles.map((p) => (
					<StaticParticle key={p.id} p={p} highContrast={highContrast} gradient={gradient} />
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
					highContrast={highContrast}
					gradient={gradient}
				/>
			))}
		</>
	);
}
