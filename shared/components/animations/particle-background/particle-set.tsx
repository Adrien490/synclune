"use client";

import { type MotionValue, m, useMotionValue, useTransform } from "motion/react";
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

/** Resolve shape rendering props: SVG config or CSS styles (shared by animated + static particles) */
function resolveShape(p: Particle) {
	const isSvg = isSvgShape(p.shape);
	return {
		isSvg,
		svgConfig: isSvg ? getSvgConfig(p.shape) : null,
		shapeStyles: isSvg ? undefined : getShapeStyles(p.shape, p.size, p.color),
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
 * Animated particle with mouse parallax.
 * Uses an outer m.span for the mouse offset (transforms driven by MotionValues)
 * and an inner m.span for the looping keyframe animation, avoiding conflicts.
 *
 * Opacity is controlled at two levels:
 * 1. **Animation preset** — keyframe opacity in ANIMATION_PRESETS (via adjustedP) on the inner span
 * 2. **Scroll fade** — scrollOpacity MotionValue on the outer wrapper (optional)
 * CSS opacity cascades multiplicatively (parent × child), so both levels combine correctly:
 * the inner preset handles per-particle opacity variation while scrollOpacity handles
 * the global fade-in/out as the container scrolls through the viewport.
 */
/** Max vertical offset in pixels for scroll parallax (closest particles) */
const SCROLL_PARALLAX_RANGE = 40;

/** Max repulsion offset in pixels */
const REPULSION_STRENGTH = 30;

/** Repulsion radius as fraction of container diagonal (0-1) */
const REPULSION_RADIUS = 0.15;

function AnimatedParticle({
	p,
	animationStyle,
	mouseX,
	mouseY,
	highContrast,
	scrollOpacity,
	scrollYProgress,
	interactive,
	cursorX,
	cursorY,
}: {
	p: Particle;
	animationStyle: ParticleSetProps["animationStyle"];
	mouseX: MotionValue<number>;
	mouseY: MotionValue<number>;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
	scrollYProgress?: MotionValue<number>;
	interactive?: boolean;
	cursorX?: MotionValue<number>;
	cursorY?: MotionValue<number>;
}) {
	const { isSvg, svgConfig, shapeStyles } = resolveShape(p);
	const style = particleStyle(p, highContrast);

	// Build a particle copy with adjusted opacity for the animation preset
	const adjustedP = highContrast ? { ...p, opacity: p.opacity * 0.5 } : p;

	// Close particles (low depthFactor) move more, far ones move less
	const strength = 1 - p.depthFactor;
	const px = useTransform(mouseX, (v) => v * strength);
	const py = useTransform(mouseY, (v) => v * strength);

	// Scroll parallax: vertical displacement proportional to depth (close particles move more)
	const scrollFallback = useMotionValue(0);
	const scrollParallaxY = useTransform(
		scrollYProgress ?? scrollFallback,
		(v) => (v - 0.5) * 2 * SCROLL_PARALLAX_RANGE * strength,
	);

	// Interactive repulsion: push particle away from cursor
	const cursorFallback = useMotionValue(0.5);
	const resolvedCursorX = cursorX ?? cursorFallback;
	const resolvedCursorY = cursorY ?? cursorFallback;
	const repulsionX = useTransform([resolvedCursorX, resolvedCursorY], ([cx, cy]) => {
		if (!interactive) return 0;
		const dx = p.x / 100 - (cx as number);
		const dy = p.y / 100 - (cy as number);
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist > REPULSION_RADIUS || dist < 0.001) return 0;
		const factor = (1 - dist / REPULSION_RADIUS) ** 2; // quadratic falloff
		return (dx / dist) * factor * REPULSION_STRENGTH;
	});
	const repulsionY = useTransform([resolvedCursorX, resolvedCursorY], ([cx, cy]) => {
		if (!interactive) return 0;
		const dx = p.x / 100 - (cx as number);
		const dy = p.y / 100 - (cy as number);
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist > REPULSION_RADIUS || dist < 0.001) return 0;
		const factor = (1 - dist / REPULSION_RADIUS) ** 2;
		return (dy / dist) * factor * REPULSION_STRENGTH;
	});

	// Staggered entrance: particles fade+scale in with their individual delay
	const entrance = { opacity: 0, scale: 0.5 };

	// Opacity is handled by the animation preset via adjustedP — no need for style.opacity
	const content =
		isSvg && svgConfig ? (
			<m.span
				className="block h-full w-full"
				initial={entrance}
				animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
				transition={getTransition(p, animationStyle)}
			>
				<SvgShape config={svgConfig} color={p.color} />
			</m.span>
		) : (
			<m.span
				className="block h-full w-full"
				style={shapeStyles}
				initial={entrance}
				animate={ANIMATION_PRESETS[animationStyle](adjustedP)}
				transition={getTransition(p, animationStyle)}
			/>
		);

	// Combine all X offsets: mouse parallax + repulsion
	const combinedX = useTransform([px, repulsionX], ([mouseOffset, repulse]) => {
		return (mouseOffset as number) + (repulse as number);
	});

	// Combine all Y offsets: mouse parallax + scroll parallax + repulsion
	const combinedY = useTransform(
		[py, scrollParallaxY, repulsionY],
		([mouseOffset, scrollOffset, repulse]) => {
			return (mouseOffset as number) + (scrollOffset as number) + (repulse as number);
		},
	);

	return (
		<m.span
			className="absolute"
			style={{
				...style,
				x: combinedX,
				y: combinedY,
				opacity: scrollOpacity,
				willChange: "transform",
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
}: {
	p: Particle;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
}) {
	const { isSvg, svgConfig, shapeStyles } = resolveShape(p);
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
	scrollYProgress,
	interactive,
	cursorX,
	cursorY,
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
					<StaticParticle
						key={p.id}
						p={p}
						highContrast={highContrast}
						scrollOpacity={scrollOpacity}
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
					mouseX={resolvedX}
					mouseY={resolvedY}
					highContrast={highContrast}
					scrollOpacity={scrollOpacity}
					scrollYProgress={scrollYProgress}
					interactive={interactive}
					cursorX={cursorX}
					cursorY={cursorY}
				/>
			))}
		</>
	);
}
