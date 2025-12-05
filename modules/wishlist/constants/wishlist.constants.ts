import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_WISHLIST_SELECT = {
	id: true,
	userId: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			priceAtAdd: true,
			createdAt: true,
			updatedAt: true,
			sku: {
				select: {
					id: true,
					sku: true,
					priceInclTax: true,
					compareAtPrice: true,
					inventory: true,
					isActive: true,
					product: {
						select: {
							id: true,
							title: true,
							slug: true,
							status: true,
						},
					},
					images: {
						where: { isPrimary: true },
						take: 1,
						orderBy: { createdAt: "asc" as const },
						select: {
							id: true,
							url: true,
							blurDataUrl: true,
							thumbnailUrl: true,
							thumbnailSmallUrl: true,
							altText: true,
							mediaType: true,
							isPrimary: true,
						},
					},
					color: {
						select: {
							id: true,
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
