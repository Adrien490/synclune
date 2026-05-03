import { cacheLife, cacheTag } from "next/cache";

import { Prisma, type ReviewStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { REVIEWS_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchReviewItem = {
	id: string;
	title: string | null;
	rating: number;
	status: ReviewStatus;
	createdAt: Date;
	customerName: string | null;
	customerEmail: string | null;
	productTitle: string;
};

export type AdminQuickSearchReviewsResult =
	| { kind: "success"; items: AdminQuickSearchReviewItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchReviewsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchReviewsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.ProductReviewWhereInput = {
			...notDeleted,
			OR: [
				{ title: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ content: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ user: { name: { contains: term, mode: Prisma.QueryMode.insensitive } } },
				{ user: { email: { contains: term, mode: Prisma.QueryMode.insensitive } } },
				{ product: { title: { contains: term, mode: Prisma.QueryMode.insensitive } } },
			],
		};

		const [reviews, totalCount] = await Promise.all([
			prisma.productReview.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					title: true,
					rating: true,
					status: true,
					createdAt: true,
					user: { select: { name: true, email: true } },
					product: { select: { title: true } },
				},
			}),
			prisma.productReview.count({ where }),
		]);

		const items: AdminQuickSearchReviewItem[] = reviews.map((r) => ({
			id: r.id,
			title: r.title,
			rating: r.rating,
			status: r.status,
			createdAt: r.createdAt,
			customerName: r.user?.name ?? null,
			customerEmail: r.user?.email ?? null,
			productTitle: r.product?.title ?? "Produit supprimé",
		}));

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search reviews failed", error, {
			service: "quickSearchReviewsAdmin",
		});
		return { kind: "error" };
	}
}
