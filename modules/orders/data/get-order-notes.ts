"use server";

import { cacheLife, cacheTag } from "next/cache";
import { orderIdParamSchema } from "../schemas/order-route-params.schema";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import type { OrderNoteItem, OrderNoteRecord } from "../types/order-notes.types";

// SSOT partagée avec les route handlers commande — 3 fichiers `data/` en
// redéclaraient chacun une copie.
const orderIdSchema = orderIdParamSchema;

/**
 * Récupère les notes d'une commande (ADMIN)
 *
 * Le cache est géré dans fetchOrderNotes() avec "use cache"
 */
export async function getOrderNotes(
	orderId: string,
): Promise<{ notes: OrderNoteItem[] } | { error: string }> {
	try {
		// 1. Vérification admin (`WithUser` : `canDelete` par note a besoin de son id)
		const adminCheck = await requireAdminWithUser();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Validate orderId
		const parsed = orderIdSchema.safeParse(orderId);
		if (!parsed.success) {
			return { error: "ID commande invalide" };
		}

		// 3. Récupérer les notes via fonction cachée, puis décorer HORS cache.
		// `canDelete` dépend du visiteur : le calculer dans `fetchOrderNotes` le ferait
		// entrer dans une entrée de cache partagée par orderId, donc fuiter la capacité
		// d'un admin vers un autre.
		const records = await fetchOrderNotes(parsed.data);
		const notes: OrderNoteItem[] = records.map((note) => ({
			...note,
			canDelete: note.authorId === adminCheck.user.id,
		}));
		return { notes };
	} catch (error) {
		logger.error("Failed to fetch order notes", error, { service: "getOrderNotes" });
		return { error: "Une erreur est survenue" };
	}
}

/**
 * Récupère les notes d'une commande depuis la DB avec "use cache"
 */
async function fetchOrderNotes(orderId: string): Promise<OrderNoteRecord[]> {
	"use cache";
	cacheLife("user");
	cacheTag(ORDERS_CACHE_TAGS.NOTES(orderId));

	return prisma.orderNote.findMany({
		where: {
			orderId,
			...notDeleted,
		},
		orderBy: { createdAt: "desc" },
		// Borne la requête (alignement avec get-order-history) pour éviter une
		// lecture non bornée sur une commande au volume de notes inhabituel.
		take: 100,
		select: {
			id: true,
			content: true,
			authorId: true,
			authorName: true,
			createdAt: true,
		},
	});
}
