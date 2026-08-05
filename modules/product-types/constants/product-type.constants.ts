import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_PRODUCT_TYPES_SELECT = {
	id: true,
	slug: true,
	label: true,
	description: true,
	isActive: true,
	isSystem: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			products: {
				where: {
					status: "PUBLIC",
					// Explicite même si status=PUBLIC exclut déjà les soft-deleted
					// aujourd'hui (deleteProduct force ARCHIVED) — ne pas dépendre
					// de ce couplage pour le compte affiché.
					deletedAt: null,
					// `deletedAt: null` aussi sur le SKU : parité avec la garde de
					// `delete-product-type` — sans lui, un produit dont tous les SKUs
					// sont soft-deleted était compté en liste mais pas par la garde.
					skus: {
						some: {
							isActive: true,
							deletedAt: null,
						},
					},
				},
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

/**
 * Select du menu mobile (« L'étal de poche ») : chaque famille y montre UNE
 * vignette + son compte de pièces. Étend `GET_PRODUCT_TYPES_SELECT` d'un
 * produit représentatif — le plus récent publié qui possède au moins une image.
 *
 * Famille « vignette unique » (cf. CLAUDE.md § mediaType) : `mediaType: "IMAGE"`
 * est filtré DANS le select, car l'appelant prend une seule image sans pouvoir
 * trier. Le choix final passe quand même par `pickPrimaryImage()` côté appelant
 * (SSOT), d'où `mediaType` + `isPrimary` dans la projection.
 */
export const GET_PRODUCT_TYPES_MENU_SELECT = {
	...GET_PRODUCT_TYPES_SELECT,
	products: {
		where: {
			status: "PUBLIC",
			deletedAt: null,
			skus: {
				some: {
					isActive: true,
					deletedAt: null,
					images: { some: { mediaType: "IMAGE" } },
				},
			},
		},
		orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }],
		take: 1,
		select: {
			id: true,
			skus: {
				// Le même filtre `images.some` que la garde produit ci-dessus : sans
				// lui, un SKU par défaut sans image rendait une tuile vide alors
				// qu'un autre SKU du produit en possède une.
				where: {
					isActive: true,
					deletedAt: null,
					images: { some: { mediaType: "IMAGE" } },
				},
				orderBy: [{ isDefault: "desc" as const }],
				take: 1,
				select: {
					images: {
						where: { mediaType: "IMAGE" as const },
						select: {
							url: true,
							blurDataUrl: true,
							mediaType: true,
							isPrimary: true,
						},
						orderBy: [
							{ isPrimary: "desc" as const },
							{ position: "asc" as const },
							{ id: "asc" as const },
						],
						take: 1,
					},
				},
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

export const GET_PRODUCT_TYPE_SELECT = {
	id: true,
	slug: true,
	label: true,
	description: true,
	isActive: true,
	isSystem: true,
	createdAt: true,
	updatedAt: true,
	// Compte des produits réellement visibles storefront (mêmes critères que
	// GET_PRODUCT_TYPES_SELECT) — sert au noindex des pages catégorie vides.
	_count: {
		select: {
			products: {
				where: {
					status: "PUBLIC",
					deletedAt: null,
					// `deletedAt: null` aussi sur le SKU : parité avec la garde de
					// `delete-product-type` — sans lui, un produit dont tous les SKUs
					// sont soft-deleted était compté en liste mais pas par la garde.
					skus: {
						some: {
							isActive: true,
							deletedAt: null,
						},
					},
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
