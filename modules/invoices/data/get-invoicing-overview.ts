import { cacheLife, cacheTag } from "next/cache";
import { EReportingStatus } from "@/app/generated/prisma/client";
import type { InvoiceStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Vue d'ensemble du module facturation pour le dashboard admin
 * `/admin/ventes/facturation`. Renvoie les compteurs et derniers événements
 * nécessaires au pilotage opérationnel :
 *  - compteurs par invoiceStatus (PENDING / GENERATED / VOIDED)
 *  - compteurs par EReportingBatch.status
 *  - 10 derniers batches REJECTED (alerte action requise)
 *  - 10 derniers batches PENDING/RETRYING (en attente de transmission PDP)
 *  - 30 derniers jours : CA TTC encaissé + nombre de transactions e-reporting
 *
 * Admin only — la vue est composée de KPIs comptables sensibles. Le wrapper
 * applique `isAdmin()` guard avant la fonction cachée pour éviter qu'un
 * cache miss expose les données à un user non admin (cf. fetchOrders pattern).
 */

export type InvoicingOverview = {
	invoiceCounters: Record<InvoiceStatus, number>;
	batchCounters: Record<EReportingStatus, number>;
	rejectedBatches: ReadonlyArray<BatchSummary>;
	pendingBatches: ReadonlyArray<BatchSummary>;
	last30DaysRevenueCents: number;
	last30DaysTransactionCount: number;
	last30DaysRefundCount: number;
};

export interface BatchSummary {
	id: string;
	status: EReportingStatus;
	periodFrom: Date;
	periodTo: Date;
	transactionCount: number;
	totalAmountIncTax: number;
	currency: string;
	rejectionReason: string | null;
	createdAt: Date;
}

export async function getInvoicingOverview(): Promise<InvoicingOverview | null> {
	if (!(await isAdmin())) return null;
	return fetchInvoicingOverview();
}

async function fetchInvoicingOverview(): Promise<InvoicingOverview> {
	"use cache";
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);

	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	// Compteurs Order.invoiceStatus — exclut les commandes soft-deleted.
	const invoiceGroups = await prisma.order.groupBy({
		by: ["invoiceStatus"],
		where: { ...notDeleted },
		_count: { invoiceStatus: true },
	});

	const invoiceCounters: Record<InvoiceStatus, number> = {
		PENDING: 0,
		GENERATED: 0,
		VOIDED: 0,
	};
	for (const group of invoiceGroups) {
		if (group.invoiceStatus !== null) {
			invoiceCounters[group.invoiceStatus] = group._count.invoiceStatus;
		}
	}

	// Compteurs EReportingBatch par statut (toutes périodes confondues).
	const batchGroups = await prisma.eReportingBatch.groupBy({
		by: ["status"],
		_count: { status: true },
	});

	const batchCounters: Record<EReportingStatus, number> = {
		PENDING: 0,
		SENT: 0,
		ACCEPTED: 0,
		REJECTED: 0,
		RETRYING: 0,
		ABANDONED: 0,
	};
	for (const group of batchGroups) {
		batchCounters[group.status] = group._count.status;
	}

	// 10 derniers batches REJECTED — actionnables (correction puis retry).
	const rejectedBatches = await prisma.eReportingBatch.findMany({
		where: { status: EReportingStatus.REJECTED },
		orderBy: { rejectedAt: "desc" },
		take: 10,
		select: {
			id: true,
			status: true,
			periodFrom: true,
			periodTo: true,
			transactionCount: true,
			totalAmountIncTax: true,
			currency: true,
			rejectionReason: true,
			createdAt: true,
		},
	});

	// 10 derniers batches PENDING / RETRYING — file d'attente transmission.
	const pendingBatches = await prisma.eReportingBatch.findMany({
		where: { status: { in: [EReportingStatus.PENDING, EReportingStatus.RETRYING] } },
		orderBy: { periodFrom: "asc" },
		take: 10,
		select: {
			id: true,
			status: true,
			periodFrom: true,
			periodTo: true,
			transactionCount: true,
			totalAmountIncTax: true,
			currency: true,
			rejectionReason: true,
			createdAt: true,
		},
	});

	// CA encaissé 30 derniers jours (filtre paidAt — Art. 50-0 CGI).
	const last30DaysRevenue = await prisma.order.aggregate({
		where: {
			paymentStatus: "PAID",
			paidAt: { gte: thirtyDaysAgo, lte: now },
			...notDeleted,
		},
		_sum: { total: true },
	});

	// Nombre de transactions e-reporting créées sur 30 jours.
	const last30DaysTransactionCount = await prisma.eReportingTransaction.count({
		where: {
			type: "SALES",
			occurredAt: { gte: thirtyDaysAgo, lte: now },
		},
	});

	const last30DaysRefundCount = await prisma.eReportingTransaction.count({
		where: {
			type: "REFUND",
			occurredAt: { gte: thirtyDaysAgo, lte: now },
		},
	});

	return {
		invoiceCounters,
		batchCounters,
		rejectedBatches,
		pendingBatches,
		last30DaysRevenueCents: last30DaysRevenue._sum.total ?? 0,
		last30DaysTransactionCount,
		last30DaysRefundCount,
	};
}
