import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";

import type { GetVatProgressReturn } from "../types/dashboard.types";

export type { GetVatProgressReturn } from "../types/dashboard.types";

/**
 * Seuil de franchise en base TVA (article 293 B CGI), 2026.
 * Configurable via la variable d'environnement `VAT_FRANCHISE_THRESHOLD_EUR`
 * (en euros — le calcul se fait en cents pour cohérence Prisma/Stripe).
 *
 *  - 37 500 € : prestations de services (cas par défaut Synclune — bijoux artisanaux
 *    avec personnalisation = prestation au sens fiscal possible selon contrat)
 *  - 85 000 € : ventes de marchandises
 *
 * Si l'activité bascule en livraison de biens pure, ajuster la valeur env.
 */
const DEFAULT_THRESHOLD_EUR = 37_500;

function getThresholdCents(): number {
	const raw = process.env.VAT_FRANCHISE_THRESHOLD_EUR;
	const parsed = raw ? Number(raw) : DEFAULT_THRESHOLD_EUR;
	const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_THRESHOLD_EUR;
	return Math.round(safe * 100);
}

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
		const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

		const aggregate = await prisma.order.aggregate({
			where: {
				paidAt: { gte: yearStart },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true },
		});

		const ytdRevenue = aggregate._sum.total ?? 0;
		const threshold = getThresholdCents();
		const progress = threshold > 0 ? (ytdRevenue / threshold) * 100 : 0;

		return {
			ytdRevenue,
			threshold,
			progress,
			year: now.getUTCFullYear(),
		};
	});
}

/**
 * Seuil à partir duquel l'alerte est affichée dans `dashboard-alerts.tsx`.
 * Permet à la propriétaire d'anticiper la bascule TVA avant dépassement effectif.
 */
export const VAT_PROGRESS_ALERT_THRESHOLD = 80;
