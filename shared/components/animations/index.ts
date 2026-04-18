/**
 * Animations Synclune — wrappers Motion / CSS production-ready 2026.
 *
 * Tous les wrappers respectent prefers-reduced-motion.
 * Les composants interactifs (Tap, ErrorShake, ScrollIndicator, AnimatedNumber opt-in)
 * intègrent useHaptic (Vibration API) avec fallback no-op iOS Safari.
 *
 * Le LazyMotion + features domAnimation sont déjà montés au niveau racine via
 * `shared/providers/motion-provider.tsx` — les composants utilisent `m.` (~6kb).
 */

// Animations entrée / scroll
export { Fade } from "./fade";
export { Slide } from "./slide";
export { Reveal } from "./reveal";
export { Stagger } from "./stagger";
export { StaggerGrid, type StaggerGridProps } from "./stagger-grid";
export type {
	FadeProps,
	SlideProps,
	SlideDirection,
	RevealProps,
	StaggerProps,
	ViewportAmount,
} from "./types";

// Gestures & interactivité (haptic)
export { Tap, type TapProps } from "./tap";
export { Hover, type HoverProps } from "./hover";
export { Pulse, type PulseProps } from "./pulse";
export { ErrorShake, type ErrorShakeProps } from "./error-shake";

// Number animations
export { AnimatedNumber, NumberTicker, type AnimatedNumberProps } from "./animated-number";

// Scroll UX
export { ScrollIndicator, type ScrollIndicatorProps } from "./scroll-indicator";

// Text animations
export { SplitText, type SplitTextProps } from "./split-text";
export { SplitTextCSS, type SplitTextCSSProps } from "./split-text-css";

// Background / décoratif
export {
	HandDrawnAccent,
	HandDrawnUnderline,
	HandDrawnCircle,
	type HandDrawnAccentProps,
} from "./hand-drawn-accent";
export {
	DecorativeHalo,
	DecorativeHaloGroup,
	type DecorativeHaloProps,
	type DecorativeHaloGroupProps,
} from "./decorative-halo";
export { GlitterSparkles, type GlitterSparklesProps } from "./glitter-sparkles";
export { ParticleBackground, ParticleBackgroundError } from "./particle-background/index";
export type { AnimationStyle, ParticleBackgroundProps, ParticleShape } from "./particle-background";

// Config & helpers
export { MOTION_CONFIG, maybeReduceMotion } from "./motion.config";
