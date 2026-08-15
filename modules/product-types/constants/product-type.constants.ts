import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (lot 2) : ProductType { id, slug, label,
// position }, relation directe `products` (Product.typeId).
// ============================================================================

export const GET_PRODUCT_TYPES_SELECT = {
	id: true,
	slug: true,
	label: true,
	position: true,
	_count: {
		select: {
			products: {
				where: {
					active: true,
					variants: { some: { active: true } },
				},
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

/**
 * Select du menu mobile (« L'étal de poche ») : chaque famille y montre UNE
 * vignette + son compte de pièces. Étend `GET_PRODUCT_TYPES_SELECT` d'un
 * produit représentatif — le plus récent actif qui possède au moins une image.
 *
 * Famille « vignette unique » (cf. règle pickPrimaryImage) : `type: "IMAGE"`
 * est filtré DANS le select, car l'appelant prend une seule image sans pouvoir
 * trier.
 */
export const GET_PRODUCT_TYPES_MENU_SELECT = {
	...GET_PRODUCT_TYPES_SELECT,
	products: {
		where: {
			active: true,
			variants: { some: { active: true } },
			media: { some: { type: "IMAGE" } },
		},
		orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }],
		take: 1,
		select: {
			id: true,
			media: {
				where: { type: "IMAGE" as const },
				select: {
					url: true,
					type: true,
				},
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 1,
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

export const GET_PRODUCT_TYPE_SELECT = {
	id: true,
	slug: true,
	label: true,
	position: true,
	// Compte des produits réellement visibles storefront (mêmes critères que
	// GET_PRODUCT_TYPES_SELECT) — sert au noindex des pages catégorie vides.
	_count: {
		select: {
			products: {
				where: {
					active: true,
					variants: { some: { active: true } },
				},
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_PRODUCT_TYPES_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE = 200;

// ============================================================================
// SORT CONSTANTS
// ============================================================================

export const GET_PRODUCT_TYPES_DEFAULT_SORT_BY = "label-ascending";

export const GET_PRODUCT_TYPES_SORT_FIELDS = [
	"label-ascending",
	"label-descending",
	"products-ascending",
	"products-descending",
] as const;

const PRODUCT_TYPES_SORT_OPTIONS = {
	LABEL_ASC: "label-ascending",
	LABEL_DESC: "label-descending",
	PRODUCTS_ASC: "products-ascending",
	PRODUCTS_DESC: "products-descending",
} as const;

export const PRODUCT_TYPES_SORT_LABELS = {
	[PRODUCT_TYPES_SORT_OPTIONS.LABEL_ASC]: "Label (A-Z)",
	[PRODUCT_TYPES_SORT_OPTIONS.LABEL_DESC]: "Label (Z-A)",
	[PRODUCT_TYPES_SORT_OPTIONS.PRODUCTS_ASC]: "Moins de produits",
	[PRODUCT_TYPES_SORT_OPTIONS.PRODUCTS_DESC]: "Plus de produits",
} as const;
