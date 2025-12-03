import { Prisma } from "@/app/generated/prisma";
import type { GetStripePaymentsParams } from "../types/payment.types";

// ============================================================================
// PAYMENT QUERY BUILDER UTILS
// ============================================================================

export function buildPaymentWhereClause(
	params: GetStripePaymentsParams
): Prisma.OrderWhereInput {
	const where: Prisma.OrderWhereInput = {};

	if (params.search && params.search.trim()) {
		const searchTerm = params.search.trim();
		where.OR = [
			{
				orderNumber: {
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
			{
				user: {
					email: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
			},
		];
	}

	if (params.filters) {
		const andConditions: Prisma.OrderWhereInput[] = [];

		if (params.filters.paymentStatus) {
			andConditions.push({
				paymentStatus: params.filters.paymentStatus,
			});
		}

		if (params.filters.dateFrom || params.filters.dateTo) {
			const dateFilter: Prisma.DateTimeNullableFilter = {};
			if (params.filters.dateFrom) {
				dateFilter.gte = params.filters.dateFrom;
			}
			if (params.filters.dateTo) {
				dateFilter.lte = params.filters.dateTo;
			}
			andConditions.push({
				paidAt: dateFilter,
			});
		}

		if (params.filters.hasStripePaymentIntent !== undefined) {
			if (params.filters.hasStripePaymentIntent) {
				andConditions.push({
					stripePaymentIntentId: {
						not: null,
					},
				});
			} else {
				andConditions.push({
					stripePaymentIntentId: null,
				});
			}
		}

		if (andConditions.length > 0) {
			where.AND = andConditions;
		}
	}

	return where;
}
