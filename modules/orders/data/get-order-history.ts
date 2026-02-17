import { prisma } from "@/shared/lib/prisma";
import { cacheOrdersDashboard } from "../constants/cache";

/**
 * Récupère l'historique d'une commande (plus récent en premier)
 * Limité à 100 entrées pour éviter les requêtes non bornées
 */
export async function getOrderHistory(orderId: string) {
	"use cache";
	cacheOrdersDashboard();

	return prisma.orderHistory.findMany({
		where: { orderId },
		orderBy: { createdAt: "desc" },
		take: 100,
	});
}
