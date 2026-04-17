export type JewelryPaletteColor = {
	name: string;
	hex: `#${string}`;
};

export const JEWELRY_PALETTE: readonly JewelryPaletteColor[] = [
	{ name: "Or 18 carats", hex: "#D4AF37" },
	{ name: "Or 14 carats", hex: "#E6C300" },
	{ name: "Or rose", hex: "#E8B4A0" },
	{ name: "Argent 925", hex: "#C0C0C0" },
	{ name: "Rhodium noir", hex: "#2B2B2B" },
	{ name: "Bronze", hex: "#8C5B3F" },
	{ name: "Cuivre", hex: "#B87333" },
	{ name: "Blanc perle", hex: "#F8F4EE" },
	{ name: "Ivoire", hex: "#FFF8E7" },
	{ name: "Noir mat", hex: "#0B0B0B" },
	{ name: "Rubis", hex: "#9B111E" },
	{ name: "Saphir", hex: "#0F52BA" },
] as const;

export const RECENT_COLORS_MAX = 8;
