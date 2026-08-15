import { cacheTag } from "next/cache";
import type { OrderStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { RETRACTATIONS_CACHE_TAGS } from "@/modules/retractations/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	getFranchiseThresholdCents,
	getMajoredFranchiseThresholdCents,
} from "@/shared/constants/vat-franchise";
import { cacheDashboard } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";

export interface DashboardKpis {
	/** CA encaissé du mois — commandes PAID/SHIPPED, net des REFUNDED. */
	monthRevenueCents: number;
	monthOrdersCount: number;
	/** CA encaissé de l'année civile (suivi du seuil de franchise TVA). */
	yearRevenueCents: number;
	franchiseThresholdCents: number;
	majoredThresholdCents: number;
	ordersByStatus: Record<OrderStatus, number>;
	/** Variantes actives à stock ≤ 1 (produit actif) — les pièces à refaire. */
	lowStockCount: number;
	/** Demandes de rétractation non closes (l'échéance légale court). */
	openRetractationsCount: number;
}

/** KPI du tableau de bord — ADMIN ONLY (schéma lean, lot 6). */
export async function getDashboardKpis(): Promise<DashboardKpis | null> {
	if (!(await isAdmin())) return null;

	try {
		return await fetchDashboardKpis();
	} catch (error) {
		if (!isPrerenderInterrupt(error)) {
			logger.error("[getDashboardKpis] Échec de calcul des KPI", { error });
		}
		return null;
	}
}

/** Statuts qui comptent comme ENCAISSÉ — REFUNDED est exclu (CA net). */
const CASHED_STATUSES: OrderStatus[] = ["PAID", "SHIPPED"];

async function fetchDashboardKpis(): Promise<DashboardKpis> {
	"use cache";
	cacheDashboard(SHARED_CACHE_TAGS.ADMIN_BADGES);
	cacheTag(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
	cacheTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
	cacheTag(RETRACTATIONS_CACHE_TAGS.ADMIN_LIST);

	// ⚠️ Approximation assumée (documentée sur l'export CSV et la facture) :
	// la date d'encaissement ≈ createdAt de la commande, la date Stripe n'étant
	// plus stockée (écart borné par les ~30 min de vie d'une session Checkout).
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfYear = new Date(now.getFullYear(), 0, 1);

	const [monthAggregate, yearAggregate, statusGroups, lowStockCount, openRetractationsCount] =
		await Promise.all([
			prisma.order.aggregate({
				where: { status: { in: CASHED_STATUSES }, createdAt: { gte: startOfMonth } },
				_sum: { amountTotalCents: true },
				_count: true,
			}),
			prisma.order.aggregate({
				where: { status: { in: CASHED_STATUSES }, createdAt: { gte: startOfYear } },
				_sum: { amountTotalCents: true },
			}),
			prisma.order.groupBy({ by: ["status"], _count: true }),
			prisma.productVariant.count({
				where: { active: true, stock: { lte: 1 }, product: { active: true } },
			}),
			prisma.retractationRequest.count({
				where: { status: { in: ["RECEIVED", "ACKNOWLEDGED", "AWAITING_RETURN"] } },
			}),
		]);

	const ordersByStatus: Record<OrderStatus, number> = {
		PENDING: 0,
		PAID: 0,
		SHIPPED: 0,
		REFUNDED: 0,
		CANCELLED: 0,
	};
	for (const group of statusGroups) {
		ordersByStatus[group.status] = group._count;
	}

	return {
		monthRevenueCents: monthAggregate._sum.amountTotalCents ?? 0,
		monthOrdersCount: monthAggregate._count,
		yearRevenueCents: yearAggregate._sum.amountTotalCents ?? 0,
		franchiseThresholdCents: getFranchiseThresholdCents(),
		majoredThresholdCents: getMajoredFranchiseThresholdCents(),
		ordersByStatus,
		lowStockCount,
		openRetractationsCount,
	};
}
