import { PaymentStatus } from "@/app/generated/prisma/client";

export type StripePaymentFilters = {
	paymentStatus?: PaymentStatus;
	dateFrom?: Date;
	dateTo?: Date;
	hasStripePaymentIntent?: boolean;
};

export type StripePaymentSortBy =
	| "paidAt-ascending"
	| "paidAt-descending"
	| "total-ascending"
	| "total-descending"
	| "paymentStatus-ascending"
	| "paymentStatus-descending";
