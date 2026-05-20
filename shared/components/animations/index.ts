/**
 * Animations Synclune — wrappers production-ready 2026.
 *
 * Tous les wrappers respectent prefers-reduced-motion.
 *
 * Les wrappers d'entrée (Fade / Reveal / Stagger / HandDrawn) sont des
 * composants universels pilotés par du CSS (`app/styles/entrance.css`) —
 * zéro motion-react, zéro coût d'hydratation. ParticleBackground et les
 * animations interactives restent sur motion-react (`m.`).
 */

export { Fade } from "./fade";
export { Reveal } from "./reveal";
export { Stagger } from "./stagger";

export { SplitTextCSS } from "./split-text-css";

export { HandDrawnAccent, HandDrawnUnderline } from "./hand-drawn-accent";

export {
	ParticleBackground,
	ParticleBackgroundError,
	RICH_ERROR_SHAPES,
} from "./particle-background/index";
