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
	/**
	 * Nombre de commandes PAID sans invoiceNumber émis (anomalie Art. 286/289-I).
	 * EINV-UI-005 audit 2026-05-28 — drillable depuis le dashboard via
	 * `/admin/ventes/commandes?filter_invoiceAnomaly=true`.
	 */
	invoiceAnomalyCount: number;
	/** 10 dernières factures émises (recherche + drill-down EINV-UI-012). */
	recentInvoices: ReadonlyArray<InvoiceSummary>;
	/** Audit monitoring 2026-05-28 EINV-OPS-007 : commandes en anomalie actionnable (max 50). */
	anomalies: ReadonlyArray<InvoiceAnomaly>;
	/** EINV-OPS-012 : couverture e-reporting 30j (ratios entre 0 et 1). */
	eReportingCoverage: {
		sales: number;
		refund: number;
		paidOrders: number;
		paidRefunds: number;
	};
	/**
	 * EINV-GLOBAL-011 : surveillance du seuil franchise TVA art. 293 B CGI
	 * (37 500 € HT/an pour ventes de biens). Pré-alerte UI à 30 000 € (~80 %)
	 * pour planifier la migration régime réel (recalcul TVA OrderItem +
	 * mentions PDF). Ne bloque jamais l'émission — signal d'anticipation.
	 */
	franchiseThreshold: {
		revenue12mCents: number;
		thresholdCents: number;
		warningCents: number;
		reached: boolean;
	};
};

export type InvoiceAnomalyType = "MISSING_INVOICE_NUMBER" | "MISSING_PDF" | "MISSING_CREDIT_NOTE";

export interface InvoiceAnomaly {
	orderId: string;
	orderNumber: string;
	type: InvoiceAnomalyType;
	paidAt: Date | null;
	total: number;
	invoiceNumber: string | null;
	invoiceReconcileAttempts: number;
}

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

export interface InvoiceSummary {
	id: string;
	orderId: string;
	orderNumber: string;
	invoiceNumber: string;
	invoiceGeneratedAt: Date;
	invoiceStatus: InvoiceStatus;
	creditNoteNumber: string | null;
	total: number;
	customerName: string | null;
	paidAt: Date | null;
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
	const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

	// EINV-GLOBAL-011 : seuil franchise TVA art. 293 B CGI. Exonération TVA
	// jusqu'à 37 500 € HT/an (vente de biens). Pré-alerte à 30 000 € (80 %)
	// pour planifier le passage au régime réel : recalcul TVA OrderItem,
	// mention "TVA non applicable art. 293 B" retirée du PDF.
	const FRANCHISE_THRESHOLD_CENTS = 3_750_000;
	const FRANCHISE_WARNING_CENTS = 3_000_000;

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

	// CA encaissé 12 derniers mois (surveillance seuil franchise TVA 293 B).
	const last12MonthsRevenue = await prisma.order.aggregate({
		where: {
			paymentStatus: "PAID",
			paidAt: { gte: twelveMonthsAgo, lte: now },
			...notDeleted,
		},
		_sum: { total: true },
	});
	const revenue12mCents = last12MonthsRevenue._sum.total ?? 0;

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

	// Anomalie : commandes PAID sans invoiceNumber (Art. 286 / 289-I CGI).
	// EINV-UI-005 audit 2026-05-28 — drill-down depuis CounterCard "En attente".
	const invoiceAnomalyCount = await prisma.order.count({
		where: {
			paymentStatus: "PAID",
			invoiceNumber: null,
			...notDeleted,
		},
	});

	// 10 dernières factures émises (EINV-UI-012 — vue rapide + recherche
	// par numéro depuis le dashboard).
	const recentInvoices = await prisma.order.findMany({
		where: {
			invoiceNumber: { not: null },
			...notDeleted,
		},
		orderBy: { invoiceGeneratedAt: "desc" },
		take: 10,
		select: {
			id: true,
			orderNumber: true,
			invoiceNumber: true,
			invoiceGeneratedAt: true,
			invoiceStatus: true,
			creditNoteNumber: true,
			total: true,
			customerName: true,
			paidAt: true,
		},
	});

	const recentInvoicesNormalized: InvoiceSummary[] = recentInvoices
		.filter((row) => row.invoiceNumber && row.invoiceGeneratedAt && row.invoiceStatus)
		.map((row) => ({
			id: row.id,
			orderId: row.id,
			orderNumber: row.orderNumber,
			invoiceNumber: row.invoiceNumber as string,
			invoiceGeneratedAt: row.invoiceGeneratedAt as Date,
			invoiceStatus: row.invoiceStatus as InvoiceStatus,
			creditNoteNumber: row.creditNoteNumber,
			total: row.total,
			customerName: row.customerName,
			paidAt: row.paidAt,
		}));

	// Anomalies actionnables (EINV-OPS-007). Index partiel `invoiceRetryDeferred`
	// cible uniquement les rows pathologiques. Cap 50 — le cron reconcile-invoices
	// (daily) écoule la file en arrière-plan.
	const anomalyRows = await prisma.order.findMany({
		where: { invoiceRetryDeferred: true, ...notDeleted },
		select: {
			id: true,
			orderNumber: true,
			paidAt: true,
			total: true,
			invoiceNumber: true,
			invoicePdfUrl: true,
			invoiceStatus: true,
			paymentStatus: true,
			creditNoteNumber: true,
			invoiceReconcileAttempts: true,
		},
		orderBy: { invoiceReconcileAttempts: "desc" },
		take: 50,
	});
	const anomalies: InvoiceAnomaly[] = anomalyRows.map((o) => {
		let type: InvoiceAnomalyType = "MISSING_INVOICE_NUMBER";
		if (!o.invoiceNumber) {
			type = "MISSING_INVOICE_NUMBER";
		} else if (!o.invoicePdfUrl && o.invoiceStatus === "GENERATED") {
			type = "MISSING_PDF";
		} else if (
			o.paymentStatus === "REFUNDED" &&
			o.invoiceStatus === "GENERATED" &&
			!o.creditNoteNumber
		) {
			type = "MISSING_CREDIT_NOTE";
		}
		return {
			orderId: o.id,
			orderNumber: o.orderNumber,
			type,
			paidAt: o.paidAt,
			total: o.total,
			invoiceNumber: o.invoiceNumber,
			invoiceReconcileAttempts: o.invoiceReconcileAttempts,
		};
	});

	// Couverture e-reporting 30j (EINV-OPS-012). Ratio entre 0 et 1 ; le UI
	// affiche un warning quand < 99%. Quand le module est inactif (feature flag
	// OFF), `last30DaysTransactionCount` reste à 0 → ratio descend, alerte
	// visible côté admin = signal de health attendu.
	const paidOrders30d = await prisma.order.count({
		where: {
			paymentStatus: "PAID",
			paidAt: { gte: thirtyDaysAgo, lte: now },
			...notDeleted,
		},
	});
	const refundedOrders30d = await prisma.order.count({
		where: {
			paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
			paidAt: { gte: thirtyDaysAgo, lte: now },
			...notDeleted,
		},
	});
	const eReportingCoverage = {
		sales: paidOrders30d === 0 ? 1 : Math.min(1, last30DaysTransactionCount / paidOrders30d),
		refund: refundedOrders30d === 0 ? 1 : Math.min(1, last30DaysRefundCount / refundedOrders30d),
		paidOrders: paidOrders30d,
		paidRefunds: refundedOrders30d,
	};

	return {
		invoiceCounters,
		batchCounters,
		rejectedBatches,
		pendingBatches,
		last30DaysRevenueCents: last30DaysRevenue._sum.total ?? 0,
		last30DaysTransactionCount,
		last30DaysRefundCount,
		invoiceAnomalyCount,
		recentInvoices: recentInvoicesNormalized,
		anomalies,
		eReportingCoverage,
		franchiseThreshold: {
			revenue12mCents,
			thresholdCents: FRANCHISE_THRESHOLD_CENTS,
			warningCents: FRANCHISE_WARNING_CENTS,
			reached: revenue12mCents >= FRANCHISE_WARNING_CENTS,
		},
	};
}
