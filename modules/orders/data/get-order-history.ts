import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { ORDERS_CACHE_TAGS } from "../constants/cache";

const orderIdSchema = z.cuid2();

/**
 * Récupère l'historique d'une commande (plus récent en premier)
 * Limité à 100 entrées pour éviter les requêtes non bornées
 */
export async function getOrderHistory(orderId: string) {
	const admin = await requireAdmin();
	if ("error" in admin) return [];

	const parsed = orderIdSchema.safeParse(orderId);
	if (!parsed.success) return [];

	return fetchOrderHistory(parsed.data);
}

async function fetchOrderHistory(orderId: string) {
	"use cache";
	cacheLife("dashboard");
	cacheTag(ORDERS_CACHE_TAGS.HISTORY(orderId));

	return prisma.orderHistory.findMany({
		where: {
			orderId,
			order: { ...notDeleted },
		},
		orderBy: { createdAt: "desc" },
		take: 100,
	});
}
