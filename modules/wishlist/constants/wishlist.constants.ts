import { type Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Select pour les items de wishlist avec produit complet
 * Aligned with GET_PRODUCTS_SELECT so WishlistItem.product satisfies the Product type
 * used by ProductCard (eliminates the need for unsafe double cast).
 *
 * Inclut :
 * - productId : ID du produit ajouté en wishlist
 * - product : Produit complet avec tous ses SKUs actifs (pour ProductCard)
 */
export const GET_WISHLIST_SELECT = {
	id: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			productId: true,
			createdAt: true,
			updatedAt: true,
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
					reviewStats: {
						select: {
							averageRating: true,
							totalCount: true,
						},
					},
					skus: {
						where: { isActive: true },
						select: {
							id: true,
							sku: true,
							priceInclTax: true,
							compareAtPrice: true,
							inventory: true,
							isActive: true,
							isDefault: true,
							color: {
								select: {
									id: true,
									slug: true,
									name: true,
									hex: true,
								},
							},
							material: {
								select: {
									id: true,
									name: true,
								},
							},
							size: true,
							images: {
								select: {
									id: true,
									url: true,
									thumbnailUrl: true,
									blurDataUrl: true,
									altText: true,
									mediaType: true,
									isPrimary: true,
								},
								orderBy: {
									position: "asc" as const,
								},
							},
						},
						orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
					},
					_count: {
						select: {
							skus: {
								where: { isActive: true },
							},
						},
					},
					collections: {
						select: {
							id: true,
							addedAt: true,
							isFeatured: true,
							collection: {
								select: {
									id: true,
									name: true,
									slug: true,
									description: true,
									status: true,
								},
							},
						},
						orderBy: {
							addedAt: "desc" as const,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "desc" as const },
	},
} as const satisfies Prisma.WishlistSelect;

export const GET_WISHLIST_ITEM_SELECT = GET_WISHLIST_SELECT.items.select;

// ============================================================================
// LIMITS
// ============================================================================

/** Maximum number of items per wishlist to prevent unbounded growth */
export const WISHLIST_MAX_ITEMS = 500;

// ============================================================================
// PAGINATION
// ============================================================================

export const GET_WISHLIST_DEFAULT_PER_PAGE = 20;
export const GET_WISHLIST_MAX_RESULTS_PER_PAGE = 200;
