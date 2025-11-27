import type { PrismaClient } from "../../app/generated/prisma/client";

interface ColorData {
	slug: string;
	name: string;
	hex: string;
}

const COLOR_DEFINITIONS: ColorData[] = [
	{ slug: "or", name: "Or", hex: "#FFD700" },
	{ slug: "argent", name: "Argent", hex: "#C0C0C0" },
	{ slug: "or-rose", name: "Or Rose", hex: "#B76E79" },
	{ slug: "noir", name: "Noir", hex: "#000000" },
	{ slug: "blanc", name: "Blanc", hex: "#FFFFFF" },
	{ slug: "rouge", name: "Rouge", hex: "#DC143C" },
	{ slug: "bleu", name: "Bleu", hex: "#4169E1" },
	{ slug: "vert", name: "Vert", hex: "#228B22" },
	{ slug: "rose", name: "Rose", hex: "#FFC0CB" },
	{ slug: "violet", name: "Violet", hex: "#8B008B" },
	{ slug: "turquoise", name: "Turquoise", hex: "#40E0D0" },
	{ slug: "corail", name: "Corail", hex: "#FF7F50" },
	{ slug: "ambre", name: "Ambre", hex: "#FFBF00" },
	{ slug: "perle", name: "Perle", hex: "#F0EAD6" },
	{ slug: "multicolore", name: "Multicolore", hex: "#FF69B4" },
];

export async function seedColorTaxonomy(prisma: PrismaClient) {
	const colors = [];

	for (const colorData of COLOR_DEFINITIONS) {
		const color = await prisma.color.create({
			data: colorData,
		});
		colors.push(color);
	}

	return { colors };
}
