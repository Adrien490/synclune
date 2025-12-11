import { cacheLife, cacheTag } from "next/cache";
import {
	OrderStatus,
	RefundStatus,
	StockNotificationStatus,
	CustomizationRequestStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";

export type NavBadgeKey = "pendingOrders" | "pendingRefunds" | "stockAlerts" | "pendingCustomizations";

export interface NavBadges {
	pendingOrders: number;
	pendingRefunds: number;
	stockAlerts: number;
	pendingCustomizations: number;
}

/**
 * Recupere les compteurs pour les badges de navigation admin
 * Cache court (30s) car donnees temps reel importantes
 */
export async function getNavBadges(): Promise<NavBadges> {
	"use cache: remote";

	cacheLife("skuStock");
	cacheTag("nav-badges");

	const [pendingOrders, pendingRefunds, stockAlerts, pendingCustomizations] = await Promise.all([
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
		prisma.customizationRequest.count({
			where: {
				...notDeleted,
				status: CustomizationRequestStatus.PENDING,
			},
		}),
	]);

	return { pendingOrders, pendingRefunds, stockAlerts, pendingCustomizations };
}
