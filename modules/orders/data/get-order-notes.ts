"use server";

import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import type { OrderNoteItem } from "../types/order-notes.types";

const orderIdSchema = z.cuid2();

/**
 * Récupère les notes d'une commande (ADMIN)
 *
 * Le cache est géré dans fetchOrderNotes() avec "use cache"
 */
export async function getOrderNotes(
	orderId: string,
): Promise<{ notes: OrderNoteItem[] } | { error: string }> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Validate orderId
		const parsed = orderIdSchema.safeParse(orderId);
		if (!parsed.success) {
			return { error: "ID commande invalide" };
		}

		// 3. Récupérer les notes via fonction cachée
		const notes = await fetchOrderNotes(parsed.data);
		return { notes };
	} catch (error) {
		console.error("[GET_ORDER_NOTES] Erreur:", error);
		return { error: "Une erreur est survenue" };
	}
}

/**
 * Récupère les notes d'une commande depuis la DB avec "use cache"
 */
async function fetchOrderNotes(orderId: string): Promise<OrderNoteItem[]> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(ORDERS_CACHE_TAGS.NOTES(orderId));

	return prisma.orderNote.findMany({
		where: {
			orderId,
			...notDeleted,
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			content: true,
			authorId: true,
			authorName: true,
			createdAt: true,
		},
	});
}
