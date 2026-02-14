import { Inter, Petit_Formal_Script, Cormorant_Garamond } from "next/font/google";

// Cormorant Garamond - Serif display élégant pour titres
// Inspiré de Garamond du XVIe siècle, réimaginé pour l'écran
// Contraste élevé, serifs fins, courbes élégantes — parfait pour les bijoux artisanaux
export const cormorantGaramond = Cormorant_Garamond({
	subsets: ["latin"],
	display: "swap",
	weight: ["400", "500", "600"],
	variable: "--font-display", // Variable CSS pour les titres
	preload: false, // Only used below-the-fold (section titles)
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

// Petit Formal Script - Police cursive sophistiquée pour signatures
// Élégante et raffinée, positionnement luxe artisanal
export const petitFormalScript = Petit_Formal_Script({
	subsets: ["latin"],
	display: "swap",
	weight: ["400"],
	variable: "--font-cursive",
	preload: false, // Only used below-the-fold (signatures)
});
