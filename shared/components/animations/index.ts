/**
 * Animations Framer Motion ultra-simples
 * Approche directe et fonctionnelle - 2025
 */

// Animations de base
export { Fade } from "./fade";
export { Slide } from "./slide";
export { Stagger } from "./stagger";

// Scroll-triggered
export { Reveal } from "./reveal";

// Gestures & Interactivité
export { Hover } from "./hover";
export { HoverScale } from "./hover-scale";
export { Pulse } from "./pulse";
export { Tap } from "./tap";

// Form animations
export { ErrorShake } from "./error-shake";

// Grid animations
export { StaggerGrid } from "./stagger-grid";


// Scroll indicator
export { ScrollIndicator } from "./scroll-indicator";

// Background Animations (effets décoratifs)
export { BubbleDream } from "./bubble-dream";
export { DecorativeHalo, DecorativeHaloGroup } from "./decorative-halo";
export { GlitterSparkles } from "./glitter-sparkles";
export { HandDrawnAccent, HandDrawnCircle, HandDrawnUnderline } from "./hand-drawn-accent";
export { ParticleBackground } from "./particle-background/index";

// Types
export type { ErrorShakeProps } from "./error-shake";
export type { FadeProps } from "./fade";
export type { HoverProps } from "./hover";
export type { HoverScaleProps } from "./hover-scale";
export type { PulseProps } from "./pulse";
export type { RevealProps } from "./reveal";
export type { ScrollIndicatorProps } from "./scroll-indicator";
export type { SlideProps } from "./slide";
export type { StaggerGridProps } from "./stagger-grid";
export type { StaggerProps } from "./stagger";
export type { TapProps } from "./tap";

// Background Animation Types
export type { BubbleDreamProps } from "./bubble-dream";
export type { GlitterSparklesProps } from "./glitter-sparkles";
export type { HandDrawnAccentProps } from "./hand-drawn-accent";
export type {
	AnimationStyle, ParticleBackgroundProps, ParticleShape
} from "./particle-background/index";

