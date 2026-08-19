import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (lot 2) : FK 1-N couleur/matériau,
// stock/active/priceCents (nullable → prix produit), média sur le PRODUIT.
// ============================================================================

export const GET_PRODUCT_VARIANT_SELECT = {
	id: true,
	productId: true,
	priceCents: true,
	stock: true,
	active: true,
	size: true,
	color: {
		select: { id: true, name: true, hex: true },
	},
	material: {
		select: { id: true, name: true },
	},
	product: {
		select: {
			id: true,
			slug: true,
			name: true,
			priceCents: true,
			active: true,
			// Première variante du produit = le REPRÉSENTANT (le schéma lean n'a plus
			// de rang `position` sur la variante). Embarquée ici pour éviter le
			// `findFirst` séquentiel que faisait `data/get-variant.ts`.
			variants: {
				orderBy: { id: "asc" as const },
				take: 1,
				select: { id: true },
			},
		},
	},
} as const satisfies Prisma.ProductVariantSelect;

// ============================================================================
// SELECT DEFINITIONS - LISTS
// ============================================================================

/**
 * SELECT de la LISTE admin. Le média vit sur le produit : la vignette d'une
 * variante est celle de son produit.
 *
 * ⚠️ Ne sélectionne que ce que les lignes rendent. `product.description` (lue
 * nulle part, potentiellement longue, chargée sur CHAQUE ligne) et les
 * `position` de couleur/matériau ont été retirés à l'audit du 2026-08-19.
 */
export const GET_PRODUCT_VARIANTS_DEFAULT_SELECT = {
	id: true,
	productId: true,
	priceCents: true,
	stock: true,
	active: true,
	size: true,
	color: {
		select: { id: true, name: true, hex: true },
	},
	material: {
		select: { id: true, name: true },
	},
	product: {
		select: {
			id: true,
			slug: true,
			name: true,
			priceCents: true,
			active: true,
			media: {
				where: { type: "IMAGE" as const },
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 1,
				select: { id: true, url: true, alt: true, type: true },
			},
		},
	},
	_count: {
		select: {
			orderItems: true,
		},
	},
} as const satisfies Prisma.ProductVariantSelect;

/**
 * SELECT de la PAGE DÉTAIL admin d'une variante.
 *
 * ⚠️ Vivait inline dans `data/get-variant.ts`, en face de la règle « les select
 * Prisma vivent dans constants/ » (un select inline rate les migrations de schéma).
 *
 * `product.variants` (première par id, `take: 1`) porte le calcul du REPRÉSENTANT
 * dans la MÊME requête : les deux lecteurs faisaient un second aller-retour
 * `findFirst` séquentiel pour la même information.
 */
export const GET_PRODUCT_VARIANT_DETAIL_SELECT = {
	id: true,
	productId: true,
	priceCents: true,
	stock: true,
	active: true,
	size: true,
	color: { select: { id: true, name: true, hex: true } },
	material: { select: { id: true, name: true } },
	product: {
		select: {
			id: true,
			slug: true,
			name: true,
			active: true,
			priceCents: true,
			media: {
				where: { type: "IMAGE" as const },
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 1,
				select: { id: true, url: true, alt: true, type: true },
			},
			variants: {
				orderBy: { id: "asc" as const },
				take: 1,
				select: { id: true },
			},
			_count: { select: { variants: true } },
		},
	},
	_count: { select: { orderItems: true } },
} as const satisfies Prisma.ProductVariantSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE = 200;

export const GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY = "created-descending";

export const GET_PRODUCT_VARIANTS_SORT_FIELDS = [
	"created-descending",
	"created-ascending",
	"price-ascending",
	"price-descending",
	"stock-ascending",
	"stock-descending",
] as const;

export const SORT_LABELS: Record<string, string> = {
	"created-descending": "Date de création (plus récent)",
	"created-ascending": "Date de création (plus ancien)",
	"price-ascending": "Prix (croissant)",
	"price-descending": "Prix (décroissant)",
	"stock-ascending": "Stock (croissant)",
	"stock-descending": "Stock (décroissant)",
};
