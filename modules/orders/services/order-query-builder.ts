import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import { Prisma } from "@/app/generated/prisma/client";
import type { GetOrdersParams, OrderFilters } from "../types/order.types";

// ============================================================================
// ORDER QUERY BUILDER UTILS
// ============================================================================

export function buildOrderSearchConditions(search: string): Prisma.OrderWhereInput | null {
	if (!search || search.trim().length === 0) {
		return null;
	}

	// Echappement LIKE : Prisma `contains` ne neutralise pas % _ \ (P3-3, cf. escape-like-pattern.ts).
	const searchTerm = escapeLikePattern(search.trim());

	return {
		OR: [
			{
				orderNumber: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			// Colonnes SNAPSHOT, pas la relation `user` : l'achat est 100 % invité
			// depuis le retrait de l'espace client (2026-07-31) — chercher
			// `user.email`/`user.name` ne matchait plus jamais un client, et le
			// chemin fuzzy qui couvrait ces colonnes est conditionnel (≥3 car.,
			// rate limit, timeout pg_trgm). Audit « Admin commandes » 2026-08-01.
			{
				customerEmail: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				customerName: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				stripePaymentIntentId: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			// EINV-GLOBAL-016 : recherche admin par numéro de facture/avoir pour
			// rapprochement comptable (Art. 286 / 272-I CGI). Insensitive sur
			// "F-2026-00012" / "A-2026-00012" / "f-2026" suffixes.
			{
				invoiceNumber: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				creditNoteNumber: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
		],
	};
}

/**
 * Builds the filter portion of an Order WHERE clause.
 *
 * Default behaviour : when no `status` filter is supplied, **PENDING orders are
 * excluded**. PENDING orders are created the moment a user clicks "Procéder au
 * paiement", before any payment is captured — most never convert (abandoned
 * carts). Surfacing them in the default admin list would drown real orders in
 * noise and inflate dashboard counts.
 *
 * To explicitly inspect abandoned carts, pass `status: "PENDING"` (or include
 * it in an array). The exclusion only applies when the caller is silent.
 */
export function buildOrderFilterConditions(filters: OrderFilters): Prisma.OrderWhereInput {
	const conditions: Prisma.OrderWhereInput = {};

	if (filters.status !== undefined) {
		const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
		conditions.status = statuses.length === 1 ? statuses[0] : { in: statuses };
	} else {
		conditions.status = { not: "PENDING" };
	}

	if (filters.paymentStatus !== undefined) {
		const paymentStatuses = Array.isArray(filters.paymentStatus)
			? filters.paymentStatus
			: [filters.paymentStatus];
		conditions.paymentStatus =
			paymentStatuses.length === 1 ? paymentStatuses[0] : { in: paymentStatuses };
	}

	if (filters.fulfillmentStatus !== undefined) {
		const fulfillmentStatuses = Array.isArray(filters.fulfillmentStatus)
			? filters.fulfillmentStatus
			: [filters.fulfillmentStatus];
		conditions.fulfillmentStatus =
			fulfillmentStatuses.length === 1 ? fulfillmentStatuses[0] : { in: fulfillmentStatuses };
	}

	if (filters.invoiceStatus !== undefined) {
		const invoiceStatuses = Array.isArray(filters.invoiceStatus)
			? filters.invoiceStatus
			: [filters.invoiceStatus];
		conditions.invoiceStatus =
			invoiceStatuses.length === 1 ? invoiceStatuses[0] : { in: invoiceStatuses };
	}

	// Preset "anomalie de facturation" : commande encaissée (PAID) sans facture
	// émise (invoiceNumber IS NULL). Art. 286 / 289-I CGI — cas critique audit
	// admin (EINV-UI-005 audit 2026-05-28).
	if (filters.invoiceAnomaly === true) {
		conditions.paymentStatus = "PAID";
		conditions.invoiceNumber = null;
	}

	// Preset "PDF non archivé" : facture émise (GENERATED) mais PDF immuable absent
	// (invoicePdfUrl IS NULL). Art. L102 B LPF — maintenance archivage (EINV-UI-106).
	if (filters.pdfNotArchived === true) {
		conditions.invoiceStatus = "GENERATED";
		conditions.invoicePdfUrl = null;
	}

	// Preset "retry escaladé" : DLQ facturation (invoiceRetryDeferred = true) —
	// archivage PDF / avoir en échec, escaladé au cron reconcile-invoices (EINV-UI-106).
	if (filters.retryDeferred === true) {
		conditions.invoiceRetryDeferred = true;
	}

	if (typeof filters.totalMin === "number" && typeof filters.totalMax === "number") {
		conditions.total = {
			gte: filters.totalMin,
			lte: filters.totalMax,
		};
	} else if (typeof filters.totalMin === "number") {
		conditions.total = { gte: filters.totalMin };
	} else if (typeof filters.totalMax === "number") {
		conditions.total = { lte: filters.totalMax };
	}

	if (filters.createdAfter instanceof Date && filters.createdBefore instanceof Date) {
		conditions.createdAt = {
			gte: filters.createdAfter,
			lte: filters.createdBefore,
		};
	} else if (filters.createdAfter instanceof Date) {
		conditions.createdAt = { gte: filters.createdAfter };
	} else if (filters.createdBefore instanceof Date) {
		conditions.createdAt = { lte: filters.createdBefore };
	}

	return conditions;
}

/**
 * Build the complete WHERE clause for orders.
 * @param params - Query params with search, filters, etc.
 * @param fuzzyIds - Optional array of order IDs from fuzzy search (OR'd with exact search)
 */
export function buildOrderWhereClause(
	params: GetOrdersParams,
	fuzzyIds?: string[] | null,
): Prisma.OrderWhereInput {
	const showDeleted = params.filters?.showDeleted ?? "active";
	const whereClause: Prisma.OrderWhereInput = {
		// Soft delete: filter based on showDeleted option
		...(showDeleted === "active"
			? { deletedAt: null }
			: showDeleted === "deleted"
				? { deletedAt: { not: null } }
				: {}),
	};
	const andConditions: Prisma.OrderWhereInput[] = [];

	// Toujours appliquer les filtres (inclut l'exclusion par défaut des PENDING)
	const filterConditions = buildOrderFilterConditions(params.filters ?? { showDeleted: "active" });
	andConditions.push(filterConditions);

	if (params.search) {
		const exactConditions = buildOrderSearchConditions(params.search);

		if (fuzzyIds && fuzzyIds.length > 0 && exactConditions) {
			// Combine fuzzy IDs with exact search (OR)
			andConditions.push({
				OR: [{ id: { in: fuzzyIds } }, exactConditions],
			});
		} else if (fuzzyIds && fuzzyIds.length > 0) {
			andConditions.push({ id: { in: fuzzyIds } });
		} else if (exactConditions) {
			andConditions.push(exactConditions);
		}
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
