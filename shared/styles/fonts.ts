import { Fraunces, Figtree, Sacramento } from "next/font/google";

// Fraunces — Serif display "Old Style" aux terminaisons organiques
// `opsz` (optical sizing) reste actif via `font-optical-sizing: auto` (défaut).
// PERF : les axes `SOFT`/`WONK` ont été retirés — aucun `font-variation-settings`
// ne les pilote dans le CSS (ils restaient figés à leur défaut 0), si bien qu'ils
// n'apportaient aucun rendu visible mais alourdissaient le woff2 variable (~122 KiB)
// sur le chemin critique LCP. Sans eux, le rendu est strictement identique.
export const fraunces = Fraunces({
	subsets: ["latin"],
	display: "swap",
	axes: ["opsz"],
	variable: "--font-display",
	// Hero h1 uses Fraunces above-fold; without preload the woff2 fetched in ~3s on desktop, blocking LCP element render.
	preload: true,
});

// Figtree — Sans-serif géométrique optimisée pour le web
// Clarté et lisibilité excellentes à 16px, courbes amicales
export const figtree = Figtree({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans",
	// PERF : pas de preload. Sur mobile l'élément LCP est le h1 Fraunces (préchargé),
	// PAS le corps de texte Figtree. Précharger un 2ᵉ woff2 sur un chemin critique
	// network-byte-bound (LCP mobile 7–12s) vole de la bande passante à l'image/au
	// texte LCP. `display: "swap"` + fallback `system-ui` (métriquement proche, CLS
	// borné par adjustFontFallback) couvrent le premier paint sans flash gênant.
	preload: false,
});

// Sacramento — Script signature monoline (mono-poids 400)
// Lecture "signature manuscrite" élégante : logotype Synclune + effet "petit mot dans le
// colis", plus premium/bespoke que la cursive Caveat ubiquitaire, et woff2 plus léger.
// A11Y : `--font-cursive` est RÉSERVÉE au décoratif non-essentiel (nom de marque, légendes
// polaroid) — jamais prix, libellés de formulaire, navigation fonctionnelle ni body
// (lisibilité faible des scripts à petite taille / dyslexie). Mono-poids : ne pas appliquer
// font-bold/semibold (aucune graisse à rendre) ni `italic` (faux-oblique sur un script déjà
// incliné) sur les usages `font-cursive`.
export const sacramento = Sacramento({
	subsets: ["latin"],
	weight: "400",
	display: "swap",
	variable: "--font-cursive",
	// Navbar streams in via Suspense (after LCP) and atelier signature is below the fold.
	// `display: "swap"` keeps the fallback visible until Sacramento loads — no preload needed.
	preload: false,
});
