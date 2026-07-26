"use server";

import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/modules/auth/lib/require-auth";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { ORDERS_CACHE_TAGS } from "../constants/cache";
// Lecture CLIENT : `canDelete` (capacité admin auteur) n'a pas de sens ici, d'où
// `OrderNoteRecord` et non `OrderNoteItem`.
import type { OrderNoteRecord } from "../types/order-notes.types";

const orderIdSchema = z.cuid2();

/**
 * Recupere les notes d'une commande visibles cote CLIENT.
 *
 * Difference vs `getOrderNotes` (admin) :
 * - Utilise `requireAuth` (pas requireAdmin).
 * - Verifie que la commande appartient bien a l'utilisateur connecte.
 * - Exclut les notes `isInternal=true` (fraude suspectee, blacklist, etc.).
 *
 * @regression ord-test-010 — anti-leak notes internes
 *
 * Garde-fou : ne JAMAIS retirer le filtre `isInternal: false` de la query
 * findMany. Les notes flagees isInternal sont reservees aux admins (motifs
 * sensibles : suspicion de fraude, blacklist, escalade legale). Une regression
 * sur ce filtre exposerait des informations confidentielles au client.
 */
export async function getOrderNotesForUser(
	orderId: string,
): Promise<{ notes: OrderNoteRecord[] } | { error: string }> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) {
			return { error: auth.error.message };
		}

		const parsed = orderIdSchema.safeParse(orderId);
		if (!parsed.success) {
			return { error: "ID commande invalide" };
		}

		// Verify the order belongs to the authenticated user before serving notes.
		// Without this check, any authenticated user could fetch notes from any
		// order by guessing the id.
		const order = await prisma.order.findUnique({
			where: { id: parsed.data, ...notDeleted },
			select: { userId: true },
		});

		if (!order || order.userId !== auth.user.id) {
			return { error: "Commande introuvable" };
		}

		const notes = await fetchOrderNotesPublic(parsed.data);
		return { notes };
	} catch (error) {
		logger.error("Failed to fetch user order notes", error, {
			service: "getOrderNotesForUser",
		});
		return { error: "Une erreur est survenue" };
	}
}

async function fetchOrderNotesPublic(orderId: string): Promise<OrderNoteRecord[]> {
	"use cache";
	cacheLife("user");
	cacheTag(ORDERS_CACHE_TAGS.NOTES(orderId));

	return prisma.orderNote.findMany({
		where: {
			orderId,
			isInternal: false,
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
