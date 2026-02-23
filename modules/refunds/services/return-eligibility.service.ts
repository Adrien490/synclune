import type { FulfillmentStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";

/** 14-day withdrawal period (directive 2011/83/EU, art. L221-18) */
const WITHDRAWAL_PERIOD_DAYS = 14;
const MS_PER_DAY = 86_400_000;

interface ReturnEligibilityOrder {
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	actualDelivery: Date | null;
	refunds: Array<{ status: RefundStatus }>;
}

/**
 * Checks if an order is eligible for a return request.
 *
 * Conditions:
 * - Payment is PAID or PARTIALLY_REFUNDED
 * - Order has been DELIVERED
 * - Within 14-day withdrawal period from delivery date
 * - No pending or approved refund already exists
 */
export function isReturnEligible(order: ReturnEligibilityOrder): boolean {
	const validPaymentStatus =
		order.paymentStatus === "PAID" ||
		order.paymentStatus === "PARTIALLY_REFUNDED";

	const isDelivered = order.fulfillmentStatus === "DELIVERED";

	const withinDeadline =
		!!order.actualDelivery &&
		new Date(order.actualDelivery).getTime() +
			WITHDRAWAL_PERIOD_DAYS * MS_PER_DAY >
			Date.now();

	const hasActiveRefund = order.refunds.some(
		(r) => r.status === "PENDING" || r.status === "APPROVED"
	);

	return validPaymentStatus && isDelivered && withinDeadline && !hasActiveRefund;
}

/**
 * Returns the number of days remaining for a return request.
 * Returns 0 if no delivery date or if the deadline has passed.
 */
export function getReturnDaysRemaining(
	actualDelivery: Date | null
): number {
	if (!actualDelivery) return 0;

	const elapsed = Date.now() - new Date(actualDelivery).getTime();
	const remaining = WITHDRAWAL_PERIOD_DAYS - Math.floor(elapsed / MS_PER_DAY);

	return Math.max(0, remaining);
}
