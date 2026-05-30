import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import { getFranchiseThresholdCents } from "@/shared/constants/vat-franchise";
import { getParisDateParts, parisWallTimeToUtc } from "@/shared/utils/timezone";

import type { GetVatProgressReturn } from "../types/dashboard.types";

export type { GetVatProgressReturn } from "../types/dashboard.types";

/**
 * Cumul YTD du chiffre d'affaires payé vs seuil de franchise en base TVA.
 *
 * Utilisé pour anticiper la bascule vers la TVA (franchise art. 293 B CGI).
 * Cache profile `user` (60s revalidate) + tags `VAT_PROGRESS` + `ORDERS_CACHE_TAGS.LIST`
 * (chain webhook → dashboard préservée).
 */
export async function fetchDashboardVatProgress(): Promise<GetVatProgressReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.VAT_PROGRESS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	return Sentry.startSpan({ name: "dashboard.fetchVatProgress", op: "db.read" }, async () => {
		const now = new Date();
		const { year } = getParisDateParts(now);
		const yearStart = parisWallTimeToUtc(year, 0, 1);

		const aggregate = await prisma.order.aggregate({
			where: {
				paidAt: { gte: yearStart },
				// CA encaissé = inclut les commandes remboursées (ANALYTICS-AUDIT-004) :
				// le seuil de franchise se mesure sur l'encaissement brut, exclure les
				// remboursées sous-estimerait le CA et retarderait l'alerte de bascule TVA.
				paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
				...notDeleted,
			},
			_sum: { total: true },
		});

		const ytdRevenue = aggregate._sum.total ?? 0;
		const threshold = getFranchiseThresholdCents();
		const progress = threshold > 0 ? (ytdRevenue / threshold) * 100 : 0;

		return {
			ytdRevenue,
			threshold,
			progress,
			year,
		};
	});
}

/**
 * Seuil à partir duquel l'alerte est affichée dans `dashboard-alerts.tsx`.
 * Permet à la propriétaire d'anticiper la bascule TVA avant dépassement effectif.
 */
export const VAT_PROGRESS_ALERT_THRESHOLD = 80;
