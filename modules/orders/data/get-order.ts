import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { GET_ORDER_SELECT } from "../constants/order.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";

export type AdminOrderDetail = Prisma.OrderGetPayload<{ select: typeof GET_ORDER_SELECT }>;

/** Détail admin d'une commande — ADMIN ONLY (le client passe par /suivi-commande). */
export async function getOrderById(orderId: string): Promise<AdminOrderDetail | null> {
	if (!orderId || !(await isAdmin())) return null;

	try {
		return await fetchOrderById(orderId);
	} catch (error) {
		if (!isPrerenderInterrupt(error)) {
			logger.error("[getOrderById] Échec de lecture de la commande", { orderId, error });
		}
		return null;
	}
}

async function fetchOrderById(orderId: string): Promise<AdminOrderDetail | null> {
	"use cache";
	cacheLife("user");
	cacheTag(ORDERS_CACHE_TAGS.DETAIL(orderId), ORDERS_CACHE_TAGS.ADMIN_LIST);

	return prisma.order.findUnique({ where: { id: orderId }, select: GET_ORDER_SELECT });
}
