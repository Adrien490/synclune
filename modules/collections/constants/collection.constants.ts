import type { Prisma } from "@/app/generated/prisma/browser";
import { ProductStatus } from "@/app/generated/prisma/enums";
import { COLLECTION_CHAPTER_PRINT_COUNT } from "./image-sizes.constants";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Cap a la lecture des associations pour le detail admin. Au-dela, l'admin
 * doit utiliser la gestion catalogue dediee. Voir GET_COLLECTION_PRODUCTS_LIMIT
 * + UX hint dans collection-products-list.
 */
export const GET_COLLECTION_PRODUCTS_LIMIT = 100;

export const GET_COLLECTION_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	products: {
		// deletedAt: null — le statut seul ne suffit pas : un produit soft-deleted reste
		// référencé par ProductCollection et pourrait redevenir visible en cas de
		// désynchronisation status/deletedAt (parité avec le pattern notDeleted du site).
		where: {
			product: {
				status: ProductStatus.PUBLIC,
				deletedAt: null,
			},
		},
		select: {
			// Pas d'`id` : `ProductCollection` est passé en PK composite
			// `(productId, collectionId)` (audit schéma V4, 2026-08-05). La clé
			// surrogate n'avait qu'un consommateur, une `key` React — c'est
			// `product.id` qui la porte désormais.
			isFeatured: true,
			product: {
				select: {
					id: true,
					slug: true,
					title: true,
					description: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					type: {
						select: {
							id: true,
							slug: true,
							label: true,
							isActive: true,
						},
					},
					skus: {
						where: {
							isActive: true,
						},
						select: {
							id: true,
							isDefault: true,
							priceInclTax: true,
							images: {
								// Les surfaces collection ne rendent que des `next/image` :
								// une URL vidéo n'y est pas décodable par l'optimiseur.
								where: { mediaType: "IMAGE" as const },
								select: {
									id: true,
									url: true,
									altText: true,
									blurDataUrl: true,
									mediaType: true,
									isPrimary: true,
								},
								// `isPrimary desc` d'abord : trié par `createdAt`, la vignette
								// était l'image la plus ANCIENNE du SKU, pas la principale.
								// Ordre aligné sur le reste du repo (get-material.ts).
								orderBy: [
									{ isPrimary: "desc" as const },
									{ position: "asc" as const },
									{ id: "asc" as const },
								],
							},
						},
						orderBy: [{ isDefault: "desc" }, { priceInclTax: "asc" }],
					},
				},
			},
		},
		orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }],
		take: GET_COLLECTION_PRODUCTS_LIMIT,
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: ProductStatus.PUBLIC,
						deletedAt: null,
					},
				},
			},
		},
	},
} as const satisfies Prisma.CollectionSelect;

/**
 * Lightweight select for storefront collection pages (SEO metadata + OG image + JSON-LD).
 * Only loads what's needed: name, description, status, and minimal product data
 * for featured image extraction, product type keywords, public product count,
 * and ItemList Product+Offer JSON-LD (mainEntity).
 */
export const GET_COLLECTION_STOREFRONT_SELECT = {
	slug: true,
	name: true,
	description: true,
	status: true,
	products: {
		where: {
			product: {
				status: ProductStatus.PUBLIC,
				deletedAt: null,
			},
		},
		select: {
			isFeatured: true,
			product: {
				select: {
					slug: true,
					title: true,
					status: true,
					type: {
						select: {
							label: true,
						},
					},
					skus: {
						where: { isActive: true },
						select: {
							isDefault: true,
							priceInclTax: true,
							inventory: true,
							images: {
								// Cf. supra : jamais de vidéo dans un rendu `next/image`.
								where: { mediaType: "IMAGE" as const },
								select: {
									url: true,
									altText: true,
									isPrimary: true,
								},
								// `isPrimary desc` d'abord : trié par `createdAt`, l'OG image de
								// la collection était l'image la plus ANCIENNE, pas la principale.
								orderBy: [
									{ isPrimary: "desc" as const },
									{ position: "asc" as const },
									{ id: "asc" as const },
								],
								take: 1,
							},
						},
						orderBy: [{ isDefault: "desc" }],
						take: 1,
					},
				},
			},
		},
		orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }],
	},
} as const satisfies Prisma.CollectionSelect;

export const GET_COLLECTIONS_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	// Featured product image for collection card (with fallback to most recent)
	// orderBy: isFeatured desc puts featured product first, otherwise most recent
	products: {
		where: {
			product: {
				status: ProductStatus.PUBLIC,
				deletedAt: null,
			},
		},
		select: {
			isFeatured: true,
			product: {
				select: {
					id: true,
					title: true,
					skus: {
						where: { isActive: true },
						select: {
							priceInclTax: true,
							images: {
								// Cf. supra : jamais de vidéo dans un rendu `next/image`.
								where: { mediaType: "IMAGE" as const },
								select: { url: true, altText: true, blurDataUrl: true },
								// `isPrimary desc` d'abord : la carte doit montrer l'image
								// principale, pas la première par position.
								orderBy: [
									{ isPrimary: "desc" as const },
									{ position: "asc" as const },
									{ id: "asc" as const },
								],
								take: 1,
							},
						},
						orderBy: [{ isDefault: "desc" }, { priceInclTax: "asc" }],
						take: 1,
					},
				},
			},
		},
		orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }],
		// 3 tirages rendus sur la bande + 1 de rab : `extractCollectionImages`
		// écarte en aval tout produit dont le SKU par défaut n'a aucun média IMAGE,
		// donc lire exactement 3 produits rendrait parfois 2 tirages.
		// (L'ancien commentaire parlait d'un « Bento Grid » retiré le 2026-08-05.)
		take: COLLECTION_CHAPTER_PRINT_COUNT + 1,
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: ProductStatus.PUBLIC,
						deletedAt: null,
					},
				},
			},
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
// STATUS LABELS & COLORS
// Note: Client-safe constants are in collection-status.constants.ts
// Re-export for backward compatibility with server components
// ============================================================================

export { COLLECTION_STATUS_LABELS } from "./collection-status.constants";
