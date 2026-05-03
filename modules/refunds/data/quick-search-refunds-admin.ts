import { cacheLife, cacheTag } from "next/cache";

import { Prisma, type RefundStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { REFUNDS_CACHE_TAGS } from "../constants/cache";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchRefundItem = {
	id: string;
	amount: number;
	currency: string;
	status: RefundStatus;
	createdAt: Date;
	order: {
		id: string;
		orderNumber: string;
		customerName: string | null;
		customerEmail: string | null;
	};
};

export type AdminQuickSearchRefundsResult =
	| { kind: "success"; items: AdminQuickSearchRefundItem[]; totalCount: number }
	| { kind: "error" };

export async function quickSearchRefundsAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchRefundsResult> {
	"use cache";
	cacheLife("user");
	cacheTag(REFUNDS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.RefundWhereInput = {
			...notDeleted,
			OR: [
				{ order: { orderNumber: { contains: term, mode: Prisma.QueryMode.insensitive } } },
				{ order: { customerEmail: { contains: term, mode: Prisma.QueryMode.insensitive } } },
				{ order: { customerName: { contains: term, mode: Prisma.QueryMode.insensitive } } },
			],
		};

		const [refunds, totalCount] = await Promise.all([
			prisma.refund.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					amount: true,
					currency: true,
					status: true,
					createdAt: true,
					order: {
						select: {
							id: true,
							orderNumber: true,
							customerName: true,
							customerEmail: true,
						},
					},
				},
			}),
			prisma.refund.count({ where }),
		]);

		return { kind: "success", items: refunds, totalCount };
	} catch (error) {
		logger.error("Admin quick search refunds failed", error, {
			service: "quickSearchRefundsAdmin",
		});
		return { kind: "error" };
	}
}
