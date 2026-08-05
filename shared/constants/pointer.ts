/**
 * SSOT des media queries de **capacité de pointeur**.
 *
 * Les seuils de LARGEUR vivent dans `breakpoints.ts` (`mediaBelow` /
 * `mediaAtLeast`) et sont verrouillés par `no-px-media-query.regression.test.ts`.
 * Les capacités, elles, n'avaient aucune SSOT : la même question était posée en
 * trois endroits, avec trois chaînes écrites à la main, dont deux se ressemblaient
 * assez pour qu'on les croie liées.
 *
 * ⚠️ **Ces trois prédicats ne sont PAS les négations les uns des autres.**
 * `HOVER_CAPABLE_QUERY` et `TOUCH_QUERY` peuvent être faux **en même temps** : un
 * portable Windows à écran tactile a pour pointeur PRIMAIRE son trackpad
 * (`hover: hover` + `pointer: fine`) tout en acceptant le doigt. C'est cette
 * classe d'appareils qui avait fait revenir le zoom collé de la galerie après le
 * correctif iPad du 2026-08-03 : un gating par media query reste **au niveau
 * appareil**, il faut le doubler d'un fait **par événement**
 * (`onPointerEnter` + `e.pointerType !== "mouse"`, cf. `gallery/hover-zoom.tsx`).
 * Ne jamais dériver l'une de l'autre par un `!`.
 */

/**
 * Le pointeur primaire sait survoler ET vise précisément.
 *
 * ⚠️ Doit rester **strictement identique** à la condition du
 * `@custom-variant can-hover` d'`app/globals.css`, sinon une branche JS et son
 * jumeau CSS `can-hover:` divergent en silence sur les appareils hybrides.
 * Verrouillé par `__tests__/pointer-capability-ssot.regression.test.ts`.
 */
export const HOVER_CAPABLE_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Appareil tactile : aucune capacité de survol et pointeur imprécis.
 *
 * Limite connue : ne détecte pas les commutateurs / oculomètres (`pointer: none`).
 * Leurs utilisateurs sont supposés avoir `prefers-reduced-motion`, qui coupe de
 * son côté les effets concernés.
 */
export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

/**
 * Pointeur précis, **sans rien dire du survol**.
 *
 * Volontairement distinct de `HOVER_CAPABLE_QUERY` : il répond à « les raccourcis
 * souris/clavier ont-ils un sens ici ? », pas à « puis-je révéler quelque chose au
 * survol ? ». Un stylet actif est `pointer: fine` sans être `hover: hover`.
 */
export const FINE_POINTER_QUERY = "(pointer: fine)";
