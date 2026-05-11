import { RefundStatus } from "@/app/generated/prisma/enums";

/**
 * Refund lifecycle state machine.
 *
 * Source of truth for valid transitions between refund statuses.
 * Used by:
 * - Server actions (approve/reject/cancel/process/retry/bulkApprove) to enforce
 *   the same business rules as the webhook handler.
 * - Webhook service `updateRefundStatus` to drop Stripe events that would
 *   illegally regress the state (e.g. COMPLETED → PENDING).
 *
 * Transitions:
 * - PENDING → APPROVED / REJECTED / CANCELLED / FAILED
 * - APPROVED → COMPLETED / FAILED / CANCELLED
 * - FAILED → APPROVED (retry) / COMPLETED (manual webhook reconcile)
 * - COMPLETED / REJECTED / CANCELLED are terminal
 */
export const REFUND_TRANSITIONS: Record<RefundStatus, ReadonlyArray<RefundStatus>> = {
	// PENDING → COMPLETED is allowed for the webhook path when Stripe processes
	// a refund externally (Stripe Dashboard) and we receive a single
	// `refund.updated` with `succeeded` before the admin action transitioned to APPROVED.
	[RefundStatus.PENDING]: [
		RefundStatus.APPROVED,
		RefundStatus.COMPLETED,
		RefundStatus.REJECTED,
		RefundStatus.CANCELLED,
		RefundStatus.FAILED,
	],
	[RefundStatus.APPROVED]: [RefundStatus.COMPLETED, RefundStatus.FAILED, RefundStatus.CANCELLED],
	[RefundStatus.FAILED]: [RefundStatus.APPROVED, RefundStatus.COMPLETED],
	[RefundStatus.COMPLETED]: [],
	[RefundStatus.REJECTED]: [],
	[RefundStatus.CANCELLED]: [],
} as const;

/**
 * Returns true when `from` → `to` is a valid refund transition.
 */
export function canTransition(from: RefundStatus, to: RefundStatus): boolean {
	return REFUND_TRANSITIONS[from].includes(to);
}

/**
 * Returns true when the refund status is terminal (no outgoing transitions).
 */
export function isTerminalStatus(status: RefundStatus): boolean {
	return REFUND_TRANSITIONS[status].length === 0;
}
