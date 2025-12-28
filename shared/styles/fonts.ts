import { Crimson_Pro, Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

// Crimson Pro - Serif élégante pour titres de bijoux
// Police classique et raffinée, parfaite pour bijoux haut de gamme
// Caractère intemporel avec une touche de luxe
// Optimisé : Seulement 500 (medium) et 600 (semibold) + italic pour réduire LCP
export const crimsonPro = Crimson_Pro({
	subsets: ["latin"],
	display: "swap",
	weight: ["500", "600"], // Medium et Semibold uniquement (utilisés dans Hero et titres)
	style: ["normal", "italic"],
	variable: "--font-display", // Variable CSS pour les titres
	preload: true, // Preload pour LCP optimization
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
	preload: true, // Preload pour LCP optimization
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

// Pencerio - Police cursive élégante pour signatures manuscrites
// Style hairline délicat, parfait pour l'humanisation artisanale
export const pencerio = localFont({
	src: "../../public/fonts/pencerio/Pencerio-Hairline.woff2",
	display: "swap",
	variable: "--font-cursive", // Variable CSS pour les signatures
});
