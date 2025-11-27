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
export { Tap } from "./tap";
export { Pulse } from "./pulse";

// AnimatePresence amélioré
export { Presence } from "./presence";

// Background Animations (effets décoratifs)
export { LiquidGradient } from "./liquid-gradient";
export { GlitterSparkles } from "./glitter-sparkles";
export { ParticleSystem } from "./particle-system";
export { DecorativeHalo, DecorativeHaloGroup } from "./decorative-halo";
export { BubbleDream } from "./bubble-dream";

// Hero Backgrounds (compositions)
export { HeroBackgroundGlitter } from "./hero-background-glitter";
export * from "./hero-backgrounds";

// Types
export type { FadeProps } from "./fade";
export type { SlideProps } from "./slide";
export type { StaggerProps } from "./stagger";
export type { RevealProps } from "./reveal";
export type { HoverProps } from "./hover";
export type { TapProps } from "./tap";
export type { PulseProps } from "./pulse";
export type { PresenceProps } from "./presence";

// Background Animation Types
export type { LiquidGradientProps } from "./liquid-gradient";
export type { GlitterSparklesProps } from "./glitter-sparkles";
export type {
	ParticleSystemProps,
	Particle,
	AnimationType,
	ParticleColor,
	ParticleVariant,
} from "./particle-system";
export type { BubbleDreamProps } from "./bubble-dream";
export type { HeroBackgroundGlitterProps } from "./hero-background-glitter";
