"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";

export interface OrderRefundItem {
	id: string;
	amount: number;
	status: string;
	reason: string;
	createdAt: Date;
}

/**
 * Server Action ADMIN pour récupérer les remboursements d'une commande
 */
export async function getOrderRefunds(
	orderId: string
): Promise<{ refunds: OrderRefundItem[] } | { error: string }> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Récupérer les remboursements
		const refunds = await prisma.refund.findMany({
			where: {
				orderId,
				deletedAt: null,
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				amount: true,
				status: true,
				reason: true,
				createdAt: true,
			},
		});

		return { refunds };
	} catch (error) {
		console.error("[GET_ORDER_REFUNDS] Erreur:", error);
		return { error: "Une erreur est survenue" };
	}
}
