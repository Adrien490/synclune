/**
 * Animations Synclune — wrappers Motion / CSS production-ready 2026.
 *
 * Tous les wrappers respectent prefers-reduced-motion.
 *
 * Le LazyMotion + features domAnimation sont déjà montés au niveau racine via
 * `shared/providers/motion-provider.tsx` — les composants utilisent `m.` (~6kb).
 */

export { Fade } from "./fade";
export { Reveal } from "./reveal";
export { Stagger } from "./stagger";

export { SplitText } from "./split-text";
export { SplitTextCSS } from "./split-text-css";

export { HandDrawnAccent, HandDrawnUnderline } from "./hand-drawn-accent";

export {
	ParticleBackground,
	ParticleBackgroundError,
	RICH_ERROR_SHAPES,
} from "./particle-background/index";
