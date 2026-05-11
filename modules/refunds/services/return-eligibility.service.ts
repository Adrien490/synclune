import { FulfillmentStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/enums";

/** 14-day withdrawal period (directive 2011/83/EU, art. L221-18) */
export const WITHDRAWAL_PERIOD_DAYS = 14;
export const MS_PER_DAY = 86_400_000;
export const WITHDRAWAL_PERIOD_MS = WITHDRAWAL_PERIOD_DAYS * MS_PER_DAY;

interface ReturnEligibilityOrder {
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	actualDelivery: Date | null;
	refunds: Array<{ status: RefundStatus }>;
}

/**
 * Discriminates the precise reason an order is not eligible for a return.
 *
 * - `null` : eligible
 * - `NOT_PAID` : payment status outside (PAID, PARTIALLY_REFUNDED)
 * - `NOT_DELIVERED` : fulfillment status != DELIVERED OR actualDelivery missing
 * - `DEADLINE_EXCEEDED` : delivered but past 14-day withdrawal window
 * - `ALREADY_REQUESTED` : a PENDING or APPROVED refund already exists
 */
export type ReturnIneligibilityReason =
	| "NOT_PAID"
	| "NOT_DELIVERED"
	| "DEADLINE_EXCEEDED"
	| "ALREADY_REQUESTED";

export function getReturnIneligibilityReason(
	order: ReturnEligibilityOrder,
	now: number = Date.now(),
): ReturnIneligibilityReason | null {
	const validPaymentStatus =
		order.paymentStatus === PaymentStatus.PAID ||
		order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
	if (!validPaymentStatus) return "NOT_PAID";

	if (order.fulfillmentStatus !== FulfillmentStatus.DELIVERED || !order.actualDelivery) {
		return "NOT_DELIVERED";
	}

	const deadline = new Date(order.actualDelivery).getTime() + WITHDRAWAL_PERIOD_MS;
	if (now >= deadline) return "DEADLINE_EXCEEDED";

	const hasActiveRefund = order.refunds.some(
		(r) => r.status === RefundStatus.PENDING || r.status === RefundStatus.APPROVED,
	);
	if (hasActiveRefund) return "ALREADY_REQUESTED";

	return null;
}

/**
 * Checks if an order is eligible for a return request.
 *
 * Conditions:
 * - Payment is PAID or PARTIALLY_REFUNDED
 * - Order has been DELIVERED with actualDelivery set
 * - Within 14-day withdrawal period from delivery date
 * - No pending or approved refund already exists
 */
export function isReturnEligible(order: ReturnEligibilityOrder): boolean {
	return getReturnIneligibilityReason(order) === null;
}

/**
 * Returns the number of days remaining for a return request.
 * Returns 0 if no delivery date or if the deadline has passed.
 */
export function getReturnDaysRemaining(actualDelivery: Date | null): number {
	if (!actualDelivery) return 0;

	const elapsed = Date.now() - new Date(actualDelivery).getTime();
	const remaining = WITHDRAWAL_PERIOD_DAYS - Math.floor(elapsed / MS_PER_DAY);

	return Math.max(0, remaining);
}
