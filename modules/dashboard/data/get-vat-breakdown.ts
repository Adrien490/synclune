import { isAdmin } from "@/modules/auth/utils/guards";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type VatBreakdownItem = {
	rate: number;
	amount: number;
	orderCount: number;
};

export type GetVatBreakdownReturn = {
	breakdown: VatBreakdownItem[];
	total: number;
};

// Alias pour compatibilité avec les imports existants
export type GetDashboardVatBreakdownReturn = GetVatBreakdownReturn;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer la répartition de la TVA collectée par taux
 *
 * ⚠️ OBSOLÈTE en micro-entreprise : Retourne toujours 0€ (exonérée art. 293 B du CGI)
 * Conservée pour compatibilité et future migration en régime réel TVA
 */
export async function getVatBreakdown(): Promise<GetVatBreakdownReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return fetchDashboardVatBreakdown();
}

/**
 * Récupère la répartition de la TVA collectée par taux depuis la DB avec cache
 */
export async function fetchDashboardVatBreakdown(): Promise<GetVatBreakdownReturn> {
	"use cache: remote";

	cacheDashboard();

	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	const orders = await prisma.order.findMany({
		where: {
			createdAt: { gte: monthStart },
			paymentStatus: PaymentStatus.PAID,
		},
		select: {
			id: true,
			taxAmount: true,
		},
	});

	const vatByRate = new Map<
		number,
		{ amount: number; orderIds: Set<string> }
	>();

	orders.forEach((order) => {
		const vatRate = 20;
		const vatAmount = order.taxAmount;

		const existing = vatByRate.get(vatRate);
		if (existing) {
			existing.amount += vatAmount;
			existing.orderIds.add(order.id);
		} else {
			vatByRate.set(vatRate, {
				amount: vatAmount,
				orderIds: new Set([order.id]),
			});
		}
	});

	const breakdown = Array.from(vatByRate.entries())
		.map(([rate, data]) => ({
			rate,
			amount: data.amount,
			orderCount: data.orderIds.size,
		}))
		.sort((a, b) => b.amount - a.amount);

	const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

	return { breakdown, total };
}
