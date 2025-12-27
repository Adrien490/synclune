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
export { Pulse } from "./pulse";
export { Tap } from "./tap";


// Scroll indicator
export { ScrollIndicator } from "./scroll-indicator";

// Background Animations (effets décoratifs)
export { BubbleDream } from "./bubble-dream";
export { DecorativeHalo, DecorativeHaloGroup } from "./decorative-halo";
export { GlitterSparkles } from "./glitter-sparkles";
export { ParticleSystem } from "./particle-system/index";

// Interactive Animations
export { MagneticWrapper } from "./magnetic-wrapper";

// Types
export type { FadeProps } from "./fade";
export type { HoverProps } from "./hover";
export type { PulseProps } from "./pulse";
export type { RevealProps } from "./reveal";
export type { ScrollIndicatorProps } from "./scroll-indicator";
export type { SlideProps } from "./slide";
export type { StaggerProps } from "./stagger";
export type { TapProps } from "./tap";

// Background Animation Types
export type { BubbleDreamProps } from "./bubble-dream";
export type { GlitterSparklesProps } from "./glitter-sparkles";
export type {
	AnimationStyle, ParticleShape, ParticleSystemProps
} from "./particle-system/index";

