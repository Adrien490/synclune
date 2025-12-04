import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// CART LIMITS
// ============================================================================

/**
 * Quantite maximale par article dans une commande
 * Limite UX pour eviter les commandes excessives sur un site artisanal
 */
export const MAX_QUANTITY_PER_ORDER = 10;

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_CART_SELECT = {
	id: true,
	userId: true,
	sessionId: true,
	expiresAt: true,
	createdAt: true,
	updatedAt: true,
	items: {
		select: {
			id: true,
			quantity: true,
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
} as const satisfies Prisma.CartSelect;

export const GET_CART_SUMMARY_SELECT = {
	items: {
		select: {
			quantity: true,
			priceAtAdd: true,
		},
	},
} as const satisfies Prisma.CartSelect;

