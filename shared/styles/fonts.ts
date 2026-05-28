import { Fraunces, Figtree, Caveat } from "next/font/google";

// Fraunces — Serif display "Old Style" aux terminaisons organiques
// Axe SOFT pour courbes lunaires, WONK pour irrégularité artisanale
// Dramatic et expressive à grande taille, chaleureuse et humaine
export const fraunces = Fraunces({
	subsets: ["latin"],
	display: "swap",
	axes: ["opsz", "SOFT", "WONK"],
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
	preload: true,
});

// Caveat — Police manuscrite authentique et décontractée
// Écriture naturelle "petit mot dans le colis", univers artisanal intimiste
export const caveat = Caveat({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-cursive",
	// Navbar streams in via Suspense (after LCP) and atelier signature is below the fold.
	// `display: "swap"` keeps the fallback visible until Caveat loads — no preload needed.
	preload: false,
});
