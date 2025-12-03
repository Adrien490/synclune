import { cacheLife, cacheTag } from "next/cache";
import {
	OrderStatus,
	RefundStatus,
	StockNotificationStatus,
} from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

export type NavBadgeKey = "pendingOrders" | "pendingRefunds" | "stockAlerts";

export interface NavBadges {
	pendingOrders: number;
	pendingRefunds: number;
	stockAlerts: number;
}

/**
 * Recupere les compteurs pour les badges de navigation admin
 * Cache court (30s) car donnees temps reel importantes
 */
export async function getNavBadges(): Promise<NavBadges> {
	"use cache: remote";

	cacheLife("skuStock");
	cacheTag("nav-badges");

	const [pendingOrders, pendingRefunds, stockAlerts] = await Promise.all([
		prisma.order.count({
			where: {
				status: OrderStatus.PROCESSING,
			},
		}),
		prisma.refund.count({
			where: {
				status: RefundStatus.PENDING,
			},
		}),
		prisma.stockNotificationRequest.count({
			where: {
				status: StockNotificationStatus.PENDING,
			},
		}),
	]);

	return { pendingOrders, pendingRefunds, stockAlerts };
}
