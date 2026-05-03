import { cacheLife, cacheTag } from "next/cache";

import type { ProductStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchProductItem = {
	id: string;
	slug: string;
	title: string;
	status: ProductStatus;
	priceInclTax: number | null;
	image: { url: string; blurDataUrl: string | null; altText: string | null } | null;
};

export type AdminQuickSearchProductsResult =
	| { kind: "success"; items: AdminQuickSearchProductItem[]; totalCount: number }
	| { kind: "error" };

/**
 * Lightweight admin product search for the live preview drawer.
 *
 * - ILIKE on title (case-insensitive substring match)
 * - All statuses included (PUBLIC + DRAFT + ARCHIVED) — admin needs visibility
 * - Excludes soft-deleted
 * - Returns top {QUICK_SEARCH_LIMIT} items + totalCount
 *
 * Cached with `cacheLife("user")` and `PRODUCTS_CACHE_TAGS.LIST` so
 * existing CRUD invalidations refresh the search.
 */
export async function quickSearchProductsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchProductsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where = {
			...notDeleted,
			title: { contains: term, mode: "insensitive" as const },
		};

		const [products, totalCount] = await Promise.all([
			prisma.product.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					slug: true,
					title: true,
					status: true,
					skus: {
						where: { isActive: true },
						orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
						take: 1,
						select: {
							priceInclTax: true,
							images: {
								where: { isPrimary: true },
								take: 1,
								select: { url: true, blurDataUrl: true, altText: true },
							},
						},
					},
				},
			}),
			prisma.product.count({ where }),
		]);

		const items: AdminQuickSearchProductItem[] = products.map((p) => {
			const sku = p.skus[0];
			const image = sku?.images[0] ?? null;
			return {
				id: p.id,
				slug: p.slug,
				title: p.title,
				status: p.status,
				priceInclTax: sku?.priceInclTax ?? null,
				image,
			};
		});

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search products failed", error, {
			service: "quickSearchProductsAdmin",
		});
		return { kind: "error" };
	}
}
