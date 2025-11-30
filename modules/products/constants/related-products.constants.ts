import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const RELATED_PRODUCTS_SELECT = {
	id: true,
	slug: true,
	title: true,
	description: true,
	status: true,
	typeId: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
			isActive: true,
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
				},
			},
		},
		orderBy: { addedAt: "desc" as const },
	},
	skus: {
		where: { isActive: true },
		select: {
			id: true,
			sku: true,
			priceInclTax: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			colorId: true,
			color: {
				select: {
					id: true,
					slug: true,
					name: true,
					hex: true,
				},
			},
			materialRelation: {
				select: {
					id: true,
					name: true,
				},
			},
			size: true,
			images: {
				where: { isPrimary: true },
				select: {
					id: true,
					url: true,
					altText: true,
					mediaType: true,
					isPrimary: true,
				},
				take: 1,
			},
		},
		orderBy: {
			isDefault: "desc" as const,
		},
	},
	_count: {
		select: {
			skus: true,
		},
	},
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.ProductSelect;

// ============================================================================
// STRATEGY CONSTANTS
// ============================================================================

export const RELATED_PRODUCTS_DEFAULT_LIMIT = 8;

export const RELATED_PRODUCTS_STRATEGY = {
	SAME_COLLECTION: 3,
	SAME_TYPE: 2,
	SIMILAR_COLORS: 2,
	BEST_SELLERS: 1,
} as const;
