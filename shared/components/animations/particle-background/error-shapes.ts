// Constantes extraites de `presets.tsx` : un fichier de composants qui exporte
// aussi des non-composants casse le Fast Refresh.
import type { ParticleShape } from "./types";

/** Triplet de formes utilise sur les pages d'erreur "riches" (404 racine + shop error). */
export const RICH_ERROR_SHAPES = [
	"heart",
	"diamond",
	"circle",
] as const satisfies readonly ParticleShape[];

/** Doublet sobre par defaut des pages d'erreur de section (catalogue, collections, creations). */
export const SOFT_ERROR_SHAPES = ["diamond", "heart"] as const satisfies readonly ParticleShape[];
