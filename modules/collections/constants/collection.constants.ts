import type { Prisma } from "@/app/generated/prisma/browser";
import { PublicationStatus } from "@/app/generated/prisma/enums";
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
				status: PublicationStatus.PUBLIC,
				deletedAt: null,
			},
		},
		select: {
			// Pas d'`id` : `ProductCollection` est passé en PK composite
			// `(productId, collectionId)` (audit schéma V4, 2026-08-05). La clé
			// surrogate n'avait qu'un consommateur, une `key` React — c'est
			// `product.id` qui la porte désormais.
			position: true,
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
							position: true,
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
								},
								// La principale est le rang 0 de (position, id) — cf. pickPrimaryImage.
								orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
							},
						},
						orderBy: [{ position: "asc" }, { id: "asc" }],
					},
				},
			},
		},
		orderBy: [{ position: "asc" }, { addedAt: "desc" }],
		take: GET_COLLECTION_PRODUCTS_LIMIT,
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: PublicationStatus.PUBLIC,
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
				status: PublicationStatus.PUBLIC,
				deletedAt: null,
			},
		},
		select: {
			position: true,
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
							position: true,
							priceInclTax: true,
							inventory: true,
							images: {
								// Cf. supra : jamais de vidéo dans un rendu `next/image`.
								where: { mediaType: "IMAGE" as const },
								select: {
									url: true,
									altText: true,
								},
								// La principale est le rang 0 de (position, id) — cf. pickPrimaryImage.
								orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
								take: 1,
							},
						},
						orderBy: [{ position: "asc" }, { id: "asc" }],
						take: 1,
					},
				},
			},
		},
		orderBy: [{ position: "asc" }, { addedAt: "desc" }],
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
	// Image du produit vedette pour la carte collection : la vedette est le rang 0
	// de (position asc, addedAt desc).
	products: {
		where: {
			product: {
				status: PublicationStatus.PUBLIC,
				deletedAt: null,
			},
		},
		select: {
			position: true,
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
								// La principale est le rang 0 de (position, id) — cf. pickPrimaryImage.
								orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
								take: 1,
							},
						},
						orderBy: [{ position: "asc" }, { id: "asc" }],
						take: 1,
					},
				},
			},
		},
		orderBy: [{ position: "asc" }, { addedAt: "desc" }],
		// Deux consommateurs via `extractCollectionImages` (qui écarte en aval
		// tout produit dont le SKU par défaut n'a aucun média IMAGE) :
		// - la bande chapitre de /collections rend 3 tirages — le +1 de rab
		//   évite qu'un produit sans image fasse tomber à 2 ;
		// - le bento du méga-menu desktop (`CollectionImagesGrid`) veut jusqu'à
		//   4 images — exactement ce take. Le baisser casserait le bento en
		//   silence.
		take: COLLECTION_CHAPTER_PRINT_COUNT + 1,
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: PublicationStatus.PUBLIC,
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
