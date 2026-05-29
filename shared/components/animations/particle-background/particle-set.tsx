"use client";

import { type MotionValue, m, useMotionValue, useTransform } from "motion/react";
import type { RefObject } from "react";
import { ANIMATION_PRESETS, SCROLL_PARALLAX_RANGE } from "./constants";
import { useScrollFade } from "./hooks/use-scroll-fade";
import type { Particle, ParticleSetProps } from "./types";
import {
	getEntranceTransition,
	getShapeStyles,
	getSvgConfig,
	getTransition,
	isSvgShape,
} from "./utils";

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

/** Resolve shape rendering props: SVG config or CSS styles (shared by animated + static particles) */
function resolveShape(p: Particle, gradient = false) {
	const isSvg = isSvgShape(p.shape);
	return {
		isSvg,
		svgConfig: isSvg ? getSvgConfig(p.shape) : null,
		shapeStyles: isSvg ? undefined : getShapeStyles(p.shape, p.color, gradient),
	};
}

/** SVG shape element shared by both animated and static particles */
function SvgShape({
	config,
	color,
}: {
	config: { viewBox: string; path: string; fillRule?: "evenodd" | "nonzero" };
	color: string;
}) {
	return (
		<svg
			viewBox={config.viewBox}
			className="h-full w-full"
			fill={color}
			aria-hidden="true"
			role="presentation"
		>
			<path d={config.path} fillRule={config.fillRule} />
		</svg>
	);
}

/**
 * Animated particle.
 *
 * The particle does NOT follow the cursor (no mouse parallax, no repulsion). Movement
 * comes from the looping keyframe animation plus an optional scroll parallax offset
 * (proportional to depth) — scroll-driven, never pointer-driven.
 */
function AnimatedParticle({
	p,
	animationStyle,
	highContrast,
	scrollOpacity,
	scrollYProgress,
	scrollParallax,
	gradient,
}: {
	p: Particle;
	animationStyle: ParticleSetProps["animationStyle"];
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
	scrollYProgress: MotionValue<number>;
	scrollParallax?: boolean;
	gradient?: boolean;
}) {
	const { isSvg, svgConfig, shapeStyles } = resolveShape(p, gradient);
	const style = particleStyle(p, highContrast);

	// Build a particle copy with adjusted opacity for the animation preset
	const adjustedP = highContrast ? { ...p, opacity: p.opacity * 0.5 } : p;

	// Close particles (low depthFactor) move more, far ones move less
	const strength = 1 - p.depthFactor;

	// Vertical scroll parallax offset (depth-scaled). Zero when scrollParallax is off.
	const scrollY = useTransform(scrollYProgress, (sy) =>
		scrollParallax ? (sy - 0.5) * 2 * SCROLL_PARALLAX_RANGE * strength : 0,
	);

	// Looping keyframe animation (movement + opacity pulsing). Its long duration/delay
	// drive the organic motion — but must NOT gate the particle's first appearance.
	const loopSpan =
		isSvg && svgConfig ? (
			<m.span
				className="block h-full w-full"
				animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
				transition={getTransition(p, animationStyle)}
			>
				<SvgShape config={svgConfig} color={p.color} />
			</m.span>
		) : (
			<m.span
				className="block h-full w-full"
				style={shapeStyles}
				animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
				transition={getTransition(p, animationStyle)}
			/>
		);

	// Dedicated entrance wrapper: a short fade+scale in (~0.5s, lightly staggered),
	// decoupled from the loop's multi-second delay so particles never stay invisible
	// for seconds before popping in. Opacity composes multiplicatively with the loop.
	const content = (
		<m.span
			className="block h-full w-full"
			initial={{ opacity: 0, scale: 0.5 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={getEntranceTransition(p)}
		>
			{loopSpan}
		</m.span>
	);

	return (
		<m.span
			className="absolute"
			style={{
				...style,
				y: scrollY,
				opacity: scrollOpacity,
			}}
		>
			{content}
		</m.span>
	);
}

/** Static particle for reduced motion */
function StaticParticle({
	p,
	highContrast,
	scrollOpacity,
	gradient,
}: {
	p: Particle;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
	gradient?: boolean;
}) {
	const { isSvg, svgConfig, shapeStyles } = resolveShape(p, gradient);
	const style = particleStyle(p, highContrast);
	const opacity = effectiveOpacity(p, highContrast);

	const inner =
		isSvg && svgConfig ? (
			<span className="block h-full w-full" style={{ opacity }}>
				<SvgShape config={svgConfig} color={p.color} />
			</span>
		) : (
			<span className="block h-full w-full" style={{ opacity, ...shapeStyles }} />
		);

	if (scrollOpacity) {
		return (
			<m.span className="absolute" style={{ ...style, opacity: scrollOpacity }}>
				{inner}
			</m.span>
		);
	}

	return (
		<span className="absolute" style={{ ...style }}>
			{inner}
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
	scrollOpacity,
	scrollYProgress,
	scrollParallax,
	gradient,
}: ParticleSetProps) {
	// Shared fallback for scroll progress — created once per set, not per particle
	const scrollFallback = useMotionValue(0);
	const resolvedScrollYProgress = scrollYProgress ?? scrollFallback;

	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{particles.map((p) => (
					<StaticParticle
						key={p.id}
						p={p}
						highContrast={highContrast}
						scrollOpacity={scrollOpacity}
						gradient={gradient}
					/>
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
					scrollOpacity={scrollOpacity}
					scrollYProgress={resolvedScrollYProgress}
					scrollParallax={scrollParallax}
					gradient={gradient}
				/>
			))}
		</>
	);
}

/**
 * Wrapper qui n'active le pipeline scroll (`useScroll` + listener) que lorsqu'une
 * feature scroll est demandée (`scrollFade` ou `scrollParallax`). Le rendu par défaut
 * passe directement par {@link ParticleSet} sans abonner aucun listener de scroll.
 */
export function ScrollAwareParticleSet({
	containerRef,
	scrollFade,
	scrollParallax,
	...rest
}: ParticleSetProps & {
	containerRef: RefObject<HTMLDivElement | null>;
	scrollFade?: boolean;
	scrollParallax?: boolean;
}) {
	const { scrollYProgress, scrollOpacity } = useScrollFade(containerRef);
	return (
		<ParticleSet
			{...rest}
			{...(scrollFade ? { scrollOpacity } : {})}
			{...(scrollParallax ? { scrollYProgress, scrollParallax: true } : {})}
		/>
	);
}
