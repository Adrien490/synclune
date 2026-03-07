import type { MotionValue } from "motion/react";

/** Named aurora color palettes */
export type AuroraPalette = "jewelry" | "rose-gold" | "moonstone" | "amethyst";

/** Intensity presets controlling animation amplitude */
export type AuroraIntensity = "subtle" | "medium" | "vivid";

/** Blend mode for ribbon compositing */
export type AuroraBlendMode = "screen" | "soft-light" | "overlay" | "normal";

/** Props du composant AuroraBackground */
export interface AuroraBackgroundProps {
	/** Number of ribbons (default: 5, mobile: ceil(count*0.6)) */
	count?: number;
	/** Ribbon width range in px (default: [300, 600]) */
	width?: [number, number];
	/** Ribbon height range in px (default: [100, 300]) */
	height?: [number, number];
	/** Opacity range (default: [0.15, 0.35]) */
	opacity?: [number, number];
	/** Blur range in px (default: [40, 80]) */
	blur?: [number, number];
	/** Custom CSS colors (overrides palette) */
	colors?: string[];
	/** Named palette (used if colors is not set) */
	palette?: AuroraPalette;
	/** Animation intensity preset (default: "medium") */
	intensity?: AuroraIntensity;
	/** Blend mode for overlapping ribbons (default: "screen") */
	blendMode?: AuroraBlendMode;
	/** Speed multiplier (default: 1, lower = slower) */
	speed?: number;
	/** Additional CSS classes */
	className?: string;
	/** Disable on touch devices (default: false) */
	disableOnTouch?: boolean;
	/** Fade ribbons based on scroll position (default: false) */
	scrollFade?: boolean;
	/** Mouse attraction for ribbons, desktop only (default: false) */
	interactive?: boolean;
}

/** Internal ribbon data */
export interface Ribbon {
	id: number;
	width: number;
	height: number;
	x: number;
	y: number;
	opacity: number;
	blur: number;
	rotation: number;
	gradientAngle: number;
	gradientColors: [string, string, string];
	duration: number;
	delay: number;
	scale: number;
	/** Depth factor 0-1 (0=close, 1=far) for parallax */
	depthFactor: number;
}

/** Props du sous-composant AuroraRibbonSet */
export interface AuroraRibbonSetProps {
	ribbons: Ribbon[];
	isInView: boolean;
	reducedMotion: boolean | null;
	blendMode: AuroraBlendMode;
	intensity: AuroraIntensity;
	/** Mouse position as pixel offset for parallax (desktop only) */
	mouseX?: MotionValue<number>;
	mouseY?: MotionValue<number>;
	/** High contrast mode: reduce opacity 50%, increase blur 50% */
	highContrast?: boolean;
	/** Scroll-linked opacity (0-1) for progressive fade */
	scrollOpacity?: MotionValue<number>;
	/** Enable mouse attraction */
	interactive?: boolean;
	/** Normalized cursor X position (0-1) for attraction */
	cursorX?: MotionValue<number>;
	/** Normalized cursor Y position (0-1) for attraction */
	cursorY?: MotionValue<number>;
}
