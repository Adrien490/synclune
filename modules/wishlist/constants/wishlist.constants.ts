import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Select pour les items de wishlist avec produit complet
 * Compatible avec ProductCard pour réutilisation directe
 *
 * Inclut :
 * - skuId : ID du SKU ajouté en wishlist (pour WishlistButton)
 * - product : Produit complet avec tous ses SKUs actifs (pour ProductCard)
 */
export const GET_WISHLIST_SELECT = {
	id: true,
	userId: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			skuId: true,
			priceAtAdd: true,
			createdAt: true,
			updatedAt: true,
			sku: {
				select: {
					id: true,
					priceInclTax: true,
					product: {
						select: {
							id: true,
							slug: true,
							title: true,
							status: true,
							type: {
								select: {
									id: true,
									slug: true,
									label: true,
								},
							},
							skus: {
								where: { isActive: true },
								select: {
									id: true,
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
										where: { isPrimary: true },
										take: 1,
										select: {
											url: true,
											blurDataUrl: true,
											altText: true,
											mediaType: true,
											isPrimary: true,
										},
									},
								},
								orderBy: [
									{ isDefault: "desc" as const },
									{ priceInclTax: "asc" as const },
								],
							},
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
// PAGINATION
// ============================================================================

export const GET_WISHLIST_DEFAULT_PER_PAGE = 20;
export const GET_WISHLIST_MAX_RESULTS_PER_PAGE = 200;

// Assertion à la compilation : DEFAULT ne doit pas dépasser MAX
if (GET_WISHLIST_DEFAULT_PER_PAGE > GET_WISHLIST_MAX_RESULTS_PER_PAGE) {
	throw new Error(
		`[WISHLIST] GET_WISHLIST_DEFAULT_PER_PAGE (${GET_WISHLIST_DEFAULT_PER_PAGE}) cannot exceed GET_WISHLIST_MAX_RESULTS_PER_PAGE (${GET_WISHLIST_MAX_RESULTS_PER_PAGE})`
	);
}
