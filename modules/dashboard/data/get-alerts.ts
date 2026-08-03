import { RefundStatus } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { cacheTag } from "next/cache";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { REFUNDS_CACHE_TAGS } from "@/modules/refunds/constants/cache";

import type { DashboardAlerts } from "../types/dashboard.types";

export type { DashboardAlerts } from "../types/dashboard.types";

/**
 * Fetches actionable alert counts for the dashboard
 * Returns 0 for all counts if there are no issues requiring attention
 */
export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
	"use cache";

	// `ALERTS` n'a qu'un seul mutateur, le bouton « Rafraîchir » du tableau de bord :
	// posé seul, ce compteur ne bougeait donc pas d'une création / approbation / rejet de
	// remboursement (cf. la règle « un tag n'existe que s'il a un lecteur ET un mutateur »).
	// On le double de `REFUNDS_CACHE_TAGS.LIST` — même donnée source que le count
	// ci-dessous — comme les 3 autres fetchers dashboard se doublent d'`ORDERS_CACHE_TAGS.LIST`.
	cacheDashboard(DASHBOARD_CACHE_TAGS.ALERTS);
	cacheTag(REFUNDS_CACHE_TAGS.LIST);

	return Sentry.startSpan({ name: "dashboard.fetchAlerts", op: "db.read" }, async () => {
		// Lot 2 S3.3 : plus aucun chemin ne produit PENDING (le workflow d'approbation
		// est parti — Léane rembourse depuis le dashboard Stripe). L'actionnable est
		// désormais « à rattraper » : échec Stripe, ou avoir manquant sur commande
		// facturée — le périmètre exact du bouton Maintenance `reconcile-refunds`.
		const refundsNeedingAttention = await prisma.refund.count({
			where: {
				OR: [
					{ status: RefundStatus.FAILED },
					{
						status: RefundStatus.COMPLETED,
						creditNoteNumber: null,
						order: { invoiceNumber: { not: null } },
					},
				],
			},
		});

		return { refundsNeedingAttention };
	});
}
