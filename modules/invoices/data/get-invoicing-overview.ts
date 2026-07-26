import { cacheLife, cacheTag } from "next/cache";
import type { InvoiceStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getFranchiseThresholdCents } from "@/shared/constants/vat-franchise";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import { getParisDateParts, parisWallTimeToUtc } from "@/shared/utils/timezone";

/**
 * Vue d'ensemble du module facturation pour le dashboard admin
 * `/admin/ventes/facturation`. Renvoie les compteurs et derniers événements
 * nécessaires au pilotage opérationnel :
 *  - compteurs par invoiceStatus (PENDING / GENERATED / VOIDED)
 *  - 30 derniers jours : CA TTC encaissé
 *
 * Admin only — la vue est composée de KPIs comptables sensibles. Le wrapper
 * applique `isAdmin()` guard avant la fonction cachée pour éviter qu'un
 * cache miss expose les données à un user non admin (cf. fetchOrders pattern).
 */

export type InvoicingOverview = {
	invoiceCounters: Record<InvoiceStatus, number>;
	last30DaysRevenueCents: number;
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
	/**
	 * EINV-GLOBAL-011 : surveillance du seuil franchise TVA art. 293 B CGI
	 * (85 000 € HT/an pour ventes de biens — cas Synclune). Pré-alerte UI à ~80 %
	 * pour planifier la migration régime réel (recalcul TVA OrderItem +
	 * mentions PDF). Ne bloque jamais l'émission — signal d'anticipation.
	 */
	franchiseThreshold: {
		revenueYtdCents: number;
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
	// COMP-03 : la fenêtre du seuil de franchise est l'ANNÉE CIVILE en heure de
	// Paris, IDENTIQUE à `get-vat-progress` (primitive SSOT = getParisDateParts +
	// parisWallTimeToUtc). PAS un rolling 12 mois (le seuil art. 293 B s'apprécie
	// par année civile, et N-1). Les deux surfaces DOIVENT rester alignées, sinon le
	// dashboard affiche deux CA de référence différents.
	const { year } = getParisDateParts(now);
	const yearStart = parisWallTimeToUtc(year, 0, 1);

	// EINV-GLOBAL-011 : seuil franchise TVA art. 293 B CGI. Exonération TVA
	// jusqu'à 85 000 € HT/an (vente de biens — cas Synclune ; 37 500 € pour les
	// prestations de services). SSOT unique partagée avec le bandeau dashboard
	// (`get-vat-progress`), ajustable via `VAT_FRANCHISE_THRESHOLD_EUR`. Pré-alerte
	// à 80 % pour planifier le passage au régime réel : recalcul TVA OrderItem,
	// mention "TVA non applicable art. 293 B" retirée du PDF.
	const FRANCHISE_THRESHOLD_CENTS = getFranchiseThresholdCents();
	const FRANCHISE_WARNING_CENTS = Math.round(FRANCHISE_THRESHOLD_CENTS * 0.8);

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

	// CA encaissé 30 derniers jours (filtre paidAt — Art. 50-0 CGI).
	const last30DaysRevenue = await prisma.order.aggregate({
		where: {
			paymentStatus: "PAID",
			paidAt: { gte: thirtyDaysAgo, lte: now },
			...notDeleted,
		},
		_sum: { total: true },
	});

	// CA encaissé brut de l'année civile (surveillance seuil franchise TVA 293 B).
	// Inclut les commandes remboursées (PAID_REVENUE_STATUSES) — le seuil se mesure
	// sur l'encaissement BRUT ; exclure les remboursées sous-estimerait le CA et
	// retarderait l'alerte de bascule (aligné sur get-vat-progress, ANALYTICS-AUDIT-004).
	const ytdRevenue = await prisma.order.aggregate({
		where: {
			paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
			paidAt: { gte: yearStart, lte: now },
			...notDeleted,
		},
		_sum: { total: true },
	});
	const revenueYtdCents = ytdRevenue._sum.total ?? 0;

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

	return {
		invoiceCounters,
		last30DaysRevenueCents: last30DaysRevenue._sum.total ?? 0,
		invoiceAnomalyCount,
		recentInvoices: recentInvoicesNormalized,
		anomalies,
		franchiseThreshold: {
			revenueYtdCents,
			thresholdCents: FRANCHISE_THRESHOLD_CENTS,
			warningCents: FRANCHISE_WARNING_CENTS,
			reached: revenueYtdCents >= FRANCHISE_WARNING_CENTS,
		},
	};
}
