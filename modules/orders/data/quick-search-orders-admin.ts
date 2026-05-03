import { cacheLife, cacheTag } from "next/cache";

import type { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { buildOrderSearchConditions } from "../services/order-query-builder";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchOrderItem = {
	id: string;
	orderNumber: string;
	customerName: string | null;
	customerEmail: string | null;
	totalInclTax: number;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	createdAt: Date;
};

export type AdminQuickSearchOrdersResult =
	| { kind: "success"; items: AdminQuickSearchOrderItem[]; totalCount: number }
	| { kind: "error" };

/**
 * Lightweight admin order search for the live preview drawer.
 * Reuses `buildOrderSearchConditions` (orderNumber + user.email + user.name + stripePI).
 */
export async function quickSearchOrdersAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchOrdersResult> {
	"use cache";
	cacheLife("user");
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const searchCondition = buildOrderSearchConditions(term);
		if (!searchCondition) {
			return { kind: "success", items: [], totalCount: 0 };
		}

		const where = { ...notDeleted, ...searchCondition };

		const [orders, totalCount] = await Promise.all([
			prisma.order.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					orderNumber: true,
					totalInclTax: true,
					status: true,
					paymentStatus: true,
					createdAt: true,
					user: { select: { name: true, email: true } },
				},
			}),
			prisma.order.count({ where }),
		]);

		const items: AdminQuickSearchOrderItem[] = orders.map((o) => ({
			id: o.id,
			orderNumber: o.orderNumber,
			customerName: o.user?.name ?? null,
			customerEmail: o.user?.email ?? null,
			totalInclTax: o.totalInclTax,
			status: o.status,
			paymentStatus: o.paymentStatus,
			createdAt: o.createdAt,
		}));

		return { kind: "success", items, totalCount };
	} catch (error) {
		logger.error("Admin quick search orders failed", error, {
			service: "quickSearchOrdersAdmin",
		});
		return { kind: "error" };
	}
}
