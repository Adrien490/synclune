import { Inter, Dancing_Script, JetBrains_Mono, Josefin_Sans } from "next/font/google";

// Josefin Sans - Sans-serif géométrique élégante pour titres
// Design moderne et épuré, parfait pour une marque de bijoux contemporaine
// Police variable supportant les poids de 100 à 700
export const josefinSans = Josefin_Sans({
	subsets: ["latin"],
	display: "swap",
	style: ["normal", "italic"],
	variable: "--font-display", // Variable CSS pour les titres
});

// Inter - Sans-serif moderne et polyvalente pour corps de texte et UI
// Excellente lisibilité, design optimisé pour écrans
// Professionnelle et contemporaine
// Optimisé : Seulement 300 (light), 400 (regular), 600 (semibold) pour réduire bundle
export const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	weight: ["300", "400", "600"], // Light, Regular, Semibold (UI + Hero)
	variable: "--font-sans", // Variable CSS pour le texte principal
});

// JetBrains Mono - Monospace moderne pour prix et codes
// Design technique et contemporain, excellent pour données numériques
// Apporte un contraste moderne aux informations de prix
export const jetBrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	display: "swap",
	weight: ["400", "500", "600", "700"], // Regular à Bold
	variable: "--font-mono", // Variable CSS pour les prix et codes
});

// Dancing Script - Police cursive élégante pour signatures manuscrites
// Douce et authentique, parfaite pour l'humanisation artisanale
export const dancingScript = Dancing_Script({
	subsets: ["latin"],
	display: "swap",
	weight: ["400", "500", "600", "700"], // Regular à Bold
	variable: "--font-cursive", // Variable CSS pour les signatures
});
