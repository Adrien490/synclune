"use client";

import { type MotionValue, m, useMotionValue, useTransform } from "motion/react";
import type { AuroraRibbonSetProps, Ribbon } from "./types";
import { buildRibbonGradient, getRibbonAnimation, getRibbonTransition } from "./utils";
import type { AuroraBlendMode, AuroraIntensity } from "./types";

/** Max attraction offset in pixels */
const MOUSE_ATTRACTION_STRENGTH = 12;

/** Attraction radius as fraction of container diagonal (0-1) */
const ATTRACTION_RADIUS = 0.2;

export function ribbonStyle(r: Ribbon, blendMode: AuroraBlendMode, highContrast: boolean) {
	const blur = highContrast ? r.blur * 1.5 : r.blur;
	return {
		width: r.width,
		height: r.height,
		left: `${r.x}%`,
		top: `${r.y}%`,
		filter: `blur(${blur}px)`,
		mixBlendMode: blendMode,
		zIndex: Math.round((1 - r.depthFactor) * 10),
	};
}

/** Animated ribbon with mouse attraction */
function AnimatedRibbon({
	r,
	blendMode,
	intensity,
	mouseX,
	mouseY,
	highContrast,
	scrollOpacity,
	interactive,
	cursorX,
	cursorY,
}: {
	r: Ribbon;
	blendMode: AuroraBlendMode;
	intensity: AuroraIntensity;
	mouseX: MotionValue<number>;
	mouseY: MotionValue<number>;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
	interactive?: boolean;
	cursorX: MotionValue<number>;
	cursorY: MotionValue<number>;
}) {
	const style = ribbonStyle(r, blendMode, highContrast);
	const animation = getRibbonAnimation(r, intensity);
	const transition = getRibbonTransition(r);

	// Close ribbons (low depthFactor) move more
	const strength = 1 - r.depthFactor;

	// Combined X offset: mouse parallax + attraction
	const combinedX = useTransform([mouseX, cursorX, cursorY], ([mx, cx, cy]) => {
		let x = (mx as number) * strength;
		if (interactive) {
			const dx = r.x / 100 - (cx as number);
			const dy = r.y / 100 - (cy as number);
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > 0.001 && dist <= ATTRACTION_RADIUS) {
				const factor = (1 - dist / ATTRACTION_RADIUS) ** 2;
				// Attraction: move toward cursor (negative dx direction)
				x -= (dx / dist) * factor * MOUSE_ATTRACTION_STRENGTH;
			}
		}
		return x;
	});

	// Combined Y offset: mouse parallax + attraction
	const combinedY = useTransform([mouseY, cursorX, cursorY], ([my, cx, cy]) => {
		let y = (my as number) * strength;
		if (interactive) {
			const dx = r.x / 100 - (cx as number);
			const dy = r.y / 100 - (cy as number);
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > 0.001 && dist <= ATTRACTION_RADIUS) {
				const factor = (1 - dist / ATTRACTION_RADIUS) ** 2;
				y -= (dy / dist) * factor * MOUSE_ATTRACTION_STRENGTH;
			}
		}
		return y;
	});

	const gradient = buildRibbonGradient(r.gradientAngle, r.gradientColors);

	return (
		<m.div
			className="absolute"
			style={{
				...style,
				x: combinedX,
				y: combinedY,
				opacity: scrollOpacity,
				willChange: "transform",
			}}
		>
			<m.div
				className="h-full w-full rounded-[50%]"
				style={{ background: gradient }}
				initial={{ opacity: 0, scale: 0.7 }}
				animate={animation}
				transition={transition}
			/>
		</m.div>
	);
}

/** Static ribbon for reduced motion */
function StaticRibbon({
	r,
	blendMode,
	highContrast,
	scrollOpacity,
}: {
	r: Ribbon;
	blendMode: AuroraBlendMode;
	highContrast: boolean;
	scrollOpacity?: MotionValue<number>;
}) {
	const style = ribbonStyle(r, blendMode, highContrast);
	const opacity = highContrast ? r.opacity * 0.5 : r.opacity;
	const gradient = buildRibbonGradient(r.gradientAngle, r.gradientColors);

	const inner = (
		<div
			className="h-full w-full rounded-[50%]"
			style={{
				background: gradient,
				opacity,
				transform: `rotate(${r.rotation}deg) scale(${r.scale})`,
			}}
		/>
	);

	if (scrollOpacity) {
		return (
			<m.div className="absolute" style={{ ...style, opacity: scrollOpacity }}>
				{inner}
			</m.div>
		);
	}

	return (
		<div className="absolute" style={style}>
			{inner}
		</div>
	);
}

/**
 * Internal component for rendering a set of aurora ribbons.
 * Handles both static (reduced motion) and animated rendering.
 */
export function AuroraRibbonSet({
	ribbons,
	isInView,
	reducedMotion,
	blendMode,
	intensity,
	mouseX,
	mouseY,
	highContrast = false,
	scrollOpacity,
	interactive,
	cursorX,
	cursorY,
}: AuroraRibbonSetProps) {
	// Shared fallback MotionValues
	const fallback = useMotionValue(0);
	const cursorFallback = useMotionValue(0.5);
	const resolvedX = mouseX ?? fallback;
	const resolvedY = mouseY ?? fallback;
	const resolvedCursorX = cursorX ?? cursorFallback;
	const resolvedCursorY = cursorY ?? cursorFallback;

	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{ribbons.map((r) => (
					<StaticRibbon
						key={r.id}
						r={r}
						blendMode={blendMode}
						highContrast={highContrast}
						scrollOpacity={scrollOpacity}
					/>
				))}
			</>
		);
	}

	return (
		<>
			{ribbons.map((r) => (
				<AnimatedRibbon
					key={r.id}
					r={r}
					blendMode={blendMode}
					intensity={intensity}
					mouseX={resolvedX}
					mouseY={resolvedY}
					highContrast={highContrast}
					scrollOpacity={scrollOpacity}
					interactive={interactive}
					cursorX={resolvedCursorX}
					cursorY={resolvedCursorY}
				/>
			))}
		</>
	);
}
