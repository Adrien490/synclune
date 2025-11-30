"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";

export type DiscountUsageItem = {
	id: string;
	createdAt: Date;
	amountApplied: number;
	user: {
		id: string;
		name: string | null;
		email: string;
	} | null;
	order: {
		id: string;
		orderNumber: string;
		total: number;
	};
};

/**
 * Server Action ADMIN pour récupérer les utilisations d'un code promo
 */
export async function getDiscountUsages(
	discountId: string
): Promise<{ usages: DiscountUsageItem[]; totalAmount: number } | { error: string }> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Récupérer les utilisations
		const usages = await prisma.discountUsage.findMany({
			where: { discountId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				order: {
					select: {
						id: true,
						orderNumber: true,
						total: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		// 3. Calculer le montant total des réductions
		const totalAmount = usages.reduce((sum, usage) => sum + usage.amountApplied, 0);

		return {
			usages: usages.map((u) => ({
				id: u.id,
				createdAt: u.createdAt,
				amountApplied: u.amountApplied,
				user: u.user,
				order: u.order,
			})),
			totalAmount,
		};
	} catch (error) {
		console.error("[GET_DISCOUNT_USAGES] Erreur:", error);
		return { error: "Une erreur est survenue" };
	}
}
