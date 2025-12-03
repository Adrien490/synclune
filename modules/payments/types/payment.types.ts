import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_STRIPE_PAYMENTS_SELECT,
	GET_STRIPE_PAYMENTS_SORT_FIELDS,
} from "../constants/payment.constants";
import {
	getStripePaymentsSchema,
	stripePaymentFiltersSchema,
} from "../schemas/payment.schemas";

// ============================================================================
// TYPES - STRIPE PAYMENTS
// ============================================================================

export type StripePaymentFilters = z.infer<typeof stripePaymentFiltersSchema>;

export type StripePaymentSortField = (typeof GET_STRIPE_PAYMENTS_SORT_FIELDS)[number];

// Type inféré du schema (utilisé après validation)
export type GetStripePaymentsSchemaOutput = z.infer<typeof getStripePaymentsSchema>;

// Type d'entrée flexible pour les searchParams (avant validation)
export type GetStripePaymentsParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	search?: string;
	filters?: StripePaymentFilters;
};

export type StripePaymentFromQuery = Prisma.OrderGetPayload<{
	select: typeof GET_STRIPE_PAYMENTS_SELECT;
}>;

export type GetStripePaymentsReturn = {
	payments: StripePaymentFromQuery[];
	pagination: PaginationInfo;
};

export type StripePayment = Prisma.OrderGetPayload<{
	select: typeof GET_STRIPE_PAYMENTS_SELECT;
}>;
