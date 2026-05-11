export interface ColorLibraryEntry {
	name: string;
	hex: string;
	description: string | null;
	category: "metaux" | "pierres-precieuses" | "pierres-semi" | "organiques" | "neutres";
}

export const COLOR_LIBRARY: ColorLibraryEntry[] = [
	// Métaux nobles
	{
		name: "Or jaune 18K",
		hex: "#D4AF37",
		description: "Or 18 carats, fini brillant classique",
		category: "metaux",
	},
	{
		name: "Or jaune 14K",
		hex: "#C5A028",
		description: "Or 14 carats, ton légèrement plus pâle",
		category: "metaux",
	},
	{
		name: "Or rose 18K",
		hex: "#B76E79",
		description: "Alliage or-cuivre, ton romantique",
		category: "metaux",
	},
	{
		name: "Or blanc",
		hex: "#E8E8E8",
		description: "Or rhodié pour éclat platine",
		category: "metaux",
	},
	{
		name: "Argent 925",
		hex: "#C0C0C0",
		description: "Argent sterling, finition polie",
		category: "metaux",
	},
	{
		name: "Argent vieilli",
		hex: "#8C8C8C",
		description: "Patine antique pour ton plus mat",
		category: "metaux",
	},
	{
		name: "Rhodium",
		hex: "#E5E4E2",
		description: "Plaqué rhodium, anti-ternissement",
		category: "metaux",
	},
	{
		name: "Acier inox",
		hex: "#A8A9AD",
		description: "Hypoallergénique, indémodable",
		category: "metaux",
	},

	// Pierres précieuses
	{ name: "Rubis", hex: "#9B111E", description: null, category: "pierres-precieuses" },
	{ name: "Saphir", hex: "#0F52BA", description: null, category: "pierres-precieuses" },
	{ name: "Émeraude", hex: "#50C878", description: null, category: "pierres-precieuses" },
	{ name: "Améthyste", hex: "#9966CC", description: null, category: "pierres-precieuses" },
	{ name: "Topaze", hex: "#FFC87C", description: null, category: "pierres-precieuses" },
	{ name: "Citrine", hex: "#E4D00A", description: null, category: "pierres-precieuses" },

	// Pierres semi-précieuses
	{ name: "Quartz rose", hex: "#F7CAC9", description: null, category: "pierres-semi" },
	{ name: "Turquoise", hex: "#40E0D0", description: null, category: "pierres-semi" },
	{ name: "Lapis-lazuli", hex: "#1B3A6B", description: null, category: "pierres-semi" },
	{ name: "Onyx", hex: "#1A1A1A", description: null, category: "pierres-semi" },
	{ name: "Jade", hex: "#3D7A4C", description: null, category: "pierres-semi" },
	{ name: "Cornaline", hex: "#B31B1B", description: null, category: "pierres-semi" },
	{ name: "Ambre", hex: "#FFBF00", description: null, category: "pierres-semi" },
	{ name: "Hématite", hex: "#3C3C3C", description: null, category: "pierres-semi" },

	// Organiques
	{
		name: "Perle blanche",
		hex: "#FAFAFA",
		description: "Nacre naturelle d'eau douce",
		category: "organiques",
	},
	{
		name: "Perle noire",
		hex: "#1C1C1C",
		description: "Perle de Tahiti",
		category: "organiques",
	},
	{
		name: "Nacre",
		hex: "#F8F4E3",
		description: "Reflets irisés naturels",
		category: "organiques",
	},
	{ name: "Corail", hex: "#FF6F61", description: null, category: "organiques" },

	// Couleurs neutres
	{ name: "Noir mat", hex: "#1A1A1A", description: null, category: "neutres" },
	{ name: "Blanc cassé", hex: "#F5F5DC", description: null, category: "neutres" },
	{ name: "Champagne", hex: "#F7E7CE", description: null, category: "neutres" },
];

export const COLOR_LIBRARY_CATEGORIES = [
	{ value: "all", label: "Tous" },
	{ value: "metaux", label: "Métaux" },
	{ value: "pierres-precieuses", label: "Pierres précieuses" },
	{ value: "pierres-semi", label: "Pierres semi-précieuses" },
	{ value: "organiques", label: "Organiques" },
	{ value: "neutres", label: "Neutres" },
] as const;

export type ColorLibraryCategory = (typeof COLOR_LIBRARY_CATEGORIES)[number]["value"];
