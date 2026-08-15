/**
 * Animations Synclune — wrappers production-ready 2026.
 *
 * Tous les wrappers respectent prefers-reduced-motion.
 *
 * composants universels pilotés par du CSS (`app/styles/entrance.css`) —
 * zéro motion-react, zéro coût d'hydratation.
 */

export { Fade } from "./fade";
export { Reveal } from "./reveal";

// `HandDrawnAccent` n'est PAS réexporté ici : ses 4 appelants l'importent tous
// depuis `./hand-drawn-accent` en direct. Un barrel qui réexporte ce que personne
// n'y prend est une deuxième porte sur la même pièce.
export { HandDrawnUnderline } from "./hand-drawn-accent";
