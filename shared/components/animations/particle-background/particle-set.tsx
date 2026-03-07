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
		shapeStyles: isSvg ? undefined : getShapeStyles(p.shape, p.color),
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

/** Max vertical offset in pixels for scroll parallax (closest particles) */
const SCROLL_PARALLAX_RANGE = 40;

/** Max repulsion offset in pixels */
const REPULSION_STRENGTH = 30;

/** Repulsion radius as fraction of container diagonal (0-1) */
const REPULSION_RADIUS = 0.15;

/**
 * Animated particle with mouse parallax.
 * Uses an outer m.span for the mouse offset (transforms driven by MotionValues)
 * and an inner m.span for the looping keyframe animation, avoiding conflicts.
 *
 * P4/P5/P7: All transform offsets (mouse parallax, scroll parallax, repulsion) are
 * computed in 2 combined useTransform hooks instead of 8 chained ones.
 * Features are gated by boolean props — unused features add zero overhead.
 */
function AnimatedParticle({
	p,
	animationStyle,
	mouseX,
	mouseY,
	highContrast,
	scrollOpacity,
	scrollYProgress,
	scrollParallax,
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
	scrollYProgress: MotionValue<number>;
	scrollParallax?: boolean;
	interactive?: boolean;
	cursorX: MotionValue<number>;
	cursorY: MotionValue<number>;
}) {
	const { isSvg, svgConfig, shapeStyles } = resolveShape(p);
	const style = particleStyle(p, highContrast);

	// Build a particle copy with adjusted opacity for the animation preset
	const adjustedP = highContrast ? { ...p, opacity: p.opacity * 0.5 } : p;

	// Close particles (low depthFactor) move more, far ones move less
	const strength = 1 - p.depthFactor;

	// Combined X offset: mouse parallax + repulsion (when interactive)
	const combinedX = useTransform([mouseX, cursorX, cursorY], ([mx, cx, cy]) => {
		let x = (mx as number) * strength;
		if (interactive) {
			const dx = p.x / 100 - (cx as number);
			const dy = p.y / 100 - (cy as number);
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > 0.001 && dist <= REPULSION_RADIUS) {
				const factor = (1 - dist / REPULSION_RADIUS) ** 2;
				x += (dx / dist) * factor * REPULSION_STRENGTH;
			}
		}
		return x;
	});

	// Combined Y offset: mouse parallax + scroll parallax + repulsion (when active)
	const combinedY = useTransform(
		[mouseY, scrollYProgress, cursorX, cursorY],
		([my, sy, cx, cy]) => {
			let y = (my as number) * strength;
			if (scrollParallax) {
				y += ((sy as number) - 0.5) * 2 * SCROLL_PARALLAX_RANGE * strength;
			}
			if (interactive) {
				const dx = p.x / 100 - (cx as number);
				const dy = p.y / 100 - (cy as number);
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > 0.001 && dist <= REPULSION_RADIUS) {
					const factor = (1 - dist / REPULSION_RADIUS) ** 2;
					y += (dy / dist) * factor * REPULSION_STRENGTH;
				}
			}
			return y;
		},
	);

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
 * Internal component for rendering a set of particles.
 * Handles both static (reduced motion) and animated rendering.
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
	scrollParallax,
	interactive,
	cursorX,
	cursorY,
}: ParticleSetProps) {
	// Shared fallback MotionValues — created once per set, not per particle
	const fallback = useMotionValue(0);
	const scrollFallback = useMotionValue(0);
	const cursorFallback = useMotionValue(0.5);
	const resolvedX = mouseX ?? fallback;
	const resolvedY = mouseY ?? fallback;
	const resolvedScrollYProgress = scrollYProgress ?? scrollFallback;
	const resolvedCursorX = cursorX ?? cursorFallback;
	const resolvedCursorY = cursorY ?? cursorFallback;

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
					scrollYProgress={resolvedScrollYProgress}
					scrollParallax={scrollParallax}
					interactive={interactive}
					cursorX={resolvedCursorX}
					cursorY={resolvedCursorY}
				/>
			))}
		</>
	);
}
