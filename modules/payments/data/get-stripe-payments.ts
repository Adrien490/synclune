import { isAdmin } from "@/shared/lib/guards";
import { redirect } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboardOrders } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import {
	GET_STRIPE_PAYMENTS_SELECT,
	GET_STRIPE_PAYMENTS_DEFAULT_PER_PAGE,
	GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
	SORT_LABELS,
	GET_STRIPE_PAYMENTS_SORT_FIELDS,
} from "../constants/payment.constants";
import type {
	GetStripePaymentsParams,
	GetStripePaymentsReturn,
	StripePayment,
} from "../types/payment.types";
import { buildPaymentWhereClause } from "../utils/payment-query-builder";

// Re-export pour compatibilité
export {
	GET_STRIPE_PAYMENTS_SELECT,
	GET_STRIPE_PAYMENTS_DEFAULT_PER_PAGE,
	GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
	SORT_LABELS,
	GET_STRIPE_PAYMENTS_SORT_FIELDS,
} from "../constants/payment.constants";
export type {
	GetStripePaymentsParams,
	GetStripePaymentsReturn,
	StripePaymentFilters,
	StripePayment,
} from "../types/payment.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des paiements Stripe (réservé aux admins)
 *
 * @param params - Paramètres de filtrage, tri et pagination
 * @returns Liste des paiements avec pagination
 */
export async function getStripePayments(
	params: GetStripePaymentsParams = {}
): Promise<GetStripePaymentsReturn> {
	const admin = await isAdmin();
	if (!admin) {
		redirect("/connexion");
	}

	return fetchStripePayments(params);
}

/**
 * Récupère la liste des paiements Stripe avec pagination, tri et filtrage
 */
export async function fetchStripePayments(
	params: GetStripePaymentsParams
): Promise<GetStripePaymentsReturn> {
	"use cache";
	cacheDashboardOrders();

	const take = Math.min(
		Math.max(1, params.perPage || GET_STRIPE_PAYMENTS_DEFAULT_PER_PAGE),
		GET_STRIPE_PAYMENTS_MAX_RESULTS_PER_PAGE
	);

	const sortBy = params.sortBy || "paidAt-descending";
	const direction = getSortDirection(sortBy);

	try {
		const where = buildPaymentWhereClause(params);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction || "forward",
			take,
		});

		const sortField = sortBy.startsWith("paidAt-")
			? "paidAt"
			: sortBy.startsWith("total-")
				? "total"
				: sortBy.startsWith("paymentStatus-")
					? "paymentStatus"
					: "paidAt";

		const orderBy: Prisma.OrderOrderByWithRelationInput[] = [
			{ [sortField]: direction },
			...(sortField !== "paidAt" ? [{ paidAt: "desc" as const }] : []),
			{ id: "asc" },
		];

		const payments = await prisma.order.findMany({
			where,
			select: GET_STRIPE_PAYMENTS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			payments,
			take,
			params.direction || "forward",
			params.cursor
		);

		return {
			payments: items,
			pagination,
		};
	} catch (error) {
		return {
			payments: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch stripe payments",
		} as GetStripePaymentsReturn & { error: string };
	}
}
