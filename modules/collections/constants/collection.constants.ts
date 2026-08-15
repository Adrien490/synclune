import type { Prisma } from "@/app/generated/prisma/browser";
import { COLLECTION_CHAPTER_PRINT_COUNT } from "./image-sizes.constants";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (lot 2) : M-N implicite (plus de
// ProductCollection avec position/vedette), média sur le PRODUIT, Collection
// { slug, name, description, position, active }.
// ============================================================================

/**
 * Cap à la lecture des associations pour le détail admin.
 */
export const GET_COLLECTION_PRODUCTS_LIMIT = 100;

/** Sous-select vignette produit : première IMAGE de l'ordre canonique. */
const PRODUCT_THUMB_SELECT = {
	where: { type: "IMAGE" as const },
	select: { id: true, url: true, alt: true, type: true },
	orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
	take: 1,
};

export const GET_COLLECTION_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	position: true,
	active: true,
	products: {
		where: { active: true },
		select: {
			id: true,
			slug: true,
			name: true,
			description: true,
			priceCents: true,
			active: true,
			createdAt: true,
			updatedAt: true,
			media: PRODUCT_THUMB_SELECT,
			variants: {
				where: { active: true },
				select: { id: true, priceCents: true, stock: true },
				orderBy: { id: "asc" as const },
			},
		},
		orderBy: { createdAt: "desc" as const },
		take: GET_COLLECTION_PRODUCTS_LIMIT,
	},
	_count: {
		select: {
			products: { where: { active: true } },
		},
	},
} as const satisfies Prisma.CollectionSelect;

/**
 * Lightweight select for storefront collection pages (SEO metadata + OG image +
 * JSON-LD ItemList).
 */
export const GET_COLLECTION_STOREFRONT_SELECT = {
	slug: true,
	name: true,
	description: true,
	active: true,
	products: {
		where: { active: true },
		select: {
			slug: true,
			name: true,
			priceCents: true,
			active: true,
			media: {
				where: { type: "IMAGE" as const },
				select: { url: true, alt: true },
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 1,
			},
			variants: {
				where: { active: true },
				select: { priceCents: true, stock: true },
				orderBy: { id: "asc" as const },
				take: 1,
			},
		},
		orderBy: { createdAt: "desc" as const },
	},
} as const satisfies Prisma.CollectionSelect;

export const GET_COLLECTIONS_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	position: true,
	active: true,
	// Vignettes : premières images des produits actifs les plus récents.
	products: {
		where: { active: true },
		select: {
			id: true,
			name: true,
			media: {
				where: { type: "IMAGE" as const },
				select: { url: true, alt: true },
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 1,
			},
			variants: {
				where: { active: true },
				select: { priceCents: true },
				orderBy: { id: "asc" as const },
				take: 1,
			},
		},
		orderBy: { createdAt: "desc" as const },
		take: COLLECTION_CHAPTER_PRINT_COUNT + 1,
	},
	_count: {
		select: {
			products: { where: { active: true } },
		},
	},
} as const satisfies Prisma.CollectionSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_COLLECTIONS_DEFAULT_PER_PAGE = 20;
export const GET_COLLECTIONS_MAX_RESULTS_PER_PAGE = 200;
export const GET_COLLECTIONS_DEFAULT_SORT_BY = "name-ascending";

export const GET_COLLECTIONS_SORT_FIELDS = [
	"name-ascending",
	"name-descending",
	"created-ascending",
	"created-descending",
	"products-ascending",
	"products-descending",
] as const;

// ============================================================================
// UI OPTIONS
// ============================================================================

const COLLECTIONS_SORT_OPTIONS = {
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	CREATED_ASC: "created-ascending",
	CREATED_DESC: "created-descending",
	PRODUCTS_ASC: "products-ascending",
	PRODUCTS_DESC: "products-descending",
} as const;

export const COLLECTIONS_SORT_LABELS = {
	[COLLECTIONS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[COLLECTIONS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[COLLECTIONS_SORT_OPTIONS.CREATED_ASC]: "Plus anciennes",
	[COLLECTIONS_SORT_OPTIONS.CREATED_DESC]: "Plus récentes",
	[COLLECTIONS_SORT_OPTIONS.PRODUCTS_ASC]: "Moins de produits",
	[COLLECTIONS_SORT_OPTIONS.PRODUCTS_DESC]: "Plus de produits",
} as const;

// ============================================================================
// STATUS LABELS
// ============================================================================
