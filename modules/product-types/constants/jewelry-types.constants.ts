// Plus besoin d'importer ProductType - maintenant un modèle dynamique

import type { JewelryTypeConfig } from "../types/jewelry.types";

// Re-export pour retrocompatibilite
export type { JewelryTypeConfig, JewelrySubType } from "../types/jewelry.types";

// Nouveaux types de bijoux Synclune
export const SYNCLUNE_JEWELRY_TYPES: JewelryTypeConfig[] = [
	{
		key: "NECKLACES",
		label: "Colliers",
		description:
			"Ornez votre décolleté avec nos colliers artisanaux, alliant tradition et modernité pour une allure sophistiquée et intemporelle.",
		image:
			"https://images.unsplash.com/photo-1634712282287-14ed57b9cc89?w=400&h=400&fit=crop&crop=center",
		icon: "📿",
		href: "/products?type=NECKLACES",
		subTypes: [
			{
				key: "CLASSIC_NECKLACES",
				label: "Colliers",
				href: "/products?type=NECKLACES&subtype=classic",
			},
			{
				key: "CUSTOM_NECKLACES",
				label: "Colliers personnalisables",
				href: "/products?type=NECKLACES&subtype=custom",
			},
		],
	},
	{
		key: "BRACELETS",
		label: "Bracelets",
		description:
			"Parachevez votre style avec nos bracelets délicats, conçus pour apporter une note de finesse et de caractère à votre poignet.",
		image:
			"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop&crop=center",
		icon: "✨",
		href: "/products?type=BRACELETS",
	},
	{
		key: "RINGS",
		label: "Bagues",
		description:
			"Découvrez nos bagues uniques, symboles de beauté et d'engagement, façonnées avec passion pour accompagner vos moments précieux.",
		image:
			"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop&crop=center",
		icon: "💍",
		href: "/products?type=RINGS",
	},
	{
		key: "BODY_CHAINS",
		label: "Chaînes des corps",
		description:
			"Sublimez votre silhouette avec nos chaînes de corps audacieuses et raffinées, créées pour révéler votre sensualité naturelle.",
		image:
			"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&crop=center",
		icon: "⛓️",
		href: "/products?type=BODY_CHAINS",
	},
	{
		key: "PAPILLOUX",
		label: "Papilloux",
		description:
			"Envolez-vous avec nos bijoux papillons pour le visage, créations poétiques et féeriques qui transforment votre regard en œuvre d'art.",
		image:
			"https://images.unsplash.com/photo-1594736797933-d0d8aa06a2d8?w=400&h=400&fit=crop&crop=center",
		icon: "🦋",
		href: "/products?type=PAPILLOUX",
	},
	{
		key: "HAIR_CHAINS",
		label: "Chaînes des cheveux",
		description:
			"Couronnez votre chevelure avec nos chaînes capillaires délicates, accessoires précieux pour une coiffure royale et moderne.",
		image:
			"https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&crop=center",
		icon: "👸",
		href: "/products?type=HAIR_CHAINS",
	},
	{
		key: "KEYCHAINS",
		label: "Porte-clés",
		description:
			"Portez un petit bijou au quotidien avec nos porte-clés précieux, alliant praticité et élégance pour embellir vos accessoires.",
		image:
			"https://images.unsplash.com/photo-1558618047-8c90d7e75e03?w=400&h=400&fit=crop&crop=center",
		icon: "🗝️",
		href: "/products?type=KEYCHAINS",
	},
];

// Mapping de compatibilité avec les anciens types (maintenant des strings)
export const JEWELRY_TYPES: Record<string, JewelryTypeConfig> = {
	NECKLACES: SYNCLUNE_JEWELRY_TYPES[0], // Colliers
	BRACELETS: SYNCLUNE_JEWELRY_TYPES[1], // Bracelets
	RINGS: SYNCLUNE_JEWELRY_TYPES[2], // Bagues
	BODY_CHAINS: SYNCLUNE_JEWELRY_TYPES[3], // Chaînes des corps
	PAPILLOUX: SYNCLUNE_JEWELRY_TYPES[4], // Papilloux
	HAIR_CHAINS: SYNCLUNE_JEWELRY_TYPES[5], // Chaînes des cheveux
	KEYCHAINS: SYNCLUNE_JEWELRY_TYPES[6], // Porte-clés
	EARRINGS: {
		key: "EARRINGS",
		label: "Boucles d'oreilles",
		description: "Sublimez votre visage avec nos boucles d'oreilles délicates et raffinées.",
		image:
			"https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=400&fit=crop&crop=center",
		icon: "👂",
		href: "/products?type=EARRINGS",
	},
	ENGRAVINGS: {
		key: "ENGRAVINGS",
		label: "Gravures",
		description: "Personnalisez vos bijoux avec nos services de gravure artisanale.",
		image:
			"https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=400&h=400&fit=crop&crop=center",
		icon: "✍️",
		href: "/products?type=ENGRAVINGS",
	},
} as const;

export const JEWELRY_TYPES_ARRAY = Object.values(JEWELRY_TYPES);

// Functions are in utils/jewelry.utils.ts
export {
	getJewelryTypeConfig,
	getJewelryTypeLabel,
	getAllJewelryTypes,
	getJewelryTypeByKey,
	getJewelrySubTypes,
} from "../utils/jewelry.utils";
