import { Fraunces, Figtree, Caveat } from "next/font/google";

// Fraunces — Serif display "Old Style" aux terminaisons organiques
// Axe SOFT pour courbes lunaires, WONK pour irrégularité artisanale
// Dramatic et expressive à grande taille, chaleureuse et humaine
export const fraunces = Fraunces({
	subsets: ["latin"],
	display: "swap",
	axes: ["opsz", "SOFT", "WONK"],
	variable: "--font-display",
	preload: false, // Avoid 26 browser warnings — font loads via CSS when needed
});

// Figtree — Sans-serif géométrique optimisée pour le web
// Clarté et lisibilité excellentes à 16px, courbes amicales
export const figtree = Figtree({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans",
	preload: false, // Safari warns about unused preload — body font renders after layout
});

// Caveat — Police manuscrite authentique et décontractée
// Écriture naturelle "petit mot dans le colis", univers artisanal intimiste
export const caveat = Caveat({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-cursive",
	preload: false, // Avoid browser warnings — font loads via CSS when needed
});
