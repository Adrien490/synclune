import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import {
	EU_OSS_DISTANCE_SALES_THRESHOLD_CENTS,
	EU_OSS_EXCLUDED_COUNTRIES,
} from "@/shared/constants/vat-franchise";
import { getParisDateParts, parisWallTimeToUtc } from "@/shared/utils/timezone";

import type { GetEuOssProgressReturn } from "../types/dashboard.types";

export type { GetEuOssProgressReturn } from "../types/dashboard.types";

/**
 * Cumul YTD des ventes à distance intra-UE (vers d'AUTRES États membres, hors
 * FR/MC) vs le seuil unique OSS de 10 000 € (audit G1).
 *
 * Indicateur de MONITORING : aucune logique de TVA-destination/OSS n'est codée
 * (et ne doit pas l'être tant qu'on reste sous le seuil — sur-ingénierie sinon).
 * Au franchissement : voir docs/RUNBOOK.md § OSS. Mesure conservatrice (CA brut
 * encaissé, transport inclus) pour alerter un peu en avance plutôt qu'en retard.
 */
export async function fetchDashboardEuOssProgress(): Promise<GetEuOssProgressReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.EU_OSS_PROGRESS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	return Sentry.startSpan({ name: "dashboard.fetchEuOssProgress", op: "db.read" }, async () => {
		const now = new Date();
		const { year } = getParisDateParts(now);
		const yearStart = parisWallTimeToUtc(year, 0, 1);

		const aggregate = await prisma.order.aggregate({
			where: {
				paidAt: { gte: yearStart },
				paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
				shippingCountry: { notIn: [...EU_OSS_EXCLUDED_COUNTRIES] },
				...notDeleted,
			},
			_sum: { total: true },
		});

		const ytdEuSales = aggregate._sum.total ?? 0;
		const threshold = EU_OSS_DISTANCE_SALES_THRESHOLD_CENTS;
		const progress = threshold > 0 ? (ytdEuSales / threshold) * 100 : 0;

		return { ytdEuSales, threshold, progress, year };
	});
}
