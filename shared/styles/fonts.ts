import { Inter, Petit_Formal_Script, Cormorant_Garamond } from "next/font/google";

// Cormorant Garamond - Serif display élégant pour titres
// Inspiré de Garamond du XVIe siècle, réimaginé pour l'écran
// Contraste élevé, serifs fins, courbes élégantes — parfait pour les bijoux artisanaux
export const cormorantGaramond = Cormorant_Garamond({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-display", // Variable CSS pour les titres
	preload: true, // LCP element uses this font (hero h1 via SectionTitle)
});

// Inter - Sans-serif moderne et polyvalente pour corps de texte et UI
// Excellente lisibilité, design optimisé pour écrans
// Professionnelle et contemporaine
export const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans", // Variable CSS pour le texte principal
});

// Petit Formal Script - Police cursive sophistiquée pour signatures
// Élégante et raffinée, positionnement luxe artisanal
export const petitFormalScript = Petit_Formal_Script({
	subsets: ["latin"],
	display: "optional",
	weight: ["400"],
	variable: "--font-cursive",
	preload: false, // Only used below-the-fold (signatures)
});
