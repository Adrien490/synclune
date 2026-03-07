import type { Easing, Transition } from "motion/react";
import {
	DEFAULT_AURORA_COLORS,
	DEFAULT_DURATION,
	INTENSITY_CONFIGS,
	RIBBON_EASINGS,
} from "./constants";
import type { AuroraIntensity, Ribbon } from "./types";
import { seededRandom } from "@/shared/utils/seeded-random";

/**
 * FIFO cache for generated ribbon arrays.
 * Same pattern as particle-background: deterministic outputs, no TTL needed.
 */
const ribbonCache = new Map<string, Ribbon[]>();
const MAX_CACHE_SIZE = 30;

/** Clear the ribbon cache (for tests only) */
export function clearRibbonCache() {
	ribbonCache.clear();
}

/** Generate a deterministic array of ribbons (memoized via FIFO cache) */
export function generateRibbons(
	count: number,
	width: [number, number],
	height: [number, number],
	opacity: [number, number],
	blur: [number, number],
	colors: string[],
	baseDuration: number = DEFAULT_DURATION,
): Ribbon[] {
	// Normalize tuples so min <= max
	const safeWidth: [number, number] = [Math.min(width[0], width[1]), Math.max(width[0], width[1])];
	const safeHeight: [number, number] = [
		Math.min(height[0], height[1]),
		Math.max(height[0], height[1]),
	];
	const safeOpacity: [number, number] = [
		Math.min(opacity[0], opacity[1]),
		Math.max(opacity[0], opacity[1]),
	];
	const safeBlur: [number, number] = [Math.min(blur[0], blur[1]), Math.max(blur[0], blur[1])];

	const cacheKey = JSON.stringify([
		count,
		safeWidth,
		safeHeight,
		safeOpacity,
		safeBlur,
		colors,
		baseDuration,
	]);
	const cached = ribbonCache.get(cacheKey);
	if (cached) return cached;

	const safeColors = colors.length > 0 ? colors : DEFAULT_AURORA_COLORS;

	const ribbons = Array.from({ length: count }, (_, i) => {
		const seed = i * 1000;
		const rand = (offset: number) => seededRandom(seed + offset);

		const ribbonWidth = safeWidth[0] + rand(1) * (safeWidth[1] - safeWidth[0]);
		const ribbonHeight = safeHeight[0] + rand(2) * (safeHeight[1] - safeHeight[0]);
		const x = 5 + rand(3) * 90;
		const y = 5 + rand(4) * 90;
		const ribbonOpacity = safeOpacity[0] + rand(5) * (safeOpacity[1] - safeOpacity[0]);
		const ribbonBlur = safeBlur[0] + rand(6) * (safeBlur[1] - safeBlur[0]);
		const rotation = -15 + rand(7) * 30; // -15 to 15 degrees
		const gradientAngle = rand(8) * 360;
		const scale = 0.8 + rand(9) * 0.4; // 0.8 to 1.2

		// Pick 3 gradient color stops from the palette
		const c1 = safeColors[Math.floor(rand(10) * safeColors.length)]!;
		const c2 = safeColors[Math.floor(rand(11) * safeColors.length)]!;
		const c3 = safeColors[Math.floor(rand(12) * safeColors.length)]!;

		// Depth: smaller ribbons are further away (more blur, slower)
		const sizeNorm = (ribbonWidth - safeWidth[0]) / (safeWidth[1] - safeWidth[0] || 1);
		const depthFactor = 1 - sizeNorm; // small = far = high depthFactor

		const duration = baseDuration * 0.8 + rand(13) * baseDuration * 0.4;
		const delay = rand(14) * baseDuration * 0.3;

		return {
			id: i,
			width: ribbonWidth,
			height: ribbonHeight,
			x,
			y,
			opacity: ribbonOpacity,
			blur: ribbonBlur,
			rotation,
			gradientAngle,
			gradientColors: [c1, c2, c3] as [string, string, string],
			duration,
			delay,
			scale,
			depthFactor,
		};
	});

	if (ribbonCache.size >= MAX_CACHE_SIZE) {
		const firstKey = ribbonCache.keys().next().value;
		if (firstKey) ribbonCache.delete(firstKey);
	}
	ribbonCache.set(cacheKey, ribbons);

	return ribbons;
}

/** Build a CSS linear-gradient string from a ribbon's gradient data */
export function buildRibbonGradient(
	gradientAngle: number,
	colors: [string, string, string],
): string {
	return `linear-gradient(${gradientAngle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
}

/** Return the Framer Motion transition for a ribbon */
export function getRibbonTransition(ribbon: Ribbon): Transition {
	return {
		duration: ribbon.duration,
		delay: ribbon.delay,
		ease: RIBBON_EASINGS[ribbon.id % RIBBON_EASINGS.length] as unknown as Easing,
		repeat: Infinity,
		repeatType: "reverse" as const,
		repeatDelay: ribbon.delay * 0.15,
	};
}

/** Return keyframe animation targets for a ribbon based on intensity */
export function getRibbonAnimation(
	ribbon: Ribbon,
	intensity: AuroraIntensity,
): { x: string[]; y: string[]; scale: number[]; rotate: number[]; opacity: number[] } {
	const config = INTENSITY_CONFIGS[intensity];
	const tr = config.translateRange;
	const sr = config.scaleRange;
	const rr = config.rotateRange;

	// Seeded direction for each ribbon
	const rand = (offset: number) => seededRandom(ribbon.id * 1000 + 100 + offset);
	const dirX = rand(0) > 0.5 ? 1 : -1;
	const dirY = rand(1) > 0.5 ? 1 : -1;
	const dirR = rand(2) > 0.5 ? 1 : -1;

	const baseOpacity = ribbon.opacity * config.opacityMultiplier;

	return {
		x: ["0%", `${dirX * tr * rand(3)}%`, `${-dirX * tr * rand(4) * 0.6}%`, "0%"],
		y: ["0%", `${dirY * tr * rand(5) * 0.8}%`, `${-dirY * tr * rand(6) * 0.5}%`, "0%"],
		scale: [ribbon.scale, sr[1] * ribbon.scale, sr[0] * ribbon.scale, ribbon.scale],
		rotate: [
			ribbon.rotation,
			ribbon.rotation + dirR * rr * rand(7),
			ribbon.rotation - dirR * rr * rand(8) * 0.6,
			ribbon.rotation,
		],
		opacity: [baseOpacity, Math.min(baseOpacity * 1.2, 1), baseOpacity * 0.8, baseOpacity],
	};
}
